/**
 * AI Memory for "Realms of War".
 *
 * Persistent memory that survives across turns, allowing the AI to
 * track enemy positions, remember past interactions, and learn from
 * previous strategic decisions.
 *
 * All data is serializable for save/load support.
 */

import type { PlayerId, EntityId, CityId, HexCoord } from '../core/types';
import type { GameState } from '../core/GameState';
import { hexKey } from '../core/types';
import type { StrategicGoal } from './StrategicPlanner';

// ─── Serialized Data Types ────────────────────────────────────────────────────

/** Last-known position of an enemy unit. */
export interface EnemyPosition {
  hex: HexCoord;
  turn: number;
}

/** Known information about an enemy city. */
export interface KnownCity {
  hex: HexCoord;
  ownerId: PlayerId;
  turn: number;
}

/** Relationship tracking with another player. */
export interface PlayerRelation {
  trust: number;       // -100 to 100
  lastInteraction: number; // turn number
}

/** Record of a past strategic decision. */
export interface PastDecision {
  turn: number;
  goal: StrategicGoal;
  outcome: 'success' | 'failure' | 'partial';
}

/** Discovered map feature. */
export interface DiscoveredFeature {
  type: string;
  turn: number;
}

/** Serializable memory data for save/load. */
export interface AiMemoryData {
  lastKnownEnemyPositions: Record<EntityId, EnemyPosition>;
  knownEnemyCities: Record<CityId, KnownCity>;
  playerRelations: Record<PlayerId, PlayerRelation>;
  pastDecisions: PastDecision[];
  discoveredFeatures: Record<string, DiscoveredFeature>;
}

// ─── AiMemory ─────────────────────────────────────────────────────────────────

export class AiMemory {
  private lastKnownEnemyPositions: Map<EntityId, EnemyPosition>;
  private knownEnemyCities: Map<CityId, KnownCity>;
  private playerRelations: Map<PlayerId, PlayerRelation>;
  private pastDecisions: PastDecision[];
  private discoveredFeatures: Map<string, DiscoveredFeature>;

  constructor() {
    this.lastKnownEnemyPositions = new Map();
    this.knownEnemyCities = new Map();
    this.playerRelations = new Map();
    this.pastDecisions = [];
    this.discoveredFeatures = new Map();
  }

  // ─── Knowledge Update ──────────────────────────────────────────────────

  /**
   * Update memory with current game state observations.
   * Called after vision updates and at turn start.
   */
  updateFromState(state: GameState, playerId: PlayerId): void {
    const visibleSet = new Set(state.players[playerId]?.visibleHexes ?? []);

    // Update enemy positions from visible entities
    for (const entity of Object.values(state.entities)) {
      if (entity.ownerId === playerId) continue;

      const entityHexKey = hexKey(entity.hex);
      if (visibleSet.has(entityHexKey)) {
        this.lastKnownEnemyPositions.set(entity.id, {
          hex: { ...entity.hex },
          turn: state.turn,
        });
      }
    }

    // Update known enemy cities from visible hexes
    for (const city of Object.values(state.cities)) {
      if (city.ownerId === playerId) continue;

      const cityHexKey = hexKey(city.hex);
      if (visibleSet.has(cityHexKey)) {
        this.knownEnemyCities.set(city.id, {
          hex: { ...city.hex },
          ownerId: city.ownerId,
          turn: state.turn,
        });
      }
    }

    // Discover map features from visible hexes
    for (const hexKeyStr of visibleSet) {
      const tile = state.map.tiles[hexKeyStr];
      if (!tile) continue;

      if (tile.resource && !this.discoveredFeatures.has(hexKeyStr)) {
        this.discoveredFeatures.set(hexKeyStr, {
          type: tile.resource,
          turn: state.turn,
        });
      }

      if (tile.hasRiftPortal && !this.discoveredFeatures.has(`rift:${hexKeyStr}`)) {
        this.discoveredFeatures.set(`rift:${hexKeyStr}`, {
          type: 'rift_portal',
          turn: state.turn,
        });
      }
    }

    // Initialize relations with unknown players
    for (const otherId of Object.keys(state.players)) {
      if (otherId === playerId) continue;
      if (!this.playerRelations.has(otherId)) {
        this.playerRelations.set(otherId, {
          trust: 50, // neutral starting trust
          lastInteraction: 0,
        });
      }
    }

    // Update trust based on diplomacy
    for (const [key, entry] of Object.entries(state.diplomacy)) {
      const [a, b] = key.split(':');
      const otherId = a === playerId ? b : a;
      if (a !== playerId && b !== playerId) continue;

      const relation = this.playerRelations.get(otherId);
      if (!relation) continue;

      relation.lastInteraction = state.turn;

      switch (entry.status) {
        case 'alliance':
          relation.trust = Math.min(100, relation.trust + 2);
          break;
        case 'peace':
          relation.trust = Math.min(90, relation.trust + 1);
          break;
        case 'war':
          relation.trust = Math.max(-100, relation.trust - 3);
          break;
        case 'vassal':
        case 'overlord':
          relation.trust = Math.min(70, relation.trust + 0);
          break;
        default:
          break;
      }
    }
  }

  // ─── Decision Tracking ─────────────────────────────────────────────────

  /** Record a strategic decision made this turn. */
  recordDecision(turn: number, goal: StrategicGoal): void {
    this.pastDecisions.push({
      turn,
      goal,
      outcome: 'partial', // default, updated later
    });

    // Keep only the last 50 decisions to prevent unbounded growth
    if (this.pastDecisions.length > 50) {
      this.pastDecisions = this.pastDecisions.slice(-50);
    }
  }

  /** Update the outcome of a past decision. */
  updateDecisionOutcome(turn: number, outcome: 'success' | 'failure' | 'partial'): void {
    const decision = this.pastDecisions.find((d) => d.turn === turn);
    if (decision) {
      decision.outcome = outcome;
    }
  }

  /** Get the most recent decision. */
  getLatestDecision(): PastDecision | null {
    if (this.pastDecisions.length === 0) return null;
    return this.pastDecisions[this.pastDecisions.length - 1] ?? null;
  }

  /** Get all decisions from the last N turns. */
  getRecentDecisions(turnCount: number): PastDecision[] {
    if (this.pastDecisions.length === 0) return [];
    const latestTurn = this.pastDecisions[this.pastDecisions.length - 1]?.turn ?? 0;
    return this.pastDecisions.filter((d) => d.turn >= latestTurn - turnCount);
  }

  // ─── Player Relations ──────────────────────────────────────────────────

  /** Get trust level toward another player (-100 to 100). */
  getPlayerTrust(otherPlayerId: PlayerId): number {
    return this.playerRelations.get(otherPlayerId)?.trust ?? 50;
  }

  /** Adjust trust toward another player. */
  adjustTrust(otherPlayerId: PlayerId, delta: number): void {
    const relation = this.playerRelations.get(otherPlayerId);
    if (relation) {
      relation.trust = Math.max(-100, Math.min(100, relation.trust + delta));
    }
  }

  /** Get the full relation record for a player. */
  getPlayerRelation(otherPlayerId: PlayerId): PlayerRelation | null {
    return this.playerRelations.get(otherPlayerId) ?? null;
  }

  /** Get all players we have relations with. */
  getKnownPlayers(): PlayerId[] {
    return Array.from(this.playerRelations.keys());
  }

  // ─── Enemy Tracking ────────────────────────────────────────────────────

  /** Get last known position of an enemy unit. */
  getLastKnownPosition(entityId: EntityId): EnemyPosition | null {
    return this.lastKnownEnemyPositions.get(entityId) ?? null;
  }

  /** Get all known enemy positions. */
  getAllKnownEnemyPositions(): Map<EntityId, EnemyPosition> {
    return new Map(this.lastKnownEnemyPositions);
  }

  /** Remove stale enemy positions (not seen for N turns). */
  pruneStalePositions(currentTurn: number, maxAge: number = 10): void {
    for (const [id, pos] of this.lastKnownEnemyPositions) {
      if (currentTurn - pos.turn > maxAge) {
        this.lastKnownEnemyPositions.delete(id);
      }
    }
  }

  /** Get known enemy city info. */
  getKnownEnemyCity(cityId: CityId): KnownCity | null {
    return this.knownEnemyCities.get(cityId) ?? null;
  }

  /** Get all known enemy cities. */
  getAllKnownEnemyCities(): Map<CityId, KnownCity> {
    return new Map(this.knownEnemyCities);
  }

  // ─── Feature Discovery ─────────────────────────────────────────────────

  /** Get a discovered feature by hex key. */
  getDiscoveredFeature(hexKeyStr: string): DiscoveredFeature | null {
    return this.discoveredFeatures.get(hexKeyStr) ?? null;
  }

  /** Get all discovered features. */
  getAllDiscoveredFeatures(): Map<string, DiscoveredFeature> {
    return new Map(this.discoveredFeatures);
  }

  // ─── Serialization ─────────────────────────────────────────────────────

  /** Serialize for save/load. */
  serialize(): AiMemoryData {
    return {
      lastKnownEnemyPositions: Object.fromEntries(this.lastKnownEnemyPositions),
      knownEnemyCities: Object.fromEntries(this.knownEnemyCities),
      playerRelations: Object.fromEntries(this.playerRelations),
      pastDecisions: [...this.pastDecisions],
      discoveredFeatures: Object.fromEntries(this.discoveredFeatures),
    };
  }

  /** Deserialize from save data. */
  static deserialize(data: AiMemoryData): AiMemory {
    const memory = new AiMemory();
    memory.lastKnownEnemyPositions = new Map(Object.entries(data.lastKnownEnemyPositions));
    memory.knownEnemyCities = new Map(Object.entries(data.knownEnemyCities));
    memory.playerRelations = new Map(Object.entries(data.playerRelations));
    memory.pastDecisions = [...data.pastDecisions];
    memory.discoveredFeatures = new Map(Object.entries(data.discoveredFeatures));
    return memory;
  }
}

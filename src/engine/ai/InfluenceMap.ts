/**
 * Influence Map for "Realms of War" AI.
 *
 * Provides spatial awareness by computing military and economic influence
 * across the hex grid. Each hex tracks which player dominates it,
 * military threat levels, and contested zones.
 *
 * Influence decays with distance — units project military power nearby,
 * cities project strong territorial control.
 */

import type { PlayerId, HexCoord } from '../core/types';
import { hexKey, hexDistance } from '../core/types';
import type { GameState } from '../core/GameState';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InfluenceData {
  /** Military influence per player per hex (hexKey → PlayerId → value). */
  militaryInfluence: Map<string, Record<PlayerId, number>>;
  /** Economic influence per player per hex (hexKey → PlayerId → value). */
  economicInfluence: Map<string, Record<PlayerId, number>>;
  /** Territory control per hex (hexKey → dominant PlayerId or null). */
  territoryControl: Map<string, PlayerId | null>;
  /** Threat level per hex for the current player (hexKey → 0-100). */
  threatLevel: Map<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum distance at which military influence is felt. */
const MILITARY_INFLUENCE_RANGE = 6;

/** Maximum distance at which city economic influence is felt. */
const ECONOMIC_INFLUENCE_RANGE = 8;

/** Base military influence of a unit (decays with distance). */
const UNIT_MILITARY_POWER = 10;

/** Base economic influence of a city (stronger than units). */
const CITY_ECONOMIC_POWER = 15;

/** Base military influence of a city (defensive). */
const CITY_MILITARY_POWER = 8;

/** Decay factor per hex of distance (exponential). */
const INFLUENCE_DECAY = 0.6;

// ─── InfluenceMap ─────────────────────────────────────────────────────────────

export class InfluenceMap {
  private data: InfluenceData;
  private playerId: PlayerId;

  constructor(playerId: PlayerId) {
    this.playerId = playerId;
    this.data = {
      militaryInfluence: new Map(),
      economicInfluence: new Map(),
      territoryControl: new Map(),
      threatLevel: new Map(),
    };
  }

  // ─── Recalculation ─────────────────────────────────────────────────────

  /**
   * Recalculate influence from scratch based on game state.
   * Should be called once per turn or when the strategic picture changes.
   */
  recalculate(state: GameState, playerId: PlayerId): void {
    this.playerId = playerId;

    // Reset all data
    this.data = {
      militaryInfluence: new Map(),
      economicInfluence: new Map(),
      territoryControl: new Map(),
      threatLevel: new Map(),
    };

    // Collect all player IDs
    const allPlayerIds = Object.keys(state.players);

    // Project military influence from units
    for (const entity of Object.values(state.entities)) {
      const power = UNIT_MILITARY_POWER * (entity.attack + entity.defense) / 10;
      this.projectInfluence(
        state,
        entity.hex,
        entity.ownerId,
        power,
        MILITARY_INFLUENCE_RANGE,
        'military',
        allPlayerIds,
      );
    }

    // Project military + economic influence from cities
    for (const city of Object.values(state.cities)) {
      // Military influence from cities (defensive)
      const militaryPower = CITY_MILITARY_POWER * (1 + city.level * 0.5);
      this.projectInfluence(
        state,
        city.hex,
        city.ownerId,
        militaryPower,
        MILITARY_INFLUENCE_RANGE,
        'military',
        allPlayerIds,
      );

      // Economic influence from cities (stronger, wider)
      const economicPower = CITY_ECONOMIC_POWER * (1 + city.population * 0.3);
      this.projectInfluence(
        state,
        city.hex,
        city.ownerId,
        economicPower,
        ECONOMIC_INFLUENCE_RANGE,
        'economic',
        allPlayerIds,
      );

      // Territory control: cities directly claim their hex
      const cityKey = hexKey(city.hex);
      this.data.territoryControl.set(cityKey, city.ownerId);
    }

    // Assign territory control for unclaimed hexes based on influence
    this.computeTerritoryControl(state, allPlayerIds);

    // Compute threat levels for the current player
    this.computeThreatLevels(state, allPlayerIds);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the dominant player at a hex. */
  getDominantPlayer(hex: HexCoord): PlayerId | null {
    return this.data.territoryControl.get(hexKey(hex)) ?? null;
  }

  /** Get military threat level at a hex (0-100 for the current player). */
  getThreatAt(hex: HexCoord): number {
    return this.data.threatLevel.get(hexKey(hex)) ?? 0;
  }

  /** Get military influence of a specific player at a hex. */
  getMilitaryInfluence(hex: HexCoord, pid: PlayerId): number {
    const key = hexKey(hex);
    return this.data.militaryInfluence.get(key)?.[pid] ?? 0;
  }

  /** Get economic influence of a specific player at a hex. */
  getEconomicInfluence(hex: HexCoord, pid: PlayerId): number {
    const key = hexKey(hex);
    return this.data.economicInfluence.get(key)?.[pid] ?? 0;
  }

  /** Get total military influence at a hex (sum across all players). */
  getTotalMilitaryInfluence(hex: HexCoord): number {
    const key = hexKey(hex);
    const influences = this.data.militaryInfluence.get(key);
    if (!influences) return 0;
    return Object.values(influences).reduce((sum, v) => sum + v, 0);
  }

  /**
   * Find hexes where influence is contested (multiple players close).
   * A hex is contested if the top two players' influence differs by < 30%.
   */
  findContestedZones(): HexCoord[] {
    const contested: HexCoord[] = [];

    for (const [key, influences] of this.data.militaryInfluence) {
      const values = Object.values(influences).sort((a, b) => b - a);
      if (values.length >= 2) {
        const top = values[0] ?? 0;
        const second = values[1] ?? 0;
        if (top > 0 && second > 0 && second / top > 0.7) {
          const [q, r] = key.split(',').map(Number);
          contested.push({ q, r });
        }
      }
    }

    return contested;
  }

  /**
   * Find the safest direction to expand.
   * Returns the hex with the lowest enemy threat that is adjacent
   * to the player's current territory.
   */
  findSafestExpansionDirection(state: GameState, playerId: PlayerId): HexCoord | null {
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    if (playerCities.length === 0) return null;

    // Collect all border hexes (hexes adjacent to territory but not owned)
    const territoryKeys = new Set<string>();
    for (const city of playerCities) {
      territoryKeys.add(hexKey(city.hex));
      for (const tKey of city.territory) {
        territoryKeys.add(tKey);
      }
    }

    const borderHexes: HexCoord[] = [];
    const seen = new Set<string>();

    for (const tKey of territoryKeys) {
      const [q, r] = tKey.split(',').map(Number);
      const hex: HexCoord = { q, r };

      // Check all 6 neighbors
      for (let d = 0; d < 6; d++) {
        const nQ = q + [1, 1, 0, -1, -1, 0][d];
        const nR = r + [0, -1, -1, 0, 1, 1][d];
        const nKey = `${nQ},${nR}`;

        if (!territoryKeys.has(nKey) && !seen.has(nKey)) {
          const tile = state.map.tiles[nKey];
          if (tile && tile.terrain !== 'mountain' && tile.terrain !== 'water') {
            seen.add(nKey);
            borderHexes.push({ q: nQ, r: nR });
          }
        }
      }
    }

    // Find the border hex with lowest threat
    let safestHex: HexCoord | null = null;
    let lowestThreat = Infinity;

    for (const hex of borderHexes) {
      const threat = this.getThreatAt(hex);
      // Also consider economic potential
      const ownInfluence = this.getEconomicInfluence(hex, playerId);
      const score = threat - ownInfluence * 0.3;

      if (score < lowestThreat) {
        lowestThreat = score;
        safestHex = hex;
      }
    }

    return safestHex;
  }

  /** Get the raw influence data (for debugging/serialization). */
  getData(): Readonly<InfluenceData> {
    return this.data;
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────

  /**
   * Project influence from a source hex to surrounding hexes.
   * Uses exponential decay with distance.
   */
  private projectInfluence(
    state: GameState,
    source: HexCoord,
    ownerPlayerId: PlayerId,
    power: number,
    range: number,
    type: 'military' | 'economic',
    allPlayerIds: string[],
  ): void {
    const influenceMap = type === 'military'
      ? this.data.militaryInfluence
      : this.data.economicInfluence;

    // Apply influence to hexes within range
    for (const [key, tile] of Object.entries(state.map.tiles)) {
      const [q, r] = key.split(',').map(Number);
      const hex: HexCoord = { q, r };
      const dist = hexDistance(source, hex);

      if (dist > range) continue;

      // Calculate influence at this hex with distance decay
      const influence = power * Math.pow(INFLUENCE_DECAY, dist);

      if (!influenceMap.has(key)) {
        const record: Record<PlayerId, number> = {};
        for (const pid of allPlayerIds) {
          record[pid] = 0;
        }
        influenceMap.set(key, record);
      }

      const record = influenceMap.get(key)!;
      record[ownerPlayerId] = (record[ownerPlayerId] ?? 0) + influence;
    }
  }

  /**
   * Compute territory control for each hex based on combined influence.
   * The player with the highest combined influence controls the hex.
   */
  private computeTerritoryControl(
    state: GameState,
    allPlayerIds: string[],
  ): void {
    for (const key of Object.keys(state.map.tiles)) {
      if (this.data.territoryControl.has(key)) continue; // Already set by city

      const milInfluence = this.data.militaryInfluence.get(key);
      const ecoInfluence = this.data.economicInfluence.get(key);

      let bestPlayer: PlayerId | null = null;
      let bestScore = 0;

      for (const pid of allPlayerIds) {
        const mil = milInfluence?.[pid] ?? 0;
        const eco = ecoInfluence?.[pid] ?? 0;
        const combined = mil * 0.6 + eco * 0.4;

        if (combined > bestScore) {
          bestScore = combined;
          bestPlayer = pid;
        }
      }

      // Only assign if there's meaningful influence
      this.data.territoryControl.set(key, bestScore > 1 ? bestPlayer : null);
    }
  }

  /**
   * Compute threat levels for the current player.
   * Threat = enemy military influence near the player's territory.
   */
  private computeThreatLevels(
    state: GameState,
    allPlayerIds: string[],
  ): void {
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === this.playerId,
    );

    // For each hex, compute threat based on enemy military influence
    // relative to our own influence
    for (const [key] of Object.entries(state.map.tiles)) {
      const milInfluence = this.data.militaryInfluence.get(key);

      let ownInfluence = 0;
      let enemyInfluence = 0;

      for (const pid of allPlayerIds) {
        const inf = milInfluence?.[pid] ?? 0;
        if (pid === this.playerId) {
          ownInfluence += inf;
        } else {
          enemyInfluence += inf;
        }
      }

      if (enemyInfluence <= 0) {
        this.data.threatLevel.set(key, 0);
        continue;
      }

      // Threat is higher when enemy outmatches us
      const ratio = enemyInfluence / Math.max(ownInfluence + 1, 1);
      const threat = Math.min(100, Math.round(ratio * 50));
      this.data.threatLevel.set(key, threat);
    }

    // Boost threat near our own cities (proximity amplifies danger)
    for (const city of playerCities) {
      const cityKey = hexKey(city.hex);
      const baseThreat = this.data.threatLevel.get(cityKey) ?? 0;

      // Spread threat from city to nearby hexes
      for (const [key, tile] of Object.entries(state.map.tiles)) {
        const [q, r] = key.split(',').map(Number);
        const hex: HexCoord = { q, r };
        const dist = hexDistance(city.hex, hex);

        if (dist <= 4 && dist > 0) {
          const currentThreat = this.data.threatLevel.get(key) ?? 0;
          const proximityBonus = baseThreat * (1 - dist / 5) * 0.3;
          this.data.threatLevel.set(key, Math.min(100, Math.round(currentThreat + proximityBonus)));
        }
      }
    }
  }
}

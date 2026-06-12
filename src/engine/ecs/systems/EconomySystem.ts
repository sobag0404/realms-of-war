/**
 * Economy System for "Realms of War".
 *
 * Processes income, calculates resource breakdowns, and handles bankruptcy.
 * Delegates to economyRules for the actual computation and emits
 * ResourcesChanged events.
 */

import type { PlayerId, ResourceId, ResourceYield } from '../../core/types';
import type { GameState } from '../../core/GameState';
import type { EventBus } from '../../core/EventBus';
import {
  calculateIncome,
  calculateUpkeep,
  applyIncome as rulesApplyIncome,
  checkBankruptcy as rulesCheckBankruptcy,
  getHexYield,
} from '../../rules/economyRules';
import { hexKey } from '../../core/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Breakdown of income and upkeep for a player. */
export interface IncomeBreakdown {
  totalIncome: ResourceYield;
  totalUpkeep: ResourceYield;
  netIncome: ResourceYield;
  bySource: { source: string; yield: ResourceYield }[];
}

// ─── EconomySystem ──────────────────────────────────────────────────────────────

export class EconomySystem {
  /**
   * Process income for a player at turn start.
   *
   * 1. Calculates income and upkeep via economyRules
   * 2. Applies net income to player resources
   * 3. Emits ResourcesChanged events for each resource that changed
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player to process income for
   * @param eventBus - Event bus for emitting events
   * @returns New game state with updated resources
   */
  static processIncome(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    const oldResources = { ...player.resources };

    // Apply income via rules
    const newState = rulesApplyIncome(state, playerId);

    // Emit ResourcesChanged events for each resource that changed
    const newPlayer = newState.players[playerId];
    if (newPlayer) {
      for (const key of Object.keys(newPlayer.resources) as ResourceId[]) {
        const oldAmount = oldResources[key] ?? 0;
        const newAmount = newPlayer.resources[key] ?? 0;
        if (oldAmount !== newAmount) {
          eventBus.emit('ResourcesChanged', {
            playerId,
            resource: key,
            oldAmount,
            newAmount,
          });
        }
      }
    }

    return newState;
  }

  /**
   * Get current income breakdown for a player.
   *
   * @param state - Current game state
   * @param playerId - Player to check
   * @returns Detailed income breakdown
   */
  static getIncomeBreakdown(
    state: GameState,
    playerId: PlayerId,
  ): IncomeBreakdown {
    const player = state.players[playerId];
    if (!player || !player.isAlive) {
      return {
        totalIncome: {},
        totalUpkeep: {},
        netIncome: {},
        bySource: [],
      };
    }

    const totalIncome = calculateIncome(state, playerId);
    const totalUpkeep = calculateUpkeep(state, playerId);

    // Calculate net income
    const netIncome: ResourceYield = {};
    const allKeys = new Set<ResourceId>([
      ...(Object.keys(totalIncome) as ResourceId[]),
      ...(Object.keys(totalUpkeep) as ResourceId[]),
    ]);
    for (const key of allKeys) {
      netIncome[key] = (totalIncome[key] ?? 0) - (totalUpkeep[key] ?? 0);
    }

    // Build per-source breakdown
    const bySource: { source: string; yield: ResourceYield }[] = [];

    // City income sources
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );
    for (const city of playerCities) {
      // City center base yield
      bySource.push({
        source: `City "${city.name}" (base)`,
        yield: { gold: 2, food: 1 },
      });

      // Worked hex yields
      for (const hexKeyStr of city.workedHexes) {
        const [q, r] = hexKeyStr.split(',').map(Number);
        const hexYield = getHexYield(state, { q, r }, city.id);
        if (Object.keys(hexYield).length > 0) {
          bySource.push({
            source: `City "${city.name}" (worked hex ${q},${r})`,
            yield: hexYield,
          });
        }
      }
    }

    // Unit upkeep sources
    const playerUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId,
    );
    for (const unit of playerUnits) {
      if (Object.keys(unit.upkeep).length > 0) {
        bySource.push({
          source: `Unit "${unit.typeId}" (${unit.id})`,
          yield: unit.upkeep,
        });
      }
    }

    return { totalIncome, totalUpkeep, netIncome, bySource };
  }

  /**
   * Check and handle bankruptcy.
   *
   * If the player's gold is negative, units start deserting.
   * Removes deserting units from the state and emits events.
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player to check
   * @param eventBus - Event bus for emitting events
   * @returns New game state with bankruptcy handled
   */
  static checkBankruptcy(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const bankruptcy = rulesCheckBankruptcy(state, playerId);

    if (!bankruptcy.isBankrupt || bankruptcy.desertingUnits.length === 0) {
      return state;
    }

    // Remove deserting units
    const newEntities = { ...state.entities };

    for (const unitId of bankruptcy.desertingUnits) {
      const unit = newEntities[unitId];
      if (unit) {
        // Emit UnitKilled event (desertion is treated as "killed" for event purposes)
        eventBus.emit('UnitKilled', {
          entityId: unitId,
          killedBy: playerId, // Self-desertion
          position: unit.hex,
        });

        delete newEntities[unitId];
      }
    }

    const newState: GameState = {
      ...state,
      entities: newEntities,
    };

    return newState;
  }
}

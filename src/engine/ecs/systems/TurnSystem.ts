/**
 * Turn System for "Realms of War".
 *
 * Orchestrates the full turn cycle:
 *
 * 1. TurnStart: income, research, city production, healing, status effects
 * 2. PlayerActions: player makes moves
 * 3. TurnEnd: reset movement/acted flags, check victory, advance to next player
 *
 * The TurnSystem coordinates all other systems during turn transitions.
 */

import type { PlayerId } from '../../core/types';
import type { GameState } from '../../core/GameState';
import type { EventBus } from '../../core/EventBus';
import { EconomySystem } from './EconomySystem';
import { ResearchSystem } from './ResearchSystem';
import { CitySystem } from './CitySystem';
import { VisionSystem } from './VisionSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { ObjectiveSystem } from './ObjectiveSystem';
import { hasWon, isPlayerAlive, eliminatePlayer } from '../../rules/victoryRules';

// ─── TurnSystem ────────────────────────────────────────────────────────────────

export class TurnSystem {
  /**
   * Start a new turn for a player.
   *
   * Runs all turn-start processing:
   * 1. Emit TurnStarted event
   * 2. Process income (economy)
   * 3. Process research
   * 4. Process city growth and production
   * 5. Process status effects
   * 6. Heal units (in friendly territory)
   * 7. Recalculate vision
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player whose turn is starting
   * @param eventBus - Event bus for emitting events
   * @returns New game state after turn-start processing
   */
  static startTurn(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    // Set turn counter on event bus
    eventBus.setTurn(state.turn);

    // Emit TurnStarted event
    eventBus.emit('TurnStarted', {
      turn: state.turn,
      playerId,
    });

    // Process all turn-start logic
    let newState = TurnSystem.processTurnStart(state, playerId, eventBus);

    return newState;
  }

  /**
   * End a player's turn and advance to the next player.
   *
   * Runs all turn-end processing:
   * 1. Process turn-end logic for current player
   * 2. Check victory conditions
   * 3. Determine next player
   * 4. If full cycle, advance turn counter
   * 5. Start next player's turn
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player ending their turn
   * @param eventBus - Event bus for emitting events
   * @returns New game state after turn advancement
   */
  static endTurn(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    if (state.activePlayerId !== playerId) return state;

    // Process turn-end logic for current player
    let newState = TurnSystem.processTurnEnd(state, playerId, eventBus);

    // Check victory for all alive players
    for (const pid of newState.turnOrder) {
      const p = newState.players[pid];
      if (!p || !p.isAlive) continue;

      const victory = hasWon(newState, pid);
      if (victory.won) {
        return {
          ...newState,
          gameOver: true,
          winnerId: pid,
          victoryCondition: victory.condition,
        };
      }
    }

    // Check for eliminated players
    for (const pid of newState.turnOrder) {
      const p = newState.players[pid];
      if (!p || !p.isAlive) continue;

      if (!isPlayerAlive(newState, pid)) {
        newState = eliminatePlayer(newState, pid);
      }
    }

    // Get next player
    const nextPlayerId = TurnSystem.getNextPlayer(newState, playerId);

    // Determine if we've completed a full cycle
    const currentIdx = newState.turnOrder.indexOf(playerId);
    const nextIdx = newState.turnOrder.indexOf(nextPlayerId);
    const isFullCycle = nextIdx <= currentIdx;

    const newTurn = isFullCycle ? newState.turn + 1 : newState.turn;

    // Update state
    newState = {
      ...newState,
      turn: newTurn,
      activePlayerId: nextPlayerId,
      phase: 'playerActions',
    };

    // Start the next player's turn
    newState = TurnSystem.startTurn(newState, nextPlayerId, eventBus);

    return newState;
  }

  /**
   * Process all turn-start logic (income, research, production, healing, etc.).
   *
   * Called at the beginning of a player's turn. Applies all automatic
   * updates that happen before the player takes actions.
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player whose turn is starting
   * @param eventBus - Event bus for emitting events
   * @returns New game state after processing
   */
  static processTurnStart(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    let newState = state;

    // 1. Process income
    newState = EconomySystem.processIncome(newState, playerId, eventBus);

    // 2. Check bankruptcy
    newState = EconomySystem.checkBankruptcy(newState, playerId, eventBus);

    // 3. Process research
    newState = ResearchSystem.processResearch(newState, playerId, eventBus);

    // 4. Process city growth and production
    newState = CitySystem.processCities(newState, playerId, eventBus);

    // 5. Process status effects
    newState = StatusEffectSystem.processEffects(newState, playerId, eventBus);

    // 6. Heal units (in friendly territory, not under siege)
    newState = TurnSystem.healUnits(newState, playerId);

    // 7. Recalculate vision
    newState = VisionSystem.recalculateVision(newState, playerId, eventBus);

    // 8. Update science per turn
    newState = TurnSystem.updateSciencePerTurn(newState, playerId);

    const objectiveReport = ObjectiveSystem.createObjectiveReport(newState, playerId);
    if (objectiveReport) {
      eventBus.emit('StrategicObjectiveUpdated', objectiveReport);
    }

    return newState;
  }

  /**
   * Process all turn-end logic (reset movement, check victory, etc.).
   *
   * Called when a player ends their turn, before advancing to the next player.
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player whose turn is ending
   * @param eventBus - Event bus for emitting events
   * @returns New game state after processing
   */
  static processTurnEnd(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    // Reset movement and acted flags for next turn
    const newEntities = { ...state.entities };
    for (const [id, entity] of Object.entries(newEntities)) {
      if (entity.ownerId === playerId) {
        newEntities[id] = {
          ...entity,
          movementPoints: entity.maxMovement,
          hasMoved: false,
          hasActed: false,
        };
      }
    }

    // Update player's lastActiveTurn
    const updatedPlayer = {
      ...player,
      lastActiveTurn: state.turn,
    };

    return {
      ...state,
      entities: newEntities,
      players: {
        ...state.players,
        [playerId]: updatedPlayer,
      },
    };
  }

  /**
   * Get the next player in turn order.
   *
   * Skips eliminated players. If all players are eliminated after
   * the current one, returns the current player.
   *
   * @param state - Current game state
   * @param currentPlayerId - Current player
   * @returns Next player ID in turn order
   */
  static getNextPlayer(
    state: GameState,
    currentPlayerId: PlayerId,
  ): PlayerId {
    const turnOrder = state.turnOrder;
    const currentIdx = turnOrder.indexOf(currentPlayerId);

    // Search forward for the next alive player
    for (let offset = 1; offset <= turnOrder.length; offset++) {
      const idx = (currentIdx + offset) % turnOrder.length;
      const candidateId = turnOrder[idx];
      const candidate = state.players[candidateId];
      if (candidate && candidate.isAlive) {
        return candidateId;
      }
    }

    // Fallback: return current player (shouldn't happen in a valid game)
    return currentPlayerId;
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────

  /**
   * Heal units that are in friendly territory and not under siege.
   * Units heal 10% of max HP per turn (minimum 1).
   */
  private static healUnits(state: GameState, playerId: PlayerId): GameState {
    const HEAL_RATE = 0.10;
    const newEntities = { ...state.entities };
    let changed = false;

    for (const [id, entity] of Object.entries(newEntities)) {
      if (entity.ownerId !== playerId) continue;
      if (entity.hp >= entity.maxHp) continue;
      if (entity.hp <= 0) continue; // Dead unit

      // Check if unit is in friendly territory
      const tile = state.map.tiles[`${entity.hex.q},${entity.hex.r}`];
      if (!tile) continue;

      let inFriendlyTerritory = false;
      if (!tile.owningCityId) {
        // Unclaimed territory — neutral, allow healing
        inFriendlyTerritory = true;
      } else {
        const owningCity = state.cities[tile.owningCityId];
        if (owningCity && owningCity.ownerId === playerId) {
          // Check if city is under siege (units in besieged cities don't heal)
          inFriendlyTerritory = !owningCity.isUnderSiege;
        }
      }

      if (inFriendlyTerritory) {
        const healAmount = Math.max(1, Math.floor(entity.maxHp * HEAL_RATE));
        const newHp = Math.min(entity.maxHp, entity.hp + healAmount);
        newEntities[id] = { ...entity, hp: newHp };
        changed = true;
      }
    }

    if (!changed) return state;

    return {
      ...state,
      entities: newEntities,
    };
  }

  /**
   * Update the science per turn for a player based on current income.
   */
  private static updateSciencePerTurn(state: GameState, playerId: PlayerId): GameState {
    const player = state.players[playerId];
    if (!player) return state;

    const sciencePerTurn = player.incomePerTurn.science ?? 0;

    if (player.sciencePerTurn === sciencePerTurn) return state;

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          sciencePerTurn,
        },
      },
    };
  }
}

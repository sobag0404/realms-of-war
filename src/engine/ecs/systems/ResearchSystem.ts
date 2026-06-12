/**
 * Research System for "Realms of War".
 *
 * Processes research progress, starts new research projects,
 * and provides available tech listings. Delegates to researchRules
 * and emits TechnologyCompleted events.
 */

import type { PlayerId, ResourceId } from '../../core/types';
import type { GameState } from '../../core/GameState';
import type { EventBus } from '../../core/EventBus';
import {
  canResearch,
  getAvailableTechs as rulesGetAvailableTechs,
  applyResearch as rulesApplyResearch,
} from '../../rules/researchRules';

export class ResearchSystem {
  /**
   * Process research progress for a player.
   *
   * Adds sciencePerTurn to the current research progress. If the
   * research completes, emits a TechnologyCompleted event.
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player to process research for
   * @param eventBus - Event bus for emitting events
   * @returns New game state with updated research
   */
  static processResearch(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive || !player.currentResearch) return state;

    const techId = player.currentResearch;

    // Apply research via rules
    const newState = rulesApplyResearch(state, playerId);

    // Check if technology was completed
    const newPlayer = newState.players[playerId];
    if (newPlayer && newPlayer.currentResearch === null && player.currentResearch !== null) {
      // Research completed!
      eventBus.emit('TechnologyCompleted', {
        playerId,
        techId,
      });
    }

    return newState;
  }

  /**
   * Start researching a technology.
   *
   * Validates the research choice via researchRules.canResearch,
   * then sets the player's currentResearch and resets progress.
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player starting research
   * @param techId - Technology ID to research
   * @param eventBus - Event bus for emitting events
   * @returns New game state with research started, or original state if invalid
   */
  static startResearch(
    state: GameState,
    playerId: PlayerId,
    techId: string,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    // Validate via rules
    const result = canResearch(state, playerId, techId);
    if (!result.canResearch) return state;

    // Set current research and reset progress
    const updatedPlayer = {
      ...player,
      currentResearch: techId,
      researchProgress: 0,
    };

    // Update sciencePerTurn from current income
    const income = player.incomePerTurn;
    const sciencePerTurn = income.science ?? 0;

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...updatedPlayer,
          sciencePerTurn,
        },
      },
    };
  }

  /**
   * Get available technologies for research.
   *
   * Returns all techs whose prerequisites have been met and
   * which the player hasn't already researched.
   *
   * @param state - Current game state
   * @param playerId - Player to check
   * @returns Array of tech IDs available for research
   */
  static getAvailableTechs(state: GameState, playerId: PlayerId): string[] {
    return rulesGetAvailableTechs(state, playerId);
  }
}

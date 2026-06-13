/**
 * Research/technology rules for "Realms of War".
 *
 * Pure functions implementing technology progression, era advancement,
 * and science accumulation.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { EraId, PlayerId, TechId } from '../core/types';
import type { GameState, PlayerState } from '../core/GameState';
import { TECHNOLOGIES, getTechById, getAvailableTechs as getDataAvailableTechs } from '../../data/technologies';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base science cost per era multiplier point. */
const BASE_TECH_COST = 25;

/** Era thresholds: number of techs required to advance. */
const ERA_THRESHOLDS: Record<EraId, number> = {
  primitives: 0,
  earlyCiv: 3,
  medieval: 7,
  renaissance: 12,
  rift: 18,
};

/** Ordered eras for progression. */
const ERA_ORDER: EraId[] = ['primitives', 'earlyCiv', 'medieval', 'renaissance', 'rift'];

// ─── Can Research ─────────────────────────────────────────────────────────────

/**
 * Check whether a player can research a specific technology.
 *
 * Requirements:
 * - Player is alive
 * - Technology exists
 * - Player hasn't already researched it
 * - Player is not already researching it
 * - All prerequisite techs have been completed
 * - Player has the required era (some techs require minimum era)
 *
 * @param state - Current game state
 * @param playerId - Player attempting research
 * @param techId - Technology to research
 * @returns Whether the player can research, with reason if not
 */
export function canResearch(
  state: GameState,
  playerId: PlayerId,
  techId: string,
): { canResearch: boolean; reason?: string } {
  const player = state.players[playerId];
  if (!player) {
    return { canResearch: false, reason: 'Player not found' };
  }

  if (!player.isAlive) {
    return { canResearch: false, reason: 'Player is eliminated' };
  }

  // Check tech exists
  let tech: typeof TECHNOLOGIES[keyof typeof TECHNOLOGIES] | undefined;
  try {
    tech = getTechById(techId as keyof typeof TECHNOLOGIES);
  } catch {
    return { canResearch: false, reason: 'Technology does not exist' };
  }

  if (!tech) {
    return { canResearch: false, reason: 'Technology does not exist' };
  }

  // Already researched
  if (player.techs.includes(techId as TechId)) {
    return { canResearch: false, reason: 'Technology already researched' };
  }

  // Already researching
  if (player.currentResearch === techId) {
    return { canResearch: false, reason: 'Already researching this technology' };
  }

  // Check prerequisites
  const researched = new Set(player.techs);
  for (const prereq of tech.prerequisites) {
    if (!researched.has(prereq)) {
      return { canResearch: false, reason: `Missing prerequisite: ${prereq}` };
    }
  }

  return { canResearch: true };
}

// ─── Available Techs ─────────────────────────────────────────────────────────

/**
 * Get all technologies a player can currently research.
 *
 * Filters the full tech tree to only those whose prerequisites
 * have been satisfied and which the player hasn't already completed.
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @returns Array of tech IDs available for research
 */
export function getAvailableTechs(
  state: GameState,
  playerId: PlayerId,
): string[] {
  const player = state.players[playerId];
  if (!player || !player.isAlive) return [];

  const researched = new Set(player.techs as (keyof typeof TECHNOLOGIES)[]);
  const available = getDataAvailableTechs(researched);

  return available.map((t) => t.id);
}

// ─── Research Progress ───────────────────────────────────────────────────────

/**
 * Calculate the current research progress for a player.
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @returns Current tech, progress, total cost, and turns remaining
 */
export function calculateResearchProgress(
  state: GameState,
  playerId: PlayerId,
): { currentTech: string | null; progress: number; cost: number; turnsRemaining: number } {
  const player = state.players[playerId];
  if (!player || !player.isAlive || !player.currentResearch) {
    return { currentTech: null, progress: 0, cost: 0, turnsRemaining: 0 };
  }

  const techId = player.currentResearch;
  let techCost = BASE_TECH_COST;

  try {
    const tech = getTechById(techId as keyof typeof TECHNOLOGIES);
    techCost = Math.floor(BASE_TECH_COST * tech.costMultiplier);

    // University tech discount
    // (This is a per-city effect, but we apply it globally for simplicity)
    const playerCities = Object.values(state.cities).filter((c) => c.ownerId === playerId);
    for (const city of playerCities) {
      if (city.buildings.includes('university')) {
        techCost = Math.floor(techCost * 0.9); // 10% discount
      }
    }
  } catch {
    return { currentTech: techId, progress: player.researchProgress, cost: 0, turnsRemaining: 0 };
  }

  const sciencePerTurn = player.sciencePerTurn || 0;
  const remaining = techCost - player.researchProgress;
  const turnsRemaining = sciencePerTurn > 0 ? Math.ceil(remaining / sciencePerTurn) : Infinity;

  return {
    currentTech: techId,
    progress: player.researchProgress,
    cost: techCost,
    turnsRemaining,
  };
}

// ─── Apply Research ──────────────────────────────────────────────────────────

/**
 * Apply one turn of research progress for a player.
 *
 * - Adds science per turn to research progress
 * - If progress >= cost, completes the technology
 * - Updates player era if enough techs have been researched
 * - If no current research, does nothing
 *
 * @param state - Current game state (not mutated)
 * @param playerId - Player to apply research for
 * @returns New game state with updated research progress
 */
export function applyResearch(
  state: GameState,
  playerId: PlayerId,
): GameState {
  const player = state.players[playerId];
  if (!player || !player.isAlive || !player.currentResearch) return state;

  let techCost = BASE_TECH_COST;
  let tech: typeof TECHNOLOGIES[keyof typeof TECHNOLOGIES] | undefined;

  try {
    tech = getTechById(player.currentResearch as keyof typeof TECHNOLOGIES);
    techCost = Math.floor(BASE_TECH_COST * tech.costMultiplier);

    // University tech discount
    const playerCities = Object.values(state.cities).filter((c) => c.ownerId === playerId);
    for (const city of playerCities) {
      if (city.buildings.includes('university')) {
        techCost = Math.floor(techCost * 0.9);
      }
    }
  } catch {
    return state;
  }

  const newProgress = player.researchProgress + player.sciencePerTurn;
  const newTechs = [...player.techs];
  let newCurrentResearch: string | null = player.currentResearch;
  let newResearchProgress = newProgress;

  // Check if research is complete
  if (newProgress >= techCost) {
    newTechs.push(player.currentResearch as TechId);
    newCurrentResearch = null;
    newResearchProgress = 0;
  }

  // Update era based on total techs researched
  const newEra = getCurrentEra(newTechs);

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        techs: newTechs,
        currentResearch: newCurrentResearch,
        researchProgress: newResearchProgress,
        era: newEra,
      },
    },
  };
}

// ─── Era Calculation ─────────────────────────────────────────────────────────

/**
 * Determine the current era based on the number of technologies researched.
 *
 * Era thresholds:
 * - Primitives: 0 techs
 * - Early Civilization: 3 techs
 * - Medieval: 7 techs
 * - Renaissance: 12 techs
 * - Rift: 18 techs
 *
 * @param techs - Array of researched tech IDs
 * @returns Current era ID
 */
export function getCurrentEra(
  techs: string[],
): EraId {
  const count = techs.length;
  let currentEra: EraId = 'primitives';

  for (const era of ERA_ORDER) {
    if (count >= ERA_THRESHOLDS[era]) {
      currentEra = era;
    } else {
      break;
    }
  }

  return currentEra;
}

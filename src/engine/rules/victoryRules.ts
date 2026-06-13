/**
 * Victory condition rules for "Realms of War".
 *
 * Pure functions implementing victory checking and player elimination.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { PlayerId } from '../core/types';
import type { GameState } from '../core/GameState';
import { getTechsByBranch } from '../../data/technologies';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single victory condition check result. */
export interface VictoryCheck {
  /** Name of the victory condition. */
  condition: string;
  /** Whether this condition has been achieved. */
  achieved: boolean;
  /** Progress toward the condition (0.0 to 1.0). */
  progress: number;
  /** Human-readable details about current progress. */
  details: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Conquest: must eliminate all other players (capture/destroy all their cities). */

/** Science: research all technologies in one branch (10 techs in one branch). */
const SCIENCE_VICTORY_TECHS_IN_BRANCH = 10;

/** Economic: accumulate 1000 gold and 500 of each strategic resource. */
const ECONOMIC_GOLD_TARGET = 1000;
const ECONOMIC_STRATEGIC_TARGET = 500;

/** Cultural: build 3 wonders. */
const CULTURAL_WONDER_COUNT = 3;

/** Rift: control 3 rift portals simultaneously. */
const RIFT_PORTAL_COUNT = 3;

// ─── Check Victory ───────────────────────────────────────────────────────────

/**
 * Check all victory conditions for a player.
 *
 * Victory conditions:
 * - Conquest: eliminate all other players
 * - Science: research all technologies in a branch (10 techs in one branch)
 * - Economic: accumulate 1000 gold and 500 of each strategic resource
 * - Cultural: build 3 wonders
 * - Rift: control 3 rift portals simultaneously for 5 consecutive turns
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @returns Array of victory check results for each condition
 */
export function checkVictory(
  state: GameState,
  playerId: PlayerId,
): VictoryCheck[] {
  const player = state.players[playerId];
  if (!player || !player.isAlive) return [];

  const results: VictoryCheck[] = [];

  // ─── Conquest Victory ──────────────────────────────────────────────────
  const alivePlayers = Object.values(state.players).filter(
    (p) => p.isAlive && p.id !== playerId,
  );
  const totalOtherPlayers = Object.values(state.players).filter(
    (p) => p.id !== playerId,
  ).length;
  const eliminatedPlayers = totalOtherPlayers - alivePlayers.length;
  const conquestProgress = totalOtherPlayers > 0 ? eliminatedPlayers / totalOtherPlayers : 1;

  results.push({
    condition: 'conquest',
    achieved: alivePlayers.length === 0 && totalOtherPlayers > 0,
    progress: conquestProgress,
    details: `Eliminated ${eliminatedPlayers}/${totalOtherPlayers} opponents`,
  });

  // ─── Science Victory ───────────────────────────────────────────────────
  const branches = ['military', 'economic', 'science', 'mystical'] as const;
  let maxBranchProgress = 0;
  let bestBranch = '';

  for (const branch of branches) {
    const branchTechs = getTechsByBranch(branch);
    const researchedInBranch = branchTechs.filter(
      (t) => player.techs.includes(t.id as typeof player.techs[number]),
    ).length;
    const branchProgress = branchTechs.length > 0
      ? researchedInBranch / SCIENCE_VICTORY_TECHS_IN_BRANCH
      : 0;

    if (branchProgress > maxBranchProgress) {
      maxBranchProgress = branchProgress;
      bestBranch = branch;
    }
  }

  results.push({
    condition: 'science',
    achieved: maxBranchProgress >= 1,
    progress: Math.min(1, maxBranchProgress),
    details: `Best branch: ${bestBranch} (${Math.floor(maxBranchProgress * SCIENCE_VICTORY_TECHS_IN_BRANCH)}/${SCIENCE_VICTORY_TECHS_IN_BRANCH} techs)`,
  });

  // ─── Economic Victory ──────────────────────────────────────────────────
  const gold = player.resources.gold ?? 0;
  const iron = player.resources.iron ?? 0;
  const mana = player.resources.mana ?? 0;
  const goldProgress = Math.min(1, gold / ECONOMIC_GOLD_TARGET);
  const ironProgress = Math.min(1, iron / ECONOMIC_STRATEGIC_TARGET);
  const manaProgress = Math.min(1, mana / ECONOMIC_STRATEGIC_TARGET);
  const economicProgress = (goldProgress + ironProgress + manaProgress) / 3;
  const economicAchieved = gold >= ECONOMIC_GOLD_TARGET &&
                           iron >= ECONOMIC_STRATEGIC_TARGET &&
                           mana >= ECONOMIC_STRATEGIC_TARGET;

  results.push({
    condition: 'economic',
    achieved: economicAchieved,
    progress: economicProgress,
    details: `Gold: ${gold}/${ECONOMIC_GOLD_TARGET}, Iron: ${iron}/${ECONOMIC_STRATEGIC_TARGET}, Mana: ${mana}/${ECONOMIC_STRATEGIC_TARGET}`,
  });

  // ─── Cultural Victory ──────────────────────────────────────────────────
  const playerCities = Object.values(state.cities).filter((c) => c.ownerId === playerId);
  const wonderBuildings = ['wonder_sun_obelisk', 'wonder_world_tree', 'wonder_astral_gate', 'wonder_great_foundry'];
  const builtWonders = playerCities.reduce((count, city) => {
    return count + city.buildings.filter((b) => wonderBuildings.includes(b)).length;
  }, 0);
  const culturalProgress = Math.min(1, builtWonders / CULTURAL_WONDER_COUNT);

  results.push({
    condition: 'cultural',
    achieved: builtWonders >= CULTURAL_WONDER_COUNT,
    progress: culturalProgress,
    details: `Wonders built: ${builtWonders}/${CULTURAL_WONDER_COUNT}`,
  });

  // ─── Rift Victory ──────────────────────────────────────────────────────
  const controlledPortals = Object.values(state.map.tiles).filter(
    (tile) => tile.hasRiftPortal && tile.riftPortalOwner === playerId,
  ).length;
  const riftProgress = Math.min(1, controlledPortals / RIFT_PORTAL_COUNT);

  // For consecutive turns, we need to track it — for now, simplified check
  // In a full implementation, this would track consecutive turns holding portals
  const riftAchieved = controlledPortals >= RIFT_PORTAL_COUNT; // Simplified: just check current control

  results.push({
    condition: 'rift',
    achieved: riftAchieved,
    progress: riftProgress,
    details: `Rift portals controlled: ${controlledPortals}/${RIFT_PORTAL_COUNT}`,
  });

  return results;
}

// ─── Has Won ─────────────────────────────────────────────────────────────────

/**
 * Check if a player has won the game.
 *
 * A player wins if any victory condition is achieved.
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @returns Whether the player has won, and which condition
 */
export function hasWon(
  state: GameState,
  playerId: PlayerId,
): { won: boolean; condition: string | null } {
  const checks = checkVictory(state, playerId);

  for (const check of checks) {
    if (check.achieved) {
      return { won: true, condition: check.condition };
    }
  }

  return { won: false, condition: null };
}

// ─── Eliminate Player ────────────────────────────────────────────────────────

/**
 * Eliminate a player from the game.
 *
 * This removes the player's ability to take actions:
 * - Sets isAlive to false
 * - Removes all of the player's units
 * - Cities remain on the map (can be captured by others)
 * - Resources are set to 0
 *
 * @param state - Current game state (not mutated)
 * @param playerId - Player to eliminate
 * @returns New game state with the player eliminated
 */
export function eliminatePlayer(
  state: GameState,
  playerId: PlayerId,
): GameState {
  const player = state.players[playerId];
  if (!player || !player.isAlive) return state;

  // Remove all units belonging to this player
  const newEntities = { ...state.entities };
  for (const entityId of Object.keys(newEntities)) {
    if (newEntities[entityId].ownerId === playerId) {
      delete newEntities[entityId];
    }
  }

  // Mark player as dead
  const newPlayers = {
    ...state.players,
    [playerId]: {
      ...player,
      isAlive: false,
      resources: {
        gold: 0,
        food: 0,
        wood: 0,
        stone: 0,
        iron: 0,
        mana: 0,
        progress: 0,
        science: 0,
      },
    },
  };

  // Update turn order (remove eliminated player)
  const newTurnOrder = state.turnOrder.filter((id) => id !== playerId);

  return {
    ...state,
    players: newPlayers,
    entities: newEntities,
    turnOrder: newTurnOrder,
  };
}

// ─── Is Player Alive ─────────────────────────────────────────────────────────

/**
 * Check if a player is still alive in the game.
 *
 * A player is alive if:
 * - Their isAlive flag is true, AND
 * - They have at least one city, OR they have at least one unit
 *
 * If a player has no cities and no units, they should be eliminated.
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @returns Whether the player is still alive
 */
export function isPlayerAlive(
  state: GameState,
  playerId: PlayerId,
): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  if (!player.isAlive) return false;

  // Check if player has any cities
  const hasCities = Object.values(state.cities).some((c) => c.ownerId === playerId);

  // Check if player has any units
  const hasUnits = Object.values(state.entities).some((e) => e.ownerId === playerId);

  return hasCities || hasUnits;
}

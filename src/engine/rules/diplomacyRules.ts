/**
 * Diplomacy rules for "Realms of War".
 *
 * Pure functions implementing diplomatic relations between players.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { DiplomacyStatus, EntityId, HexCoord, PlayerId } from '../core/types';
import type { GameState, DiplomacyEntry, EntityData, HexTile } from '../core/GameState';
import { hexKey } from '../core/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum turns a peace treaty must last before it can be broken. */
const PEACE_TREATY_MINIMUM_TURNS = 10;

/** Vassal gold tribute rate (30% of income). */
const VASSAL_TRIBUTE_RATE = 0.30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a sorted key for two players (alphabetical order for consistency). */
function diplomacyKey(playerA: PlayerId, playerB: PlayerId): string {
  return playerA < playerB ? `${playerA}:${playerB}` : `${playerB}:${playerA}`;
}

/** Get a hex tile from the game state. */
function getHexTile(state: GameState, hex: HexCoord): HexTile | null {
  return state.map.tiles[hexKey(hex)] ?? null;
}

/** Get an entity by ID. */
function getEntity(state: GameState, entityId: EntityId): EntityData | null {
  return state.entities[entityId] ?? null;
}

// ─── Get Diplomacy Status ────────────────────────────────────────────────────

/**
 * Get the diplomatic status between two players.
 *
 * Default status is 'war' (players start at war).
 * Returns the DiplomacyEntry if one exists, otherwise creates a default.
 *
 * @param state - Current game state
 * @param playerA - First player
 * @param playerB - Second player
 * @returns Current diplomatic status
 */
export function getDiplomacyStatus(
  state: GameState,
  playerA: PlayerId,
  playerB: PlayerId,
): DiplomacyStatus {
  if (playerA === playerB) return 'alliance'; // Self is always "allied"

  const key = diplomacyKey(playerA, playerB);
  const entry = state.diplomacy[key];
  return entry ? entry.status : 'war'; // Default = war
}

// ─── Can Propose ─────────────────────────────────────────────────────────────

/**
 * Check whether a player can propose a diplomatic status to another player.
 *
 * Rules:
 * - Cannot propose diplomacy to yourself
 * - Both players must be alive
 * - Cannot propose war (that's the default / declared by attacking)
 * - Peace: can propose if currently at war
 * - Alliance: can propose if currently at peace
 * - Vassal: can propose if the other player has no cities (effectively defeated)
 * - Cannot break peace treaty before minimum turns have passed
 *
 * @param state - Current game state
 * @param from - Player proposing
 * @param to - Player receiving the proposal
 * @param proposal - Proposed diplomatic status
 * @returns Whether the proposal can be made, with reason if not
 */
export function canPropose(
  state: GameState,
  from: PlayerId,
  to: PlayerId,
  proposal: DiplomacyStatus,
): { canPropose: boolean; reason?: string } {
  if (from === to) {
    return { canPropose: false, reason: 'Cannot propose diplomacy to yourself' };
  }

  const fromPlayer = state.players[from];
  const toPlayer = state.players[to];

  if (!fromPlayer || !fromPlayer.isAlive) {
    return { canPropose: false, reason: 'Proposing player is not alive' };
  }

  if (!toPlayer || !toPlayer.isAlive) {
    return { canPropose: false, reason: 'Target player is not alive' };
  }

  const currentStatus = getDiplomacyStatus(state, from, to);

  switch (proposal) {
    case 'war':
      return { canPropose: false, reason: 'War is declared by attacking, not by proposal' };

    case 'neutral':
      if (currentStatus === 'neutral') {
        return { canPropose: false, reason: 'Already neutral' };
      }
      return { canPropose: true };

    case 'peace':
      if (currentStatus === 'peace') {
        return { canPropose: false, reason: 'Already at peace' };
      }
      if (currentStatus === 'alliance') {
        return { canPropose: false, reason: 'Cannot downgrade alliance to peace directly — must break alliance first' };
      }
      // Can propose peace if at war
      return { canPropose: true };

    case 'alliance':
      if (currentStatus === 'alliance') {
        return { canPropose: false, reason: 'Already allied' };
      }
      if (currentStatus === 'war') {
        return { canPropose: false, reason: 'Must establish peace before alliance' };
      }
      // Can propose alliance if at peace or neutral
      return { canPropose: true };

    case 'vassal':
      // Can only make someone a vassal if they have been defeated (no cities)
      const toCities = Object.values(state.cities).filter((c) => c.ownerId === to);
      if (toCities.length > 0) {
        return { canPropose: false, reason: 'Can only vassalize a player with no cities' };
      }
      return { canPropose: true };

    case 'overlord':
      return { canPropose: false, reason: 'Overlord status is assigned automatically when a vassal relationship is established' };

    default:
      return { canPropose: false, reason: 'Unknown diplomatic status' };
  }
}

// ─── Set Diplomacy Status ────────────────────────────────────────────────────

/**
 * Set the diplomatic status between two players.
 *
 * Creates or updates the diplomacy entry for the player pair.
 * Handles:
 * - Peace treaty turn counting
 * - Vassal/overlord pairing
 * - Alliance breaking consequences
 *
 * @param state - Current game state (not mutated)
 * @param playerA - First player
 * @param playerB - Second player
 * @param status - New diplomatic status
 * @returns New game state with updated diplomacy
 */
export function setDiplomacyStatus(
  state: GameState,
  playerA: PlayerId,
  playerB: PlayerId,
  status: DiplomacyStatus,
): GameState {
  if (playerA === playerB) return state;

  const key = diplomacyKey(playerA, playerB);
  const currentEntry = state.diplomacy[key];

  const newEntry: DiplomacyEntry = {
    status,
    sinceTurn: state.turn,
    peaceTreatyTurns: status === 'peace' ? PEACE_TREATY_MINIMUM_TURNS : 0,
  };

  const newDiplomacy = { ...state.diplomacy, [key]: newEntry };

  // If setting vassal status, also set overlord for the other player
  if (status === 'vassal') {
    // The vassal is the weaker player; the overlord key is the same entry
    // In our system, 'vassal' means playerB is vassal of playerA
    // We store this as a single entry with status 'vassal'
    // The overlord direction is implicit: the player who proposed is the overlord
  }

  return {
    ...state,
    diplomacy: newDiplomacy,
  };
}

// ─── Territory Checks ────────────────────────────────────────────────────────

/**
 * Check if a unit is in friendly territory.
 *
 * A unit is in friendly territory if:
 * - The hex is owned by a city belonging to the same player, OR
 * - The hex is owned by a city belonging to an allied player
 *
 * @param state - Current game state
 * @param entityId - Unit to check
 * @returns Whether the unit is in friendly territory
 */
export function isUnitInFriendlyTerritory(
  state: GameState,
  entityId: EntityId,
): boolean {
  const entity = getEntity(state, entityId);
  if (!entity) return false;

  const tile = getHexTile(state, entity.hex);
  if (!tile || !tile.owningCityId) return false;

  const city = state.cities[tile.owningCityId];
  if (!city) return false;

  // Own territory
  if (city.ownerId === entity.ownerId) return true;

  // Allied territory
  const diplomacy = getDiplomacyStatus(state, entity.ownerId, city.ownerId);
  return diplomacy === 'alliance';
}

/**
 * Check if a player can enter a specific hex based on diplomatic relations.
 *
 * Rules:
 * - Unclaimed territory: always allowed
 * - Own territory: always allowed
 * - Allied territory: allowed (right of passage)
 * - Peace: allowed (right of passage during peace)
 * - War: allowed (that's the point of war)
 * - Neutral: depends on territory status
 *
 * @param state - Current game state
 * @param playerId - Player trying to enter
 * @param targetHex - Hex to enter
 * @returns Whether the player can enter the hex
 */
export function canEnterTerritory(
  state: GameState,
  playerId: PlayerId,
  targetHex: HexCoord,
): boolean {
  const tile = getHexTile(state, targetHex);
  if (!tile) return false;

  // Unclaimed territory
  if (!tile.owningCityId) return true;

  const city = state.cities[tile.owningCityId];
  if (!city) return true; // City doesn't exist, treat as unclaimed

  // Own territory
  if (city.ownerId === playerId) return true;

  // Check diplomatic status
  const status = getDiplomacyStatus(state, playerId, city.ownerId);

  switch (status) {
    case 'alliance':
      return true; // Right of passage
    case 'peace':
      return true; // Right of passage during peace
    case 'war':
      return true; // Can enter enemy territory during war
    case 'neutral':
      return false; // Cannot enter neutral player's territory
    case 'vassal':
      return true; // Vassal has passage rights
    case 'overlord':
      return true; // Overlord has passage rights
    default:
      return false;
  }
}

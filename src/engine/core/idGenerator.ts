/**
 * Deterministic ID generators for "Realms of War".
 *
 * Instead of using `Date.now()` + `Math.random()` (which break replays),
 * IDs are produced from monotonic counters stored in GameState.
 * This guarantees that one seed + one command list = one state.
 *
 * Each generator returns both the new ID and the updated state,
 * so counters are threaded through the state immutably.
 */

import type { GameState } from './GameState';
import type { EntityId, CityId } from './types';

/**
 * Generate the next deterministic entity (unit) ID.
 * Advances `state.nextEntitySeq` by 1.
 */
export function nextEntityId(state: GameState): { state: GameState; id: EntityId } {
  const seq = state.nextEntitySeq ?? 1;
  return {
    state: { ...state, nextEntitySeq: seq + 1 },
    id: `entity-${seq}`,
  };
}

/**
 * Generate the next deterministic city ID.
 * Advances `state.nextCitySeq` by 1.
 */
export function nextCityId(state: GameState): { state: GameState; id: CityId } {
  const seq = state.nextCitySeq ?? 1;
  return {
    state: { ...state, nextCitySeq: seq + 1 },
    id: `city-${seq}`,
  };
}

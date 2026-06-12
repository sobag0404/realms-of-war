/**
 * Events barrel — re-exports all event types and utilities from EventBus.
 */

export type {
  GameEventMap,
  GameEventType,
  GameEventPayload,
  GameEvent,
  EventListener,
} from '../core/EventBus';

export { EventBus } from '../core/EventBus';

// ─── Event utilities ───────────────────────────────────────────────────────────

import type { GameEvent, GameEventType } from '../core/EventBus';

/**
 * Filter an event log to only broadcast (visibility === null) events
 * and events visible to a specific player.
 */
export function filterEventsForPlayer<T extends GameEventType>(
  events: readonly GameEvent[],
  playerId: string,
  types?: T[],
): GameEvent[] {
  return events.filter((e) => {
    // Must be visible to this player (or broadcast)
    if (e.visibility !== null && e.visibility !== playerId) return false;
    // Must match requested types (if specified)
    if (types && !types.includes(e.type as T)) return false;
    return true;
  });
}

/**
 * Get the most recent N events of a given type.
 */
export function getRecentEvents<T extends GameEventType>(
  events: readonly GameEvent[],
  type: T,
  count: number,
): GameEvent<T>[] {
  const filtered = events.filter(
    (e): e is GameEvent<T> => e.type === type,
  );
  return filtered.slice(-count);
}

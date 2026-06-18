/**
 * Typed event bus for "Realms of War".
 *
 * Provides a decoupled publish/subscribe mechanism with:
 *  - Full TypeScript type safety for event payloads
 *  - Event visibility (broadcast-to-all vs. player-specific)
 *  - Listener prioritisation (lower number = called first)
 *
 * The bus itself stores no game state — it only routes events between
 * engine subsystems and the presentation layer.
 */

import type { PlayerId, HexCoord, CityId, EntityId, ResourceId } from './types';

// ─── Event Definitions ────────────────────────────────────────────────────────

export interface GameEventMap {
  TurnStarted: {
    turn: number;
    playerId: PlayerId;
  };

  ResourcesChanged: {
    playerId: PlayerId;
    resource: ResourceId;
    oldAmount: number;
    newAmount: number;
  };

  UnitMoved: {
    entityId: EntityId;
    from: HexCoord;
    to: HexCoord;
    remainingMP: number;
  };

  AttackStarted: {
    attackerId: EntityId;
    defenderId: EntityId | null; // null = city attack
    targetCityId: CityId | null;
    attackType: string;
  };

  DamageApplied: {
    targetId: EntityId | CityId;
    amount: number;
    damageType: string;
    isCritical: boolean;
  };

  UnitKilled: {
    entityId: EntityId;
    killedBy: PlayerId;
    position: HexCoord;
  };

  CityFounded: {
    cityId: CityId;
    name: string;
    hex: HexCoord;
    ownerId: PlayerId;
  };

  BuildingCompleted: {
    cityId: CityId;
    buildingType: string;
  };

  UnitRecruited: {
    cityId: CityId;
    entityId: EntityId;
    unitType: string;
    ownerId: PlayerId;
    hex: HexCoord;
  };

  TechnologyCompleted: {
    playerId: PlayerId;
    techId: string;
  };

  FogUpdated: {
    playerId: PlayerId;
    newlyVisible: HexCoord[];
    newlyExplored: HexCoord[];
    newlyHidden: HexCoord[];
  };
}

/** Union of all event type names. */
export type GameEventType = keyof GameEventMap;

/** Payload for a given event type. */
export type GameEventPayload<E extends GameEventType> = GameEventMap[E];

// ─── Event Envelope ───────────────────────────────────────────────────────────

export interface GameEvent<E extends GameEventType = GameEventType> {
  type: E;
  payload: GameEventPayload<E>;
  /** Turn number when this event was emitted. */
  turn: number;
  /**
   * If set, the event is only visible to this player.
   * If null, the event is visible to all players (broadcast).
   */
  visibility: PlayerId | null;
}

// ─── Listener ─────────────────────────────────────────────────────────────────

export type EventListener<E extends GameEventType> = (
  event: GameEvent<E>,
) => void;

interface ListenerEntry {
  priority: number;
  listener: EventListener<any>;
  once: boolean;
}

// ─── EventBus ─────────────────────────────────────────────────────────────────

export class EventBus {
  private listeners = new Map<GameEventType, ListenerEntry[]>();
  private eventLog: GameEvent[] = [];
  private turnCounter = 0;

  /** Set the current turn (called by the engine at turn start). */
  setTurn(turn: number): void {
    this.turnCounter = turn;
  }

  // ─── Subscribe ──────────────────────────────────────────────────────────

  /**
   * Register a listener for a specific event type.
   * Lower priority numbers are called first (default = 0).
   * Returns an unsubscribe function.
   */
  on<E extends GameEventType>(
    type: E,
    listener: EventListener<E>,
    priority: number = 0,
  ): () => void {
    const entry: ListenerEntry = { priority, listener, once: false };
    this.addListenerEntry(type, entry);

    // Return unsubscribe function
    return () => {
      this.removeListener(type, listener);
    };
  }

  /**
   * Register a one-time listener that auto-removes after first call.
   * Returns an unsubscribe function.
   */
  once<E extends GameEventType>(
    type: E,
    listener: EventListener<E>,
    priority: number = 0,
  ): () => void {
    const entry: ListenerEntry = { priority, listener, once: true };
    this.addListenerEntry(type, entry);

    return () => {
      this.removeListener(type, listener);
    };
  }

  // ─── Unsubscribe ───────────────────────────────────────────────────────

  /**
   * Remove a specific listener.  If the same function was registered
   * multiple times, only the first match is removed.
   */
  off<E extends GameEventType>(type: E, listener: EventListener<E>): void {
    this.removeListener(type, listener);
  }

  /** Remove ALL listeners for a given event type. */
  offAll(type?: GameEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  // ─── Emit ───────────────────────────────────────────────────────────────

  /**
   * Emit an event to all relevant listeners.
   *
   * @param type      Event type name
   * @param payload   Event-specific data
   * @param visibility  PlayerId for player-specific events, or null for broadcast
   */
  emit<E extends GameEventType>(
    type: E,
    payload: GameEventPayload<E>,
    visibility: PlayerId | null = null,
  ): GameEvent<E> {
    const event: GameEvent<E> = {
      type,
      payload,
      turn: this.turnCounter,
      visibility,
    };

    // Log the event
    this.eventLog.push(event as GameEvent);

    // Dispatch to listeners
    const entries = this.listeners.get(type);
    if (!entries) return event;

    // Iterate over a snapshot so listeners can safely unsubscribe during dispatch
    const snapshot = [...entries];
    const toRemove: EventListener<any>[] = [];

    for (const entry of snapshot) {
      entry.listener(event);
      if (entry.once) {
        toRemove.push(entry.listener);
      }
    }

    // Remove one-shot listeners
    for (const listener of toRemove) {
      this.removeListener(type, listener);
    }

    return event;
  }

  // ─── Query ─────────────────────────────────────────────────────────────

  /** Get all events emitted so far. */
  getEventLog(): readonly GameEvent[] {
    return this.eventLog;
  }

  /** Get events visible to a specific player (or all broadcast events). */
  getEventsForPlayer(playerId: PlayerId): GameEvent[] {
    return this.eventLog.filter(
      (e) => e.visibility === null || e.visibility === playerId,
    );
  }

  /** Get events of a specific type. */
  getEventsByType<E extends GameEventType>(type: E): GameEvent<E>[] {
    return this.eventLog.filter(
      (e): e is GameEvent<E> => e.type === type,
    );
  }

  /** Clear the event log (e.g., on game reset). */
  clearLog(): void {
    this.eventLog = [];
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private addListenerEntry(type: GameEventType, entry: ListenerEntry): void {
    let entries = this.listeners.get(type);
    if (!entries) {
      entries = [];
      this.listeners.set(type, entries);
    }
    entries.push(entry);
    // Keep sorted by priority (stable — later registrations with same
    // priority come after earlier ones).
    entries.sort((a, b) => a.priority - b.priority);
  }

  private removeListener(
    type: GameEventType,
    listener: EventListener<any>,
  ): void {
    const entries = this.listeners.get(type);
    if (!entries) return;
    const idx = entries.findIndex((e) => e.listener === listener);
    if (idx !== -1) entries.splice(idx, 1);
  }
}

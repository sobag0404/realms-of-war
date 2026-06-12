/**
 * GameProvider — React context provider that manages the GameEngine lifecycle.
 *
 * Responsibilities:
 * 1. Subscribes to EventBus events when a game engine is active
 * 2. Translates engine events into store updates (notifications, UI state)
 * 3. Cleans up subscriptions on unmount or when the engine is replaced
 *
 * This provider does NOT create the engine — that's done by the
 * sessionSlice's startNewGame() action. This provider merely reacts
 * to engine lifecycle changes.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { GameEventType } from '@/engine/core/EventBus';

// ─── Event to Notification Mapping ────────────────────────────────────────────

const EVENT_NOTIFICATION_MAP: Partial<
  Record<GameEventType, { type: 'info' | 'success' | 'warning' | 'error'; title: string }>
> = {
  CityFounded: { type: 'success', title: 'City Founded' },
  TechnologyCompleted: { type: 'success', title: 'Research Complete' },
  BuildingCompleted: { type: 'success', title: 'Building Complete' },
  UnitKilled: { type: 'warning', title: 'Unit Lost' },
};

// ─── Provider Component ───────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameStore((s) => s.engine);
  const addNotification = useGameStore((s) => s.addNotification);
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Clean up any existing subscriptions
    for (const unsub of unsubscribeRefs.current) {
      unsub();
    }
    unsubscribeRefs.current = [];

    if (!engine) return;

    const eventBus = engine.getEventBus();

    // Subscribe to key game events and translate them to UI updates

    // ── Unit Moved ──────────────────────────────────────────────────────────
    const unsubMoved = eventBus.on('UnitMoved', (_event) => {
      // Could update animation state or selection here
    });

    // ── Attack Started ──────────────────────────────────────────────────────
    const unsubAttack = eventBus.on('AttackStarted', (_event) => {
      // Could trigger combat animation here
    });

    // ── Unit Killed ─────────────────────────────────────────────────────────
    const unsubKilled = eventBus.on('UnitKilled', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.UnitKilled;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `Unit was destroyed`,
          duration: 4000,
        });
      }
    });

    // ── City Founded ────────────────────────────────────────────────────────
    const unsubCity = eventBus.on('CityFounded', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.CityFounded;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `${event.payload.name} has been founded!`,
          duration: 5000,
        });
      }
    });

    // ── Building Completed ──────────────────────────────────────────────────
    const unsubBuilding = eventBus.on('BuildingCompleted', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.BuildingCompleted;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `${event.payload.buildingType} completed`,
          duration: 4000,
        });
      }
    });

    // ── Technology Completed ────────────────────────────────────────────────
    const unsubTech = eventBus.on('TechnologyCompleted', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.TechnologyCompleted;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `${event.payload.techId} researched!`,
          duration: 5000,
        });
      }
    });

    // ── Turn Started ────────────────────────────────────────────────────────
    const unsubTurn = eventBus.on('TurnStarted', (event) => {
      addNotification({
        type: 'info',
        title: 'New Turn',
        message: `Turn ${event.payload.turn} — ${event.payload.playerId}'s turn`,
        duration: 3000,
      });
    });

    // ── Resources Changed ───────────────────────────────────────────────────
    const unsubResources = eventBus.on('ResourcesChanged', (_event) => {
      // Resource changes are reflected in the state snapshot,
      // no need for notifications on every change
    });

    // ── Fog Updated ─────────────────────────────────────────────────────────
    const unsubFog = eventBus.on('FogUpdated', (_event) => {
      // Fog updates are reflected in the state snapshot
    });

    // ── Damage Applied ──────────────────────────────────────────────────────
    const unsubDamage = eventBus.on('DamageApplied', (_event) => {
      // Could trigger damage number animation here
    });

    // Store all unsubscribe functions
    unsubscribeRefs.current = [
      unsubMoved,
      unsubAttack,
      unsubKilled,
      unsubCity,
      unsubBuilding,
      unsubTech,
      unsubTurn,
      unsubResources,
      unsubFog,
      unsubDamage,
    ];

    // Cleanup on unmount or when engine changes
    return () => {
      for (const unsub of unsubscribeRefs.current) {
        unsub();
      }
      unsubscribeRefs.current = [];
    };
  }, [engine, addNotification]);

  return <>{children}</>;
}

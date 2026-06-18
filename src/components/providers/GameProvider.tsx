/**
 * GameProvider — React context provider that manages the GameEngine lifecycle
 * and AI auto-play.
 *
 * Responsibilities:
 * 1. Subscribes to EventBus events when a game engine is active
 * 2. Translates engine events into store updates (notifications, UI state)
 * 3. Auto-executes AI turns when the active player is AI
 * 4. Cleans up subscriptions on unmount or when the engine is replaced
 *
 * This provider does NOT create the engine — that's done by the
 * sessionSlice's startNewGame() action. This provider merely reacts
 * to engine lifecycle changes.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { AiSystem } from '@/engine/ecs/systems/AiSystem';
import { getWorkerManager } from '@/workers/workerManager';
import type { GameEventType } from '@/engine/core/EventBus';
import type { GameCommand } from '@/engine/core/CommandQueue';

// ─── Event to Notification Mapping ────────────────────────────────────────────

const EVENT_NOTIFICATION_MAP: Partial<
  Record<GameEventType, { type: 'info' | 'success' | 'warning' | 'error'; title: string }>
> = {
  CityFounded: { type: 'success', title: 'Город основан' },
  TechnologyCompleted: { type: 'success', title: 'Исследование завершено' },
  BuildingCompleted: { type: 'success', title: 'Здание построено' },
  UnitRecruited: { type: 'success', title: 'Unit recruited' },
  AiPressureChanged: { type: 'warning', title: 'AI pressure rising' },
  UnitKilled: { type: 'warning', title: 'Юнит потерян' },
};

// ─── AI Turn Delay (ms) ──────────────────────────────────────────────────────

const AI_TURN_DELAY = 800;

// ─── Provider Component ───────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameStore((s) => s.engine);
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const mode = useGameStore((s) => s.mode);
  const addNotification = useGameStore((s) => s.addNotification);
  const addOptimisticEvent = useGameStore((s) => s.addOptimisticEvent);
  const dispatchCommand = useGameStore((s) => s.dispatchCommand);
  const endTurn = useGameStore((s) => s.endTurn);
  const unsubscribeRefs = useRef<Array<() => void>>([]);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAiProcessingRef = useRef(false);

  // ── AI Auto-Play ──────────────────────────────────────────────────────────

  const executeAiTurn = useCallback(() => {
    if (!engine || !gameState) return;

    const player = gameState.players[activePlayerId];
    if (!player || !player.isAI || !player.isAlive) return;

    isAiProcessingRef.current = true;

    // Use the AI worker (async) with synchronous fallback.
    // The worker manager's requestAiTurn internally falls back to
    // AiSystem.generateTurn if the worker fails or is unavailable.
    const workerManager = getWorkerManager();
    const eventBus = engine.getEventBus();
    const pressureEventCount = eventBus.getEventsByType('AiPressureChanged').length;
    workerManager.setEventBus(eventBus);

    workerManager
      .requestAiTurn(gameState, activePlayerId, 'normal')
      .then((result) => {
        const commands = result.commands as GameCommand[];
        if (eventBus.getEventsByType('AiPressureChanged').length === pressureEventCount) {
          eventBus.emit('AiPressureChanged', AiSystem.createPressureReport(
            gameState,
            activePlayerId,
            commands,
          ));
        }

        // Dispatch each command sequentially
        // Skip EndTurn — we'll call endTurn() separately for cleaner state updates
        for (const command of commands) {
          if (command.type === 'EndTurn') continue;
          try {
            dispatchCommand(command);
          } catch {
            // Skip invalid AI commands silently
          }
        }

        // End the AI's turn
        endTurn();
        isAiProcessingRef.current = false;
      })
      .catch(() => {
        // Worker + fallback both failed — use AiSystem directly as last resort
        try {
          const commands = AiSystem.generateTurn(gameState, activePlayerId, engine.getEventBus());
          for (const command of commands) {
            if (command.type === 'EndTurn') continue;
            try {
              dispatchCommand(command);
            } catch {
              // Skip invalid AI commands silently
            }
          }
          endTurn();
        } catch {
          // If AI fails completely, force-end the turn to prevent softlock
          endTurn();
        } finally {
          isAiProcessingRef.current = false;
        }
      });
  }, [engine, gameState, activePlayerId, dispatchCommand, endTurn]);

  // Watch for AI turns and auto-execute them with a delay
  useEffect(() => {
    // Clear any pending AI timeout
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    if (!gameState || !engine) return;
    if (mode === 'single') return;

    const player = gameState.players[activePlayerId];
    if (!player || !player.isAI || !player.isAlive) return;
    if (isAiProcessingRef.current) return;

    // Schedule AI turn execution with a visual delay
    aiTimeoutRef.current = setTimeout(() => {
      executeAiTurn();
      aiTimeoutRef.current = null;
    }, AI_TURN_DELAY);

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [gameState, engine, activePlayerId, mode, executeAiTurn]);

  // ── EventBus Subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    // Clean up any existing subscriptions
    for (const unsub of unsubscribeRefs.current) {
      unsub();
    }
    unsubscribeRefs.current = [];

    if (!engine) return;

    const eventBus = engine.getEventBus();

    // ── Unit Moved ──────────────────────────────────────────────────────────
    const unsubMoved = eventBus.on('UnitMoved', (_event) => {
      // Could update animation state or selection here
    });

    // ── Attack Started ──────────────────────────────────────────────────────
    const unsubAttack = eventBus.on('AttackStarted', (event) => {
      addOptimisticEvent(event);
    });

    // ── City Founded ────────────────────────────────────────────────────────
    const unsubCity = eventBus.on('CityFounded', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.CityFounded;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `${event.payload.name} основан!`,
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
          message: `${event.payload.buildingType} построен`,
          duration: 4000,
        });
      }
    });

    const unsubUnitRecruited = eventBus.on('UnitRecruited', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.UnitRecruited;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `${event.payload.unitType} ready for orders`,
          duration: 4000,
        });
      }
    });

    const unsubAiPressure = eventBus.on('AiPressureChanged', (event) => {
      const mapping = EVENT_NOTIFICATION_MAP.AiPressureChanged;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `${event.payload.primaryFocus}: ${event.payload.pressureScore} pressure, ${event.payload.plannedProduction.length} production orders`,
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
          message: `${event.payload.techId} исследована!`,
          duration: 5000,
        });
      }
    });

    // ── Turn Started ────────────────────────────────────────────────────────
    const unsubTurn = eventBus.on('TurnStarted', (event) => {
      const player = gameState?.players[event.payload.playerId];
      addNotification({
        type: 'info',
        title: 'Новый ход',
        message: `Ход ${event.payload.turn} — ${player?.name ?? event.payload.playerId}`,
        duration: 3000,
      });
    });

    // ── Resources Changed ───────────────────────────────────────────────────
    const unsubResources = eventBus.on('ResourcesChanged', (_event) => {
      // Resource changes are reflected in the state snapshot
    });

    // ── Fog Updated ─────────────────────────────────────────────────────────
    const unsubFog = eventBus.on('FogUpdated', (_event) => {
      // Fog updates are reflected in the state snapshot
    });

    // ── Damage Applied ──────────────────────────────────────────────────────
    const unsubDamage = eventBus.on('DamageApplied', (event) => {
      addOptimisticEvent(event);
    });

    // ── Attack Started (separate subscription for unit killed) ──────────────
    const unsubUnitKilled = eventBus.on('UnitKilled', (_event) => {
      const mapping = EVENT_NOTIFICATION_MAP.UnitKilled;
      if (mapping) {
        addNotification({
          type: mapping.type,
          title: mapping.title,
          message: `Юнит уничтожен`,
          duration: 4000,
        });
      }
    });

    // Store all unsubscribe functions
    unsubscribeRefs.current = [
      unsubMoved,
      unsubAttack,
      unsubCity,
      unsubBuilding,
      unsubUnitRecruited,
      unsubAiPressure,
      unsubTech,
      unsubTurn,
      unsubResources,
      unsubFog,
      unsubDamage,
      unsubUnitKilled,
    ];

    // Cleanup on unmount or when engine changes
    return () => {
      for (const unsub of unsubscribeRefs.current) {
        unsub();
      }
      unsubscribeRefs.current = [];
    };
  }, [engine, addNotification, addOptimisticEvent, gameState]);

  // Cleanup AI timeout on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  return <>{children}</>;
}

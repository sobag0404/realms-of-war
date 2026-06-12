/**
 * Session slice — manages the GameEngine instance and state snapshots.
 *
 * This slice bridges the game engine and the React UI. It holds:
 * - A reference to the GameEngine instance
 * - The latest GameState snapshot
 * - Session metadata (mode, active player, errors)
 *
 * Game rules live in src/engine/rules/ — this slice does NOT contain game logic.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../useGameStore';
import type { GameConfig } from '@/engine/core/GameConfig';
import type { GameState } from '@/engine/core/GameState';
import type { GameCommand } from '@/engine/core/CommandQueue';
import type { PlayerId, GameMode } from '@/engine/core/types';
import { GameEngine, EngineError } from '@/engine/core/GameEngine';
import { generateMap } from '@/engine/mapgen/generateMap';
import { createDefaultConfig } from '@/engine/core/GameConfig';
import { getWorkerManager } from '@/workers/workerManager';
import { populateStartingPositions } from '@/engine/core/startPositions';

// ─── Slice Interface ──────────────────────────────────────────────────────────

export interface SessionSlice {
  // State
  engine: GameEngine | null;
  gameState: GameState | null;
  snapshotVersion: number;
  mode: GameMode;
  activePlayerId: PlayerId;
  localPlayerIds: PlayerId[];
  isProcessingCommand: boolean;
  lastError: { message: string; code: string } | null;

  // Actions
  startNewGame: (config: GameConfig) => void;
  loadGame: (state: GameState) => void;
  saveGame: (name?: string) => Promise<boolean>;
  dispatchCommand: (command: GameCommand) => void;
  endTurn: () => void;
  resetGame: () => void;
  setMode: (mode: SessionSlice['mode']) => void;
  clearError: () => void;
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

const ERROR_CODES = {
  NO_ENGINE: 'NO_ENGINE',
  INVALID_COMMAND: 'INVALID_COMMAND',
  ENGINE_ERROR: 'ENGINE_ERROR',
} as const;

// ─── Slice Creator ────────────────────────────────────────────────────────────

export const createSessionSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  SessionSlice
> = (set, get) => ({
  // ── Initial State ────────────────────────────────────────────────────────

  engine: null,
  gameState: null,
  snapshotVersion: 0,
  mode: 'menu',
  activePlayerId: '',
  localPlayerIds: [],
  isProcessingCommand: false,
  lastError: null,

  // ── Actions ──────────────────────────────────────────────────────────────

  startNewGame: (config: GameConfig) => {
    try {
      // 1. Create a new GameEngine with the config
      const engine = new GameEngine(config);

      // Mark as processing while map generates asynchronously
      set({ isProcessingCommand: true }, false, 'session/startNewGame/begin');

      // 2. Determine map generation parameters
      const mapGenWidth = config.map.radius * 2;
      const mapGenHeight = Math.floor(config.map.radius * 1.5);
      const mapGenSeed = config.seed;
      const mapGenPlayers = config.players.length;

      // Determine mode & local players (these don't depend on map)
      const mode: GameMode = config.mode;
      const localPlayerIds = config.players
        .filter((p) => !p.isAI)
        .map((p) => p.id);

      // 3. Use mapgen worker (async) with sync fallback.
      //    requestMapgen internally falls back to synchronous generateMap()
      //    if the worker fails or is unavailable.
      const workerManager = getWorkerManager();
      const initialState = engine.getState();

      // Helper: build starting positions from mapgen result
      const buildStartingPositions = (
        startingHexes: Array<{ q: number; r: number }>,
      ) => {
        const playerIds = config.players.map((p) => p.id);
        return startingHexes
          .slice(0, playerIds.length)
          .map((hex, i) => ({
            playerId: playerIds[i],
            hex,
          }));
      };

      workerManager
        .requestMapgen(mapGenWidth, mapGenHeight, mapGenSeed, mapGenPlayers)
        .then((result) => {
          // Merge generated map into engine state
          let stateWithMap: GameState = {
            ...initialState,
            map: result.mapData as GameState['map'],
          };

          // Populate starting units and cities at the generated starting positions
          const positions = buildStartingPositions(result.startingPositions);
          if (positions.length > 0) {
            stateWithMap = populateStartingPositions(stateWithMap, positions);
          }

          // Sync engine state with the populated state
          engine.setState(stateWithMap);

          set(
            {
              engine,
              gameState: stateWithMap,
              snapshotVersion: 1,
              mode,
              activePlayerId: initialState.activePlayerId,
              localPlayerIds,
              isProcessingCommand: false,
              lastError: null,
            },
            false,
            'session/startNewGame',
          );
        })
        .catch(() => {
          // Worker + fallback both failed — use synchronous generateMap directly
          try {
            const mapResult = generateMap({
              width: mapGenWidth,
              height: mapGenHeight,
              seed: mapGenSeed,
              playerCount: mapGenPlayers,
            });

            let stateWithMap: GameState = {
              ...initialState,
              map: mapResult.mapData,
            };

            // Populate starting units and cities
            const positions = buildStartingPositions(mapResult.startingPositions);
            if (positions.length > 0) {
              stateWithMap = populateStartingPositions(stateWithMap, positions);
            }

            // Sync engine state with the populated state
            engine.setState(stateWithMap);

            set(
              {
                engine,
                gameState: stateWithMap,
                snapshotVersion: 1,
                mode,
                activePlayerId: initialState.activePlayerId,
                localPlayerIds,
                isProcessingCommand: false,
                lastError: null,
              },
              false,
              'session/startNewGame/fallback',
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to start game';
            set(
              {
                lastError: { message, code: ERROR_CODES.ENGINE_ERROR },
                isProcessingCommand: false,
              },
              false,
              'session/startNewGameError',
            );
          }
        });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start game';
      set(
        {
          lastError: { message, code: ERROR_CODES.ENGINE_ERROR },
          isProcessingCommand: false,
        },
        false,
        'session/startNewGameError',
      );
    }
  },

  loadGame: (state: GameState) => {
    try {
      // Reconstruct the engine from the loaded state
      const config = createDefaultConfig({
        version: state.version,
        seed: state.seed,
        players: Object.values(state.players).map((p, i) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          isAI: p.isAI,
          slot: i,
        })),
        map: {
          radius: state.map.radius,
          type: 'continents',
          waterLevel: 0.3,
          mountainDensity: 0.1,
          forestDensity: 0.2,
          resourceAbundance: 0.5,
          riftPortals: 3,
        },
      });

      const engine = new GameEngine(config);
      engine.setState(state);

      const localPlayerIds = Object.values(state.players)
        .filter((p) => !p.isAI)
        .map((p) => p.id);

      set(
        {
          engine,
          gameState: state,
          snapshotVersion: get().snapshotVersion + 1,
          activePlayerId: state.activePlayerId,
          mode: 'single',
          localPlayerIds,
          isProcessingCommand: false,
          lastError: null,
        },
        false,
        'session/loadGame',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load game';
      set(
        {
          lastError: { message, code: ERROR_CODES.ENGINE_ERROR },
        },
        false,
        'session/loadGameError',
      );
    }
  },

  saveGame: async (name?: string) => {
    const { gameState } = get();
    if (!gameState) return false;

    try {
      const saveName = name ?? `Автосохранение — Ход ${gameState.turn}`;
      const playerNames = Object.values(gameState.players)
        .map((p) => p.name)
        .join(', ');

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          turn: gameState.turn,
          players: playerNames,
          data: JSON.stringify(gameState),
          checksum: '',
        }),
      });

      return res.ok;
    } catch {
      return false;
    }
  },

  dispatchCommand: (command: GameCommand) => {
    const { engine } = get();

    if (!engine) {
      set(
        {
          lastError: {
            message: 'No game engine available',
            code: ERROR_CODES.NO_ENGINE,
          },
        },
        false,
        'session/dispatchCommandError',
      );
      return;
    }

    set({ isProcessingCommand: true }, false, 'session/dispatchStart');

    try {
      // Call engine.dispatch(command)
      const newState = engine.dispatch(command);

      // Update gameState with the new snapshot
      // Increment snapshotVersion
      set(
        {
          gameState: newState,
          snapshotVersion: get().snapshotVersion + 1,
          activePlayerId: newState.activePlayerId,
          isProcessingCommand: false,
          lastError: null,
        },
        false,
        `session/dispatchCommand/${command.type}`,
      );
    } catch (error) {
      let message = 'Command failed';
      let code: string = ERROR_CODES.ENGINE_ERROR;

      if (error instanceof EngineError) {
        message = error.message;
        code = ERROR_CODES.INVALID_COMMAND;
      } else if (error instanceof Error) {
        message = error.message;
      }

      set(
        {
          isProcessingCommand: false,
          lastError: { message, code },
        },
        false,
        'session/dispatchCommandError',
      );
    }
  },

  endTurn: () => {
    const { engine, activePlayerId } = get();
    if (!engine) return;

    try {
      const newState = engine.endTurn(activePlayerId);
      set(
        {
          gameState: newState,
          snapshotVersion: get().snapshotVersion + 1,
          activePlayerId: newState.activePlayerId,
        },
        false,
        'session/endTurn',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'End turn failed';
      set(
        { lastError: { message, code: ERROR_CODES.ENGINE_ERROR } },
        false,
        'session/endTurnError',
      );
    }
  },

  resetGame: () => {
    const { engine } = get();
    if (engine) {
      engine.getEventBus().offAll();
    }
    set(
      {
        engine: null,
        gameState: null,
        snapshotVersion: 0,
        mode: 'menu',
        activePlayerId: '',
        localPlayerIds: [],
        isProcessingCommand: false,
        lastError: null,
      },
      false,
      'session/resetGame',
    );
  },

  setMode: (mode) => {
    set({ mode }, false, 'session/setMode');
  },

  clearError: () => {
    set({ lastError: null }, false, 'session/clearError');
  },
});

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

      // 2. Generate the map using mapgen
      const mapResult = generateMap({
        width: config.map.radius * 2,
        height: Math.floor(config.map.radius * 1.5),
        seed: config.seed,
        playerCount: config.players.length,
      });

      // 3. Merge the generated map into the engine state
      const initialState = engine.getState();
      const stateWithMap: GameState = {
        ...initialState,
        map: mapResult.mapData,
      };

      // 4. Determine mode from config
      const mode: GameMode = config.mode;

      // 5. Determine local player IDs (non-AI players)
      const localPlayerIds = config.players
        .filter((p) => !p.isAI)
        .map((p) => p.id);

      // 6. Update the store
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
    set(
      {
        engine: null, // Engine would need to be reconstructed for loaded games
        gameState: state,
        snapshotVersion: get().snapshotVersion + 1,
        activePlayerId: state.activePlayerId,
        mode: 'single', // Default to single when loading
        isProcessingCommand: false,
        lastError: null,
      },
      false,
      'session/loadGame',
    );
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

/**
 * Command slice — command queue and history.
 *
 * Manages the pending command (awaiting confirmation), command history
 * for undo/replay, and optimistic events for responsive UI updates
 * before the engine confirms them.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../useGameStore';
import type { GameCommand } from '@/engine/core/CommandQueue';
import type { GameEvent } from '@/engine/core/EventBus';

// ─── Slice Interface ──────────────────────────────────────────────────────────

export interface CommandSlice {
  pendingCommand: GameCommand | null;
  commandHistory: GameCommand[];
  optimisticEvents: GameEvent[];

  setPendingCommand: (command: GameCommand | null) => void;
  executePendingCommand: () => void;
  addToHistory: (command: GameCommand) => void;
  addOptimisticEvent: (event: GameEvent) => void;
  clearOptimisticEvents: () => void;
  undoLastCommand: () => void;
}

// ─── Max History Size ─────────────────────────────────────────────────────────

const MAX_HISTORY_SIZE = 500;

// ─── Slice Creator ────────────────────────────────────────────────────────────

export const createCommandSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  CommandSlice
> = (set, get) => ({
  // ── Initial State ────────────────────────────────────────────────────────

  pendingCommand: null,
  commandHistory: [],
  optimisticEvents: [],

  // ── Actions ──────────────────────────────────────────────────────────────

  setPendingCommand: (command) => {
    set({ pendingCommand: command }, false, 'command/setPendingCommand');
  },

  executePendingCommand: () => {
    const { pendingCommand } = get();
    if (!pendingCommand) return;

    // Dispatch through the session slice
    get().dispatchCommand(pendingCommand);

    // Add to history
    const history = get().commandHistory;
    const newHistory = [...history, pendingCommand].slice(-MAX_HISTORY_SIZE);

    set(
      {
        pendingCommand: null,
        commandHistory: newHistory,
      },
      false,
      'command/executePendingCommand',
    );
  },

  addToHistory: (command) => {
    const history = get().commandHistory;
    const newHistory = [...history, command].slice(-MAX_HISTORY_SIZE);
    set({ commandHistory: newHistory }, false, 'command/addToHistory');
  },

  addOptimisticEvent: (event) => {
    set(
      (state) => ({
        optimisticEvents: [...state.optimisticEvents, event],
      }),
      false,
      'command/addOptimisticEvent',
    );
  },

  clearOptimisticEvents: () => {
    set({ optimisticEvents: [] }, false, 'command/clearOptimisticEvents');
  },

  undoLastCommand: () => {
    // Note: Full undo requires engine support (state snapshots or command inverse).
    // For now, we remove the last command from history but cannot revert state.
    // This will be implemented properly when the engine supports it.
    const history = get().commandHistory;
    if (history.length === 0) return;

    const newHistory = history.slice(0, -1);
    set({ commandHistory: newHistory }, false, 'command/undoLastCommand');
  },
});

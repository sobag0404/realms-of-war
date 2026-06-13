/**
 * Root Zustand store for "Realms of War".
 *
 * Combines all slices using Zustand's slice pattern with devtools
 * middleware for Redux DevTools integration.
 *
 * Each slice is a self-contained unit of state + actions. Slices can
 * reference each other through `get()` (e.g., commandSlice calls
 * sessionSlice's dispatchCommand).
 *
 * Architecture:
 *   SessionSlice   — GameEngine lifecycle, state snapshots, errors
 *   GameViewSlice  — Camera, viewport, hover state, overlays
 *   SelectionSlice — Entity/hex/city selection, derived data
 *   CommandSlice   — Pending commands, history, optimistic events
 *   UiSlice        — Panels, modals, notifications, tooltips
 *   SettingsSlice  — User preferences (persisted to localStorage)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { SessionSlice } from './slices/sessionSlice';
import type { GameViewSlice } from './slices/gameViewSlice';
import type { SelectionSlice } from './slices/selectionSlice';
import type { CommandSlice } from './slices/commandSlice';
import type { UiSlice } from './slices/uiSlice';
import type { SettingsSlice } from './slices/settingsSlice';

import { createSessionSlice } from './slices/sessionSlice';
import { createGameViewSlice } from './slices/gameViewSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createCommandSlice } from './slices/commandSlice';
import { createUiSlice } from './slices/uiSlice';
import { createSettingsSlice } from './slices/settingsSlice';

// ─── Combined Store Type ──────────────────────────────────────────────────────

export type GameStore = SessionSlice &
  GameViewSlice &
  SelectionSlice &
  CommandSlice &
  UiSlice &
  SettingsSlice;

// ─── Store Instance ───────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  devtools(
    (...a) => ({
      ...createSessionSlice(...a),
      ...createGameViewSlice(...a),
      ...createSelectionSlice(...a),
      ...createCommandSlice(...a),
      ...createUiSlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: 'realms-of-war',
      // Only enable devtools in development
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);

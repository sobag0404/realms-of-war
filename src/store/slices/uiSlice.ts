/**
 * UI slice — panels, notifications, tooltips, and tech tree filter.
 *
 * Manages which panel is open, active modals, notification queue,
 * tooltip state, and the tech tree branch filter.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../useGameStore';
import type { TechBranch } from '@/engine/core/types';

// ─── Notification ─────────────────────────────────────────────────────────────

export interface UiNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

// ─── Panel Types ──────────────────────────────────────────────────────────────

export type PanelType =
  | 'none'
  | 'city'
  | 'techTree'
  | 'recruitment'
  | 'diplomacy'
  | 'settings'
  | 'newGame'
  | 'loadGame';

// ─── Slice Interface ──────────────────────────────────────────────────────────

export interface UiSlice {
  openPanel: PanelType;
  modal: { type: string; data?: unknown } | null;
  notifications: UiNotification[];
  tooltip: { text: string; position: [number, number] } | null;
  techTreeFilter: TechBranch | 'all';

  setOpenPanel: (panel: UiSlice['openPanel']) => void;
  openModal: (type: string, data?: unknown) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<UiNotification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  setTooltip: (tooltip: UiSlice['tooltip']) => void;
  setTechTreeFilter: (filter: TechBranch | 'all') => void;
}

// ─── Max Notifications ────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 20;

// ─── Notification ID Counter ─────────────────────────────────────────────────

let notificationIdCounter = 0;

// ─── Slice Creator ────────────────────────────────────────────────────────────

export const createUiSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  UiSlice
> = (set) => ({
  // ── Initial State ────────────────────────────────────────────────────────

  openPanel: 'none',
  modal: null,
  notifications: [],
  tooltip: null,
  techTreeFilter: 'all',

  // ── Actions ──────────────────────────────────────────────────────────────

  setOpenPanel: (panel) => {
    set({ openPanel: panel }, false, 'ui/setOpenPanel');
  },

  openModal: (type, data) => {
    set({ modal: { type, data } }, false, 'ui/openModal');
  },

  closeModal: () => {
    set({ modal: null }, false, 'ui/closeModal');
  },

  addNotification: (notification) => {
    const id = `notif-${++notificationIdCounter}`;
    const newNotification: UiNotification = { ...notification, id };

    set(
      (state) => ({
        notifications: [...state.notifications, newNotification].slice(
          -MAX_NOTIFICATIONS,
        ),
      }),
      false,
      'ui/addNotification',
    );
  },

  dismissNotification: (id) => {
    set(
      (state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }),
      false,
      'ui/dismissNotification',
    );
  },

  setTooltip: (tooltip) => {
    set({ tooltip }, false, 'ui/setTooltip');
  },

  setTechTreeFilter: (filter) => {
    set({ techTreeFilter: filter }, false, 'ui/setTechTreeFilter');
  },
});

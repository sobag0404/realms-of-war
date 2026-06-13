/**
 * Game view slice — camera and viewport state.
 *
 * Manages the 3D camera position, zoom, rotation, and visual overlay
 * toggles (grid, yields, threat range). Also tracks what the cursor
 * is currently hovering over.
 *
 * This slice does NOT import React or Three.js — it only stores
 * plain data that the 3D renderer reads from.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../useGameStore';
import type { HexCoord, EntityId } from '@/engine/core/types';
import { hexToWorld } from '@/engine/hex/coordinates';

// ─── Slice Interface ──────────────────────────────────────────────────────────

export interface GameViewSlice {
  cameraTarget: [number, number, number]; // Vector3Tuple
  cameraZoom: number; // 4-28, default 12
  cameraRotation: number; // degrees, default 45
  cameraPitch: number; // degrees, default 55
  isDraggingCamera: boolean;
  hoveredHex: HexCoord | null;
  hoveredEntityId: EntityId | null;
  showGrid: boolean;
  showYields: boolean;
  showThreat: boolean;
  showFog: boolean;

  setCameraTarget: (target: [number, number, number]) => void;
  setCameraZoom: (zoom: number) => void;
  setCameraRotation: (rotation: number) => void;
  setCameraPitch: (pitch: number) => void;
  setHoveredHex: (hex: HexCoord | null) => void;
  setHoveredEntity: (id: EntityId | null) => void;
  toggleGrid: () => void;
  toggleYields: () => void;
  toggleThreat: () => void;
  toggleFog: () => void;
  setIsDragging: (dragging: boolean) => void;
  centerOnHex: (hex: HexCoord) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 4;
const MAX_ZOOM = 28;
const DEFAULT_ZOOM = 11.5;
const DEFAULT_ROTATION = 45; // degrees
const DEFAULT_PITCH = 58; // degrees

// ─── Slice Creator ────────────────────────────────────────────────────────────

export const createGameViewSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  GameViewSlice
> = (set) => ({
  // ── Initial State ────────────────────────────────────────────────────────

  cameraTarget: [0, 0, 0],
  cameraZoom: DEFAULT_ZOOM,
  cameraRotation: DEFAULT_ROTATION,
  cameraPitch: DEFAULT_PITCH,
  isDraggingCamera: false,
  hoveredHex: null,
  hoveredEntityId: null,
  showGrid: true,
  showYields: false,
  showThreat: false,
  showFog: true,

  // ── Actions ──────────────────────────────────────────────────────────────

  setCameraTarget: (target) => {
    set({ cameraTarget: target }, false, 'gameView/setCameraTarget');
  },

  setCameraZoom: (zoom) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ cameraZoom: clamped }, false, 'gameView/setCameraZoom');
  },

  setCameraRotation: (rotation) => {
    set({ cameraRotation: rotation }, false, 'gameView/setCameraRotation');
  },

  setCameraPitch: (pitch) => {
    set({ cameraPitch: pitch }, false, 'gameView/setCameraPitch');
  },

  setHoveredHex: (hex) => {
    set({ hoveredHex: hex }, false, 'gameView/setHoveredHex');
  },

  setHoveredEntity: (id) => {
    set({ hoveredEntityId: id }, false, 'gameView/setHoveredEntity');
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }), false, 'gameView/toggleGrid');
  },

  toggleYields: () => {
    set((state) => ({ showYields: !state.showYields }), false, 'gameView/toggleYields');
  },

  toggleThreat: () => {
    set((state) => ({ showThreat: !state.showThreat }), false, 'gameView/toggleThreat');
  },

  toggleFog: () => {
    set((state) => ({ showFog: !state.showFog }), false, 'gameView/toggleFog');
  },

  setIsDragging: (dragging) => {
    set({ isDraggingCamera: dragging }, false, 'gameView/setIsDragging');
  },

  centerOnHex: (hex) => {
    // Convert hex coordinates to world position using hexToWorld
    const [x, y, z] = hexToWorld(hex);
    set({ cameraTarget: [x, y, z] }, false, 'gameView/centerOnHex');
  },
});

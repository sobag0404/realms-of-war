/**
 * Selection slice — unit/city selection state.
 *
 * Tracks what the player has currently selected (entity, hex, city)
 * and derived information about the selection (movement path,
 * attack targets, build/recruit options).
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../useGameStore';
import type { EntityId, CityId, HexCoord, BuildingTypeId } from '@/engine/core/types';

// ─── Slice Interface ──────────────────────────────────────────────────────────

export interface SelectionSlice {
  selectedEntityId: EntityId | null;
  selectedHex: HexCoord | null;
  selectedCityId: CityId | null;
  movementPath: HexCoord[];
  attackTargets: EntityId[];
  buildOptions: BuildingTypeId[];
  recruitOptions: string[];

  selectEntity: (id: EntityId | null) => void;
  selectHex: (hex: HexCoord | null) => void;
  selectCity: (id: CityId | null) => void;
  setMovementPath: (path: HexCoord[]) => void;
  setAttackTargets: (targets: EntityId[]) => void;
  setBuildOptions: (options: BuildingTypeId[]) => void;
  setRecruitOptions: (options: string[]) => void;
  clearSelection: () => void;
}

// ─── Slice Creator ────────────────────────────────────────────────────────────

export const createSelectionSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  SelectionSlice
> = (set) => ({
  // ── Initial State ────────────────────────────────────────────────────────

  selectedEntityId: null,
  selectedHex: null,
  selectedCityId: null,
  movementPath: [],
  attackTargets: [],
  buildOptions: [],
  recruitOptions: [],

  // ── Actions ──────────────────────────────────────────────────────────────

  selectEntity: (id) => {
    set(
      {
        selectedEntityId: id,
        // Clear derived data when entity changes
        movementPath: [],
        attackTargets: [],
      },
      false,
      'selection/selectEntity',
    );
  },

  selectHex: (hex) => {
    set(
      {
        selectedHex: hex,
        // Clear entity-specific data when selecting a raw hex
        selectedEntityId: hex ? undefined : null,
        selectedCityId: null,
        movementPath: [],
        attackTargets: [],
        buildOptions: [],
        recruitOptions: [],
      },
      false,
      'selection/selectHex',
    );
  },

  selectCity: (id) => {
    set(
      {
        selectedCityId: id,
        // Clear entity-specific data when selecting a city
        selectedEntityId: null,
        movementPath: [],
        attackTargets: [],
      },
      false,
      'selection/selectCity',
    );
  },

  setMovementPath: (path) => {
    set({ movementPath: path }, false, 'selection/setMovementPath');
  },

  setAttackTargets: (targets) => {
    set({ attackTargets: targets }, false, 'selection/setAttackTargets');
  },

  setBuildOptions: (options) => {
    set({ buildOptions: options }, false, 'selection/setBuildOptions');
  },

  setRecruitOptions: (options) => {
    set({ recruitOptions: options }, false, 'selection/setRecruitOptions');
  },

  clearSelection: () => {
    set(
      {
        selectedEntityId: null,
        selectedHex: null,
        selectedCityId: null,
        movementPath: [],
        attackTargets: [],
        buildOptions: [],
        recruitOptions: [],
      },
      false,
      'selection/clearSelection',
    );
  },
});

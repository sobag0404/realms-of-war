/**
 * Vision System for "Realms of War".
 *
 * Implements fog of war logic: calculates which hexes are visible,
 * explored, or hidden for each player based on unit and city vision
 * ranges, terrain bonuses, and building effects.
 *
 * Visibility levels:
 * - "visible"  — currently seen by the player this turn
 * - "explored" — previously seen but no longer in vision range
 * - "hidden"   — never been seen
 *
 * Vision ranges:
 * - Normal unit: 2
 * - Scout:       4
 * - Hero:        3
 * - City level 1: 3
 * - City level 2: 4
 * - City level 3+: 5
 * - Watchtower building: +2
 * - Hills/Mountain terrain bonus: +1
 */

import type { PlayerId, HexCoord } from '../../core/types';
import type { GameState, EntityData, Visibility } from '../../core/GameState';
import type { EventBus } from '../../core/EventBus';
import { hexKey, hexRing } from '../../core/types';
import { TERRAIN_TYPES } from '../../../data/terrain';

// ─── Vision Range Constants ────────────────────────────────────────────────────

/** Base vision range for a normal unit. */
const BASE_UNIT_VISION = 2;

/** Vision ranges by unit type ID. */
const UNIT_VISION_RANGES: Record<string, number> = {
  scout: 4,
  hero: 3,
};

/** Base vision range for a city by level. */
const CITY_VISION_BY_LEVEL: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
  4: 5,
  5: 5,
};

/** Vision bonus from the watchtower building. */
const WATCHTOWER_VISION_BONUS = 2;

/** Vision bonus from hills or mountain terrain. */
const ELEVATION_VISION_BONUS = 1;

// ─── VisionSystem ──────────────────────────────────────────────────────────────

export class VisionSystem {
  /**
   * Recalculate vision for all units/cities of a player.
   *
   * Scans every unit and city owned by the player, computes their
   * vision radius, and builds new visibleHexes and exploredHexes sets.
   * Emits a FogUpdated event with the changes.
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player whose vision to recalculate
   * @param eventBus - Event bus for emitting events
   * @returns New game state with updated vision data
   */
  static recalculateVision(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    const oldVisible = new Set(player.visibleHexes);
    const oldExplored = new Set(player.exploredHexes);

    // Compute all currently visible hex keys
    const newVisible = new Set<string>();

    // Vision from units
    const playerUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId,
    );
    for (const unit of playerUnits) {
      const visionRange = VisionSystem.getUnitVisionRange(state, unit);
      const visibleHexes = VisionSystem.getHexesInRange(state, unit.hex, visionRange);
      for (const hex of visibleHexes) {
        newVisible.add(hexKey(hex));
      }
    }

    // Vision from cities
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );
    for (const city of playerCities) {
      const visionRange = VisionSystem.getCityVisionRange(state, city.id);
      const visibleHexes = VisionSystem.getHexesInRange(state, city.hex, visionRange);
      for (const hex of visibleHexes) {
        newVisible.add(hexKey(hex));
      }
    }

    // Update explored: previously visible hexes that are no longer visible
    // become "explored" (they've been seen before)
    const newExplored = new Set(oldExplored);
    for (const hexKey_ of oldVisible) {
      if (!newVisible.has(hexKey_)) {
        newExplored.add(hexKey_);
      }
    }
    // Also add newly visible hexes to explored
    for (const hexKey_ of newVisible) {
      newExplored.add(hexKey_);
    }

    // Calculate diff for event
    const newlyVisible: HexCoord[] = [];
    const newlyExplored: HexCoord[] = [];
    const newlyHidden: HexCoord[] = [];

    for (const key of newVisible) {
      if (!oldVisible.has(key)) {
        const [q, r] = key.split(',').map(Number);
        newlyVisible.push({ q, r });
      }
    }

    for (const key of newExplored) {
      if (!oldExplored.has(key) && !newVisible.has(key)) {
        const [q, r] = key.split(',').map(Number);
        newlyExplored.push({ q, r });
      }
    }

    for (const key of oldVisible) {
      if (!newVisible.has(key) && !newExplored.has(key)) {
        const [q, r] = key.split(',').map(Number);
        newlyHidden.push({ q, r });
      }
    }

    // Build updated player state
    const updatedPlayer = {
      ...player,
      visibleHexes: Array.from(newVisible),
      exploredHexes: Array.from(newExplored),
    };

    // Emit FogUpdated event
    eventBus.emit('FogUpdated', {
      playerId,
      newlyVisible,
      newlyExplored,
      newlyHidden,
    });

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: updatedPlayer,
      },
    };
  }

  /**
   * Get visibility level of a hex for a player.
   *
   * @param state - Current game state
   * @param playerId - Player to check
   * @param hex - Hex to check
   * @returns Visibility level: "visible", "explored", or "hidden"
   */
  static getVisibility(
    state: GameState,
    playerId: PlayerId,
    hex: HexCoord,
  ): Visibility {
    const player = state.players[playerId];
    if (!player) return 'hidden';

    const key = hexKey(hex);

    if (player.visibleHexes.includes(key)) return 'visible';
    if (player.exploredHexes.includes(key)) return 'explored';
    return 'hidden';
  }

  /**
   * Check if a hex is visible to a player.
   *
   * @param state - Current game state
   * @param playerId - Player to check
   * @param hex - Hex to check
   * @returns True if the hex is currently visible
   */
  static isVisible(
    state: GameState,
    playerId: PlayerId,
    hex: HexCoord,
  ): boolean {
    return VisionSystem.getVisibility(state, playerId, hex) === 'visible';
  }

  /**
   * Get all visible entities for a player.
   *
   * Returns all entities that are positioned on hexes currently
   * visible to the player. This is used by the presentation layer
   * to know which enemy units to render.
   *
   * @param state - Current game state
   * @param playerId - Player to check
   * @returns Array of EntityData for visible entities
   */
  static getVisibleEntities(
    state: GameState,
    playerId: PlayerId,
  ): EntityData[] {
    const player = state.players[playerId];
    if (!player) return [];

    const visibleSet = new Set(player.visibleHexes);
    const result: EntityData[] = [];

    for (const entity of Object.values(state.entities)) {
      // Always include own units
      if (entity.ownerId === playerId) {
        result.push(entity);
        continue;
      }
      // Include enemy units only if on a visible hex
      if (visibleSet.has(hexKey(entity.hex))) {
        result.push(entity);
      }
    }

    return result;
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────

  /**
   * Get the vision range for a unit, accounting for abilities and terrain.
   */
  private static getUnitVisionRange(state: GameState, unit: EntityData): number {
    let range = UNIT_VISION_RANGES[unit.typeId] ?? BASE_UNIT_VISION;

    // Terrain bonus: hills/mountain gives +1
    const tile = state.map.tiles[hexKey(unit.hex)];
    if (tile) {
      const terrainData = TERRAIN_TYPES[tile.terrain];
      if (terrainData && (tile.terrain === 'hills' || tile.terrain === 'mountain')) {
        range += ELEVATION_VISION_BONUS;
      }
    }

    // Vigilance ability: +1 vision (scouts have this)
    if (unit.abilities.includes('vigilance')) {
      range += 1;
    }

    return range;
  }

  /**
   * Get the vision range for a city, accounting for level and buildings.
   */
  private static getCityVisionRange(state: GameState, cityId: string): number {
    const city = state.cities[cityId];
    if (!city) return 0;

    // Base range from city level
    let range = CITY_VISION_BY_LEVEL[city.level] ?? 5;

    // Watchtower bonus: +2
    if (city.buildings.includes('watchtower')) {
      range += WATCHTOWER_VISION_BONUS;
    }

    // Castle bonus: +2
    if (city.buildings.includes('castle')) {
      range += 2;
    }

    // Astral observatory bonus: +5
    if (city.buildings.includes('astral_observatory')) {
      range += 5;
    }

    return range;
  }

  /**
   * Get all hexes within a given range of a center hex that exist on the map.
   *
   * This uses the hexRing function to efficiently compute all hexes
   * at each radius from 0 to range.
   */
  private static getHexesInRange(
    state: GameState,
    center: HexCoord,
    range: number,
  ): HexCoord[] {
    const result: HexCoord[] = [];

    // Include center hex (radius 0)
    const centerKey = hexKey(center);
    if (state.map.tiles[centerKey]) {
      result.push(center);
    }

    // Add rings from 1 to range
    for (let r = 1; r <= range; r++) {
      const ring = hexRing(center, r);
      for (const hex of ring) {
        if (state.map.tiles[hexKey(hex)]) {
          result.push(hex);
        }
      }
    }

    return result;
  }
}

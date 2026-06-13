/**
 * Hex neighbor directions for "Realms of War"
 *
 * Uses pointy-top axial coordinate system.
 * Directions are numbered 0-5 starting from East, going counter-clockwise:
 *   0: East (+1,  0)
 *   1: NE   (+1, -1)
 *   2: NW   ( 0, -1)
 *   3: West (-1,  0)
 *   4: SW   (-1, +1)
 *   5: SE   ( 0, +1)
 */

import type { HexCoord } from "./coordinates";

// ─── Direction Vectors ───────────────────────────────────────────────────────

/**
 * Six neighbor direction vectors for pointy-top axial hexes.
 * Index = direction number (0-5).
 */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },   // 0: East
  { q: 1, r: -1 },  // 1: Northeast
  { q: 0, r: -1 },  // 2: Northwest
  { q: -1, r: 0 },  // 3: West
  { q: -1, r: 1 },  // 4: Southwest
  { q: 0, r: 1 },   // 5: Southeast
] as const;

/** Total number of hex directions */
export const NUM_DIRECTIONS = HEX_DIRECTIONS.length; // 6

// ─── Direction Functions ─────────────────────────────────────────────────────

/**
 * Get the neighboring hex in a given direction.
 *
 * @param hex - Source hex coordinate
 * @param direction - Direction index (0-5)
 * @returns Adjacent hex coordinate
 */
export function neighbor(hex: HexCoord, direction: number): HexCoord {
  const dir = HEX_DIRECTIONS[direction];
  return {
    q: hex.q + dir.q,
    r: hex.r + dir.r,
  };
}

/**
 * Get the opposite direction index (180 degrees).
 * Direction 0 ↔ 3, 1 ↔ 4, 2 ↔ 5.
 *
 * @param dir - Direction index (0-5)
 * @returns Opposite direction index
 */
export function oppositeDirection(dir: number): number {
  return (dir + 3) % NUM_DIRECTIONS;
}

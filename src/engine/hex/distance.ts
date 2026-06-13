/**
 * Hex distance calculations for "Realms of War"
 *
 * Uses cube coordinates internally for accurate distance computation.
 */

import type { HexCoord, CubeCoord } from "./coordinates";
import { axialToCube } from "./coordinates";

// ─── Distance ────────────────────────────────────────────────────────────────

/**
 * Calculate the hex distance between two axial coordinates.
 *
 * Uses the cube coordinate formula:
 *   distance = max(|x1-x2|, |y1-y2|, |z1-z2|)
 *
 * This is equivalent to (|dx| + |dy| + |dz|) / 2 for valid cube coords.
 *
 * @param a - First hex coordinate
 * @param b - Second hex coordinate
 * @returns Integer distance (number of hex steps)
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ca: CubeCoord = axialToCube(a);
  const cb: CubeCoord = axialToCube(b);
  const dx = Math.abs(ca.x - cb.x);
  const dy = Math.abs(ca.y - cb.y);
  const dz = Math.abs(ca.z - cb.z);
  return Math.max(dx, dy, dz);
}

// ─── Interpolation ───────────────────────────────────────────────────────────

/**
 * Linearly interpolate between two hex coordinates.
 *
 * Returns a fractional HexCoord (not necessarily on the hex grid).
 * Typically used with roundAxial() from rounding.ts to find hexes
 * along a line.
 *
 * @param a - Start hex coordinate
 * @param b - End hex coordinate
 * @param t - Interpolation factor (0.0 = a, 1.0 = b)
 * @returns Fractional HexCoord at parameter t
 */
export function hexLerp(a: HexCoord, b: HexCoord, t: number): HexCoord {
  return {
    q: a.q + (b.q - a.q) * t,
    r: a.r + (b.r - a.r) * t,
  };
}

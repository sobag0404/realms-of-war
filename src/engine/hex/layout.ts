/**
 * Hex layout helpers for "Realms of War"
 *
 * Provides world-space geometry for rendering pointy-top hexes.
 * The hex grid lies on the XZ plane (Y is up).
 */

import type { HexCoord } from "./coordinates";
import { hexToWorld, HEX_RADIUS } from "./coordinates";

// ─── Corner Computation ──────────────────────────────────────────────────────

/**
 * Compute the 6 corner positions of a hex in world space (pointy-top, XZ plane).
 *
 * Pointy-top hex corners start at angle 30° (π/6) and proceed every 60°:
 *   corner_i = center + radius * (cos(60°*i + 30°), sin(60°*i + 30°))
 *
 * Returns corners in order: top-right, right, bottom-right, bottom-left, left, top-left
 * (i.e., starting at 30° and going counter-clockwise).
 *
 * @param center - Hex coordinate of the center
 * @param radius - Outer radius of the hex (center to vertex)
 * @returns Array of 6 world positions as [x, y, z] tuples
 */
export function hexCorners(center: HexCoord, radius: number): Array<[number, number, number]> {
  const [cx, , cz] = hexToWorld(center, radius);
  const corners: Array<[number, number, number]> = [];

  for (let i = 0; i < 6; i++) {
    // Pointy-top: start at 30° = π/6 radians
    const angle = (Math.PI / 180) * (60 * i + 30);
    const x = cx + radius * Math.cos(angle);
    const z = cz + radius * Math.sin(angle);
    corners.push([x, 0, z]);
  }

  return corners;
}

// ─── Center to World ─────────────────────────────────────────────────────────

/**
 * Convert a hex center coordinate to a world position.
 *
 * Convenience wrapper around hexToWorld that returns a named object.
 *
 * @param q - Axial q coordinate
 * @param r - Axial r coordinate
 * @param radius - Hex outer radius (default 1.0)
 * @returns World position {x, y, z}
 */
export function hexCenterToWorld(
  q: number,
  r: number,
  radius: number = HEX_RADIUS,
): { x: number; y: number; z: number } {
  const [x, y, z] = hexToWorld({ q, r }, radius);
  return { x, y, z };
}

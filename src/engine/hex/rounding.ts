/**
 * Hex rounding for "Realms of War"
 *
 * Implements the cube-coordinate rounding algorithm to snap
 * fractional hex coordinates to the nearest valid hex.
 */

import type { HexCoord, CubeCoord } from "./coordinates";
import { cubeToAxial } from "./coordinates";

/**
 * Round a fractional axial coordinate to the nearest hex.
 *
 * Algorithm (cube rounding):
 *   1. Convert to fractional cube coordinates.
 *   2. Round each cube component independently.
 *   3. Find which component changed the most during rounding.
 *   4. Recompute that component from the other two (x + y + z = 0).
 *
 * This guarantees a valid cube coordinate where x + y + z === 0.
 *
 * @param frac - Fractional HexCoord (e.g., from worldToFractionalHex or hexLerp)
 * @returns Nearest valid HexCoord on the hex grid
 */
export function roundAxial(frac: HexCoord): HexCoord {
  // Convert to fractional cube
  const cube: CubeCoord = {
    x: frac.q,
    y: -frac.q - frac.r,
    z: frac.r,
  };

  // Round each component independently
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  // Compute rounding errors
  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  // Fix the component with the largest rounding error
  // so that the cube constraint x + y + z = 0 is satisfied
  if (xDiff > yDiff && xDiff > zDiff) {
    // x had the largest error; derive it from y and z
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    // y had the largest error; derive it from x and z
    ry = -rx - rz;
  } else {
    // z had the largest error (or tied); derive it from x and y
    rz = -rx - ry;
  }

  // Convert back to axial
  return cubeToAxial({ x: rx, y: ry, z: rz });
}

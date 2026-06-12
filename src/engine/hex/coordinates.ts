/**
 * Hex coordinate types and conversions for "Realms of War"
 *
 * Uses axial coordinates (q, r) as the primary system with
 * cube coordinates (x, y, z) for distance/rounding algorithms.
 * Pointy-top orientation on the XZ plane (y is up).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Axial hex coordinate */
export interface HexCoord {
  q: number;
  r: number;
}

/** Cube hex coordinate where x + y + z === 0 */
export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default outer radius of a single hex (center to vertex) */
export const HEX_RADIUS = 1.0;

/** Width of a pointy-top hex (distance between parallel edges) = sqrt(3) * radius */
export const HEX_WIDTH = Math.sqrt(3);

/** Height of a pointy-top hex (distance between opposite vertices) = 2 * radius */
export const HEX_HEIGHT = 2.0;

/** Vertical step between hex rows = 3/4 * height = 1.5 * radius */
export const HEX_VERTICAL_STEP = 1.5;

// ─── Conversions ─────────────────────────────────────────────────────────────

/**
 * Convert axial coordinates to cube coordinates.
 * In axial: q=x, r=z, and y = -x - z.
 */
export function axialToCube(hex: HexCoord): CubeCoord {
  return {
    x: hex.q,
    y: -hex.q - hex.r,
    z: hex.r,
  };
}

/**
 * Convert cube coordinates to axial coordinates.
 * In axial: q=x, r=z (y is implicit).
 */
export function cubeToAxial(cube: CubeCoord): HexCoord {
  return {
    q: cube.x,
    r: cube.z,
  };
}

/**
 * Convert axial hex coordinate to world position (pointy-top, XZ plane).
 *
 * Pointy-top layout formulas:
 *   worldX = radius * (sqrt(3) * q + sqrt(3)/2 * r)
 *   worldZ = radius * (3/2 * r)
 *   worldY = 0 (ground plane)
 *
 * @param hex - Axial coordinate
 * @param radius - Hex outer radius (default 1.0)
 * @returns [x, y, z] world position
 */
export function hexToWorld(hex: HexCoord, radius: number = HEX_RADIUS): [number, number, number] {
  const x = radius * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
  const z = radius * (1.5 * hex.r);
  return [x, 0, z];
}

/**
 * Convert a world position (XZ plane) to a fractional axial hex coordinate.
 *
 * Inverse of hexToWorld for pointy-top layout:
 *   q_frac = (sqrt(3)/3 * x - 1/3 * z) / radius
 *   r_frac = (2/3 * z) / radius
 *
 * The result will likely need rounding via roundAxial() from rounding.ts.
 *
 * @param x - World X position
 * @param z - World Z position
 * @param radius - Hex outer radius (default 1.0)
 * @returns Fractional HexCoord
 */
export function worldToFractionalHex(
  x: number,
  z: number,
  radius: number = HEX_RADIUS,
): HexCoord {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / radius;
  const r = ((2 / 3) * z) / radius;
  return { q, r };
}

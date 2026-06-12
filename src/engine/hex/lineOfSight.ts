/**
 * Line of sight calculations for hex grids — "Realms of War"
 *
 * Uses a Bresenham-like algorithm adapted for hex coordinates to trace
 * a line between two hexes and check for terrain obstacles.
 *
 * Blocking rules:
 * - Mountains ALWAYS block LOS
 * - Forest blocks LOS if the observer is NOT on elevated terrain (hills/mountain)
 * - Water does NOT block LOS
 * - Hills block LOS only if 2+ consecutive hills in the line
 *
 * All functions are pure and deterministic — no side effects, no DOM.
 */

import type { HexCoord } from "./coordinates";
import type { TerrainTypeId } from "../../engine/core/types";
import { hexDistance } from "./distance";
import { roundAxial } from "./rounding";
import { axialToCube } from "./coordinates";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Result of a LOS check */
export interface LosResult {
  /** Whether the target is visible from the source */
  hasLineOfSight: boolean;
  /** Hexes along the line (including source and target) */
  line: HexCoord[];
  /** Hexes that block the line of sight */
  blockingHexes: HexCoord[];
  /** Number of blocking hexes encountered */
  blockCount: number;
}

// ─── Line Drawing ───────────────────────────────────────────────────────────

/**
 * Draw a line of hexes between two points using cube-coordinate linear interpolation.
 *
 * Algorithm:
 *   1. Convert from/to to cube coords
 *   2. Calculate N = hexDistance(from, to)
 *   3. Add a small epsilon offset so we sample the midpoint of each hex edge
 *   4. For each step i from 0 to N, lerp and round to get the hex
 *
 * Returns all hexes the line passes through (including start and end).
 *
 * @param from - Source hex coordinate
 * @param to - Target hex coordinate
 * @returns Array of hex coordinates forming the line
 */
export function hexLine(from: HexCoord, to: HexCoord): HexCoord[] {
  const N = hexDistance(from, to);

  // If source and target are the same hex, return just that hex
  if (N === 0) {
    return [{ q: from.q, r: from.r }];
  }

  const cubeFrom = axialToCube(from);
  const cubeTo = axialToCube(to);

  const results: HexCoord[] = [];
  // Use a small step offset (0.5 / N) to sample at hex midpoints rather than
  // exact boundaries. This avoids ambiguous rounding at cell edges and is the
  // standard recommendation for hex line drawing (Red Blob Games).
  const step = 1 / N;

  for (let i = 0; i <= N; i++) {
    const t = i * step;
    // Lerp in cube space for more accurate interpolation
    const frac: HexCoord = {
      q: cubeFrom.x + (cubeTo.x - cubeFrom.x) * t,
      r: cubeFrom.z + (cubeTo.z - cubeFrom.z) * t,
    };
    results.push(roundAxial(frac));
  }

  return results;
}

// ─── Terrain Blocking ───────────────────────────────────────────────────────

/**
 * Check if a specific terrain type blocks line of sight.
 *
 * Blocking rules:
 * - Mountains ALWAYS block LOS (impassable, towering terrain)
 * - Forest blocks LOS if the observer is NOT on elevated terrain
 * - Water does NOT block LOS (you can see over water)
 * - Hills do NOT individually block LOS (handled by consecutive-hill rule in checkLineOfSight)
 * - All other terrain (plains, desert, swamp, ruins) does NOT block LOS
 *
 * @param terrain - The terrain type ID to check
 * @param elevated - Whether the observer is on elevated terrain (hills/mountain)
 * @returns True if this terrain blocks LOS
 */
export function isTerrainBlocking(terrain: TerrainTypeId, elevated: boolean): boolean {
  switch (terrain) {
    case "mountain":
      // Mountains always block LOS regardless of observer elevation
      return true;

    case "forest":
      // Forest blocks LOS only if the observer is NOT on elevated terrain
      return !elevated;

    case "hills":
      // Individual hills don't block — the consecutive-hill rule handles this
      // in checkLineOfSight. Return false here so the caller can count
      // consecutive hills.
      return false;

    case "water":
      // Water never blocks LOS — you can see over lakes/oceans
      return false;

    case "plains":
    case "desert":
    case "swamp":
    case "ruins":
      // Open terrain never blocks LOS
      return false;

    default:
      // Unknown terrain — be conservative and don't block
      return false;
  }
}

/**
 * Check if a terrain type is considered elevated (hills or mountain).
 *
 * Elevated observers can see over forests and get better vantage points.
 *
 * @param terrain - The terrain type ID to check
 * @returns True if the terrain is elevated
 */
export function isElevatedTerrain(terrain: TerrainTypeId): boolean {
  return terrain === "hills" || terrain === "mountain";
}

// ─── Main LOS Check ─────────────────────────────────────────────────────────

/**
 * Check if there is a clear line of sight between two hexes.
 *
 * Uses hex line drawing with terrain blocking rules:
 * - Mountains ALWAYS block LOS
 * - Forest blocks LOS if the observer is NOT on elevated terrain (hills/mountain)
 * - Water does NOT block LOS
 * - Hills block LOS only if 2+ consecutive hills appear in the line
 *   (a single hill is overlookable, but a ridge blocks sight)
 *
 * The source and target hexes themselves are NOT checked for blocking —
 * only intermediate hexes along the line are considered.
 *
 * @param tiles - Map tiles record (hex key → { terrain })
 * @param from - Source hex coordinate
 * @param to - Target hex coordinate
 * @param elevated - Whether the observer is on elevated terrain (hills/mountain)
 * @returns LosResult with visibility info, the line, and any blocking hexes
 */
export function checkLineOfSight(
  tiles: Record<string, { terrain: TerrainTypeId }>,
  from: HexCoord,
  to: HexCoord,
  elevated: boolean,
): LosResult {
  const line = hexLine(from, to);
  const blockingHexes: HexCoord[] = [];

  // If the line is just the source (distance 0), always have LOS
  if (line.length <= 1) {
    return {
      hasLineOfSight: true,
      line,
      blockingHexes: [],
      blockCount: 0,
    };
  }

  // Track consecutive hills for the ridge-blocking rule
  let consecutiveHills = 0;
  let hillsAreBlocking = false;

  // Check intermediate hexes (skip source at index 0 and target at last index)
  for (let i = 1; i < line.length - 1; i++) {
    const hex = line[i];
    const key = `${hex.q},${hex.r}`;
    const tile = tiles[key];

    // If there's no tile data for this hex, it doesn't block
    if (!tile) {
      consecutiveHills = 0;
      continue;
    }

    const terrain = tile.terrain;

    // Check the consecutive-hills rule
    if (terrain === "hills") {
      consecutiveHills++;
      if (consecutiveHills >= 2) {
        hillsAreBlocking = true;
      }
    } else {
      consecutiveHills = 0;
    }

    // Check if this terrain blocks LOS
    if (isTerrainBlocking(terrain, elevated) || hillsAreBlocking) {
      blockingHexes.push(hex);
    }
  }

  return {
    hasLineOfSight: blockingHexes.length === 0,
    line,
    blockingHexes,
    blockCount: blockingHexes.length,
  };
}

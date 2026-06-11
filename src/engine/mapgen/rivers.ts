/**
 * River generation for "Realms of War" map generation.
 *
 * Rivers flow from high-elevation hexes (mountains/hills) downhill
 * toward water (ocean/lakes). Each river is a sequence of connected
 * hexes, and river presence is stored as a bit mask on each hex edge.
 *
 * Algorithm:
 *   1. Identify candidate source hexes (mountains/hills with high moisture)
 *   2. For each source, greedily flow to the lowest neighbor
 *   3. Stop when reaching water or the map edge
 *   4. Record the path and update edge masks
 */

import type { HexCoord } from '@/engine/core/types';
import { GameRng } from '@/engine/core/GameRng';
import { toIndex } from '@/engine/hex/mapStorage';
import { HEX_DIRECTIONS, neighbor, oppositeDirection } from '@/engine/hex/directions';
import { TERRAIN_ID } from './biomes';

// ─── River Interface ──────────────────────────────────────────────────────────

/**
 * A river consisting of an ordered sequence of connected hexes.
 */
export interface River {
  /** Ordered sequence of hex coordinates from source to mouth. */
  path: HexCoord[];
  /** Number of hexes in the river. */
  length: number;
}

// ─── River Generation ─────────────────────────────────────────────────────────

/**
 * Generate rivers on the map that flow from high elevations to water.
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param elevation - Float64Array of elevation values [0, 1]
 * @param terrainIds - Uint8Array of terrain type IDs
 * @param rng - Deterministic RNG for source selection
 * @param maxRivers - Maximum number of rivers to generate (default 5)
 * @returns Array of River objects
 */
export function generateRivers(
  width: number,
  height: number,
  elevation: Float64Array,
  terrainIds: Uint8Array,
  rng: GameRng,
  maxRivers: number = 5,
): River[] {
  const rivers: River[] = [];

  // ── Step 1: Find candidate source hexes ────────────────────────────────

  const candidates: { hex: HexCoord; elevation: number; moisture: number }[] = [];

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = toIndex(q, r, width);
      const terrain = terrainIds[idx];
      const elev = elevation[idx];

      // Source candidates: mountains or hills at high elevation
      if (
        (terrain === TERRAIN_ID.MOUNTAIN || terrain === TERRAIN_ID.HILLS) &&
        elev > 0.60
      ) {
        // Prefer sources not on the map edge
        if (q > 0 && q < width - 1 && r > 0 && r < height - 1) {
          candidates.push({
            hex: { q, r },
            elevation: elev,
            moisture: 0, // Will be filtered by neighbor moisture later
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return rivers;
  }

  // Sort by elevation (highest first) and shuffle within same elevation
  // to add variety while maintaining determinism
  candidates.sort((a, b) => b.elevation - a.elevation);

  // Pick up to maxRivers sources, spread across the candidate list
  const step = Math.max(1, Math.floor(candidates.length / (maxRivers + 1)));
  const sources: HexCoord[] = [];

  for (let i = 0; i < maxRivers && i * step < candidates.length; i++) {
    // Add some randomness within a range around the step position
    const offset = rng.int(0, Math.min(step - 1, 2));
    const candidateIdx = Math.min(i * step + offset, candidates.length - 1);
    sources.push(candidates[candidateIdx].hex);
  }

  // ── Step 2: Flow each river downhill ───────────────────────────────────

  /** Track which hexes are already part of a river to avoid overlap. */
  const riverHexSet = new Set<string>();

  for (const source of sources) {
    const river = flowRiver(source, width, height, elevation, terrainIds, riverHexSet, rng);
    if (river !== null) {
      // Mark all hexes in this river as used
      for (const hex of river.path) {
        riverHexSet.add(`${hex.q},${hex.r}`);
      }
      rivers.push(river);
    }
  }

  return rivers;
}

// ─── River Flow Algorithm ─────────────────────────────────────────────────────

/**
 * Flow a river from a source hex downhill to water or the map edge.
 *
 * Uses a greedy approach: at each step, move to the lowest-elevation
 * neighbor that hasn't been visited yet. If multiple neighbors tie,
 * the RNG breaks the tie for variety.
 *
 * @param source - Starting hex coordinate
 * @param width - Map width
 * @param height - Map height
 * @param elevation - Elevation array
 * @param terrainIds - Terrain type array
 * @param riverHexSet - Set of hex keys already occupied by rivers
 * @param rng - Deterministic RNG for tie-breaking
 * @returns River object, or null if the river couldn't flow
 */
function flowRiver(
  source: HexCoord,
  width: number,
  height: number,
  elevation: Float64Array,
  terrainIds: Uint8Array,
  riverHexSet: Set<string>,
  rng: GameRng,
): River | null {
  const path: HexCoord[] = [{ q: source.q, r: source.r }];
  const visited = new Set<string>();
  visited.add(`${source.q},${source.r}`);

  let current = source;
  const maxSteps = width + height; // Safety limit

  for (let step = 0; step < maxSteps; step++) {
    // Check if we've reached water
    const currentIdx = toIndex(current.q, current.r, width);
    if (terrainIds[currentIdx] === TERRAIN_ID.WATER) {
      break;
    }

    // Find all valid downhill/level neighbors
    const nextCandidates: { hex: HexCoord; elev: number }[] = [];

    for (let d = 0; d < 6; d++) {
      const nHex = neighbor(current, d);

      // Bounds check
      if (nHex.q < 0 || nHex.q >= width || nHex.r < 0 || nHex.r >= height) {
        continue;
      }

      const nKey = `${nHex.q},${nHex.r}`;

      // Skip already visited hexes (including other rivers)
      if (visited.has(nKey) || riverHexSet.has(nKey)) {
        continue;
      }

      const nIdx = toIndex(nHex.q, nHex.r, width);
      const nElev = elevation[nIdx];

      // River can only flow downhill or stay level (with small tolerance)
      // but prefer downhill
      const currentElev = elevation[currentIdx];
      if (nElev <= currentElev + 0.02) {
        nextCandidates.push({ hex: nHex, elev: nElev });
      }
    }

    // No valid next hex — river ends here
    if (nextCandidates.length === 0) {
      break;
    }

    // Sort by elevation (lowest first) to prefer downhill flow
    nextCandidates.sort((a, b) => a.elev - b.elev);

    // Pick the lowest neighbor; if ties exist, use RNG for variety
    let bestElev = nextCandidates[0].elev;
    const tiedCandidates = nextCandidates.filter(c => Math.abs(c.elev - bestElev) < 0.01);

    let chosen: HexCoord;
    if (tiedCandidates.length > 1) {
      chosen = rng.pick(tiedCandidates)!.hex;
    } else {
      chosen = nextCandidates[0].hex;
    }

    path.push({ q: chosen.q, r: chosen.r });
    visited.add(`${chosen.q},${chosen.r}`);
    current = chosen;
  }

  // A valid river should have at least 3 hexes (source + flow + end)
  if (path.length < 3) {
    return null;
  }

  return {
    path,
    length: path.length,
  };
}

// ─── River Edge Mask ──────────────────────────────────────────────────────────

/**
 * Compute river edge masks for all hexes on the map.
 *
 * For each pair of adjacent hexes that are both in the same river,
 * set the direction bit in both hexes' river masks.
 *
 * @param width - Map width
 * @param height - Map height
 * @param rivers - Array of generated rivers
 * @returns Uint8Array of river masks (6 bits per hex, one per direction)
 */
export function computeRiverMasks(
  width: number,
  height: number,
  rivers: River[],
): Uint8Array {
  const size = width * height;
  const masks = new Uint8Array(size);

  for (const river of rivers) {
    for (let i = 0; i < river.path.length - 1; i++) {
      const a = river.path[i];
      const b = river.path[i + 1];

      // Find the direction from a to b
      const dir = findDirection(a, b);
      if (dir === -1) continue; // Shouldn't happen for valid rivers

      const aIdx = toIndex(a.q, a.r, width);
      const bIdx = toIndex(b.q, b.r, width);

      // Set the direction bit in both hexes
      masks[aIdx] |= (1 << dir);
      masks[bIdx] |= (1 << oppositeDirection(dir));
    }
  }

  return masks;
}

// ─── Direction Finder ─────────────────────────────────────────────────────────

/**
 * Find the hex direction index from hex `a` to adjacent hex `b`.
 *
 * @param a - Source hex
 * @param b - Adjacent destination hex
 * @returns Direction index (0–5), or -1 if not adjacent
 */
function findDirection(a: HexCoord, b: HexCoord): number {
  for (let d = 0; d < 6; d++) {
    const dir = HEX_DIRECTIONS[d];
    if (a.q + dir.q === b.q && a.r + dir.r === b.r) {
      return d;
    }
  }
  return -1;
}

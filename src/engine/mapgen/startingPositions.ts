/**
 * Starting position determination for "Realms of War" map generation.
 *
 * Finds fair starting positions for all players on the generated map.
 * Players should be roughly equidistant from each other, on suitable
 * terrain (plains/forest), with adequate resources and land access.
 *
 * Algorithm:
 *   1. Score all valid candidate hexes
 *   2. Use a greedy farthest-point approach: each new position
 *      maximizes its minimum distance from already-chosen positions
 *   3. Validate each position meets minimum requirements
 */

import type { HexCoord } from '@/engine/core/types';
import { GameRng } from '@/engine/core/GameRng';
import { toIndex } from '@/engine/hex/mapStorage';
import { neighbor } from '@/engine/hex/directions';
import { hexDistance } from '@/engine/hex/distance';
import { TERRAIN_ID, isWalkableTerrain, isLandTerrain } from './biomes';
import { RESOURCE_ID } from './resources';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Minimum hex distance between starting positions. */
const MIN_START_DISTANCE = 6;

/** Minimum number of adjacent walkable land hexes required. */
const MIN_ADJACENT_LAND = 3;

/** Search radius for nearby resources (in hex distance). */
const RESOURCE_SEARCH_RADIUS = 3;

/** Preferred terrain types for starting positions. */
const PREFERRED_TERRAINS: ReadonlySet<number> = new Set<number>([
  TERRAIN_ID.PLAINS,
  TERRAIN_ID.FOREST,
]);

// ─── Candidate Scoring ────────────────────────────────────────────────────────

interface StartCandidate {
  hex: HexCoord;
  score: number;
  adjacentLand: number;
  nearbyResources: number;
}

/**
 * Score a hex as a potential starting position.
 *
 * Factors:
 *   - Terrain type (plains/forest preferred)
 *   - Number of adjacent walkable hexes (more = better)
 *   - Nearby resources within radius (more = better)
 *   - Distance from map edge (center is slightly preferred)
 *
 * @param q - Column coordinate
 * @param r - Row coordinate
 * @param width - Map width
 * @param height - Map height
 * @param terrainIds - Terrain type array
 * @param resourceIds - Resource ID array
 * @returns Candidate object, or null if the hex is unsuitable
 */
function scoreCandidate(
  q: number,
  r: number,
  width: number,
  height: number,
  terrainIds: Uint8Array,
  resourceIds: Int16Array,
): StartCandidate | null {
  const idx = toIndex(q, r, width);
  const terrain = terrainIds[idx];

  // Must be on preferred terrain
  if (!PREFERRED_TERRAINS.has(terrain)) {
    return null;
  }

  // Must not be too close to map edge
  if (q < 2 || q >= width - 2 || r < 2 || r >= height - 2) {
    return null;
  }

  // Count adjacent walkable land hexes
  let adjacentLand = 0;
  for (let d = 0; d < 6; d++) {
    const nHex = neighbor({ q, r }, d);
    if (nHex.q < 0 || nHex.q >= width || nHex.r < 0 || nHex.r >= height) {
      continue;
    }
    const nIdx = toIndex(nHex.q, nHex.r, width);
    if (isWalkableTerrain(terrainIds[nIdx])) {
      adjacentLand++;
    }
  }

  // Must have minimum adjacent land
  if (adjacentLand < MIN_ADJACENT_LAND) {
    return null;
  }

  // Count nearby resources within search radius
  let nearbyResources = 0;
  for (let dr = -RESOURCE_SEARCH_RADIUS; dr <= RESOURCE_SEARCH_RADIUS; dr++) {
    for (let dq = -RESOURCE_SEARCH_RADIUS; dq <= RESOURCE_SEARCH_RADIUS; dq++) {
      const nq = q + dq;
      const nr = r + dr;
      if (nq < 0 || nq >= width || nr < 0 || nr >= height) {
        continue;
      }
      const dist = hexDistance({ q, r }, { q: nq, r: nr });
      if (dist > RESOURCE_SEARCH_RADIUS) continue;

      const nIdx = toIndex(nq, nr, width);
      if (resourceIds[nIdx] !== RESOURCE_ID.NONE) {
        nearbyResources++;
      }
    }
  }

  // Must have at least 1 resource nearby
  if (nearbyResources < 1) {
    return null;
  }

  // Center preference: how far from map center (0 = center, 1 = edge)
  const centerQ = (width - 1) / 2;
  const centerR = (height - 1) / 2;
  const maxDist = Math.sqrt(centerQ * centerQ + centerR * centerR);
  const distFromCenter = Math.sqrt(
    (q - centerQ) * (q - centerQ) + (r - centerR) * (r - centerR),
  );
  const centerPenalty = distFromCenter / maxDist;

  // Composite score (higher = better)
  const score =
    adjacentLand * 10 +
    Math.min(nearbyResources, 8) * 5 + // Cap to avoid extreme values
    (1 - centerPenalty) * 8; // Slight center preference

  return {
    hex: { q, r },
    score,
    adjacentLand,
    nearbyResources,
  };
}

// ─── Find Starting Positions ──────────────────────────────────────────────────

/**
 * Determine fair starting positions for all players.
 *
 * Uses a greedy farthest-point approach:
 *   1. First player gets the highest-scored candidate
 *   2. Each subsequent player gets the candidate that maximizes
 *      minimum distance from all already-placed players
 *   3. If ties exist in minimum distance, use candidate score as tiebreaker
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param terrainIds - Uint8Array of terrain type IDs
 * @param resourceIds - Int16Array of resource IDs per hex
 * @param playerCount - Number of players to place
 * @param rng - Deterministic RNG for tie-breaking
 * @returns Array of HexCoord starting positions (length = playerCount)
 */
export function findStartingPositions(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  resourceIds: Int16Array,
  playerCount: number,
  rng: GameRng,
): HexCoord[] {
  // ── Step 1: Collect all valid candidates ────────────────────────────────

  const candidates: StartCandidate[] = [];

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const candidate = scoreCandidate(q, r, width, height, terrainIds, resourceIds);
      if (candidate !== null) {
        candidates.push(candidate);
      }
    }
  }

  // If not enough candidates, relax constraints
  if (candidates.length < playerCount) {
    return findRelaxedStartingPositions(
      width, height, terrainIds, resourceIds, playerCount, rng,
    );
  }

  // ── Step 2: Place first player at best candidate ────────────────────────

  candidates.sort((a, b) => b.score - a.score);
  const positions: HexCoord[] = [candidates[0].hex];

  // ── Step 3: Place remaining players using farthest-point ────────────────

  for (let p = 1; p < playerCount; p++) {
    let bestCandidate: StartCandidate | null = null;
    let bestMinDist = -1;

    for (const candidate of candidates) {
      // Skip if too close to an existing position
      let tooClose = false;
      let minDist = Infinity;

      for (const existing of positions) {
        const dist = hexDistance(candidate.hex, existing);
        if (dist < MIN_START_DISTANCE) {
          tooClose = true;
          break;
        }
        minDist = Math.min(minDist, dist);
      }

      if (tooClose) continue;

      // Prefer candidate with highest minimum distance to existing positions
      // Tie-break by candidate score
      if (
        minDist > bestMinDist ||
        (minDist === bestMinDist &&
          candidate.score > (bestCandidate?.score ?? 0))
      ) {
        bestMinDist = minDist;
        bestCandidate = candidate;
      }
    }

    // If no valid candidate found with distance constraint, pick the farthest
    // available candidate without the distance constraint
    if (bestCandidate === null) {
      for (const candidate of candidates) {
        let minDist = Infinity;
        for (const existing of positions) {
          minDist = Math.min(minDist, hexDistance(candidate.hex, existing));
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate !== null) {
      positions.push(bestCandidate.hex);
    } else {
      // Fallback: place at a random valid land hex
      positions.push(findFallbackPosition(width, height, terrainIds, positions, rng));
    }
  }

  return positions;
}

// ─── Relaxed Position Finder ──────────────────────────────────────────────────

/**
 * Find starting positions with relaxed constraints when not enough
 * candidates meet the strict requirements.
 *
 * Relaxes: terrain type (any walkable), edge distance, adjacent land count.
 */
function findRelaxedStartingPositions(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  resourceIds: Int16Array,
  playerCount: number,
  rng: GameRng,
): HexCoord[] {
  const candidates: HexCoord[] = [];

  for (let r = 1; r < height - 1; r++) {
    for (let q = 1; q < width - 1; q++) {
      const idx = toIndex(q, r, width);
      if (isWalkableTerrain(terrainIds[idx])) {
        candidates.push({ q, r });
      }
    }
  }

  rng.shuffle(candidates);

  const positions: HexCoord[] = [];

  for (const hex of candidates) {
    if (positions.length >= playerCount) break;

    // Try to maintain minimum distance
    let tooClose = false;
    for (const existing of positions) {
      if (hexDistance(hex, existing) < MIN_START_DISTANCE / 2) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose || positions.length === 0) {
      positions.push(hex);
    }
  }

  // If still not enough, just use whatever we can find
  while (positions.length < playerCount && candidates.length > 0) {
    const hex = candidates.pop()!;
    if (!positions.some(p => p.q === hex.q && p.r === hex.r)) {
      positions.push(hex);
    }
  }

  return positions;
}

// ─── Fallback Position ────────────────────────────────────────────────────────

/**
 * Find a fallback starting position when the farthest-point algorithm
 * fails to find a suitable candidate.
 */
function findFallbackPosition(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  existing: HexCoord[],
  rng: GameRng,
): HexCoord {
  const candidates: HexCoord[] = [];

  for (let r = 1; r < height - 1; r++) {
    for (let q = 1; q < width - 1; q++) {
      const idx = toIndex(q, r, width);
      if (isWalkableTerrain(terrainIds[idx])) {
        candidates.push({ q, r });
      }
    }
  }

  rng.shuffle(candidates);

  // Pick the one farthest from existing positions
  let bestDist = -1;
  let bestHex: HexCoord = candidates[0] ?? { q: width / 2, r: height / 2 };

  for (const hex of candidates) {
    let minDist = Infinity;
    for (const pos of existing) {
      minDist = Math.min(minDist, hexDistance(hex, pos));
    }
    if (minDist > bestDist) {
      bestDist = minDist;
      bestHex = hex;
    }
  }

  return bestHex;
}

/**
 * Map validation for "Realms of War" map generation.
 *
 * Validates that a generated map meets playability requirements:
 *   - Sufficient land tiles (at least 60%)
 *   - All players can reach each other (connected landmass)
 *   - Each start position has adequate nearby resources
 *   - No player is trapped by impassable terrain
 */

import type { HexCoord } from '@/engine/core/types';
import { toIndex } from '@/engine/hex/mapStorage';
import { neighbor } from '@/engine/hex/directions';
import { hexDistance } from '@/engine/hex/distance';
import { TERRAIN_ID, isWalkableTerrain, isLandTerrain } from './biomes';
import { RESOURCE_ID } from './resources';

// ─── Validation Result ────────────────────────────────────────────────────────

/**
 * Result of map validation.
 */
export interface ValidationResult {
  /** Whether the map passes all critical checks. */
  valid: boolean;
  /** Critical issues that make the map unplayable. */
  issues: string[];
  /** Non-critical concerns that may affect game quality. */
  warnings: string[];
}

// ─── Validate Map ─────────────────────────────────────────────────────────────

/**
 * Validate a generated map meets playability requirements.
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param terrainIds - Uint8Array of terrain type IDs
 * @param resourceIds - Int16Array of resource IDs per hex
 * @param startingPositions - Array of player starting positions
 * @returns ValidationResult with valid flag, issues, and warnings
 */
export function validateMap(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  resourceIds: Int16Array,
  startingPositions: HexCoord[],
): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // ── Check 1: Land tile ratio ────────────────────────────────────────────

  const totalTiles = width * height;
  let landCount = 0;

  for (let i = 0; i < totalTiles; i++) {
    if (isLandTerrain(terrainIds[i])) {
      landCount++;
    }
  }

  const landRatio = landCount / totalTiles;

  if (landRatio < 0.50) {
    issues.push(
      `Insufficient land: ${(landRatio * 100).toFixed(1)}% land tiles (minimum 60%, currently below 50%)`,
    );
  } else if (landRatio < 0.60) {
    warnings.push(
      `Low land ratio: ${(landRatio * 100).toFixed(1)}% land tiles (recommended ≥60%)`,
    );
  }

  // ── Check 2: Walkable tile ratio ────────────────────────────────────────

  let walkableCount = 0;
  for (let i = 0; i < totalTiles; i++) {
    if (isWalkableTerrain(terrainIds[i])) {
      walkableCount++;
    }
  }

  const walkableRatio = walkableCount / totalTiles;

  if (walkableRatio < 0.40) {
    issues.push(
      `Insufficient walkable terrain: ${(walkableRatio * 100).toFixed(1)}% (minimum 40%)`,
    );
  }

  // ── Check 3: Land connectivity ──────────────────────────────────────────

  const connectivity = checkLandConnectivity(width, height, terrainIds);

  if (connectivity.largestLandmassRatio < 0.80 && landRatio >= 0.50) {
    // If there's significant land but it's fragmented
    if (connectivity.landmassCount > 1) {
      const largestPercent = (connectivity.largestLandmassRatio * 100).toFixed(1);
      warnings.push(
        `Fragmented landmasses: ${connectivity.landmassCount} landmasses, ` +
        `largest is ${largestPercent}% of land`,
      );
    }
  }

  if (connectivity.landmassCount > 3) {
    issues.push(
      `Too many separate landmasses: ${connectivity.landmassCount} (maximum 3 for standard play)`,
    );
  }

  // ── Check 4: Starting position quality ──────────────────────────────────

  for (let i = 0; i < startingPositions.length; i++) {
    const pos = startingPositions[i];
    const posIdx = toIndex(pos.q, pos.r, width);
    const posTerrain = terrainIds[posIdx];

    // Check terrain is walkable
    if (!isWalkableTerrain(posTerrain)) {
      issues.push(
        `Player ${i + 1} starting position (${pos.q},${pos.r}) is on impassable terrain`,
      );
      continue;
    }

    // Check adjacent walkable hexes
    const adjacentWalkable = countAdjacentWalkable(pos, width, height, terrainIds);
    if (adjacentWalkable < 2) {
      issues.push(
        `Player ${i + 1} starting position has only ${adjacentWalkable} walkable neighbors (minimum 2)`,
      );
    }

    // Check for resources nearby
    const nearbyResources = countNearbyResources(
      pos, width, height, resourceIds, 3,
    );
    if (nearbyResources === 0) {
      warnings.push(
        `Player ${i + 1} starting position has no resources within 3 hexes`,
      );
    }
  }

  // ── Check 5: Player isolation / reachability ────────────────────────────

  if (startingPositions.length >= 2) {
    for (let i = 0; i < startingPositions.length; i++) {
      const reachableFromI = floodFillWalkable(
        startingPositions[i], width, height, terrainIds,
      );

      for (let j = i + 1; j < startingPositions.length; j++) {
        const keyJ = `${startingPositions[j].q},${startingPositions[j].r}`;
        if (!reachableFromI.has(keyJ)) {
          issues.push(
            `Players ${i + 1} and ${j + 1} cannot reach each other (separated by impassable terrain)`,
          );
        }
      }
    }
  }

  // ── Check 6: Minimum distance between starting positions ────────────────

  for (let i = 0; i < startingPositions.length; i++) {
    for (let j = i + 1; j < startingPositions.length; j++) {
      const dist = hexDistance(startingPositions[i], startingPositions[j]);
      if (dist < 4) {
        warnings.push(
          `Players ${i + 1} and ${j + 1} are very close (${dist} hexes apart)`,
        );
      }
    }
  }

  // ── Check 7: Trapped player check ───────────────────────────────────────

  for (let i = 0; i < startingPositions.length; i++) {
    const pos = startingPositions[i];
    const reachable = floodFillWalkable(pos, width, height, terrainIds);

    // A player is "trapped" if they can reach fewer than 10 hexes
    if (reachable.size < 10) {
      issues.push(
        `Player ${i + 1} appears trapped (can only reach ${reachable.size} hexes)`,
      );
    } else if (reachable.size < 20) {
      warnings.push(
        `Player ${i + 1} has limited space (can only reach ${reachable.size} hexes)`,
      );
    }
  }

  // ── Determine overall validity ──────────────────────────────────────────

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

// ─── Connectivity Check ───────────────────────────────────────────────────────

/**
 * Result of landmass connectivity analysis.
 */
interface ConnectivityResult {
  /** Number of distinct landmasses. */
  landmassCount: number;
  /** Ratio of land tiles in the largest landmass vs total land. */
  largestLandmassRatio: number;
}

/**
 * Analyze landmass connectivity using flood fill.
 *
 * @returns Connectivity metrics
 */
function checkLandConnectivity(
  width: number,
  height: number,
  terrainIds: Uint8Array,
): ConnectivityResult {
  const visited = new Uint8Array(width * height);
  const landmassSizes: number[] = [];
  let totalLand = 0;

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = toIndex(q, r, width);

      if (!isLandTerrain(terrainIds[idx]) || visited[idx]) {
        continue;
      }

      // BFS to find connected landmass
      let size = 0;
      const queue: HexCoord[] = [{ q, r }];
      let head = 0;
      visited[idx] = 1;

      while (head < queue.length) {
        const current = queue[head++];
        size++;
        totalLand++;

        for (let d = 0; d < 6; d++) {
          const nHex = neighbor(current, d);
          if (nHex.q < 0 || nHex.q >= width || nHex.r < 0 || nHex.r >= height) {
            continue;
          }

          const nIdx = toIndex(nHex.q, nHex.r, width);
          if (visited[nIdx] || !isLandTerrain(terrainIds[nIdx])) {
            continue;
          }

          visited[nIdx] = 1;
          queue.push(nHex);
        }
      }

      landmassSizes.push(size);
    }
  }

  // Sort descending by size
  landmassSizes.sort((a, b) => b - a);

  const largestSize = landmassSizes[0] ?? 0;
  const largestLandmassRatio = totalLand > 0 ? largestSize / totalLand : 0;

  return {
    landmassCount: landmassSizes.length,
    largestLandmassRatio,
  };
}

// ─── Flood Fill ───────────────────────────────────────────────────────────────

/**
 * Flood fill from a starting hex, finding all walkable hexes reachable
 * from it.
 *
 * @param start - Starting hex
 * @param width - Map width
 * @param height - Map height
 * @param terrainIds - Terrain type array
 * @returns Set of hex key strings ("q,r") reachable from start
 */
function floodFillWalkable(
  start: HexCoord,
  width: number,
  height: number,
  terrainIds: Uint8Array,
): Set<string> {
  const reachable = new Set<string>();
  const queue: HexCoord[] = [start];
  let head = 0;

  const startKey = `${start.q},${start.r}`;
  reachable.add(startKey);

  while (head < queue.length) {
    const current = queue[head++];

    for (let d = 0; d < 6; d++) {
      const nHex = neighbor(current, d);
      if (nHex.q < 0 || nHex.q >= width || nHex.r < 0 || nHex.r >= height) {
        continue;
      }

      const nKey = `${nHex.q},${nHex.r}`;
      if (reachable.has(nKey)) continue;

      const nIdx = toIndex(nHex.q, nHex.r, width);
      if (!isWalkableTerrain(terrainIds[nIdx])) continue;

      reachable.add(nKey);
      queue.push(nHex);
    }
  }

  return reachable;
}

// ─── Counting Helpers ─────────────────────────────────────────────────────────

/**
 * Count walkable hexes adjacent to a given position.
 */
function countAdjacentWalkable(
  hex: HexCoord,
  width: number,
  height: number,
  terrainIds: Uint8Array,
): number {
  let count = 0;
  for (let d = 0; d < 6; d++) {
    const nHex = neighbor(hex, d);
    if (nHex.q < 0 || nHex.q >= width || nHex.r < 0 || nHex.r >= height) {
      continue;
    }
    const nIdx = toIndex(nHex.q, nHex.r, width);
    if (isWalkableTerrain(terrainIds[nIdx])) {
      count++;
    }
  }
  return count;
}

/**
 * Count resources within a given radius of a hex.
 */
function countNearbyResources(
  hex: HexCoord,
  width: number,
  height: number,
  resourceIds: Int16Array,
  radius: number,
): number {
  let count = 0;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dq = -radius; dq <= radius; dq++) {
      const nq = hex.q + dq;
      const nr = hex.r + dr;
      if (nq < 0 || nq >= width || nr < 0 || nr >= height) {
        continue;
      }
      if (hexDistance(hex, { q: nq, r: nr }) > radius) continue;

      const nIdx = toIndex(nq, nr, width);
      if (resourceIds[nIdx] !== RESOURCE_ID.NONE) {
        count++;
      }
    }
  }
  return count;
}

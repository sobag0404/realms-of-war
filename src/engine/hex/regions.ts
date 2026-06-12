/**
 * Region / province system for hex maps — "Realms of War"
 *
 * Groups contiguous hexes into logical regions. This is used for:
 * - Territory management (cities claim regions)
 * - Strategic AI evaluation (which regions are valuable?)
 * - Map display (coloring regions)
 *
 * A region is defined as a maximal set of connected hexes where all hexes
 * share a common property — by default, "walkability" (contiguous land).
 *
 * All functions are pure and deterministic — no side effects, no DOM.
 */

import type { HexCoord } from "./coordinates";
import type { TerrainTypeId } from "../../engine/core/types";
import { HEX_DIRECTIONS } from "./directions";
import { TERRAIN_TYPES } from "../../data/terrain";

// ─── Types ──────────────────────────────────────────────────────────────────

/** A region is a group of contiguous hexes sharing some property */
export interface HexRegion {
  /** Unique region identifier */
  id: number;
  /** Set of hex keys ("q,r") belonging to this region */
  hexes: Set<string>;
  /** The primary terrain type of this region (most frequent) */
  dominantTerrain: TerrainTypeId;
  /** Total area (number of hexes) */
  area: number;
  /** Whether this region touches the map edge */
  isEdgeRegion: boolean;
  /** Center of the region (approximate — average of all hex coordinates) */
  center: HexCoord;
}

/** Result of region analysis */
export interface RegionAnalysis {
  /** All identified regions */
  regions: HexRegion[];
  /** Map from hex key to region ID */
  hexToRegion: Map<string, number>;
  /** Number of distinct regions */
  regionCount: number;
  /** ID of the largest region (by area), or -1 if no regions */
  largestRegionId: number;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Create a hex key string from q, r coordinates.
 */
function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/**
 * Parse a hex key string back into q, r coordinates.
 */
function parseHexKey(key: string): { q: number; r: number } {
  const parts = key.split(",");
  return { q: parseInt(parts[0], 10), r: parseInt(parts[1], 10) };
}

/**
 * Check if a hex is on the edge of a map of the given radius.
 *
 * A hex is on the edge if the maximum absolute component of its cube
 * coordinates equals the map radius.
 */
function isOnMapEdge(q: number, r: number, mapRadius: number): boolean {
  const x = q;
  const z = r;
  const y = -x - z;
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) >= mapRadius;
}

/**
 * Check if a terrain type is walkable (land that can form a region).
 */
function isWalkableTerrain(terrain: TerrainTypeId): boolean {
  const terrainData = TERRAIN_TYPES[terrain];
  return terrainData ? terrainData.walkable : false;
}

/**
 * Find the most frequent terrain type in a set of hex keys.
 */
function findDominantTerrain(
  hexKeys: Set<string>,
  tiles: Record<string, { terrain: TerrainTypeId }>,
): TerrainTypeId {
  const counts: Partial<Record<TerrainTypeId, number>> = {};

  Array.from(hexKeys).forEach((key) => {
    const tile = tiles[key];
    if (tile) {
      const t = tile.terrain;
      counts[t] = (counts[t] ?? 0) + 1;
    }
  });

  let dominant: TerrainTypeId = "plains";
  let maxCount = 0;

  for (const [terrain, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = terrain as TerrainTypeId;
    }
  }

  return dominant;
}

// ─── Region Identification ──────────────────────────────────────────────────

/**
 * Identify all land regions (contiguous walkable hex groups).
 *
 * Uses BFS flood-fill to find connected components of walkable terrain.
 * Two hexes are in the same region if they are adjacent (sharing an edge)
 * AND both are walkable.
 *
 * @param tiles - Map tiles record (hex key → { terrain })
 * @param mapRadius - Map radius for edge detection and bounds checking
 * @returns RegionAnalysis with all regions and lookup maps
 */
export function identifyLandRegions(
  tiles: Record<string, { terrain: TerrainTypeId }>,
  mapRadius: number,
): RegionAnalysis {
  const visited = new Set<string>();
  const regions: HexRegion[] = [];
  const hexToRegion = new Map<string, number>();
  let largestRegionId = -1;
  let largestArea = 0;

  // Iterate over all tiles
  for (const key of Object.keys(tiles)) {
    // Skip already-visited hexes
    if (visited.has(key)) continue;

    const tile = tiles[key];
    if (!tile) continue;

    // Skip non-walkable terrain (water, mountains)
    if (!isWalkableTerrain(tile.terrain)) {
      visited.add(key);
      continue;
    }

    // BFS flood-fill to find all connected walkable hexes
    const regionHexes = new Set<string>();
    const queue: string[] = [key];
    visited.add(key);

    while (queue.length > 0) {
      const currentKey = queue.pop()!;
      regionHexes.add(currentKey);

      // Check all 6 neighbors
      const { q, r } = parseHexKey(currentKey);
      for (let d = 0; d < 6; d++) {
        const nq = q + HEX_DIRECTIONS[d].q;
        const nr = r + HEX_DIRECTIONS[d].r;
        const neighborKey = hexKey(nq, nr);

        // Skip if already visited
        if (visited.has(neighborKey)) continue;

        // Skip if neighbor doesn't exist in the map
        const neighborTile = tiles[neighborKey];
        if (!neighborTile) continue;

        // Skip non-walkable neighbors
        if (!isWalkableTerrain(neighborTile.terrain)) continue;

        // This neighbor is walkable and connected — add to region
        visited.add(neighborKey);
        queue.push(neighborKey);
      }
    }

    // Create the region
    const regionId = regions.length;
    const dominantTerrain = findDominantTerrain(regionHexes, tiles);
    const center = calculateRegionCenter(regionHexes);

    // Check if any hex in the region is on the map edge
    let isEdgeRegion = false;
    Array.from(regionHexes).some((regionHexKey) => {
      const { q, r } = parseHexKey(regionHexKey);
      if (isOnMapEdge(q, r, mapRadius)) {
        isEdgeRegion = true;
        return true; // break
      }
      return false;
    });

    const region: HexRegion = {
      id: regionId,
      hexes: regionHexes,
      dominantTerrain,
      area: regionHexes.size,
      isEdgeRegion,
      center,
    };

    regions.push(region);

    // Update hex→region lookup
    Array.from(regionHexes).forEach((regionHexKey) => {
      hexToRegion.set(regionHexKey, regionId);
    });

    // Track largest region
    if (regionHexes.size > largestArea) {
      largestArea = regionHexes.size;
      largestRegionId = regionId;
    }
  }

  return {
    regions,
    hexToRegion,
    regionCount: regions.length,
    largestRegionId,
  };
}

// ─── Region Lookup ──────────────────────────────────────────────────────────

/**
 * Find the region containing a specific hex.
 *
 * @param analysis - The region analysis result
 * @param hexKey - The hex key ("q,r") to look up
 * @returns The HexRegion containing the hex, or null if not in any region
 */
export function getRegionForHex(
  analysis: RegionAnalysis,
  hexKey: string,
): HexRegion | null {
  const regionId = analysis.hexToRegion.get(hexKey);
  if (regionId === undefined) return null;
  return analysis.regions[regionId] ?? null;
}

/**
 * Find all hexes in the same region as the given hex.
 *
 * @param analysis - The region analysis result
 * @param hexKey - The hex key ("q,r") to look up
 * @returns Set of hex keys in the same region, or empty set if not in any region
 */
export function getContiguousHexes(
  analysis: RegionAnalysis,
  hexKey: string,
): Set<string> {
  const region = getRegionForHex(analysis, hexKey);
  return region ? region.hexes : new Set<string>();
}

/**
 * Check if two hexes are in the same region.
 *
 * @param analysis - The region analysis result
 * @param hexKeyA - First hex key ("q,r")
 * @param hexKeyB - Second hex key ("q,r")
 * @returns True if both hexes are in the same region
 */
export function areInSameRegion(
  analysis: RegionAnalysis,
  hexKeyA: string,
  hexKeyB: string,
): boolean {
  const regionA = analysis.hexToRegion.get(hexKeyA);
  const regionB = analysis.hexToRegion.get(hexKeyB);

  // Both must be in a region and the same one
  if (regionA === undefined || regionB === undefined) return false;
  return regionA === regionB;
}

// ─── Region Center ──────────────────────────────────────────────────────────

/**
 * Calculate the center of a region (average of all hex coordinates).
 *
 * The result is rounded to the nearest valid hex coordinate.
 *
 * @param hexes - Set of hex keys ("q,r")
 * @returns The approximate center hex coordinate
 */
export function calculateRegionCenter(hexes: Set<string>): HexCoord {
  if (hexes.size === 0) {
    return { q: 0, r: 0 };
  }

  let sumQ = 0;
  let sumR = 0;

  Array.from(hexes).forEach((key) => {
    const { q, r } = parseHexKey(key);
    sumQ += q;
    sumR += r;
  });

  // Average and round to nearest hex
  const avgQ = sumQ / hexes.size;
  const avgR = sumR / hexes.size;

  // Round using cube-coordinate rounding for a valid hex
  // Convert to fractional cube
  const fracX = avgQ;
  const fracZ = avgR;
  const fracY = -fracX - fracZ;

  let rx = Math.round(fracX);
  let ry = Math.round(fracY);
  let rz = Math.round(fracZ);

  const xDiff = Math.abs(rx - fracX);
  const yDiff = Math.abs(ry - fracY);
  const zDiff = Math.abs(rz - fracZ);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

/**
 * Biome / terrain assignment for "Realms of War" map generation.
 *
 * Converts elevation and moisture noise maps into terrain type IDs
 * using the threshold rules from the game design document.
 *
 * Terrain types (matching TERRAIN_IDS order from data/terrain.ts):
 *   0 = plains, 1 = forest, 2 = mountain, 3 = water,
 *   4 = desert, 5 = swamp, 6 = hills, 7 = ruins
 *
 * Thresholds (elevation × moisture):
 *   water:   elevation < 0.30
 *   swamp:   elevation 0.30–0.35 AND moisture > 0.70
 *   desert:  elevation 0.35–0.55 AND moisture < 0.30
 *   plains:  elevation 0.35–0.55 AND moisture 0.30–0.60
 *   forest:  elevation 0.35–0.60 AND moisture > 0.60
 *   hills:   elevation 0.55–0.70
 *   mountain: elevation > 0.70
 *   ruins:   special rare placement (< 5% of land tiles)
 */

import { GameRng } from '@/engine/core/GameRng';
import { toIndex } from '@/engine/hex/mapStorage';

// ─── Terrain ID Constants ─────────────────────────────────────────────────────

/** Numeric terrain IDs matching TERRAIN_IDS order from data/terrain.ts. */
export const TERRAIN_ID = {
  PLAINS: 0,
  FOREST: 1,
  MOUNTAIN: 2,
  WATER: 3,
  DESERT: 4,
  SWAMP: 5,
  HILLS: 6,
  RUINS: 7,
} as const;

/** String terrain IDs indexed by numeric ID. */
export const TERRAIN_ID_STR: readonly string[] = [
  'plains',   // 0
  'forest',   // 1
  'mountain', // 2
  'water',    // 3
  'desert',   // 4
  'swamp',    // 5
  'hills',    // 6
  'ruins',    // 7
];

// ─── Biome Assignment ─────────────────────────────────────────────────────────

/**
 * Assign terrain types to every hex based on elevation and moisture values.
 *
 * After initial assignment, a second pass randomly replaces a small
 * percentage of land tiles with the "ruins" terrain type.
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param elevation - Float64Array of elevation values [0, 1], indexed by r*width+q
 * @param moisture - Float64Array of moisture values [0, 1], indexed by r*width+q
 * @param rng - Deterministic RNG for ruins placement
 * @returns Uint8Array of terrain type IDs (same length as width * height)
 */
export function assignBiomes(
  width: number,
  height: number,
  elevation: Float64Array,
  moisture: Float64Array,
  rng: GameRng,
): Uint8Array {
  const size = width * height;
  const terrainIds = new Uint8Array(size);

  // ── Pass 1: Assign base terrain from elevation × moisture ──────────────

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = toIndex(q, r, width);
      const elev = elevation[idx];
      const moist = moisture[idx];

      terrainIds[idx] = classifyTerrain(elev, moist);
    }
  }

  // ── Pass 2: Place ruins on land tiles (< 5% chance per land tile) ──────

  // Count land tiles for probability
  let landCount = 0;
  for (let i = 0; i < size; i++) {
    if (terrainIds[i] !== TERRAIN_ID.WATER) {
      landCount++;
    }
  }

  // Target: ~3–5% of land tiles as ruins
  const ruinsTarget = Math.floor(landCount * rng.float(0.03, 0.05));
  let ruinsPlaced = 0;

  // Shuffle land tile indices for fair distribution
  const landIndices: number[] = [];
  for (let i = 0; i < size; i++) {
    if (terrainIds[i] !== TERRAIN_ID.WATER && terrainIds[i] !== TERRAIN_ID.MOUNTAIN) {
      landIndices.push(i);
    }
  }

  rng.shuffle(landIndices);

  for (let i = 0; i < landIndices.length && ruinsPlaced < ruinsTarget; i++) {
    const idx = landIndices[i];
    // Only place ruins on walkable, non-special terrain
    if (
      terrainIds[idx] === TERRAIN_ID.PLAINS ||
      terrainIds[idx] === TERRAIN_ID.FOREST ||
      terrainIds[idx] === TERRAIN_ID.HILLS
    ) {
      terrainIds[idx] = TERRAIN_ID.RUINS;
      ruinsPlaced++;
    }
  }

  return terrainIds;
}

// ─── Terrain Classification ───────────────────────────────────────────────────

/**
 * Classify a single hex's terrain based on elevation and moisture thresholds.
 *
 * Priority order matters — more specific conditions should be checked first.
 *
 * @param elevation - Elevation value [0, 1]
 * @param moisture - Moisture value [0, 1]
 * @returns Numeric terrain type ID
 */
export function classifyTerrain(elevation: number, moisture: number): number {
  // Water: below sea level
  if (elevation < 0.30) {
    return TERRAIN_ID.WATER;
  }

  // Swamp: low elevation + very wet
  if (elevation >= 0.30 && elevation < 0.35 && moisture > 0.70) {
    return TERRAIN_ID.SWAMP;
  }

  // Mountain: high elevation
  if (elevation > 0.70) {
    return TERRAIN_ID.MOUNTAIN;
  }

  // Hills: moderately high elevation
  if (elevation >= 0.55 && elevation <= 0.70) {
    return TERRAIN_ID.HILLS;
  }

  // Mid-elevation band (0.35–0.55): moisture determines biome
  if (elevation >= 0.35 && elevation < 0.55) {
    if (moisture < 0.30) {
      return TERRAIN_ID.DESERT;
    }
    if (moisture > 0.60) {
      return TERRAIN_ID.FOREST;
    }
    return TERRAIN_ID.PLAINS;
  }

  // Elevation 0.55–0.60 with high moisture → forest (edge case)
  if (elevation >= 0.55 && elevation < 0.60 && moisture > 0.60) {
    return TERRAIN_ID.FOREST;
  }

  // Fallback: anything else in the 0.30–0.35 band that isn't swamp
  if (elevation >= 0.30 && elevation < 0.35) {
    if (moisture < 0.30) {
      return TERRAIN_ID.DESERT;
    }
    return TERRAIN_ID.PLAINS;
  }

  // Default fallback
  return TERRAIN_ID.PLAINS;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Check if a terrain type ID represents walkable land.
 *
 * @param terrainId - Numeric terrain type ID
 * @returns True if the terrain is walkable
 */
export function isWalkableTerrain(terrainId: number): boolean {
  return (
    terrainId !== TERRAIN_ID.WATER &&
    terrainId !== TERRAIN_ID.MOUNTAIN
  );
}

/**
 * Check if a terrain type ID represents land (not water).
 * Mountains count as land even though they're not walkable.
 *
 * @param terrainId - Numeric terrain type ID
 * @returns True if the terrain is land
 */
export function isLandTerrain(terrainId: number): boolean {
  return terrainId !== TERRAIN_ID.WATER;
}

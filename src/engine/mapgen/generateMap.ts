/**
 * Map generation orchestrator for "Realms of War".
 *
 * Ties all mapgen modules together into a single pipeline:
 *   1. Generate elevation + moisture using seeded noise
 *   2. Assign biomes / terrain types
 *   3. Generate rivers
 *   4. Place resources
 *   5. Place ancient ruins
 *   6. Find fair starting positions
 *   7. Validate the map
 *   8. Retry with adjusted parameters if validation fails (up to 3 times)
 *   9. Convert to MapData format and return
 */

import type { HexCoord } from '@/engine/core/types';
import type { MapData, HexTile } from '@/engine/core/GameState';
import { GameRng } from '@/engine/core/GameRng';
import { toIndex } from '@/engine/hex/mapStorage';

import { SeededNoise } from './noise';
import { assignBiomes, TERRAIN_ID_STR } from './biomes';
import { generateRivers, computeRiverMasks } from './rivers';
import { placeResources, RESOURCE_ID_STR } from './resources';
import { placeRuins, type Ruin } from './ruins';
import { findStartingPositions } from './startingPositions';
import { validateMap, type ValidationResult } from './validation';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Configuration for map generation.
 */
export interface MapGenConfig {
  /** Map width in hexes (default 20). */
  width: number;
  /** Map height in hexes (default 15). */
  height: number;
  /** Random seed for deterministic generation. */
  seed: number;
  /** Number of players to place. */
  playerCount: number;
}

/**
 * Result of map generation.
 */
export interface MapGenResult {
  /** Generated map data in the game state format. */
  mapData: MapData;
  /** Starting hex positions for each player. */
  startingPositions: HexCoord[];
  /** Ancient ruins placed on the map. */
  ruins: Ruin[];
  /** Validation result (issues/warnings). */
  validation: ValidationResult;
}

// ─── Noise Configuration ──────────────────────────────────────────────────────

/** Noise scale for elevation (lower = larger features). */
const ELEVATION_SCALE = 0.08;
/** Noise scale for moisture (lower = larger features). */
const MOISTURE_SCALE = 0.06;
/** Number of octaves for elevation noise. */
const ELEVATION_OCTAVES = 6;
/** Number of octaves for moisture noise. */
const MOISTURE_OCTAVES = 5;
/** Persistence (roughness) of elevation noise. */
const ELEVATION_PERSISTENCE = 0.5;
/** Persistence (roughness) of moisture noise. */
const MOISTURE_PERSISTENCE = 0.55;

// ─── Water Level Adjustment ───────────────────────────────────────────────────

/** Default water level threshold (elevation below this → water). */
const DEFAULT_WATER_LEVEL = 0.30;

/** Adjustment applied to water level on retry (raise = more land). */
const WATER_LEVEL_REDUCTION = 0.03;

// ─── Maximum Retry Attempts ───────────────────────────────────────────────────

/** Maximum number of retries when validation fails. */
const MAX_RETRIES = 3;

// ─── Main Generation Function ─────────────────────────────────────────────────

/**
 * Generate a complete game map from a seed and configuration.
 *
 * The generation is fully deterministic: the same seed and config
 * always produce the same map.
 *
 * If the generated map fails validation, the water level is adjusted
 * to produce more land, and generation is retried up to MAX_RETRIES times.
 *
 * @param config - Map generation configuration
 * @returns MapGenResult with map data, starting positions, ruins, and validation
 */
export function generateMap(config: MapGenConfig): MapGenResult {
  const {
    width = 20,
    height = 15,
    seed,
    playerCount,
  } = config;

  let waterLevel = DEFAULT_WATER_LEVEL;
  let attempt = 0;
  let result: MapGenResult | null = null;

  while (attempt <= MAX_RETRIES) {
    attempt++;

    // Fork the RNG for each attempt so the seed progression is deterministic
    const rng = new GameRng(seed + attempt * 7919); // Prime offset for variety

    // ── Step 1: Generate elevation and moisture using noise ───────────────

    const elevationNoise = new SeededNoise(seed);
    const moistureNoise = new SeededNoise(seed ^ 0xDEADBEEF); // Different seed for moisture

    const size = width * height;
    const elevation = new Float64Array(size);
    const moisture = new Float64Array(size);

    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const idx = toIndex(q, r, width);
        elevation[idx] = elevationNoise.octaveNoise2D(
          q * ELEVATION_SCALE,
          r * ELEVATION_SCALE,
          ELEVATION_OCTAVES,
          ELEVATION_PERSISTENCE,
        );
        moisture[idx] = moistureNoise.octaveNoise2D(
          q * MOISTURE_SCALE,
          r * MOISTURE_SCALE,
          MOISTURE_OCTAVES,
          MOISTURE_PERSISTENCE,
        );
      }
    }

    // Apply water level adjustment: scale elevation to push more above water
    if (waterLevel !== DEFAULT_WATER_LEVEL) {
      const scale = DEFAULT_WATER_LEVEL / waterLevel;
      for (let i = 0; i < size; i++) {
        // Redistribute: push values above the water level threshold
        elevation[i] = Math.min(1, Math.max(0, (elevation[i] - waterLevel) * scale + DEFAULT_WATER_LEVEL));
      }
    }

    // ── Step 2: Assign biomes / terrain types ────────────────────────────

    const terrainIds = assignBiomes(width, height, elevation, moisture, rng.fork());

    // ── Step 3: Generate rivers ──────────────────────────────────────────

    const rivers = generateRivers(
      width, height, elevation, terrainIds, rng.fork(),
    );
    const riverMasks = computeRiverMasks(width, height, rivers);

    // ── Step 4: Place resources ──────────────────────────────────────────

    const resourceIds = placeResources(width, height, terrainIds, rng.fork());

    // ── Step 5: Place ancient ruins ──────────────────────────────────────

    const ruins = placeRuins(width, height, terrainIds, rng.fork());

    // ── Step 6: Find starting positions ──────────────────────────────────

    const startingPositions = findStartingPositions(
      width, height, terrainIds, resourceIds, playerCount, rng.fork(),
    );

    // ── Step 7: Validate the map ─────────────────────────────────────────

    const validation = validateMap(
      width, height, terrainIds, resourceIds, startingPositions,
    );

    // ── Step 8: Check if we should retry ─────────────────────────────────

    if (validation.valid || attempt > MAX_RETRIES) {
      // ── Step 9: Convert to MapData format ──────────────────────────────

      const mapData = buildMapData(
        width, height, terrainIds, elevation, moisture,
        resourceIds, riverMasks, ruins,
      );

      result = {
        mapData,
        startingPositions,
        ruins,
        validation,
      };
      break;
    }

    // Adjust water level for next attempt (reduce to create more land)
    waterLevel = Math.max(0.20, waterLevel - WATER_LEVEL_REDUCTION);
  }

  // Fallback: should never happen, but just in case
  if (result === null) {
    const rng = new GameRng(seed);
    const elevationNoise = new SeededNoise(seed);
    const moistureNoise = new SeededNoise(seed ^ 0xDEADBEEF);
    const size = width * height;
    const elevation = new Float64Array(size);
    const moisture = new Float64Array(size);

    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const idx = toIndex(q, r, width);
        elevation[idx] = elevationNoise.octaveNoise2D(q * ELEVATION_SCALE, r * ELEVATION_SCALE, ELEVATION_OCTAVES, ELEVATION_PERSISTENCE);
        moisture[idx] = moistureNoise.octaveNoise2D(q * MOISTURE_SCALE, r * MOISTURE_SCALE, MOISTURE_OCTAVES, MOISTURE_PERSISTENCE);
      }
    }

    // Force a lower water level for guaranteed more land
    const forcedWaterLevel = 0.22;
    const scale = DEFAULT_WATER_LEVEL / forcedWaterLevel;
    for (let i = 0; i < size; i++) {
      elevation[i] = Math.min(1, Math.max(0, (elevation[i] - forcedWaterLevel) * scale + DEFAULT_WATER_LEVEL));
    }

    const terrainIds = assignBiomes(width, height, elevation, moisture, rng.fork());
    const rivers = generateRivers(width, height, elevation, terrainIds, rng.fork());
    const riverMasks = computeRiverMasks(width, height, rivers);
    const resourceIds = placeResources(width, height, terrainIds, rng.fork());
    const ruins = placeRuins(width, height, terrainIds, rng.fork());
    const startingPositions = findStartingPositions(width, height, terrainIds, resourceIds, playerCount, rng.fork());
    const validation = validateMap(width, height, terrainIds, resourceIds, startingPositions);
    const mapData = buildMapData(width, height, terrainIds, elevation, moisture, resourceIds, riverMasks, ruins);

    result = {
      mapData,
      startingPositions,
      ruins,
      validation,
    };
  }

  return result;
}

// ─── MapData Builder ──────────────────────────────────────────────────────────

/**
 * Convert the raw typed arrays into the MapData format used by GameState.
 *
 * MapData uses a Record<string, HexTile> where keys are "q,r" strings.
 *
 * @param width - Map width
 * @param height - Map height
 * @param terrainIds - Terrain type IDs
 * @param elevation - Elevation values
 * @param moisture - Moisture values
 * @param resourceIds - Resource IDs
 * @param riverMasks - River edge masks
 * @param ruins - Placed ruins
 * @returns MapData object
 */
function buildMapData(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  elevation: Float64Array,
  moisture: Float64Array,
  resourceIds: Int16Array,
  riverMasks: Uint8Array,
  ruins: Ruin[],
): MapData {
  const tiles: Record<string, HexTile> = {};

  // Build a set of ruin hex keys for quick lookup
  const ruinHexKeys = new Set<string>();
  for (const ruin of ruins) {
    ruinHexKeys.add(`${ruin.hex.q},${ruin.hex.r}`);
  }

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = toIndex(q, r, width);
      const terrainId = terrainIds[idx];
      const resourceId = resourceIds[idx];
      const riverMask = riverMasks[idx];

      // Convert numeric IDs to string IDs
      const terrainStr = TERRAIN_ID_STR[terrainId] ?? 'plains';
      const resourceStr = resourceId > 0
        ? (RESOURCE_ID_STR[resourceId] ?? null)
        : null;

      // Compute base yield from terrain
      const tileYield = computeTileYield(terrainStr, resourceStr, riverMask > 0);

      const key = `${q},${r}`;
      tiles[key] = {
        coord: { q, r },
        terrain: terrainStr as HexTile['terrain'],
        resource: resourceStr,
        yield: tileYield,
        hasRoad: false,
        hasFort: false,
        owningCityId: null,
        improvement: null,
        hasRiftPortal: false,
        riftPortalOwner: null,
      };
    }
  }

  return {
    radius: Math.max(width, height),
    tiles,
  };
}

// ─── Yield Computation ────────────────────────────────────────────────────────

/**
 * Compute the resource yield for a single tile.
 *
 * Combines base terrain yield with resource bonus and river bonus.
 *
 * @param terrain - Terrain type string
 * @param resource - Resource type string (null if none)
 * @param hasRiver - Whether the hex has a river
 * @returns Resource yield record
 */
function computeTileYield(
  terrain: string,
  resource: string | null,
  hasRiver: boolean,
): Record<string, number> {
  // Base yields by terrain type (from terrain.ts data)
  const baseYields: Record<string, Record<string, number>> = {
    plains: { food: 2, gold: 1 },
    forest: { food: 1, wood: 2 },
    mountain: { stone: 2, science: 1 },
    water: { food: 1 },
    desert: { gold: 1 },
    swamp: { food: 1, science: 1 },
    hills: { stone: 1, gold: 1 },
    ruins: { science: 1, progress: 1 },
  };

  const yield_: Record<string, number> = { ...(baseYields[terrain] ?? {}) };

  // Resource bonus
  if (resource) {
    yield_[resource] = (yield_[resource] ?? 0) + 2;
  }

  // River bonus: +1 food, +1 gold
  if (hasRiver) {
    yield_.food = (yield_.food ?? 0) + 1;
    yield_.gold = (yield_.gold ?? 0) + 1;
  }

  return yield_;
}

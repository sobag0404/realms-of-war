// ============================================================================
// Biome Definitions — Realms of War
// ============================================================================

import type { TerrainTypeId, ResourceId } from '@/engine/core/types';

/** String literal union for all biome IDs */
export type BiomeId =
  | 'temperate_forest'
  | 'tropical_rainforest'
  | 'boreal_forest'
  | 'grassland'
  | 'savanna'
  | 'tundra'
  | 'desert_hot'
  | 'desert_cold'
  | 'coastal'
  | 'wetland'
  | 'mountain_alpine'
  | 'volcanic';

/** Full biome definition */
export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  nameRu: string;
  /** Elevation range for this biome (min, max) — 0 to 1 normalized */
  elevationRange: [number, number];
  /** Moisture range for this biome (min, max) — 0 to 1 normalized */
  moistureRange: [number, number];
  /** Temperature range for this biome (min, max) — 0 to 1 normalized */
  temperatureRange: [number, number];
  /** Primary terrain type for this biome */
  primaryTerrain: TerrainTypeId;
  /** Secondary terrain types that can appear */
  secondaryTerrains: TerrainTypeId[];
  /** Resource bonuses in this biome */
  resourceBonus: Partial<Record<ResourceId, number>>;
  /** Color for minimap rendering */
  color: string;
  /** Movement cost modifier (multiplier) */
  movementModifier: number;
  /** Defense modifier */
  defenseModifier: number;
}

// ---------------------------------------------------------------------------
// Biome data — inspired by Whittaker diagram (elevation × moisture × temperature)
// ---------------------------------------------------------------------------
export const BIOMES: Record<BiomeId, BiomeDefinition> = {
  temperate_forest: {
    id: 'temperate_forest',
    name: 'Temperate Forest',
    nameRu: 'Умеренный лес',
    elevationRange: [0.15, 0.4],
    moistureRange: [0.5, 0.8],
    temperatureRange: [0.4, 0.7],
    primaryTerrain: 'forest',
    secondaryTerrains: ['plains', 'hills'],
    resourceBonus: { wood: 2, food: 1 },
    color: '#3a7d44',
    movementModifier: 1.2,
    defenseModifier: 0.15,
  },
  tropical_rainforest: {
    id: 'tropical_rainforest',
    name: 'Tropical Rainforest',
    nameRu: 'Тропический лес',
    elevationRange: [0.05, 0.3],
    moistureRange: [0.75, 1.0],
    temperatureRange: [0.7, 1.0],
    primaryTerrain: 'forest',
    secondaryTerrains: ['swamp', 'plains'],
    resourceBonus: { wood: 3, food: 2 },
    color: '#1b5e20',
    movementModifier: 1.4,
    defenseModifier: 0.2,
  },
  boreal_forest: {
    id: 'boreal_forest',
    name: 'Boreal Forest',
    nameRu: 'Бореальный лес',
    elevationRange: [0.2, 0.5],
    moistureRange: [0.4, 0.75],
    temperatureRange: [0.0, 0.3],
    primaryTerrain: 'forest',
    secondaryTerrains: ['hills', 'plains'],
    resourceBonus: { wood: 2, stone: 1 },
    color: '#2e5339',
    movementModifier: 1.3,
    defenseModifier: 0.15,
  },
  grassland: {
    id: 'grassland',
    name: 'Grassland',
    nameRu: 'Степь',
    elevationRange: [0.1, 0.35],
    moistureRange: [0.25, 0.55],
    temperatureRange: [0.35, 0.75],
    primaryTerrain: 'plains',
    secondaryTerrains: ['hills', 'forest'],
    resourceBonus: { food: 3, gold: 1 },
    color: '#7cb342',
    movementModifier: 0.9,
    defenseModifier: -0.05,
  },
  savanna: {
    id: 'savanna',
    name: 'Savanna',
    nameRu: 'Саванна',
    elevationRange: [0.05, 0.3],
    moistureRange: [0.2, 0.5],
    temperatureRange: [0.7, 1.0],
    primaryTerrain: 'plains',
    secondaryTerrains: ['desert', 'forest'],
    resourceBonus: { food: 2, gold: 1 },
    color: '#c0a83e',
    movementModifier: 0.95,
    defenseModifier: -0.05,
  },
  tundra: {
    id: 'tundra',
    name: 'Tundra',
    nameRu: 'Тундра',
    elevationRange: [0.15, 0.5],
    moistureRange: [0.2, 0.5],
    temperatureRange: [0.0, 0.2],
    primaryTerrain: 'plains',
    secondaryTerrains: ['hills', 'swamp'],
    resourceBonus: { stone: 1, iron: 1 },
    color: '#9e9e9e',
    movementModifier: 1.2,
    defenseModifier: 0.0,
  },
  desert_hot: {
    id: 'desert_hot',
    name: 'Hot Desert',
    nameRu: 'Жаркая пустыня',
    elevationRange: [0.0, 0.25],
    moistureRange: [0.0, 0.2],
    temperatureRange: [0.7, 1.0],
    primaryTerrain: 'desert',
    secondaryTerrains: ['hills', 'plains'],
    resourceBonus: { gold: 2, stone: 1 },
    color: '#e8c44a',
    movementModifier: 1.3,
    defenseModifier: -0.1,
  },
  desert_cold: {
    id: 'desert_cold',
    name: 'Cold Desert',
    nameRu: 'Холодная пустыня',
    elevationRange: [0.3, 0.6],
    moistureRange: [0.0, 0.2],
    temperatureRange: [0.0, 0.3],
    primaryTerrain: 'desert',
    secondaryTerrains: ['hills', 'mountain'],
    resourceBonus: { stone: 2, iron: 1 },
    color: '#b0a89a',
    movementModifier: 1.3,
    defenseModifier: -0.05,
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal',
    nameRu: 'Побережье',
    elevationRange: [0.0, 0.15],
    moistureRange: [0.5, 1.0],
    temperatureRange: [0.3, 0.8],
    primaryTerrain: 'plains',
    secondaryTerrains: ['water', 'swamp', 'forest'],
    resourceBonus: { food: 2, gold: 2 },
    color: '#4fc3f7',
    movementModifier: 1.0,
    defenseModifier: 0.0,
  },
  wetland: {
    id: 'wetland',
    name: 'Wetland',
    nameRu: 'Влажные земли',
    elevationRange: [0.0, 0.15],
    moistureRange: [0.7, 1.0],
    temperatureRange: [0.3, 0.7],
    primaryTerrain: 'swamp',
    secondaryTerrains: ['forest', 'water', 'plains'],
    resourceBonus: { food: 1, science: 2 },
    color: '#4a6741',
    movementModifier: 1.6,
    defenseModifier: 0.1,
  },
  mountain_alpine: {
    id: 'mountain_alpine',
    name: 'Alpine Mountains',
    nameRu: 'Альпийские горы',
    elevationRange: [0.6, 1.0],
    moistureRange: [0.1, 0.7],
    temperatureRange: [0.0, 0.4],
    primaryTerrain: 'mountain',
    secondaryTerrains: ['hills', 'ruins'],
    resourceBonus: { stone: 3, iron: 2, science: 1 },
    color: '#78909c',
    movementModifier: 1.8,
    defenseModifier: 0.3,
  },
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic',
    nameRu: 'Вулканическая область',
    elevationRange: [0.5, 1.0],
    moistureRange: [0.0, 0.3],
    temperatureRange: [0.6, 1.0],
    primaryTerrain: 'mountain',
    secondaryTerrains: ['desert', 'ruins', 'hills'],
    resourceBonus: { iron: 3, mana: 2, stone: 2 },
    color: '#c62828',
    movementModifier: 2.0,
    defenseModifier: 0.25,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a biome definition by its ID. Throws if not found. */
export function getBiomeById(id: BiomeId): BiomeDefinition {
  const b = BIOMES[id];
  if (!b) throw new Error(`Unknown biome id: ${id}`);
  return b as BiomeDefinition;
}

/** All biome IDs in definition order. */
export const BIOME_IDS: BiomeId[] = Object.keys(BIOMES) as BiomeId[];

/**
 * Determine the best biome for given environmental parameters.
 * Uses a Whittaker-style approach: finds the biome whose ranges
 * best contain the given (elevation, moisture, temperature) point.
 * Falls back to the biome with the smallest total distance to the
 * center of its ranges if no perfect match is found.
 */
export function determineBiome(
  elevation: number,
  moisture: number,
  temperature: number,
): BiomeId {
  // First pass: find biomes where all three parameters fall within range
  const exactMatches = BIOME_IDS.filter((id) => {
    const b = BIOMES[id];
    return (
      elevation >= b.elevationRange[0] &&
      elevation <= b.elevationRange[1] &&
      moisture >= b.moistureRange[0] &&
      moisture <= b.moistureRange[1] &&
      temperature >= b.temperatureRange[0] &&
      temperature <= b.temperatureRange[1]
    );
  });

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    // Multiple matches — pick the one whose center is closest
    return pickClosest(exactMatches, elevation, moisture, temperature);
  }

  // No exact match — fall back to the closest biome by normalized distance
  return pickClosest(BIOME_IDS, elevation, moisture, temperature);
}

/**
 * Pick the biome from the given list whose normalized center point
 * is closest to the provided (elevation, moisture, temperature).
 */
function pickClosest(
  candidates: BiomeId[],
  elevation: number,
  moisture: number,
  temperature: number,
): BiomeId {
  let bestId = candidates[0];
  let bestDist = Infinity;

  for (const id of candidates) {
    const b = BIOMES[id];
    const ce = (b.elevationRange[0] + b.elevationRange[1]) / 2;
    const cm = (b.moistureRange[0] + b.moistureRange[1]) / 2;
    const ct = (b.temperatureRange[0] + b.temperatureRange[1]) / 2;

    const dist = Math.sqrt(
      (elevation - ce) ** 2 + (moisture - cm) ** 2 + (temperature - ct) ** 2,
    );

    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }

  return bestId;
}

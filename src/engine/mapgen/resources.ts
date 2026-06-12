/**
 * Resource placement for "Realms of War" map generation.
 *
 * Places resources on the map based on terrain type using weighted
 * random selection. Strategic resources (iron, mana) are rare;
 * bonus resources (wheat/cattle → food, gold) are common.
 *
 * Resource numeric IDs (1-indexed, 0 = none):
 *   0 = none
 *   1 = gold      2 = food      3 = wood      4 = stone
 *   5 = iron      6 = mana      7 = progress  8 = science
 *
 * These match RESOURCE_IDS from data/resources.ts offset by 1.
 */

import { GameRng } from '@/engine/core/GameRng';
import { toIndex } from '@/engine/hex/mapStorage';
import { TERRAIN_ID } from './biomes';

// ─── Resource ID Constants ────────────────────────────────────────────────────

/** Numeric resource IDs (0 = none, 1+ match RESOURCE_IDS order). */
export const RESOURCE_ID = {
  NONE: 0,
  GOLD: 1,
  FOOD: 2,
  WOOD: 3,
  STONE: 4,
  IRON: 5,
  MANA: 6,
  PROGRESS: 7,
  SCIENCE: 8,
} as const;

/** String resource IDs indexed by numeric ID (0 = none). */
export const RESOURCE_ID_STR: readonly string[] = [
  '',          // 0 = none
  'gold',      // 1
  'food',      // 2
  'wood',      // 3
  'stone',     // 4
  'iron',      // 5
  'mana',      // 6
  'progress',  // 7
  'science',   // 8
];

// ─── Terrain → Resource Mapping ───────────────────────────────────────────────

/**
 * Resource placement entry: resource ID + weight for weighted random selection.
 */
interface ResourceWeight {
  id: number;
  weight: number;
}

/**
 * Defines which resources can appear on each terrain type and their weights.
 *
 * Weight interpretation:
 *   - Higher weight = more likely to appear
 *   - Strategic resources (iron, mana) have low weights
 *   - Bonus resources (food, gold) have higher weights
 *   - Some terrains have "themed" resources (wood in forests, stone in hills)
 */
const TERRAIN_RESOURCES: Record<number, ResourceWeight[]> = {
  [TERRAIN_ID.PLAINS]: [
    { id: RESOURCE_ID.FOOD, weight: 8 },     // Wheat / cattle
    { id: RESOURCE_ID.GOLD, weight: 4 },     // Trade goods
    { id: RESOURCE_ID.IRON, weight: 1 },     // Rare iron deposit
    { id: RESOURCE_ID.PROGRESS, weight: 2 }, // Artifacts
  ],
  [TERRAIN_ID.FOREST]: [
    { id: RESOURCE_ID.WOOD, weight: 10 },    // Abundant timber
    { id: RESOURCE_ID.FOOD, weight: 4 },     // Game / berries
    { id: RESOURCE_ID.MANA, weight: 2 },     // Enchanted groves
    { id: RESOURCE_ID.SCIENCE, weight: 2 },  // Ancient trees
  ],
  [TERRAIN_ID.MOUNTAIN]: [
    { id: RESOURCE_ID.STONE, weight: 8 },    // Quarry
    { id: RESOURCE_ID.IRON, weight: 5 },     // Iron veins
    { id: RESOURCE_ID.MANA, weight: 3 },     // Crystal caverns
    { id: RESOURCE_ID.GOLD, weight: 4 },     // Gold deposits
  ],
  [TERRAIN_ID.WATER]: [
    { id: RESOURCE_ID.FOOD, weight: 6 },     // Fish
    { id: RESOURCE_ID.GOLD, weight: 2 },     // Pearls / trade routes
  ],
  [TERRAIN_ID.DESERT]: [
    { id: RESOURCE_ID.GOLD, weight: 6 },     // Spice / trade
    { id: RESOURCE_ID.IRON, weight: 2 },     // Exposed ore
    { id: RESOURCE_ID.MANA, weight: 3 },     // Desert crystals
    { id: RESOURCE_ID.SCIENCE, weight: 2 },  // Ancient scrolls
  ],
  [TERRAIN_ID.SWAMP]: [
    { id: RESOURCE_ID.FOOD, weight: 4 },     // Edible plants
    { id: RESOURCE_ID.MANA, weight: 6 },     // Swamp magic
    { id: RESOURCE_ID.SCIENCE, weight: 4 },  // Lost knowledge
    { id: RESOURCE_ID.PROGRESS, weight: 2 }, // Rare herbs
  ],
  [TERRAIN_ID.HILLS]: [
    { id: RESOURCE_ID.STONE, weight: 6 },    // Hillside quarry
    { id: RESOURCE_ID.IRON, weight: 4 },     // Hill iron
    { id: RESOURCE_ID.GOLD, weight: 3 },     // Mining
    { id: RESOURCE_ID.FOOD, weight: 3 },     // Hill pastures
    { id: RESOURCE_ID.MANA, weight: 2 },     // Ley lines
  ],
  [TERRAIN_ID.RUINS]: [
    { id: RESOURCE_ID.SCIENCE, weight: 8 },  // Ancient knowledge
    { id: RESOURCE_ID.PROGRESS, weight: 6 }, // Lost technology
    { id: RESOURCE_ID.MANA, weight: 5 },     // Magical residue
    { id: RESOURCE_ID.GOLD, weight: 4 },     // Buried treasure
    { id: RESOURCE_ID.IRON, weight: 2 },     // Salvaged metal
  ],
};

// ─── Placement Configuration ──────────────────────────────────────────────────

/**
 * Chance that a resource will be placed on a given hex of the specified
 * terrain type. These values produce a resource density that feels
 * natural for a 4X strategy game.
 */
const TERRAIN_RESOURCE_CHANCE: Record<number, number> = {
  [TERRAIN_ID.PLAINS]: 0.30,
  [TERRAIN_ID.FOREST]: 0.25,
  [TERRAIN_ID.MOUNTAIN]: 0.40,
  [TERRAIN_ID.WATER]: 0.15,
  [TERRAIN_ID.DESERT]: 0.20,
  [TERRAIN_ID.SWAMP]: 0.25,
  [TERRAIN_ID.HILLS]: 0.35,
  [TERRAIN_ID.RUINS]: 0.60,
};

// ─── Resource Placement ───────────────────────────────────────────────────────

/**
 * Place resources on the map based on terrain type.
 *
 * Each hex has a terrain-dependent chance of containing a resource.
 * If a resource is placed, it's selected from the terrain's weighted
 * resource list using the deterministic RNG.
 *
 * Strategic resources (iron, mana) are capped at a maximum count
 * per map to maintain scarcity.
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param terrainIds - Uint8Array of terrain type IDs
 * @param rng - Deterministic RNG for weighted selection
 * @returns Int16Array of resource IDs per hex (0 = no resource)
 */
export function placeResources(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  rng: GameRng,
): Int16Array {
  const size = width * height;
  const resourceIds = new Int16Array(size);

  // Track strategic resource counts for capping
  const strategicCounts: Record<number, number> = {
    [RESOURCE_ID.IRON]: 0,
    [RESOURCE_ID.MANA]: 0,
  };

  // Maximum strategic resources per map (scales with map size)
  const maxStrategicPerType = Math.max(3, Math.floor(size * 0.015));

  // Shuffle the hex processing order for more natural distribution
  const indices: number[] = [];
  for (let i = 0; i < size; i++) {
    indices.push(i);
  }
  rng.shuffle(indices);

  for (const idx of indices) {
    const terrain = terrainIds[idx];
    const chance = TERRAIN_RESOURCE_CHANCE[terrain] ?? 0;

    // Roll for resource presence
    if (rng.next() >= chance) {
      continue;
    }

    // Get available resources for this terrain
    const available = TERRAIN_RESOURCES[terrain];
    if (!available || available.length === 0) {
      continue;
    }

    // Filter out strategic resources that have hit their cap
    const filtered = available.filter(rw => {
      if (rw.id in strategicCounts) {
        return strategicCounts[rw.id] < maxStrategicPerType;
      }
      return true;
    });

    if (filtered.length === 0) {
      continue;
    }

    // Weighted random selection
    const resourceId = rng.weighted(
      filtered.map(rw => rw.id),
      filtered.map(rw => rw.weight),
    );

    if (resourceId !== undefined) {
      resourceIds[idx] = resourceId;

      // Track strategic resource counts
      if (resourceId in strategicCounts) {
        strategicCounts[resourceId]++;
      }
    }
  }

  return resourceIds;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Check if a resource ID is a strategic (rare) resource.
 *
 * @param resourceId - Numeric resource ID
 * @returns True if the resource is strategic
 */
export function isStrategicResource(resourceId: number): boolean {
  return resourceId === RESOURCE_ID.IRON || resourceId === RESOURCE_ID.MANA;
}

/**
 * Get the string ID for a numeric resource ID.
 *
 * @param id - Numeric resource ID
 * @returns String resource ID, or null if none
 */
export function resourceIdToString(id: number): string | null {
  if (id <= 0 || id >= RESOURCE_ID_STR.length) return null;
  return RESOURCE_ID_STR[id];
}

// ============================================================================
// Terrain Type Definitions — Realms of War
// ============================================================================

/** Resource yield keyed by resource id; absent keys mean zero yield. */
export type ResourceYield = Partial<Record<string, number>>;

/** String literal union for all terrain IDs */
export type TerrainTypeId =
  | 'plains'
  | 'forest'
  | 'mountain'
  | 'water'
  | 'desert'
  | 'swamp'
  | 'hills'
  | 'ruins';

/** Full terrain type definition */
export type TerrainType = {
  id: TerrainTypeId;
  name: string;
  nameRu: string;
  color: string; // hex color for rendering
  elevationBase: number;
  visualY: number;
  combatLevel: number; // -1, 0, 1, 2
  movementCost: number; // 0 = blocked
  defenseModifier: number; // as decimal: 0.20 = +20%
  yields: ResourceYield;
  decorationCount: { min: number; max: number };
  walkable: boolean;
};

// ---------------------------------------------------------------------------
// Terrain data
// ---------------------------------------------------------------------------
export const TERRAIN_TYPES: Record<TerrainTypeId, TerrainType> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    nameRu: 'Равнина',
    color: '#79a956',
    elevationBase: 0,
    visualY: 0,
    combatLevel: 0,
    movementCost: 1,
    defenseModifier: 0,
    yields: { food: 2, gold: 1 },
    decorationCount: { min: 4, max: 9 },
    walkable: true,
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    nameRu: 'Лес',
    color: '#2d6841',
    elevationBase: 5,
    visualY: 0.05,
    combatLevel: 0,
    movementCost: 2,
    defenseModifier: 0.2,
    yields: { food: 1, wood: 2 },
    decorationCount: { min: 5, max: 11 },
    walkable: true,
  },
  mountain: {
    id: 'mountain',
    name: 'Mountain',
    nameRu: 'Гора',
    color: '#838a92',
    elevationBase: 62,
    visualY: 0.62,
    combatLevel: 2,
    movementCost: 0, // blocked
    defenseModifier: 0.35,
    yields: { stone: 2, science: 1 },
    decorationCount: { min: 3, max: 7 },
    walkable: false,
  },
  water: {
    id: 'water',
    name: 'Water',
    nameRu: 'Вода',
    color: '#26779d',
    elevationBase: -20,
    visualY: -0.18,
    combatLevel: -1,
    movementCost: 0, // blocked
    defenseModifier: -0.1,
    yields: { food: 1 },
    decorationCount: { min: 0, max: 0 },
    walkable: false,
  },
  desert: {
    id: 'desert',
    name: 'Desert',
    nameRu: 'Пустыня',
    color: '#c9a45d',
    elevationBase: 2,
    visualY: 0.02,
    combatLevel: 0,
    movementCost: 2,
    defenseModifier: -0.1,
    yields: { gold: 1 },
    decorationCount: { min: 2, max: 5 },
    walkable: true,
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    nameRu: 'Болото',
    color: '#4d6246',
    elevationBase: -8,
    visualY: -0.06,
    combatLevel: 0,
    movementCost: 3,
    defenseModifier: 0.1,
    yields: { food: 1, science: 1 },
    decorationCount: { min: 4, max: 8 },
    walkable: true,
  },
  hills: {
    id: 'hills',
    name: 'Hills',
    nameRu: 'Холмы',
    color: '#8a9155',
    elevationBase: 24,
    visualY: 0.24,
    combatLevel: 1,
    movementCost: 2,
    defenseModifier: 0.25,
    yields: { stone: 1, gold: 1 },
    decorationCount: { min: 3, max: 7 },
    walkable: true,
  },
  ruins: {
    id: 'ruins',
    name: 'Ruins',
    nameRu: 'Руины',
    color: '#80776b',
    elevationBase: 8,
    visualY: 0.08,
    combatLevel: 0,
    movementCost: 1,
    defenseModifier: 0.15,
    yields: { science: 1, progress: 1 },
    decorationCount: { min: 4, max: 10 },
    walkable: true,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a terrain definition by its ID. Throws if not found. */
export function getTerrainById(id: TerrainTypeId): TerrainType {
  const t = TERRAIN_TYPES[id];
  if (!t) throw new Error(`Unknown terrain id: ${id}`);
  return t as TerrainType; // cast away readonly for ergonomics
}

/** All terrain IDs in a stable order. */
export const TERRAIN_IDS: TerrainTypeId[] = Object.keys(
  TERRAIN_TYPES
) as TerrainTypeId[];

// ---------------------------------------------------------------------------
// Derived lookup maps (used by 3-D rendering components)
// ---------------------------------------------------------------------------

/** Hex color string per terrain type, for 3-D mesh materials. */
export const TERRAIN_COLORS: Record<TerrainTypeId, string> = Object.fromEntries(
  TERRAIN_IDS.map((id) => [id, TERRAIN_TYPES[id].color]),
) as Record<TerrainTypeId, string>;

/** Elevation offset per terrain type, for 3-D mesh Y positioning. */
export const TERRAIN_ELEVATION: Record<TerrainTypeId, number> = Object.fromEntries(
  TERRAIN_IDS.map((id) => [id, TERRAIN_TYPES[id].visualY]),
) as Record<TerrainTypeId, number>;

// ============================================================================
// Resource Definitions — Realms of War
// ============================================================================

/** String literal union for all resource IDs */
export type ResourceId =
  | 'gold'
  | 'food'
  | 'wood'
  | 'stone'
  | 'iron'
  | 'mana'
  | 'progress'
  | 'science';

/** Full resource definition */
export type ResourceType = {
  id: ResourceId;
  name: string;
  nameRu: string;
  isGlobal: boolean; // true = empire-wide pool (not per-city)
  isStrategic: boolean; // true = rare strategic resource
  baseBuyPrice: number; // cost to purchase 1 unit on the market
  baseSellPrice: number; // revenue from selling 1 unit on the market
  iconColor: string; // placeholder hex color used before proper icons
};

// ---------------------------------------------------------------------------
// Resource data
// ---------------------------------------------------------------------------
export const RESOURCES: Record<ResourceId, ResourceType> = {
  gold: {
    id: 'gold',
    name: 'Gold',
    nameRu: 'Золото',
    isGlobal: true,
    isStrategic: false,
    baseBuyPrice: 1,
    baseSellPrice: 1,
    iconColor: '#ffd700',
  },
  food: {
    id: 'food',
    name: 'Food',
    nameRu: 'Еда',
    isGlobal: false,
    isStrategic: false,
    baseBuyPrice: 2,
    baseSellPrice: 1,
    iconColor: '#e87d3e',
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    nameRu: 'Дерево',
    isGlobal: false,
    isStrategic: false,
    baseBuyPrice: 3,
    baseSellPrice: 1,
    iconColor: '#8b5e3c',
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    nameRu: 'Камень',
    isGlobal: false,
    isStrategic: false,
    baseBuyPrice: 3,
    baseSellPrice: 1,
    iconColor: '#a0a0a0',
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    nameRu: 'Железо',
    isGlobal: true,
    isStrategic: true,
    baseBuyPrice: 8,
    baseSellPrice: 4,
    iconColor: '#6e7b8b',
  },
  mana: {
    id: 'mana',
    name: 'Mana',
    nameRu: 'Мана',
    isGlobal: true,
    isStrategic: true,
    baseBuyPrice: 10,
    baseSellPrice: 5,
    iconColor: '#7b68ee',
  },
  progress: {
    id: 'progress',
    name: 'Progress',
    nameRu: 'Прогресс',
    isGlobal: false,
    isStrategic: false,
    baseBuyPrice: 6,
    baseSellPrice: 2,
    iconColor: '#4caf50',
  },
  science: {
    id: 'science',
    name: 'Science',
    nameRu: 'Наука',
    isGlobal: true,
    isStrategic: false,
    baseBuyPrice: 5,
    baseSellPrice: 2,
    iconColor: '#42a5f5',
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a resource definition by its ID. Throws if not found. */
export function getResourceById(id: ResourceId): ResourceType {
  const r = RESOURCES[id];
  if (!r) throw new Error(`Unknown resource id: ${id}`);
  return r as ResourceType;
}

/** All resource IDs in a stable order. */
export const RESOURCE_IDS: ResourceId[] = Object.keys(RESOURCES) as ResourceId[];

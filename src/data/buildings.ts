// ============================================================================
// Building Definitions — Realms of War
// ============================================================================

import type { ResourceYield } from './terrain';

/** String literal union for all building IDs */
export type BuildingId =
  // Standard buildings (20)
  | 'city_center'
  | 'castle'
  | 'barracks'
  | 'archery_range'
  | 'library'
  | 'granary'
  | 'market'
  | 'workshop'
  | 'blacksmith'
  | 'mage_tower'
  | 'walls'
  | 'watchtower'
  | 'temple'
  | 'harbor'
  | 'university'
  | 'bank'
  | 'guild_hall'
  | 'siege_yard'
  | 'alchemist_lab'
  | 'astral_observatory'
  // Wonders (4)
  | 'wonder_sun_obelisk'
  | 'wonder_world_tree'
  | 'wonder_astral_gate'
  | 'wonder_great_foundry';

/** Describes a single gameplay effect a building provides. */
export type BuildingEffect = {
  type: string; // e.g. 'yield_bonus', 'unit_train', 'defense_bonus', 'vision', etc.
  target?: string; // what the effect applies to (resource id, unit id, etc.)
  value?: number; // magnitude of the effect
  description: string;
};

/** Full building definition */
export type BuildingType = {
  id: BuildingId;
  name: string;
  nameRu: string;
  cost: ResourceYield;
  upkeep: ResourceYield;
  prerequisite: string | null; // tech id or building id required; null = available from start
  effects: BuildingEffect[];
  hexes: number; // how many hexes the building occupies in the city
  isWonder: boolean;
};

// ---------------------------------------------------------------------------
// Building data
// ---------------------------------------------------------------------------
export const BUILDINGS: Record<BuildingId, BuildingType> = {
  // ===== Standard Buildings =====
  city_center: {
    id: 'city_center',
    name: 'City Center',
    nameRu: 'Центр города',
    cost: {},
    upkeep: {},
    prerequisite: null,
    effects: [
      { type: 'yield_bonus', target: 'gold', value: 2, description: '+2 gold per turn' },
      { type: 'yield_bonus', target: 'food', value: 1, description: '+1 food per turn' },
      { type: 'city_expansion', value: 1, description: 'Controls surrounding hexes' },
    ],
    hexes: 1,
    isWonder: false,
  },
  castle: {
    id: 'castle',
    name: 'Castle',
    nameRu: 'Замок',
    cost: { stone: 30, gold: 60 },
    upkeep: { gold: 3 },
    prerequisite: 'fortification',
    effects: [
      { type: 'defense_bonus', value: 0.25, description: '+25% city defense' },
      { type: 'vision', value: 2, description: '+2 vision radius' },
      { type: 'yield_bonus', target: 'gold', value: 3, description: '+3 gold per turn' },
    ],
    hexes: 1,
    isWonder: false,
  },
  barracks: {
    id: 'barracks',
    name: 'Barracks',
    nameRu: 'Казармы',
    cost: { wood: 15, gold: 25 },
    upkeep: { gold: 2 },
    prerequisite: null,
    effects: [
      { type: 'unit_train', target: 'melee', description: 'Train melee infantry units' },
      { type: 'unit_xp_bonus', value: 0.15, description: '+15% XP for trained units' },
    ],
    hexes: 1,
    isWonder: false,
  },
  archery_range: {
    id: 'archery_range',
    name: 'Archery Range',
    nameRu: 'Стрельбище',
    cost: { wood: 20, gold: 30 },
    upkeep: { gold: 2 },
    prerequisite: 'archery',
    effects: [
      { type: 'unit_train', target: 'ranged', description: 'Train ranged units' },
      { type: 'unit_xp_bonus', value: 0.1, description: '+10% XP for ranged units' },
    ],
    hexes: 1,
    isWonder: false,
  },
  library: {
    id: 'library',
    name: 'Library',
    nameRu: 'Библиотека',
    cost: { wood: 10, gold: 20 },
    upkeep: { gold: 1 },
    prerequisite: 'writing',
    effects: [
      { type: 'yield_bonus', target: 'science', value: 3, description: '+3 science per turn' },
    ],
    hexes: 1,
    isWonder: false,
  },
  granary: {
    id: 'granary',
    name: 'Granary',
    nameRu: 'Амбар',
    cost: { wood: 15, gold: 15 },
    upkeep: {},
    prerequisite: null,
    effects: [
      { type: 'yield_bonus', target: 'food', value: 3, description: '+3 food per turn' },
      { type: 'storage_bonus', target: 'food', value: 20, description: '+20 food storage' },
    ],
    hexes: 1,
    isWonder: false,
  },
  market: {
    id: 'market',
    name: 'Market',
    nameRu: 'Рынок',
    cost: { wood: 10, gold: 25 },
    upkeep: { gold: 1 },
    prerequisite: 'trade',
    effects: [
      { type: 'yield_bonus', target: 'gold', value: 4, description: '+4 gold per turn' },
      { type: 'trade_route', description: 'Enables trade routes' },
    ],
    hexes: 1,
    isWonder: false,
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    nameRu: 'Мастерская',
    cost: { wood: 15, stone: 10, gold: 20 },
    upkeep: { gold: 1 },
    prerequisite: 'craftsmanship',
    effects: [
      { type: 'yield_bonus', target: 'progress', value: 3, description: '+3 progress per turn' },
      { type: 'build_speed', value: 0.1, description: '+10% building speed' },
    ],
    hexes: 1,
    isWonder: false,
  },
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    nameRu: 'Кузница',
    cost: { stone: 15, gold: 30 },
    upkeep: { gold: 2, iron: 1 },
    prerequisite: 'iron_working',
    effects: [
      { type: 'yield_bonus', target: 'iron', value: 2, description: '+2 iron per turn' },
      { type: 'unit_upgrade', target: 'melee', value: 1, description: '+1 ATK to melee units' },
    ],
    hexes: 1,
    isWonder: false,
  },
  mage_tower: {
    id: 'mage_tower',
    name: 'Mage Tower',
    nameRu: 'Башня мага',
    cost: { stone: 20, gold: 50, mana: 10 },
    upkeep: { gold: 3, mana: 2 },
    prerequisite: 'arcane_studies',
    effects: [
      { type: 'unit_train', target: 'mage', description: 'Train mage units' },
      { type: 'yield_bonus', target: 'mana', value: 2, description: '+2 mana per turn' },
    ],
    hexes: 1,
    isWonder: false,
  },
  walls: {
    id: 'walls',
    name: 'Walls',
    nameRu: 'Стены',
    cost: { stone: 25, gold: 20 },
    upkeep: { gold: 1 },
    prerequisite: 'masonry',
    effects: [
      { type: 'defense_bonus', value: 0.2, description: '+20% city defense' },
      { type: 'hp_bonus', target: 'garrison', value: 20, description: '+20 HP to garrison' },
    ],
    hexes: 1,
    isWonder: false,
  },
  watchtower: {
    id: 'watchtower',
    name: 'Watchtower',
    nameRu: 'Сторожевая башня',
    cost: { wood: 10, stone: 10, gold: 15 },
    upkeep: { gold: 1 },
    prerequisite: null,
    effects: [
      { type: 'vision', value: 3, description: '+3 vision radius' },
      { type: 'alert', description: 'Warns of approaching enemies' },
    ],
    hexes: 1,
    isWonder: false,
  },
  temple: {
    id: 'temple',
    name: 'Temple',
    nameRu: 'Храм',
    cost: { stone: 20, gold: 35 },
    upkeep: { gold: 2 },
    prerequisite: 'theology',
    effects: [
      { type: 'yield_bonus', target: 'mana', value: 3, description: '+3 mana per turn' },
      { type: 'morale_bonus', value: 0.1, description: '+10% city morale' },
    ],
    hexes: 1,
    isWonder: false,
  },
  harbor: {
    id: 'harbor',
    name: 'Harbor',
    nameRu: 'Гавань',
    cost: { wood: 20, gold: 35 },
    upkeep: { gold: 2 },
    prerequisite: 'sailing',
    effects: [
      { type: 'yield_bonus', target: 'food', value: 2, description: '+2 food per turn' },
      { type: 'yield_bonus', target: 'gold', value: 3, description: '+3 gold per turn' },
      { type: 'naval', description: 'Enables naval units and trade' },
    ],
    hexes: 1,
    isWonder: false,
  },
  university: {
    id: 'university',
    name: 'University',
    nameRu: 'Университет',
    cost: { stone: 25, gold: 50 },
    upkeep: { gold: 4 },
    prerequisite: 'scholarship',
    effects: [
      { type: 'yield_bonus', target: 'science', value: 6, description: '+6 science per turn' },
      { type: 'tech_discount', value: 0.1, description: '-10% technology cost' },
    ],
    hexes: 1,
    isWonder: false,
  },
  bank: {
    id: 'bank',
    name: 'Bank',
    nameRu: 'Банк',
    cost: { stone: 20, gold: 60 },
    upkeep: { gold: 3 },
    prerequisite: 'banking',
    effects: [
      { type: 'yield_bonus', target: 'gold', value: 8, description: '+8 gold per turn' },
      { type: 'interest', value: 0.05, description: '+5% gold interest per turn' },
    ],
    hexes: 1,
    isWonder: false,
  },
  guild_hall: {
    id: 'guild_hall',
    name: 'Guild Hall',
    nameRu: 'Гильдия',
    cost: { wood: 15, stone: 15, gold: 45 },
    upkeep: { gold: 3 },
    prerequisite: 'guilds',
    effects: [
      { type: 'yield_bonus', target: 'gold', value: 5, description: '+5 gold per turn' },
      { type: 'yield_bonus', target: 'progress', value: 2, description: '+2 progress per turn' },
      { type: 'specialist', description: 'Enables specialist citizens' },
    ],
    hexes: 1,
    isWonder: false,
  },
  siege_yard: {
    id: 'siege_yard',
    name: 'Siege Yard',
    nameRu: 'Осадная мастерская',
    cost: { wood: 20, iron: 10, gold: 40 },
    upkeep: { gold: 3 },
    prerequisite: 'siegecraft',
    effects: [
      { type: 'unit_train', target: 'siege', description: 'Train siege units' },
      { type: 'unit_upgrade', target: 'siege', value: 2, description: '+2 ATK to siege units' },
    ],
    hexes: 1,
    isWonder: false,
  },
  alchemist_lab: {
    id: 'alchemist_lab',
    name: 'Alchemist Lab',
    nameRu: 'Лаборатория алхимика',
    cost: { stone: 15, gold: 45, mana: 5 },
    upkeep: { gold: 3, mana: 1 },
    prerequisite: 'alchemy',
    effects: [
      { type: 'yield_bonus', target: 'mana', value: 4, description: '+4 mana per turn' },
      { type: 'yield_bonus', target: 'science', value: 2, description: '+2 science per turn' },
    ],
    hexes: 1,
    isWonder: false,
  },
  astral_observatory: {
    id: 'astral_observatory',
    name: 'Astral Observatory',
    nameRu: 'Астральная обсерватория',
    cost: { stone: 30, gold: 70, mana: 15 },
    upkeep: { gold: 4, mana: 2 },
    prerequisite: 'astral_projection',
    effects: [
      { type: 'yield_bonus', target: 'science', value: 8, description: '+8 science per turn' },
      { type: 'yield_bonus', target: 'mana', value: 3, description: '+3 mana per turn' },
      { type: 'vision', value: 5, description: '+5 vision radius' },
    ],
    hexes: 1,
    isWonder: false,
  },

  // ===== Wonders =====
  wonder_sun_obelisk: {
    id: 'wonder_sun_obelisk',
    name: 'Sun Obelisk',
    nameRu: 'Обелиск Солнца',
    cost: { stone: 50, gold: 150, mana: 30 },
    upkeep: { gold: 5 },
    prerequisite: 'divine_right',
    effects: [
      { type: 'yield_bonus', target: 'gold', value: 15, description: '+15 gold per turn' },
      { type: 'yield_bonus', target: 'mana', value: 8, description: '+8 mana per turn' },
      { type: 'morale_bonus', value: 0.2, description: '+20% morale in all cities' },
      { type: 'unique', description: 'Only one can exist in the world' },
    ],
    hexes: 2,
    isWonder: true,
  },
  wonder_world_tree: {
    id: 'wonder_world_tree',
    name: 'World Tree',
    nameRu: 'Древо Мира',
    cost: { wood: 60, gold: 120, mana: 25 },
    upkeep: { gold: 5 },
    prerequisite: 'druidism',
    effects: [
      { type: 'yield_bonus', target: 'food', value: 12, description: '+12 food per turn' },
      { type: 'yield_bonus', target: 'wood', value: 8, description: '+8 wood per turn' },
      { type: 'heal_aura', value: 10, description: 'Heals friendly units +10 HP/turn in territory' },
      { type: 'unique', description: 'Only one can exist in the world' },
    ],
    hexes: 2,
    isWonder: true,
  },
  wonder_astral_gate: {
    id: 'wonder_astral_gate',
    name: 'Astral Gate',
    nameRu: 'Астральные врата',
    cost: { stone: 40, gold: 200, mana: 50 },
    upkeep: { gold: 8, mana: 5 },
    prerequisite: 'astral_projection',
    effects: [
      { type: 'yield_bonus', target: 'science', value: 15, description: '+15 science per turn' },
      { type: 'yield_bonus', target: 'mana', value: 10, description: '+10 mana per turn' },
      { type: 'teleport', description: 'Allows teleportation between cities' },
      { type: 'unique', description: 'Only one can exist in the world' },
    ],
    hexes: 2,
    isWonder: true,
  },
  wonder_great_foundry: {
    id: 'wonder_great_foundry',
    name: 'Great Foundry',
    nameRu: 'Великая литейная',
    cost: { stone: 50, iron: 30, gold: 160 },
    upkeep: { gold: 6 },
    prerequisite: 'metallurgy',
    effects: [
      { type: 'yield_bonus', target: 'iron', value: 10, description: '+10 iron per turn' },
      { type: 'yield_bonus', target: 'progress', value: 8, description: '+8 progress per turn' },
      { type: 'unit_upgrade', target: 'all', value: 2, description: '+2 ATK to all units' },
      { type: 'unique', description: 'Only one can exist in the world' },
    ],
    hexes: 2,
    isWonder: true,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a building definition by its ID. Throws if not found. */
export function getBuildingById(id: BuildingId): BuildingType {
  const b = BUILDINGS[id];
  if (!b) throw new Error(`Unknown building id: ${id}`);
  return b as BuildingType;
}

/** All standard (non-wonder) building IDs. */
export const STANDARD_BUILDING_IDS: BuildingId[] = (
  Object.keys(BUILDINGS) as BuildingId[]
).filter((id) => !BUILDINGS[id].isWonder);

/** All wonder building IDs. */
export const WONDER_IDS: BuildingId[] = (
  Object.keys(BUILDINGS) as BuildingId[]
).filter((id) => BUILDINGS[id].isWonder);

/** All building IDs in definition order. */
export const BUILDING_IDS: BuildingId[] = Object.keys(BUILDINGS) as BuildingId[];

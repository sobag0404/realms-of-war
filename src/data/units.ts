// ============================================================================
// Unit Type Definitions — Realms of War
// ============================================================================

import type { ResourceYield } from './terrain';

/** String literal union for all unit IDs */
export type UnitTypeId =
  | 'hero'
  | 'settler'
  | 'worker'
  | 'spearman'
  | 'scout'
  | 'archer'
  | 'swordsman'
  | 'knight'
  | 'mage'
  | 'crossbowman'
  | 'catapult'
  | 'paladin'
  | 'goblin'
  | 'goblin_archer'
  | 'wolf'
  | 'bandit'
  | 'cultist';

/** Full unit type definition */
export type UnitType = {
  id: UnitTypeId;
  name: string;
  nameRu: string;
  hp: number;
  atk: number;
  def: number;
  mov: number;
  range: number;
  cost: ResourceYield;
  upkeep: ResourceYield;
  era: string; // era id
  tech: string | null; // required tech id, null = available from start
  hexSize: number; // how many hexes the unit occupies
  abilities: string[];
  isEnemy: boolean; // true = hostile NPC, not player-recruitable
};

// ---------------------------------------------------------------------------
// Unit data
// ---------------------------------------------------------------------------
export const UNIT_TYPES: Record<UnitTypeId, UnitType> = {
  hero: {
    id: 'hero',
    name: 'Hero',
    nameRu: 'Герой',
    hp: 120,
    atk: 14,
    def: 10,
    mov: 3,
    range: 1,
    cost: { gold: 200, mana: 50 },
    upkeep: { gold: 8 },
    era: 'earlyCiv',
    tech: null,
    hexSize: 1,
    abilities: ['leadership', 'heroic_strike', 'inspire'],
    isEnemy: false,
  },
  settler: {
    id: 'settler',
    name: 'Settler',
    nameRu: 'Поселенец',
    hp: 30,
    atk: 0,
    def: 0,
    mov: 2,
    range: 0,
    cost: { gold: 80, food: 40 },
    upkeep: { food: 2 },
    era: 'primitives',
    tech: null,
    hexSize: 1,
    abilities: ['found_city'],
    isEnemy: false,
  },
  worker: {
    id: 'worker',
    name: 'Worker',
    nameRu: 'Рабочий',
    hp: 25,
    atk: 0,
    def: 1,
    mov: 2,
    range: 0,
    cost: { gold: 30, food: 20 },
    upkeep: { food: 1 },
    era: 'primitives',
    tech: null,
    hexSize: 1,
    abilities: ['build_improvement', 'repair', 'clear_terrain'],
    isEnemy: false,
  },
  spearman: {
    id: 'spearman',
    name: 'Spearman',
    nameRu: 'Копейщик',
    hp: 45,
    atk: 8,
    def: 6,
    mov: 2,
    range: 1,
    cost: { gold: 25, wood: 10 },
    upkeep: { gold: 1, food: 1 },
    era: 'primitives',
    tech: null,
    hexSize: 1,
    abilities: ['spear_wall', 'anti_cavalry'],
    isEnemy: false,
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    nameRu: 'Разведчик',
    hp: 30,
    atk: 5,
    def: 2,
    mov: 4,
    range: 1,
    cost: { gold: 20, food: 10 },
    upkeep: { gold: 1 },
    era: 'primitives',
    tech: null,
    hexSize: 1,
    abilities: ['swift', 'vigilance', 'pathfinding'],
    isEnemy: false,
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    nameRu: 'Лучник',
    hp: 35,
    atk: 10,
    def: 3,
    mov: 2,
    range: 3,
    cost: { gold: 30, wood: 15 },
    upkeep: { gold: 1, food: 1 },
    era: 'earlyCiv',
    tech: 'archery',
    hexSize: 1,
    abilities: ['ranged_attack', 'volley'],
    isEnemy: false,
  },
  swordsman: {
    id: 'swordsman',
    name: 'Swordsman',
    nameRu: 'Мечник',
    hp: 55,
    atk: 12,
    def: 8,
    mov: 2,
    range: 1,
    cost: { gold: 45, iron: 5 },
    upkeep: { gold: 2, food: 1 },
    era: 'earlyCiv',
    tech: 'iron_working',
    hexSize: 1,
    abilities: ['shield_bash', 'stand_ground'],
    isEnemy: false,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    nameRu: 'Рыцарь',
    hp: 80,
    atk: 16,
    def: 12,
    mov: 3,
    range: 1,
    cost: { gold: 80, iron: 10 },
    upkeep: { gold: 4, food: 2 },
    era: 'medieval',
    tech: 'chivalry',
    hexSize: 1,
    abilities: ['charge', 'trample', 'heavy_armor'],
    isEnemy: false,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    nameRu: 'Маг',
    hp: 30,
    atk: 18,
    def: 2,
    mov: 2,
    range: 3,
    cost: { gold: 70, mana: 15 },
    upkeep: { gold: 3, mana: 2 },
    era: 'medieval',
    tech: 'arcane_studies',
    hexSize: 1,
    abilities: ['fireball', 'arcane_shield', 'spell_weave'],
    isEnemy: false,
  },
  crossbowman: {
    id: 'crossbowman',
    name: 'Crossbowman',
    nameRu: 'Арбалетчик',
    hp: 40,
    atk: 14,
    def: 4,
    mov: 2,
    range: 3,
    cost: { gold: 50, iron: 5, wood: 10 },
    upkeep: { gold: 2, food: 1 },
    era: 'medieval',
    tech: 'engineering',
    hexSize: 1,
    abilities: ['piercing_shot', 'pavise'],
    isEnemy: false,
  },
  catapult: {
    id: 'catapult',
    name: 'Catapult',
    nameRu: 'Катапульта',
    hp: 40,
    atk: 22,
    def: 1,
    mov: 1,
    range: 4,
    cost: { gold: 60, wood: 25, iron: 5 },
    upkeep: { gold: 3 },
    era: 'medieval',
    tech: 'siegecraft',
    hexSize: 1,
    abilities: ['siege_attack', 'splash_damage', 'set_up'],
    isEnemy: false,
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    nameRu: 'Паладин',
    hp: 100,
    atk: 15,
    def: 14,
    mov: 2,
    range: 1,
    cost: { gold: 120, mana: 20, iron: 10 },
    upkeep: { gold: 5, mana: 2 },
    era: 'renaissance',
    tech: 'divine_right',
    hexSize: 1,
    abilities: ['holy_strike', 'lay_on_hands', 'aura_of_protection'],
    isEnemy: false,
  },
  // ---- Enemy-only units ----
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    nameRu: 'Гоблин',
    hp: 25,
    atk: 6,
    def: 2,
    mov: 3,
    range: 1,
    cost: {},
    upkeep: {},
    era: 'primitives',
    tech: null,
    hexSize: 1,
    abilities: ['swarm', 'loot'],
    isEnemy: true,
  },
  goblin_archer: {
    id: 'goblin_archer',
    name: 'Goblin Archer',
    nameRu: 'Гоблин-лучник',
    hp: 20,
    atk: 8,
    def: 1,
    mov: 2,
    range: 3,
    cost: {},
    upkeep: {},
    era: 'earlyCiv',
    tech: null,
    hexSize: 1,
    abilities: ['ranged_attack', 'hit_and_run'],
    isEnemy: true,
  },
  wolf: {
    id: 'wolf',
    name: 'Wolf',
    nameRu: 'Волк',
    hp: 20,
    atk: 7,
    def: 1,
    mov: 5,
    range: 1,
    cost: {},
    upkeep: {},
    era: 'primitives',
    tech: null,
    hexSize: 1,
    abilities: ['pack_hunt', 'swift', 'pounce'],
    isEnemy: true,
  },
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    nameRu: 'Бандит',
    hp: 35,
    atk: 9,
    def: 4,
    mov: 2,
    range: 1,
    cost: {},
    upkeep: {},
    era: 'earlyCiv',
    tech: null,
    hexSize: 1,
    abilities: ['ambush', 'plunder'],
    isEnemy: true,
  },
  cultist: {
    id: 'cultist',
    name: 'Cultist',
    nameRu: 'Культист',
    hp: 40,
    atk: 12,
    def: 3,
    mov: 2,
    range: 2,
    cost: {},
    upkeep: {},
    era: 'medieval',
    tech: null,
    hexSize: 1,
    abilities: ['dark_ritual', 'corrupt', 'fanaticism'],
    isEnemy: true,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a unit type definition by its ID. Throws if not found. */
export function getUnitTypeById(id: UnitTypeId): UnitType {
  const u = UNIT_TYPES[id];
  if (!u) throw new Error(`Unknown unit type id: ${id}`);
  return u as UnitType;
}

/** All player-recruitable unit IDs. */
export const PLAYER_UNIT_IDS: UnitTypeId[] = (Object.keys(UNIT_TYPES) as UnitTypeId[]).filter(
  (id) => !UNIT_TYPES[id].isEnemy,
);

/** All enemy-only unit IDs. */
export const ENEMY_UNIT_IDS: UnitTypeId[] = (Object.keys(UNIT_TYPES) as UnitTypeId[]).filter(
  (id) => UNIT_TYPES[id].isEnemy,
);

/** All unit IDs in definition order. */
export const UNIT_TYPE_IDS: UnitTypeId[] = Object.keys(UNIT_TYPES) as UnitTypeId[];

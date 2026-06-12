// ============================================================================
// Enemy Type Definitions — Realms of War
// ============================================================================

import type { EraId, ResourceId, TerrainTypeId, AttackType } from '@/engine/core/types';

/** String literal union for all enemy IDs */
export type EnemyTypeId =
  | 'goblin_raider'
  | 'skeleton_warrior'
  | 'wolf_pack'
  | 'bandit_camp'
  | 'dark_mage'
  | 'dragon_whelp'
  | 'undead_knight'
  | 'demon_spawn'
  | 'forest_troll'
  | 'shadow_assassin'
  | 'ancient_guardian'
  | 'rift_horror';

/** Full enemy type definition */
export interface EnemyDefinition {
  id: EnemyTypeId;
  name: string;
  nameRu: string;
  hp: number;
  attack: number;
  defense: number;
  attackType: AttackType;
  range: number;
  /** Movement points per turn */
  movement: number;
  /** XP reward when killed */
  xpReward: number;
  /** Resource drops (partial record) */
  loot: Partial<Record<ResourceId, number>>;
  /** Minimum era for this enemy to spawn */
  minEra: EraId;
  /** Terrain types this enemy can spawn on */
  spawnTerrain: TerrainTypeId[];
  /** Whether this enemy guards ruins */
  isRuinsGuardian: boolean;
  /** Difficulty rating 1-5 */
  difficulty: number;
  /** Special abilities */
  abilities: string[];
  /** Description */
  description: string;
  descriptionRu: string;
}

// ---------------------------------------------------------------------------
// Enemy data
// ---------------------------------------------------------------------------
export const ENEMY_TYPES: Record<EnemyTypeId, EnemyDefinition> = {
  // ===== Easy (difficulty 1) =====
  goblin_raider: {
    id: 'goblin_raider',
    name: 'Goblin Raider',
    nameRu: 'Гоблин-налётчик',
    hp: 30,
    attack: 7,
    defense: 2,
    attackType: 'melee',
    range: 1,
    movement: 3,
    xpReward: 15,
    loot: { gold: 5, food: 3 },
    minEra: 'primitives',
    spawnTerrain: ['plains', 'forest', 'hills', 'ruins'],
    isRuinsGuardian: false,
    difficulty: 1,
    abilities: ['swarm', 'loot'],
    description: 'Sneaky goblins that raid outlying settlements under cover of darkness.',
    descriptionRu: 'Хитрые гоблины, грабящие отдалённые поселения под покровом темноты.',
  },

  wolf_pack: {
    id: 'wolf_pack',
    name: 'Wolf Pack',
    nameRu: 'Стая волков',
    hp: 25,
    attack: 8,
    defense: 1,
    attackType: 'melee',
    range: 1,
    movement: 5,
    xpReward: 12,
    loot: { food: 2 },
    minEra: 'primitives',
    spawnTerrain: ['plains', 'forest', 'hills', 'desert'],
    isRuinsGuardian: false,
    difficulty: 1,
    abilities: ['pack_hunt', 'swift', 'pounce'],
    description: 'Feral wolves that prowl the wilderness in coordinated packs.',
    descriptionRu: 'Дикие волки, бродящие по пустошам организованными стаями.',
  },

  // ===== Easy-Medium (difficulty 2) =====
  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: 'Skeleton Warrior',
    nameRu: 'Скелет-воин',
    hp: 40,
    attack: 9,
    defense: 4,
    attackType: 'melee',
    range: 1,
    movement: 2,
    xpReward: 20,
    loot: { gold: 8, science: 2 },
    minEra: 'earlyCiv',
    spawnTerrain: ['ruins', 'desert', 'swamp'],
    isRuinsGuardian: true,
    difficulty: 2,
    abilities: ['undead_resilience', 'fear_strike'],
    description: 'Undead warriors that rise from ancient battlefields to guard forgotten tombs.',
    descriptionRu: 'Нежить, восставшая с древних полей сражений, чтобы охранять забытые гробницы.',
  },

  bandit_camp: {
    id: 'bandit_camp',
    name: 'Bandit Camp',
    nameRu: 'Лагерь бандитов',
    hp: 45,
    attack: 10,
    defense: 5,
    attackType: 'melee',
    range: 1,
    movement: 2,
    xpReward: 25,
    loot: { gold: 15, food: 5 },
    minEra: 'earlyCiv',
    spawnTerrain: ['plains', 'forest', 'hills'],
    isRuinsGuardian: false,
    difficulty: 2,
    abilities: ['ambush', 'plunder', 'fortified_camp'],
    description: 'Lawless outlaws who ambush travelers and raid caravans on trade routes.',
    descriptionRu: 'Беспощадные разбойники, устраивающие засады на путников и грабящие караваны.',
  },

  // ===== Medium (difficulty 3) =====
  forest_troll: {
    id: 'forest_troll',
    name: 'Forest Troll',
    nameRu: 'Лесной тролль',
    hp: 65,
    attack: 13,
    defense: 6,
    attackType: 'melee',
    range: 1,
    movement: 2,
    xpReward: 35,
    loot: { gold: 10, wood: 8, food: 5 },
    minEra: 'medieval',
    spawnTerrain: ['forest', 'swamp', 'hills'],
    isRuinsGuardian: false,
    difficulty: 3,
    abilities: ['regeneration', 'smash', 'thick_hide'],
    description: 'Massive trolls that regenerate wounds and terrorize forest settlements.',
    descriptionRu: 'Огромные тролли, способные регенерировать раны и терроризировать лесные поселения.',
  },

  dark_mage: {
    id: 'dark_mage',
    name: 'Dark Mage',
    nameRu: 'Тёмный маг',
    hp: 35,
    attack: 16,
    defense: 3,
    attackType: 'magic',
    range: 3,
    movement: 2,
    xpReward: 40,
    loot: { mana: 10, gold: 15, science: 5 },
    minEra: 'medieval',
    spawnTerrain: ['ruins', 'swamp', 'mountain'],
    isRuinsGuardian: true,
    difficulty: 3,
    abilities: ['shadow_bolt', 'curse', 'arcane_shield'],
    description: 'Corrupted sorcerers who wield forbidden magic and guard ancient secrets.',
    descriptionRu: 'Развращённые колдуны, владеющие запретной магией и охраняющие древние тайны.',
  },

  // ===== Hard (difficulty 4) =====
  shadow_assassin: {
    id: 'shadow_assassin',
    name: 'Shadow Assassin',
    nameRu: 'Теневой убийца',
    hp: 50,
    attack: 20,
    defense: 4,
    attackType: 'melee',
    range: 1,
    movement: 4,
    xpReward: 50,
    loot: { gold: 20, mana: 5 },
    minEra: 'renaissance',
    spawnTerrain: ['forest', 'ruins', 'hills', 'swamp'],
    isRuinsGuardian: false,
    difficulty: 4,
    abilities: ['stealth', 'backstab', 'shadow_step', 'evasion'],
    description: 'Elite killers that emerge from the shadows to eliminate high-value targets.',
    descriptionRu: 'Элитные убийцы, появляющиеся из теней для устранения важных целей.',
  },

  dragon_whelp: {
    id: 'dragon_whelp',
    name: 'Dragon Whelp',
    nameRu: 'Дракончик',
    hp: 80,
    attack: 18,
    defense: 10,
    attackType: 'ranged',
    range: 3,
    movement: 3,
    xpReward: 55,
    loot: { gold: 30, mana: 8, iron: 5 },
    minEra: 'renaissance',
    spawnTerrain: ['mountain', 'hills', 'ruins'],
    isRuinsGuardian: true,
    difficulty: 4,
    abilities: ['fire_breath', 'wing_buffet', 'scales'],
    description: 'Young dragons that have claimed mountain territories and hoard treasure.',
    descriptionRu: 'Молодые драконы, захватившие горные территории и собравшие сокровища.',
  },

  undead_knight: {
    id: 'undead_knight',
    name: 'Undead Knight',
    nameRu: 'Мёртвый рыцарь',
    hp: 90,
    attack: 17,
    defense: 14,
    attackType: 'melee',
    range: 1,
    movement: 2,
    xpReward: 55,
    loot: { iron: 8, gold: 20, mana: 5 },
    minEra: 'renaissance',
    spawnTerrain: ['ruins', 'swamp', 'plains'],
    isRuinsGuardian: true,
    difficulty: 4,
    abilities: ['death_strike', 'heavy_armor', 'undead_resilience', 'fear_aura'],
    description: 'Fallen knights raised from death, their cursed armor nearly impenetrable.',
    descriptionRu: 'Павшие рыцари, восставшие из мёртвых, их проклятые доспехи почти непробиваемы.',
  },

  // ===== Very Hard (difficulty 5) =====
  demon_spawn: {
    id: 'demon_spawn',
    name: 'Demon Spawn',
    nameRu: 'Порождение демона',
    hp: 70,
    attack: 22,
    defense: 8,
    attackType: 'magic',
    range: 2,
    movement: 3,
    xpReward: 65,
    loot: { mana: 15, gold: 25, iron: 5 },
    minEra: 'renaissance',
    spawnTerrain: ['ruins', 'mountain', 'desert'],
    isRuinsGuardian: true,
    difficulty: 5,
    abilities: ['hellfire', 'corruption', 'demon_resilience', 'summon_lesser'],
    description: 'Fiends from the rift that spread corruption and summon lesser demons.',
    descriptionRu: 'Исчадия из разлома, распространяющие скверну и призывающие младших демонов.',
  },

  ancient_guardian: {
    id: 'ancient_guardian',
    name: 'Ancient Guardian',
    nameRu: 'Древний страж',
    hp: 120,
    attack: 20,
    defense: 18,
    attackType: 'melee',
    range: 1,
    movement: 1,
    xpReward: 80,
    loot: { gold: 50, mana: 20, science: 15, iron: 10 },
    minEra: 'rift',
    spawnTerrain: ['ruins', 'mountain'],
    isRuinsGuardian: true,
    difficulty: 5,
    abilities: ['colossal_blow', 'stone_skin', 'guardian_rage', 'earthquake'],
    description: 'Colossal constructs of ancient civilizations, awakened to defend their creators\' legacy.',
    descriptionRu: 'Колоссальные творения древних цивилизаций, пробуждённые для защиты наследия своих создателей.',
  },

  rift_horror: {
    id: 'rift_horror',
    name: 'Rift Horror',
    nameRu: 'Ужас разлома',
    hp: 100,
    attack: 25,
    defense: 12,
    attackType: 'aoe',
    range: 3,
    movement: 2,
    xpReward: 90,
    loot: { mana: 25, gold: 40, science: 20 },
    minEra: 'rift',
    spawnTerrain: ['ruins', 'swamp', 'desert', 'mountain'],
    isRuinsGuardian: true,
    difficulty: 5,
    abilities: ['void_blast', 'reality_warp', 'mind_shatter', 'regeneration', 'rift_call'],
    description: 'Abominations that seep through dimensional rifts, warping reality around them.',
    descriptionRu: 'Чудовища, сочащиеся сквозь пространственные разломы, искажающие реальность вокруг себя.',
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve an enemy definition by its ID. Throws if not found. */
export function getEnemyById(id: EnemyTypeId): EnemyDefinition {
  const e = ENEMY_TYPES[id];
  if (!e) throw new Error(`Unknown enemy type id: ${id}`);
  return e as EnemyDefinition;
}

/** All enemy IDs in definition order. */
export const ENEMY_IDS: EnemyTypeId[] = Object.keys(
  ENEMY_TYPES,
) as EnemyTypeId[];

/** Get all enemies that are ruins guardians. */
export const RUINS_GUARDIANS: EnemyTypeId[] = ENEMY_IDS.filter(
  (id) => ENEMY_TYPES[id].isRuinsGuardian,
);

/** Get all enemies for a given difficulty level. */
export function getEnemiesByDifficulty(difficulty: number): EnemyDefinition[] {
  return ENEMY_IDS.filter(
    (id) => ENEMY_TYPES[id].difficulty === difficulty,
  ).map((id) => ENEMY_TYPES[id] as EnemyDefinition);
}

/** Get all enemies that can spawn in a given era. */
export function getEnemiesForEra(era: EraId): EnemyDefinition[] {
  const eraOrder: EraId[] = ['primitives', 'earlyCiv', 'medieval', 'renaissance', 'rift'];
  const eraIndex = eraOrder.indexOf(era);
  return ENEMY_IDS.filter((id) => {
    const minIndex = eraOrder.indexOf(ENEMY_TYPES[id].minEra);
    return minIndex <= eraIndex;
  }).map((id) => ENEMY_TYPES[id] as EnemyDefinition);
}

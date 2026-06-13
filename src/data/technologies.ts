// ============================================================================
// Technology Tree Definitions — Realms of War
// ============================================================================

/** String literal union for all technology IDs */
export type TechId =
  // Primitives (6)
  | 'toolmaking'
  | 'hunting'
  | 'agriculture'
  | 'craftsmanship'
  | 'writing'
  | 'mysticism'
  // Early Civilization (6)
  | 'archery'
  | 'bronze_working'
  | 'trade'
  | 'masonry'
  | 'scholarship'
  | 'ritual'
  // Medieval (8)
  | 'iron_working'
  | 'chivalry'
  | 'siegecraft'
  | 'engineering'
  | 'banking'
  | 'theology'
  | 'arcane_studies'
  | 'sailing'
  // Renaissance (7)
  | 'gunpowder'
  | 'fortification'
  | 'guilds'
  | 'divine_right'
  | 'alchemy'
  | 'metallurgy'
  | 'druidism'
  // Rift (10)
  | 'astronomy'
  | 'diplomacy'
  | 'gunpowder_weapons'
  | 'advanced_siege'
  | 'cartography'
  | 'astral_projection'
  | 'rift_mechanics'
  | 'war_machines'
  | 'planar_defense'
  | 'dominion';

/** Describes a single effect a technology provides when researched. */
export type TechEffect = {
  type: string; // e.g. 'unlock_unit', 'unlock_building', 'yield_bonus', 'unlock_ability', etc.
  target?: string; // what the effect applies to
  value?: number; // magnitude
  description: string;
};

/** Branch of the tech tree */
export type TechBranch = 'military' | 'economic' | 'science' | 'mystical';

/** Full technology definition */
export type Technology = {
  id: TechId;
  name: string;
  nameRu: string;
  era: string; // era id
  branch: TechBranch;
  prerequisites: TechId[];
  effects: TechEffect[];
  costMultiplier: number; // multiplied by era baseTechCost
};

// ---------------------------------------------------------------------------
// Technology data
// ---------------------------------------------------------------------------
export const TECHNOLOGIES: Record<TechId, Technology> = {
  // ===== Primitives Era =====
  toolmaking: {
    id: 'toolmaking',
    name: 'Toolmaking',
    nameRu: 'Обработка орудий',
    era: 'primitives',
    branch: 'military',
    prerequisites: [],
    effects: [
      { type: 'unlock_building', target: 'barracks', description: 'Unlocks Barracks' },
      { type: 'yield_bonus', target: 'progress', value: 1, description: '+1 progress per turn' },
    ],
    costMultiplier: 1,
  },
  hunting: {
    id: 'hunting',
    name: 'Hunting',
    nameRu: 'Охота',
    era: 'primitives',
    branch: 'military',
    prerequisites: [],
    effects: [
      { type: 'yield_bonus', target: 'food', value: 1, description: '+1 food per turn' },
      { type: 'combat_bonus', target: 'ranged', value: 1, description: '+1 ATK for ranged units vs beasts' },
    ],
    costMultiplier: 1,
  },
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture',
    nameRu: 'Земледелие',
    era: 'primitives',
    branch: 'economic',
    prerequisites: [],
    effects: [
      { type: 'yield_bonus', target: 'food', value: 2, description: '+2 food per turn' },
      { type: 'unlock_improvement', target: 'farm', description: 'Unlocks Farm improvement' },
    ],
    costMultiplier: 1,
  },
  craftsmanship: {
    id: 'craftsmanship',
    name: 'Craftsmanship',
    nameRu: 'Ремесло',
    era: 'primitives',
    branch: 'economic',
    prerequisites: [],
    effects: [
      { type: 'unlock_building', target: 'workshop', description: 'Unlocks Workshop' },
      { type: 'yield_bonus', target: 'wood', value: 1, description: '+1 wood per turn' },
    ],
    costMultiplier: 1,
  },
  writing: {
    id: 'writing',
    name: 'Writing',
    nameRu: 'Письменность',
    era: 'primitives',
    branch: 'science',
    prerequisites: [],
    effects: [
      { type: 'unlock_building', target: 'library', description: 'Unlocks Library' },
      { type: 'yield_bonus', target: 'science', value: 1, description: '+1 science per turn' },
    ],
    costMultiplier: 1,
  },
  mysticism: {
    id: 'mysticism',
    name: 'Mysticism',
    nameRu: 'Мистицизм',
    era: 'primitives',
    branch: 'mystical',
    prerequisites: [],
    effects: [
      { type: 'yield_bonus', target: 'mana', value: 1, description: '+1 mana per turn' },
      { type: 'unlock_ability', target: 'hero', value: 1, description: 'Hero gains minor spell' },
    ],
    costMultiplier: 1,
  },

  // ===== Early Civilization Era =====
  archery: {
    id: 'archery',
    name: 'Archery',
    nameRu: 'Лучное дело',
    era: 'earlyCiv',
    branch: 'military',
    prerequisites: ['hunting'],
    effects: [
      { type: 'unlock_unit', target: 'archer', description: 'Unlocks Archer' },
      { type: 'unlock_building', target: 'archery_range', description: 'Unlocks Archery Range' },
    ],
    costMultiplier: 1.5,
  },
  bronze_working: {
    id: 'bronze_working',
    name: 'Bronze Working',
    nameRu: 'Обработка бронзы',
    era: 'earlyCiv',
    branch: 'military',
    prerequisites: ['toolmaking'],
    effects: [
      { type: 'combat_bonus', target: 'melee', value: 1, description: '+1 ATK for melee units' },
      { type: 'yield_bonus', target: 'iron', value: 1, description: '+1 iron per turn' },
    ],
    costMultiplier: 1.5,
  },
  trade: {
    id: 'trade',
    name: 'Trade',
    nameRu: 'Торговля',
    era: 'earlyCiv',
    branch: 'economic',
    prerequisites: ['agriculture'],
    effects: [
      { type: 'unlock_building', target: 'market', description: 'Unlocks Market' },
      { type: 'yield_bonus', target: 'gold', value: 2, description: '+2 gold per turn' },
    ],
    costMultiplier: 1.5,
  },
  masonry: {
    id: 'masonry',
    name: 'Masonry',
    nameRu: 'Кладка',
    era: 'earlyCiv',
    branch: 'economic',
    prerequisites: ['craftsmanship'],
    effects: [
      { type: 'unlock_building', target: 'walls', description: 'Unlocks Walls' },
      { type: 'yield_bonus', target: 'stone', value: 1, description: '+1 stone per turn' },
    ],
    costMultiplier: 1.5,
  },
  scholarship: {
    id: 'scholarship',
    name: 'Scholarship',
    nameRu: 'Научная мысль',
    era: 'earlyCiv',
    branch: 'science',
    prerequisites: ['writing'],
    effects: [
      { type: 'yield_bonus', target: 'science', value: 2, description: '+2 science per turn' },
      { type: 'tech_discount', value: 0.05, description: '-5% technology cost' },
    ],
    costMultiplier: 1.5,
  },
  ritual: {
    id: 'ritual',
    name: 'Ritual',
    nameRu: 'Ритуал',
    era: 'earlyCiv',
    branch: 'mystical',
    prerequisites: ['mysticism'],
    effects: [
      { type: 'yield_bonus', target: 'mana', value: 2, description: '+2 mana per turn' },
      { type: 'unlock_ability', target: 'hero', description: 'Hero gains ritual ability' },
    ],
    costMultiplier: 1.5,
  },

  // ===== Medieval Era =====
  iron_working: {
    id: 'iron_working',
    name: 'Iron Working',
    nameRu: 'Обработка железа',
    era: 'medieval',
    branch: 'military',
    prerequisites: ['bronze_working'],
    effects: [
      { type: 'unlock_unit', target: 'swordsman', description: 'Unlocks Swordsman' },
      { type: 'unlock_building', target: 'blacksmith', description: 'Unlocks Blacksmith' },
    ],
    costMultiplier: 2.5,
  },
  chivalry: {
    id: 'chivalry',
    name: 'Chivalry',
    nameRu: 'Рыцарство',
    era: 'medieval',
    branch: 'military',
    prerequisites: ['iron_working'],
    effects: [
      { type: 'unlock_unit', target: 'knight', description: 'Unlocks Knight' },
      { type: 'morale_bonus', value: 0.05, description: '+5% morale for cavalry' },
    ],
    costMultiplier: 2.5,
  },
  siegecraft: {
    id: 'siegecraft',
    name: 'Siegecraft',
    nameRu: 'Осадное дело',
    era: 'medieval',
    branch: 'military',
    prerequisites: ['iron_working'],
    effects: [
      { type: 'unlock_unit', target: 'catapult', description: 'Unlocks Catapult' },
      { type: 'unlock_building', target: 'siege_yard', description: 'Unlocks Siege Yard' },
    ],
    costMultiplier: 2.5,
  },
  engineering: {
    id: 'engineering',
    name: 'Engineering',
    nameRu: 'Инженерия',
    era: 'medieval',
    branch: 'science',
    prerequisites: ['masonry', 'scholarship'],
    effects: [
      { type: 'unlock_unit', target: 'crossbowman', description: 'Unlocks Crossbowman' },
      { type: 'build_speed', value: 0.15, description: '+15% building speed' },
    ],
    costMultiplier: 2.5,
  },
  banking: {
    id: 'banking',
    name: 'Banking',
    nameRu: 'Банковское дело',
    era: 'medieval',
    branch: 'economic',
    prerequisites: ['trade'],
    effects: [
      { type: 'unlock_building', target: 'bank', description: 'Unlocks Bank' },
      { type: 'yield_bonus', target: 'gold', value: 3, description: '+3 gold per turn' },
    ],
    costMultiplier: 2.5,
  },
  theology: {
    id: 'theology',
    name: 'Theology',
    nameRu: 'Теология',
    era: 'medieval',
    branch: 'mystical',
    prerequisites: ['ritual'],
    effects: [
      { type: 'unlock_building', target: 'temple', description: 'Unlocks Temple' },
      { type: 'yield_bonus', target: 'mana', value: 3, description: '+3 mana per turn' },
    ],
    costMultiplier: 2.5,
  },
  arcane_studies: {
    id: 'arcane_studies',
    name: 'Arcane Studies',
    nameRu: 'Тайные исследования',
    era: 'medieval',
    branch: 'mystical',
    prerequisites: ['ritual', 'scholarship'],
    effects: [
      { type: 'unlock_unit', target: 'mage', description: 'Unlocks Mage' },
      { type: 'unlock_building', target: 'mage_tower', description: 'Unlocks Mage Tower' },
    ],
    costMultiplier: 2.5,
  },
  sailing: {
    id: 'sailing',
    name: 'Sailing',
    nameRu: 'Мореплавание',
    era: 'medieval',
    branch: 'economic',
    prerequisites: ['trade', 'masonry'],
    effects: [
      { type: 'unlock_building', target: 'harbor', description: 'Unlocks Harbor' },
      { type: 'movement_bonus', target: 'water', value: 1, description: 'Naval movement +1' },
    ],
    costMultiplier: 2.5,
  },

  // ===== Renaissance Era =====
  gunpowder: {
    id: 'gunpowder',
    name: 'Gunpowder',
    nameRu: 'Порох',
    era: 'renaissance',
    branch: 'military',
    prerequisites: ['chivalry', 'engineering'],
    effects: [
      { type: 'combat_bonus', target: 'ranged', value: 2, description: '+2 ATK for ranged units' },
      { type: 'combat_bonus', target: 'siege', value: 3, description: '+3 ATK for siege units' },
    ],
    costMultiplier: 4,
  },
  fortification: {
    id: 'fortification',
    name: 'Fortification',
    nameRu: 'Фортификация',
    era: 'renaissance',
    branch: 'military',
    prerequisites: ['siegecraft', 'masonry'],
    effects: [
      { type: 'unlock_building', target: 'castle', description: 'Unlocks Castle' },
      { type: 'defense_bonus', value: 0.1, description: '+10% defense in all cities' },
    ],
    costMultiplier: 4,
  },
  guilds: {
    id: 'guilds',
    name: 'Guilds',
    nameRu: 'Гильдии',
    era: 'renaissance',
    branch: 'economic',
    prerequisites: ['banking'],
    effects: [
      { type: 'unlock_building', target: 'guild_hall', description: 'Unlocks Guild Hall' },
      { type: 'yield_bonus', target: 'gold', value: 4, description: '+4 gold per turn' },
    ],
    costMultiplier: 4,
  },
  divine_right: {
    id: 'divine_right',
    name: 'Divine Right',
    nameRu: 'Божественное право',
    era: 'renaissance',
    branch: 'mystical',
    prerequisites: ['theology', 'chivalry'],
    effects: [
      { type: 'unlock_unit', target: 'paladin', description: 'Unlocks Paladin' },
      { type: 'unlock_wonder', target: 'wonder_sun_obelisk', description: 'Unlocks Sun Obelisk wonder' },
    ],
    costMultiplier: 4,
  },
  alchemy: {
    id: 'alchemy',
    name: 'Alchemy',
    nameRu: 'Алхимия',
    era: 'renaissance',
    branch: 'science',
    prerequisites: ['arcane_studies'],
    effects: [
      { type: 'unlock_building', target: 'alchemist_lab', description: 'Unlocks Alchemist Lab' },
      { type: 'yield_bonus', target: 'mana', value: 2, description: '+2 mana per turn' },
    ],
    costMultiplier: 4,
  },
  metallurgy: {
    id: 'metallurgy',
    name: 'Metallurgy',
    nameRu: 'Металлургия',
    era: 'renaissance',
    branch: 'science',
    prerequisites: ['iron_working', 'engineering'],
    effects: [
      { type: 'unlock_wonder', target: 'wonder_great_foundry', description: 'Unlocks Great Foundry wonder' },
      { type: 'yield_bonus', target: 'iron', value: 3, description: '+3 iron per turn' },
    ],
    costMultiplier: 4,
  },
  druidism: {
    id: 'druidism',
    name: 'Druidism',
    nameRu: 'Друидизм',
    era: 'renaissance',
    branch: 'mystical',
    prerequisites: ['theology'],
    effects: [
      { type: 'unlock_wonder', target: 'wonder_world_tree', description: 'Unlocks World Tree wonder' },
      { type: 'yield_bonus', target: 'food', value: 3, description: '+3 food per turn' },
    ],
    costMultiplier: 4,
  },

  // ===== Rift Era =====
  astronomy: {
    id: 'astronomy',
    name: 'Astronomy',
    nameRu: 'Астрономия',
    era: 'rift',
    branch: 'science',
    prerequisites: ['scholarship', 'sailing'],
    effects: [
      { type: 'yield_bonus', target: 'science', value: 5, description: '+5 science per turn' },
      { type: 'vision', value: 3, description: '+3 global vision' },
    ],
    costMultiplier: 6,
  },
  diplomacy: {
    id: 'diplomacy',
    name: 'Diplomacy',
    nameRu: 'Дипломатия',
    era: 'rift',
    branch: 'economic',
    prerequisites: ['guilds', 'scholarship'],
    effects: [
      { type: 'diplomacy', description: 'Enables advanced diplomatic actions' },
      { type: 'yield_bonus', target: 'gold', value: 5, description: '+5 gold per turn' },
    ],
    costMultiplier: 6,
  },
  gunpowder_weapons: {
    id: 'gunpowder_weapons',
    name: 'Gunpowder Weapons',
    nameRu: 'Огнестрельное оружие',
    era: 'rift',
    branch: 'military',
    prerequisites: ['gunpowder'],
    effects: [
      { type: 'combat_bonus', target: 'ranged', value: 3, description: '+3 ATK for ranged units' },
      { type: 'combat_bonus', target: 'infantry', value: 2, description: '+2 ATK for infantry units' },
    ],
    costMultiplier: 6,
  },
  advanced_siege: {
    id: 'advanced_siege',
    name: 'Advanced Siege',
    nameRu: 'Продвинутая осада',
    era: 'rift',
    branch: 'military',
    prerequisites: ['fortification', 'gunpowder'],
    effects: [
      { type: 'combat_bonus', target: 'siege', value: 5, description: '+5 ATK for siege units' },
      { type: 'defense_penalty', target: 'walls', value: 0.15, description: 'Walls 15% less effective' },
    ],
    costMultiplier: 6,
  },
  cartography: {
    id: 'cartography',
    name: 'Cartography',
    nameRu: 'Картография',
    era: 'rift',
    branch: 'science',
    prerequisites: ['astronomy', 'sailing'],
    effects: [
      { type: 'vision', value: 5, description: '+5 global vision' },
      { type: 'movement_bonus', value: 1, description: '+1 movement for scouts' },
    ],
    costMultiplier: 6,
  },
  astral_projection: {
    id: 'astral_projection',
    name: 'Astral Projection',
    nameRu: 'Астральная проекция',
    era: 'rift',
    branch: 'mystical',
    prerequisites: ['alchemy', 'arcane_studies'],
    effects: [
      { type: 'unlock_building', target: 'astral_observatory', description: 'Unlocks Astral Observatory' },
      { type: 'unlock_wonder', target: 'wonder_astral_gate', description: 'Unlocks Astral Gate wonder' },
    ],
    costMultiplier: 6,
  },
  rift_mechanics: {
    id: 'rift_mechanics',
    name: 'Rift Mechanics',
    nameRu: 'Механика разломов',
    era: 'rift',
    branch: 'science',
    prerequisites: ['astral_projection', 'metallurgy'],
    effects: [
      { type: 'yield_bonus', target: 'mana', value: 5, description: '+5 mana per turn' },
      { type: 'yield_bonus', target: 'science', value: 5, description: '+5 science per turn' },
      { type: 'unlock_mechanic', target: 'rifts', description: 'Enables rift interaction' },
    ],
    costMultiplier: 7,
  },
  war_machines: {
    id: 'war_machines',
    name: 'War Machines',
    nameRu: 'Боевые машины',
    era: 'rift',
    branch: 'military',
    prerequisites: ['advanced_siege', 'metallurgy'],
    effects: [
      { type: 'combat_bonus', target: 'siege', value: 8, description: '+8 ATK for siege units' },
      { type: 'unlock_ability', target: 'siege', description: 'Siege units gain bombard ability' },
    ],
    costMultiplier: 7,
  },
  planar_defense: {
    id: 'planar_defense',
    name: 'Planar Defense',
    nameRu: 'Планарная защита',
    era: 'rift',
    branch: 'mystical',
    prerequisites: ['astral_projection', 'fortification'],
    effects: [
      { type: 'defense_bonus', value: 0.2, description: '+20% defense against rift creatures' },
      { type: 'yield_bonus', target: 'mana', value: 4, description: '+4 mana per turn' },
    ],
    costMultiplier: 7,
  },
  dominion: {
    id: 'dominion',
    name: 'Dominion',
    nameRu: 'Господство',
    era: 'rift',
    branch: 'economic',
    prerequisites: ['diplomacy', 'rift_mechanics'],
    effects: [
      { type: 'victory_progress', value: 1, description: 'Progress toward domination victory' },
      { type: 'yield_bonus', target: 'gold', value: 10, description: '+10 gold per turn' },
      { type: 'morale_bonus', value: 0.15, description: '+15% global morale' },
    ],
    costMultiplier: 8,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a technology definition by its ID. Throws if not found. */
export function getTechById(id: TechId): Technology {
  const t = TECHNOLOGIES[id];
  if (!t) throw new Error(`Unknown tech id: ${id}`);
  return t as Technology;
}

/** Get all technologies belonging to a specific era. */
export function getTechsByEra(eraId: string): Technology[] {
  return (Object.values(TECHNOLOGIES) as Technology[]).filter((t) => t.era === eraId);
}

/** Get all technologies belonging to a specific branch. */
export function getTechsByBranch(branch: Technology['branch']): Technology[] {
  return (Object.values(TECHNOLOGIES) as Technology[]).filter((t) => t.branch === branch);
}

/** Get all technologies that are immediately researchable given a set of already-researched tech IDs. */
export function getAvailableTechs(researched: Set<TechId>): Technology[] {
  return (Object.values(TECHNOLOGIES) as Technology[]).filter(
    (t) =>
      !researched.has(t.id) &&
      t.prerequisites.every((pre) => researched.has(pre)),
  );
}

/** All tech IDs in definition order. */
export const TECH_IDS: TechId[] = Object.keys(TECHNOLOGIES) as TechId[];

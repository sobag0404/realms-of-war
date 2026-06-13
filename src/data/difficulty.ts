// ============================================================================
// Difficulty Level Definitions — Realms of War
// ============================================================================

import type { ResourceId } from '@/engine/core/types';

/** String literal union for all difficulty levels */
export type DifficultyLevel = 'settler' | 'easy' | 'normal' | 'hard' | 'deity';

/** Full difficulty definition */
export interface DifficultyDefinition {
  id: DifficultyLevel;
  name: string;
  nameRu: string;
  /** Player income multiplier */
  playerIncomeMultiplier: number;
  /** AI income multiplier */
  aiIncomeMultiplier: number;
  /** AI starting bonus resources */
  aiStartBonus: Partial<Record<ResourceId, number>>;
  /** Barbarian/neutral enemy spawn rate multiplier */
  barbarianRate: number;
  /** AI aggression level (0-1) */
  aiAggression: number;
  /** Whether AI gets fog-of-war cheat */
  aiFogCheat: boolean;
  /** Player heal bonus per turn */
  playerHealBonus: number;
  /** Description */
  description: string;
  descriptionRu: string;
  /** Recommended for */
  recommended: string;
  recommendedRu: string;
}

// ---------------------------------------------------------------------------
// Difficulty data
// ---------------------------------------------------------------------------
export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyDefinition> = {
  settler: {
    id: 'settler',
    name: 'Settler',
    nameRu: 'Поселенец',
    playerIncomeMultiplier: 1.5,
    aiIncomeMultiplier: 0.6,
    aiStartBonus: {},
    barbarianRate: 0.3,
    aiAggression: 0.2,
    aiFogCheat: false,
    playerHealBonus: 5,
    description: 'A relaxed experience for learning the game. AI is less aggressive and enemies are few.',
    descriptionRu: 'Расслабленный режим для изучения игры. ИИ менее агрессивен, врагов мало.',
    recommended: 'First-time players',
    recommendedRu: 'Новички',
  },
  easy: {
    id: 'easy',
    name: 'Easy',
    nameRu: 'Лёгкий',
    playerIncomeMultiplier: 1.25,
    aiIncomeMultiplier: 0.8,
    aiStartBonus: { gold: 20, food: 10 },
    barbarianRate: 0.5,
    aiAggression: 0.35,
    aiFogCheat: false,
    playerHealBonus: 3,
    description: 'A gentle challenge. You have a comfortable advantage over AI opponents.',
    descriptionRu: 'Мягкий вызов. У вас комфортное преимущество перед противниками-ИИ.',
    recommended: 'Casual players',
    recommendedRu: 'Обычные игроки',
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    nameRu: 'Нормальный',
    playerIncomeMultiplier: 1.0,
    aiIncomeMultiplier: 1.0,
    aiStartBonus: { gold: 30, food: 15 },
    barbarianRate: 1.0,
    aiAggression: 0.5,
    aiFogCheat: false,
    playerHealBonus: 0,
    description: 'A balanced experience. AI plays by the same rules with a small starting bonus.',
    descriptionRu: 'Сбалансированный режим. ИИ играет по тем же правилам с небольшим стартовым бонусом.',
    recommended: 'Strategy game fans',
    recommendedRu: 'Любители стратегий',
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    nameRu: 'Сложный',
    playerIncomeMultiplier: 0.9,
    aiIncomeMultiplier: 1.3,
    aiStartBonus: { gold: 50, food: 25, wood: 15, stone: 10 },
    barbarianRate: 1.5,
    aiAggression: 0.7,
    aiFogCheat: true,
    playerHealBonus: 0,
    description: 'AI gets significant bonuses and can see through fog of war. Expect tough opposition.',
    descriptionRu: 'ИИ получает значительные бонусы и видит сквозь туман войны. Ожидайте серьёзного сопротивления.',
    recommended: 'Experienced 4X players',
    recommendedRu: 'Опытные игроки 4X',
  },
  deity: {
    id: 'deity',
    name: 'Deity',
    nameRu: 'Божество',
    playerIncomeMultiplier: 0.75,
    aiIncomeMultiplier: 1.7,
    aiStartBonus: { gold: 100, food: 50, wood: 30, stone: 20, iron: 10, mana: 5 },
    barbarianRate: 2.0,
    aiAggression: 0.9,
    aiFogCheat: true,
    playerHealBonus: 0,
    description: 'Overwhelming odds. AI starts with massive bonuses and relentless aggression. Only for the bravest.',
    descriptionRu: 'Непреодолимые трудности. ИИ стартует с огромными бонусами и безжалостной агрессией. Только для смелейших.',
    recommended: 'Master strategists',
    recommendedRu: 'Мастера стратегии',
  },
} as const;

/** All difficulty levels in order from easiest to hardest. */
export const DIFFICULTY_ORDER: DifficultyLevel[] = ['settler', 'easy', 'normal', 'hard', 'deity'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a difficulty definition by its ID. Throws if not found. */
export function getDifficultyById(id: DifficultyLevel): DifficultyDefinition {
  const d = DIFFICULTY_LEVELS[id];
  if (!d) throw new Error(`Unknown difficulty level: ${id}`);
  return d as DifficultyDefinition;
}

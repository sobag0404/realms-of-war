/**
 * Difficulty modifiers for "Realms of War" AI.
 *
 * Controls how smart and capable the AI is at each difficulty level.
 * Easy AI makes mistakes and has reduced vision; Deity AI plays
 * optimally and can see through fog of war.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'deity';

export interface DifficultyModifiers {
  /** Multiplier on AI resource income (1.0 = normal). */
  incomeMultiplier: number;
  /** Multiplier on AI unit production speed. */
  productionMultiplier: number;
  /** Multiplier on AI vision range. */
  visionMultiplier: number;
  /** Whether AI can see through fog of war. */
  fogOfWarCheat: boolean;
  /** Probability AI makes a suboptimal move (0 = always optimal). */
  mistakeProbability: number;
  /** How many turns ahead AI plans. */
  planningHorizon: number;
  /** Whether AI uses behavior trees (simpler AI uses basic utility). */
  useBehaviorTree: boolean;
}

// ─── Difficulty Settings ──────────────────────────────────────────────────────

export const DIFFICULTY_SETTINGS: Record<DifficultyLevel, DifficultyModifiers> = {
  easy: {
    incomeMultiplier: 0.8,
    productionMultiplier: 0.85,
    visionMultiplier: 0.8,
    fogOfWarCheat: false,
    mistakeProbability: 0.35,
    planningHorizon: 1,
    useBehaviorTree: false,
  },
  normal: {
    incomeMultiplier: 1.0,
    productionMultiplier: 1.0,
    visionMultiplier: 1.0,
    fogOfWarCheat: false,
    mistakeProbability: 0.15,
    planningHorizon: 3,
    useBehaviorTree: true,
  },
  hard: {
    incomeMultiplier: 1.15,
    productionMultiplier: 1.1,
    visionMultiplier: 1.2,
    fogOfWarCheat: false,
    mistakeProbability: 0.05,
    planningHorizon: 5,
    useBehaviorTree: true,
  },
  deity: {
    incomeMultiplier: 1.4,
    productionMultiplier: 1.3,
    visionMultiplier: 1.5,
    fogOfWarCheat: true,
    mistakeProbability: 0.0,
    planningHorizon: 8,
    useBehaviorTree: true,
  },
};

// ─── Accessor ─────────────────────────────────────────────────────────────────

/**
 * Get difficulty modifiers for a given level.
 *
 * @param level - Difficulty level
 * @returns Modifiers that affect AI behavior and capabilities
 */
export function getDifficultyModifiers(level: DifficultyLevel): DifficultyModifiers {
  return DIFFICULTY_SETTINGS[level];
}

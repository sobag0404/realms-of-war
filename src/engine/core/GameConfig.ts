/**
 * Game configuration for "Realms of War".
 *
 * Config is immutable once a game session starts — all randomness flows from
 * the seed, making the run deterministic and reproducible.
 */

import type {
  EraId,
  GameMode,
  ResourceYield,
  VictoryCondition,
} from './types';

// ─── Difficulty ───────────────────────────────────────────────────────────────

export type Difficulty = 'settler' | 'chieftain' | 'warlord' | 'emperor' | 'deity';

export interface DifficultyParams {
  /** Multiplier on AI resource income. */
  aiIncomeMultiplier: number;
  /** Bonus gold/food per turn the AI receives. */
  aiFlatBonus: ResourceYield;
  /** Starting gold for AI players. */
  aiStartingGold: number;
  /** Multiplier on player unit upkeep cost. */
  playerUpkeepMultiplier: number;
  /** Barbarian spawn rate (0–1 chance per eligible hex per turn). */
  barbarianSpawnRate: number;
}

// ─── Map Settings ─────────────────────────────────────────────────────────────

export type MapType = 'continents' | 'archipelago' | 'pangea' | 'highlands' | 'riftlands';

export interface MapConfig {
  /** Radius of the hex grid (number of rings from center). */
  radius: number;
  type: MapType;
  /** Water percentage (0–1). */
  waterLevel: number;
  /** Mountain density (0–1). */
  mountainDensity: number;
  /** Forest density (0–1). */
  forestDensity: number;
  /** Resource abundance (0–1). */
  resourceAbundance: number;
  /** Number of rift portals on the map. */
  riftPortals: number;
}

// ─── Victory ──────────────────────────────────────────────────────────────────

export interface VictoryConfig {
  conditions: VictoryCondition[];
  /** Number of cities required for conquest victory. */
  conquestCityCount: number;
  /** Era required for science victory. */
  scienceTargetEra: EraId;
  /** Gold threshold for economic victory. */
  economicGoldTarget: number;
  /** Number of rift portals to control for rift victory. */
  riftPortalCount: number;
  /** Maximum turns before automatic score-based victory. */
  maxTurns: number;
}

// ─── Speed ────────────────────────────────────────────────────────────────────

export type GameSpeed = 'blitz' | 'quick' | 'normal' | 'epic' | 'marathon';

export interface SpeedParams {
  /** Multiplier on all costs (production, research, etc.). */
  costMultiplier: number;
  /** Multiplier on income rates. */
  incomeMultiplier: number;
  /** Multiplier on unit movement points. */
  movementMultiplier: number;
  /** Growth rate multiplier for cities. */
  growthMultiplier: number;
}

// ─── Player Setup ─────────────────────────────────────────────────────────────

export interface PlayerSetup {
  id: string;
  name: string;
  color: string;
  isAI: boolean;
  /** For hotseat: the slot index. */
  slot: number;
}

// ─── Full Config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  /** Schema version for deserialization. */
  version: number;
  mode: GameMode;
  seed: number;
  difficulty: Difficulty;
  speed: GameSpeed;
  map: MapConfig;
  victory: VictoryConfig;
  players: PlayerSetup[];
  /** Whether fog-of-war is enabled. */
  fogOfWar: boolean;
  /** Whether barbarians spawn. */
  barbarians: boolean;
  /** Starting era. */
  startEra: EraId;
  /** Starting resources for human players. */
  startResources: ResourceYield;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyParams> = {
  settler: {
    aiIncomeMultiplier: 0.8,
    aiFlatBonus: { gold: 0, food: 0 },
    aiStartingGold: 50,
    playerUpkeepMultiplier: 0.8,
    barbarianSpawnRate: 0.02,
  },
  chieftain: {
    aiIncomeMultiplier: 1.0,
    aiFlatBonus: { gold: 2, food: 1 },
    aiStartingGold: 75,
    playerUpkeepMultiplier: 1.0,
    barbarianSpawnRate: 0.04,
  },
  warlord: {
    aiIncomeMultiplier: 1.2,
    aiFlatBonus: { gold: 5, food: 2 },
    aiStartingGold: 100,
    playerUpkeepMultiplier: 1.0,
    barbarianSpawnRate: 0.06,
  },
  emperor: {
    aiIncomeMultiplier: 1.5,
    aiFlatBonus: { gold: 10, food: 5 },
    aiStartingGold: 150,
    playerUpkeepMultiplier: 1.1,
    barbarianSpawnRate: 0.08,
  },
  deity: {
    aiIncomeMultiplier: 2.0,
    aiFlatBonus: { gold: 20, food: 10 },
    aiStartingGold: 250,
    playerUpkeepMultiplier: 1.2,
    barbarianSpawnRate: 0.12,
  },
};

const SPEED_PRESETS: Record<GameSpeed, SpeedParams> = {
  blitz: {
    costMultiplier: 0.5,
    incomeMultiplier: 1.5,
    movementMultiplier: 1.5,
    growthMultiplier: 1.5,
  },
  quick: {
    costMultiplier: 0.75,
    incomeMultiplier: 1.25,
    movementMultiplier: 1.25,
    growthMultiplier: 1.25,
  },
  normal: {
    costMultiplier: 1.0,
    incomeMultiplier: 1.0,
    movementMultiplier: 1.0,
    growthMultiplier: 1.0,
  },
  epic: {
    costMultiplier: 1.5,
    incomeMultiplier: 1.0,
    movementMultiplier: 1.0,
    growthMultiplier: 0.8,
  },
  marathon: {
    costMultiplier: 2.0,
    incomeMultiplier: 1.0,
    movementMultiplier: 1.0,
    growthMultiplier: 0.6,
  },
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getDifficultyParams(d: Difficulty): DifficultyParams {
  return DIFFICULTY_PRESETS[d];
}

export function getSpeedParams(s: GameSpeed): SpeedParams {
  return SPEED_PRESETS[s];
}

export function createDefaultConfig(overrides?: Partial<GameConfig>): GameConfig {
  const defaults: GameConfig = {
    version: 1,
    mode: 'single',
    seed: Date.now(),
    difficulty: 'chieftain',
    speed: 'normal',
    map: {
      radius: 20,
      type: 'continents',
      waterLevel: 0.3,
      mountainDensity: 0.1,
      forestDensity: 0.2,
      resourceAbundance: 0.5,
      riftPortals: 3,
    },
    victory: {
      conditions: ['conquest', 'science', 'economic', 'rift'],
      conquestCityCount: 10,
      scienceTargetEra: 'renaissance',
      economicGoldTarget: 5000,
      riftPortalCount: 3,
      maxTurns: 300,
    },
    players: [
      { id: 'player-0', name: 'Player 1', color: '#e74c3c', isAI: false, slot: 0 },
      { id: 'player-1', name: 'AI 1', color: '#3498db', isAI: true, slot: 1 },
    ],
    fogOfWar: true,
    barbarians: true,
    startEra: 'primitives',
    startResources: {
      gold: 100,
      food: 50,
      wood: 50,
      stone: 30,
      iron: 0,
      mana: 0,
      progress: 0,
      science: 0,
    },
  };

  return { ...defaults, ...overrides };
}

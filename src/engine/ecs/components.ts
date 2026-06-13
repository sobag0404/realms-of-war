/**
 * ECS Component definitions for "Realms of War".
 *
 * Components are plain-data interfaces — no methods, no class instances.
 * They are stored in ComponentStorage keyed by component name + entity ID.
 *
 * Type references align with the canonical types in `core/types.ts` and
 * `core/GameState.ts` (EntityData, CityState, etc.) so that the ECS layer
 * can be populated from and serialised back to the canonical game state.
 */

import type {
  AttackType,
  HexCoord,
  PlayerId,
  ResourceYield,
  BuildingTypeId,
  CityId,
} from '../core/types';
import type { ProductionItem } from '../core/GameState';

// ─── Health ────────────────────────────────────────────────────────────────────

export interface HealthComponent {
  hp: number;
  maxHp: number;
}

// ─── Movement ──────────────────────────────────────────────────────────────────

export interface MovementComponent {
  movementPoints: number;
  maxMovement: number;
  hasMoved: boolean;
}

// ─── Combat ────────────────────────────────────────────────────────────────────

export interface CombatComponent {
  attack: number;
  defense: number;
  attackType: AttackType;
  range: number;
  hasActed: boolean;
}

// ─── Owner ─────────────────────────────────────────────────────────────────────

export interface OwnerComponent {
  ownerId: PlayerId;
}

// ─── Position ──────────────────────────────────────────────────────────────────

export interface PositionComponent {
  hex: HexCoord;
}

// ─── Experience ────────────────────────────────────────────────────────────────

export interface ExperienceComponent {
  xp: number;
  level: number;
  promotions: string[];
}

// ─── Upkeep ────────────────────────────────────────────────────────────────────

export interface UpkeepComponent {
  upkeep: ResourceYield;
}

// ─── Abilities ─────────────────────────────────────────────────────────────────

export interface AbilitiesComponent {
  abilities: string[];
  statusEffects: string[];
}

// ─── City ──────────────────────────────────────────────────────────────────────
/**
 * City component mirrors the fields in CityState that are intrinsic
 * to the city entity itself (not derived from other systems).
 */
export interface CityComponent {
  id: CityId;
  name: string;
  level: number;
  buildings: BuildingTypeId[];
  foodPerTurn: number;
  foundedTurn: number;
}

// ─── Production ────────────────────────────────────────────────────────────────

export interface ProductionComponent {
  productionQueue: ProductionItem[];
  productionPerTurn: number;
}

// ─── Population ────────────────────────────────────────────────────────────────

export interface PopulationComponent {
  population: number;
  growthProgress: number;
  growthTarget: number;
}

// ─── Territory ─────────────────────────────────────────────────────────────────

export interface TerritoryComponent {
  /** Hex keys ("q,r") owned by this city. */
  territory: string[];
  /** Hex keys currently being worked by this city. */
  workedHexes: string[];
}

// ─── Fortification ─────────────────────────────────────────────────────────────

export interface FortificationComponent {
  wallHp: number;
  maxWallHp: number;
  isUnderSiege: boolean;
}

// ─── Vision ────────────────────────────────────────────────────────────────────

export interface VisionComponent {
  visionRange: number;
}

// ─── Component name constants ──────────────────────────────────────────────────
/**
 * Centralised string constants for component names.
 * Using these instead of raw strings prevents typos and makes
 * refactoring easier.
 */
export const ComponentName = {
  Health: 'Health',
  Movement: 'Movement',
  Combat: 'Combat',
  Owner: 'Owner',
  Position: 'Position',
  Experience: 'Experience',
  Upkeep: 'Upkeep',
  Abilities: 'Abilities',
  City: 'City',
  Production: 'Production',
  Population: 'Population',
  Territory: 'Territory',
  Fortification: 'Fortification',
  Vision: 'Vision',
} as const;

export type ComponentNameType = (typeof ComponentName)[keyof typeof ComponentName];

// ─── Component union (for type-safe lookups) ───────────────────────────────────

export type AnyComponent =
  | HealthComponent
  | MovementComponent
  | CombatComponent
  | OwnerComponent
  | PositionComponent
  | ExperienceComponent
  | UpkeepComponent
  | AbilitiesComponent
  | CityComponent
  | ProductionComponent
  | PopulationComponent
  | TerritoryComponent
  | FortificationComponent
  | VisionComponent;

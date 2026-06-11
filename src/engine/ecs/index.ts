/**
 * ECS barrel — re-exports everything from the ecs/ directory.
 */

export type { EntityId, Entity } from './Entity';
export { createEntity, addComponentName, removeComponentName, hasComponent } from './Entity';

export type {
  HealthComponent,
  MovementComponent,
  CombatComponent,
  OwnerComponent,
  PositionComponent,
  ExperienceComponent,
  UpkeepComponent,
  AbilitiesComponent,
  CityComponent,
  ProductionComponent,
  PopulationComponent,
  TerritoryComponent,
  FortificationComponent,
  VisionComponent,
  AnyComponent,
  ComponentNameType,
} from './components';
export { ComponentName } from './components';

export { ComponentStorage } from './componentStorage';

// ─── Systems ───────────────────────────────────────────────────────────────────

export { MovementSystem } from './systems/MovementSystem';
export { CombatSystem } from './systems/CombatSystem';
export { VisionSystem } from './systems/VisionSystem';
export { EconomySystem } from './systems/EconomySystem';
export type { IncomeBreakdown } from './systems/EconomySystem';
export { ResearchSystem } from './systems/ResearchSystem';
export { CitySystem } from './systems/CitySystem';
export type { CityDetails } from './systems/CitySystem';
export { AiSystem } from './systems/AiSystem';
export type { AiPriority } from './systems/AiSystem';
export { StatusEffectSystem } from './systems/StatusEffectSystem';
export { TurnSystem } from './systems/TurnSystem';

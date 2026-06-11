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

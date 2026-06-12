/**
 * ECS Entity definition for "Realms of War".
 *
 * Entities are lightweight identifiers — they carry no game data themselves.
 * All game data lives in components, which are stored separately in
 * ComponentStorage.  This keeps the architecture flexible: the same entity
 * system works for units, cities, buildings, temporary effects, etc.
 */

/** Unique identifier for an entity across the whole game session. */
export type EntityId = string;

/**
 * A minimal entity record.
 *
 * `typeId` distinguishes broad categories (e.g. "unit:swordsman",
 * "city", "building:barracks", "effect:poison") and is useful for
 * quick filtering before inspecting individual components.
 */
export interface Entity {
  id: EntityId;
  /** Categorises the entity — not a component key, just a fast discriminator. */
  typeId: string;
  /** Names of components currently attached to this entity. */
  components: Set<string>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Create a new Entity with the given id and type. */
export function createEntity(id: EntityId, typeId: string): Entity {
  return {
    id,
    typeId,
    components: new Set<string>(),
  };
}

/** Attach a component name to an entity. Returns the same entity (mutated). */
export function addComponentName(entity: Entity, componentName: string): Entity {
  entity.components.add(componentName);
  return entity;
}

/** Remove a component name from an entity. Returns the same entity (mutated). */
export function removeComponentName(entity: Entity, componentName: string): Entity {
  entity.components.delete(componentName);
  return entity;
}

/** Check whether an entity has a given component. */
export function hasComponent(entity: Entity, componentName: string): boolean {
  return entity.components.has(componentName);
}

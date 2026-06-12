/**
 * Component storage for "Realms of War" ECS.
 *
 * Uses a two-level Map structure: outer key = component name, inner key =
 * entity ID.  This gives O(1) lookups for the common case of "give me
 * component X for entity Y" and O(n) for "give me all entities that have
 * component X" (where n = number of entities with that component).
 *
 * All stored data must be plain-serialisable (no class instances, no
 * functions).  The storage itself is mutable and not thread-safe — the
 * GameEngine mediates all access.
 */

import type { EntityId } from './Entity';

export class ComponentStorage {
  /**
   * Outer map: component name → inner map.
   * Inner map: entity ID → component data.
   */
  private data: Map<string, Map<EntityId, unknown>> = new Map();

  // ─── Read ────────────────────────────────────────────────────────────────

  /**
   * Retrieve a component for the given entity.
   * Returns `undefined` if the entity does not have this component.
   */
  get<T>(componentName: string, entityId: EntityId): T | undefined {
    const inner = this.data.get(componentName);
    if (!inner) return undefined;
    return inner.get(entityId) as T | undefined;
  }

  /**
   * Check whether a specific entity has a given component.
   */
  has(componentName: string, entityId: EntityId): boolean {
    const inner = this.data.get(componentName);
    if (!inner) return false;
    return inner.has(entityId);
  }

  /**
   * Return all entity IDs that possess the given component.
   * Useful for query-style access (e.g. "all entities with Health").
   */
  getEntitiesWith(componentName: string): EntityId[] {
    const inner = this.data.get(componentName);
    if (!inner) return [];
    return Array.from(inner.keys());
  }

  /**
   * Return all components of a given type (across all entities).
   * Pairs each component with its owning entity ID.
   */
  getAll<T>(componentName: string): Array<{ entityId: EntityId; component: T }> {
    const inner = this.data.get(componentName);
    if (!inner) return [];
    const result: Array<{ entityId: EntityId; component: T }> = [];
    for (const [entityId, component] of inner) {
      result.push({ entityId, component: component as T });
    }
    return result;
  }

  // ─── Write ───────────────────────────────────────────────────────────────

  /**
   * Store a component for the given entity.
   * Overwrites any existing component of the same name on the same entity.
   */
  set<T>(componentName: string, entityId: EntityId, component: T): void {
    let inner = this.data.get(componentName);
    if (!inner) {
      inner = new Map<EntityId, unknown>();
      this.data.set(componentName, inner);
    }
    inner.set(entityId, component);
  }

  /**
   * Remove a component from an entity.
   * No-op if the entity does not have this component.
   */
  remove(componentName: string, entityId: EntityId): void {
    const inner = this.data.get(componentName);
    if (!inner) return;
    inner.delete(entityId);
    // Clean up empty inner maps to avoid memory leaks
    if (inner.size === 0) {
      this.data.delete(componentName);
    }
  }

  // ─── Bulk ────────────────────────────────────────────────────────────────

  /**
   * Remove all components for a specific entity across all component types.
   * Returns the number of components removed.
   */
  removeAllForEntity(entityId: EntityId): number {
    let removed = 0;
    for (const [componentName, inner] of this.data) {
      if (inner.delete(entityId)) {
        removed++;
        if (inner.size === 0) {
          this.data.delete(componentName);
        }
      }
    }
    return removed;
  }

  /**
   * Clear all stored components.
   * After this call the storage is empty.
   */
  clear(): void {
    this.data.clear();
  }

  // ─── Stats ───────────────────────────────────────────────────────────────

  /** Number of distinct component types currently stored. */
  get componentTypeCount(): number {
    return this.data.size;
  }

  /** Total number of component instances across all types and entities. */
  get totalComponentCount(): number {
    let count = 0;
    for (const inner of this.data.values()) {
      count += inner.size;
    }
    return count;
  }

  /** Names of all component types that currently have at least one entry. */
  get componentNames(): string[] {
    return Array.from(this.data.keys());
  }
}

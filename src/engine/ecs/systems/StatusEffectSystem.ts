/**
 * Status Effect System for "Realms of War".
 *
 * Handles status effects on units such as fortified, poisoned,
 * healing, and rallied. Effects have a duration in turns and
 * modify unit behavior during combat and turn processing.
 *
 * Status effects are stored as strings in EntityData.statusEffects[]
 * in the format "effectId:duration" (e.g., "fortified:3", "poisoned:2").
 */

import type { EntityId, PlayerId } from '../../core/types';
import type { GameState, EntityData } from '../../core/GameState';
import type { EventBus } from '../../core/EventBus';
import { hexKey } from '../../core/types';

// ─── Effect Definitions ────────────────────────────────────────────────────────

/** Definition of a status effect. */
interface EffectDefinition {
  /** Unique effect ID. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Default duration in turns (0 = permanent until removed). */
  defaultDuration: number;
  /** Effect applied at the start of each turn. */
  onTurnStart?: (entity: EntityData) => Partial<EntityData>;
  /** Whether this is a positive effect. */
  isPositive: boolean;
}

/** Registry of all status effects. */
const EFFECT_DEFINITIONS: Record<string, EffectDefinition> = {
  fortified: {
    id: 'fortified',
    name: 'Fortified',
    defaultDuration: 3,
    isPositive: true,
    // +50% defense is applied in combatRules when checking statusEffects
  },
  poisoned: {
    id: 'poisoned',
    name: 'Poisoned',
    defaultDuration: 3,
    isPositive: false,
    onTurnStart: (entity) => ({
      hp: Math.max(1, entity.hp - 5), // -5 HP/turn, can't kill
    }),
  },
  healing: {
    id: 'healing',
    name: 'Healing',
    defaultDuration: 3,
    isPositive: true,
    onTurnStart: (entity) => ({
      hp: Math.min(entity.maxHp, entity.hp + 5), // +5 HP/turn
    }),
  },
  rallied: {
    id: 'rallied',
    name: 'Rallied',
    defaultDuration: 2,
    isPositive: true,
    // +1 attack is applied in combatRules when checking statusEffects
  },
  stunned: {
    id: 'stunned',
    name: 'Stunned',
    defaultDuration: 1,
    isPositive: false,
    onTurnStart: (entity) => ({
      movementPoints: 0,
      hasActed: true,
    }),
  },
  blessed: {
    id: 'blessed',
    name: 'Blessed',
    defaultDuration: 4,
    isPositive: true,
    onTurnStart: (entity) => ({
      hp: Math.min(entity.maxHp, entity.hp + 3),
    }),
  },
  cursed: {
    id: 'cursed',
    name: 'Cursed',
    defaultDuration: 3,
    isPositive: false,
    // -2 attack is applied in combatRules when checking statusEffects
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a status effect string into ID and remaining duration. */
function parseEffect(effectStr: string): { id: string; duration: number } {
  const parts = effectStr.split(':');
  return {
    id: parts[0],
    duration: parts.length > 1 ? parseInt(parts[1], 10) : 0,
  };
}

/** Serialize an effect ID and duration into a status effect string. */
function serializeEffect(id: string, duration: number): string {
  return `${id}:${duration}`;
}

// ─── StatusEffectSystem ────────────────────────────────────────────────────────

export class StatusEffectSystem {
  /**
   * Process all status effects at turn start for a player's units.
   *
   * For each unit with status effects:
   * 1. Apply onTurnStart effects (damage, healing, etc.)
   * 2. Decrement duration of all effects
   * 3. Remove expired effects
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player whose units to process
   * @param eventBus - Event bus for emitting events
   * @returns New game state with updated effects
   */
  static processEffects(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const newEntities = { ...state.entities };
    let changed = false;

    for (const [entityId, entity] of Object.entries(newEntities)) {
      if (entity.ownerId !== playerId) continue;
      if (entity.statusEffects.length === 0) continue;

      let updatedEntity = { ...entity };
      const newEffects: string[] = [];

      for (const effectStr of entity.statusEffects) {
        const { id, duration } = parseEffect(effectStr);
        const definition = EFFECT_DEFINITIONS[id];

        // Apply onTurnStart effect
        if (definition?.onTurnStart) {
          const modifications = definition.onTurnStart(updatedEntity);
          updatedEntity = { ...updatedEntity, ...modifications };
          changed = true;
        }

        // Decrement duration
        const newDuration = duration - 1;
        if (newDuration > 0) {
          newEffects.push(serializeEffect(id, newDuration));
        }
        // Duration <= 0 means the effect expires — don't add to newEffects
      }

      if (newEffects.length !== updatedEntity.statusEffects.length) {
        updatedEntity.statusEffects = newEffects;
        changed = true;
      } else {
        // Check if any effects changed
        for (let i = 0; i < newEffects.length; i++) {
          if (newEffects[i] !== updatedEntity.statusEffects[i]) {
            updatedEntity.statusEffects = newEffects;
            changed = true;
            break;
          }
        }
      }

      newEntities[entityId] = updatedEntity;
    }

    if (!changed) return state;

    return {
      ...state,
      entities: newEntities,
    };
  }

  /**
   * Apply a status effect to a unit.
   *
   * Adds the effect with its default duration. If the unit already
   * has the same effect, refreshes the duration.
   *
   * @param state - Current game state (not mutated)
   * @param entityId - Entity to apply the effect to
   * @param effectId - Effect ID to apply
   * @param eventBus - Event bus for emitting events
   * @returns New game state with the effect applied
   */
  static applyEffect(
    state: GameState,
    entityId: EntityId,
    effectId: string,
    eventBus: EventBus,
  ): GameState {
    const entity = state.entities[entityId];
    if (!entity) return state;

    const definition = EFFECT_DEFINITIONS[effectId];
    if (!definition) return state;

    const duration = definition.defaultDuration;
    const newEffectStr = serializeEffect(effectId, duration);

    // Check if already has this effect — refresh duration
    const newEffects: string[] = [];
    let replaced = false;

    for (const effectStr of entity.statusEffects) {
      const { id } = parseEffect(effectStr);
      if (id === effectId) {
        newEffects.push(newEffectStr);
        replaced = true;
      } else {
        newEffects.push(effectStr);
      }
    }

    if (!replaced) {
      newEffects.push(newEffectStr);
    }

    return {
      ...state,
      entities: {
        ...state.entities,
        [entityId]: {
          ...entity,
          statusEffects: newEffects,
        },
      },
    };
  }

  /**
   * Remove expired effects from all entities.
   *
   * Scans all entities and removes any effects with duration <= 0.
   * This is a cleanup pass that runs after effect processing.
   *
   * @param state - Current game state (not mutated)
   * @param eventBus - Event bus for emitting events
   * @returns New game state with expired effects removed
   */
  static removeExpiredEffects(
    state: GameState,
    eventBus: EventBus,
  ): GameState {
    const newEntities = { ...state.entities };
    let changed = false;

    for (const [entityId, entity] of Object.entries(newEntities)) {
      if (entity.statusEffects.length === 0) continue;

      const filtered = entity.statusEffects.filter((effectStr) => {
        const { duration } = parseEffect(effectStr);
        return duration > 0;
      });

      if (filtered.length !== entity.statusEffects.length) {
        newEntities[entityId] = {
          ...entity,
          statusEffects: filtered,
        };
        changed = true;
      }
    }

    if (!changed) return state;

    return {
      ...state,
      entities: newEntities,
    };
  }
}

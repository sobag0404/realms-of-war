/**
 * Combat System for "Realms of War".
 *
 * Processes Attack commands through the combat rules, provides
 * target validation for the UI, and emits combat events.
 *
 * This is a glue layer between the engine core (GameState, EventBus)
 * and the rules module (combatRules).
 */

import type { CityId, EntityId, HexCoord } from '../../core/types';
import type { GameState } from '../../core/GameState';
import type { AttackCommand } from '../../core/CommandQueue';
import type { EventBus } from '../../core/EventBus';
import {
  canAttack as rulesCanAttack,
  applyCombat,
} from '../../rules/combatRules';
import { hexDistance } from '../../core/types';

export class CombatSystem {
  /**
   * Process an Attack command through the system.
   *
   * 1. Validates the attack via combatRules.canAttack
   * 2. Applies combat via combatRules.applyCombat
   * 3. Emits AttackStarted, DamageApplied, and optionally UnitKilled events
   *
   * @param state - Current game state (not mutated)
   * @param command - The Attack command to process
   * @param eventBus - Event bus for emitting events
   * @returns New game state with combat applied, or original state if invalid
   */
  static process(
    state: GameState,
    command: AttackCommand,
    eventBus: EventBus,
  ): GameState {
    const attacker = state.entities[command.attackerId];
    if (!attacker) return state;

    // Validate the attack
    const targetId = command.targetEntityId ?? command.targetCityId;
    if (!targetId) return state;

    const canAttackResult = rulesCanAttack(state, command.attackerId, targetId);
    if (!canAttackResult.canAttack) return state;

    // Emit AttackStarted event
    eventBus.emit('AttackStarted', {
      attackerId: command.attackerId,
      defenderId: command.targetEntityId,
      targetCityId: command.targetCityId,
      attackType: attacker.attackType,
    });

    // Remember defender position before combat (for UnitKilled event)
    const defender = command.targetEntityId
      ? state.entities[command.targetEntityId]
      : null;
    const defenderPosition: HexCoord | null = defender
      ? { ...defender.hex }
      : null;

    // Apply combat
    const { state: newState, result } = applyCombat(
      state,
      command.attackerId,
      command.targetEntityId,
      command.targetCityId,
    );

    // Emit DamageApplied events
    // Damage to defender / city
    const damageTarget = command.targetEntityId ?? command.targetCityId;
    if (damageTarget && result.attackerDamage > 0) {
      eventBus.emit('DamageApplied', {
        targetId: damageTarget,
        amount: result.attackerDamage,
        damageType: attacker.attackType,
        isCritical: result.isCritical,
      });
    }

    // Damage to attacker (counter-attack)
    if (result.defenderDamage > 0) {
      eventBus.emit('DamageApplied', {
        targetId: command.attackerId,
        amount: result.defenderDamage,
        damageType: defender ? defender.attackType : 'counter',
        isCritical: false,
      });
    }

    // Emit UnitKilled events
    if (result.defenderKilled && command.targetEntityId && defenderPosition) {
      eventBus.emit('UnitKilled', {
        entityId: command.targetEntityId,
        killedBy: attacker.ownerId,
        position: defenderPosition,
      });
    }

    if (result.attackerKilled) {
      eventBus.emit('UnitKilled', {
        entityId: command.attackerId,
        killedBy: defender ? defender.ownerId : '',
        position: attacker.hex,
      });
    }

    return newState;
  }

  /**
   * Check if an attack is valid.
   *
   * Delegates to combatRules.canAttack.
   *
   * @param state - Current game state
   * @param attackerId - The attacking entity
   * @param targetId - The target (entity or city)
   * @returns Whether the attack can proceed
   */
  static canAttack(
    state: GameState,
    attackerId: EntityId,
    targetId: EntityId | CityId,
  ): boolean {
    return rulesCanAttack(state, attackerId, targetId).canAttack;
  }

  /**
   * Get valid attack targets for a unit.
   *
   * Scans all entities and cities in range that the unit can attack.
   *
   * @param state - Current game state
   * @param attackerId - The attacking entity
   * @returns Array of entity IDs that can be attacked
   */
  static getAttackTargets(state: GameState, attackerId: EntityId): EntityId[] {
    const attacker = state.entities[attackerId];
    if (!attacker || attacker.hasActed) return [];

    const targets: EntityId[] = [];

    for (const entity of Object.values(state.entities)) {
      // Skip self
      if (entity.id === attackerId) continue;

      // Skip friendly units
      if (entity.ownerId === attacker.ownerId) continue;

      // Range check
      const dist = hexDistance(attacker.hex, entity.hex);
      if (dist > attacker.range) continue;

      // Validate attack via rules
      const result = rulesCanAttack(state, attackerId, entity.id);
      if (result.canAttack) {
        targets.push(entity.id);
      }
    }

    return targets;
  }
}

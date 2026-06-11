/**
 * Movement System for "Realms of War".
 *
 * Processes MoveUnit commands through the movement rules, provides
 * path preview data for the UI, and emits movement events.
 *
 * This is a glue layer between the engine core (GameState, EventBus)
 * and the rules module (movementRules).
 */

import type { EntityId, HexCoord } from '../../core/types';
import type { GameState } from '../../core/GameState';
import type { MoveUnitCommand } from '../../core/CommandQueue';
import type { EventBus } from '../../core/EventBus';
import {
  canMoveTo,
  getReachableHexes as rulesGetReachableHexes,
  applyMovement,
  calculateMovementCost,
} from '../../rules/movementRules';
import { hexKey } from '../../core/types';

export class MovementSystem {
  /**
   * Process a MoveUnit command through the system.
   *
   * 1. Validates the move via movementRules.canMoveTo
   * 2. Applies the movement via movementRules.applyMovement
   * 3. Emits a UnitMoved event
   *
   * @param state - Current game state (not mutated)
   * @param command - The MoveUnit command to process
   * @param eventBus - Event bus for emitting events
   * @returns New game state with the unit moved, or original state if invalid
   */
  static process(
    state: GameState,
    command: MoveUnitCommand,
    eventBus: EventBus,
  ): GameState {
    const entity = state.entities[command.entityId];
    if (!entity) return state;

    const from = { ...entity.hex };
    const destination = command.path[command.path.length - 1];

    // Validate the move
    const result = canMoveTo(state, command.entityId, destination);
    if (!result.canMove) return state;

    // Apply the movement
    const newState = applyMovement(state, command.entityId, command.path);

    // Emit UnitMoved event
    const movedEntity = newState.entities[command.entityId];
    if (movedEntity) {
      eventBus.emit('UnitMoved', {
        entityId: command.entityId,
        from,
        to: movedEntity.hex,
        remainingMP: movedEntity.movementPoints,
      });
    }

    return newState;
  }

  /**
   * Get all hexes a unit can move to (for UI path preview).
   *
   * Delegates to movementRules.getReachableHexes.
   *
   * @param state - Current game state
   * @param entityId - The unit to check
   * @returns Array of reachable hex coordinates
   */
  static getReachableHexes(state: GameState, entityId: EntityId): HexCoord[] {
    return rulesGetReachableHexes(state, entityId);
  }

  /**
   * Get movement cost for a path.
   *
   * Sums the movement cost for each step along the path.
   *
   * @param state - Current game state
   * @param path - Sequence of hex coordinates
   * @returns Total movement cost, or 0 if the path is empty
   */
  static getPathCost(state: GameState, path: HexCoord[]): number {
    if (path.length < 2) return 0;

    let totalCost = 0;
    for (let i = 1; i < path.length; i++) {
      const cost = calculateMovementCost(state, path[i - 1], path[i]);
      if (cost === 0) return 0; // Impassable hex in path
      totalCost += cost;
    }

    return totalCost;
  }
}

/**
 * Movement rules for "Realms of War".
 *
 * Pure functions implementing unit movement on the hex grid.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { EntityId, HexCoord, PlayerId } from '../core/types';
import type { GameState, EntityData, HexTile } from '../core/GameState';
import { hexKey, hexDistance } from '../core/types';
import { findPath, findReachable } from '../hex/pathfinding';
import { TERRAIN_TYPES } from '../../data/terrain';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Result of checking whether a unit can move to a target hex. */
export interface MovementResult {
  canMove: boolean;
  cost: number;
  remainingMP: number;
  reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Road reduces movement cost to this value per hex. */
const ROAD_MOVEMENT_COST = 0.5;

/** River adds this much MP to cross (unless road/bridge). */
const RIVER_CROSSING_COST = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get a hex tile from the game state, or null if out of bounds. */
function getHexTile(state: GameState, hex: HexCoord): HexTile | null {
  return state.map.tiles[hexKey(hex)] ?? null;
}

/** Get an entity by ID. */
function getEntity(state: GameState, entityId: EntityId): EntityData | null {
  return state.entities[entityId] ?? null;
}

/** Get the entity occupying a hex, if any. */
function getEntityAtHex(state: GameState, hex: HexCoord): EntityData | null {
  const key = hexKey(hex);
  return Object.values(state.entities).find((e) => hexKey(e.hex) === key) ?? null;
}

/** Check if two players are at war. */
function isAtWar(state: GameState, playerA: PlayerId, playerB: PlayerId): boolean {
  if (playerA === playerB) return false;
  const keyA = `${playerA}:${playerB}`;
  const keyB = `${playerB}:${playerA}`;
  const entry = state.diplomacy[keyA] ?? state.diplomacy[keyB];
  return !entry || entry.status === 'war';
}

/** Check if a unit has a specific ability. */
function hasAbility(entity: EntityData, ability: string): boolean {
  return entity.abilities.includes(ability);
}

/** Check if two entities belong to the same player. */
function isFriendly(entityA: EntityData, entityB: EntityData): boolean {
  return entityA.ownerId === entityB.ownerId;
}

// ─── Movement Cost ────────────────────────────────────────────────────────────

/**
 * Calculate the movement cost to move from one hex to an adjacent hex.
 *
 * Accounts for:
 * - Base terrain movement cost
 * - Road reduction (0.5 per hex if both hexes have roads)
 * - River crossing penalty (+1 MP unless road/bridge)
 * - Impassable terrain (mountain, water — unless unit has special ability)
 *
 * @param state - Current game state
 * @param fromHex - Starting hex (must be adjacent to toHex)
 * @param toHex - Destination hex
 * @param entityId - Optional entity ID for ability checks (e.g., water walking)
 * @returns Movement cost (0 = impassable)
 */
export function calculateMovementCost(
  state: GameState,
  fromHex: HexCoord,
  toHex: HexCoord,
  entityId?: EntityId,
): number {
  const toTile = getHexTile(state, toHex);
  if (!toTile) return 0; // Out of bounds = impassable

  const terrainData = TERRAIN_TYPES[toTile.terrain];
  if (!terrainData) return 0;

  // Check if terrain is impassable
  if (!terrainData.walkable) {
    // Special abilities can bypass certain terrain
    if (entityId) {
      const entity = getEntity(state, entityId);
      if (entity) {
        // Units with 'pathfinding' ability treat forest as 1 MP
        if (hasAbility(entity, 'pathfinding') && toTile.terrain === 'forest') {
          // Fall through to normal cost calculation with modified cost
        } else if (hasAbility(entity, 'swift') && toTile.terrain === 'swamp') {
          // Swift units treat swamp as 2 MP instead of 3
        } else {
          return 0; // Still impassable for this unit
        }
      }
    }
    if (!terrainData.walkable) return 0;
  }

  let cost = terrainData.movementCost;

  // Pathfinding ability: forest costs 1 instead of 2
  if (entityId) {
    const entity = getEntity(state, entityId);
    if (entity && hasAbility(entity, 'pathfinding') && toTile.terrain === 'forest') {
      cost = 1;
    }
    // Swift ability: swamp costs 2 instead of 3
    if (entity && hasAbility(entity, 'swift') && toTile.terrain === 'swamp') {
      cost = 2;
    }
  }

  // Road reduces cost to 0.5 per hex (both hexes must have roads)
  const fromTile = getHexTile(state, fromHex);
  if (fromTile && fromTile.hasRoad && toTile.hasRoad) {
    cost = ROAD_MOVEMENT_COST;
  }

  // River crossing penalty: +1 MP to cross a river (unless road/bridge)
  // Rivers are represented as a property on the hex; for simplicity, we check
  // if the destination hex has a river flag via resource or improvement.
  // Since HexTile doesn't have an explicit river field, we use a convention:
  // improvement === 'bridge' negates the river cost, and resource 'river' triggers it.
  if (toTile.resource === 'river' && toTile.improvement !== 'bridge') {
    cost += RIVER_CROSSING_COST;
  }

  return cost;
}

// ─── Can Move To ──────────────────────────────────────────────────────────────

/**
 * Determine whether a unit can move to a target hex.
 *
 * Checks:
 * - Unit exists and has remaining MP
 * - Target hex is on the map
 * - Target hex is not impassable
 * - Target hex is not occupied by an enemy unit
 * - Target hex is not occupied by a friendly unit (can pass through, not end on)
 * - Path exists from current position to target
 * - Player has territory access (via diplomacy)
 *
 * @param state - Current game state
 * @param entityId - The unit trying to move
 * @param targetHex - The destination hex
 * @returns Movement result with canMove flag, cost, and remaining MP
 */
export function canMoveTo(
  state: GameState,
  entityId: EntityId,
  targetHex: HexCoord,
): MovementResult {
  const entity = getEntity(state, entityId);
  if (!entity) {
    return { canMove: false, cost: 0, remainingMP: 0, reason: 'Entity not found' };
  }

  // Unit has already acted (moved and attacked) this turn
  if (entity.hasActed && entity.hasMoved) {
    return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Unit has already acted this turn' };
  }

  if (entity.movementPoints <= 0) {
    return { canMove: false, cost: 0, remainingMP: 0, reason: 'No movement points remaining' };
  }

  // Check if target is the same hex
  if (hexDistance(entity.hex, targetHex) === 0) {
    return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Already at target hex' };
  }

  // Check target hex exists
  const targetTile = getHexTile(state, targetHex);
  if (!targetTile) {
    return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Target hex is out of bounds' };
  }

  // Check target terrain is walkable
  const targetTerrain = TERRAIN_TYPES[targetTile.terrain];
  if (!targetTerrain || !targetTerrain.walkable) {
    // Special ability check
    const canTraverse = (hasAbility(entity, 'pathfinding') && targetTile.terrain === 'forest') ||
                        (hasAbility(entity, 'swift') && targetTile.terrain === 'swamp');
    if (!canTraverse) {
      return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Target terrain is impassable' };
    }
  }

  // Check if hex is occupied by an enemy unit (cannot move through)
  const occupant = getEntityAtHex(state, targetHex);
  if (occupant && !isFriendly(entity, occupant)) {
    return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Target hex occupied by enemy unit' };
  }

  // Check if hex is occupied by a friendly unit (can pass through but not end on)
  // This is handled in applyMovement — for canMoveTo, we still return true
  // because the unit might pass through. But if the target is the final
  // destination and it's occupied by a friendly, they cannot end there.
  if (occupant && isFriendly(entity, occupant)) {
    return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Target hex occupied by friendly unit — cannot end movement here' };
  }

  // Check territory access via diplomacy
  if (targetTile.owningCityId) {
    const city = state.cities[targetTile.owningCityId];
    if (city && city.ownerId !== entity.ownerId) {
      // Check if players are at peace or alliance (right of passage)
      const diplomacyKey1 = `${entity.ownerId}:${city.ownerId}`;
      const diplomacyKey2 = `${city.ownerId}:${entity.ownerId}`;
      const entry = state.diplomacy[diplomacyKey1] ?? state.diplomacy[diplomacyKey2];
      if (entry && (entry.status === 'peace' || entry.status === 'alliance')) {
        // Allied/peace units can enter territory — allowed
      } else if (isAtWar(state, entity.ownerId, city.ownerId)) {
        // At war — can enter enemy territory (that's the point of war)
      } else {
        return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'Cannot enter territory without diplomatic access' };
      }
    }
  }

  // Calculate path and cost using A* pathfinding
  const path = findPath(
    entity.hex,
    targetHex,
    (hex) => {
      const tile = getHexTile(state, hex);
      if (!tile) return false;
      const terrain = TERRAIN_TYPES[tile.terrain];
      if (!terrain) return false;
      // Allow impassable only for special abilities
      if (!terrain.walkable) {
        if (hasAbility(entity, 'pathfinding') && tile.terrain === 'forest') return true;
        if (hasAbility(entity, 'swift') && tile.terrain === 'swamp') return true;
        return false;
      }
      // Cannot pass through enemy-occupied hexes
      const hexOccupant = getEntityAtHex(state, hex);
      if (hexOccupant && !isFriendly(entity, hexOccupant) && hexDistance(hex, targetHex) !== 0) {
        return false; // Block path through enemy hexes (unless it's the target — which we already blocked)
      }
      return true;
    },
    (hex) => calculateMovementCost(state, entity.hex, hex, entityId),
  );

  if (path.length === 0) {
    return { canMove: false, cost: 0, remainingMP: entity.movementPoints, reason: 'No valid path to target' };
  }

  // Calculate total movement cost along the path
  let totalCost = 0;
  for (let i = 1; i < path.length; i++) {
    totalCost += calculateMovementCost(state, path[i - 1], path[i], entityId);
  }

  if (totalCost > entity.movementPoints) {
    return { canMove: false, cost: totalCost, remainingMP: entity.movementPoints, reason: 'Insufficient movement points' };
  }

  return {
    canMove: true,
    cost: totalCost,
    remainingMP: entity.movementPoints - totalCost,
  };
}

// ─── Validate Movement Path ─────────────────────────────────────────────────

/**
 * Result of validating a movement path step-by-step.
 */
export interface MovementPathValidationResult {
  valid: boolean;
  error?: string;
  totalCost?: number;
}

/**
 * Validate a movement path step-by-step.
 *
 * Checks:
 * 1. Path has at least 2 points (start + destination)
 * 2. First hex matches unit's current position
 * 3. Each step is adjacent (hex distance === 1)
 * 4. Each intermediate hex is walkable
 * 5. Path doesn't pass through enemy-occupied hexes (except the final hex for attack moves)
 * 6. Destination is not occupied by a friendly unit
 * 7. Total cost doesn't exceed unit's remaining movement points
 *
 * @param state - Current game state
 * @param entityId - The unit attempting to move
 * @param path - Sequence of hex coordinates (first = current position, last = destination)
 * @returns Validation result with valid flag, optional error, and total cost
 */
export function validateMovementPath(
  state: GameState,
  entityId: EntityId,
  path: HexCoord[],
): MovementPathValidationResult {
  // 1. Path must have at least 2 points
  if (!path || path.length < 2) {
    return { valid: false, error: 'Path must have at least 2 points' };
  }

  // 2. Find the unit
  const entity = getEntity(state, entityId);
  if (!entity) {
    return { valid: false, error: 'Unit not found' };
  }

  // 3. First hex must match current position
  const currentHex = entity.hex;
  if (!currentHex || path[0].q !== currentHex.q || path[0].r !== currentHex.r) {
    return { valid: false, error: 'Path must start at unit current position' };
  }

  // 4. Validate each step
  let totalCost = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];

    // Each step must be adjacent (distance 1)
    const dist = hexDistance(prev, curr);
    if (dist !== 1) {
      return { valid: false, error: `Non-adjacent step at index ${i}: distance ${dist}` };
    }

    // Check terrain walkability via calculateMovementCost
    const stepCost = calculateMovementCost(state, prev, curr, entityId);
    if (stepCost === 0) {
      return { valid: false, error: `Impassable terrain at (${curr.q},${curr.r})` };
    }
    totalCost += stepCost;

    // Check for enemy units blocking intermediate hexes (not the last one)
    if (i < path.length - 1) {
      const occupant = getEntityAtHex(state, curr);
      if (occupant && !isFriendly(entity, occupant)) {
        return { valid: false, error: `Enemy unit blocks path at (${curr.q},${curr.r})` };
      }
    }
  }

  // 5. Check destination not occupied by friendly unit
  const dest = path[path.length - 1];
  const destOccupant = getEntityAtHex(state, dest);
  if (destOccupant && isFriendly(entity, destOccupant) && destOccupant.id !== entityId) {
    return { valid: false, error: 'Destination occupied by friendly unit' };
  }

  // 6. Check total cost against movement points
  if (totalCost > entity.movementPoints) {
    return { valid: false, error: `Path cost ${totalCost} exceeds movement points ${entity.movementPoints}`, totalCost };
  }

  return { valid: true, totalCost };
}

// ─── Reachable Hexes ─────────────────────────────────────────────────────────

/**
 * Get all hexes reachable by a unit within its current movement points.
 *
 * Uses the Dijkstra-style flood fill from the hex pathfinding module,
 * filtering out hexes occupied by other units.
 *
 * @param state - Current game state
 * @param entityId - The unit to check
 * @returns Array of hex coordinates the unit can move to
 */
export function getReachableHexes(
  state: GameState,
  entityId: EntityId,
): HexCoord[] {
  const entity = getEntity(state, entityId);
  if (!entity || entity.movementPoints <= 0) return [];

  const reachable = findReachable(
    entity.hex,
    entity.movementPoints,
    (hex) => {
      const tile = getHexTile(state, hex);
      if (!tile) return false;
      const terrain = TERRAIN_TYPES[tile.terrain];
      if (!terrain) return false;
      if (!terrain.walkable) {
        if (hasAbility(entity, 'pathfinding') && tile.terrain === 'forest') return true;
        if (hasAbility(entity, 'swift') && tile.terrain === 'swamp') return true;
        return false;
      }
      // Cannot pass through enemy-occupied hexes
      const occupant = getEntityAtHex(state, hex);
      if (occupant && !isFriendly(entity, occupant)) return false;
      return true;
    },
    (hex) => calculateMovementCost(state, entity.hex, hex, entityId),
  );

  // Filter out hexes occupied by friendly units (can't end on them)
  // Also filter out the starting hex
  const result: HexCoord[] = [];
  for (const hex of reachable) {
    if (hexDistance(hex, entity.hex) === 0) continue;
    const occupant = getEntityAtHex(state, hex);
    if (occupant && isFriendly(entity, occupant)) continue;
    result.push(hex);
  }

  return result;
}

// ─── Apply Movement ──────────────────────────────────────────────────────────

/**
 * Apply movement to the game state, moving a unit along a path.
 *
 * The path must be a valid sequence of adjacent hexes from the unit's
 * current position. The unit's movement points are deducted and its
 * position is updated.
 *
 * @param state - Current game state (not mutated)
 * @param entityId - The unit to move
 * @param path - Sequence of hex coordinates to follow (first = current, last = destination)
 * @returns New game state with the unit moved
 */
export function applyMovement(
  state: GameState,
  entityId: EntityId,
  path: HexCoord[],
): GameState {
  const entity = getEntity(state, entityId);
  if (!entity) return state;

  if (path.length < 2) return state;

  // Calculate total cost
  let totalCost = 0;
  for (let i = 1; i < path.length; i++) {
    totalCost += calculateMovementCost(state, path[i - 1], path[i], entityId);
  }

  // Verify unit has enough MP
  if (totalCost > entity.movementPoints) return state;

  const destination = path[path.length - 1];

  // Verify destination is not occupied by a friendly unit
  const occupant = getEntityAtHex(state, destination);
  if (occupant && isFriendly(entity, occupant)) return state;

  // Create new state with updated entity
  const newEntities = { ...state.entities };
  newEntities[entityId] = {
    ...entity,
    hex: destination,
    movementPoints: entity.movementPoints - totalCost,
    hasMoved: true,
  };

  return {
    ...state,
    entities: newEntities,
  };
}

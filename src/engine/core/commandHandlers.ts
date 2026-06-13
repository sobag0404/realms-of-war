/**
 * Command handlers for additional command types (Fortify, Improvement, Market).
 *
 * Each command has a validate function and an apply function.
 * These are designed to be imported by GameEngine so the new command types
 * are handled alongside the existing ones.
 *
 * Validation functions check the command is legal given the current state.
 * Apply functions return a new immutable GameState with the command's effects.
 */

import type { GameState, HexTile } from './GameState';
import type { ResourceId, ResourceYield } from './types';
import type { EventBus } from './EventBus';
import type {
  FortifyUnitCommand,
  BuildImprovementCommand,
  SellResourceCommand,
  BuyResourceCommand,
} from './CommandQueue';
import { hexKey } from './types';

// ─── Validation Result ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ─── Market Prices ─────────────────────────────────────────────────────────────

/** Sell price per unit of each resource (fraction of buy price). */
const SELL_PRICE_FACTOR = 0.5;

/** Base buy prices per unit of each resource. */
const BUY_PRICES: Record<ResourceId, number> = {
  gold: 0, // Cannot buy gold with gold
  food: 4,
  wood: 3,
  stone: 4,
  iron: 8,
  mana: 10,
  progress: 6,
  science: 8,
};

/** Compute the sell price for a resource. */
function sellPrice(resource: ResourceId): number {
  const buy = BUY_PRICES[resource];
  if (buy === 0) return 0;
  return Math.max(1, Math.floor(buy * SELL_PRICE_FACTOR));
}

/** Compute the buy price for a resource. */
function buyPrice(resource: ResourceId): number {
  return BUY_PRICES[resource] ?? 0;
}

// ─── Improvement Validation ────────────────────────────────────────────────────

/** Valid improvement types. */
const VALID_IMPROVEMENTS = new Set([
  'farm',
  'mine',
  'lumber_mill',
  'quarry_improvement',
  'road',
  'mana_focus',
]);

/** Terrain types that support each improvement. */
const IMPROVEMENT_TERRAIN: Record<string, Set<string>> = {
  farm: new Set(['plains', 'forest']),
  mine: new Set(['hills', 'mountain']),
  lumber_mill: new Set(['forest']),
  quarry_improvement: new Set(['hills', 'mountain']),
  road: new Set(['plains', 'forest', 'hills', 'desert']),
  mana_focus: new Set(['swamp', 'ruins']),
};

// ─── FortifyUnit ───────────────────────────────────────────────────────────────

/**
 * Validate a FortifyUnit command.
 * Checks: entity exists, belongs to player, hasn't acted.
 */
export function validateFortifyUnit(
  state: GameState,
  command: FortifyUnitCommand,
): ValidationResult {
  if (command.playerId !== state.activePlayerId) {
    return { valid: false, error: 'Not your turn' };
  }
  const entity = state.entities[command.entityId];
  if (!entity) {
    return { valid: false, error: 'Entity not found' };
  }
  if (entity.ownerId !== command.playerId) {
    return { valid: false, error: 'You do not own this unit' };
  }
  if (entity.hasActed) {
    return { valid: false, error: 'Unit has already acted this turn' };
  }
  if (entity.statusEffects.includes('fortified')) {
    return { valid: false, error: 'Unit is already fortified' };
  }
  return { valid: true };
}

/**
 * Apply a FortifyUnit command.
 * Adds 'fortified' to entity status effects, sets hasActed=true.
 */
export function applyFortifyUnit(
  state: GameState,
  command: FortifyUnitCommand,
  _eventBus: EventBus,
): GameState {
  const entity = state.entities[command.entityId];
  if (!entity) return state;

  return {
    ...state,
    entities: {
      ...state.entities,
      [command.entityId]: {
        ...entity,
        statusEffects: [...entity.statusEffects, 'fortified'],
        hasActed: true,
        movementPoints: 0,
      },
    },
  };
}

// ─── BuildImprovement ──────────────────────────────────────────────────────────

/**
 * Validate a BuildImprovement command.
 * Checks: entity is a worker at the hex, improvement is valid for terrain.
 */
export function validateBuildImprovement(
  state: GameState,
  command: BuildImprovementCommand,
): ValidationResult {
  if (command.playerId !== state.activePlayerId) {
    return { valid: false, error: 'Not your turn' };
  }
  const entity = state.entities[command.entityId];
  if (!entity) {
    return { valid: false, error: 'Entity not found' };
  }
  if (entity.ownerId !== command.playerId) {
    return { valid: false, error: 'You do not own this unit' };
  }
  if (entity.typeId !== 'worker') {
    return { valid: false, error: 'Only workers can build improvements' };
  }
  if (entity.hasActed) {
    return { valid: false, error: 'Unit has already acted this turn' };
  }

  // Check entity is at the specified hex
  if (entity.hex.q !== command.hex.q || entity.hex.r !== command.hex.r) {
    return { valid: false, error: 'Worker is not at the specified hex' };
  }

  // Validate improvement type
  if (!VALID_IMPROVEMENTS.has(command.improvementType)) {
    return { valid: false, error: `Invalid improvement type: ${command.improvementType}` };
  }

  // Check terrain compatibility
  const tileKey = hexKey(command.hex);
  const tile = state.map.tiles[tileKey];
  if (!tile) {
    return { valid: false, error: 'Target hex does not exist on the map' };
  }

  const allowedTerrains = IMPROVEMENT_TERRAIN[command.improvementType];
  if (allowedTerrains && !allowedTerrains.has(tile.terrain)) {
    return {
      valid: false,
      error: `Cannot build ${command.improvementType} on ${tile.terrain} terrain`,
    };
  }

  // Check if improvement already exists on this hex
  if (tile.improvement) {
    return { valid: false, error: 'An improvement already exists on this hex' };
  }

  return { valid: true };
}

/**
 * Apply a BuildImprovement command.
 * Sets tile.improvement, marks worker as having acted (consumes movement).
 */
export function applyBuildImprovement(
  state: GameState,
  command: BuildImprovementCommand,
  _eventBus: EventBus,
): GameState {
  const entity = state.entities[command.entityId];
  if (!entity) return state;

  const tileKey = hexKey(command.hex);
  const tile = state.map.tiles[tileKey];
  if (!tile) return state;

  // Compute improvement yield bonus
  const improvementYield = computeImprovementYield(command.improvementType, tile);

  const updatedTile: HexTile = {
    ...tile,
    improvement: command.improvementType,
    yield: { ...tile.yield, ...improvementYield },
    // Road also sets hasRoad flag
    hasRoad: command.improvementType === 'road' ? true : tile.hasRoad,
  };

  return {
    ...state,
    map: {
      ...state.map,
      tiles: {
        ...state.map.tiles,
        [tileKey]: updatedTile,
      },
    },
    entities: {
      ...state.entities,
      [command.entityId]: {
        ...entity,
        hasActed: true,
        movementPoints: 0,
      },
    },
  };
}

// ─── SellResource ──────────────────────────────────────────────────────────────

/**
 * Validate a SellResource command.
 * Checks: player has the resource amount.
 */
export function validateSellResource(
  state: GameState,
  command: SellResourceCommand,
): ValidationResult {
  if (command.playerId !== state.activePlayerId) {
    return { valid: false, error: 'Not your turn' };
  }
  const player = state.players[command.playerId];
  if (!player) {
    return { valid: false, error: 'Player not found' };
  }
  if (command.amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  if (command.resource === 'gold') {
    return { valid: false, error: 'Cannot sell gold' };
  }
  const available = player.resources[command.resource] ?? 0;
  if (available < command.amount) {
    return { valid: false, error: `Not enough ${command.resource} to sell` };
  }
  return { valid: true };
}

/**
 * Apply a SellResource command.
 * Deducts resource, adds gold at sell price.
 */
export function applySellResource(
  state: GameState,
  command: SellResourceCommand,
  _eventBus: EventBus,
): GameState {
  const player = state.players[command.playerId];
  if (!player) return state;

  const price = sellPrice(command.resource);
  const goldGained = price * command.amount;

  const oldResourceAmount = player.resources[command.resource] ?? 0;
  const oldGold = player.resources.gold ?? 0;

  return {
    ...state,
    players: {
      ...state.players,
      [command.playerId]: {
        ...player,
        resources: {
          ...player.resources,
          [command.resource]: oldResourceAmount - command.amount,
          gold: oldGold + goldGained,
        },
      },
    },
  };
}

// ─── BuyResource ───────────────────────────────────────────────────────────────

/**
 * Validate a BuyResource command.
 * Checks: player has enough gold.
 */
export function validateBuyResource(
  state: GameState,
  command: BuyResourceCommand,
): ValidationResult {
  if (command.playerId !== state.activePlayerId) {
    return { valid: false, error: 'Not your turn' };
  }
  const player = state.players[command.playerId];
  if (!player) {
    return { valid: false, error: 'Player not found' };
  }
  if (command.amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  if (command.resource === 'gold') {
    return { valid: false, error: 'Cannot buy gold with gold' };
  }

  const price = buyPrice(command.resource);
  if (price === 0) {
    return { valid: false, error: `${command.resource} is not available for purchase` };
  }

  const totalCost = price * command.amount;
  const availableGold = player.resources.gold ?? 0;
  if (availableGold < totalCost) {
    return {
      valid: false,
      error: `Not enough gold (need ${totalCost}, have ${availableGold})`,
    };
  }
  return { valid: true };
}

/**
 * Apply a BuyResource command.
 * Deducts gold, adds resource at buy price.
 */
export function applyBuyResource(
  state: GameState,
  command: BuyResourceCommand,
  _eventBus: EventBus,
): GameState {
  const player = state.players[command.playerId];
  if (!player) return state;

  const price = buyPrice(command.resource);
  const totalCost = price * command.amount;

  const oldGold = player.resources.gold ?? 0;
  const oldResourceAmount = player.resources[command.resource] ?? 0;

  return {
    ...state,
    players: {
      ...state.players,
      [command.playerId]: {
        ...player,
        resources: {
          ...player.resources,
          gold: oldGold - totalCost,
          [command.resource]: oldResourceAmount + command.amount,
        },
      },
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute the yield bonus from an improvement on a given tile.
 */
function computeImprovementYield(
  improvementType: string,
  _tile: HexTile,
): ResourceYield {
  switch (improvementType) {
    case 'farm':
      return { food: 2 };
    case 'mine':
      return { stone: 1, iron: 1 };
    case 'lumber_mill':
      return { wood: 2 };
    case 'quarry_improvement':
      return { stone: 2 };
    case 'road':
      return { gold: 1 };
    case 'mana_focus':
      return { mana: 2 };
    default:
      return {};
  }
}

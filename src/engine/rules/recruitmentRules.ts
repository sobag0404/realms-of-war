/**
 * Unit recruitment rules for "Realms of War".
 *
 * Pure functions implementing unit recruitment in cities.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { BuildingTypeId, CityId, EntityId, HexCoord, PlayerId, ResourceId, ResourceYield, TechId, UnitTypeId } from '../core/types';
import type { GameState, EntityData, CityState, ProductionItem } from '../core/GameState';
import { hexKey, hexDistance, HEX_DIRECTIONS } from '../core/types';
import { UNIT_TYPES, PLAYER_UNIT_IDS } from '../../data/units';
import { BUILDINGS } from '../../data/buildings';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base production cost multiplier (1 production point = 1 gold equivalent). */
const PRODUCTION_PER_TURN_BASE = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get a hex tile from the game state. */
function getHexTile(state: GameState, hex: HexCoord) {
  return state.map.tiles[hexKey(hex)];
}

/** Check if a player has a specific tech. */
function hasTech(state: GameState, playerId: PlayerId, techId: TechId): boolean {
  const player = state.players[playerId];
  return player ? player.techs.includes(techId) : false;
}

/** Check if a city has a specific building. */
function hasBuilding(city: CityState, buildingId: BuildingTypeId): boolean {
  return city.buildings.includes(buildingId);
}

/** Get an entity at a specific hex. */
function getEntityAtHex(state: GameState, hex: HexCoord): EntityData | null {
  const key = hexKey(hex);
  return Object.values(state.entities).find((e) => hexKey(e.hex) === key) ?? null;
}

/** Generate a unique entity ID. */
function generateEntityId(): EntityId {
  return `unit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/** Check if a player can afford a cost. */
function canAfford(state: GameState, playerId: PlayerId, cost: ResourceYield): boolean {
  const player = state.players[playerId];
  if (!player) return false;

  for (const key of Object.keys(cost) as ResourceId[]) {
    const required = cost[key] ?? 0;
    const available = player.resources[key] ?? 0;
    if (available < required) return false;
  }
  return true;
}

/** Deduct resources from a player. */
function deductResources(state: GameState, playerId: PlayerId, cost: ResourceYield): GameState {
  const player = state.players[playerId];
  if (!player) return state;

  const newResources = { ...player.resources };
  for (const key of Object.keys(cost) as ResourceId[]) {
    newResources[key] = (newResources[key] ?? 0) - (cost[key] ?? 0);
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        resources: newResources,
      },
    },
  };
}

// ─── Building-Unit Mapping ───────────────────────────────────────────────────

/**
 * Mapping of which buildings enable which unit categories.
 * Units require the corresponding building to be present in the city.
 */
const BUILDING_UNIT_CATEGORIES: Record<string, string[]> = {
  barracks: ['melee'],        // Spearman, Swordsman
  archery_range: ['ranged'],  // Archer, Crossbowman
  mage_tower: ['mage'],       // Mage
  siege_yard: ['siege'],      // Catapult
};

/**
 * Mapping of unit type IDs to their training category.
 */
const UNIT_CATEGORIES: Record<string, string> = {
  spearman: 'melee',
  swordsman: 'melee',
  archer: 'ranged',
  crossbowman: 'ranged',
  mage: 'mage',
  catapult: 'siege',
  knight: 'melee',   // Knight requires stable (chivalry), categorized as melee
  paladin: 'melee',  // Paladin requires divine_right
  hero: 'melee',
  scout: 'melee',    // Scouts don't require a building
  settler: 'melee',  // Settlers don't require a building
  worker: 'melee',   // Workers don't require a building
};

/**
 * Units that don't require any specific building to recruit.
 * These are "base" units available from the start.
 */
const NO_BUILDING_REQUIRED: UnitTypeId[] = ['settler', 'worker', 'scout', 'spearman', 'hero'];

// ─── Can Recruit Unit ────────────────────────────────────────────────────────

/**
 * Check whether a player can recruit a specific unit type in a city.
 *
 * Requirements:
 * - City exists and belongs to the player
 * - Unit type is recruitable (not enemy-only)
 * - City has the appropriate building for the unit type
 * - Player has the required technology
 * - Player has the required era
 * - Player can afford the recruitment cost
 * - City is not already producing another unit
 * - City hex or adjacent hex has space for the new unit
 *
 * @param state - Current game state
 * @param playerId - Player attempting recruitment
 * @param cityId - City where recruitment happens
 * @param unitTypeId - Type of unit to recruit
 * @returns Whether the unit can be recruited, with reason if not
 */
export function canRecruitUnit(
  state: GameState,
  playerId: PlayerId,
  cityId: CityId,
  unitTypeId: string,
): { canRecruit: boolean; reason?: string } {
  const city = state.cities[cityId];
  if (!city) {
    return { canRecruit: false, reason: 'City not found' };
  }

  if (city.ownerId !== playerId) {
    return { canRecruit: false, reason: 'City does not belong to this player' };
  }

  // Check unit type exists and is recruitable
  const unitType = UNIT_TYPES[unitTypeId as keyof typeof UNIT_TYPES];
  if (!unitType) {
    return { canRecruit: false, reason: 'Unknown unit type' };
  }

  if (unitType.isEnemy) {
    return { canRecruit: false, reason: 'Cannot recruit enemy units' };
  }

  // Check required tech
  if (unitType.tech && !hasTech(state, playerId, unitType.tech as TechId)) {
    return { canRecruit: false, reason: `Missing required technology: ${unitType.tech}` };
  }

  // Check required era
  const player = state.players[playerId];
  if (player) {
    const eraOrder = ['primitives', 'earlyCiv', 'medieval', 'renaissance', 'rift'];
    const unitEraIndex = eraOrder.indexOf(unitType.era);
    const playerEraIndex = eraOrder.indexOf(player.era);
    if (playerEraIndex < unitEraIndex) {
      return { canRecruit: false, reason: `Requires ${unitType.era} era` };
    }
  }

  // Check building requirement
  if (!NO_BUILDING_REQUIRED.includes(unitTypeId as UnitTypeId)) {
    const category = UNIT_CATEGORIES[unitTypeId];
    if (category) {
      const requiredBuilding = Object.entries(BUILDING_UNIT_CATEGORIES).find(
        ([_, categories]) => categories.includes(category),
      );
      if (requiredBuilding && !hasBuilding(city, requiredBuilding[0] as BuildingTypeId)) {
        return { canRecruit: false, reason: `Requires ${requiredBuilding[0]} building` };
      }
    }
  }

  // Check if city is already producing a unit
  const currentUnitProduction = city.productionQueue.find((item) => item.kind === 'unit');
  if (currentUnitProduction) {
    return { canRecruit: false, reason: 'City is already recruiting a unit' };
  }

  // Check if player can afford the cost
  if (!canAfford(state, playerId, unitType.cost as ResourceYield)) {
    return { canRecruit: false, reason: 'Insufficient resources' };
  }

  // Check if there's space for the new unit (city hex or adjacent)
  const cityHexOccupied = getEntityAtHex(state, city.hex) !== null;
  let hasAdjacentSpace = false;
  for (let d = 0; d < 6; d++) {
    const adjHex: HexCoord = {
      q: city.hex.q + HEX_DIRECTIONS[d].q,
      r: city.hex.r + HEX_DIRECTIONS[d].r,
    };
    const adjOccupant = getEntityAtHex(state, adjHex);
    const adjTile = getHexTile(state, adjHex);
    if (!adjOccupant && adjTile) {
      const terrain = adjTile.terrain;
      if (terrain !== 'mountain' && terrain !== 'water') {
        hasAdjacentSpace = true;
        break;
      }
    }
  }

  if (cityHexOccupied && !hasAdjacentSpace) {
    return { canRecruit: false, reason: 'No space for new unit near city' };
  }

  return { canRecruit: true };
}

// ─── Recruitable Units ───────────────────────────────────────────────────────

/**
 * Get all unit types that can be recruited in a city.
 *
 * Filters based on available buildings, techs, era, and resources.
 *
 * @param state - Current game state
 * @param cityId - City to check
 * @returns Array of unit type IDs that can be recruited
 */
export function getRecruitableUnits(
  state: GameState,
  cityId: CityId,
): string[] {
  const city = state.cities[cityId];
  if (!city) return [];

  const result: string[] = [];

  for (const unitTypeId of PLAYER_UNIT_IDS) {
    const check = canRecruitUnit(state, city.ownerId, cityId, unitTypeId);
    if (check.canRecruit) {
      result.push(unitTypeId);
    }
  }

  return result;
}

// ─── Recruitment Cost ────────────────────────────────────────────────────────

/**
 * Get the resource cost to recruit a unit type.
 *
 * @param unitTypeId - Type of unit
 * @returns Resource yield cost
 */
export function getRecruitmentCost(
  unitTypeId: string,
): ResourceYield {
  const unitType = UNIT_TYPES[unitTypeId as keyof typeof UNIT_TYPES];
  if (!unitType) return {};

  return { ...unitType.cost } as ResourceYield;
}

// ─── Start Recruitment ───────────────────────────────────────────────────────

/**
 * Start recruiting a unit in a city.
 *
 * Deducts the recruitment cost from the player's resources and
 * adds the unit to the city's production queue.
 *
 * @param state - Current game state (not mutated)
 * @param playerId - Player recruiting the unit
 * @param cityId - City where recruitment happens
 * @param unitTypeId - Type of unit to recruit
 * @returns New game state with recruitment started
 */
export function startRecruitment(
  state: GameState,
  playerId: PlayerId,
  cityId: CityId,
  unitTypeId: string,
): GameState {
  const check = canRecruitUnit(state, playerId, cityId, unitTypeId);
  if (!check.canRecruit) return state;

  const unitType = UNIT_TYPES[unitTypeId as keyof typeof UNIT_TYPES];
  if (!unitType) return state;

  const city = state.cities[cityId];
  if (!city) return state;

  // Deduct resources
  let newState = deductResources(state, playerId, unitType.cost as ResourceYield);

  // Calculate production cost (sum of gold cost + special resources, minimum 1)
  const costValues = Object.values(unitType.cost) as number[];
  const productionCost = Math.max(1, costValues.reduce((sum, v) => sum + v, 0) / 2);

  // Add to production queue
  const productionItem: ProductionItem = {
    id: unitTypeId,
    kind: 'unit',
    progress: 0,
    cost: productionCost,
  };

  newState = {
    ...newState,
    cities: {
      ...newState.cities,
      [cityId]: {
        ...city,
        productionQueue: [...city.productionQueue, productionItem],
      },
    },
  };

  return newState;
}

// ─── Process Recruitment ─────────────────────────────────────────────────────

/**
 * Process one turn of recruitment progress for a city.
 *
 * Adds production points to the current production item.
 * If the item is completed, creates the new unit entity.
 *
 * @param state - Current game state (not mutated)
 * @param cityId - City to process
 * @returns New game state and completion status
 */
export function processRecruitment(
  state: GameState,
  cityId: CityId,
): { state: GameState; completed: boolean; unitId?: EntityId } {
  const city = state.cities[cityId];
  if (!city || city.productionQueue.length === 0) {
    return { state, completed: false };
  }

  const currentItem = city.productionQueue[0];
  if (currentItem.kind !== 'unit') {
    return { state, completed: false };
  }

  // Add production progress
  const productionPerTurn = city.productionPerTurn || PRODUCTION_PER_TURN_BASE;
  const newProgress = currentItem.progress + productionPerTurn;

  // Check if completed
  if (newProgress >= currentItem.cost) {
    // Create the new unit
    const unitType = UNIT_TYPES[currentItem.id as keyof typeof UNIT_TYPES];
    if (!unitType) {
      // Remove invalid production item
      const newQueue = city.productionQueue.slice(1);
      return {
        state: {
          ...state,
          cities: {
            ...state.cities,
            [cityId]: {
              ...city,
              productionQueue: newQueue,
            },
          },
        },
        completed: false,
      };
    }

    // Find placement hex
    let placementHex: HexCoord = city.hex;
    const cityOccupant = getEntityAtHex(state, city.hex);

    if (cityOccupant) {
      // Find adjacent empty hex
      let placed = false;
      for (let d = 0; d < 6; d++) {
        const adjHex: HexCoord = {
          q: city.hex.q + HEX_DIRECTIONS[d].q,
          r: city.hex.r + HEX_DIRECTIONS[d].r,
        };
        const adjOccupant = getEntityAtHex(state, adjHex);
        const adjTile = getHexTile(state, adjHex);
        if (!adjOccupant && adjTile) {
          const terrain = adjTile.terrain;
          if (terrain !== 'mountain' && terrain !== 'water') {
            placementHex = adjHex;
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        // No space — unit goes into queue overflow, stays in production
        return { state, completed: false };
      }
    }

    const newUnitId = generateEntityId();
    const newEntity: EntityData = {
      id: newUnitId,
      typeId: currentItem.id as UnitTypeId,
      ownerId: city.ownerId,
      hex: placementHex,
      movementPoints: unitType.mov,
      maxMovement: unitType.mov,
      hp: unitType.hp,
      maxHp: unitType.hp,
      attack: unitType.atk,
      defense: unitType.def,
      attackType: unitType.range > 1 ? 'ranged' : 'melee',
      range: unitType.range,
      hasActed: false,
      hasMoved: false,
      xp: 0,
      level: 1,
      promotions: [],
      upkeep: unitType.upkeep as ResourceYield,
      abilities: [...unitType.abilities],
      statusEffects: [],
    };

    // Remove completed item from queue
    const newQueue = city.productionQueue.slice(1);

    const newState: GameState = {
      ...state,
      entities: {
        ...state.entities,
        [newUnitId]: newEntity,
      },
      cities: {
        ...state.cities,
        [cityId]: {
          ...city,
          productionQueue: newQueue,
        },
      },
    };

    return { state: newState, completed: true, unitId: newUnitId };
  }

  // Not completed yet — update progress
  const updatedItem: ProductionItem = {
    ...currentItem,
    progress: newProgress,
  };

  const newQueue = [updatedItem, ...city.productionQueue.slice(1)];

  return {
    state: {
      ...state,
      cities: {
        ...state.cities,
        [cityId]: {
          ...city,
          productionQueue: newQueue,
        },
      },
    },
    completed: false,
  };
}

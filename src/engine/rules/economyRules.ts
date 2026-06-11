/**
 * Economy rules for "Realms of War".
 *
 * Pure functions implementing resource generation, spending, and bankruptcy.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { CityId, EntityId, HexCoord, PlayerId, ResourceId, ResourceYield } from '../core/types';
import type { GameState, CityState, EntityData, HexTile } from '../core/GameState';
import { hexKey } from '../core/types';
import { TERRAIN_TYPES } from '../../data/terrain';
import { BUILDINGS } from '../../data/buildings';
import { RESOURCES } from '../../data/resources';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Trade route gold bonus per route per turn. */
const TRADE_ROUTE_GOLD_BONUS = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get a hex tile from the game state. */
function getHexTile(state: GameState, hex: HexCoord): HexTile | null {
  return state.map.tiles[hexKey(hex)] ?? null;
}

/** Add two ResourceYields together. */
function addYields(a: ResourceYield, b: ResourceYield): ResourceYield {
  const result: ResourceYield = { ...a };
  for (const key of Object.keys(b) as ResourceId[]) {
    result[key] = (result[key] ?? 0) + (b[key] ?? 0);
  }
  return result;
}

/** Subtract a ResourceYield from another. */
function subtractYields(a: ResourceYield, b: ResourceYield): ResourceYield {
  const result: ResourceYield = { ...a };
  for (const key of Object.keys(b) as ResourceId[]) {
    result[key] = (result[key] ?? 0) - (b[key] ?? 0);
  }
  return result;
}

/** Scale a ResourceYield by a multiplier. */
function scaleYield(yield_: ResourceYield, multiplier: number): ResourceYield {
  const result: ResourceYield = {};
  for (const key of Object.keys(yield_) as ResourceId[]) {
    result[key] = Math.floor((yield_[key] ?? 0) * multiplier);
  }
  return result;
}

// ─── Hex Yield ────────────────────────────────────────────────────────────────

/**
 * Calculate the resource yield of a single hex.
 *
 * Yield comes from:
 * - Base terrain yield
 * - Resource on the hex
 * - Improvement built on the hex
 * - Building bonuses from the owning city
 *
 * @param state - Current game state
 * @param hex - Hex coordinate to evaluate
 * @param cityId - Optional owning city ID (for building bonus calculations)
 * @returns Resource yield for this hex
 */
export function getHexYield(
  state: GameState,
  hex: HexCoord,
  cityId: CityId | null,
): ResourceYield {
  const tile = getHexTile(state, hex);
  if (!tile) return {};

  let totalYield: ResourceYield = {};

  // Base terrain yield
  const terrainData = TERRAIN_TYPES[tile.terrain];
  if (terrainData) {
    totalYield = addYields(totalYield, terrainData.yields as ResourceYield);
  }

  // Resource on the hex (additional yield from strategic/luxury resources)
  if (tile.resource) {
    // Resource yields are defined per-resource; we add a flat bonus based on type
    const resourceBonuses: Record<string, ResourceYield> = {
      iron_deposit: { iron: 2 },
      gold_vein: { gold: 3 },
      mana_crystal: { mana: 2 },
      fertile_soil: { food: 2 },
      ancient_ruins: { science: 2, progress: 1 },
      oasis: { food: 1, gold: 1 },
      fish: { food: 2 },
      horses: { food: 1, gold: 1 },
      timber: { wood: 2 },
      quarry: { stone: 2 },
      river: { gold: 1, food: 1 },
    };
    const bonus = resourceBonuses[tile.resource];
    if (bonus) {
      totalYield = addYields(totalYield, bonus);
    }
  }

  // Improvement yield bonus
  const improvementBonuses: Record<string, ResourceYield> = {
    farm: { food: 2 },
    mine: { stone: 1, iron: 1 },
    lumber_mill: { wood: 2 },
    quarry_improvement: { stone: 2 },
    fishing: { food: 2 },
    trading_post: { gold: 2 },
  };
  if (tile.improvement) {
    const improvementYield = improvementBonuses[tile.improvement];
    if (improvementYield) {
      totalYield = addYields(totalYield, improvementYield);
    }
  }

  // Tile yield override (from improvements or special features)
  if (tile.yield) {
    totalYield = addYields(totalYield, tile.yield);
  }

  return totalYield;
}

// ─── Income Calculation ──────────────────────────────────────────────────────

/**
 * Calculate total income for a player per turn.
 *
 * Income sources:
 * - Worked hex yields from all cities
 * - Building yield bonuses
 * - Trade routes between cities
 *
 * @param state - Current game state
 * @param playerId - Player to calculate income for
 * @returns Total resource income per turn
 */
export function calculateIncome(
  state: GameState,
  playerId: PlayerId,
): ResourceYield {
  let totalIncome: ResourceYield = {};

  // Income from each city
  const playerCities = Object.values(state.cities).filter((c) => c.ownerId === playerId);

  for (const city of playerCities) {
    // Hex yields from worked hexes
    for (const hexKey_ of city.workedHexes) {
      const [q, r] = hexKey_.split(',').map(Number);
      const hex: HexCoord = { q, r };
      const hexYield = getHexYield(state, hex, city.id);
      totalIncome = addYields(totalIncome, hexYield);
    }

    // Building yield bonuses
    for (const buildingId of city.buildings) {
      const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
      if (building) {
        for (const effect of building.effects) {
          if (effect.type === 'yield_bonus' && effect.target && effect.value) {
            totalIncome = addYields(totalIncome, { [effect.target]: effect.value });
          }
        }
      }
    }

    // City center base yield
    totalIncome = addYields(totalIncome, { gold: 2, food: 1 });
  }

  // Trade route income
  const citiesWithMarket = playerCities.filter((c) => c.buildings.includes('market'));
  for (const city of citiesWithMarket) {
    // Each city with a market generates trade route income with other market cities
    const otherMarkets = citiesWithMarket.filter((c) => c.id !== city.id);
    const tradeIncome = otherMarkets.length * TRADE_ROUTE_GOLD_BONUS;
    if (tradeIncome > 0) {
      totalIncome = addYields(totalIncome, { gold: tradeIncome });
    }
  }

  return totalIncome;
}

// ─── Upkeep Calculation ──────────────────────────────────────────────────────

/**
 * Calculate total upkeep costs for a player per turn.
 *
 * Upkeep comes from:
 * - Unit maintenance (gold, food, mana, etc.)
 * - Building maintenance
 *
 * @param state - Current game state
 * @param playerId - Player to calculate upkeep for
 * @returns Total resource upkeep per turn (positive values = cost)
 */
export function calculateUpkeep(
  state: GameState,
  playerId: PlayerId,
): ResourceYield {
  let totalUpkeep: ResourceYield = {};

  // Unit upkeep
  const playerUnits = Object.values(state.entities).filter((e) => e.ownerId === playerId);
  for (const unit of playerUnits) {
    totalUpkeep = addYields(totalUpkeep, unit.upkeep);
  }

  // Building upkeep
  const playerCities = Object.values(state.cities).filter((c) => c.ownerId === playerId);
  for (const city of playerCities) {
    for (const buildingId of city.buildings) {
      const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
      if (building && building.upkeep) {
        totalUpkeep = addYields(totalUpkeep, building.upkeep as ResourceYield);
      }
    }
  }

  return totalUpkeep;
}

// ─── Apply Income ────────────────────────────────────────────────────────────

/**
 * Apply income and deduct upkeep for a player, updating their resource stockpile.
 *
 * @param state - Current game state (not mutated)
 * @param playerId - Player to apply income for
 * @returns New game state with updated resources
 */
export function applyIncome(
  state: GameState,
  playerId: PlayerId,
): GameState {
  const player = state.players[playerId];
  if (!player || !player.isAlive) return state;

  const income = calculateIncome(state, playerId);
  const upkeep = calculateUpkeep(state, playerId);

  // Net income = income - upkeep
  const netIncome = subtractYields(income, upkeep);

  // Update player resources
  const newResources = { ...player.resources };
  for (const key of Object.keys(netIncome) as ResourceId[]) {
    newResources[key] = (newResources[key] ?? 0) + (netIncome[key] ?? 0);
    // Resources cannot go below 0 (except gold which can be negative for debt)
    if (key !== 'gold') {
      newResources[key] = Math.max(0, newResources[key]);
    }
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        resources: newResources,
        incomePerTurn: income,
        upkeepPerTurn: upkeep,
      },
    },
  };
}

// ─── Bankruptcy Check ────────────────────────────────────────────────────────

/**
 * Check if a player is bankrupt (negative gold) and determine which units desert.
 *
 * When gold < 0, units start deserting (lowest HP first) until the player
 * can afford their upkeep or runs out of units.
 *
 * @param state - Current game state
 * @param playerId - Player to check
 * @returns Bankruptcy status with deficit and list of deserting unit IDs
 */
export function checkBankruptcy(
  state: GameState,
  playerId: PlayerId,
): { isBankrupt: boolean; deficit: number; desertingUnits: EntityId[] } {
  const player = state.players[playerId];
  if (!player) {
    return { isBankrupt: false, deficit: 0, desertingUnits: [] };
  }

  const gold = player.resources.gold ?? 0;
  if (gold >= 0) {
    return { isBankrupt: false, deficit: 0, desertingUnits: [] };
  }

  const deficit = Math.abs(gold);
  const desertingUnits: EntityId[] = [];

  // Sort player's units by HP (lowest first) — they desert first
  const playerUnits = Object.values(state.entities)
    .filter((e) => e.ownerId === playerId)
    .sort((a, b) => a.hp - b.hp);

  let remainingDeficit = deficit;

  for (const unit of playerUnits) {
    if (remainingDeficit <= 0) break;

    // Each unit's gold upkeep contribution to the deficit
    const unitGoldUpkeep = unit.upkeep.gold ?? 0;
    if (unitGoldUpkeep > 0) {
      desertingUnits.push(unit.id);
      remainingDeficit -= unitGoldUpkeep;
    }
  }

  return {
    isBankrupt: true,
    deficit,
    desertingUnits,
  };
}

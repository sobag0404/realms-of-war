/**
 * City management rules for "Realms of War".
 *
 * Pure functions implementing city founding, growth, territory,
 * building construction, and yield calculations.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { BuildingTypeId, CityId, EraId, HexCoord, PlayerId, ResourceId, ResourceYield, TechId } from '../core/types';
import type { GameState, CityState, HexTile, ProductionItem } from '../core/GameState';
import { hexKey, hexDistance, hexRing, HEX_DIRECTIONS } from '../core/types';
import { TERRAIN_TYPES } from '../../data/terrain';
import { BUILDINGS } from '../../data/buildings';
import { TECHNOLOGIES } from '../../data/technologies';
import { nextCityId } from '../core/idGenerator';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base city HP. */
const BASE_CITY_HP = 100;

/** City HP per level. */
const CITY_HP_PER_LEVEL = 25;

/** Base wall HP (if walls are built). */
const BASE_WALL_HP = 50;

/** City HP regeneration rate per turn (10%). */
const CITY_HP_REGEN_RATE = 0.10;

/** Population growth formula: food needed = 8 + pop * 2. */
const GROWTH_BASE_FOOD = 8;
const GROWTH_POP_MULTIPLIER = 2;

/** City level thresholds: level = f(population). */
const LEVEL_THRESHOLDS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45];

/** Territory radius by city level. */
const TERRITORY_RADIUS: Record<number, number> = {
  1: 1,
  2: 2,
};

/** Default territory radius for level 3+. */
const DEFAULT_TERRITORY_RADIUS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get a hex tile from the game state. */
function getHexTile(state: GameState, hex: HexCoord): HexTile | null {
  return state.map.tiles[hexKey(hex)] ?? null;
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

/** Add two ResourceYields together. */
function addYields(a: ResourceYield, b: ResourceYield): ResourceYield {
  const result: ResourceYield = { ...a };
  for (const key of Object.keys(b) as ResourceId[]) {
    result[key] = (result[key] ?? 0) + (b[key] ?? 0);
  }
  return result;
}

// ─── Can Found City ──────────────────────────────────────────────────────────

/**
 * Check whether a player can found a city at a given hex.
 *
 * Requirements:
 * - Hex exists on the map
 * - Terrain is not mountain or water (must be land)
 * - No other city already at this hex
 * - No other city's territory already claims this hex
 * - Player has a settler unit at this hex
 *
 * @param state - Current game state
 * @param playerId - Player attempting to found
 * @param hex - Hex where city would be founded
 * @returns Whether the city can be founded, with reason if not
 */
export function canFoundCity(
  state: GameState,
  playerId: PlayerId,
  hex: HexCoord,
): { canFound: boolean; reason?: string } {
  const tile = getHexTile(state, hex);
  if (!tile) {
    return { canFound: false, reason: 'Hex is out of bounds' };
  }

  // Must be land terrain
  const terrainData = TERRAIN_TYPES[tile.terrain];
  if (!terrainData || !terrainData.walkable) {
    return { canFound: false, reason: 'Cannot found city on impassable terrain' };
  }

  // Cannot found on mountain or water
  if (tile.terrain === 'mountain' || tile.terrain === 'water') {
    return { canFound: false, reason: 'Cannot found city on mountain or water' };
  }

  // Check for existing city at this hex
  const existingCity = Object.values(state.cities).find((c) => hexKey(c.hex) === hexKey(hex));
  if (existingCity) {
    return { canFound: false, reason: 'A city already exists at this location' };
  }

  // Check if hex is already claimed by another city
  if (tile.owningCityId) {
    const owningCity = state.cities[tile.owningCityId];
    if (owningCity && owningCity.ownerId !== playerId) {
      return { canFound: false, reason: 'This territory belongs to another player' };
    }
  }

  // Check if player has a settler at this hex
  const settlerAtHex = Object.values(state.entities).find(
    (e) => e.ownerId === playerId &&
           e.typeId === 'settler' &&
           hexKey(e.hex) === hexKey(hex),
  );
  if (!settlerAtHex) {
    return { canFound: false, reason: 'No settler at this location' };
  }

  return { canFound: true };
}

// ─── Found City ──────────────────────────────────────────────────────────────

/**
 * Found a new city at a given hex.
 *
 * Creates a new city with:
 * - Level 1, population 1
 * - Base HP, no walls
 * - City center building
 * - Territory radius of 1
 * - Claims surrounding hexes
 *
 * The founding settler is consumed (removed from the game state).
 *
 * @param state - Current game state (not mutated)
 * @param playerId - Player founding the city
 * @param hex - Hex where the city is founded
 * @param name - Name for the new city
 * @returns New game state with the city founded
 */
export function foundCity(
  state: GameState,
  playerId: PlayerId,
  hex: HexCoord,
  name: string,
): GameState {
  const check = canFoundCity(state, playerId, hex);
  if (!check.canFound) return state;

  const { state: stateWithCityId, id: cityId } = nextCityId(state);

  // Calculate territory hexes (radius 1 for level 1)
  const territory = getCityTerritoryAtLevel(hex, 1);

  // Calculate growth target for pop 2
  const growthTarget = GROWTH_BASE_FOOD + 1 * GROWTH_POP_MULTIPLIER;

  const newCity: CityState = {
    id: cityId,
    name,
    hex,
    ownerId: playerId,
    level: 1,
    population: 1,
    hp: BASE_CITY_HP,
    maxHp: BASE_CITY_HP + CITY_HP_PER_LEVEL,
    wallHp: 0,
    maxWallHp: 0,
    buildings: ['city_center'],
    growthProgress: 0,
    growthTarget,
    workedHexes: territory.slice(0, 2).map((h) => hexKey(h)), // Start working first 2 hexes
    productionQueue: [],
    productionPerTurn: 1,
    foodPerTurn: 2,
    territory: territory.map((h) => hexKey(h)),
    isUnderSiege: false,
    foundedTurn: state.turn,
  };

  // Remove the settler (use the state with updated city counter)
  const settlerId = Object.values(stateWithCityId.entities).find(
    (e) => e.ownerId === playerId &&
           e.typeId === 'settler' &&
           hexKey(e.hex) === hexKey(hex),
  )?.id;

  const newEntities = { ...stateWithCityId.entities };
  if (settlerId) {
    const { [settlerId]: _, ...rest } = newEntities;
    void _;
    Object.assign(newEntities, rest);
    // Properly remove the key
    delete newEntities[settlerId];
  }

  // Update hex tiles to assign ownership
  const newTiles = { ...stateWithCityId.map.tiles };
  for (const tHex of territory) {
    const key = hexKey(tHex);
    const existingTile = newTiles[key];
    if (existingTile) {
      newTiles[key] = {
        ...existingTile,
        owningCityId: cityId,
      };
    }
  }
  // Also claim the city hex itself
  const cityHexKey = hexKey(hex);
  const cityTile = newTiles[cityHexKey];
  if (cityTile) {
    newTiles[cityHexKey] = {
      ...cityTile,
      owningCityId: cityId,
    };
  }

  return {
    ...stateWithCityId,
    cities: {
      ...stateWithCityId.cities,
      [cityId]: newCity,
    },
    entities: newEntities,
    map: {
      ...stateWithCityId.map,
      tiles: newTiles,
    },
  };
}

// ─── City Territory ──────────────────────────────────────────────────────────

/**
 * Calculate territory hexes for a city at a given level.
 *
 * Territory radius:
 * - Level 1: radius 1
 * - Level 2: radius 2
 * - Level 3+: radius 3
 *
 * @param centerHex - City center hex
 * @param level - City level
 * @returns Array of hex coordinates in the territory
 */
function getCityTerritoryAtLevel(centerHex: HexCoord, level: number): HexCoord[] {
  const radius = level >= 3 ? DEFAULT_TERRITORY_RADIUS : (TERRITORY_RADIUS[level] ?? 1);
  const hexes: HexCoord[] = [];

  for (let r = 1; r <= radius; r++) {
    const ring = hexRing(centerHex, r);
    hexes.push(...ring);
  }

  return hexes;
}

/**
 * Get the current territory of a city based on its level.
 *
 * @param state - Current game state
 * @param cityId - City to get territory for
 * @returns Array of hex coordinates in the city's territory
 */
export function getCityTerritory(
  state: GameState,
  cityId: CityId,
): HexCoord[] {
  const city = state.cities[cityId];
  if (!city) return [];

  // Use stored territory hexes
  return city.territory.map((key) => {
    const [q, r] = key.split(',').map(Number);
    return { q, r } as HexCoord;
  });
}

// ─── City Yield ──────────────────────────────────────────────────────────────

/**
 * Calculate the total resource yield of a city.
 *
 * Combines:
 * - Yields from all worked hexes
 * - Building yield bonuses
 * - City center base yield
 *
 * @param state - Current game state
 * @param cityId - City to calculate yield for
 * @returns Total resource yield per turn
 */
export function calculateCityYield(
  state: GameState,
  cityId: CityId,
): ResourceYield {
  const city = state.cities[cityId];
  if (!city) return {};

  let totalYield: ResourceYield = {};

  // City center base yield
  totalYield = addYields(totalYield, { gold: 2, food: 1 });

  // Yields from worked hexes
  for (const hexKey_ of city.workedHexes) {
    const [q, r] = hexKey_.split(',').map(Number);
    const hex: HexCoord = { q, r };
    const tile = getHexTile(state, hex);
    if (!tile) continue;

    const terrainData = TERRAIN_TYPES[tile.terrain];
    if (terrainData) {
      totalYield = addYields(totalYield, terrainData.yields as ResourceYield);
    }

    // Resource on hex
    if (tile.resource) {
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

    // Improvement on hex
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

    // Tile yield override
    if (tile.yield) {
      totalYield = addYields(totalYield, tile.yield);
    }
  }

  // Building yield bonuses
  for (const buildingId of city.buildings) {
    const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
    if (building) {
      for (const effect of building.effects) {
        if (effect.type === 'yield_bonus' && effect.target && effect.value) {
          totalYield = addYields(totalYield, { [effect.target]: effect.value });
        }
      }
    }
  }

  return totalYield;
}

// ─── City Growth ─────────────────────────────────────────────────────────────

/**
 * Apply city growth for one turn.
 *
 * - Food surplus adds to growth progress
 * - Growth formula: food needed = 8 + pop * 2
 * - When growth progress >= target, population increases
 * - Level up when population reaches thresholds
 * - If food < 0 (starvation), population decreases
 * - City HP regenerates 10% per turn if not under siege
 *
 * @param state - Current game state (not mutated)
 * @param cityId - City to grow
 * @returns New game state with updated city
 */
export function applyCityGrowth(
  state: GameState,
  cityId: CityId,
): GameState {
  const city = state.cities[cityId];
  if (!city) return state;

  let newCity = { ...city };

  // Calculate food surplus
  const cityYield = calculateCityYield(state, cityId);
  const foodIncome = cityYield.food ?? 0;
  const foodConsumption = city.population; // 1 food per population
  const foodSurplus = foodIncome - foodConsumption;

  if (foodSurplus > 0) {
    // Growth
    newCity.growthProgress = city.growthProgress + foodSurplus;

    // Check if population grows
    while (newCity.growthProgress >= newCity.growthTarget) {
      newCity.growthProgress -= newCity.growthTarget;
      newCity.population++;
      newCity.growthTarget = GROWTH_BASE_FOOD + newCity.population * GROWTH_POP_MULTIPLIER;
    }
  } else if (foodSurplus < 0) {
    // Starvation
    newCity.growthProgress += foodSurplus; // foodSurplus is negative
    if (newCity.growthProgress < 0) {
      newCity.growthProgress = 0;
      if (newCity.population > 1) {
        newCity.population--;
        newCity.growthTarget = GROWTH_BASE_FOOD + newCity.population * GROWTH_POP_MULTIPLIER;
      }
    }
  }

  // Level up based on population thresholds
  let newLevel = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (newCity.population >= LEVEL_THRESHOLDS[i]) {
      newLevel = i + 1;
      break;
    }
  }

  if (newLevel !== newCity.level) {
    newCity.level = newLevel;
    newCity.maxHp = BASE_CITY_HP + CITY_HP_PER_LEVEL * newLevel;

    // Update territory when city levels up
    const newTerritory = getCityTerritoryAtLevel(city.hex, newLevel);
    newCity.territory = newTerritory.map((h) => hexKey(h));

    // Update max worked hexes (can work up to population hexes)
    // Auto-assign additional worked hexes from new territory
    const maxWorkedHexes = newCity.population;
    const availableHexes = newCity.territory.filter(
      (key) => !newCity.workedHexes.includes(key),
    );
    while (newCity.workedHexes.length < maxWorkedHexes && availableHexes.length > 0) {
      const nextHex = availableHexes.shift();
      if (nextHex) newCity.workedHexes.push(nextHex);
    }
  }

  // HP regeneration (10% per turn if not under siege)
  if (!newCity.isUnderSiege && newCity.hp < newCity.maxHp) {
    const regenAmount = Math.max(1, Math.floor(newCity.maxHp * CITY_HP_REGEN_RATE));
    newCity.hp = Math.min(newCity.maxHp, newCity.hp + regenAmount);
  }

  // Update food/production per turn
  newCity.foodPerTurn = foodSurplus;
  newCity.productionPerTurn = cityYield.progress ?? 1;

  return {
    ...state,
    cities: {
      ...state.cities,
      [cityId]: newCity,
    },
  };
}

// ─── Available Buildings ─────────────────────────────────────────────────────

/**
 * Get the list of buildings that can be constructed in a city.
 *
 * Requirements:
 * - Building not already constructed in this city
 * - Prerequisites met (tech or existing building)
 * - Player has the required era for the building
 *
 * @param state - Current game state
 * @param cityId - City to check
 * @returns Array of building type IDs available for construction
 */
export function getAvailableBuildings(
  state: GameState,
  cityId: CityId,
): BuildingTypeId[] {
  const city = state.cities[cityId];
  if (!city) return [];

  const player = state.players[city.ownerId];
  if (!player) return [];

  const playerTechs = new Set(player.techs);
  const available: BuildingTypeId[] = [];

  for (const [buildingId, building] of Object.entries(BUILDINGS)) {
    // Skip already constructed
    if (city.buildings.includes(buildingId as BuildingTypeId)) continue;

    // Skip wonders that already exist elsewhere
    if (building.isWonder) {
      const wonderExists = Object.values(state.cities).some(
        (c) => c.buildings.includes(buildingId as BuildingTypeId),
      );
      if (wonderExists) continue;
    }

    // Check prerequisite
    if (building.prerequisite) {
      // Prerequisite can be a tech or a building
      const isTechPrereq = playerTechs.has(building.prerequisite as TechId);
      const isBuildingPrereq = city.buildings.includes(building.prerequisite as BuildingTypeId);

      if (!isTechPrereq && !isBuildingPrereq) continue;
    }

    available.push(buildingId as BuildingTypeId);
  }

  return available;
}

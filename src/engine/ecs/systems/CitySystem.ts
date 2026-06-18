/**
 * City System for "Realms of War".
 *
 * Processes city growth and production, founds new cities, builds buildings,
 * and provides city detail views. Delegates to cityRules and recruitmentRules.
 */

import type { BuildingTypeId, PlayerId, ResourceId, ResourceYield } from '../../core/types';
import type { GameState, CityState } from '../../core/GameState';
import type { FoundCityCommand, BuildBuildingCommand } from '../../core/CommandQueue';
import type { EventBus } from '../../core/EventBus';
import {
  canFoundCity,
  foundCity as rulesFoundCity,
  applyCityGrowth,
  getAvailableBuildings as rulesGetAvailableBuildings,
  calculateCityYield,
} from '../../rules/cityRules';
import { getRecruitableUnits, processRecruitment } from '../../rules/recruitmentRules';
import { hexKey } from '../../core/types';
import { BUILDINGS } from '../../../data/buildings';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Detailed city information including yields and available options. */
export interface CityDetails {
  city: CityState;
  yield: ResourceYield;
  availableBuildings: BuildingTypeId[];
  availableUnits: string[];
  growthTurns: number;
}

// ─── CitySystem ────────────────────────────────────────────────────────────────

export class CitySystem {
  /**
   * Process city growth and production for all cities of a player.
   *
   * For each city:
   * 1. Apply city growth (population, territory)
   * 2. Process production queue (buildings and units)
   * 3. Emit events for completed buildings/units
   *
   * @param state - Current game state (not mutated)
   * @param playerId - Player whose cities to process
   * @param eventBus - Event bus for emitting events
   * @returns New game state with updated cities
   */
  static processCities(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameState {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return state;

    let currentState = state;

    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    for (const city of playerCities) {
      // Apply city growth
      currentState = applyCityGrowth(currentState, city.id);

      const updatedCity = currentState.cities[city.id];
      if (updatedCity && updatedCity.productionQueue.length > 0) {
        const currentItem = updatedCity.productionQueue[0];
        if (currentItem.kind === 'unit') {
          const productionResult = processRecruitment(currentState, city.id);
          currentState = productionResult.state;

          if (productionResult.completed && productionResult.unitId) {
            const recruitedUnit = currentState.entities[productionResult.unitId];
            if (recruitedUnit) {
              eventBus.emit('UnitRecruited', {
                cityId: city.id,
                entityId: recruitedUnit.id,
                unitType: recruitedUnit.typeId,
                ownerId: recruitedUnit.ownerId,
                hex: recruitedUnit.hex,
              });
            }
          }
        } else if (currentItem.kind === 'building') {
          // Process building production
          const productionPerTurn = updatedCity.productionPerTurn || 1;
          const newProgress = currentItem.progress + productionPerTurn;

          if (newProgress >= currentItem.cost) {
            // Building completed!
            const newBuildings = [...updatedCity.buildings, currentItem.id as BuildingTypeId];
            const newQueue = updatedCity.productionQueue.slice(1);

            currentState = {
              ...currentState,
              cities: {
                ...currentState.cities,
                [city.id]: {
                  ...updatedCity,
                  buildings: newBuildings,
                  productionQueue: newQueue,
                },
              },
            };

            eventBus.emit('BuildingCompleted', {
              cityId: city.id,
              buildingType: currentItem.id,
            });
          } else {
            // Update progress
            const updatedItem = { ...currentItem, progress: newProgress };
            const newQueue = [updatedItem, ...updatedCity.productionQueue.slice(1)];

            currentState = {
              ...currentState,
              cities: {
                ...currentState.cities,
                [city.id]: {
                  ...updatedCity,
                  productionQueue: newQueue,
                },
              },
            };
          }
        }
      }
    }

    return currentState;
  }

  /**
   * Found a new city.
   *
   * Validates via cityRules.canFoundCity, applies founding via
   * cityRules.foundCity, and emits a CityFounded event.
   *
   * @param state - Current game state (not mutated)
   * @param command - The FoundCity command
   * @param eventBus - Event bus for emitting events
   * @returns New game state with the city founded, or original state if invalid
   */
  static foundCity(
    state: GameState,
    command: FoundCityCommand,
    eventBus: EventBus,
  ): GameState {
    // Validate
    const result = canFoundCity(state, command.playerId, command.hex);
    if (!result.canFound) return state;

    // Apply founding
    const newState = rulesFoundCity(state, command.playerId, command.hex, command.name);

    // Find the newly created city and emit event
    const newCity = Object.values(newState.cities).find(
      (c) => c.ownerId === command.playerId &&
             hexKey(c.hex) === hexKey(command.hex) &&
             c.name === command.name,
    );

    if (newCity) {
      eventBus.emit('CityFounded', {
        cityId: newCity.id,
        name: command.name,
        hex: command.hex,
        ownerId: command.playerId,
      });
    }

    return newState;
  }

  /**
   * Build a building in a city.
   *
   * Validates the build request, adds the building to the city's
   * production queue, and deducts resources. Emits BuildingCompleted
   * if the building is instantly completed (cost = 0).
   *
   * @param state - Current game state (not mutated)
   * @param command - The BuildBuilding command
   * @param eventBus - Event bus for emitting events
   * @returns New game state with building started, or original state if invalid
   */
  static buildBuilding(
    state: GameState,
    command: BuildBuildingCommand,
    _eventBus: EventBus,
  ): GameState {
    const city = state.cities[command.cityId];
    if (!city) return state;

    if (city.ownerId !== command.playerId) return state;

    // Check building is available
    const available = rulesGetAvailableBuildings(state, command.cityId);
    if (!available.includes(command.buildingTypeId as BuildingTypeId)) return state;

    // Check if city already has a building in production
    const currentBuildingProduction = city.productionQueue.find(
      (item) => item.kind === 'building',
    );
    if (currentBuildingProduction) return state;

    // Get building cost
    const building = BUILDINGS[command.buildingTypeId as keyof typeof BUILDINGS];
    if (!building) return state;

    // Check affordability
    const player = state.players[command.playerId];
    if (!player) return state;

    for (const key of Object.keys(building.cost) as ResourceId[]) {
      const required = building.cost[key] ?? 0;
      const available_ = player.resources[key] ?? 0;
      if (available_ < required) return state;
    }

    // Deduct resources
    const newResources = { ...player.resources };
    for (const key of Object.keys(building.cost) as ResourceId[]) {
      newResources[key] = (newResources[key] ?? 0) - (building.cost[key] ?? 0);
    }

    // Calculate production cost (based on building cost)
    const costValues = Object.values(building.cost) as number[];
    const productionCost = Math.max(1, costValues.reduce((sum, v) => sum + v, 0) / 3);

    // Add to production queue
    const productionItem = {
      id: command.buildingTypeId,
      kind: 'building' as const,
      progress: 0,
      cost: productionCost,
    };

    return {
      ...state,
      players: {
        ...state.players,
        [command.playerId]: {
          ...player,
          resources: newResources,
        },
      },
      cities: {
        ...state.cities,
        [command.cityId]: {
          ...city,
          productionQueue: [...city.productionQueue, productionItem],
        },
      },
    };
  }

  /**
   * Get city details including yields, available buildings, and units.
   *
   * @param state - Current game state
   * @param cityId - City to inspect
   * @returns City details, or null if city not found
   */
  static getCityDetails(state: GameState, cityId: string): CityDetails | null {
    const city = state.cities[cityId];
    if (!city) return null;

    const cityYield = calculateCityYield(state, cityId);
    const availableBuildings = rulesGetAvailableBuildings(state, cityId);
    const availableUnits = getRecruitableUnits(state, cityId);

    // Estimate growth turns
    const foodIncome = cityYield.food ?? 0;
    const foodConsumption = city.population;
    const foodSurplus = foodIncome - foodConsumption;
    const remainingGrowth = city.growthTarget - city.growthProgress;
    const growthTurns = foodSurplus > 0
      ? Math.ceil(remainingGrowth / foodSurplus)
      : foodSurplus === 0
        ? Infinity
        : -1; // Starvation

    return {
      city,
      yield: cityYield,
      availableBuildings,
      availableUnits,
      growthTurns,
    };
  }
}

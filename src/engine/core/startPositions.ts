/**
 * Starting position population for "Realms of War".
 *
 * After map generation, this module places starting units and cities
 * for each player at their designated starting hex.
 *
 * Usage:
 *   1. Generate the map via mapgen
 *   2. Get starting positions from mapgen result
 *   3. Call populateStartingPositions(state, positions) to add units/cities
 */

import type { GameState, EntityData, CityState } from './GameState';
import type { HexCoord, PlayerId, ResourceYield } from './types';
import { hexKey, hexRing } from './types';
import { UNIT_TYPES } from '../../data/units';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StartingPosition {
  playerId: PlayerId;
  hex: HexCoord;
}

// ─── Main Function ─────────────────────────────────────────────────────────────

/**
 * Populate the game state with starting units and cities for each player.
 *
 * For each player's starting hex:
 *   - Creates a capital city (level 1, with territory ring)
 *   - Creates a spearman unit on an adjacent walkable hex
 *   - Creates a settler unit on the city hex itself
 *
 * This function should be called AFTER map generation, when the map tiles
 * are populated.
 *
 * @param state - The game state with map tiles already generated
 * @param positions - Starting position for each player
 * @returns New game state with starting cities and units added
 */
export function populateStartingPositions(
  state: GameState,
  positions: StartingPosition[],
): GameState {
  let newState = { ...state };

  for (const { playerId, hex } of positions) {
    const player = newState.players[playerId];
    if (!player) continue;

    // ── Create starting city ────────────────────────────────────────────────

    const cityId = `city-start-${playerId}`;
    const territory = hexRing(hex, 1).map((h) => hexKey(h));
    territory.push(hexKey(hex));

    const startingCity: CityState = {
      id: cityId,
      name: `${player.name}'s Capital`,
      hex,
      ownerId: playerId,
      level: 1,
      population: 2,
      hp: 150,
      maxHp: 150,
      wallHp: 0,
      maxWallHp: 0,
      buildings: ['city_center'],
      growthProgress: 0,
      growthTarget: 10,
      workedHexes: territory.slice(0, 3),
      productionQueue: [],
      productionPerTurn: 1,
      foodPerTurn: 2,
      territory,
      isUnderSiege: false,
      foundedTurn: 1,
    };

    // Claim territory hexes — set owningCityId on tiles
    const newTiles = { ...newState.map.tiles };
    for (const tKey of territory) {
      const tile = newTiles[tKey];
      if (tile) {
        newTiles[tKey] = { ...tile, owningCityId: cityId };
      }
    }

    // ── Create starting warrior (spearman) ──────────────────────────────────

    const warriorType = UNIT_TYPES['spearman'];
    const warriorId = `unit-start-warrior-${playerId}`;

    // Find adjacent hex for warrior (not on city hex itself)
    let warriorHex = hex;
    const ring1 = hexRing(hex, 1);
    for (const neighbor of ring1) {
      const tile = newTiles[hexKey(neighbor)];
      if (tile && tile.terrain !== 'mountain' && tile.terrain !== 'water') {
        warriorHex = neighbor;
        break;
      }
    }

    const warrior: EntityData = {
      id: warriorId,
      typeId: 'spearman',
      ownerId: playerId,
      hex: warriorHex,
      movementPoints: warriorType.mov,
      maxMovement: warriorType.mov,
      hp: warriorType.hp,
      maxHp: warriorType.hp,
      attack: warriorType.atk,
      defense: warriorType.def,
      attackType: 'melee',
      range: warriorType.range,
      hasActed: false,
      hasMoved: false,
      xp: 0,
      level: 1,
      promotions: [],
      upkeep: warriorType.upkeep as ResourceYield,
      abilities: [...warriorType.abilities],
      statusEffects: [],
    };

    // ── Create starting settler ─────────────────────────────────────────────

    const settlerType = UNIT_TYPES['settler'];
    const settlerId = `unit-start-settler-${playerId}`;
    const settler: EntityData = {
      id: settlerId,
      typeId: 'settler',
      ownerId: playerId,
      hex: hex, // settler stays in the city hex
      movementPoints: settlerType.mov,
      maxMovement: settlerType.mov,
      hp: settlerType.hp,
      maxHp: settlerType.hp,
      attack: settlerType.atk,
      defense: settlerType.def,
      attackType: 'melee',
      range: settlerType.range,
      hasActed: false,
      hasMoved: false,
      xp: 0,
      level: 1,
      promotions: [],
      upkeep: settlerType.upkeep as ResourceYield,
      abilities: [...settlerType.abilities],
      statusEffects: [],
    };

    // ── Update state ────────────────────────────────────────────────────────

    newState = {
      ...newState,
      cities: {
        ...newState.cities,
        [cityId]: startingCity,
      },
      entities: {
        ...newState.entities,
        [warriorId]: warrior,
        [settlerId]: settler,
      },
      map: {
        ...newState.map,
        tiles: newTiles,
      },
    };
  }

  return newState;
}

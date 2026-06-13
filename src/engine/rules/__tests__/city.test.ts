/**
 * Unit tests for city rules — canFoundCity, foundCity
 */

import { describe, it, expect } from 'vitest';
import { canFoundCity, foundCity } from '@/engine/rules/cityRules';
import type { GameState, EntityData, HexTile } from '@/engine/core/GameState';
import { hexKey } from '@/engine/core/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTile(terrain: string, overrides: Partial<HexTile> = {}): HexTile {
  return {
    coord: { q: 0, r: 0 },
    terrain: terrain as HexTile['terrain'],
    resource: null,
    yield: {},
    hasRoad: false,
    hasFort: false,
    owningCityId: null,
    improvement: null,
    hasRiftPortal: false,
    riftPortalOwner: null,
    ...overrides,
  };
}

function makeEntity(overrides: Partial<EntityData> = {}): EntityData {
  return {
    id: 'entity-1',
    typeId: 'settler',
    ownerId: 'player-0',
    hex: { q: 0, r: 0 },
    movementPoints: 2,
    maxMovement: 2,
    hp: 30,
    maxHp: 30,
    attack: 0,
    defense: 0,
    attackType: 'melee',
    range: 0,
    hasActed: false,
    hasMoved: false,
    xp: 0,
    level: 1,
    promotions: [],
    upkeep: { food: 2 },
    abilities: ['found_city'],
    statusEffects: [],
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    seed: 42,
    turn: 1,
    phase: 'playerActions',
    activePlayerId: 'player-0',
    turnOrder: ['player-0', 'player-1'],
    players: {
      'player-0': {
        id: 'player-0',
        name: 'Player 1',
        color: '#e74c3c',
        isAI: false,
        isAlive: true,
        resources: { gold: 100, food: 50, wood: 50, stone: 30, iron: 0, mana: 0, progress: 0, science: 0 },
        techs: [],
        era: 'primitives',
        currentResearch: null,
        researchProgress: 0,
        sciencePerTurn: 0,
        incomePerTurn: {},
        upkeepPerTurn: {},
        visibleHexes: [],
        exploredHexes: [],
        score: 0,
        lastActiveTurn: 1,
      },
      'player-1': {
        id: 'player-1',
        name: 'AI 1',
        color: '#3498db',
        isAI: true,
        isAlive: true,
        resources: { gold: 100, food: 50, wood: 50, stone: 30, iron: 0, mana: 0, progress: 0, science: 0 },
        techs: [],
        era: 'primitives',
        currentResearch: null,
        researchProgress: 0,
        sciencePerTurn: 0,
        incomePerTurn: {},
        upkeepPerTurn: {},
        visibleHexes: [],
        exploredHexes: [],
        score: 0,
        lastActiveTurn: 1,
      },
    },
    map: { radius: 10, tiles: {} },
    entities: {},
    cities: {},
    diplomacy: {},
    commandLogHash: '',
    gameOver: false,
    winnerId: null,
    victoryCondition: null,
    nextEntitySeq: 2,
    nextCitySeq: 1,
    ...overrides,
  };
}

function buildPlainsGrid(): Record<string, HexTile> {
  const tiles: Record<string, HexTile> = {};
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      tiles[hexKey({ q, r })] = makeTile('plains', { coord: { q, r } });
    }
  }
  return tiles;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('canFoundCity', () => {
  it('cannot found city without a settler at the hex', () => {
    // No settler entity at (2,0)
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
    });
    const result = canFoundCity(state, 'player-0', { q: 2, r: 0 });
    expect(result.canFound).toBe(false);
    expect(result.reason).toContain('settler');
  });

  it('cannot found city on mountain', () => {
    const settler = makeEntity({ hex: { q: 0, r: 0 }, typeId: 'settler' });
    const tiles = buildPlainsGrid();
    tiles[hexKey({ q: 0, r: 0 })] = makeTile('mountain', { coord: { q: 0, r: 0 } });

    const state = makeGameState({
      map: { radius: 10, tiles },
      entities: { 'entity-1': settler },
    });
    const result = canFoundCity(state, 'player-0', { q: 0, r: 0 });
    expect(result.canFound).toBe(false);
    expect(result.reason).toContain('impassable');
  });

  it('cannot found city on water', () => {
    const settler = makeEntity({ hex: { q: 0, r: 0 }, typeId: 'settler' });
    const tiles = buildPlainsGrid();
    tiles[hexKey({ q: 0, r: 0 })] = makeTile('water', { coord: { q: 0, r: 0 } });

    const state = makeGameState({
      map: { radius: 10, tiles },
      entities: { 'entity-1': settler },
    });
    const result = canFoundCity(state, 'player-0', { q: 0, r: 0 });
    expect(result.canFound).toBe(false);
  });

  it('cannot found city where a city already exists', () => {
    const settler = makeEntity({ hex: { q: 0, r: 0 }, typeId: 'settler' });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': settler },
      cities: {
        'city-1': {
          id: 'city-1',
          name: 'Existing City',
          hex: { q: 0, r: 0 },
          ownerId: 'player-0',
          level: 1,
          population: 1,
          hp: 100,
          maxHp: 125,
          wallHp: 0,
          maxWallHp: 0,
          buildings: ['city_center'],
          growthProgress: 0,
          growthTarget: 10,
          workedHexes: [],
          productionQueue: [],
          productionPerTurn: 1,
          foodPerTurn: 2,
          territory: [],
          isUnderSiege: false,
          foundedTurn: 1,
        },
      },
    });
    const result = canFoundCity(state, 'player-0', { q: 0, r: 0 });
    expect(result.canFound).toBe(false);
    expect(result.reason).toContain('already exists');
  });

  it('can found city with a settler on walkable terrain', () => {
    const settler = makeEntity({ hex: { q: 0, r: 0 }, typeId: 'settler' });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': settler },
    });
    const result = canFoundCity(state, 'player-0', { q: 0, r: 0 });
    expect(result.canFound).toBe(true);
  });
});

describe('foundCity', () => {
  it('creates a city and claims territory', () => {
    const settler = makeEntity({ hex: { q: 0, r: 0 }, typeId: 'settler' });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': settler },
    });

    const newState = foundCity(state, 'player-0', { q: 0, r: 0 }, 'New City');

    // A city should exist
    const cities = Object.values(newState.cities);
    expect(cities.length).toBe(1);
    expect(cities[0].name).toBe('New City');
    expect(cities[0].ownerId).toBe('player-0');
    expect(cities[0].level).toBe(1);
    expect(cities[0].population).toBe(1);

    // Territory should be claimed (radius 1 = 6 hexes)
    expect(cities[0].territory.length).toBe(6);

    // Settler should be consumed
    expect(newState.entities['entity-1']).toBeUndefined();
  });

  it('does not create a city when canFound is false', () => {
    // No settler, so canFound is false
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
    });
    const newState = foundCity(state, 'player-0', { q: 2, r: 0 }, 'Invalid');
    expect(Object.values(newState.cities).length).toBe(0);
  });

  it('assigns territory hex ownership to the new city', () => {
    const settler = makeEntity({ hex: { q: 0, r: 0 }, typeId: 'settler' });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': settler },
    });

    const newState = foundCity(state, 'player-0', { q: 0, r: 0 }, 'Territory City');

    const city = Object.values(newState.cities)[0];
    // The city hex itself should be owned
    const cityHexKey = hexKey({ q: 0, r: 0 });
    expect(newState.map.tiles[cityHexKey].owningCityId).toBe(city.id);

    // Territory ring hexes should also be owned
    for (const tKey of city.territory) {
      expect(newState.map.tiles[tKey]).toBeDefined();
      expect(newState.map.tiles[tKey].owningCityId).toBe(city.id);
    }
  });
});

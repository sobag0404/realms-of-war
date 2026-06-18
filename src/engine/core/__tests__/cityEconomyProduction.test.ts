import { describe, expect, it } from 'vitest';
import { GameEngine, EngineError } from '@/engine/core/GameEngine';
import { createDefaultConfig } from '@/engine/core/GameConfig';
import { EventBus } from '@/engine/core/EventBus';
import type { BuildBuildingCommand } from '@/engine/core/CommandQueue';
import type { CityState, EntityData, GameState, HexTile, PlayerState } from '@/engine/core/GameState';
import type { HexCoord, PlayerId, ResourceYield } from '@/engine/core/types';
import { applyBuildImprovement } from '@/engine/core/commandHandlers';
import { CitySystem } from '@/engine/ecs/systems/CitySystem';
import { calculateIncome, getHexYield } from '@/engine/rules/economyRules';
import { calculateCityYield } from '@/engine/rules/cityRules';
import { hexKey } from '@/engine/core/types';

function makePlayer(
  id: PlayerId,
  resources: PlayerState['resources'] = {
    gold: 100,
    food: 50,
    wood: 50,
    stone: 30,
    iron: 0,
    mana: 0,
    progress: 0,
    science: 0,
  },
): PlayerState {
  return {
    id,
    name: id,
    color: '#e74c3c',
    isAI: false,
    isAlive: true,
    resources,
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
  };
}

function makeTile(coord: HexCoord, yield_: ResourceYield, overrides: Partial<HexTile> = {}): HexTile {
  return {
    coord,
    terrain: 'plains',
    resource: null,
    yield: yield_,
    hasRoad: false,
    hasFort: false,
    owningCityId: null,
    improvement: null,
    hasRiftPortal: false,
    riftPortalOwner: null,
    ...overrides,
  };
}

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'city-1',
    name: 'Capital',
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
    workedHexes: [hexKey({ q: 1, r: 0 })],
    productionQueue: [],
    productionPerTurn: 1,
    foodPerTurn: 2,
    territory: [hexKey({ q: 1, r: 0 })],
    isUnderSiege: false,
    foundedTurn: 1,
    ...overrides,
  };
}

function makeWorker(overrides: Partial<EntityData> = {}): EntityData {
  return {
    id: 'worker-1',
    typeId: 'worker',
    ownerId: 'player-0',
    hex: { q: 1, r: 0 },
    movementPoints: 2,
    maxMovement: 2,
    hp: 25,
    maxHp: 25,
    attack: 0,
    defense: 1,
    attackType: 'melee',
    range: 0,
    hasActed: false,
    hasMoved: false,
    xp: 0,
    level: 1,
    promotions: [],
    upkeep: { food: 1 },
    abilities: ['build_improvement'],
    statusEffects: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const city = makeCity();
  const workedHex = { q: 1, r: 0 };
  return {
    version: 1,
    seed: 42,
    turn: 1,
    phase: 'playerActions',
    activePlayerId: 'player-0',
    turnOrder: ['player-0', 'player-1'],
    players: {
      'player-0': makePlayer('player-0'),
      'player-1': makePlayer('player-1'),
    },
    map: {
      radius: 4,
      tiles: {
        [hexKey({ q: 0, r: 0 })]: makeTile({ q: 0, r: 0 }, { food: 2, gold: 1 }, { owningCityId: city.id }),
        [hexKey(workedHex)]: makeTile(workedHex, { food: 2, gold: 1 }, { owningCityId: city.id }),
      },
    },
    entities: {},
    cities: { [city.id]: city },
    diplomacy: {},
    commandLogHash: '',
    gameOver: false,
    winnerId: null,
    victoryCondition: null,
    nextEntitySeq: 7,
    nextCitySeq: 2,
    ...overrides,
  };
}

function makeEngine(state: GameState): GameEngine {
  const engine = new GameEngine(createDefaultConfig({
    seed: state.seed,
    players: state.turnOrder.map((id, slot) => ({
      id,
      name: id,
      color: state.players[id].color,
      isAI: state.players[id].isAI,
      slot,
    })),
  }));
  engine.setState(state);
  return engine;
}

describe('city economy and production loop', () => {
  it('uses canonical generated tile yield without double-counting terrain, resources, or city center', () => {
    const state = makeState({
      map: {
        radius: 4,
        tiles: {
          [hexKey({ q: 0, r: 0 })]: makeTile({ q: 0, r: 0 }, { food: 2, gold: 1 }),
          [hexKey({ q: 1, r: 0 })]: makeTile(
            { q: 1, r: 0 },
            { food: 2, gold: 1 },
            { resource: 'river' },
          ),
        },
      },
    });

    expect(getHexYield(state, { q: 1, r: 0 }, 'city-1')).toEqual({ food: 2, gold: 1 });
    expect(calculateCityYield(state, 'city-1')).toEqual({ food: 3, gold: 3 });
    expect(calculateIncome(state, 'player-0')).toEqual({ food: 3, gold: 3 });
  });

  it('adds improvement yield to existing canonical tile yield', () => {
    const state = makeState({
      entities: { 'worker-1': makeWorker() },
    });

    const nextState = applyBuildImprovement(
      state,
      {
        type: 'BuildImprovement',
        playerId: 'player-0',
        entityId: 'worker-1',
        hex: { q: 1, r: 0 },
        improvementType: 'farm',
      },
      new EventBus(),
    );

    expect(nextState.map.tiles[hexKey({ q: 1, r: 0 })].yield).toEqual({ food: 4, gold: 1 });
    expect(getHexYield(nextState, { q: 1, r: 0 }, 'city-1')).toEqual({ food: 4, gold: 1 });
  });

  it('resolves only the active production item and emits unit completion feedback', () => {
    const state = makeState({
      map: {
        radius: 4,
        tiles: {
          [hexKey({ q: 0, r: 0 })]: makeTile({ q: 0, r: 0 }, { food: 2, gold: 1 }),
          [hexKey({ q: 1, r: 0 })]: makeTile({ q: 1, r: 0 }, { food: 2, progress: 2 }),
        },
      },
      cities: {
        'city-1': makeCity({
          productionQueue: [
            { id: 'spearman', kind: 'unit', progress: 0, cost: 2 },
            { id: 'granary', kind: 'building', progress: 0, cost: 10 },
          ],
        }),
      },
    });
    const eventBus = new EventBus();

    const nextState = CitySystem.processCities(state, 'player-0', eventBus);

    expect(nextState.entities['entity-7']?.typeId).toBe('spearman');
    expect(nextState.cities['city-1'].productionQueue).toEqual([
      { id: 'granary', kind: 'building', progress: 0, cost: 10 },
    ]);
    expect(eventBus.getEventsByType('UnitRecruited')).toHaveLength(1);
    expect(eventBus.getEventsByType('BuildingCompleted')).toHaveLength(0);
  });

  it('rejects unaffordable and already-busy building orders before command execution', () => {
    const poorState = makeState({
      players: {
        'player-0': makePlayer('player-0', {
          gold: 0,
          food: 0,
          wood: 0,
          stone: 0,
          iron: 0,
          mana: 0,
          progress: 0,
          science: 0,
        }),
        'player-1': makePlayer('player-1'),
      },
    });
    const poorEngine = makeEngine(poorState);
    const buildBarracks: BuildBuildingCommand = {
      type: 'BuildBuilding',
      playerId: 'player-0',
      cityId: 'city-1',
      buildingTypeId: 'barracks',
    };

    expect(poorEngine.validate(buildBarracks)).toEqual({
      valid: false,
      error: 'Insufficient resources',
    });
    expect(() => poorEngine.dispatch(buildBarracks)).toThrow(EngineError);
    expect(poorEngine.getCommandLog()).toHaveLength(0);

    const busyEngine = makeEngine(makeState({
      cities: {
        'city-1': makeCity({
          productionQueue: [{ id: 'granary', kind: 'building', progress: 1, cost: 10 }],
        }),
      },
    }));

    expect(busyEngine.validate(buildBarracks)).toEqual({
      valid: false,
      error: 'City is already constructing a building',
    });
  });
});

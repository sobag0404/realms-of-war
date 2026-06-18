import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/core/GameEngine';
import { createDefaultConfig } from '@/engine/core/GameConfig';
import type { CityState, GameState, EntityData, HexTile, PlayerState } from '@/engine/core/GameState';
import type { HexCoord, PlayerId } from '@/engine/core/types';
import { hexDistance, hexKey } from '@/engine/core/types';
import { AiSystem } from '@/engine/ecs/systems/AiSystem';
import { EventBus } from '@/engine/core/EventBus';

function makePlayer(id: PlayerId, isAI: boolean): PlayerState {
  return {
    id,
    name: id,
    color: isAI ? '#3498db' : '#e74c3c',
    isAI,
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
  };
}

function makeTile(coord: HexCoord): HexTile {
  return {
    coord,
    terrain: 'plains',
    resource: null,
    yield: { food: 2, gold: 1 },
    hasRoad: false,
    hasFort: false,
    owningCityId: null,
    improvement: null,
    hasRiftPortal: false,
    riftPortalOwner: null,
  };
}

function buildPlainsGrid(radius = 4): Record<string, HexTile> {
  const tiles: Record<string, HexTile> = {};
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const coord = { q, r };
      tiles[hexKey(coord)] = makeTile(coord);
    }
  }
  return tiles;
}

function makeUnit(id: string, ownerId: PlayerId, hex: HexCoord, overrides: Partial<EntityData> = {}): EntityData {
  return {
    id,
    typeId: 'spearman',
    ownerId,
    hex,
    movementPoints: 2,
    maxMovement: 2,
    hp: 45,
    maxHp: 45,
    attack: 8,
    defense: 6,
    attackType: 'melee',
    range: 1,
    hasActed: false,
    hasMoved: false,
    xp: 0,
    level: 1,
    promotions: [],
    upkeep: {},
    abilities: [],
    statusEffects: [],
    ...overrides,
  };
}

function makeCity(id: string, ownerId: PlayerId, hex: HexCoord, overrides: Partial<CityState> = {}): CityState {
  return {
    id,
    name: id,
    hex,
    ownerId,
    level: 1,
    population: 1,
    hp: 100,
    maxHp: 125,
    wallHp: 0,
    maxWallHp: 0,
    buildings: ['city_center'],
    growthProgress: 0,
    growthTarget: 10,
    workedHexes: [hexKey(hex)],
    productionQueue: [],
    productionPerTurn: 1,
    foodPerTurn: 2,
    territory: [hexKey(hex)],
    isUnderSiege: false,
    foundedTurn: 1,
    ...overrides,
  };
}

function makeState(
  turnOrder: PlayerId[],
  activePlayerId: PlayerId,
  aiPlayers: PlayerId[],
): GameState {
  const players: Record<PlayerId, PlayerState> = {};
  const entities: Record<string, EntityData> = {};
  turnOrder.forEach((id, index) => {
    players[id] = makePlayer(id, aiPlayers.includes(id));
    entities[`${id}-unit`] = makeUnit(`${id}-unit`, id, { q: index, r: 0 });
  });

  return {
    version: 1,
    seed: 42,
    turn: 1,
    phase: 'playerActions',
    activePlayerId,
    turnOrder,
    players,
    map: { radius: 4, tiles: buildPlainsGrid() },
    entities,
    cities: {},
    diplomacy: {},
    commandLogHash: '',
    gameOver: false,
    winnerId: null,
    victoryCondition: null,
    nextEntitySeq: turnOrder.length + 1,
    nextCitySeq: 1,
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

describe('GameEngine.resolveAutomatedTurns', () => {
  it('resolves consecutive AI turns and returns control to the local player', () => {
    const engine = makeEngine(makeState(['human', 'ai-1', 'ai-2'], 'ai-1', ['ai-1', 'ai-2']));

    const state = engine.resolveAutomatedTurns(['human']);

    expect(state.activePlayerId).toBe('human');
    expect(state.turn).toBe(2);
    expect(engine.getCommandLog().filter((command) => command.type === 'EndTurn')).toHaveLength(2);
  });

  it('respects the maximum automated turn bound', () => {
    const engine = makeEngine(makeState(['human', 'ai-1', 'ai-2'], 'ai-1', ['ai-1', 'ai-2']));

    const state = engine.resolveAutomatedTurns(['human'], 1);

    expect(state.activePlayerId).toBe('ai-2');
    expect(state.turn).toBe(1);
    expect(engine.getCommandLog().filter((command) => command.type === 'EndTurn')).toHaveLength(1);
  });

  it('force-ends an AI turn when generated commands never end the turn', () => {
    const engine = makeEngine(makeState(['human', 'ai-1'], 'ai-1', ['ai-1']));
    const spy = vi.spyOn(AiSystem, 'generateTurn').mockReturnValue([
      {
        type: 'MoveUnit',
        playerId: 'ai-1',
        entityId: 'missing-unit',
        path: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
      },
    ]);

    try {
      const state = engine.resolveAutomatedTurns(['human']);

      expect(state.activePlayerId).toBe('human');
      expect(engine.getCommandLog()).toEqual([{ type: 'EndTurn', playerId: 'ai-1' }]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('AiSystem movement generation', () => {
  it('generates adjacent movement steps toward nearby enemies', () => {
    const state = makeState(['human', 'ai-1'], 'ai-1', ['ai-1']);
    state.entities = {
      'ai-unit': makeUnit('ai-unit', 'ai-1', { q: 0, r: 0 }, { movementPoints: 2, maxMovement: 2 }),
      'human-unit': makeUnit('human-unit', 'human', { q: 3, r: 0 }),
    };

    const commands = AiSystem.generateTurn(state, 'ai-1', makeEngine(state).getEventBus());
    const move = commands.find((command) => command.type === 'MoveUnit');

    expect(move).toBeDefined();
    if (!move || move.type !== 'MoveUnit') return;

    expect(move.path).toEqual([{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]);
    for (let i = 1; i < move.path.length; i++) {
      expect(hexDistance(move.path[i - 1], move.path[i])).toBe(1);
    }
  });
});

describe('AiSystem city production generation', () => {
  it('emits an AI pressure report that explains production and economy pressure', () => {
    const state = makeState(['human', 'ai-1'], 'ai-1', ['ai-1']);
    state.players['ai-1'].resources = {
      gold: 15,
      food: 50,
      wood: 15,
      stone: 0,
      iron: 0,
      mana: 0,
      progress: 0,
      science: 0,
    };
    state.players['ai-1'].incomePerTurn = { gold: 3 };
    state.cities = {
      'ai-city-1': makeCity('ai-city-1', 'ai-1', { q: 0, r: 1 }),
      'ai-city-2': makeCity('ai-city-2', 'ai-1', { q: 1, r: 1 }),
    };
    const eventBus = new EventBus();

    AiSystem.generateTurn(state, 'ai-1', eventBus);
    const pressureEvents = eventBus.getEventsByType('AiPressureChanged');

    expect(pressureEvents).toHaveLength(1);
    expect(pressureEvents[0].payload).toMatchObject({
      playerId: 'ai-1',
      cityCount: 2,
      militaryUnitCount: 1,
      gold: 15,
      goldIncome: 3,
      plannedProduction: [
        { cityId: 'ai-city-1', kind: 'building', id: 'granary' },
      ],
    });
    expect(pressureEvents[0].payload.pressureScore).toBeGreaterThan(0);
  });

  it('queues affordable production for idle AI cities using a shared resource budget', () => {
    const state = makeState(['human', 'ai-1'], 'ai-1', ['ai-1']);
    state.players['ai-1'].resources = {
      gold: 15,
      food: 50,
      wood: 15,
      stone: 0,
      iron: 0,
      mana: 0,
      progress: 0,
      science: 0,
    };
    state.cities = {
      'ai-city-1': makeCity('ai-city-1', 'ai-1', { q: 0, r: 1 }),
      'ai-city-2': makeCity('ai-city-2', 'ai-1', { q: 1, r: 1 }),
    };

    const commands = AiSystem.generateTurn(state, 'ai-1', makeEngine(state).getEventBus());
    const productionCommands = commands.filter(
      (command) => command.type === 'BuildBuilding' || command.type === 'RecruitUnit',
    );

    expect(productionCommands).toEqual([
      {
        type: 'BuildBuilding',
        playerId: 'ai-1',
        cityId: 'ai-city-1',
        buildingTypeId: 'granary',
      },
    ]);
  });

  it('does not generate unaffordable or busy-city production commands', () => {
    const state = makeState(['human', 'ai-1'], 'ai-1', ['ai-1']);
    state.players['ai-1'].resources = {
      gold: 0,
      food: 0,
      wood: 0,
      stone: 0,
      iron: 0,
      mana: 0,
      progress: 0,
      science: 0,
    };
    state.cities = {
      'ai-city-1': makeCity('ai-city-1', 'ai-1', { q: 0, r: 1 }),
      'ai-city-2': makeCity('ai-city-2', 'ai-1', { q: 1, r: 1 }, {
        productionQueue: [{ id: 'granary', kind: 'building', progress: 1, cost: 10 }],
      }),
    };

    const commands = AiSystem.generateTurn(state, 'ai-1', makeEngine(state).getEventBus());

    expect(commands.some((command) => command.type === 'BuildBuilding')).toBe(false);
    expect(commands.some((command) => command.type === 'RecruitUnit')).toBe(false);
    expect(commands.at(-1)).toEqual({ type: 'EndTurn', playerId: 'ai-1' });
  });

  it('progresses AI production on turn start and queues the next idle-city order without invalid spam', () => {
    const state = makeState(['human', 'ai-1'], 'human', ['ai-1']);
    state.map.tiles[hexKey({ q: 0, r: 1 })] = makeTile({ q: 0, r: 1 });
    state.map.tiles[hexKey({ q: 0, r: 1 })].yield = { food: 2, progress: 2 };
    state.map.tiles[hexKey({ q: 2, r: 0 })] = makeTile({ q: 2, r: 0 });
    state.cities = {
      'human-city': makeCity('human-city', 'human', { q: 0, r: 0 }),
      'ai-city-1': makeCity('ai-city-1', 'ai-1', { q: 0, r: 1 }, {
        workedHexes: [hexKey({ q: 0, r: 1 })],
        productionQueue: [{ id: 'spearman', kind: 'unit', progress: 0, cost: 2 }],
      }),
    };
    state.entities = {
      'human-unit': makeUnit('human-unit', 'human', { q: 0, r: 0 }),
      'ai-unit': makeUnit('ai-unit', 'ai-1', { q: 2, r: 0 }),
    };
    state.nextEntitySeq = 10;
    const engine = makeEngine(state);

    engine.endTurn('human');
    const afterAiStart = engine.getState();
    expect(afterAiStart.entities['entity-10']?.typeId).toBe('spearman');

    const afterAutomation = engine.resolveAutomatedTurns(['human']);
    const productionCommands = engine.getCommandLog().filter(
      (command) => command.type === 'BuildBuilding' || command.type === 'RecruitUnit',
    );
    const pressureEvents = engine.getEventBus().getEventsByType('AiPressureChanged');

    expect(afterAutomation.activePlayerId).toBe('human');
    expect(productionCommands).toHaveLength(1);
    expect(['BuildBuilding', 'RecruitUnit']).toContain(productionCommands[0].type);
    expect(afterAutomation.cities['ai-city-1'].productionQueue).toHaveLength(1);
    expect(pressureEvents).toHaveLength(1);
    expect(pressureEvents[0].payload.militaryUnitCount).toBe(2);
    expect(pressureEvents[0].payload.plannedProduction).toHaveLength(1);
  });
});

describe('Strategic objective pressure feedback', () => {
  it('emits objective progress across AI production turns without persisting save fields', () => {
    const state = makeState(['human', 'ai-1'], 'human', ['ai-1']);
    state.map.tiles[hexKey({ q: 0, r: 1 })] = makeTile({ q: 0, r: 1 });
    state.map.tiles[hexKey({ q: 0, r: 1 })].yield = { food: 2, gold: 2, progress: 2 };
    state.cities = {
      'human-city': makeCity('human-city', 'human', { q: 0, r: 0 }),
      'ai-city-1': makeCity('ai-city-1', 'ai-1', { q: 0, r: 1 }, {
        workedHexes: [hexKey({ q: 0, r: 1 })],
        productionPerTurn: 2,
        productionQueue: [{ id: 'spearman', kind: 'unit', progress: 0, cost: 2 }],
      }),
    };
    state.entities = {
      'human-unit': makeUnit('human-unit', 'human', { q: 0, r: 0 }),
      'ai-unit': makeUnit('ai-unit', 'ai-1', { q: 2, r: 0 }),
    };
    state.nextEntitySeq = 10;
    const engine = makeEngine(state);

    engine.endTurn('human');
    const afterFirstAiStart = engine.getState();
    expect(afterFirstAiStart.entities['entity-10']?.typeId).toBe('spearman');

    engine.resolveAutomatedTurns(['human']);
    engine.endTurn('human');

    const aiObjectiveEvents = engine.getEventBus()
      .getEventsByType('StrategicObjectiveUpdated')
      .filter((event) => event.payload.playerId === 'ai-1');
    const productionCommands = engine.getCommandLog().filter(
      (command) => command.type === 'BuildBuilding' || command.type === 'RecruitUnit',
    );

    expect(aiObjectiveEvents).toHaveLength(2);
    expect(aiObjectiveEvents[0].payload).toMatchObject({
      playerId: 'ai-1',
      turn: 1,
      activeObjectiveId: expect.any(String),
    });
    expect(aiObjectiveEvents[1].payload.turn).toBe(2);
    expect(aiObjectiveEvents[1].payload.overallProgress)
      .toBeGreaterThanOrEqual(aiObjectiveEvents[0].payload.overallProgress);
    expect(aiObjectiveEvents[0].payload.objectives.find((objective) => objective.id === 'field_defense_force'))
      .toMatchObject({ progress: 2, target: 3 });
    expect(aiObjectiveEvents[1].payload.objectives.find((objective) => objective.id === 'stabilize_war_economy')?.progress)
      .toBeGreaterThanOrEqual(
        aiObjectiveEvents[0].payload.objectives.find((objective) => objective.id === 'stabilize_war_economy')?.progress ?? 0,
      );
    expect(productionCommands).toHaveLength(1);
    expect(engine.getState().cities['ai-city-1'].productionQueue).toHaveLength(1);
    expect((engine.getState() as Record<string, unknown>).strategicObjectives).toBeUndefined();
    expect((engine.getState() as Record<string, unknown>).objectiveReports).toBeUndefined();
  });
});

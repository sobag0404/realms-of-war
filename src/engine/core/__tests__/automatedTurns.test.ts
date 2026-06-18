import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '@/engine/core/GameEngine';
import { createDefaultConfig } from '@/engine/core/GameConfig';
import type { GameState, EntityData, HexTile, PlayerState } from '@/engine/core/GameState';
import type { HexCoord, PlayerId } from '@/engine/core/types';
import { hexDistance, hexKey } from '@/engine/core/types';
import { AiSystem } from '@/engine/ecs/systems/AiSystem';

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

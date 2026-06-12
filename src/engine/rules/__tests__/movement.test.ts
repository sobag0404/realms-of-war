/**
 * Unit tests for movement rules — canMoveTo, applyMovement
 */

import { describe, it, expect } from 'vitest';
import { canMoveTo, applyMovement } from '@/engine/rules/movementRules';
import type { GameState, EntityData, HexTile } from '@/engine/core/GameState';
import type { HexCoord } from '@/engine/core/types';
import { hexKey } from '@/engine/core/types';

// ─── Helpers to build minimal GameState ──────────────────────────────────────

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
    typeId: 'spearman',
    ownerId: 'player-0',
    hex: { q: 0, r: 0 },
    movementPoints: 3,
    maxMovement: 3,
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
    upkeep: { gold: 1, food: 1 },
    abilities: [],
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

/** Build a simple 5x5 grid of plains hexes centered at (0,0) */
function buildPlainsGrid(): Record<string, HexTile> {
  const tiles: Record<string, HexTile> = {};
  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      const coord: HexCoord = { q, r };
      tiles[hexKey(coord)] = makeTile('plains', { coord });
    }
  }
  return tiles;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('canMoveTo', () => {
  it('cannot move an entity that does not exist', () => {
    const state = makeGameState({ map: { radius: 10, tiles: buildPlainsGrid() } });
    const result = canMoveTo(state, 'nonexistent', { q: 1, r: 0 });
    expect(result.canMove).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('cannot move when movement points are 0', () => {
    const entity = makeEntity({ movementPoints: 0 });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity },
    });
    const result = canMoveTo(state, 'entity-1', { q: 1, r: 0 });
    expect(result.canMove).toBe(false);
    expect(result.reason).toContain('movement points');
  });

  it('cannot move to impassable terrain (mountain)', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const tiles = buildPlainsGrid();
    tiles['1,0'] = makeTile('mountain', { coord: { q: 1, r: 0 } });

    const state = makeGameState({
      map: { radius: 10, tiles },
      entities: { 'entity-1': entity },
    });
    const result = canMoveTo(state, 'entity-1', { q: 1, r: 0 });
    expect(result.canMove).toBe(false);
    expect(result.reason).toContain('impassable');
  });

  it('cannot move to water terrain', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const tiles = buildPlainsGrid();
    tiles['1,0'] = makeTile('water', { coord: { q: 1, r: 0 } });

    const state = makeGameState({
      map: { radius: 10, tiles },
      entities: { 'entity-1': entity },
    });
    const result = canMoveTo(state, 'entity-1', { q: 1, r: 0 });
    expect(result.canMove).toBe(false);
    expect(result.reason).toContain('impassable');
  });

  it('can move to walkable terrain with enough MP', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity },
    });
    const result = canMoveTo(state, 'entity-1', { q: 1, r: 0 });
    expect(result.canMove).toBe(true);
    expect(result.cost).toBe(1);
    expect(result.remainingMP).toBe(4);
  });

  it('cannot move to a hex occupied by a friendly unit', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const friendly = makeEntity({
      id: 'entity-2',
      ownerId: 'player-0',
      hex: { q: 1, r: 0 },
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity, 'entity-2': friendly },
    });
    const result = canMoveTo(state, 'entity-1', { q: 1, r: 0 });
    expect(result.canMove).toBe(false);
    expect(result.reason).toContain('friendly');
  });

  it('cannot move to a hex occupied by an enemy unit', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const enemy = makeEntity({
      id: 'entity-2',
      ownerId: 'player-1',
      hex: { q: 1, r: 0 },
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity, 'entity-2': enemy },
    });
    const result = canMoveTo(state, 'entity-1', { q: 1, r: 0 });
    expect(result.canMove).toBe(false);
    expect(result.reason).toContain('enemy');
  });
});

describe('applyMovement', () => {
  it('updates position and deducts movement points', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity },
    });

    const path: HexCoord[] = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ];
    const newState = applyMovement(state, 'entity-1', path);

    expect(newState.entities['entity-1'].hex).toEqual({ q: 1, r: 0 });
    expect(newState.entities['entity-1'].movementPoints).toBe(4);
    expect(newState.entities['entity-1'].hasMoved).toBe(true);
  });

  it('does not mutate the original state', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity },
    });

    const path: HexCoord[] = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ];
    const newState = applyMovement(state, 'entity-1', path);

    // Original state unchanged
    expect(state.entities['entity-1'].hex).toEqual({ q: 0, r: 0 });
    expect(state.entities['entity-1'].movementPoints).toBe(5);
    // New state changed
    expect(newState.entities['entity-1'].hex).toEqual({ q: 1, r: 0 });
  });

  it('returns original state if entity does not exist', () => {
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
    });
    const path: HexCoord[] = [{ q: 0, r: 0 }, { q: 1, r: 0 }];
    const result = applyMovement(state, 'nonexistent', path);
    expect(result).toBe(state);
  });

  it('returns original state if path is too short', () => {
    const entity = makeEntity({ hex: { q: 0, r: 0 }, movementPoints: 5 });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { 'entity-1': entity },
    });
    const result = applyMovement(state, 'entity-1', [{ q: 0, r: 0 }]);
    expect(result).toBe(state);
  });
});

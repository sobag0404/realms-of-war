/**
 * Unit tests for combat rules — canAttack, calculateCombat, applyCombat
 */

import { describe, it, expect } from 'vitest';
import { canAttack, calculateCombat, applyCombat } from '@/engine/rules/combatRules';
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
    typeId: 'spearman',
    ownerId: 'player-0',
    hex: { q: 0, r: 0 },
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
    nextEntitySeq: 3,
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

describe('canAttack', () => {
  it('cannot attack own unit', () => {
    const attacker = makeEntity({ id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 } });
    const defender = makeEntity({ id: 'e2', ownerId: 'player-0', hex: { q: 1, r: 0 } });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
    });
    const result = canAttack(state, 'e1', 'e2');
    expect(result.canAttack).toBe(false);
    expect(result.reason).toContain('friendly');
  });

  it('can attack enemy unit at range 1 with melee attacker', () => {
    const attacker = makeEntity({ id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 }, range: 1 });
    const defender = makeEntity({ id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 } });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
      diplomacy: { 'player-0:player-1': { status: 'war', sinceTurn: 1, peaceTreatyTurns: 0 } },
    });
    const result = canAttack(state, 'e1', 'e2');
    expect(result.canAttack).toBe(true);
  });

  it('cannot attack if attacker has already acted', () => {
    const attacker = makeEntity({ id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 }, hasActed: true });
    const defender = makeEntity({ id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 } });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
      diplomacy: { 'player-0:player-1': { status: 'war', sinceTurn: 1, peaceTreatyTurns: 0 } },
    });
    const result = canAttack(state, 'e1', 'e2');
    expect(result.canAttack).toBe(false);
    expect(result.reason).toContain('already acted');
  });

  it('cannot attack target out of range', () => {
    const attacker = makeEntity({ id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 }, range: 1 });
    const defender = makeEntity({ id: 'e2', ownerId: 'player-1', hex: { q: 3, r: 0 } });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
      diplomacy: { 'player-0:player-1': { status: 'war', sinceTurn: 1, peaceTreatyTurns: 0 } },
    });
    const result = canAttack(state, 'e1', 'e2');
    expect(result.canAttack).toBe(false);
    expect(result.reason).toContain('range');
  });
});

describe('calculateCombat', () => {
  it('deals damage deterministically with fixed values', () => {
    const attacker = makeEntity({
      id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 },
      attack: 20, defense: 5, range: 1,
    });
    const defender = makeEntity({
      id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 },
      attack: 10, defense: 5, hp: 100,
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
    });

    // Run twice — must produce same result (deterministic seeded random)
    const result1 = calculateCombat(state, 'e1', 'e2', null);
    const result2 = calculateCombat(state, 'e1', 'e2', null);
    expect(result1.attackerDamage).toBe(result2.attackerDamage);
    expect(result1.defenderDamage).toBe(result2.defenderDamage);

    // Damage should be positive
    expect(result1.attackerDamage).toBeGreaterThan(0);
  });

  it('minimum damage is 1 even if defense is very high', () => {
    const attacker = makeEntity({
      id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 },
      attack: 1, defense: 0, range: 1,
    });
    const defender = makeEntity({
      id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 },
      attack: 0, defense: 1000, hp: 100,
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
    });
    const result = calculateCombat(state, 'e1', 'e2', null);
    expect(result.attackerDamage).toBeGreaterThanOrEqual(1);
  });

  it('counterattack deals damage when defender survives melee', () => {
    const attacker = makeEntity({
      id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 },
      attack: 5, defense: 2, hp: 100, range: 1,
    });
    const defender = makeEntity({
      id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 },
      attack: 10, defense: 5, hp: 100,
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
    });
    const result = calculateCombat(state, 'e1', 'e2', null);

    // Defender should survive with 100 HP minus small damage
    expect(result.defenderKilled).toBe(false);
    // Counter-attack damage should be positive
    expect(result.defenderDamage).toBeGreaterThan(0);
  });
});

describe('applyCombat', () => {
  it('sets attacker hasActed = true after combat', () => {
    const attacker = makeEntity({
      id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 },
      attack: 20, defense: 5, hp: 100, range: 1,
    });
    const defender = makeEntity({
      id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 },
      attack: 5, defense: 5, hp: 100,
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
    });

    const { state: newState } = applyCombat(state, 'e1', 'e2', null);
    expect(newState.entities['e1'].hasActed).toBe(true);
  });

  it('removes defender from state if killed', () => {
    const attacker = makeEntity({
      id: 'e1', ownerId: 'player-0', hex: { q: 0, r: 0 },
      attack: 100, defense: 50, hp: 100, range: 1,
    });
    const defender = makeEntity({
      id: 'e2', ownerId: 'player-1', hex: { q: 1, r: 0 },
      attack: 0, defense: 0, hp: 1,
    });
    const state = makeGameState({
      map: { radius: 10, tiles: buildPlainsGrid() },
      entities: { e1: attacker, e2: defender },
    });

    const { result, state: newState } = applyCombat(state, 'e1', 'e2', null);
    if (result.defenderKilled) {
      expect(newState.entities['e2']).toBeUndefined();
    }
  });
});

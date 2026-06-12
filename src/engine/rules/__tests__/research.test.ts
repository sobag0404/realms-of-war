/**
 * Unit tests for research rules — canResearch, applyResearch, getCurrentEra
 */

import { describe, it, expect } from 'vitest';
import { canResearch, applyResearch, getCurrentEra } from '@/engine/rules/researchRules';
import type { GameState, PlayerState } from '@/engine/core/GameState';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
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
    sciencePerTurn: 5,
    incomePerTurn: {},
    upkeepPerTurn: {},
    visibleHexes: [],
    exploredHexes: [],
    score: 0,
    lastActiveTurn: 1,
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
    turnOrder: ['player-0'],
    players: {
      'player-0': makePlayer(),
    },
    map: { radius: 10, tiles: {} },
    entities: {},
    cities: {},
    diplomacy: {},
    commandLogHash: '',
    gameOver: false,
    winnerId: null,
    victoryCondition: null,
    nextEntitySeq: 1,
    nextCitySeq: 1,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('canResearch', () => {
  it('cannot research without prerequisites', () => {
    // 'archery' requires 'hunting' — player has no techs
    const player = makePlayer({ techs: [] });
    const state = makeGameState({ players: { 'player-0': player } });
    const result = canResearch(state, 'player-0', 'archery');
    expect(result.canResearch).toBe(false);
    expect(result.reason).toContain('prerequisite');
  });

  it('can research a primitive-era tech with no prerequisites', () => {
    // 'toolmaking' has no prerequisites
    const player = makePlayer({ techs: [] });
    const state = makeGameState({ players: { 'player-0': player } });
    const result = canResearch(state, 'player-0', 'toolmaking');
    expect(result.canResearch).toBe(true);
  });

  it('cannot research a tech already researched', () => {
    const player = makePlayer({ techs: ['toolmaking'] as unknown as string[] });
    const state = makeGameState({ players: { 'player-0': player } });
    const result = canResearch(state, 'player-0', 'toolmaking');
    expect(result.canResearch).toBe(false);
    expect(result.reason).toContain('already researched');
  });

  it('cannot research a tech that is already being researched', () => {
    const player = makePlayer({ currentResearch: 'toolmaking' });
    const state = makeGameState({ players: { 'player-0': player } });
    const result = canResearch(state, 'player-0', 'toolmaking');
    expect(result.canResearch).toBe(false);
    expect(result.reason).toContain('Already researching');
  });

  it('can research a tech when prerequisites are met', () => {
    // 'archery' requires 'hunting'
    const player = makePlayer({ techs: ['hunting'] as unknown as string[] });
    const state = makeGameState({ players: { 'player-0': player } });
    const result = canResearch(state, 'player-0', 'archery');
    expect(result.canResearch).toBe(true);
  });

  it('returns false for nonexistent player', () => {
    const state = makeGameState();
    const result = canResearch(state, 'nonexistent', 'toolmaking');
    expect(result.canResearch).toBe(false);
  });

  it('returns false for eliminated player', () => {
    const player = makePlayer({ isAlive: false });
    const state = makeGameState({ players: { 'player-0': player } });
    const result = canResearch(state, 'player-0', 'toolmaking');
    expect(result.canResearch).toBe(false);
  });
});

describe('applyResearch', () => {
  it('start research sets currentResearch', () => {
    // Manually set currentResearch to simulate starting research
    const player = makePlayer({
      currentResearch: 'toolmaking',
      researchProgress: 0,
      sciencePerTurn: 5,
    });
    const state = makeGameState({ players: { 'player-0': player } });

    const newState = applyResearch(state, 'player-0');
    expect(newState.players['player-0'].researchProgress).toBe(5);
  });

  it('progress accumulates over multiple turns', () => {
    const player = makePlayer({
      currentResearch: 'toolmaking',
      researchProgress: 0,
      sciencePerTurn: 10,
    });
    const state = makeGameState({ players: { 'player-0': player } });

    // Apply research twice
    let state1 = applyResearch(state, 'player-0');
    state1 = applyResearch(state1, 'player-0');

    // 10 + 10 = 20 progress
    expect(state1.players['player-0'].researchProgress).toBe(20);
  });

  it('completes research when progress meets cost', () => {
    // toolmaking cost = 25 * 1 = 25
    const player = makePlayer({
      currentResearch: 'toolmaking',
      researchProgress: 20,
      sciencePerTurn: 10,
    });
    const state = makeGameState({ players: { 'player-0': player } });

    const newState = applyResearch(state, 'player-0');

    // 20 + 10 = 30 >= 25, so research completes
    expect(newState.players['player-0'].techs).toContain('toolmaking');
    expect(newState.players['player-0'].currentResearch).toBeNull();
    expect(newState.players['player-0'].researchProgress).toBe(0);
  });

  it('does nothing if no current research', () => {
    const player = makePlayer({ currentResearch: null, sciencePerTurn: 10 });
    const state = makeGameState({ players: { 'player-0': player } });
    const newState = applyResearch(state, 'player-0');
    expect(newState).toEqual(state);
  });
});

describe('getCurrentEra', () => {
  it('returns primitives for 0 techs', () => {
    expect(getCurrentEra([])).toBe('primitives');
  });

  it('returns earlyCiv for 3 techs', () => {
    expect(getCurrentEra(['a', 'b', 'c'])).toBe('earlyCiv');
  });

  it('returns medieval for 7 techs', () => {
    expect(getCurrentEra(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBe('medieval');
  });

  it('returns renaissance for 12 techs', () => {
    const techs = Array.from({ length: 12 }, (_, i) => `t${i}`);
    expect(getCurrentEra(techs)).toBe('renaissance');
  });

  it('returns rift for 18 techs', () => {
    const techs = Array.from({ length: 18 }, (_, i) => `t${i}`);
    expect(getCurrentEra(techs)).toBe('rift');
  });
});

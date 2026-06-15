import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveGame } from '@/engine/save/saveGame';
import type { SaveFile } from '@/engine/save/saveGame';
import type { GameConfig } from '@/engine/core/GameConfig';
import type { GameState } from '@/engine/core/GameState';
import { ServerSaveRepository } from '@/save/serverSaveRepository';
import { serializeSaveWithChecksum } from '@/lib/saveService';

const originalFetch = globalThis.fetch;

function makeGameState(): GameState {
  return {
    version: 1,
    seed: 42,
    turn: 3,
    phase: 'start',
    activePlayerId: 'player-0',
    turnOrder: ['player-0'],
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
  };
}

function makeGameConfig(): GameConfig {
  return {
    version: 1,
    mode: 'single',
    seed: 42,
    difficulty: 'chieftain',
    speed: 'normal',
    map: {
      radius: 10,
      type: 'continents',
      waterLevel: 0.3,
      mountainDensity: 0.1,
      forestDensity: 0.2,
      resourceAbundance: 0.5,
      riftPortals: 3,
    },
    victory: {
      conditions: ['conquest'],
      conquestCityCount: 10,
      scienceTargetEra: 'renaissance',
      economicGoldTarget: 5000,
      riftPortalCount: 3,
      maxTurns: 300,
    },
    players: [
      { id: 'player-0', name: 'Player 1', color: '#e74c3c', isAI: false, slot: 0 },
    ],
    fogOfWar: true,
    barbarians: true,
    startEra: 'primitives',
    startResources: { gold: 100, food: 50, wood: 50, stone: 30 },
  };
}

function makeSaveFile(name = 'Server Save'): SaveFile {
  return saveGame(name, makeGameState(), makeGameConfig(), [], 42, 0);
}

function mockJsonResponse(payload: unknown, ok = true, status = ok ? 200 : 500): Response {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response;
}

function mockFetch(responseFactory: () => Promise<Response>): void {
  globalThis.fetch = vi.fn(responseFactory) as unknown as typeof fetch;
}

describe('ServerSaveRepository', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('lists validated server summaries with source metadata', async () => {
    mockFetch(async () => mockJsonResponse({
      saves: [{
        id: 'server-save',
        name: 'Server Save',
        turn: 3,
        players: 'Player 1',
        createdAt: '2026-06-14T00:00:00.000Z',
        updatedAt: '2026-06-14T00:00:00.000Z',
      }],
    }));

    await expect(new ServerSaveRepository().list()).resolves.toMatchObject([
      { id: 'server-save', source: 'server', health: 'available' },
    ]);
  });

  it('rejects invalid server list payloads', async () => {
    mockFetch(async () => mockJsonResponse({ saves: [{ id: 1 }] }));

    await expect(new ServerSaveRepository().list()).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('rejects server checksum mismatches as corrupt saves', async () => {
    const { data, checksum } = serializeSaveWithChecksum(makeSaveFile('Server Save'));
    mockFetch(async () => mockJsonResponse({
      id: 'server-save',
      name: 'Server Save',
      turn: 3,
      players: 'Player 1',
      createdAt: '2026-06-14T00:00:00.000Z',
      updatedAt: '2026-06-14T00:00:00.000Z',
      data: data.replace('Server Save', 'Tampered Save'),
      checksum,
    }));

    await expect(new ServerSaveRepository().load('server-save')).rejects.toMatchObject({
      code: 'corrupt',
    });
  });

  it('rejects invalid server load payloads', async () => {
    mockFetch(async () => mockJsonResponse({ id: 'missing-data' }));

    await expect(new ServerSaveRepository().load('missing-data')).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('returns save metadata with validation-derived fields after server save', async () => {
    mockFetch(async () => mockJsonResponse({ id: 'server-new-save' }));

    const summary = await new ServerSaveRepository().save({
      name: 'Server Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile('Server Save'),
    });

    expect(summary).toMatchObject({
      id: 'server-new-save',
      source: 'server',
      health: 'available',
      saveVersion: 1,
      map: 'continents, radius 10',
    });
  });
});

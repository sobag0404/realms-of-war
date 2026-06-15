import { describe, expect, it } from 'vitest';
import { BrowserLocalSaveRepository } from '@/save/browserLocalSaveRepository';
import { SaveRepositoryError } from '@/save/types';
import { saveGame } from '@/engine/save/saveGame';
import type { SaveFile } from '@/engine/save/saveGame';
import type { GameState } from '@/engine/core/GameState';
import type { GameConfig } from '@/engine/core/GameConfig';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

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

function makeSaveFile(name = 'Local Save'): SaveFile {
  return saveGame(name, makeGameState(), makeGameConfig(), [], 42, 0);
}

describe('BrowserLocalSaveRepository localStorage fallback', () => {
  it('saves, lists, loads, and deletes validated save files', async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserLocalSaveRepository({
      indexedDB: undefined,
      localStorage: storage,
      now: () => 1_700_000_000_000,
      idFactory: () => 'local-test-save',
    });

    const summary = await repository.save({
      name: 'Local Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile(),
    });

    expect(summary.id).toBe('local-test-save');
    expect(await repository.list()).toEqual([summary]);

    const loaded = await repository.load(summary.id);
    expect(loaded.summary).toEqual(summary);
    expect(loaded.saveFile.name).toBe('Local Save');
    expect(loaded.saveFile.gameState.turn).toBe(3);

    await repository.delete(summary.id);
    expect(await repository.list()).toEqual([]);
    await expect(repository.load(summary.id)).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('ignores malformed storage lists instead of crashing', async () => {
    const storage = new MemoryStorage();
    storage.setItem('realms-of-war.local-saves.v1', '{not json');

    const repository = new BrowserLocalSaveRepository({
      indexedDB: undefined,
      localStorage: storage,
    });

    await expect(repository.list()).resolves.toEqual([]);
  });

  it('marks corrupted primary data as recoverable and loads the backup copy', async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserLocalSaveRepository({
      indexedDB: undefined,
      localStorage: storage,
      idFactory: () => 'local-corrupt-save',
    });
    const summary = await repository.save({
      name: 'Corrupt Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile('Corrupt Save'),
    });
    const records = JSON.parse(storage.getItem('realms-of-war.local-saves.v1') ?? '[]');
    records[0].data = records[0].data.replace('Corrupt Save', 'Tampered Save');
    storage.setItem('realms-of-war.local-saves.v1', JSON.stringify(records));

    await expect(repository.list()).resolves.toMatchObject([
      { id: summary.id, health: 'recoverable' },
    ]);
    const loaded = await repository.load(summary.id);
    expect(loaded.summary.health).toBe('recoverable');
    expect(loaded.saveFile.name).toBe('Corrupt Save');
  });

  it('keeps unrecoverable corrupted records visible but unloadable', async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserLocalSaveRepository({
      indexedDB: undefined,
      localStorage: storage,
      idFactory: () => 'local-corrupt-no-backup',
    });
    const summary = await repository.save({
      name: 'Corrupt Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile('Corrupt Save'),
    });
    const records = JSON.parse(storage.getItem('realms-of-war.local-saves.v1') ?? '[]');
    delete records[0].backupData;
    delete records[0].backupChecksum;
    records[0].data = records[0].data.replace('Corrupt Save', 'Tampered Save');
    storage.setItem('realms-of-war.local-saves.v1', JSON.stringify(records));

    await expect(repository.list()).resolves.toMatchObject([
      { id: summary.id, health: 'corrupt' },
    ]);
    await expect(repository.load(summary.id)).rejects.toBeInstanceOf(SaveRepositoryError);
    await expect(repository.load(summary.id)).rejects.toMatchObject({
      code: 'corrupt',
    });
  });

  it('rejects oversized saves before writing them', async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserLocalSaveRepository({
      indexedDB: undefined,
      localStorage: storage,
      idFactory: () => 'local-too-large-save',
    });
    const saveFile = makeSaveFile('Large Save');
    saveFile.name = 'x'.repeat(2_000_100);

    await expect(repository.save({
      name: 'Large Save',
      turn: 3,
      players: 'Player 1',
      saveFile,
    })).rejects.toMatchObject({ code: 'too-large' });
    expect(await repository.list()).toEqual([]);
  });

  it('falls back to localStorage when IndexedDB cannot open', async () => {
    const storage = new MemoryStorage();
    const indexedDB = {
      open: () => {
        const request = {} as IDBOpenDBRequest;
        queueMicrotask(() => {
          Object.defineProperty(request, 'error', {
            value: new DOMException('blocked', 'UnknownError'),
          });
          request.onerror?.(new Event('error'));
        });
        return request;
      },
    } as unknown as IDBFactory;
    const repository = new BrowserLocalSaveRepository({
      indexedDB,
      localStorage: storage,
      idFactory: () => 'local-fallback-save',
    });

    const summary = await repository.save({
      name: 'Fallback Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile('Fallback Save'),
    });

    expect(summary.id).toBe('local-fallback-save');
    expect(storage.getItem('realms-of-war.local-saves.v1')).toContain('Fallback Save');
    await expect(repository.load(summary.id)).resolves.toMatchObject({
      summary: { id: summary.id, source: 'browser-local' },
    });
  });
});

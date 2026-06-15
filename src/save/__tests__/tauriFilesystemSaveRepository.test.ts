import { describe, expect, it } from 'vitest';
import { saveGame } from '@/engine/save/saveGame';
import type { SaveFile } from '@/engine/save/saveGame';
import type { GameConfig } from '@/engine/core/GameConfig';
import type { GameState } from '@/engine/core/GameState';
import { BrowserLocalSaveRepository } from '@/save/browserLocalSaveRepository';
import { TauriFilesystemSaveRepository } from '@/save/tauriFilesystemSaveRepository';
import { SaveRepositoryError } from '@/save/types';
import { serializeSaveWithChecksum } from '@/lib/saveService';

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

function makeSaveFile(name = 'Desktop Save'): SaveFile {
  return saveGame(name, makeGameState(), makeGameConfig(), [], 42, 0);
}

describe('TauriFilesystemSaveRepository', () => {
  it('saves, lists, loads, and deletes validated desktop records through invoke', async () => {
    const records = new Map<string, unknown>();
    const repository = new TauriFilesystemSaveRepository({
      now: () => 1_700_000_000_000,
      idFactory: () => 'desktop-test-save',
      invoke: async (command, args) => {
        if (command === 'desktop_save_list') return Array.from(records.values()) as never;
        if (command === 'desktop_save_load') return (records.get(String(args?.id)) ?? null) as never;
        if (command === 'desktop_save_write') {
          const record = args?.record as { id: string };
          records.set(record.id, record);
          return undefined as never;
        }
        if (command === 'desktop_save_delete') {
          records.delete(String(args?.id));
          return undefined as never;
        }
        throw new Error(`unexpected command ${command}`);
      },
    });

    const summary = await repository.save({
      name: 'Desktop Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile(),
    });

    expect(summary.id).toBe('desktop-test-save');
    expect(await repository.list()).toEqual([summary]);

    const loaded = await repository.load(summary.id);
    expect(loaded.summary).toEqual(summary);
    expect(loaded.saveFile.name).toBe('Desktop Save');

    await repository.delete(summary.id);
    expect(await repository.list()).toEqual([]);
    await expect(repository.load(summary.id)).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('keeps legacy browser-local saves visible as fallback entries', async () => {
    const browserRepository = new BrowserLocalSaveRepository({
      indexedDB: undefined,
      localStorage: new MemoryStorage(),
      now: () => 1_700_000_100_000,
      idFactory: () => 'local-legacy-save',
    });
    const legacySummary = await browserRepository.save({
      name: 'Legacy Save',
      turn: 3,
      players: 'Player 1',
      saveFile: makeSaveFile('Legacy Save'),
    });

    const repository = new TauriFilesystemSaveRepository({
      fallbackRepository: browserRepository,
      invoke: async (command) => {
        if (command === 'desktop_save_list') return [] as never;
        throw new Error(`unexpected command ${command}`);
      },
    });

    expect(await repository.list()).toEqual([legacySummary]);
    const loaded = await repository.load(legacySummary.id);
    expect(loaded.saveFile.name).toBe('Legacy Save');
  });

  it('rejects corrupted desktop records before loading save data', async () => {
    const repository = new TauriFilesystemSaveRepository({
      invoke: async (command) => {
        if (command === 'desktop_save_load') {
          return {
            storageVersion: 1,
            id: 'desktop-corrupt-save',
            name: 'Corrupt Save',
            turn: 3,
            players: 'Player 1',
            createdAt: '2026-06-14T00:00:00.000Z',
            updatedAt: '2026-06-14T00:00:00.000Z',
            data: '{"bad":true}',
            checksum: 'invalid',
          } as never;
        }
        throw new Error(`unexpected command ${command}`);
      },
    });

    await expect(repository.load('desktop-corrupt-save')).rejects.toBeInstanceOf(SaveRepositoryError);
    await expect(repository.load('desktop-corrupt-save')).rejects.toMatchObject({
      code: 'corrupt',
    });
  });

  it('loads the backup copy when desktop primary data is corrupted', async () => {
    const { data, checksum } = serializeSaveWithChecksum(makeSaveFile('Backup Save'));
    const repository = new TauriFilesystemSaveRepository({
      invoke: async (command) => {
        if (command === 'desktop_save_load') {
          return {
            storageVersion: 1,
            id: 'desktop-recoverable-save',
            name: 'Backup Save',
            turn: 3,
            players: 'Player 1',
            createdAt: '2026-06-14T00:00:00.000Z',
            updatedAt: '2026-06-14T00:00:00.000Z',
            data: data.replace('Backup Save', 'Tampered Save'),
            checksum,
            backupData: data,
            backupChecksum: checksum,
          } as never;
        }
        throw new Error(`unexpected command ${command}`);
      },
    });

    const loaded = await repository.load('desktop-recoverable-save');
    expect(loaded.summary).toMatchObject({
      id: 'desktop-recoverable-save',
      health: 'recoverable',
      source: 'tauri-fs',
    });
    expect(loaded.saveFile.name).toBe('Backup Save');
  });

  it('marks future desktop storage versions as unsupported', async () => {
    const { data, checksum } = serializeSaveWithChecksum(makeSaveFile('Future Save'));
    const record = {
      storageVersion: 99,
      id: 'desktop-future-save',
      name: 'Future Save',
      turn: 3,
      players: 'Player 1',
      createdAt: '2026-06-14T00:00:00.000Z',
      updatedAt: '2026-06-14T00:00:00.000Z',
      data,
      checksum,
    };
    const repository = new TauriFilesystemSaveRepository({
      invoke: async (command) => {
        if (command === 'desktop_save_list') return [record] as never;
        if (command === 'desktop_save_load') return record as never;
        throw new Error(`unexpected command ${command}`);
      },
    });

    await expect(repository.list()).resolves.toMatchObject([
      { id: 'desktop-future-save', health: 'unsupported' },
    ]);
    await expect(repository.load('desktop-future-save')).rejects.toMatchObject({
      code: 'unsupported',
    });
  });

  it('wraps desktop load invoke failures as corrupt save errors', async () => {
    const repository = new TauriFilesystemSaveRepository({
      invoke: async (command) => {
        if (command === 'desktop_save_load') {
          throw new Error('failed to read save file');
        }
        throw new Error(`unexpected command ${command}`);
      },
    });

    await expect(repository.load('desktop-read-error')).rejects.toMatchObject({
      code: 'corrupt',
      message: 'failed to read save file',
    });
  });

  it('rejects oversized desktop saves before invoking filesystem writes', async () => {
    let invoked = false;
    const repository = new TauriFilesystemSaveRepository({
      idFactory: () => 'desktop-too-large-save',
      invoke: async () => {
        invoked = true;
        return undefined as never;
      },
    });
    const saveFile = makeSaveFile('Large Save');
    saveFile.name = 'x'.repeat(2_000_100);

    await expect(repository.save({
      name: 'Large Save',
      turn: 3,
      players: 'Player 1',
      saveFile,
    })).rejects.toMatchObject({ code: 'too-large' });
    expect(invoked).toBe(false);
  });
});

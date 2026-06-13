/**
 * Unit tests for save/load — serialization, validation, checksum, migrations
 */

import { describe, it, expect } from 'vitest';
import {
  saveGame,
  serializeSave,
  calculateChecksum,
} from '@/engine/save/saveGame';
import {
  deserializeSave,
  validateSave,
  loadGame,
} from '@/engine/save/loadGame';
import {
  CURRENT_SAVE_VERSION,
  applyMigrations,
} from '@/engine/save/migrations';
import type { SaveFile } from '@/engine/save/saveGame';
import type { GameState } from '@/engine/core/GameState';
import type { GameConfig } from '@/engine/core/GameConfig';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMinimalGameState(): GameState {
  return {
    version: 1,
    seed: 42,
    turn: 1,
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

function makeMinimalGameConfig(): GameConfig {
  return {
    version: 1,
    mode: 'single',
    seed: 42,
    difficulty: 'chieftain',
    speed: 'normal',
    map: {
      radius: 20,
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

function makeValidSaveFile(): SaveFile {
  return saveGame(
    'Test Save',
    makeMinimalGameState(),
    makeMinimalGameConfig(),
    [],
    42,
    0,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('serialize / deserialize roundtrip', () => {
  it('roundtrips a save file through serialize and deserialize', () => {
    const save = makeValidSaveFile();
    const json = serializeSave(save);
    const loaded = deserializeSave(json);

    expect(loaded.version).toBe(save.version);
    expect(loaded.name).toBe(save.name);
    expect(loaded.gameState.seed).toBe(save.gameState.seed);
    expect(loaded.gameState.turn).toBe(save.gameState.turn);
    expect(loaded.rngState.seed).toBe(save.rngState.seed);
    expect(loaded.rngState.position).toBe(save.rngState.position);
  });
});

describe('validateSave', () => {
  it('accepts a valid save file', () => {
    const save = makeValidSaveFile();
    const result = validateSave(save);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid JSON (non-object input)', () => {
    const result = validateSave(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects save with invalid version (0)', () => {
    const save = makeValidSaveFile();
    save.version = 0;
    const result = validateSave(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('version'))).toBe(true);
  });

  it('rejects save with future version', () => {
    const save = makeValidSaveFile();
    save.version = CURRENT_SAVE_VERSION + 10;
    const result = validateSave(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('newer'))).toBe(true);
  });

  it('rejects save missing timestamp', () => {
    const save = makeValidSaveFile() as unknown as Record<string, unknown>;
    delete save.timestamp;
    const result = validateSave(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('timestamp'))).toBe(true);
  });

  it('rejects save missing name', () => {
    const save = makeValidSaveFile() as unknown as Record<string, unknown>;
    delete save.name;
    const result = validateSave(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('rejects save with missing gameState', () => {
    const save = makeValidSaveFile() as unknown as Record<string, unknown>;
    delete save.gameState;
    const result = validateSave(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('gameState'))).toBe(true);
  });

  it('rejects save with missing rngState', () => {
    const save = makeValidSaveFile() as unknown as Record<string, unknown>;
    delete save.rngState;
    const result = validateSave(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('rngState'))).toBe(true);
  });
});

describe('calculateChecksum', () => {
  it('produces the same checksum for the same data', () => {
    const data = '{"test": "data", "number": 42}';
    expect(calculateChecksum(data)).toBe(calculateChecksum(data));
  });

  it('produces different checksums for different data', () => {
    const data1 = '{"test": "data1"}';
    const data2 = '{"test": "data2"}';
    expect(calculateChecksum(data1)).not.toBe(calculateChecksum(data2));
  });
});

describe('deserializeSave', () => {
  it('throws on invalid JSON', () => {
    expect(() => deserializeSave('{not valid json')).toThrow(/parse/i);
  });

  it('throws on save that fails validation', () => {
    const badSave = JSON.stringify({ version: 99, timestamp: 0, name: '' });
    expect(() => deserializeSave(badSave)).toThrow(/validation/i);
  });
});

describe('loadGame', () => {
  it('extracts gameState from a valid save file', () => {
    const save = makeValidSaveFile();
    const gameState = loadGame(save);
    expect(gameState.seed).toBe(42);
    expect(gameState.turn).toBe(1);
  });

  it('throws if save has no gameState', () => {
    const save = makeValidSaveFile() as unknown as Record<string, unknown>;
    delete save.gameState;
    expect(() => loadGame(save as unknown as SaveFile)).toThrow(/no gameState/);
  });
});

describe('applyMigrations', () => {
  it('returns save as-is when already at current version', () => {
    const save = makeValidSaveFile();
    const result = applyMigrations(save, CURRENT_SAVE_VERSION);
    expect(result).toBe(save);
  });

  it('returns non-object input unchanged', () => {
    expect(applyMigrations(null, 1)).toBeNull();
    expect(applyMigrations('string', 1)).toBe('string');
  });
});

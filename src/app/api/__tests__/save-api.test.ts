/**
 * API tests for save/load/list/delete — "Realms of War"
 *
 * Tests Zod schema validation and the API route handler logic
 * WITHOUT making real HTTP requests. Mocks the database module
 * and the saveService module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SavePayloadSchema, SaveIdSchema, SavesQuerySchema } from '@/lib/saveSchemas';
import { calculateChecksum } from '@/engine/save/saveGame';
import type { SaveFile } from '@/engine/save/saveGame';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    saveGame: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock the saveService module so we can control loadSaveFile results
vi.mock('@/lib/saveService', () => ({
  loadSaveFile: vi.fn(),
}));

// Import route handler AFTER mocks are set up
import { POST } from '@/app/api/save/route';
import { GET as GET_LOAD, DELETE as DELETE_LOAD } from '@/app/api/load/route';
import { GET as GET_SAVES } from '@/app/api/saves/route';
import { db } from '@/lib/db';
import { loadSaveFile } from '@/lib/saveService';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a valid save data JSON string (a minimal SaveFile) */
function makeValidSaveData(): string {
  return JSON.stringify({
    version: 1,
    timestamp: Date.now(),
    name: 'Test Save',
    gameState: {
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
    },
    gameConfig: {
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
    },
    commandLog: [],
    rngState: { seed: 42, position: 0 },
  });
}

function makeValidSaveFile(): SaveFile {
  return JSON.parse(makeValidSaveData()) as SaveFile;
}

/** Build a valid save payload object */
function makeValidPayload() {
  const data = makeValidSaveData();
  const checksum = calculateChecksum(data);
  return {
    name: 'Test Save',
    turn: 1,
    players: 'Player',
    data,
    checksum,
  };
}

/** Create a mock NextRequest with the given body */
function createRequest(body: unknown, method = 'POST'): NextRequest {
  const json = JSON.stringify(body);
  return new NextRequest('http://localhost:3000/api/save', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(json.length),
    },
    body: json,
  });
}

/** Create a request with a raw body string (for invalid JSON tests) */
function createRawRequest(rawBody: string, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost:3000/api/save', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(rawBody.length),
    },
    body: rawBody,
  });
}

function createLoadRequest(id?: string, method = 'GET'): NextRequest {
  const query = id === undefined ? '' : `?id=${encodeURIComponent(id)}`;
  return new NextRequest(`http://localhost:3000/api/load${query}`, { method });
}

const originalServerSavesMode = process.env.REALMS_SERVER_SAVES;

beforeEach(() => {
  delete process.env.REALMS_SERVER_SAVES;
});

afterEach(() => {
  if (originalServerSavesMode === undefined) {
    delete process.env.REALMS_SERVER_SAVES;
  } else {
    process.env.REALMS_SERVER_SAVES = originalServerSavesMode;
  }
});

// ─── Schema Tests ───────────────────────────────────────────────────────────

describe('SavePayloadSchema', () => {
  it('accepts a valid payload', () => {
    const result = SavePayloadSchema.safeParse(makeValidPayload());
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const payload = { ...makeValidPayload(), name: '' };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects empty checksum (requires 8-16 hex chars)', () => {
    const payload = { ...makeValidPayload(), checksum: '' };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a checksum that is too short (less than 8 hex chars)', () => {
    const payload = { ...makeValidPayload(), checksum: 'abc123' };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a checksum that is too long (more than 16 hex chars)', () => {
    const payload = { ...makeValidPayload(), checksum: 'a'.repeat(17) };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects a checksum with non-hex characters', () => {
    const payload = { ...makeValidPayload(), checksum: 'ghijklmnop' };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects negative turn', () => {
    const payload = { ...makeValidPayload(), turn: -1 };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects missing data field', () => {
    const { data: _data, ...payloadWithoutData } = makeValidPayload();
    const result = SavePayloadSchema.safeParse(payloadWithoutData);
    expect(result.success).toBe(false);
  });

  it('rejects data that is too short (min 2 chars)', () => {
    const payload = { ...makeValidPayload(), data: '{' };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts optional version field', () => {
    const payload = { ...makeValidPayload(), version: 2 };
    const result = SavePayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe('SaveIdSchema', () => {
  it('accepts a valid id', () => {
    const result = SaveIdSchema.safeParse({ id: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty id', () => {
    const result = SaveIdSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = SaveIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('SavesQuerySchema', () => {
  it('uses default pagination values', () => {
    const result = SavesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ offset: 0, limit: 20 });
  });

  it('coerces valid pagination query strings', () => {
    const result = SavesQuerySchema.safeParse({ offset: '5', limit: '10' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ offset: 5, limit: 10 });
  });

  it('rejects invalid pagination query strings', () => {
    const result = SavesQuerySchema.safeParse({ offset: 'abc', limit: '10' });
    expect(result.success).toBe(false);
  });
});

// ─── Route Handler Tests ────────────────────────────────────────────────────

describe('POST /api/save route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REALMS_SERVER_SAVES;
    // Default: loadSaveFile succeeds
    vi.mocked(loadSaveFile).mockReturnValue({
      success: true,
      saveFile: makeValidSaveFile(),
    });
    // Default: db.create succeeds
    vi.mocked(db.saveGame.create).mockResolvedValue({
      id: 'save-1',
      name: 'Test Save',
    } as unknown as Awaited<ReturnType<typeof db.saveGame.create>>);
  });

  it('accepts a valid save with correct checksum', async () => {
    const payload = makeValidPayload();
    const request = createRequest(payload);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('save-1');
    expect(body.name).toBe('Test Save');
    expect(db.saveGame.create).toHaveBeenCalledOnce();
  });

  it('rejects save with wrong checksum (400)', async () => {
    const payload = { ...makeValidPayload(), checksum: 'deadbeef' };
    const request = createRequest(payload);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/checksum/i);
    expect(db.saveGame.create).not.toHaveBeenCalled();
  });

  it('rejects save with empty name (400)', async () => {
    const payload = { ...makeValidPayload(), name: '' };
    const request = createRequest(payload);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid/i);
    expect(db.saveGame.create).not.toHaveBeenCalled();
  });

  it('rejects oversized payload (413)', async () => {
    const payload = makeValidPayload();
    // Set a content-length header that exceeds MAX_REQUEST_BYTES
    const json = JSON.stringify(payload);
    const request = new NextRequest('http://localhost:3000/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(3_000_000), // Exceeds 2_200_000
      },
      body: json,
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toMatch(/too large/i);
    expect(db.saveGame.create).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON (400)', async () => {
    const request = createRawRequest('{not valid json!!!');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid json/i);
    expect(db.saveGame.create).not.toHaveBeenCalled();
  });

  it('rejects invalid SaveFile format (400)', async () => {
    // Make loadSaveFile return failure for this test
    vi.mocked(loadSaveFile).mockReturnValue({
      success: false,
      error: 'Invalid save format',
    });

    const payload = makeValidPayload();
    const request = createRequest(payload);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid save format/i);
    expect(db.saveGame.create).not.toHaveBeenCalled();
  });

  it('rejects POST when server saves are disabled', async () => {
    process.env.REALMS_SERVER_SAVES = 'disabled';

    const request = createRequest(makeValidPayload());
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/server-side saves are disabled/i);
    expect(loadSaveFile).not.toHaveBeenCalled();
    expect(db.saveGame.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/saves route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.saveGame.findMany).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof db.saveGame.findMany>>,
    );
  });

  it('lists saves with default pagination', async () => {
    const request = new NextRequest('http://localhost:3000/api/saves');
    const response = await GET_SAVES(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.saves).toEqual([]);
    expect(db.saveGame.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
  });

  it('rejects invalid limit with 400', async () => {
    const request = new NextRequest('http://localhost:3000/api/saves?limit=abc');
    const response = await GET_SAVES(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid query/i);
    expect(db.saveGame.findMany).not.toHaveBeenCalled();
  });

  it('rejects negative offset with 400', async () => {
    const request = new NextRequest('http://localhost:3000/api/saves?offset=-1');
    const response = await GET_SAVES(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid query/i);
    expect(db.saveGame.findMany).not.toHaveBeenCalled();
  });

  it('rejects list when server saves are disabled', async () => {
    process.env.REALMS_SERVER_SAVES = 'disabled';

    const request = new NextRequest('http://localhost:3000/api/saves');
    const response = await GET_SAVES(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/server-side saves are disabled/i);
    expect(db.saveGame.findMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/load route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a save by id', async () => {
    const payload = makeValidPayload();
    vi.mocked(db.saveGame.findFirst).mockResolvedValue({
      id: 'save-1',
      name: payload.name,
      turn: payload.turn,
      players: payload.players,
      data: payload.data,
      checksum: payload.checksum,
      ownerId: 'local',
      version: 1,
      createdAt: new Date('2026-06-13T00:00:00.000Z'),
      updatedAt: new Date('2026-06-13T00:00:00.000Z'),
    } as unknown as Awaited<ReturnType<typeof db.saveGame.findFirst>>);

    const response = await GET_LOAD(createLoadRequest('save-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('save-1');
    expect(body.data).toBe(payload.data);
    expect(body.checksum).toBe(payload.checksum);
    expect(db.saveGame.findFirst).toHaveBeenCalledWith({
      where: { id: 'save-1', ownerId: 'local' },
    });
  });

  it('rejects missing id with 400', async () => {
    const response = await GET_LOAD(createLoadRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid request/i);
    expect(db.saveGame.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when save id is not found', async () => {
    vi.mocked(db.saveGame.findFirst).mockResolvedValue(null);

    const response = await GET_LOAD(createLoadRequest('missing-save'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('rejects load when server saves are disabled', async () => {
    process.env.REALMS_SERVER_SAVES = 'disabled';

    const response = await GET_LOAD(createLoadRequest('save-1'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/server-side saves are disabled/i);
    expect(db.saveGame.findFirst).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/load route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a save by id', async () => {
    vi.mocked(db.saveGame.deleteMany).mockResolvedValue(
      { count: 1 } as Awaited<ReturnType<typeof db.saveGame.deleteMany>>,
    );

    const response = await DELETE_LOAD(createLoadRequest('save-1', 'DELETE'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(db.saveGame.deleteMany).toHaveBeenCalledWith({
      where: { id: 'save-1', ownerId: 'local' },
    });
  });

  it('rejects missing id with 400', async () => {
    const response = await DELETE_LOAD(createLoadRequest(undefined, 'DELETE'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid request/i);
    expect(db.saveGame.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 404 when delete matches no saves', async () => {
    vi.mocked(db.saveGame.deleteMany).mockResolvedValue(
      { count: 0 } as Awaited<ReturnType<typeof db.saveGame.deleteMany>>,
    );

    const response = await DELETE_LOAD(createLoadRequest('missing-save', 'DELETE'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('rejects delete when server saves are disabled', async () => {
    process.env.REALMS_SERVER_SAVES = 'disabled';

    const response = await DELETE_LOAD(createLoadRequest('save-1', 'DELETE'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/server-side saves are disabled/i);
    expect(db.saveGame.deleteMany).not.toHaveBeenCalled();
  });
});

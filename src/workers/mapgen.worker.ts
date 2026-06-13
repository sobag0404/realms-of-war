// @ts-nocheck
/**
 * Web Worker for map generation.
 *
 * Offloads procedural map generation from the main thread.
 * Implements a simplified version of the full mapgen pipeline:
 *   1. Generate elevation + moisture using seeded noise
 *   2. Assign biomes / terrain types from elevation × moisture
 *   3. Place resources by terrain type
 *   4. Return MapData as a plain serializable object
 *
 * This worker is entirely self-contained — it cannot import from the main
 * bundle. All noise generation and biome logic is re-implemented inline.
 *
 * Message protocol:
 *   Input:  { type: 'generateMap', requestId, width, height, seed, playerCount }
 *   Output: { type: 'generateMapResult', requestId, mapData }
 */

// ─── Seeded Noise (Perlin-style) ──────────────────────────────────────────────

type GeneratedTile = {
  coord: { q: number; r: number };
  terrain: string;
  resource: string | null;
  yield: Record<string, number>;
  hasRoad: boolean;
  hasFort: boolean;
  owningCityId: string | null;
  improvement: string | null;
  hasRiftPortal: boolean;
  riftPortalOwner: string | null;
};

/** Permutation table size. */
const PERM_SIZE = 256;

/** 8-direction gradient vectors for 2D noise. */
const GRADIENTS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
];

/**
 * Simple seeded noise generator.
 * Uses a permutation table built from the seed via LCG + Fisher-Yates shuffle.
 */
class SeededNoise {
  private perm: Uint8Array;

  constructor(seed: number) {
    this.perm = new Uint8Array(PERM_SIZE * 2);
    const p = new Uint8Array(PERM_SIZE);
    for (let i = 0; i < PERM_SIZE; i++) p[i] = i;

    // LCG-based Fisher-Yates shuffle
    let s = seed >>> 0;
    for (let i = PERM_SIZE - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    // Duplicate for overflow protection
    for (let i = 0; i < PERM_SIZE; i++) {
      this.perm[i] = p[i];
      this.perm[PERM_SIZE + i] = p[i];
    }
  }

  /** Quintic fade curve: 6t^5 - 15t^4 + 10t^3 */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /** Linear interpolation. */
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  /** 2D gradient dot product. */
  private grad(hash: number, x: number, y: number): number {
    const g = GRADIENTS[hash & 7];
    return g[0] * x + g[1] * y;
  }

  /** Single-octave 2D noise, returns value in [0, 1]. */
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    const value = this.lerp(x1, x2, v);

    // Normalize from [-1, 1] to [0, 1]
    return (value + 1) * 0.5;
  }

  /** Multi-octave 2D noise. */
  octaveNoise2D(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

// ─── Seeded RNG ────────────────────────────────────────────────────────────────

class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a pseudo-random number in [0, 1). */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  /** Returns a pseudo-random integer in [min, max]. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

// ─── Terrain Classification ────────────────────────────────────────────────────

function classifyTerrain(elevation: number, moisture: number): string {
  if (elevation < 0.30) return 'water';
  if (elevation > 0.78) return 'mountain';
  if (elevation > 0.65) return 'hills';

  if (elevation < 0.35 && moisture > 0.70) return 'swamp';
  if (moisture < 0.25) return 'desert';
  if (moisture > 0.60) return 'forest';
  return 'plains';
}

// ─── Resource Placement ────────────────────────────────────────────────────────

const RESOURCE_TERRAIN_MAP: Record<string, Array<{ id: string; weight: number }>> = {
  plains: [
    { id: 'food', weight: 8 },
    { id: 'gold', weight: 4 },
    { id: 'iron', weight: 1 },
    { id: 'progress', weight: 2 },
  ],
  forest: [
    { id: 'wood', weight: 10 },
    { id: 'food', weight: 4 },
    { id: 'mana', weight: 2 },
  ],
  mountain: [
    { id: 'stone', weight: 8 },
    { id: 'iron', weight: 5 },
    { id: 'mana', weight: 3 },
    { id: 'gold', weight: 4 },
  ],
  water: [
    { id: 'food', weight: 6 },
    { id: 'gold', weight: 2 },
  ],
  desert: [
    { id: 'gold', weight: 6 },
    { id: 'iron', weight: 2 },
    { id: 'mana', weight: 3 },
  ],
  swamp: [
    { id: 'mana', weight: 6 },
    { id: 'food', weight: 4 },
    { id: 'science', weight: 4 },
  ],
  hills: [
    { id: 'stone', weight: 6 },
    { id: 'iron', weight: 4 },
    { id: 'gold', weight: 3 },
    { id: 'food', weight: 3 },
  ],
  ruins: [
    { id: 'science', weight: 8 },
    { id: 'progress', weight: 6 },
    { id: 'mana', weight: 5 },
  ],
};

function placeResource(terrain: string, rng: SeededRng): string | null {
  const options = RESOURCE_TERRAIN_MAP[terrain];
  if (!options || options.length === 0) return null;

  // 25% chance of having a resource
  if (rng.next() > 0.25) return null;

  const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = rng.next() * totalWeight;

  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option.id;
  }

  return options[0].id;
}

// ─── Yield Computation ─────────────────────────────────────────────────────────

const BASE_YIELDS: Record<string, Record<string, number>> = {
  plains: { food: 2, gold: 1 },
  forest: { food: 1, wood: 2 },
  mountain: { stone: 2, science: 1 },
  water: { food: 1 },
  desert: { gold: 1 },
  swamp: { food: 1, science: 1 },
  hills: { stone: 1, gold: 1 },
  ruins: { science: 1, progress: 1 },
};

function computeYield(terrain: string, resource: string | null): Record<string, number> {
  const y: Record<string, number> = { ...(BASE_YIELDS[terrain] ?? {}) };
  if (resource) {
    y[resource] = (y[resource] ?? 0) + 2;
  }
  return y;
}

// ─── Hex Math ──────────────────────────────────────────────────────────────────

function hexDistance(
  a: { q: number; r: number },
  b: { q: number; r: number },
): number {
  const ax = a.q;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q;
  const bz = b.r;
  const by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
}

// ─── Map Generation ────────────────────────────────────────────────────────────

function generateMap(width: number, height: number, seed: number, playerCount: number) {
  const rng = new SeededRng(seed);
  const elevationNoise = new SeededNoise(seed);
  const moistureNoise = new SeededNoise(seed ^ 0xDEADBEEF);

  const ELEVATION_SCALE = 0.08;
  const MOISTURE_SCALE = 0.06;
  const ELEVATION_OCTAVES = 6;
  const MOISTURE_OCTAVES = 5;
  const ELEVATION_PERSISTENCE = 0.5;
  const MOISTURE_PERSISTENCE = 0.55;

  const size = width * height;
  const elevation = new Float64Array(size);
  const moisture = new Float64Array(size);

  // Generate noise
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      elevation[idx] = elevationNoise.octaveNoise2D(
        q * ELEVATION_SCALE, r * ELEVATION_SCALE,
        ELEVATION_OCTAVES, ELEVATION_PERSISTENCE,
      );
      moisture[idx] = moistureNoise.octaveNoise2D(
        q * MOISTURE_SCALE, r * MOISTURE_SCALE,
        MOISTURE_OCTAVES, MOISTURE_PERSISTENCE,
      );
    }
  }

  // Build tiles
  const tiles: Record<string, GeneratedTile> = {};
  const terrainIds: string[] = [];

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      const terrain = classifyTerrain(elevation[idx], moisture[idx]);
      terrainIds.push(terrain);

      const resource = placeResource(terrain, rng);
      const yield_ = computeYield(terrain, resource);

      const key = `${q},${r}`;
      tiles[key] = {
        coord: { q, r },
        terrain,
        resource,
        yield: yield_,
        hasRoad: false,
        hasFort: false,
        owningCityId: null,
        improvement: null,
        hasRiftPortal: false,
        riftPortalOwner: null,
      };
    }
  }

  // Place some ruins (3-5% of walkable land)
  const walkableIndices: number[] = [];
  for (let i = 0; i < terrainIds.length; i++) {
    if (terrainIds[i] !== 'water' && terrainIds[i] !== 'mountain') {
      walkableIndices.push(i);
    }
  }
  const ruinCount = Math.max(2, Math.floor(walkableIndices.length * rng.nextInt(3, 5) / 100));
  for (let i = 0; i < ruinCount; i++) {
    if (walkableIndices.length === 0) break;
    const idx = rng.nextInt(0, walkableIndices.length - 1);
    const tileIdx = walkableIndices[idx];
    const q = tileIdx % width;
    const r = Math.floor(tileIdx / width);
    const key = `${q},${r}`;
    const tile = tiles[key];
    if (tile) {
      tile.terrain = 'ruins';
    }
    walkableIndices.splice(idx, 1);
  }

  // Starting positions: spread players across the map
  const startingPositions: Array<{ q: number; r: number }> = [];
  const margin = 3;
  const positions: Array<{ q: number; r: number }> = [];

  // Generate candidate starting positions
  for (let r = margin; r < height - margin; r += Math.floor(height / (playerCount + 1))) {
    for (let q = margin; q < width - margin; q += Math.floor(width / (playerCount + 1))) {
      // Find nearest walkable hex
      for (let dr = -2; dr <= 2; dr++) {
        for (let dq = -2; dq <= 2; dq++) {
          const checkKey = `${q + dq},${r + dr}`;
          const checkTile = tiles[checkKey];
          if (checkTile && checkTile.terrain !== 'water' && checkTile.terrain !== 'mountain') {
            positions.push({ q: q + dq, r: r + dr });
          }
        }
      }
    }
  }

  // Greedy farthest-point selection for starting positions
  if (positions.length > 0) {
    const center = { q: Math.floor(width / 2), r: Math.floor(height / 2) };
    positions.sort((a, b) => {
      const da = Math.abs(a.q - center.q) + Math.abs(a.r - center.r);
      const db = Math.abs(b.q - center.q) + Math.abs(b.r - center.r);
      return da - db;
    });
    startingPositions.push(positions[0]);

    for (let p = 1; p < playerCount && positions.length > 0; p++) {
      let bestIdx = 0;
      let bestMinDist = -1;

      for (let i = 0; i < positions.length; i++) {
        let minDist = Infinity;
        for (const sp of startingPositions) {
          const d = hexDistance(positions[i], sp);
          if (d < minDist) minDist = d;
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestIdx = i;
        }
      }

      startingPositions.push(positions[bestIdx]);
      positions.splice(bestIdx, 1);
    }
  }

  // Ensure we have enough starting positions
  while (startingPositions.length < playerCount) {
    startingPositions.push({ q: rng.nextInt(margin, width - margin - 1), r: rng.nextInt(margin, height - margin - 1) });
  }

  return {
    radius: Math.max(width, height),
    tiles,
    startingPositions,
  };
}

// ─── Message Handler ───────────────────────────────────────────────────────────

self.onmessage = function (e: MessageEvent) {
  const request = e.data;
  const requestId: string = request.requestId ?? '';

  try {
    if (request.type === 'generateMap') {
      const { width, height, seed, playerCount } = request;
      const mapData = generateMap(
        width ?? 20,
        height ?? 15,
        seed ?? 42,
        playerCount ?? 2,
      );

      self.postMessage({
        type: 'generateMapResult',
        requestId,
        mapData: { radius: mapData.radius, tiles: mapData.tiles },
        startingPositions: mapData.startingPositions,
      });
    } else {
      self.postMessage({
        type: 'error',
        requestId,
        requestType: request.type,
        message: `Unknown request type: ${request.type}`,
      });
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      requestId,
      requestType: request.type ?? 'unknown',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

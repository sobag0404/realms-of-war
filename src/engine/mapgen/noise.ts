/**
 * Seed-based 2D noise generation for "Realms of War" map generation.
 *
 * Implements a classic gradient noise algorithm with a seeded permutation
 * table. No external libraries — fully deterministic: same seed + same
 * coordinates always produce the same output.
 *
 * The noise produces values in [0, 1] range with octave layering for
 * realistic terrain features.
 */

// ─── Gradient Table ───────────────────────────────────────────────────────────

/**
 * 2D gradient vectors used for dot product in gradient noise.
 * 8 evenly-spaced directions on the unit circle.
 */
const GRADIENTS_2D: readonly [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

// ─── SeededNoise Class ───────────────────────────────────────────────────────

/**
 * Deterministic 2D noise generator seeded by a single integer.
 *
 * Uses a 256-entry permutation table (shuffled from the seed) combined
 * with gradient vectors to produce coherent noise. Multiple octaves
 * can be layered for fractal (fBm) terrain.
 */
export class SeededNoise {
  /** Permutation table (doubled to avoid index wrapping). */
  private readonly perm: Uint8Array;

  constructor(seed: number) {
    this.perm = this.buildPermutation(seed);
  }

  // ─── Permutation Table ──────────────────────────────────────────────────

  /**
   * Build a shuffled permutation table from the given seed.
   * Uses a simple LCG seeded PRNG to shuffle values 0–255.
   */
  private buildPermutation(seed: number): Uint8Array {
    const p = new Uint8Array(512);

    // Initialize with identity permutation
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Fisher-Yates shuffle using a simple LCG
    let s = seed >>> 0;
    const lcg = (): number => {
      // LCG: a=1664525, c=1013904223, m=2^32
      s = (Math.imul(s, 0x19660d) + 0x3c6ef35f) >>> 0;
      return s;
    };

    for (let i = 255; i > 0; i--) {
      const j = (lcg() >>> 0) % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    // Duplicate for overflow-free indexing
    for (let i = 0; i < 256; i++) {
      p[i + 256] = p[i];
    }

    return p;
  }

  // ─── Fade Function ─────────────────────────────────────────────────────

  /**
   * Quintic fade curve: 6t^5 - 15t^4 + 10t^3
   * Smoothstep derivative — eliminates visible grid artifacts.
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // ─── Linear Interpolation ──────────────────────────────────────────────

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  // ─── Gradient Dot Product ──────────────────────────────────────────────

  /**
   * Compute the dot product of the gradient at the given permutation
   * index with the distance vector (dx, dy).
   */
  private gradDot(hash: number, dx: number, dy: number): number {
    const g = GRADIENTS_2D[hash & 7];
    return g[0] * dx + g[1] * dy;
  }

  // ─── Core Noise ────────────────────────────────────────────────────────

  /**
   * Compute 2D gradient noise at (x, y).
   *
   * Returns a value in approximately [-1, 1], which is then remapped
   * to [0, 1] by the public `noise2D` method.
   *
   * @param x - X coordinate (can be fractional)
   * @param y - Y coordinate (can be fractional)
   * @returns Raw noise value in approximately [-1, 1]
   */
  private rawNoise2D(x: number, y: number): number {
    // Grid cell coordinates
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    // Fractional position within the cell
    const fx = x - x0;
    const fy = y - y0;

    // Fade curves for each axis
    const u = this.fade(fx);
    const v = this.fade(fy);

    // Hash the four corners of the cell
    const p = this.perm;
    const aa = p[p[x0 & 255] + (y0 & 255)];
    const ab = p[p[x0 & 255] + (y1 & 255)];
    const ba = p[p[x1 & 255] + (y0 & 255)];
    const bb = p[p[x1 & 255] + (y1 & 255)];

    // Gradient dot products at each corner
    const gAA = this.gradDot(aa, fx, fy);
    const gBA = this.gradDot(ba, fx - 1, fy);
    const gAB = this.gradDot(ab, fx, fy - 1);
    const gBB = this.gradDot(bb, fx - 1, fy - 1);

    // Bilinear interpolation
    return this.lerp(
      this.lerp(gAA, gBA, u),
      this.lerp(gAB, gBB, u),
      v,
    );
  }

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Compute 2D noise at (x, y), returning a value in [0, 1].
   *
   * Deterministic: same seed + same coordinates = same result.
   *
   * @param x - X coordinate (can be fractional)
   * @param y - Y coordinate (can be fractional)
   * @returns Noise value in [0, 1]
   */
  noise2D(x: number, y: number): number {
    // Raw noise is approximately [-1, 1]; remap to [0, 1]
    const raw = this.rawNoise2D(x, y);
    return (raw + 1) * 0.5;
  }

  /**
   * Compute multi-octave (fractal Brownian motion) 2D noise.
   *
   * Layers multiple frequencies of noise with decreasing amplitude
   * controlled by the persistence parameter. Higher octaves = more
   * detail; higher persistence = rougher terrain.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param octaves - Number of noise layers (default 4)
   * @param persistence - Amplitude multiplier per octave (default 0.5)
   * @returns Combined noise value in [0, 1]
   */
  octaveNoise2D(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.rawNoise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    // Normalize to [0, 1]
    return (total / maxValue + 1) * 0.5;
  }
}

/**
 * Deterministic Pseudo-Random Number Generator for "Realms of War".
 *
 * Uses the mulberry32 algorithm — a fast 32-bit seeded PRNG with good
 * distribution and full determinism.  Every random event in the game must
 * come through this class so that a given seed always produces the same
 * world and the same AI behaviour, enabling exact replays.
 *
 * The internal state is a single 32-bit integer, making it trivially
 * serializable for save/load.
 */

export class GameRng {
  /** Internal state — the only mutable field. */
  private state: number;

  constructor(seed: number) {
    // Ensure the seed is a non-zero u32; mulberry32 handles 0 but
    // a non-zero seed gives better initial distribution.
    this.state = seed >>> 0;
  }

  // ─── Core ─────────────────────────────────────────────────────────────────

  /**
   * Returns a float in [0, 1) and advances the internal state.
   * This is the single source of randomness — all other methods delegate here.
   */
  next(): number {
    // mulberry32
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ─── Convenience ──────────────────────────────────────────────────────────

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max) (max exclusive). */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Boolean that is `true` with the given chance (0–1, default 0.5). */
  bool(chance: number = 0.5): boolean {
    return this.next() < chance;
  }

  // ─── Advanced ─────────────────────────────────────────────────────────────

  /**
   * Pick a random element from an array.
   * Returns `undefined` if the array is empty.
   */
  pick<T>(arr: readonly T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[this.int(0, arr.length - 1)];
  }

  /**
   * Shuffle an array in-place using Fisher-Yates and return it.
   * This mutates the input array.
   */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Return a shuffled copy of the array (does not mutate input).
   */
  shuffled<T>(arr: readonly T[]): T[] {
    return this.shuffle([...arr]);
  }

  /**
   * Weighted random pick.
   * `weights` must be the same length as `items`.
   * Higher weight = more likely.
   */
  weighted<T>(items: readonly T[], weights: readonly number[]): T | undefined {
    if (items.length === 0 || weights.length === 0) return undefined;
    if (items.length !== weights.length) {
      throw new Error('weighted(): items and weights must have the same length');
    }

    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return undefined;

    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }

    // Fallback (floating point edge case)
    return items[items.length - 1];
  }

  // ─── Serialization ───────────────────────────────────────────────────────

  /** Get the current internal state so it can be saved. */
  getState(): number {
    return this.state >>> 0;
  }

  /** Restore a previously saved state. */
  setState(state: number): void {
    this.state = state >>> 0;
  }

  /**
   * Create a forked RNG from the current state.
   * Advancing the fork does NOT affect the parent, and vice versa.
   * The fork advances the parent's state by one step to produce a unique seed.
   */
  fork(): GameRng {
    return new GameRng(this.int(0, 0xffffffff));
  }
}

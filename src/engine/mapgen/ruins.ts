/**
 * Ancient ruins placement for "Realms of War" map generation.
 *
 * Ruins are special locations with loot/explore mechanics. They are
 * placed on land hexes, preferably near biome borders (where two or
 * more different terrain types are adjacent) for thematic interest.
 *
 * Each ruin has a difficulty tier (1–3) that determines the quality
 * of rewards and the challenge of exploration.
 */

import type { HexCoord } from '@/engine/core/types';
import { GameRng } from '@/engine/core/GameRng';
import { toIndex } from '@/engine/hex/mapStorage';
import { neighbor } from '@/engine/hex/directions';
import { TERRAIN_ID, isWalkableTerrain } from './biomes';

// ─── Ruin Interface ───────────────────────────────────────────────────────────

/**
 * An ancient ruin placed on the map.
 */
export interface Ruin {
  /** Hex coordinate of the ruin. */
  hex: HexCoord;
  /** Difficulty tier: 1 = easy, 2 = medium, 3 = hard. */
  tier: 1 | 2 | 3;
  /** Whether this ruin has been explored by any player. */
  explored: boolean;
}

// ─── Ruin Placement ───────────────────────────────────────────────────────────

/**
 * Place ancient ruins on the map.
 *
 * Places 3–6 ruins, preferring hexes near biome borders for
 * thematic interest. Each ruin is assigned a random tier.
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param terrainIds - Uint8Array of terrain type IDs
 * @param rng - Deterministic RNG for placement and tier selection
 * @returns Array of placed Ruin objects
 */
export function placeRuins(
  width: number,
  height: number,
  terrainIds: Uint8Array,
  rng: GameRng,
): Ruin[] {
  const ruins: Ruin[] = [];
  const targetCount = rng.int(3, 6);

  // ── Step 1: Score every land hex for "interestingness" ──────────────────

  interface Candidate {
    hex: HexCoord;
    score: number;
  }

  const candidates: Candidate[] = [];

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = toIndex(q, r, width);
      const terrain = terrainIds[idx];

      // Ruins must be on walkable land
      if (!isWalkableTerrain(terrain)) {
        continue;
      }

      // Prefer not on ruins terrain itself (avoid double-ruin)
      // but allow it if no better option
      const isRuinTerrain = terrain === TERRAIN_ID.RUINS;

      // Count different terrain types among neighbors (biome border score)
      const neighborTerrains = new Set<number>();
      let walkableNeighbors = 0;

      for (let d = 0; d < 6; d++) {
        const nHex = neighbor({ q, r }, d);
        if (nHex.q < 0 || nHex.q >= width || nHex.r < 0 || nHex.r >= height) {
          continue;
        }
        const nIdx = toIndex(nHex.q, nHex.r, width);
        const nTerrain = terrainIds[nIdx];
        neighborTerrains.add(nTerrain);
        if (isWalkableTerrain(nTerrain)) {
          walkableNeighbors++;
        }
      }

      // Score: biome diversity + accessibility, minus penalty for ruin terrain
      const biomeDiversity = neighborTerrains.size;
      const score = biomeDiversity * 10 + walkableNeighbors * 2 - (isRuinTerrain ? 20 : 0);

      // Must have at least 2 walkable neighbors to be reachable
      if (walkableNeighbors >= 2) {
        candidates.push({ hex: { q, r }, score });
      }
    }
  }

  if (candidates.length === 0) {
    return ruins;
  }

  // ── Step 2: Sort by score (highest first) ───────────────────────────────

  candidates.sort((a, b) => b.score - a.score);

  // ── Step 3: Place ruins, ensuring minimum spacing ───────────────────────

  const placed: HexCoord[] = [];
  const minRuinDistance = 4; // Minimum hex distance between ruins

  for (const candidate of candidates) {
    if (placed.length >= targetCount) break;

    // Check minimum distance from existing ruins
    let tooClose = false;
    for (const existing of placed) {
      const dist = hexDistSimple(candidate.hex, existing);
      if (dist < minRuinDistance) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    // Assign a tier based on weighted random selection
    // Tier 1 (easy) is most common, tier 3 (hard) is rare
    const tier = rng.weighted(
      [1, 2, 3] as (1 | 2 | 3)[],
      [5, 3, 1],
    ) ?? 1;

    ruins.push({
      hex: candidate.hex,
      tier,
      explored: false,
    });

    placed.push(candidate.hex);
  }

  return ruins;
}

// ─── Distance Helper ──────────────────────────────────────────────────────────

/**
 * Simple hex distance between two axial coordinates.
 * Avoids importing the full hex module for a simple calculation.
 *
 * @param a - First hex
 * @param b - Second hex
 * @returns Hex distance (number of steps)
 */
function hexDistSimple(a: HexCoord, b: HexCoord): number {
  const dx = a.q - b.q;
  const dy = a.r - b.r;
  const dz = -dx - dy;
  return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
}

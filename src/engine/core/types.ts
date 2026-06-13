/**
 * Core type definitions for "Realms of War" game engine.
 *
 * All types are pure data — no Three.js, React, DOM, or function references.
 * This ensures the engine core is fully serializable and deterministic.
 */

// ─── Identifiers ──────────────────────────────────────────────────────────────

export type PlayerId = string;
export type EntityId = string;
export type CityId = string;

// ─── Terrain ──────────────────────────────────────────────────────────────────

export type TerrainTypeId =
  | 'plains'
  | 'forest'
  | 'mountain'
  | 'water'
  | 'desert'
  | 'swamp'
  | 'hills'
  | 'ruins';

// ─── Resources ────────────────────────────────────────────────────────────────

export type ResourceId =
  | 'gold'
  | 'food'
  | 'wood'
  | 'stone'
  | 'iron'
  | 'mana'
  | 'progress'
  | 'science';

/** A partial record of resource amounts, e.g. { gold: 5, food: 2 } */
export type ResourceYield = Partial<Record<ResourceId, number>>;

// ─── Coordinates ──────────────────────────────────────────────────────────────

/** Axial hex coordinates (pointy-top orientation). */
export type HexCoord = Readonly<{ q: number; r: number }>;

/** Cube hex coordinates — always satisfies x + y + z === 0. */
export type CubeCoord = Readonly<{ x: number; y: number; z: number }>;

// ─── Turn & Phase ─────────────────────────────────────────────────────────────

export type TurnPhase =
  | 'start'
  | 'income'
  | 'research'
  | 'cityProduction'
  | 'unitReady'
  | 'playerActions'
  | 'aiActions'
  | 'end';

// ─── Game Mode ────────────────────────────────────────────────────────────────

export type GameMode = 'menu' | 'single' | 'hotseat' | 'online' | 'replay';

// ─── Technology ───────────────────────────────────────────────────────────────

export type TechBranch = 'military' | 'economic' | 'science' | 'mystical';

export type EraId =
  | 'primitives'
  | 'earlyCiv'
  | 'medieval'
  | 'renaissance'
  | 'rift';

// ─── Combat ───────────────────────────────────────────────────────────────────

export type AttackType = 'melee' | 'ranged' | 'magic' | 'siege' | 'aoe';

// ─── Direction ────────────────────────────────────────────────────────────────

/** The six hex directions in axial coordinates (pointy-top). */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;

// ─── Coordinate helpers ───────────────────────────────────────────────────────

export function hexToCube(hex: HexCoord): CubeCoord {
  const x = hex.q;
  const z = hex.r;
  const y = -x - z;
  return { x, y, z };
}

export function cubeToHex(cube: CubeCoord): HexCoord {
  return { q: cube.x, r: cube.z };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = hexToCube(a);
  const bc = hexToCube(b);
  return (
    (Math.abs(ac.x - bc.x) +
      Math.abs(ac.y - bc.y) +
      Math.abs(ac.z - bc.z)) /
    2
  );
}

export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

export function hexNeighbor(hex: HexCoord, direction: number): HexCoord {
  const d = HEX_DIRECTIONS[direction % 6];
  return { q: hex.q + d.q, r: hex.r + d.r };
}

export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [{ q: center.q, r: center.r }];
  const results: HexCoord[] = [];
  let current = {
    q: center.q + HEX_DIRECTIONS[4].q * radius,
    r: center.r + HEX_DIRECTIONS[4].r * radius,
  };
  for (let dir = 0; dir < 6; dir++) {
    for (let step = 0; step < radius; step++) {
      results.push({ q: current.q, r: current.r });
      current = hexNeighbor(current, dir);
    }
  }
  return results;
}

// ─── Building & Unit type IDs ─────────────────────────────────────────────────

export type BuildingTypeId = string;
export type UnitTypeId = string;
export type TechId = string;

// ─── Diplomacy ────────────────────────────────────────────────────────────────

export type DiplomacyStatus =
  | 'neutral'
  | 'war'
  | 'peace'
  | 'alliance'
  | 'vassal'
  | 'overlord';

// ─── Victory ──────────────────────────────────────────────────────────────────

export type VictoryCondition =
  | 'conquest'
  | 'science'
  | 'economic'
  | 'cultural'
  | 'rift';

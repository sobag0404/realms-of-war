/**
 * Unit tests for hex coordinate utilities — distance, neighbors, pathfinding
 */

import { describe, it, expect } from 'vitest';
import { hexDistance } from '@/engine/hex/distance';
import { HEX_DIRECTIONS, neighbor, oppositeDirection } from '@/engine/hex/directions';
import { findPath, findReachable } from '@/engine/hex/pathfinding';
import type { HexCoord } from '@/engine/core/types';

// ─── Distance ───────────────────────────────────────────────────────────────

describe('hexDistance', () => {
  it('returns 0 for the same hex', () => {
    const a: HexCoord = { q: 3, r: 5 };
    expect(hexDistance(a, a)).toBe(0);
  });

  it('is symmetric: distance(a, b) === distance(b, a)', () => {
    const a: HexCoord = { q: 1, r: 2 };
    const b: HexCoord = { q: 4, r: -1 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });

  it('computes correct distance for adjacent hexes', () => {
    const a: HexCoord = { q: 0, r: 0 };
    const b: HexCoord = { q: 1, r: 0 }; // East neighbor
    expect(hexDistance(a, b)).toBe(1);
  });

  it('computes correct distance for distant hexes', () => {
    const a: HexCoord = { q: 0, r: 0 };
    const b: HexCoord = { q: 3, r: -1 };
    expect(hexDistance(a, b)).toBe(3);
  });

  it('is symmetric for negative coordinates', () => {
    const a: HexCoord = { q: -5, r: 3 };
    const b: HexCoord = { q: 2, r: -4 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });
});

// ─── Directions / Neighbors ─────────────────────────────────────────────────

describe('hex directions and neighbors', () => {
  it('has exactly 6 direction vectors', () => {
    expect(HEX_DIRECTIONS.length).toBe(6);
  });

  it('neighbor() returns 6 unique neighbors for a hex', () => {
    const center: HexCoord = { q: 0, r: 0 };
    const neighbors = HEX_DIRECTIONS.map((_, i) => neighbor(center, i));
    const keys = new Set(neighbors.map((n) => `${n.q},${n.r}`));
    expect(keys.size).toBe(6);
  });

  it('oppositeDirection returns the inverse direction', () => {
    for (let d = 0; d < 6; d++) {
      expect(oppositeDirection(oppositeDirection(d))).toBe(d);
    }
  });
});

// ─── A* Pathfinding ─────────────────────────────────────────────────────────

describe('findPath', () => {
  /** Simple grid: all hexes walkable, cost = 1 */
  const alwaysWalkable = (_hex: HexCoord) => true;
  const uniformCost = (_hex: HexCoord) => 1;

  it('finds a straight-line path between adjacent hexes', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 1, r: 0 }; // East
    const path = findPath(from, to, alwaysWalkable, uniformCost);
    expect(path.length).toBe(2);
    expect(path[0]).toEqual(from);
    expect(path[1]).toEqual(to);
  });

  it('returns path starting at from and ending at to', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 3, r: 0 };
    const path = findPath(from, to, alwaysWalkable, uniformCost);
    expect(path[0]).toEqual(from);
    expect(path[path.length - 1]).toEqual(to);
  });

  it('avoids impassable terrain by routing around it', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 2, r: 0 };

    // Block the direct east path: hex (1,0) is impassable
    const wallKey = '1,0';
    const isWalkable = (hex: HexCoord) => `${hex.q},${hex.r}` !== wallKey;
    const path = findPath(from, to, isWalkable, uniformCost);

    // Path must still reach destination
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(to);

    // Path must not include the blocked hex
    const pathKeys = path.map((h) => `${h.q},${h.r}`);
    expect(pathKeys).not.toContain(wallKey);
  });

  it('returns empty array if destination is unreachable', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 2, r: 0 };

    // Block the destination itself
    const isWalkable = (hex: HexCoord) => !(hex.q === 2 && hex.r === 0);
    const path = findPath(from, to, isWalkable, uniformCost);
    expect(path).toEqual([]);
  });

  it('returns empty array if start is impassable', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 1, r: 0 };
    const neverWalkable = (_hex: HexCoord) => false;
    const path = findPath(from, to, neverWalkable, uniformCost);
    expect(path).toEqual([]);
  });
});

// ─── Reachable Hexes ────────────────────────────────────────────────────────

describe('findReachable', () => {
  const alwaysWalkable = (_hex: HexCoord) => true;
  const uniformCost = (_hex: HexCoord) => 1;

  it('includes the starting hex', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const reachable = findReachable(from, 3, alwaysWalkable, uniformCost);
    const hasStart = Array.from(reachable).some(
      (h) => h.q === from.q && h.r === from.r,
    );
    expect(hasStart).toBe(true);
  });

  it('respects movement budget', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const mp = 2;
    const reachable = findReachable(from, mp, alwaysWalkable, uniformCost);
    // All reachable hexes should be within distance 2
    for (const hex of reachable) {
      expect(hexDistance(from, hex)).toBeLessThanOrEqual(mp);
    }
  });

  it('excludes hexes behind impassable terrain', () => {
    const from: HexCoord = { q: 0, r: 0 };
    // Block (1,0) — direct east
    const isWalkable = (hex: HexCoord) => !(hex.q === 1 && hex.r === 0);
    const reachable = findReachable(from, 3, isWalkable, uniformCost);
    const hasBlocked = Array.from(reachable).some(
      (h) => h.q === 1 && h.r === 0,
    );
    expect(hasBlocked).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { generateMap } from '../generateMap';

describe('generateMap', () => {
  it('persists deterministic river masks on generated tiles', () => {
    const result = generateMap({ width: 28, height: 20, seed: 1, playerCount: 2 });
    const riverTiles = Object.values(result.mapData.tiles).filter((tile) => (tile.riverMask ?? 0) > 0);

    expect(riverTiles.length).toBeGreaterThan(0);
    expect(riverTiles.every((tile) => Number.isInteger(tile.riverMask))).toBe(true);

    const plainsRiver = riverTiles.find((tile) => tile.terrain === 'plains');
    expect(plainsRiver).toBeDefined();
    expect(plainsRiver?.yield.food).toBeGreaterThanOrEqual(3);
    expect(plainsRiver?.yield.gold).toBeGreaterThanOrEqual(2);
  });
});

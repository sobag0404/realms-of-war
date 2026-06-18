import { describe, expect, it } from 'vitest';
import { createGraphicsShowcaseSession, GRAPHICS_SHOWCASE_SELECTED_ENTITY_ID } from '../graphicsShowcaseState';

describe('graphics showcase state', () => {
  it('creates a deterministic high-density evidence scene', () => {
    const first = createGraphicsShowcaseSession();
    const second = createGraphicsShowcaseSession();

    expect(first.gameState.seed).toBe(second.gameState.seed);
    expect(first.gameState.activePlayerId).toBe('player-0');
    expect(first.selectedEntityId).toBe(GRAPHICS_SHOWCASE_SELECTED_ENTITY_ID);

    const tiles = Object.values(first.gameState.map.tiles);
    expect(tiles.some((tile) => tile.terrain === 'water')).toBe(true);
    expect(tiles.some((tile) => tile.terrain === 'mountain')).toBe(true);
    expect(tiles.some((tile) => tile.terrain === 'forest')).toBe(true);
    expect(tiles.some((tile) => tile.resource === 'mana')).toBe(true);
    expect(tiles.some((tile) => tile.hasRoad)).toBe(true);
    expect(tiles.some((tile) => tile.hasFort)).toBe(true);
    expect(tiles.some((tile) => tile.riverMask && tile.riverMask > 0)).toBe(true);
    expect(tiles.some((tile) => tile.hasRiftPortal)).toBe(true);
    expect(tiles.some((tile) => tile.improvement === 'farm')).toBe(true);
    expect(tiles.some((tile) => tile.improvement === 'mine')).toBe(true);
    expect(tiles.some((tile) => tile.improvement === 'lumber_mill')).toBe(true);
    expect(tiles.some((tile) => tile.improvement === 'mana_focus')).toBe(true);

    expect(Object.keys(first.gameState.cities).length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(first.gameState.entities).length).toBeGreaterThanOrEqual(8);
    expect(first.gameState.players['player-0']?.visibleHexes.length).toBeGreaterThan(20);
    expect(first.gameState.players['player-0']?.exploredHexes.length).toBeGreaterThan(5);
    expect(first.movementPath.length).toBeGreaterThan(2);
    expect(first.attackTargets).toContain('unit-showcase-bandit-player-1');
  });
});

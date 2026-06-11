// ============================================================================
// Minimap Renderer — Realms of War
// ============================================================================
// Renders a 2D minimap on an HTML5 Canvas element. Shows terrain colors,
// cities, units, and fog of war. Supports click-to-navigate.

import { TERRAIN_COLORS } from '@/data/terrain';
import { hexToWorld, HEX_RADIUS } from '@/engine/hex/coordinates';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimap rendering options */
export interface MinimapOptions {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Padding around the map in pixels */
  padding: number;
  /** Whether to show unit markers */
  showUnits: boolean;
  /** Whether to show city markers */
  showCities: boolean;
  /** Whether to show fog of war */
  showFog: boolean;
}

/** Map state for minimap rendering */
export interface MinimapMapState {
  radius: number;
  tiles: Record<string, { terrain: string; coord: { q: number; r: number } }>;
}

/** Entity state for minimap rendering */
export interface MinimapEntityState {
  hex: { q: number; r: number };
  ownerId: string;
  typeId: string;
}

/** City state for minimap rendering */
export interface MinimapCityState {
  hex: { q: number; r: number };
  ownerId: string;
  level: number;
}

/** Player state for minimap rendering */
export interface MinimapPlayerState {
  color: string;
  visibleHexes: string[];
  exploredHexes: string[];
}

/** Full state passed to render() */
export interface MinimapState {
  map: MinimapMapState;
  entities: Record<string, MinimapEntityState>;
  cities: Record<string, MinimapCityState>;
  players: Record<string, MinimapPlayerState>;
  activePlayerId: string;
}

// ─── Default Options ─────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: MinimapOptions = {
  width: 200,
  height: 200,
  padding: 10,
  showUnits: true,
  showCities: true,
  showFog: true,
};

// ─── MinimapRenderer ─────────────────────────────────────────────────────────

/**
 * Minimap renderer using HTML5 Canvas.
 *
 * Renders a top-down view of the hex map with:
 * - Each hex as a colored pixel/small square based on terrain color
 * - Cities as larger dots with player colors
 * - Units as small dots
 * - Fog of war (unexplored = dark, explored = dimmed, visible = bright)
 * - Click-to-navigate support
 */
export class MinimapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: MinimapOptions;

  // Cached bounds for coordinate mapping
  private mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement, options?: Partial<MinimapOptions>) {
    this.canvas = canvas;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[MinimapRenderer] Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    // Set canvas dimensions
    canvas.width = this.options.width;
    canvas.height = this.options.height;
  }

  // ── Main Render ────────────────────────────────────────────────────────

  /**
   * Render the minimap from game state.
   */
  render(state: MinimapState): void {
    const { map, entities, cities, players, activePlayerId } = state;
    const tiles = Object.values(map.tiles);

    if (tiles.length === 0) {
      this.clear();
      return;
    }

    // Compute world bounds from all tiles
    this.computeBounds(tiles);

    // Clear canvas
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.options.width, this.options.height);

    // Build visibility sets for the active player
    const activePlayer = players[activePlayerId];
    const visibleSet = new Set(activePlayer?.visibleHexes ?? []);
    const exploredSet = new Set(activePlayer?.exploredHexes ?? []);

    // ── Draw Terrain Hexes ─────────────────────────────────────────────
    for (const tile of tiles) {
      const key = `${tile.coord.q},${tile.coord.r}`;
      const isVisible = visibleSet.has(key);
      const isExplored = exploredSet.has(key);

      // Fog of war
      if (this.options.showFog && !isExplored && !isVisible) {
        this.drawHexAt(tile.coord, '#1a1a2e', 0.5);
        continue;
      }

      // Get terrain color
      const terrainColor = TERRAIN_COLORS[tile.terrain as keyof typeof TERRAIN_COLORS] ?? '#555555';

      if (this.options.showFog && isExplored && !isVisible) {
        // Explored but not currently visible — dimmed
        this.drawHexAt(tile.coord, this.dimColor(terrainColor, 0.4), 0.6);
      } else {
        // Fully visible
        this.drawHexAt(tile.coord, terrainColor, 1.0);
      }
    }

    // ── Draw Cities ────────────────────────────────────────────────────
    if (this.options.showCities) {
      for (const city of Object.values(cities)) {
        const key = `${city.hex.q},${city.hex.r}`;
        const isVisible = visibleSet.has(key);
        const isExplored = exploredSet.has(key);

        if (this.options.showFog && !isExplored && !isVisible) continue;

        const playerColor = players[city.ownerId]?.color ?? '#ffffff';
        const alpha = this.options.showFog && isExplored && !isVisible ? 0.5 : 1.0;
        this.drawCityMarker(city.hex, playerColor, city.level, alpha);
      }
    }

    // ── Draw Units ─────────────────────────────────────────────────────
    if (this.options.showUnits) {
      for (const entity of Object.values(entities)) {
        const key = `${entity.hex.q},${entity.hex.r}`;
        const isVisible = visibleSet.has(key);

        if (this.options.showFog && !isVisible) continue;

        const playerColor = players[entity.ownerId]?.color ?? '#ffffff';
        this.drawUnitMarker(entity.hex, playerColor);
      }
    }

    // ── Draw Border ────────────────────────────────────────────────────
    this.ctx.strokeStyle = '#444466';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, this.options.width, this.options.height);
  }

  // ── Click-to-Hex ───────────────────────────────────────────────────────

  /**
   * Convert a click position on the minimap to a hex coordinate.
   *
   * @param x - X position on the canvas (pixels)
   * @param y - Y position on the canvas (pixels)
   * @returns Hex coordinate or null if out of bounds
   */
  clickToHex(x: number, y: number): { q: number; r: number } | null {
    if (!this.mapBounds) return null;

    // Convert canvas coords back to world coords
    const worldX = (x - this.offsetX) / this.scale;
    const worldZ = (y - this.offsetY) / this.scale;

    // Convert world position to hex coordinate
    const radius = HEX_RADIUS;
    const q = ((Math.sqrt(3) / 3) * worldX - (1 / 3) * worldZ) / radius;
    const r = ((2 / 3) * worldZ) / radius;

    // Round to nearest hex using cube rounding
    return this.roundAxial({ q, r });
  }

  // ── Options ────────────────────────────────────────────────────────────

  /** Update options (canvas will be resized on next render). */
  setOptions(options: Partial<MinimapOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.width !== undefined || options.height !== undefined) {
      this.canvas.width = this.options.width;
      this.canvas.height = this.options.height;
    }

    // Invalidate bounds cache
    this.mapBounds = null;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  /** Dispose resources. */
  dispose(): void {
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);
    this.mapBounds = null;
  }

  // ── Internal Drawing ───────────────────────────────────────────────────

  /** Clear the canvas. */
  private clear(): void {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.options.width, this.options.height);
  }

  /**
   * Compute world bounds from all tile coordinates.
   * Sets up scale and offset for mapping world coords to canvas pixels.
   */
  private computeBounds(
    tiles: Array<{ coord: { q: number; r: number } }>,
  ): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const tile of tiles) {
      const [wx, , wz] = hexToWorld(tile.coord);
      minX = Math.min(minX, wx);
      maxX = Math.max(maxX, wx);
      minZ = Math.min(minZ, wz);
      maxZ = Math.max(maxZ, wz);
    }

    // Add one hex radius margin
    minX -= HEX_RADIUS;
    maxX += HEX_RADIUS;
    minZ -= HEX_RADIUS;
    maxZ += HEX_RADIUS;

    this.mapBounds = { minX, maxX, minZ, maxZ };

    // Compute scale to fit within canvas with padding
    const { width, height, padding } = this.options;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const worldWidth = maxX - minX;
    const worldHeight = maxZ - minZ;

    this.scale = Math.min(drawWidth / worldWidth, drawHeight / worldHeight);

    // Center the map in the canvas
    const scaledWidth = worldWidth * this.scale;
    const scaledHeight = worldHeight * this.scale;
    this.offsetX = padding + (drawWidth - scaledWidth) / 2 - minX * this.scale;
    this.offsetY = padding + (drawHeight - scaledHeight) / 2 - minZ * this.scale;
  }

  /** Draw a hex tile as a small colored rectangle at the given hex coord. */
  private drawHexAt(coord: { q: number; r: number }, color: string, alpha: number): void {
    const [wx, , wz] = hexToWorld(coord);

    const cx = wx * this.scale + this.offsetX;
    const cy = wz * this.scale + this.offsetY;

    // Size of the hex square on the minimap
    const size = Math.max(2, HEX_RADIUS * this.scale);

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    this.ctx.globalAlpha = 1.0;
  }

  /** Draw a city marker (larger dot with player color). */
  private drawCityMarker(
    coord: { q: number; r: number },
    playerColor: string,
    level: number,
    alpha: number,
  ): void {
    const [wx, , wz] = hexToWorld(coord);

    const cx = wx * this.scale + this.offsetX;
    const cy = wz * this.scale + this.offsetY;

    const baseSize = Math.max(3, HEX_RADIUS * this.scale * 0.6);
    const size = baseSize + level * 0.5;

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = playerColor;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // White border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;
  }

  /** Draw a unit marker (small dot with player color). */
  private drawUnitMarker(coord: { q: number; r: number }, playerColor: string): void {
    const [wx, , wz] = hexToWorld(coord);

    const cx = wx * this.scale + this.offsetX;
    const cy = wz * this.scale + this.offsetY;

    const size = Math.max(2, HEX_RADIUS * this.scale * 0.3);

    this.ctx.fillStyle = playerColor;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /** Dim a hex color by multiplying with a factor. */
  private dimColor(hexColor: string, factor: number): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    const dr = Math.round(r * factor);
    const dg = Math.round(g * factor);
    const db = Math.round(b * factor);

    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }

  /** Round a fractional axial coordinate to the nearest hex (cube rounding). */
  private roundAxial(frac: { q: number; r: number }): { q: number; r: number } {
    // Convert to fractional cube
    const cx = frac.q;
    const cz = frac.r;
    const cy = -cx - cz;

    // Round each component independently
    let rx = Math.round(cx);
    let ry = Math.round(cy);
    let rz = Math.round(cz);

    // Fix the component with the largest rounding error
    const xDiff = Math.abs(rx - cx);
    const yDiff = Math.abs(ry - cy);
    const zDiff = Math.abs(rz - cz);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return { q: rx, r: rz };
  }
}

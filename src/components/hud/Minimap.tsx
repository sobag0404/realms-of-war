/**
 * Minimap — small canvas-based top-down map view at bottom-right.
 *
 * Uses the MinimapRenderer from rendering/minimap/ for efficient
 * 2D canvas rendering of terrain, cities, units, and fog of war.
 * Falls back to inline rendering if MinimapRenderer fails.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { MinimapRenderer } from '@/rendering/minimap/minimapRenderer';
import type { MinimapState } from '@/rendering/minimap/minimapRenderer';
import { TERRAIN_TYPES } from '@/data/terrain';
import { Button } from '@/components/ui/button';
import { ChevronUp, Maximize2, Minimize2, PanelLeft, PanelRight, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZE = 200;
const MOBILE_DISPLAY_SIZE = 116;
const DESKTOP_DISPLAY_SIZES = {
  compact: 152,
  comfortable: 184,
} as const;

type DesktopSizeMode = keyof typeof DESKTOP_DISPLAY_SIZES;
type DesktopDock = 'left' | 'right';

// ─── Terrain Color Map (fallback) ────────────────────────────────────────────

const TERRAIN_COLOR_MAP: Record<string, string> = {};
for (const [id, def] of Object.entries(TERRAIN_TYPES)) {
  TERRAIN_COLOR_MAP[id] = def.color;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MinimapRenderer | null>(null);

  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const cameraTarget = useGameStore((s) => s.cameraTarget);
  const cameraZoom = useGameStore((s) => s.cameraZoom);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const selectedCityId = useGameStore((s) => s.selectedCityId);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const setCameraTarget = useGameStore((s) => s.setCameraTarget);

  // Track mobile vs desktop display without changing the renderer's stable canvas size.
  const [isCompact, setIsCompact] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [desktopSizeMode, setDesktopSizeMode] = useState<DesktopSizeMode>('compact');
  const [desktopDock, setDesktopDock] = useState<DesktopDock>('right');

  useEffect(() => {
    const check = () => {
      const compact = window.innerWidth < 640;
      setIsCompact(compact);
      setIsExpanded((current) => (compact ? false : current));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initialize MinimapRenderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      rendererRef.current = new MinimapRenderer(canvas, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        padding: 10,
        showUnits: true,
        showCities: true,
        showFog: true,
      });
    } catch (err) {
      console.warn('[Minimap] Failed to initialize MinimapRenderer, using fallback:', err);
      rendererRef.current = null;
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Draw minimap using MinimapRenderer when available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const renderer = rendererRef.current;

    if (renderer) {
      // Use MinimapRenderer from rendering/minimap/
      try {
        const minimapState: MinimapState = {
          map: {
            radius: gameState.map.radius,
            tiles: Object.fromEntries(
              Object.entries(gameState.map.tiles).map(([key, tile]) => [
                key,
                { terrain: tile.terrain, coord: tile.coord },
              ])
            ),
          },
          entities: Object.fromEntries(
            Object.entries(gameState.entities).map(([id, entity]) => [
              id,
              { hex: entity.hex, ownerId: entity.ownerId, typeId: entity.typeId },
            ])
          ),
          cities: Object.fromEntries(
            Object.entries(gameState.cities).map(([id, city]) => [
              id,
              { hex: city.hex, ownerId: city.ownerId, level: city.level },
            ])
          ),
          players: Object.fromEntries(
            Object.entries(gameState.players).map(([id, player]) => [
              id,
              {
                color: player.color,
                visibleHexes: player.visibleHexes,
                exploredHexes: player.exploredHexes,
              },
            ])
          ),
          activePlayerId,
        };

        renderer.render(minimapState);

        // Draw camera viewport on top of the renderer's output
        drawViewportOverlay(canvas, gameState, cameraTarget, cameraZoom);

        return;
      } catch (err) {
        console.warn('[Minimap] MinimapRenderer failed, falling back to inline rendering:', err);
      }
    }

    // ─── Fallback: Inline rendering (original approach) ─────────────────
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tiles = gameState.map.tiles;
    const keys = Object.keys(tiles);
    const { minQ, minR, width, height } = getMapBounds(keys);
    const size = CANVAS_SIZE;
    const HEX_PIXEL_SIZE = 2;

    // Clear
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, size, size);

    // Calculate scaling to fit map in canvas
    const mapPixelW = width * HEX_PIXEL_SIZE;
    const mapPixelH = height * HEX_PIXEL_SIZE;
    const scale = Math.min(size / Math.max(1, mapPixelW), size / Math.max(1, mapPixelH));
    const offsetX = (size - mapPixelW * scale) / 2;
    const offsetY = (size - mapPixelH * scale) / 2;

    // Draw terrain
    for (const [key, tile] of Object.entries(tiles)) {
      const [qStr, rStr] = key.split(',');
      const q = Number(qStr);
      const r = Number(rStr);

      const x = (q - minQ) * HEX_PIXEL_SIZE * scale + offsetX;
      const y = (r - minR) * HEX_PIXEL_SIZE * scale + offsetY;
      const pxSize = Math.max(1, HEX_PIXEL_SIZE * scale);

      const color = TERRAIN_COLOR_MAP[tile.terrain] ?? '#333333';
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pxSize, pxSize);
    }

    // Draw active player's cities and units
    const player = gameState.players[activePlayerId];
    if (player) {
      const playerColor = player.color;

      for (const city of Object.values(gameState.cities)) {
        if (city.ownerId === activePlayerId) {
          const x = (city.hex.q - minQ) * HEX_PIXEL_SIZE * scale + offsetX;
          const y = (city.hex.r - minR) * HEX_PIXEL_SIZE * scale + offsetY;
          const dotSize = Math.max(2, HEX_PIXEL_SIZE * scale + 2);
          ctx.fillStyle = playerColor;
          ctx.fillRect(x - 1, y - 1, dotSize, dotSize);
        }
      }

      for (const entity of Object.values(gameState.entities)) {
        if (entity.ownerId === activePlayerId) {
          const x = (entity.hex.q - minQ) * HEX_PIXEL_SIZE * scale + offsetX;
          const y = (entity.hex.r - minR) * HEX_PIXEL_SIZE * scale + offsetY;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, Math.max(1, HEX_PIXEL_SIZE * scale), Math.max(1, HEX_PIXEL_SIZE * scale));
        }
      }
    }

    // Draw camera viewport rectangle
    drawViewportOverlay(canvas, gameState, cameraTarget, cameraZoom);
  }, [gameState, activePlayerId, cameraTarget, cameraZoom]);

  // Click to move camera
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameState) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Try using MinimapRenderer's clickToHex for accurate hex picking
      const renderer = rendererRef.current;
      if (renderer) {
        const scaleX = CANVAS_SIZE / rect.width;
        const scaleY = CANVAS_SIZE / rect.height;
        const canvasX = clickX * scaleX;
        const canvasY = clickY * scaleY;

        const hex = renderer.clickToHex(canvasX, canvasY);
        if (hex) {
          // Convert hex coordinate to world position for camera
          const radius = 1.0;
          const worldX = radius * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
          const worldZ = radius * (1.5 * hex.r);
          setCameraTarget([worldX, 0, worldZ]);
          return;
        }
      }

      // Fallback: approximate click-to-hex conversion
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const canvasX = clickX * scaleX;
      const canvasY = clickY * scaleY;

      const keys = Object.keys(gameState.map.tiles);
      const { minQ, minR, width, height } = getMapBounds(keys);
      const HEX_PIXEL_SIZE = 2;
      const mapPixelW = width * HEX_PIXEL_SIZE;
      const mapPixelH = height * HEX_PIXEL_SIZE;
      const scale = Math.min(CANVAS_SIZE / Math.max(1, mapPixelW), CANVAS_SIZE / Math.max(1, mapPixelH));
      const offsetX = (CANVAS_SIZE - mapPixelW * scale) / 2;
      const offsetY = (CANVAS_SIZE - mapPixelH * scale) / 2;

      const mapX = (canvasX - offsetX) / scale;
      const mapY = (canvasY - offsetY) / scale;

      const q = Math.round(mapX / HEX_PIXEL_SIZE + minQ);
      const r = Math.round(mapY / HEX_PIXEL_SIZE + minR);

      setCameraTarget([
        Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r,
        0,
        1.5 * r,
      ]);
    },
    [gameState, setCameraTarget],
  );

  if (!gameState) return null;

  const displaySize = isCompact ? MOBILE_DISPLAY_SIZE : DESKTOP_DISPLAY_SIZES[desktopSizeMode];
  const hasSelection = Boolean(selectedEntityId || selectedCityId || selectedHex);
  const dockClass = isCompact || desktopDock === 'right'
    ? 'right-2 sm:right-4'
    : 'left-2 sm:left-4';
  const bottomClass = !isCompact && desktopDock === 'left' && hasSelection
    ? 'bottom-[calc(min(48vh,27rem)+2rem)]'
    : 'bottom-3 sm:bottom-4';

  if (!isExpanded) {
    return (
      <div className={`absolute ${bottomClass} ${dockClass} z-20 pointer-events-auto`}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="h-10 rounded-lg border border-amber-200/20 bg-slate-950/75 px-3 text-xs font-semibold uppercase tracking-wide text-amber-100 shadow-2xl shadow-black/40 backdrop-blur-md"
          aria-label="Open minimap"
          aria-expanded="false"
        >
          Map
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute ${bottomClass} ${dockClass} z-20 pointer-events-auto`}>
      <div className="hud-panel relative overflow-hidden opacity-95 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100">
        {isCompact && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/50 text-white/80"
            aria-label="Collapse minimap"
            aria-expanded="true"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {!isCompact && (
          <div className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-slate-950/70 p-1 shadow-lg shadow-black/25 backdrop-blur-md">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-sm text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setIsExpanded(false)}
              aria-label="Collapse minimap"
              aria-expanded="true"
              title="Collapse minimap"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-sm text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setDesktopSizeMode((mode) => (mode === 'compact' ? 'comfortable' : 'compact'))}
              aria-label={desktopSizeMode === 'compact' ? 'Use larger minimap' : 'Use smaller minimap'}
              aria-pressed={desktopSizeMode === 'comfortable'}
              title={desktopSizeMode === 'compact' ? 'Larger minimap' : 'Smaller minimap'}
            >
              {desktopSizeMode === 'compact' ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-sm text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setDesktopDock((dock) => (dock === 'right' ? 'left' : 'right'))}
              aria-label={desktopDock === 'right' ? 'Move minimap to left' : 'Move minimap to right'}
              title={desktopDock === 'right' ? 'Move minimap left' : 'Move minimap right'}
            >
              {desktopDock === 'right' ? (
                <PanelLeft className="h-3.5 w-3.5" />
              ) : (
                <PanelRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="cursor-crosshair border-b border-white/10"
          style={{ width: displaySize, height: displaySize }}
          onClick={handleClick}
          aria-label="Minimap — click to move camera"
        />
        {!isCompact && (
          <div className="flex h-6 items-center justify-between gap-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/55">
            <span>Map</span>
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white" />Unit</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rotate-45 rounded-[1px] border border-white/80" />City</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper: Draw camera viewport overlay ────────────────────────────────

function drawViewportOverlay(
  canvas: HTMLCanvasElement,
  gameState: NonNullable<ReturnType<typeof useGameStore.getState>['gameState']>,
  cameraTarget: [number, number, number],
  cameraZoom: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const keys = Object.keys(gameState.map.tiles);
  const { minQ, minR, width, height } = getMapBounds(keys);
  const HEX_PIXEL_SIZE = 2;
  const size = CANVAS_SIZE;
  const mapPixelW = width * HEX_PIXEL_SIZE;
  const mapPixelH = height * HEX_PIXEL_SIZE;
  const scale = Math.min(size / Math.max(1, mapPixelW), size / Math.max(1, mapPixelH));
  const offsetX = (size - mapPixelW * scale) / 2;
  const offsetY = (size - mapPixelH * scale) / 2;

  const viewSizeFraction = Math.max(0.08, Math.min(0.42, 4 / Math.max(1, cameraZoom)));
  const viewW = size * viewSizeFraction;
  const viewH = size * viewSizeFraction;

  const camQ = cameraTarget[0] / Math.sqrt(3);
  const camR = cameraTarget[2] / 1.5;
  const viewCenterX = (camQ - minQ) * HEX_PIXEL_SIZE * scale + offsetX;
  const viewCenterY = (camR - minR) * HEX_PIXEL_SIZE * scale + offsetY;

  const vpX = viewCenterX - viewW / 2;
  const vpY = viewCenterY - viewH / 2;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.lineWidth = 4;
  ctx.strokeRect(vpX, vpY, viewW, viewH);
  ctx.strokeStyle = '#fff4bf';
  ctx.lineWidth = 2;
  ctx.strokeRect(vpX, vpY, viewW, viewH);
}

// ─── Helper: Compute map bounds from tile keys ────────────────────────────

function getMapBounds(keys: string[]): { minQ: number; maxQ: number; minR: number; maxR: number; width: number; height: number } {
  let minQ = Infinity, maxQ = -Infinity;
  let minR = Infinity, maxR = -Infinity;

  for (const key of keys) {
    const [qStr, rStr] = key.split(',');
    const q = Number(qStr);
    const r = Number(rStr);
    if (q < minQ) minQ = q;
    if (q > maxQ) maxQ = q;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }

  return {
    minQ,
    maxQ,
    minR,
    maxR,
    width: maxQ - minQ + 1,
    height: maxR - minR + 1,
  };
}

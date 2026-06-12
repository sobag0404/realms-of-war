/**
 * Minimap — small canvas-based top-down map view at bottom-right.
 *
 * Renders terrain colors, player units/cities, and camera viewport.
 * Click to move camera.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { TERRAIN_TYPES } from '@/data/terrain';
import type { TerrainTypeId } from '@/data/terrain';
import type { HexCoord } from '@/engine/core/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_SIZE = 200;
const HEX_PIXEL_SIZE = 2; // each hex = 2x2 pixel block

// ─── Terrain Color Map ────────────────────────────────────────────────────────

const TERRAIN_COLOR_MAP: Record<string, string> = {};
for (const [id, def] of Object.entries(TERRAIN_TYPES)) {
  TERRAIN_COLOR_MAP[id] = def.color;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const cameraTarget = useGameStore((s) => s.cameraTarget);
  const cameraZoom = useGameStore((s) => s.cameraZoom);
  const setCameraTarget = useGameStore((s) => s.setCameraTarget);

  // Track mobile vs desktop display size
  const [displaySize, setDisplaySize] = useState(200);

  useEffect(() => {
    const check = () => {
      setDisplaySize(window.innerWidth < 640 ? 150 : 200);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Compute map bounds
  const mapBounds = useRef({ minQ: 0, maxQ: 0, minR: 0, maxR: 0, width: 1, height: 1 });

  useEffect(() => {
    if (!gameState) return;

    const tiles = gameState.map.tiles;
    const keys = Object.keys(tiles);
    if (keys.length === 0) return;

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

    mapBounds.current = {
      minQ,
      maxQ,
      minR,
      maxR,
      width: maxQ - minQ + 1,
      height: maxR - minR + 1,
    };
  }, [gameState]);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { minQ, minR, width, height } = mapBounds.current;
    const tiles = gameState.map.tiles;
    const size = CANVAS_SIZE;

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

      // Cities (larger dots)
      for (const city of Object.values(gameState.cities)) {
        if (city.ownerId === activePlayerId) {
          const x = (city.hex.q - minQ) * HEX_PIXEL_SIZE * scale + offsetX;
          const y = (city.hex.r - minR) * HEX_PIXEL_SIZE * scale + offsetY;
          const dotSize = Math.max(2, HEX_PIXEL_SIZE * scale + 2);
          ctx.fillStyle = playerColor;
          ctx.fillRect(x - 1, y - 1, dotSize, dotSize);
        }
      }

      // Units (bright dots)
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
    const viewSizeFraction = Math.max(0.1, cameraZoom / 28);
    const viewW = size * viewSizeFraction;
    const viewH = size * viewSizeFraction;

    // Camera target to minimap position
    const camQ = cameraTarget[0] / Math.sqrt(3);
    const camR = cameraTarget[2] / 1.5;
    const viewCenterX = (camQ - minQ) * HEX_PIXEL_SIZE * scale + offsetX;
    const viewCenterY = (camR - minR) * HEX_PIXEL_SIZE * scale + offsetY;

    const vpX = viewCenterX - viewW / 2;
    const vpY = viewCenterY - viewH / 2;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, viewW, viewH);
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

      // Scale from display size to canvas internal size
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const canvasX = clickX * scaleX;
      const canvasY = clickY * scaleY;

      const { minQ, minR, width, height } = mapBounds.current;
      const mapPixelW = width * HEX_PIXEL_SIZE;
      const mapPixelH = height * HEX_PIXEL_SIZE;
      const scale = Math.min(CANVAS_SIZE / Math.max(1, mapPixelW), CANVAS_SIZE / Math.max(1, mapPixelH));
      const offsetX = (CANVAS_SIZE - mapPixelW * scale) / 2;
      const offsetY = (CANVAS_SIZE - mapPixelH * scale) / 2;

      // Convert click position to hex coordinate
      const mapX = (canvasX - offsetX) / scale;
      const mapY = (canvasY - offsetY) / scale;

      const q = Math.round(mapX / HEX_PIXEL_SIZE + minQ);
      const r = Math.round(mapY / HEX_PIXEL_SIZE + minR);

      // Set camera target to this hex's world position
      setCameraTarget([
        Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r,
        0,
        1.5 * r,
      ]);
    },
    [gameState, setCameraTarget],
  );

  if (!gameState) return null;

  return (
    <div className="absolute bottom-3 right-2 sm:bottom-4 sm:right-4 z-20 pointer-events-auto">
      <div className="rounded-lg border border-white/15 overflow-hidden bg-black/50 backdrop-blur-sm shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="cursor-crosshair"
          style={{ width: displaySize, height: displaySize }}
          onClick={handleClick}
          aria-label="Minimap — click to move camera"
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { GameCanvas } from '@/components/game3d/GameCanvas';
import { useGameStore } from '@/store/useGameStore';
import { createDefaultConfig } from '@/engine/core/GameConfig';

export default function Home() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const gameState = useGameStore((s) => s.gameState);
  const showGrid = useGameStore((s) => s.showGrid);
  const toggleGrid = useGameStore((s) => s.toggleGrid);
  const toggleFog = useGameStore((s) => s.toggleFog);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const turn = gameState?.turn ?? 1;

  useEffect(() => {
    // Auto-start a game with default config if none exists
    if (!gameState) {
      const config = createDefaultConfig();
      startNewGame(config);
    }
  }, [gameState, startNewGame]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Canvas */}
      <GameCanvas className="w-full h-full" />

      {/* Loading overlay */}
      {!gameState && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-white text-xl font-semibold animate-pulse">
            Generating world...
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      {gameState && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-sm z-10">
            <div className="text-white text-sm font-semibold">
              ⚔️ Realms of War
            </div>
            <div className="text-white/70 text-xs">
              Turn {turn}
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleGrid}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  showGrid
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/50'
                }`}
              >
                Grid
              </button>
              <button
                onClick={toggleFog}
                className="px-3 py-1 text-xs rounded bg-white/5 text-white/50 hover:bg-white/20 transition-colors"
              >
                Fog
              </button>
            </div>
          </div>

          {/* Selected hex info */}
          {selectedHex && (
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 z-10 min-w-[200px]">
              <div className="text-white text-xs mb-1">Selected Hex</div>
              <div className="text-white/80 text-sm">
                ({selectedHex.q}, {selectedHex.r})
              </div>
              {(() => {
                const tile = gameState.map.tiles[`${selectedHex.q},${selectedHex.r}`];
                if (tile) {
                  return (
                    <div className="text-white/60 text-xs mt-1 capitalize">
                      {tile.terrain}
                      {tile.resource && <span className="ml-2 text-yellow-400">⭐ {tile.resource}</span>}
                    </div>
                  );
                }
                return null;
              })()}
              {selectedEntityId && (
                <div className="text-blue-300 text-xs mt-1">
                  Unit: {selectedEntityId}
                </div>
              )}
            </div>
          )}

          {/* Controls help */}
          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 z-10">
            <div className="text-white/50 text-[10px] leading-relaxed">
              <div>WASD/Arrows: Pan</div>
              <div>Scroll: Zoom</div>
              <div>Right Drag: Pan</div>
              <div>Middle Drag: Rotate</div>
              <div>Click: Select hex</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

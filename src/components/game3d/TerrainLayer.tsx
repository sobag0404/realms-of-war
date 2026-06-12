'use client';

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { HexMesh } from './HexMesh';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';
import { buildTerrainChunks, disposeChunks } from '@/rendering/terrain/buildTerrainChunks';
import type { TerrainChunk } from '@/rendering/terrain/buildTerrainChunks';
import { getDefaultFlatHexGeometry, disposeDefaultGeometries } from '@/rendering/terrain/buildHexGeometry';
import { createMovementRangeMaterial, createAttackRangeMaterial } from '@/rendering/terrain/terrainMaterials';

// ─── Chunked Terrain Threshold ──────────────────────────────────────────────
// Use chunked rendering when tile count exceeds this threshold
const CHUNKED_THRESHOLD = 256;

export function TerrainLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showGrid = useGameStore((s) => s.showGrid);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const hoveredHex = useGameStore((s) => s.hoveredHex);
  const selectHex = useGameStore((s) => s.selectHex);
  const setHoveredHex = useGameStore((s) => s.setHoveredHex);

  // Build tile list from game state
  const tiles = useMemo(() => {
    if (!gameState) return [];
    return Object.values(gameState.map.tiles);
  }, [gameState]);

  // Build terrain chunks for large maps using buildTerrainChunks
  const terrainChunks = useMemo(() => {
    if (!gameState || tiles.length < CHUNKED_THRESHOLD) return [];

    // Convert game tiles to the format expected by buildTerrainChunks
    const tileData: Record<string, { terrain: string; coord: { q: number; r: number } }> = {};
    for (const tile of tiles) {
      const key = `${tile.coord.q},${tile.coord.r}`;
      tileData[key] = { terrain: tile.terrain, coord: tile.coord };
    }

    return buildTerrainChunks(tileData);
  }, [gameState, tiles]);

  // Dispose chunks when they change
  useMemo(() => {
    return () => {
      if (terrainChunks.length > 0) {
        disposeChunks(terrainChunks);
      }
    };
  }, [terrainChunks]);

  const handleHexClick = useCallback((hex: HexCoord) => {
    selectHex(hex);
  }, [selectHex]);

  const handleHexHover = useCallback((hex: HexCoord | null) => {
    setHoveredHex(hex);
  }, [setHoveredHex]);

  if (!gameState || tiles.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Chunked terrain for large maps */}
      {terrainChunks.length > 0 && (
        <ChunkedTerrain chunks={terrainChunks} />
      )}

      {/* Individual hex meshes for small maps or interaction layer */}
      {tiles.map((tile) => {
        const key = `${tile.coord.q},${tile.coord.r}`;
        const [wx, , wz] = hexToWorld(tile.coord);
        const elevation = TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;

        const isSelected = selectedHex !== null &&
          selectedHex.q === tile.coord.q &&
          selectedHex.r === tile.coord.r;
        const isHovered = hoveredHex !== null &&
          hoveredHex.q === tile.coord.q &&
          hoveredHex.r === tile.coord.r;

        return (
          <group key={key}>
            <HexMesh
              position={[wx, 0, wz]}
              terrain={tile.terrain as TerrainTypeId}
              hex={tile.coord}
              elevation={elevation}
              isHighlighted={isSelected}
              isHovered={isHovered}
              onClick={handleHexClick}
              onHover={handleHexHover}
            />
          </group>
        );
      })}

      {/* Grid overlay lines */}
      {showGrid && <GridOverlay tiles={tiles} />}
    </group>
  );
}

// ─── Chunked Terrain Component ──────────────────────────────────────────────
// Renders pre-built terrain chunks as merged geometries for performance

function ChunkedTerrain({ chunks }: { chunks: TerrainChunk[] }) {
  return (
    <group>
      {chunks.map((chunk, i) => (
        <mesh
          key={`chunk-${chunk.chunkX}-${chunk.chunkZ}-${i}`}
          geometry={chunk.geometry}
          material={chunk.material}
          receiveShadow
        />
      ))}
    </group>
  );
}

// ─── Grid Overlay ───────────────────────────────────────────────────────────

/** Grid lines as a single merged line segments object */
function GridOverlay({ tiles }: { tiles: Array<{ coord: HexCoord; terrain: string }> }) {
  // Use getDefaultFlatHexGeometry from rendering utils for reference dimensions
  const lineRef = useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (const tile of tiles) {
      const [wx, , wz] = hexToWorld(tile.coord);
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 180) * (60 * (i % 6) - 30);
        points.push(new THREE.Vector3(
          wx + 0.95 * Math.cos(angle),
          0.02,
          wz + 0.95 * Math.sin(angle),
        ));
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [tiles]);

  return (
    <lineSegments geometry={lineRef}>
      <lineBasicMaterial color="#000000" transparent opacity={0.12} />
    </lineSegments>
  );
}

'use client';

import { useMemo, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { HexMesh } from './HexMesh';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';
import { buildTerrainChunks, disposeChunks } from '@/rendering/terrain/buildTerrainChunks';
import type { TerrainChunk } from '@/rendering/terrain/buildTerrainChunks';
import { createSelectionMaterial, createHoverMaterial } from '@/rendering/terrain/terrainMaterials';

// ─── Chunked Terrain Threshold ──────────────────────────────────────────────
// Use chunked rendering when tile count exceeds this threshold
const CHUNKED_THRESHOLD = 256;

export function TerrainLayer() {
  const mapTiles = useGameStore((s) => s.gameState?.map.tiles);
  const showGrid = useGameStore((s) => s.showGrid);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const hoveredHex = useGameStore((s) => s.hoveredHex);
  const selectHex = useGameStore((s) => s.selectHex);
  const setHoveredHex = useGameStore((s) => s.setHoveredHex);

  // Build tile list from game state
  const tiles = useMemo(() => {
    if (!mapTiles) return [];
    return Object.values(mapTiles);
  }, [mapTiles]);

  // Build terrain chunks for large maps using buildTerrainChunks
  const terrainChunks = useMemo(() => {
    if (!mapTiles || tiles.length < CHUNKED_THRESHOLD) return [];

    // Convert game tiles to the format expected by buildTerrainChunks
    const tileData: Record<string, { terrain: string; coord: { q: number; r: number } }> = {};
    for (const tile of tiles) {
      const key = `${tile.coord.q},${tile.coord.r}`;
      tileData[key] = { terrain: tile.terrain, coord: tile.coord };
    }

    return buildTerrainChunks(tileData);
  }, [mapTiles, tiles]);

  // Dispose chunks when they change — use useEffect for proper cleanup
  useEffect(() => {
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

  if (!mapTiles || tiles.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Chunked terrain for large maps */}
      {terrainChunks.length > 0 && (
        <ChunkedTerrain chunks={terrainChunks} />
      )}

      {/* Conditional rendering: full hex meshes for small maps, lightweight interaction planes for chunked maps */}
      {terrainChunks.length === 0 ? (
        // Full per-hex rendering for small maps
        tiles.map((tile) => {
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
        })
      ) : (
        // Lightweight interaction overlay for chunked maps — invisible planes for raycasting
        tiles.map((tile) => {
          const key = `${tile.coord.q},${tile.coord.r}`;
          const [wx, , wz] = hexToWorld(tile.coord);

          const isSelected = selectedHex !== null &&
            selectedHex.q === tile.coord.q &&
            selectedHex.r === tile.coord.r;
          const isHovered = hoveredHex !== null &&
            hoveredHex.q === tile.coord.q &&
            hoveredHex.r === tile.coord.r;

          return (
            <HexInteractionPlane
              key={key}
              position={[wx, 0, wz]}
              hex={tile.coord}
              terrain={tile.terrain as TerrainTypeId}
              isHighlighted={isSelected}
              isHovered={isHovered}
              onClick={handleHexClick}
              onHover={handleHexHover}
            />
          );
        })
      )}

      {/* Grid overlay lines */}
      {showGrid && <GridOverlay tiles={tiles} />}
    </group>
  );
}

// ─── Hex Interaction Plane ──────────────────────────────────────────────────
// Lightweight invisible plane for click/hover interaction on chunked terrain.
// Renders only a flat transparent mesh for raycasting — no visual geometry.

interface HexInteractionPlaneProps {
  position: [number, number, number];
  hex: HexCoord;
  terrain: TerrainTypeId;
  isHighlighted?: boolean;
  isHovered?: boolean;
  onClick?: (hex: HexCoord) => void;
  onHover?: (hex: HexCoord | null) => void;
}

function HexInteractionPlane({
  position,
  hex,
  terrain,
  isHighlighted,
  isHovered,
  onClick,
  onHover,
}: HexInteractionPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const overlayY = Math.max(0.04, (TERRAIN_ELEVATION[terrain] ?? 0) + 0.2);

  const handlePointerOver = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    onHover?.(hex);
  };

  const handlePointerOut = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    onHover?.(null);
  };

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    onClick?.(hex);
  };

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* Invisible flat hex plane for raycasting — depthWrite off so it never occludes */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, overlayY, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <circleGeometry args={[0.95, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Highlight ring — only shown when selected or hovered */}
      {(isHighlighted || isHovered) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, overlayY + 0.02, 0]}
        >
          <ringGeometry args={[0.85, 0.95, 6]} />
          <primitive
            object={isHighlighted ? createSelectionMaterial() : createHoverMaterial()}
            attach="material"
          />
        </mesh>
      )}
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
      <lineBasicMaterial color="#1d160e" transparent opacity={0.16} />
    </lineSegments>
  );
}

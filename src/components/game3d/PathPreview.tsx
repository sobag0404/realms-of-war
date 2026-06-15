'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';

export function PathPreview() {
  const movementPath = useGameStore((s) => s.movementPath);
  const mapTiles = useGameStore((s) => s.gameState?.map.tiles);

  const dotGeometry = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);

  // Convert hex path to world coordinates
  const points = useMemo(() => {
    if (!mapTiles || movementPath.length < 2) return [];
    return movementPath.map((hex: HexCoord) => {
      const [wx, , wz] = hexToWorld(hex);
      const tile = mapTiles[`${hex.q},${hex.r}`];
      const terrainY = tile ? TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0 : 0;
      return [wx, terrainY + 0.44, wz] as [number, number, number];
    });
  }, [mapTiles, movementPath]);

  if (points.length < 2) return null;

  return (
    <group renderOrder={34}>
      {/* Path line */}
      <Line
        points={points}
        color="#03101a"
        lineWidth={7}
        dashed
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.82}
        depthWrite={false}
      />
      <Line
        points={points}
        color="#61c7ff"
        lineWidth={4}
        dashed
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.96}
        depthWrite={false}
      />

      {/* Waypoint dots */}
      {points.map((point, i) => (
        <mesh
          key={`path-dot-${i}`}
          position={point}
          geometry={dotGeometry}
          scale={i === points.length - 1 ? 0.09 : 0.065}
          renderOrder={35}
        >
          <meshBasicMaterial color={i === points.length - 1 ? '#fff2a8' : '#61c7ff'} transparent opacity={0.92} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

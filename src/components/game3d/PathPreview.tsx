'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';

export function PathPreview() {
  const movementPath = useGameStore((s) => s.movementPath);
  const gameState = useGameStore((s) => s.gameState);

  // Convert hex path to world coordinates
  const points = useMemo(() => {
    if (!gameState || movementPath.length < 2) return [];
    return movementPath.map((hex: HexCoord) => {
      const [wx, , wz] = hexToWorld(hex);
      const tile = gameState.map.tiles[`${hex.q},${hex.r}`];
      const terrainY = tile ? TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0 : 0;
      return [wx, terrainY + 0.52, wz] as [number, number, number];
    });
  }, [gameState, movementPath]);

  if (points.length < 2) return null;

  return (
    <group>
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
      />

      {/* Waypoint dots */}
      {points.map((point, i) => (
        <mesh key={`path-dot-${i}`} position={point}>
          <sphereGeometry args={[i === points.length - 1 ? 0.09 : 0.065, 10, 8]} />
          <meshBasicMaterial color={i === points.length - 1 ? '#fff2a8' : '#61c7ff'} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

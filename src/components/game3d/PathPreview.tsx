'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { HexCoord } from '@/engine/core/types';

export function PathPreview() {
  const movementPath = useGameStore((s) => s.movementPath);

  // Convert hex path to world coordinates
  const points = useMemo(() => {
    if (movementPath.length < 2) return [];
    return movementPath.map((hex: HexCoord) => {
      const [wx, , wz] = hexToWorld(hex);
      return [wx, 0.15, wz] as [number, number, number];
    });
  }, [movementPath]);

  if (points.length < 2) return null;

  return (
    <group>
      {/* Path line */}
      <Line
        points={points}
        color="#44aaff"
        lineWidth={3}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />

      {/* Waypoint dots */}
      {points.map((point, i) => (
        <mesh key={`path-dot-${i}`} position={point}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#44aaff" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

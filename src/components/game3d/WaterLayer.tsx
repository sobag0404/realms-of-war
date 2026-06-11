'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { TerrainTypeId } from '@/engine/core/types';

/** Create a hexagonal plane for water tiles */
function createHexGeometry(radius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function WaterLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const groupRef = useRef<THREE.Group>(null);

  // Get water tiles
  const waterTiles = useMemo(() => {
    if (!gameState) return [];
    return Object.values(gameState.map.tiles).filter(
      (tile) => tile.terrain === 'water'
    );
  }, [gameState]);

  // Shared geometry
  const geometry = useMemo(() => createHexGeometry(0.95), []);

  // Animate wave effect
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      // Gentle wave: each tile slightly different phase
      child.position.y = -0.16 + Math.sin(t * 1.5 + i * 0.5) * 0.015;
    });
  });

  if (waterTiles.length === 0) return null;

  return (
    <group ref={groupRef}>
      {waterTiles.map((tile) => {
        const [wx, , wz] = hexToWorld(tile.coord);
        return (
          <mesh
            key={`${tile.coord.q},${tile.coord.r}`}
            geometry={geometry}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[wx, -0.16, wz]}
          >
            <meshStandardMaterial
              color="#2b79a3"
              transparent
              opacity={0.75}
              roughness={0.3}
              metalness={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

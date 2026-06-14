'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';

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
  const depthGeometry = useMemo(() => createHexGeometry(0.88), []);
  const shorelineGeometry = useMemo(() => new THREE.RingGeometry(0.84, 0.97, 6), []);
  const waterMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#2f97c8',
    emissive: '#0a3d56',
    emissiveIntensity: 0.16,
    transparent: true,
    opacity: 0.72,
    roughness: 0.18,
    metalness: 0.05,
    transmission: 0.06,
    thickness: 0.16,
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
    side: THREE.DoubleSide,
  }), []);
  const depthMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#0b3755',
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const shorelineMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#d4f6ff',
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Animate wave effect
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      // Gentle wave with stable per-tile phase keeps water alive without blurring the board.
      child.position.y = -0.17 + Math.sin(t * 1.05 + i * 0.47) * 0.014;
    });
  });

  if (waterTiles.length === 0) return null;

  return (
    <group ref={groupRef}>
      {waterTiles.map((tile) => {
        const [wx, , wz] = hexToWorld(tile.coord);
        return (
          <group
            key={`${tile.coord.q},${tile.coord.r}`}
            position={[wx, -0.16, wz]}
          >
            <mesh
              geometry={depthGeometry}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.025, 0]}
            >
              <primitive object={depthMaterial} attach="material" />
            </mesh>
            <mesh
              geometry={geometry}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <primitive object={waterMaterial} attach="material" />
            </mesh>
            <mesh
              geometry={shorelineGeometry}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.01, 0]}
            >
              <primitive object={shorelineMaterial} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const groupRef = useRef<THREE.Group>(null);
  const depthRef = useRef<THREE.InstancedMesh>(null);
  const surfaceRef = useRef<THREE.InstancedMesh>(null);
  const shorelineRef = useRef<THREE.InstancedMesh>(null);

  // Get water tiles
  const waterTiles = useMemo(() => {
    if (!gameState) return [];
    const player = gameState.players[activePlayerId];
    const knownKeys = player ? [...player.visibleHexes, ...player.exploredHexes] : [];
    const knownHexes = showFog && knownKeys.length > 0 ? new Set(knownKeys) : null;
    return Object.values(gameState.map.tiles).filter((tile) => (
      tile.terrain === 'water' &&
      (!knownHexes || knownHexes.has(`${tile.coord.q},${tile.coord.r}`))
    ));
  }, [activePlayerId, gameState, showFog]);

  // Shared geometry
  const geometry = useMemo(() => createHexGeometry(0.95), []);
  const depthGeometry = useMemo(() => createHexGeometry(0.88), []);
  const shorelineGeometry = useMemo(() => new THREE.RingGeometry(0.84, 0.97, 6), []);
  const waterMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#2b91ba',
    emissive: '#082f46',
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.74,
    roughness: 0.22,
    metalness: 0.05,
    transmission: 0.06,
    thickness: 0.16,
    clearcoat: 0.36,
    clearcoatRoughness: 0.28,
    side: THREE.FrontSide,
  }), []);
  const depthMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#082f48',
    transparent: true,
    opacity: 0.42,
    side: THREE.FrontSide,
    depthWrite: false,
  }), []);
  const shorelineMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#d9fbff',
    transparent: true,
    opacity: 0.22,
    side: THREE.FrontSide,
    depthWrite: false,
  }), []);

  useEffect(() => {
    const depthMesh = depthRef.current;
    const surfaceMesh = surfaceRef.current;
    const shorelineMesh = shorelineRef.current;
    if (!depthMesh || !surfaceMesh || !shorelineMesh) return;

    const dummy = new THREE.Object3D();
    for (let index = 0; index < waterTiles.length; index++) {
      const tile = waterTiles[index];
      const [wx, , wz] = hexToWorld(tile.coord);
      const turn = ((tile.coord.q * 17 + tile.coord.r * 31) % 6) * 0.018;

      dummy.position.set(wx, -0.185, wz);
      dummy.rotation.set(-Math.PI / 2, 0, turn);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      depthMesh.setMatrixAt(index, dummy.matrix);

      dummy.position.set(wx, -0.16, wz);
      dummy.rotation.set(-Math.PI / 2, 0, turn);
      dummy.updateMatrix();
      surfaceMesh.setMatrixAt(index, dummy.matrix);

      dummy.position.set(wx, -0.15, wz);
      dummy.rotation.set(-Math.PI / 2, 0, turn);
      dummy.updateMatrix();
      shorelineMesh.setMatrixAt(index, dummy.matrix);
    }

    depthMesh.instanceMatrix.needsUpdate = true;
    surfaceMesh.instanceMatrix.needsUpdate = true;
    shorelineMesh.instanceMatrix.needsUpdate = true;
  }, [waterTiles]);

  // Animate one shared surface instead of mutating every water tile each frame.
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 0.85) * 0.006;
  });

  if (waterTiles.length === 0) return null;

  return (
    <group ref={groupRef}>
      <instancedMesh ref={depthRef} args={[depthGeometry, depthMaterial, waterTiles.length]} />
      <instancedMesh ref={surfaceRef} args={[geometry, waterMaterial, waterTiles.length]} receiveShadow />
      <instancedMesh ref={shorelineRef} args={[shorelineGeometry, shorelineMaterial, waterTiles.length]} />
    </group>
  );
}

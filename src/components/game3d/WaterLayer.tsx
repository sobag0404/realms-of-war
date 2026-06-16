'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';

const WATER_DEPTH_Y = -0.046;
const WATER_SURFACE_Y = -0.022;
const WATER_SHORELINE_Y = -0.012;

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
  const shimmerRef = useRef<THREE.InstancedMesh>(null);

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
  const depthGeometry = useMemo(() => createHexGeometry(0.9), []);
  const shorelineGeometry = useMemo(() => new THREE.RingGeometry(0.84, 0.97, 6), []);
  const shimmerGeometry = useMemo(() => new THREE.BoxGeometry(0.62, 0.01, 0.05), []);
  const waterMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#2c93a8',
    emissive: '#062a3f',
    emissiveIntensity: 0.1,
    transparent: true,
    opacity: 0.8,
    roughness: 0.18,
    metalness: 0.05,
    transmission: 0.04,
    thickness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    side: THREE.FrontSide,
    depthWrite: false,
  }), []);
  const depthMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#05283d',
    transparent: true,
    opacity: 0.5,
    side: THREE.FrontSide,
    depthWrite: false,
  }), []);
  const shorelineMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#dff8ee',
    transparent: true,
    opacity: 0.28,
    side: THREE.FrontSide,
    depthWrite: false,
  }), []);
  const shimmerMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#c7fff2',
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  }), []);

  useEffect(() => {
    const depthMesh = depthRef.current;
    const surfaceMesh = surfaceRef.current;
    const shorelineMesh = shorelineRef.current;
    const shimmerMesh = shimmerRef.current;
    if (!depthMesh || !surfaceMesh || !shorelineMesh || !shimmerMesh) return;

    const dummy = new THREE.Object3D();
    let shimmerIndex = 0;
    for (let index = 0; index < waterTiles.length; index++) {
      const tile = waterTiles[index];
      const [wx, , wz] = hexToWorld(tile.coord);
      const turn = ((tile.coord.q * 17 + tile.coord.r * 31) % 6) * 0.018;
      const baseYaw = ((tile.coord.q * 23 + tile.coord.r * 47) % 360) * Math.PI / 180;

      dummy.position.set(wx, WATER_DEPTH_Y, wz);
      dummy.rotation.set(-Math.PI / 2, 0, turn);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      depthMesh.setMatrixAt(index, dummy.matrix);

      dummy.position.set(wx, WATER_SURFACE_Y, wz);
      dummy.rotation.set(-Math.PI / 2, 0, turn);
      dummy.updateMatrix();
      surfaceMesh.setMatrixAt(index, dummy.matrix);

      dummy.position.set(wx, WATER_SHORELINE_Y, wz);
      dummy.rotation.set(-Math.PI / 2, 0, turn);
      dummy.updateMatrix();
      shorelineMesh.setMatrixAt(index, dummy.matrix);

      for (let streak = 0; streak < 2; streak++) {
        const phase = tile.coord.q * 13.7 + tile.coord.r * 29.3 + streak * 17.1;
        const ox = Math.cos(phase) * (0.18 + streak * 0.18);
        const oz = Math.sin(phase * 1.31) * (0.18 + streak * 0.12);
        dummy.position.set(wx + ox, WATER_SURFACE_Y + 0.018 + streak * 0.002, wz + oz);
        dummy.rotation.set(0, baseYaw + streak * 0.7, 0);
        dummy.scale.set(0.82 + ((tile.coord.q + streak * 3) % 5) * 0.08, 1, 0.8);
        dummy.updateMatrix();
        shimmerMesh.setMatrixAt(shimmerIndex, dummy.matrix);
        shimmerIndex++;
      }
    }

    depthMesh.instanceMatrix.needsUpdate = true;
    surfaceMesh.instanceMatrix.needsUpdate = true;
    shorelineMesh.instanceMatrix.needsUpdate = true;
    shimmerMesh.instanceMatrix.needsUpdate = true;
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
      <instancedMesh ref={depthRef} args={[depthGeometry, depthMaterial, waterTiles.length]} renderOrder={2} />
      <instancedMesh ref={surfaceRef} args={[geometry, waterMaterial, waterTiles.length]} receiveShadow renderOrder={3} />
      <instancedMesh ref={shimmerRef} args={[shimmerGeometry, shimmerMaterial, waterTiles.length * 2]} renderOrder={4} />
      <instancedMesh ref={shorelineRef} args={[shorelineGeometry, shorelineMaterial, waterTiles.length]} renderOrder={4} />
    </group>
  );
}

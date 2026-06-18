'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { TerrainTypeId } from '@/engine/core/types';

/** Create hex plane geometry for fog overlay */
function createHexPlane(radius: number): THREE.BufferGeometry {
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

type Visibility = 'hidden' | 'explored' | 'visible';

type FogInstance = {
  position: THREE.Vector3;
};

type FogEdgeInstance = FogInstance & {
  rotationY: number;
  scale: THREE.Vector3;
};

function FogBatch({
  geometry,
  material,
  instances,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  instances: FogInstance[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < instances.length; index++) {
      dummy.position.copy(instances[index].position);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (instances.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, instances.length]} renderOrder={30} />;
}

function FogEdgeBatch({
  geometry,
  material,
  instances,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  instances: FogEdgeInstance[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < instances.length; index++) {
      const instance = instances[index];
      dummy.position.copy(instance.position);
      dummy.rotation.set(0, instance.rotationY, 0);
      dummy.scale.copy(instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (instances.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, instances.length]} renderOrder={31} />;
}

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function fogEdge(tileQ: number, tileR: number, direction: number, y: number): FogEdgeInstance {
  const [wx, , wz] = hexToWorld({ q: tileQ, r: tileR });
  const angle0 = (Math.PI / 180) * (60 * direction - 30);
  const angle1 = (Math.PI / 180) * (60 * ((direction + 1) % 6) - 30);
  const x0 = wx + Math.cos(angle0) * 0.88;
  const z0 = wz + Math.sin(angle0) * 0.88;
  const x1 = wx + Math.cos(angle1) * 0.88;
  const z1 = wz + Math.sin(angle1) * 0.88;
  const length = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
  return {
    position: new THREE.Vector3((x0 + x1) * 0.5, y + 0.018, (z0 + z1) * 0.5),
    rotationY: -Math.atan2(z1 - z0, x1 - x0),
    scale: new THREE.Vector3(length * 0.94, 0.01, 0.18),
  };
}

export function FogLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const geometry = useMemo(() => createHexPlane(0.96), []);
  const edgeGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const hiddenMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#332d21',
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const exploredMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#756f57',
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const hiddenEdgeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#e0ca8b',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }), []);
  const exploredEdgeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#e1dbad',
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  }), []);

  // Compute visibility for each tile
  const fogBatches = useMemo(() => {
    const hidden: FogInstance[] = [];
    const explored: FogInstance[] = [];
    const hiddenEdges: FogEdgeInstance[] = [];
    const exploredEdges: FogEdgeInstance[] = [];
    if (!gameState || !showFog) return { hidden, explored, hiddenEdges, exploredEdges };

    const player = gameState.players[activePlayerId];
    if (!player) return { hidden, explored, hiddenEdges, exploredEdges };
    if (player.visibleHexes.length === 0 && player.exploredHexes.length === 0) {
      return { hidden, explored, hiddenEdges, exploredEdges };
    }

    const visibleSet = new Set(player.visibleHexes);
    const exploredSet = new Set(player.exploredHexes);

    for (const tile of Object.values(gameState.map.tiles)) {
      const key = `${tile.coord.q},${tile.coord.r}`;
      let visibility: Visibility = 'hidden';
      if (visibleSet.has(key)) visibility = 'visible';
      else if (exploredSet.has(key)) visibility = 'explored';
      if (visibility === 'visible') continue;

      const [wx, , wz] = hexToWorld(tile.coord);
      const terrainY = TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
      const instance = {
        position: new THREE.Vector3(wx, Math.max(0.38, terrainY + 0.38), wz),
      };
      if (visibility === 'hidden') hidden.push(instance);
      else explored.push(instance);

      for (let direction = 0; direction < 6; direction++) {
        const dir = HEX_DIRECTIONS[direction];
        const neighborKey = hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r);
        if (visibility === 'hidden' && visibleSet.has(neighborKey)) hiddenEdges.push(fogEdge(tile.coord.q, tile.coord.r, direction, instance.position.y));
        if (visibility === 'explored' && visibleSet.has(neighborKey)) exploredEdges.push(fogEdge(tile.coord.q, tile.coord.r, direction, instance.position.y));
      }
    }

    return { hidden, explored, hiddenEdges, exploredEdges };
  }, [gameState, showFog, activePlayerId]);

  if (
    fogBatches.hidden.length === 0 &&
    fogBatches.explored.length === 0 &&
    fogBatches.hiddenEdges.length === 0 &&
    fogBatches.exploredEdges.length === 0
  ) return null;

  return (
    <group>
      <FogBatch geometry={geometry} material={hiddenMaterial} instances={fogBatches.hidden} />
      <FogBatch geometry={geometry} material={exploredMaterial} instances={fogBatches.explored} />
      <FogEdgeBatch geometry={edgeGeometry} material={hiddenEdgeMaterial} instances={fogBatches.hiddenEdges} />
      <FogEdgeBatch geometry={edgeGeometry} material={exploredEdgeMaterial} instances={fogBatches.exploredEdges} />
    </group>
  );
}

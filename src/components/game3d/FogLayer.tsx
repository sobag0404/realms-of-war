'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
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

  return <instancedMesh ref={meshRef} args={[geometry, material, instances.length]} />;
}

export function FogLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const geometry = useMemo(() => createHexPlane(0.96), []);
  const hiddenMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#07111c',
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const exploredMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#2b383f',
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Compute visibility for each tile
  const fogBatches = useMemo(() => {
    const hidden: FogInstance[] = [];
    const explored: FogInstance[] = [];
    if (!gameState || !showFog) return { hidden, explored };

    const player = gameState.players[activePlayerId];
    if (!player) return { hidden, explored };
    if (player.visibleHexes.length === 0 && player.exploredHexes.length === 0) {
      return { hidden, explored };
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
    }

    return { hidden, explored };
  }, [gameState, showFog, activePlayerId]);

  if (fogBatches.hidden.length === 0 && fogBatches.explored.length === 0) return null;

  return (
    <group>
      <FogBatch geometry={geometry} material={hiddenMaterial} instances={fogBatches.hidden} />
      <FogBatch geometry={geometry} material={exploredMaterial} instances={fogBatches.explored} />
    </group>
  );
}

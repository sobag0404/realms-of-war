'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { RESOURCES, type ResourceId } from '@/data/resources';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type MarkerDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  yOffset: number;
  scale: number;
  emissive?: string;
};

type MarkerInstance = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

const RESOURCE_ORDER: ResourceId[] = ['gold', 'food', 'wood', 'stone', 'iron', 'mana', 'progress', 'science'];
const RESOURCE_MARKER_BASE: MarkerDef = {
  geometry: new THREE.CylinderGeometry(0.19, 0.21, 0.035, 16),
  color: '#171813',
  yOffset: -0.024,
  scale: 1,
};

function hash01(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 91.7 + r * 317.3 + salt * 43.1) * 43758.5453;
  return x - Math.floor(x);
}

function markerDefs(resource: ResourceId): MarkerDef[] {
  switch (resource) {
    case 'gold':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14), color: '#f3c44c', yOffset: 0, scale: 1 },
        { geometry: new THREE.CylinderGeometry(0.1, 0.1, 0.04, 14), color: '#ffe08a', yOffset: 0.052, scale: 0.86 },
      ];
    case 'food':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.ConeGeometry(0.09, 0.28, 5), color: '#d9843b', yOffset: 0.1, scale: 1 },
        { geometry: new THREE.ConeGeometry(0.055, 0.2, 5), color: '#8fb44c', yOffset: 0.14, scale: 0.85 },
      ];
    case 'wood':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.CylinderGeometry(0.045, 0.05, 0.34, 8), color: '#7a4f32', yOffset: 0.08, scale: 1 },
        { geometry: new THREE.CylinderGeometry(0.04, 0.045, 0.3, 8), color: '#a36a3f', yOffset: 0.13, scale: 0.84 },
      ];
    case 'stone':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.DodecahedronGeometry(0.14, 0), color: '#a7a69e', yOffset: 0.06, scale: 1 },
        { geometry: new THREE.DodecahedronGeometry(0.09, 0), color: '#716f6a', yOffset: 0.11, scale: 0.86 },
      ];
    case 'iron':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.ConeGeometry(0.11, 0.28, 5), color: '#596878', yOffset: 0.13, scale: 1 },
        { geometry: new THREE.OctahedronGeometry(0.09), color: '#b8c2c9', yOffset: 0.26, scale: 0.78 },
      ];
    case 'mana':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.OctahedronGeometry(0.16), color: '#8a65ff', yOffset: 0.18, scale: 1, emissive: '#4730a8' },
        { geometry: new THREE.CylinderGeometry(0.025, 0.05, 0.22, 6), color: '#d8c8ff', yOffset: 0.08, scale: 0.9, emissive: '#6c4dff' },
      ];
    case 'progress':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.BoxGeometry(0.24, 0.08, 0.16), color: '#8a7d63', yOffset: 0.08, scale: 1 },
        { geometry: new THREE.BoxGeometry(0.16, 0.03, 0.2), color: '#d5c28a', yOffset: 0.15, scale: 0.8 },
      ];
    case 'science':
      return [
        RESOURCE_MARKER_BASE,
        { geometry: new THREE.TorusGeometry(0.11, 0.018, 6, 16), color: '#69b7e8', yOffset: 0.16, scale: 1, emissive: '#1f5d78' },
        { geometry: new THREE.OctahedronGeometry(0.07), color: '#d3f4ff', yOffset: 0.16, scale: 0.74, emissive: '#4ab5e6' },
      ];
    default:
      return [];
  }
}

function markerAnchor(tile: HexTile, occupied: boolean): THREE.Vector3 {
  const [wx, , wz] = hexToWorld(tile.coord);
  const terrainY = TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
  const angle = -Math.PI / 2 + (hash01(tile.coord.q, tile.coord.r, 7) - 0.5) * 0.38;
  const radius = occupied ? 0.66 : 0.5;
  return new THREE.Vector3(
    wx + Math.cos(angle) * radius,
    Math.max(0.03, terrainY + 0.32),
    wz + Math.sin(angle) * radius,
  );
}

function buildMarkerInstances(
  tiles: HexTile[],
  defIndex: number,
  occupiedHexes: Set<string>,
): MarkerInstance[] {
  return tiles.map((tile) => {
    const occupied = occupiedHexes.has(`${tile.coord.q},${tile.coord.r}`);
    const anchor = markerAnchor(tile, occupied);
    const turn = hash01(tile.coord.q, tile.coord.r, 13 + defIndex) * Math.PI * 2;
    const scale = 1.12 + hash01(tile.coord.q, tile.coord.r, 29 + defIndex) * 0.18;
    return {
      position: anchor,
      rotation: new THREE.Euler(0, turn, defIndex === 0 ? 0 : 0.22),
      scale: new THREE.Vector3(scale, scale, scale),
    };
  });
}

function ResourceMarkerMesh({
  def,
  instances,
}: {
  def: MarkerDef;
  instances: MarkerInstance[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < instances.length; index++) {
      const instance = instances[index];
      dummy.position.copy(instance.position);
      dummy.position.y += def.yOffset;
      dummy.rotation.copy(instance.rotation);
      dummy.scale.copy(instance.scale).multiplyScalar(def.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [def, instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[def.geometry, undefined, instances.length]} castShadow receiveShadow>
      <meshStandardMaterial
        color={def.color}
        emissive={def.emissive ?? '#000000'}
        emissiveIntensity={def.emissive ? 0.26 : 0}
        roughness={0.72}
        metalness={0.08}
        flatShading
      />
    </instancedMesh>
  );
}

export function ResourceLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const { resourcesByType, occupiedHexes } = useMemo(() => {
    const resources = new Map<ResourceId, HexTile[]>();
    const occupied = new Set<string>();
    if (!gameState) return { resourcesByType: resources, occupiedHexes: occupied };

    for (const entity of Object.values(gameState.entities)) {
      occupied.add(`${entity.hex.q},${entity.hex.r}`);
    }
    for (const city of Object.values(gameState.cities)) {
      occupied.add(`${city.hex.q},${city.hex.r}`);
    }

    const player = gameState.players[activePlayerId];
    const visibleSet = showFog && player && player.visibleHexes.length > 0
      ? new Set(player.visibleHexes)
      : null;
    for (const tile of Object.values(gameState.map.tiles)) {
      if (!tile.resource) continue;
      if (visibleSet && !visibleSet.has(`${tile.coord.q},${tile.coord.r}`)) continue;
      const resource = tile.resource as ResourceId;
      if (!RESOURCES[resource]) continue;
      if (!resources.has(resource)) resources.set(resource, []);
      resources.get(resource)!.push(tile);
    }

    return { resourcesByType: resources, occupiedHexes: occupied };
  }, [activePlayerId, gameState, showFog]);

  const markerGroups = useMemo(() => {
    return RESOURCE_ORDER.flatMap((resource) => {
      const tiles = resourcesByType.get(resource) ?? [];
      return markerDefs(resource).map((def, defIndex) => ({
        key: `${resource}-${defIndex}`,
        def,
        instances: buildMarkerInstances(tiles, defIndex, occupiedHexes),
      }));
    });
  }, [occupiedHexes, resourcesByType]);

  if (!gameState || markerGroups.length === 0) return null;

  return (
    <group>
      {markerGroups.map(({ key, def, instances }) => (
        <ResourceMarkerMesh key={key} def={def} instances={instances} />
      ))}
    </group>
  );
}

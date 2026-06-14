'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type AccentDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  opacity: number;
  scaleRange: [number, number];
  count: [number, number];
  yOffset: number;
};

type AccentInstance = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

function hash01(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 127.1 + r * 311.7 + salt * 53.9) * 43758.5453;
  return x - Math.floor(x);
}

function accentDefs(terrain: TerrainTypeId): AccentDef[] {
  switch (terrain) {
    case 'plains':
      return [
        {
          geometry: new THREE.BoxGeometry(0.42, 0.012, 0.045),
          color: '#d0c86e',
          opacity: 0.42,
          scaleRange: [0.86, 1.34],
          count: [2, 3],
          yOffset: 0.19,
        },
      ];
    case 'desert':
      return [
        {
          geometry: new THREE.BoxGeometry(0.54, 0.012, 0.038),
          color: '#f1d486',
          opacity: 0.52,
          scaleRange: [0.92, 1.42],
          count: [2, 3],
          yOffset: 0.19,
        },
      ];
    case 'swamp':
      return [
        {
          geometry: new THREE.CylinderGeometry(0.13, 0.17, 0.014, 12),
          color: '#0f3433',
          opacity: 0.5,
          scaleRange: [0.78, 1.28],
          count: [2, 3],
          yOffset: 0.18,
        },
      ];
    case 'hills':
      return [
        {
          geometry: new THREE.BoxGeometry(0.48, 0.026, 0.07),
          color: '#c79957',
          opacity: 0.46,
          scaleRange: [0.82, 1.24],
          count: [2, 3],
          yOffset: 0.2,
        },
      ];
    case 'mountain':
      return [
        {
          geometry: new THREE.ConeGeometry(0.11, 0.11, 5),
          color: '#e7eef0',
          opacity: 0.86,
          scaleRange: [0.78, 1.22],
          count: [2, 3],
          yOffset: 0.28,
        },
      ];
    case 'forest':
      return [
        {
          geometry: new THREE.CylinderGeometry(0.18, 0.22, 0.012, 10),
          color: '#0e3822',
          opacity: 0.4,
          scaleRange: [0.86, 1.28],
          count: [2, 3],
          yOffset: 0.184,
        },
      ];
    case 'ruins':
      return [
        {
          geometry: new THREE.BoxGeometry(0.32, 0.02, 0.09),
          color: '#b7ad96',
          opacity: 0.52,
          scaleRange: [0.82, 1.24],
          count: [1, 3],
          yOffset: 0.19,
        },
      ];
    case 'water':
    default:
      return [];
  }
}

function buildAccentInstances(terrain: TerrainTypeId, tiles: HexTile[], def: AccentDef): AccentInstance[] {
  const instances: AccentInstance[] = [];
  for (const tile of tiles) {
    const min = def.count[0];
    const max = def.count[1];
    const count = min + Math.floor(hash01(tile.coord.q, tile.coord.r, 41) * (max - min + 1));
    const [wx, , wz] = hexToWorld(tile.coord);
    const baseY = Math.max(0, TERRAIN_ELEVATION[terrain] ?? 0) + def.yOffset;

    for (let index = 0; index < count; index++) {
      const angle = hash01(tile.coord.q, tile.coord.r, 53 + index) * Math.PI * 2;
      const radius = 0.14 + hash01(tile.coord.q, tile.coord.r, 67 + index) * 0.36;
      const scale = def.scaleRange[0] + hash01(tile.coord.q, tile.coord.r, 79 + index) * (def.scaleRange[1] - def.scaleRange[0]);
      instances.push({
        position: new THREE.Vector3(wx + Math.cos(angle) * radius, baseY, wz + Math.sin(angle) * radius),
        rotation: new THREE.Euler(0, angle + hash01(tile.coord.q, tile.coord.r, 89 + index) * 0.8, 0),
        scale: new THREE.Vector3(scale, scale, scale),
      });
    }
  }
  return instances;
}

function InstancedAccentMesh({
  def,
  instances,
}: {
  def: AccentDef;
  instances: AccentInstance[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < instances.length; index++) {
      const instance = instances[index];
      dummy.position.copy(instance.position);
      dummy.rotation.copy(instance.rotation);
      dummy.scale.copy(instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[def.geometry, undefined, instances.length]} receiveShadow>
      <meshStandardMaterial
        color={def.color}
        transparent
        opacity={def.opacity}
        roughness={0.96}
        metalness={0.02}
        flatShading
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export function TerrainAccentLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const tilesByTerrain = useMemo(() => {
    const grouped = new Map<TerrainTypeId, HexTile[]>();
    if (!gameState) return grouped;

    const player = gameState.players[activePlayerId];
    const visibleSet = showFog && player && player.visibleHexes.length > 0
      ? new Set(player.visibleHexes)
      : null;
    for (const tile of Object.values(gameState.map.tiles)) {
      if (tile.terrain === 'water') continue;
      if (visibleSet && !visibleSet.has(`${tile.coord.q},${tile.coord.r}`)) continue;
      const terrain = tile.terrain as TerrainTypeId;
      if (!grouped.has(terrain)) grouped.set(terrain, []);
      grouped.get(terrain)!.push(tile);
    }
    return grouped;
  }, [activePlayerId, gameState, showFog]);

  const accentGroups = useMemo(() => {
    return Array.from(tilesByTerrain.entries()).flatMap(([terrain, tiles]) =>
      accentDefs(terrain).map((def, index) => ({
        key: `${terrain}-${index}`,
        def,
        instances: buildAccentInstances(terrain, tiles, def),
      })),
    );
  }, [tilesByTerrain]);

  if (!gameState || accentGroups.length === 0) return null;

  return (
    <group>
      {accentGroups.map(({ key, def, instances }) => (
        <InstancedAccentMesh key={key} def={def} instances={instances} />
      ))}
    </group>
  );
}

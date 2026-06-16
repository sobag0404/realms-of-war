'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type DepthCueKey =
  | 'mountainCast'
  | 'hillCast'
  | 'forestMass'
  | 'ruinBase'
  | 'coastDrop';

type DepthCueInstance = {
  position: THREE.Vector3;
  rotationY: number;
  scale: THREE.Vector3;
};

type DepthCueDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  opacity: number;
  renderOrder: number;
};

const SUN_SHADOW_YAW = Math.atan2(-1, -1);

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function hash01(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 91.73 + r * 421.17 + salt * 63.29) * 43758.5453;
  return x - Math.floor(x);
}

function baseY(tile: HexTile): number {
  return Math.max(0, TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0);
}

function pushCue(
  groups: Map<DepthCueKey, DepthCueInstance[]>,
  key: DepthCueKey,
  instance: DepthCueInstance,
) {
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(instance);
}

function addHeightCue(groups: Map<DepthCueKey, DepthCueInstance[]>, tile: HexTile, occupied: boolean) {
  if (occupied) return;
  const terrain = tile.terrain as TerrainTypeId;
  const [wx, , wz] = hexToWorld(tile.coord);
  const jitter = (hash01(tile.coord.q, tile.coord.r, 19) - 0.5) * 0.14;
  const offsetX = -0.18 + jitter;
  const offsetZ = -0.18 - jitter;
  const yaw = SUN_SHADOW_YAW + (hash01(tile.coord.q, tile.coord.r, 23) - 0.5) * 0.32;

  if (terrain === 'mountain') {
    pushCue(groups, 'mountainCast', {
      position: new THREE.Vector3(wx + offsetX, baseY(tile) + 0.19, wz + offsetZ),
      rotationY: yaw,
      scale: new THREE.Vector3(1.22, 0.014, 0.52),
    });
  } else if (terrain === 'hills') {
    pushCue(groups, 'hillCast', {
      position: new THREE.Vector3(wx + offsetX * 0.7, baseY(tile) + 0.15, wz + offsetZ * 0.7),
      rotationY: yaw,
      scale: new THREE.Vector3(0.9, 0.012, 0.36),
    });
  } else if (terrain === 'forest') {
    pushCue(groups, 'forestMass', {
      position: new THREE.Vector3(wx + offsetX * 0.55, baseY(tile) + 0.18, wz + offsetZ * 0.55),
      rotationY: yaw,
      scale: new THREE.Vector3(0.86, 0.012, 0.48),
    });
  } else if (terrain === 'ruins') {
    pushCue(groups, 'ruinBase', {
      position: new THREE.Vector3(wx, baseY(tile) + 0.18, wz),
      rotationY: hash01(tile.coord.q, tile.coord.r, 31) * Math.PI * 2,
      scale: new THREE.Vector3(0.64, 0.012, 0.44),
    });
  }
}

function addCoastDropCues(groups: Map<DepthCueKey, DepthCueInstance[]>, tile: HexTile, tiles: Record<string, HexTile>) {
  if (tile.terrain === 'water') return;
  const [wx, , wz] = hexToWorld(tile.coord);

  for (let direction = 0; direction < 6; direction++) {
    const dir = HEX_DIRECTIONS[direction];
    const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
    if (!neighbor || neighbor.terrain !== 'water') continue;
    if (hash01(tile.coord.q, tile.coord.r, 100 + direction) < 0.28) continue;

    const angle0 = (Math.PI / 180) * (60 * direction - 30);
    const angle1 = (Math.PI / 180) * (60 * ((direction + 1) % 6) - 30);
    const x0 = wx + Math.cos(angle0) * 0.9;
    const z0 = wz + Math.sin(angle0) * 0.9;
    const x1 = wx + Math.cos(angle1) * 0.9;
    const z1 = wz + Math.sin(angle1) * 0.9;
    const length = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);

    pushCue(groups, 'coastDrop', {
      position: new THREE.Vector3((x0 + x1) * 0.5, baseY(tile) + 0.16, (z0 + z1) * 0.5),
      rotationY: -Math.atan2(z1 - z0, x1 - x0),
      scale: new THREE.Vector3(length * 0.92, 0.012, 0.16),
    });
  }
}

function buildDepthCueGroups(
  tiles: Record<string, HexTile>,
  knownHexes: Set<string> | null,
  occupiedHexes: Set<string>,
): Map<DepthCueKey, DepthCueInstance[]> {
  const groups = new Map<DepthCueKey, DepthCueInstance[]>();
  for (const tile of Object.values(tiles)) {
    const key = hexKey(tile.coord.q, tile.coord.r);
    if (knownHexes && !knownHexes.has(key)) continue;
    addHeightCue(groups, tile, occupiedHexes.has(key));
    addCoastDropCues(groups, tile, tiles);
  }
  return groups;
}

function buildDepthCueDefs(): Record<DepthCueKey, DepthCueDef> {
  return {
    mountainCast: { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 18), color: '#071015', opacity: 0.24, renderOrder: 6 },
    hillCast: { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 16), color: '#16140d', opacity: 0.18, renderOrder: 6 },
    forestMass: { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 16), color: '#07160f', opacity: 0.2, renderOrder: 6 },
    ruinBase: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#14100b', opacity: 0.18, renderOrder: 6 },
    coastDrop: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#1b2b29', opacity: 0.2, renderOrder: 6 },
  };
}

function DepthCueMesh({ def, instances }: { def: DepthCueDef; instances: DepthCueInstance[] }) {
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

  return (
    <instancedMesh ref={meshRef} args={[def.geometry, undefined, instances.length]} renderOrder={def.renderOrder}>
      <meshBasicMaterial color={def.color} transparent opacity={def.opacity} depthWrite={false} />
    </instancedMesh>
  );
}

export function StrategicDepthCueLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const knownHexes = useMemo(() => {
    if (!gameState || !showFog) return null;
    const player = gameState.players[activePlayerId];
    const known = player ? [...player.visibleHexes, ...player.exploredHexes] : [];
    return known.length > 0 ? new Set(known) : null;
  }, [activePlayerId, gameState, showFog]);

  const occupiedHexes = useMemo(() => {
    const occupied = new Set<string>();
    if (!gameState) return occupied;
    for (const city of Object.values(gameState.cities)) occupied.add(hexKey(city.hex.q, city.hex.r));
    for (const entity of Object.values(gameState.entities)) occupied.add(hexKey(entity.hex.q, entity.hex.r));
    return occupied;
  }, [gameState]);

  const cueDefs = useMemo(() => buildDepthCueDefs(), []);
  const cueGroups = useMemo(() => {
    if (!gameState) return new Map<DepthCueKey, DepthCueInstance[]>();
    return buildDepthCueGroups(gameState.map.tiles, knownHexes, occupiedHexes);
  }, [gameState, knownHexes, occupiedHexes]);

  if (!gameState || cueGroups.size === 0) return null;

  return (
    <group>
      {Object.entries(cueDefs).map(([key, def]) => (
        <DepthCueMesh key={key} def={def} instances={cueGroups.get(key as DepthCueKey) ?? []} />
      ))}
    </group>
  );
}

'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { terrainSurfaceHash } from '@/rendering/terrain/terrainSurfacePatterns';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type AtmosphereKey = 'waterMist' | 'coastMist' | 'swampHaze' | 'highlandHaze';

type AtmosphereInstance = {
  position: THREE.Vector3;
  rotationY: number;
  scale: THREE.Vector3;
};

type AtmosphereDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  opacity: number;
  renderOrder: number;
};

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function isCoast(tile: HexTile, tiles: Record<string, HexTile>): boolean {
  return HEX_DIRECTIONS.some((dir) => {
    const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
    return neighbor && neighbor.terrain !== tile.terrain && (neighbor.terrain === 'water' || tile.terrain === 'water');
  });
}

function highlandNeighbors(tile: HexTile, tiles: Record<string, HexTile>): number {
  return HEX_DIRECTIONS.reduce((count, dir) => {
    const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
    return neighbor && (neighbor.terrain === 'mountain' || neighbor.terrain === 'hills') ? count + 1 : count;
  }, 0);
}

function pushAtmosphere(
  groups: Map<AtmosphereKey, AtmosphereInstance[]>,
  key: AtmosphereKey,
  instance: AtmosphereInstance,
) {
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(instance);
}

function addAtmosphereForTile(
  groups: Map<AtmosphereKey, AtmosphereInstance[]>,
  tile: HexTile,
  tiles: Record<string, HexTile>,
  occupied: boolean,
) {
  if (occupied || tile.resource) return;
  const terrain = tile.terrain as TerrainTypeId;
  const [wx, , wz] = hexToWorld(tile.coord);
  const baseY = TERRAIN_ELEVATION[terrain] ?? 0;
  const yaw = terrainSurfaceHash(tile.coord.q, tile.coord.r, 410) * Math.PI * 2;

  if (terrain === 'water' && terrainSurfaceHash(tile.coord.q, tile.coord.r, 411) > 0.52) {
    pushAtmosphere(groups, isCoast(tile, tiles) ? 'coastMist' : 'waterMist', {
      position: new THREE.Vector3(wx, 0.055, wz),
      rotationY: yaw,
      scale: new THREE.Vector3(0.9, 0.01, 0.24),
    });
    return;
  }

  if (terrain === 'swamp' && terrainSurfaceHash(tile.coord.q, tile.coord.r, 421) > 0.42) {
    pushAtmosphere(groups, 'swampHaze', {
      position: new THREE.Vector3(wx, baseY + 0.24, wz),
      rotationY: yaw,
      scale: new THREE.Vector3(0.78, 0.01, 0.22),
    });
    return;
  }

  if ((terrain === 'mountain' || terrain === 'hills') && highlandNeighbors(tile, tiles) >= 3) {
    if (terrainSurfaceHash(tile.coord.q, tile.coord.r, 431) < 0.45) return;
    pushAtmosphere(groups, 'highlandHaze', {
      position: new THREE.Vector3(wx, Math.max(0.3, baseY + 0.22), wz),
      rotationY: yaw,
      scale: new THREE.Vector3(0.72, 0.01, 0.2),
    });
  }
}

function buildAtmosphereGroups(
  tiles: Record<string, HexTile>,
  knownHexes: Set<string> | null,
  occupiedHexes: Set<string>,
): Map<AtmosphereKey, AtmosphereInstance[]> {
  const groups = new Map<AtmosphereKey, AtmosphereInstance[]>();
  for (const tile of Object.values(tiles)) {
    const key = hexKey(tile.coord.q, tile.coord.r);
    if (knownHexes && !knownHexes.has(key)) continue;
    addAtmosphereForTile(groups, tile, tiles, occupiedHexes.has(key));
  }
  return groups;
}

function buildAtmosphereDefs(): Record<AtmosphereKey, AtmosphereDef> {
  return {
    waterMist: { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 18), color: '#bcebe3', opacity: 0.1, renderOrder: 11 },
    coastMist: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#dcefdc', opacity: 0.12, renderOrder: 11 },
    swampHaze: { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 14), color: '#9eb18b', opacity: 0.1, renderOrder: 11 },
    highlandHaze: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#d8e5d8', opacity: 0.1, renderOrder: 11 },
  };
}

function AtmosphereMesh({ def, instances }: { def: AtmosphereDef; instances: AtmosphereInstance[] }) {
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

export function AtmosphereLayer() {
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

  const defs = useMemo(() => buildAtmosphereDefs(), []);
  const groups = useMemo(() => {
    if (!gameState) return new Map<AtmosphereKey, AtmosphereInstance[]>();
    return buildAtmosphereGroups(gameState.map.tiles, knownHexes, occupiedHexes);
  }, [gameState, knownHexes, occupiedHexes]);

  if (!gameState || groups.size === 0) return null;

  return (
    <group>
      {Object.entries(defs).map(([key, def]) => (
        <AtmosphereMesh key={key} def={def} instances={groups.get(key as AtmosphereKey) ?? []} />
      ))}
    </group>
  );
}

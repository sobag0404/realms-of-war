'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type RiverSegment = {
  position: THREE.Vector3;
  rotationY: number;
  length: number;
};

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function isBefore(a: HexTile, b: HexTile): boolean {
  return a.coord.q < b.coord.q || (a.coord.q === b.coord.q && a.coord.r < b.coord.r);
}

function segmentY(a: HexTile, b: HexTile): number {
  const terrainA = a.terrain as TerrainTypeId;
  const terrainB = b.terrain as TerrainTypeId;
  const yA = TERRAIN_ELEVATION[terrainA] ?? 0;
  const yB = TERRAIN_ELEVATION[terrainB] ?? 0;
  return Math.max(yA, yB, 0) + 0.3;
}

function buildRiverSegments(tiles: Record<string, HexTile>, knownHexes: Set<string> | null): {
  wet: RiverSegment[];
  dry: RiverSegment[];
} {
  const wet: RiverSegment[] = [];
  const dry: RiverSegment[] = [];

  for (const tile of Object.values(tiles)) {
    const mask = tile.riverMask ?? 0;
    if (mask === 0) continue;

    const key = hexKey(tile.coord.q, tile.coord.r);
    if (knownHexes && !knownHexes.has(key)) continue;

    for (let direction = 0; direction < 6; direction++) {
      if ((mask & (1 << direction)) === 0) continue;
      const dir = HEX_DIRECTIONS[direction];
      const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
      if (!neighbor || !isBefore(tile, neighbor)) continue;

      const neighborKey = hexKey(neighbor.coord.q, neighbor.coord.r);
      if (knownHexes && !knownHexes.has(neighborKey)) continue;

      const [ax, , az] = hexToWorld(tile.coord);
      const [bx, , bz] = hexToWorld(neighbor.coord);
      const dx = bx - ax;
      const dz = bz - az;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length <= 0) continue;

      const segment = {
        position: new THREE.Vector3((ax + bx) * 0.5, segmentY(tile, neighbor), (az + bz) * 0.5),
        rotationY: -Math.atan2(dz, dx),
        length,
      };

      if (tile.terrain === 'desert' && neighbor.terrain === 'desert') dry.push(segment);
      else wet.push(segment);
    }
  }

  return { wet, dry };
}

function InstancedRiverStrips({
  segments,
  material,
  width,
  yOffset = 0,
  lengthScale = 0.64,
}: {
  segments: RiverSegment[];
  material: THREE.Material;
  width: number;
  yOffset?: number;
  lengthScale?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      dummy.position.copy(segment.position);
      dummy.position.y += yOffset;
      dummy.rotation.set(0, segment.rotationY, 0);
      dummy.scale.set(segment.length * lengthScale, 0.012, width);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [lengthScale, segments, width, yOffset]);

  if (segments.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, segments.length]} renderOrder={12} />;
}

export function RiverLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const knownHexes = useMemo(() => {
    if (!gameState || !showFog) return null;
    const player = gameState.players[activePlayerId];
    const knownKeys = player ? [...player.visibleHexes, ...player.exploredHexes] : [];
    return knownKeys.length > 0 ? new Set(knownKeys) : null;
  }, [activePlayerId, gameState, showFog]);

  const segments = useMemo(() => {
    if (!gameState) return { wet: [], dry: [] };
    return buildRiverSegments(gameState.map.tiles, knownHexes);
  }, [gameState, knownHexes]);

  const bedMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#26302d',
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  }), []);
  const waterMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#56c7cb',
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  }), []);
  const glintMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#dffdf0',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  }), []);
  const dryBedMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#8f7046',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }), []);

  const total = segments.wet.length + segments.dry.length;
  if (!gameState || total === 0) return null;

  return (
    <group>
      <InstancedRiverStrips segments={segments.wet} material={bedMaterial} width={0.19} yOffset={-0.004} />
      <InstancedRiverStrips segments={segments.wet} material={waterMaterial} width={0.105} yOffset={0.004} lengthScale={0.58} />
      <InstancedRiverStrips segments={segments.wet} material={glintMaterial} width={0.024} yOffset={0.014} lengthScale={0.5} />
      <InstancedRiverStrips segments={segments.dry} material={dryBedMaterial} width={0.15} yOffset={0.002} lengthScale={0.58} />
    </group>
  );
}

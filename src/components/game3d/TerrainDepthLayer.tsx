'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type DepthSegment = {
  position: THREE.Vector3;
  rotationY: number;
  length: number;
};

type DepthFaceSegment = DepthSegment & {
  height: number;
};

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function hexEdge(worldX: number, worldZ: number, direction: number, radius: number): {
  center: THREE.Vector3;
  rotationY: number;
  length: number;
} {
  const angle0 = (Math.PI / 180) * (60 * direction - 30);
  const angle1 = (Math.PI / 180) * (60 * ((direction + 1) % 6) - 30);
  const x0 = worldX + Math.cos(angle0) * radius;
  const z0 = worldZ + Math.sin(angle0) * radius;
  const x1 = worldX + Math.cos(angle1) * radius;
  const z1 = worldZ + Math.sin(angle1) * radius;
  const dx = x1 - x0;
  const dz = z1 - z0;
  return {
    center: new THREE.Vector3((x0 + x1) * 0.5, 0, (z0 + z1) * 0.5),
    rotationY: -Math.atan2(dz, dx),
    length: Math.sqrt(dx * dx + dz * dz),
  };
}

function elevationOf(tile: HexTile): number {
  return TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
}

function buildDepthSegments(tiles: Record<string, HexTile>, knownHexes: Set<string> | null): {
  cliff: DepthSegment[];
  face: DepthFaceSegment[];
  rim: DepthSegment[];
  shore: DepthSegment[];
} {
  const cliff: DepthSegment[] = [];
  const face: DepthFaceSegment[] = [];
  const rim: DepthSegment[] = [];
  const shore: DepthSegment[] = [];

  for (const tile of Object.values(tiles)) {
    if (tile.terrain === 'water') continue;
    const key = hexKey(tile.coord.q, tile.coord.r);
    if (knownHexes && !knownHexes.has(key)) continue;

    const [wx, , wz] = hexToWorld(tile.coord);
    const tileY = elevationOf(tile);

    for (let direction = 0; direction < 6; direction++) {
      const dir = HEX_DIRECTIONS[direction];
      const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
      if (!neighbor) continue;

      const neighborKey = hexKey(neighbor.coord.q, neighbor.coord.r);
      if (knownHexes && !knownHexes.has(neighborKey)) continue;

      const neighborY = elevationOf(neighbor);
      const delta = tileY - neighborY;
      if (delta < 0.12 && neighbor.terrain !== 'water') continue;

      const edge = hexEdge(wx, wz, direction, 0.98);
      const segment = {
        position: new THREE.Vector3(edge.center.x, Math.max(tileY, 0) + 0.32, edge.center.z),
        rotationY: edge.rotationY,
        length: edge.length,
      };

      if (neighbor.terrain === 'water') shore.push(segment);
      else {
        cliff.push(segment);
        if (tile.terrain === 'mountain' || tile.terrain === 'hills') rim.push(segment);
      }

      if (delta >= 0.12 || neighbor.terrain === 'water') {
        const faceHeight = THREE.MathUtils.clamp((neighbor.terrain === 'water' ? tileY + 0.18 : delta) * 0.42, 0.055, 0.22);
        face.push({
          position: new THREE.Vector3(edge.center.x, Math.max(tileY, 0) + 0.24 - faceHeight * 0.5, edge.center.z),
          rotationY: edge.rotationY,
          length: edge.length,
          height: faceHeight,
        });
      }
    }
  }

  return { cliff, face, rim, shore };
}

function InstancedDepthStrips({
  segments,
  material,
  width,
  height,
  yOffset = 0,
}: {
  segments: DepthSegment[];
  material: THREE.Material;
  width: number;
  height: number;
  yOffset?: number;
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
      dummy.scale.set(segment.length * 0.9, height, width);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [height, segments, width, yOffset]);

  if (segments.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, segments.length]} renderOrder={8} />;
}

function InstancedDepthFaces({
  segments,
  material,
  width,
}: {
  segments: DepthFaceSegment[];
  material: THREE.Material;
  width: number;
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
      dummy.rotation.set(0, segment.rotationY, 0);
      dummy.scale.set(segment.length * 0.88, segment.height, width);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [segments, width]);

  if (segments.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, segments.length]} renderOrder={7} />;
}

export function TerrainDepthLayer() {
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
    if (!gameState) return { cliff: [], face: [], rim: [], shore: [] };
    return buildDepthSegments(gameState.map.tiles, knownHexes);
  }, [gameState, knownHexes]);

  const cliffMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#171b17',
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  }), []);
  const faceMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#10150f',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }), []);
  const rimMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#e4d7a1',
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  }), []);
  const shoreCliffMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#54402d',
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  }), []);

  if (!gameState) return null;
  const total = segments.cliff.length + segments.face.length + segments.rim.length + segments.shore.length;
  if (total === 0) return null;

  return (
    <group>
      <InstancedDepthFaces segments={segments.face} material={faceMaterial} width={0.07} />
      <InstancedDepthStrips segments={segments.cliff} material={cliffMaterial} width={0.09} height={0.018} />
      <InstancedDepthStrips segments={segments.rim} material={rimMaterial} width={0.035} height={0.01} yOffset={0.012} />
      <InstancedDepthStrips segments={segments.shore} material={shoreCliffMaterial} width={0.12} height={0.016} yOffset={-0.004} />
    </group>
  );
}

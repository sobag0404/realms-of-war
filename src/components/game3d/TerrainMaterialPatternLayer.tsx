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

type PatternKey =
  | 'plainsMottle'
  | 'forestLeafMat'
  | 'desertCrack'
  | 'desertDust'
  | 'swampWetPatch'
  | 'hillStrata'
  | 'mountainScree'
  | 'ruinCrack'
  | 'coastDamp'
  | 'waterSheen';

type PatternInstance = {
  position: THREE.Vector3;
  rotationY: number;
  scale: THREE.Vector3;
};

type PatternDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  opacity: number;
  yOffset?: number;
};

const SURFACE_TOP: Record<TerrainTypeId, number> = {
  plains: 0.205,
  forest: 0.285,
  mountain: 0.995,
  water: -0.105,
  desert: 0.2,
  swamp: 0.095,
  hills: 0.55,
  ruins: 0.31,
};

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function pushPattern(
  groups: Map<PatternKey, PatternInstance[]>,
  key: PatternKey,
  instance: PatternInstance,
) {
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(instance);
}

function tileSurfaceY(tile: HexTile): number {
  const terrain = tile.terrain as TerrainTypeId;
  return (TERRAIN_ELEVATION[terrain] ?? 0) + SURFACE_TOP[terrain];
}

function anchor(tile: HexTile, salt: number, minRadius = 0.18, maxRadius = 0.72): THREE.Vector3 {
  const [wx, , wz] = hexToWorld(tile.coord);
  const angle = terrainSurfaceHash(tile.coord.q, tile.coord.r, salt) * Math.PI * 2;
  const radius = minRadius + terrainSurfaceHash(tile.coord.q, tile.coord.r, salt + 1) * (maxRadius - minRadius);
  return new THREE.Vector3(
    wx + Math.cos(angle) * radius,
    tileSurfaceY(tile),
    wz + Math.sin(angle) * radius,
  );
}

function addGenericPatterns(groups: Map<PatternKey, PatternInstance[]>, tile: HexTile) {
  const terrain = tile.terrain as TerrainTypeId;
  if (terrain === 'water') {
    if (terrainSurfaceHash(tile.coord.q, tile.coord.r, 11) > 0.55) {
      const a = anchor(tile, 12, 0.16, 0.68);
      pushPattern(groups, 'waterSheen', {
        position: a,
        rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 13) * Math.PI,
        scale: new THREE.Vector3(0.85, 0.018, 0.18),
      });
    }
    return;
  }

  switch (terrain) {
    case 'plains':
      for (let index = 0; index < 2; index++) {
        const a = anchor(tile, 30 + index, 0.22, 0.68);
        const s = 0.72 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 40 + index) * 0.46;
        pushPattern(groups, 'plainsMottle', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 50 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.014, s * 0.34),
        });
      }
      break;
    case 'forest':
      for (let index = 0; index < 2; index++) {
        const a = anchor(tile, 60 + index, 0.28, 0.74);
        const s = 0.82 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 70 + index) * 0.5;
        pushPattern(groups, 'forestLeafMat', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 80 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.016, s * 0.42),
        });
      }
      break;
    case 'desert':
      for (let index = 0; index < 2; index++) {
        const a = anchor(tile, 90 + index, 0.26, 0.7);
        const s = 0.8 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 100 + index) * 0.42;
        pushPattern(groups, index === 0 ? 'desertCrack' : 'desertDust', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 110 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.018, s * (index === 0 ? 0.08 : 0.28)),
        });
      }
      break;
    case 'swamp':
      for (let index = 0; index < 2; index++) {
        const a = anchor(tile, 120 + index, 0.22, 0.66);
        const s = 0.72 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 130 + index) * 0.44;
        pushPattern(groups, 'swampWetPatch', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 140 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.016, s * 0.56),
        });
      }
      break;
    case 'hills':
      for (let index = 0; index < 2; index++) {
        const a = anchor(tile, 150 + index, 0.28, 0.72);
        const s = 0.78 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 160 + index) * 0.44;
        pushPattern(groups, 'hillStrata', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 170 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.018, s * 0.12),
        });
      }
      break;
    case 'mountain':
      for (let index = 0; index < 3; index++) {
        const a = anchor(tile, 180 + index, 0.18, 0.72);
        const s = 0.62 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 190 + index) * 0.44;
        pushPattern(groups, 'mountainScree', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 200 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.02, s * 0.2),
        });
      }
      break;
    case 'ruins':
      for (let index = 0; index < 2; index++) {
        const a = anchor(tile, 210 + index, 0.2, 0.7);
        const s = 0.76 + terrainSurfaceHash(tile.coord.q, tile.coord.r, 220 + index) * 0.34;
        pushPattern(groups, 'ruinCrack', {
          position: a,
          rotationY: terrainSurfaceHash(tile.coord.q, tile.coord.r, 230 + index) * Math.PI * 2,
          scale: new THREE.Vector3(s, 0.018, s * 0.08),
        });
      }
      break;
    default:
      break;
  }
}

function addCoastPatterns(groups: Map<PatternKey, PatternInstance[]>, tile: HexTile, tiles: Record<string, HexTile>) {
  if (tile.terrain === 'water') return;
  for (let direction = 0; direction < 6; direction++) {
    const dir = HEX_DIRECTIONS[direction];
    const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
    if (!neighbor || neighbor.terrain !== 'water') continue;
    if (terrainSurfaceHash(tile.coord.q, tile.coord.r, 240 + direction) < 0.36) continue;

    const [wx, , wz] = hexToWorld(tile.coord);
    const angle0 = (Math.PI / 180) * (60 * direction - 30);
    const angle1 = (Math.PI / 180) * (60 * ((direction + 1) % 6) - 30);
    const x0 = wx + Math.cos(angle0) * 0.8;
    const z0 = wz + Math.sin(angle0) * 0.8;
    const x1 = wx + Math.cos(angle1) * 0.8;
    const z1 = wz + Math.sin(angle1) * 0.8;
    pushPattern(groups, 'coastDamp', {
      position: new THREE.Vector3((x0 + x1) * 0.5, tileSurfaceY(tile) + 0.004, (z0 + z1) * 0.5),
      rotationY: -Math.atan2(z1 - z0, x1 - x0),
      scale: new THREE.Vector3(0.62, 0.016, 0.1),
    });
  }
}

function buildPatterns(tiles: Record<string, HexTile>, knownHexes: Set<string> | null): Map<PatternKey, PatternInstance[]> {
  const groups = new Map<PatternKey, PatternInstance[]>();
  for (const tile of Object.values(tiles)) {
    const key = hexKey(tile.coord.q, tile.coord.r);
    if (knownHexes && !knownHexes.has(key)) continue;
    addGenericPatterns(groups, tile);
    addCoastPatterns(groups, tile, tiles);
  }
  return groups;
}

function buildPatternDefs(): Record<PatternKey, PatternDef> {
  return {
    plainsMottle: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#d0c66d', opacity: 0.26 },
    forestLeafMat: { geometry: new THREE.CylinderGeometry(0.44, 0.48, 1, 12), color: '#102b1d', opacity: 0.32 },
    desertCrack: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#6f5730', opacity: 0.32 },
    desertDust: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#f0cf86', opacity: 0.22 },
    swampWetPatch: { geometry: new THREE.CylinderGeometry(0.42, 0.5, 1, 12), color: '#102f32', opacity: 0.38 },
    hillStrata: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#c79c5b', opacity: 0.32 },
    mountainScree: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#d2d6d0', opacity: 0.28 },
    ruinCrack: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#393530', opacity: 0.3 },
    coastDamp: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#2f5d5b', opacity: 0.3 },
    waterSheen: { geometry: new THREE.BoxGeometry(1, 1, 1), color: '#baf7f1', opacity: 0.24 },
  };
}

function PatternMesh({ def, instances }: { def: PatternDef; instances: PatternInstance[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < instances.length; index++) {
      const instance = instances[index];
      dummy.position.copy(instance.position);
      dummy.position.y += def.yOffset ?? 0;
      dummy.rotation.set(0, instance.rotationY, 0);
      dummy.scale.copy(instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [def.yOffset, instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[def.geometry, undefined, instances.length]} renderOrder={5}>
      <meshBasicMaterial color={def.color} transparent opacity={def.opacity} depthWrite={false} />
    </instancedMesh>
  );
}

export function TerrainMaterialPatternLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const knownHexes = useMemo(() => {
    if (!gameState || !showFog) return null;
    const player = gameState.players[activePlayerId];
    const known = player ? [...player.visibleHexes, ...player.exploredHexes] : [];
    return known.length > 0 ? new Set(known) : null;
  }, [activePlayerId, gameState, showFog]);

  const patternDefs = useMemo(() => buildPatternDefs(), []);
  const patternGroups = useMemo(() => {
    if (!gameState) return new Map<PatternKey, PatternInstance[]>();
    return buildPatterns(gameState.map.tiles, knownHexes);
  }, [gameState, knownHexes]);

  if (!gameState || patternGroups.size === 0) return null;

  return (
    <group>
      {Object.entries(patternDefs).map(([key, def]) => (
        <PatternMesh key={key} def={def} instances={patternGroups.get(key as PatternKey) ?? []} />
      ))}
    </group>
  );
}

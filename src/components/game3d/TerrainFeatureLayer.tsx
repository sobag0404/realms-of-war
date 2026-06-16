'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

type FeatureKey =
  | 'forestTrunk'
  | 'forestCanopy'
  | 'forestCanopyLight'
  | 'mountainRidge'
  | 'mountainSnowCap'
  | 'hillTerrace'
  | 'hillRock'
  | 'swampPool'
  | 'swampReed'
  | 'ruinPillar'
  | 'ruinSlab'
  | 'desertDune'
  | 'coastStone'
  | 'coastFoam'
  | 'resourceSupport'
  | 'plainsShrub'
  | 'plainsStone';

type FeatureInstance = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

type FeatureDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  renderOrder?: number;
};

const CENTER_CLEAR_RADIUS = 0.36;

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

function hash01(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 123.41 + r * 345.67 + salt * 91.13) * 43758.5453;
  return x - Math.floor(x);
}

function baseY(tile: HexTile): number {
  return Math.max(0, TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0);
}

function pushFeature(
  groups: Map<FeatureKey, FeatureInstance[]>,
  key: FeatureKey,
  instance: FeatureInstance,
) {
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(instance);
}

function offsetOnTile(tile: HexTile, salt: number, radiusMin = CENTER_CLEAR_RADIUS, radiusMax = 0.72): THREE.Vector3 {
  const [wx, , wz] = hexToWorld(tile.coord);
  const angle = hash01(tile.coord.q, tile.coord.r, salt) * Math.PI * 2;
  const radius = radiusMin + hash01(tile.coord.q, tile.coord.r, salt + 1) * (radiusMax - radiusMin);
  return new THREE.Vector3(wx + Math.cos(angle) * radius, 0, wz + Math.sin(angle) * radius);
}

function rotation(tile: HexTile, salt: number, tilt = 0): THREE.Euler {
  return new THREE.Euler(tilt, hash01(tile.coord.q, tile.coord.r, salt) * Math.PI * 2, tilt * 0.45);
}

function scale3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

function coastEdge(tile: HexTile, direction: number): { center: THREE.Vector3; angle: number } {
  const [wx, , wz] = hexToWorld(tile.coord);
  const angle0 = (Math.PI / 180) * (60 * direction - 30);
  const angle1 = (Math.PI / 180) * (60 * ((direction + 1) % 6) - 30);
  const x0 = wx + Math.cos(angle0) * 0.92;
  const z0 = wz + Math.sin(angle0) * 0.92;
  const x1 = wx + Math.cos(angle1) * 0.92;
  const z1 = wz + Math.sin(angle1) * 0.92;
  return {
    center: new THREE.Vector3((x0 + x1) * 0.5, 0, (z0 + z1) * 0.5),
    angle: -Math.atan2(z1 - z0, x1 - x0),
  };
}

function addForestCluster(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  const count = 3 + Math.floor(hash01(tile.coord.q, tile.coord.r, 11) * 3);
  for (let index = 0; index < count; index++) {
    const anchor = offsetOnTile(tile, 20 + index, 0.4, 0.74);
    const trunkScale = 0.82 + hash01(tile.coord.q, tile.coord.r, 30 + index) * 0.32;
    const canopyScale = 0.88 + hash01(tile.coord.q, tile.coord.r, 40 + index) * 0.42;
    anchor.y = baseY(tile);

    pushFeature(groups, 'forestTrunk', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.16 * trunkScale, anchor.z),
      rotation: rotation(tile, 50 + index, 0.04),
      scale: scale3(0.88, trunkScale, 0.88),
    });
    pushFeature(groups, index % 2 === 0 ? 'forestCanopy' : 'forestCanopyLight', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.44 * canopyScale, anchor.z),
      rotation: rotation(tile, 60 + index, 0.08),
      scale: scale3(canopyScale * 1.08, canopyScale * 0.82, canopyScale),
    });
  }
}

function addMountainRidge(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  const count = 2 + Math.floor(hash01(tile.coord.q, tile.coord.r, 70) * 3);
  for (let index = 0; index < count; index++) {
    const anchor = offsetOnTile(tile, 80 + index, 0.2, 0.64);
    const s = 0.9 + hash01(tile.coord.q, tile.coord.r, 90 + index) * 0.54;
    anchor.y = baseY(tile);
    pushFeature(groups, 'mountainRidge', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.44 * s, anchor.z),
      rotation: rotation(tile, 100 + index, 0.16),
      scale: scale3(s * 0.82, s * 1.14, s),
    });
    if (index < 2) {
      pushFeature(groups, 'mountainSnowCap', {
        position: new THREE.Vector3(anchor.x, anchor.y + 0.82 * s, anchor.z),
        rotation: rotation(tile, 110 + index, 0.08),
        scale: scale3(s * 0.46, s * 0.36, s * 0.46),
      });
    }
  }
}

function addHillCluster(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  const count = 2 + Math.floor(hash01(tile.coord.q, tile.coord.r, 120) * 3);
  for (let index = 0; index < count; index++) {
    const anchor = offsetOnTile(tile, 130 + index, 0.34, 0.7);
    const s = 0.78 + hash01(tile.coord.q, tile.coord.r, 140 + index) * 0.44;
    anchor.y = baseY(tile);
    pushFeature(groups, 'hillTerrace', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.17 * s, anchor.z),
      rotation: rotation(tile, 150 + index, 0.03),
      scale: scale3(s * 1.1, s * 0.38, s * 0.64),
    });
    if (index % 2 === 0) {
      pushFeature(groups, 'hillRock', {
        position: new THREE.Vector3(anchor.x + 0.1, anchor.y + 0.28 * s, anchor.z - 0.06),
        rotation: rotation(tile, 160 + index, 0.08),
        scale: scale3(s * 0.62, s * 0.72, s * 0.56),
      });
    }
  }
}

function addSwampCluster(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  for (let index = 0; index < 3; index++) {
    const anchor = offsetOnTile(tile, 170 + index, 0.35, 0.72);
    const s = 0.74 + hash01(tile.coord.q, tile.coord.r, 180 + index) * 0.36;
    anchor.y = baseY(tile);
    pushFeature(groups, 'swampPool', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.08, anchor.z),
      rotation: rotation(tile, 190 + index),
      scale: scale3(s * 1.25, s * 0.15, s * 0.84),
    });
    pushFeature(groups, 'swampReed', {
      position: new THREE.Vector3(anchor.x + 0.12, anchor.y + 0.18 * s, anchor.z + 0.05),
      rotation: rotation(tile, 200 + index, 0.12),
      scale: scale3(s * 0.72, s, s * 0.72),
    });
  }
}

function addRuinCluster(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  for (let index = 0; index < 4; index++) {
    const anchor = offsetOnTile(tile, 210 + index, 0.28, 0.72);
    const s = 0.7 + hash01(tile.coord.q, tile.coord.r, 220 + index) * 0.5;
    anchor.y = baseY(tile);
    const key: FeatureKey = index % 2 === 0 ? 'ruinPillar' : 'ruinSlab';
    pushFeature(groups, key, {
      position: new THREE.Vector3(anchor.x, anchor.y + (key === 'ruinPillar' ? 0.23 : 0.08) * s, anchor.z),
      rotation: rotation(tile, 230 + index, key === 'ruinPillar' ? 0.12 : 0.04),
      scale: scale3(s, s * (key === 'ruinPillar' ? 1.2 : 0.72), s),
    });
  }
}

function addDesertDunes(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  const count = 2 + Math.floor(hash01(tile.coord.q, tile.coord.r, 240) * 2);
  for (let index = 0; index < count; index++) {
    const anchor = offsetOnTile(tile, 250 + index, 0.32, 0.72);
    const s = 0.86 + hash01(tile.coord.q, tile.coord.r, 260 + index) * 0.5;
    anchor.y = baseY(tile);
    pushFeature(groups, 'desertDune', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.11, anchor.z),
      rotation: rotation(tile, 270 + index, 0.02),
      scale: scale3(s * 1.45, s * 0.26, s * 0.5),
    });
  }
}

function addPlainsCluster(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile) {
  if (hash01(tile.coord.q, tile.coord.r, 345) < 0.48) return;
  const count = 1 + Math.floor(hash01(tile.coord.q, tile.coord.r, 346) * 2);
  for (let index = 0; index < count; index++) {
    const anchor = offsetOnTile(tile, 350 + index, 0.46, 0.75);
    const s = 0.64 + hash01(tile.coord.q, tile.coord.r, 360 + index) * 0.32;
    anchor.y = baseY(tile);
    pushFeature(groups, 'plainsShrub', {
      position: new THREE.Vector3(anchor.x, anchor.y + 0.13 * s, anchor.z),
      rotation: rotation(tile, 370 + index, 0.04),
      scale: scale3(s * 0.88, s * 0.74, s * 0.82),
    });
    if (index === 0 && hash01(tile.coord.q, tile.coord.r, 380) > 0.62) {
      pushFeature(groups, 'plainsStone', {
        position: new THREE.Vector3(anchor.x - 0.1, anchor.y + 0.08 * s, anchor.z + 0.08),
        rotation: rotation(tile, 390 + index, 0.05),
        scale: scale3(s * 0.62, s * 0.46, s * 0.52),
      });
    }
  }
}

function addCoastFeatures(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile, tiles: Record<string, HexTile>) {
  if (tile.terrain === 'water') return;
  for (let direction = 0; direction < 6; direction++) {
    const dir = HEX_DIRECTIONS[direction];
    const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
    if (!neighbor || neighbor.terrain !== 'water') continue;
    if (hash01(tile.coord.q, tile.coord.r, 280 + direction) < 0.38) continue;
    const edge = coastEdge(tile, direction);
    const s = 0.72 + hash01(tile.coord.q, tile.coord.r, 290 + direction) * 0.46;
    edge.center.y = baseY(tile);
    pushFeature(groups, 'coastStone', {
      position: new THREE.Vector3(edge.center.x, edge.center.y + 0.16 * s, edge.center.z),
      rotation: new THREE.Euler(0.04, edge.angle, 0.06),
      scale: scale3(s, s * 0.52, s * 0.62),
    });
    pushFeature(groups, 'coastFoam', {
      position: new THREE.Vector3(edge.center.x, edge.center.y + 0.08, edge.center.z),
      rotation: new THREE.Euler(0, edge.angle, 0),
      scale: scale3(s * 1.2, s * 0.08, s * 0.22),
    });
  }
}

function addResourceSupport(groups: Map<FeatureKey, FeatureInstance[]>, tile: HexTile, occupied: boolean) {
  if (!tile.resource || occupied) return;
  if (hash01(tile.coord.q, tile.coord.r, 310) < 0.32) return;
  const [wx, , wz] = hexToWorld(tile.coord);
  const angle = Math.PI / 2 + hash01(tile.coord.q, tile.coord.r, 320) * 0.7;
  const radius = 0.64;
  const s = 0.66 + hash01(tile.coord.q, tile.coord.r, 330) * 0.28;
  pushFeature(groups, 'resourceSupport', {
    position: new THREE.Vector3(
      wx + Math.cos(angle) * radius,
      baseY(tile) + 0.14 * s,
      wz + Math.sin(angle) * radius,
    ),
    rotation: rotation(tile, 340, 0.04),
    scale: scale3(s * 0.9, s, s * 0.9),
  });
}

function buildFeatureGroups(
  tiles: Record<string, HexTile>,
  knownHexes: Set<string> | null,
  occupiedHexes: Set<string>,
): Map<FeatureKey, FeatureInstance[]> {
  const groups = new Map<FeatureKey, FeatureInstance[]>();
  for (const tile of Object.values(tiles)) {
    const key = hexKey(tile.coord.q, tile.coord.r);
    if (knownHexes && !knownHexes.has(key)) continue;
    const occupied = occupiedHexes.has(key);

    switch (tile.terrain) {
      case 'forest':
        addForestCluster(groups, tile);
        break;
      case 'mountain':
        addMountainRidge(groups, tile);
        break;
      case 'hills':
        addHillCluster(groups, tile);
        break;
      case 'swamp':
        addSwampCluster(groups, tile);
        break;
      case 'ruins':
        addRuinCluster(groups, tile);
        break;
      case 'desert':
        addDesertDunes(groups, tile);
        break;
      case 'plains':
        addPlainsCluster(groups, tile);
        break;
      default:
        break;
    }

    addCoastFeatures(groups, tile, tiles);
    addResourceSupport(groups, tile, occupied);
  }
  return groups;
}

function buildFeatureDefs(): Record<FeatureKey, FeatureDef> {
  return {
    forestTrunk: {
      geometry: new THREE.CylinderGeometry(0.055, 0.075, 0.34, 5),
      color: '#4b3423',
    },
    forestCanopy: {
      geometry: new THREE.DodecahedronGeometry(0.27, 0),
      color: '#123b24',
    },
    forestCanopyLight: {
      geometry: new THREE.IcosahedronGeometry(0.24, 0),
      color: '#2f6f3f',
    },
    mountainRidge: {
      geometry: new THREE.ConeGeometry(0.34, 0.98, 5),
      color: '#636a72',
    },
    mountainSnowCap: {
      geometry: new THREE.ConeGeometry(0.22, 0.26, 5),
      color: '#e7eee9',
      roughness: 0.62,
    },
    hillTerrace: {
      geometry: new THREE.BoxGeometry(0.46, 0.22, 0.28),
      color: '#9e8c58',
    },
    hillRock: {
      geometry: new THREE.DodecahedronGeometry(0.18, 0),
      color: '#6f6856',
    },
    swampPool: {
      geometry: new THREE.CylinderGeometry(0.24, 0.28, 0.045, 14),
      color: '#173d39',
      opacity: 0.74,
      renderOrder: 9,
    },
    swampReed: {
      geometry: new THREE.ConeGeometry(0.055, 0.36, 4),
      color: '#8a9a4b',
    },
    ruinPillar: {
      geometry: new THREE.CylinderGeometry(0.07, 0.08, 0.42, 6),
      color: '#9c9485',
    },
    ruinSlab: {
      geometry: new THREE.BoxGeometry(0.26, 0.11, 0.16),
      color: '#706a60',
    },
    desertDune: {
      geometry: new THREE.BoxGeometry(0.5, 0.14, 0.12),
      color: '#d8b46c',
      roughness: 0.96,
    },
    coastStone: {
      geometry: new THREE.DodecahedronGeometry(0.16, 0),
      color: '#6b6659',
    },
    coastFoam: {
      geometry: new THREE.BoxGeometry(0.42, 0.035, 0.1),
      color: '#bbefe2',
      opacity: 0.45,
      roughness: 0.7,
      renderOrder: 10,
    },
    resourceSupport: {
      geometry: new THREE.BoxGeometry(0.16, 0.18, 0.16),
      color: '#8b7655',
    },
    plainsShrub: {
      geometry: new THREE.DodecahedronGeometry(0.12, 0),
      color: '#6f8f45',
      roughness: 0.92,
    },
    plainsStone: {
      geometry: new THREE.DodecahedronGeometry(0.1, 0),
      color: '#8c835f',
      roughness: 0.9,
    },
  };
}

function TerrainFeatureMesh({
  def,
  instances,
}: {
  def: FeatureDef;
  instances: FeatureInstance[];
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
    <instancedMesh
      ref={meshRef}
      args={[def.geometry, undefined, instances.length]}
      castShadow
      receiveShadow
      renderOrder={def.renderOrder ?? 6}
    >
      <meshStandardMaterial
        color={def.color}
        roughness={def.roughness ?? 0.86}
        metalness={def.metalness ?? 0.04}
        flatShading
        transparent={def.opacity !== undefined}
        opacity={def.opacity ?? 1}
        depthWrite={def.opacity === undefined}
      />
    </instancedMesh>
  );
}

export function TerrainFeatureLayer() {
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

  const featureDefs = useMemo(() => buildFeatureDefs(), []);
  const featureGroups = useMemo(() => {
    if (!gameState) return new Map<FeatureKey, FeatureInstance[]>();
    return buildFeatureGroups(gameState.map.tiles, knownHexes, occupiedHexes);
  }, [gameState, knownHexes, occupiedHexes]);

  if (!gameState || featureGroups.size === 0) return null;

  return (
    <group>
      {Object.entries(featureDefs).map(([key, def]) => (
        <TerrainFeatureMesh
          key={key}
          def={def}
          instances={featureGroups.get(key as FeatureKey) ?? []}
        />
      ))}
    </group>
  );
}

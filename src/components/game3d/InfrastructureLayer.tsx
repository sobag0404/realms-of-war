'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS, type HexCoord } from '@/engine/core/types';
import type { GameState, HexTile } from '@/engine/core/GameState';
import { useGameStore } from '@/store/useGameStore';
import { coordKey, detailHash, terrainY as terrainBaseY, tileKey } from './worldDetailLayout';

type InfrastructureDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  renderOrder?: number;
};

type InfrastructureInstance = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color?: THREE.Color;
};

type InfrastructureBatch = {
  key: string;
  def: InfrastructureDef;
  instances: InfrastructureInstance[];
};

const DIRECTIONS = [0, 1, 2, 3, 4, 5] as const;
const IMPROVEMENT_TYPES = ['farm', 'mine', 'lumber_mill', 'quarry_improvement', 'mana_focus'] as const;
const INFRASTRUCTURE_DEFS = {
  'road-center-shadow': {
    geometry: new THREE.CylinderGeometry(0.26, 0.31, 0.018, 12),
    color: '#2c2419',
    roughness: 0.96,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    renderOrder: 8,
  },
  'road-center-top': {
    geometry: new THREE.CylinderGeometry(0.21, 0.25, 0.014, 12),
    color: '#927852',
    roughness: 0.9,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    renderOrder: 9,
  },
  'road-segment-shadow': {
    geometry: new THREE.BoxGeometry(0.2, 0.016, 0.76),
    color: '#2c2419',
    roughness: 0.96,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    renderOrder: 8,
  },
  'road-segment-top': {
    geometry: new THREE.BoxGeometry(0.14, 0.012, 0.72),
    color: '#a4895d',
    roughness: 0.9,
    transparent: true,
    opacity: 0.97,
    depthWrite: false,
    renderOrder: 9,
  },
  'road-spur-shadow': {
    geometry: new THREE.BoxGeometry(0.18, 0.014, 0.48),
    color: '#211b13',
    roughness: 0.96,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    renderOrder: 8,
  },
  'road-spur-top': {
    geometry: new THREE.BoxGeometry(0.11, 0.01, 0.42),
    color: '#b69a6a',
    roughness: 0.9,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    renderOrder: 9,
  },
  'improvement-ground': {
    geometry: new THREE.CylinderGeometry(0.36, 0.43, 0.018, 6),
    color: '#1a140e',
    roughness: 0.98,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    renderOrder: 7,
  },
  'owner-marker-stone': {
    geometry: new THREE.BoxGeometry(0.08, 0.075, 0.08),
    color: '#e3cf9b',
    roughness: 0.82,
  },
  'owner-marker-cloth': {
    geometry: new THREE.ConeGeometry(0.08, 0.14, 3),
    color: '#ffffff',
    roughness: 0.62,
    metalness: 0.04,
  },
  'fort-ring': {
    geometry: new THREE.TorusGeometry(0.34, 0.035, 6, 24),
    color: '#3b2b22',
    roughness: 0.82,
  },
  'fort-tower': {
    geometry: new THREE.BoxGeometry(0.16, 0.24, 0.16),
    color: '#8d7457',
    roughness: 0.78,
  },
  'rift-base': {
    geometry: new THREE.CylinderGeometry(0.24, 0.28, 0.05, 16),
    color: '#191426',
    roughness: 0.7,
    metalness: 0.08,
  },
  'rift-arc': {
    geometry: new THREE.TorusGeometry(0.19, 0.021, 8, 24),
    color: '#9c66ff',
    emissive: '#5d33ca',
    emissiveIntensity: 0.38,
    roughness: 0.45,
  },
  'farm-strip': {
    geometry: new THREE.BoxGeometry(0.055, 0.018, 0.42),
    color: '#d6b866',
    roughness: 0.93,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    renderOrder: 10,
  },
  'mine-mouth': {
    geometry: new THREE.ConeGeometry(0.18, 0.24, 5),
    color: '#3d3b39',
    roughness: 0.88,
  },
  'mine-post': {
    geometry: new THREE.BoxGeometry(0.08, 0.18, 0.08),
    color: '#8b673d',
    roughness: 0.82,
  },
  'lumber-log-dark': {
    geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8),
    color: '#7a4d2d',
    roughness: 0.9,
  },
  'lumber-log-light': {
    geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8),
    color: '#a46a3d',
    roughness: 0.9,
  },
  'quarry-stone': {
    geometry: new THREE.DodecahedronGeometry(0.16, 0),
    color: '#a49d8e',
    roughness: 0.86,
  },
  'quarry-cut': {
    geometry: new THREE.BoxGeometry(0.26, 0.055, 0.12),
    color: '#c8bda7',
    roughness: 0.82,
  },
  'mana-base': {
    geometry: new THREE.CylinderGeometry(0.15, 0.18, 0.04, 12),
    color: '#211a36',
    roughness: 0.7,
  },
  'mana-crystal': {
    geometry: new THREE.OctahedronGeometry(0.13),
    color: '#9b7dff',
    emissive: '#5c3de0',
    emissiveIntensity: 0.34,
    roughness: 0.42,
  },
} satisfies Record<string, InfrastructureDef>;

function hash01(q: number, r: number, salt: number): number {
  return detailHash(q, r, salt);
}

function terrainY(tile: HexTile): number {
  return terrainBaseY(tile);
}

function neighborCoord(coord: HexCoord, direction: number): HexCoord {
  const delta = HEX_DIRECTIONS[direction];
  return { q: coord.q + delta.q, r: coord.r + delta.r };
}

function directionVector(tile: HexTile, direction: number): THREE.Vector3 {
  const [x, , z] = hexToWorld(tile.coord);
  const neighbor = neighborCoord(tile.coord, direction);
  const [nx, , nz] = hexToWorld(neighbor);
  return new THREE.Vector3(nx - x, 0, nz - z).normalize();
}

function visibleInfrastructureTiles(gameState: GameState, activePlayerId: string, showFog: boolean): HexTile[] {
  const player = gameState.players[activePlayerId];
  const known = showFog && player && (player.visibleHexes.length > 0 || player.exploredHexes.length > 0)
    ? new Set([...player.visibleHexes, ...player.exploredHexes])
    : null;

  return Object.values(gameState.map.tiles).filter((tile) => (
    tile.terrain !== 'water' &&
    (!known || known.has(tileKey(tile)))
  ));
}

function isWorldDetailTarget(tile: HexTile, cityKeys: Set<string>): boolean {
  return (
    cityKeys.has(tileKey(tile)) ||
    tile.hasFort ||
    tile.hasRiftPortal ||
    Boolean(tile.resource) ||
    Boolean(tile.improvement && tile.improvement !== 'road')
  );
}

function buildRoadBatches(
  tiles: HexTile[],
  tileMap: Record<string, HexTile>,
  cityKeys: Set<string>,
): InfrastructureBatch[] {
  const roadTiles = tiles.filter((tile) => tile.hasRoad || tile.improvement === 'road');
  const roadKeys = new Set(roadTiles.map(tileKey));
  const visibleKeys = new Set(tiles.map(tileKey));
  const centerShadow: InfrastructureInstance[] = [];
  const centerTop: InfrastructureInstance[] = [];
  const segmentShadow: InfrastructureInstance[] = [];
  const segmentTop: InfrastructureInstance[] = [];
  const spurShadow: InfrastructureInstance[] = [];
  const spurTop: InfrastructureInstance[] = [];

  for (const tile of roadTiles) {
    const [wx, , wz] = hexToWorld(tile.coord);
    const y = Math.max(0.035, terrainY(tile) + 0.052);
    const turn = hash01(tile.coord.q, tile.coord.r, 19) * Math.PI * 2;

    centerShadow.push({
      position: new THREE.Vector3(wx, y, wz),
      rotation: new THREE.Euler(0, turn, 0),
      scale: new THREE.Vector3(1.12, 1, 0.82),
    });
    centerTop.push({
      position: new THREE.Vector3(wx, y + 0.006, wz),
      rotation: new THREE.Euler(0, turn, 0),
      scale: new THREE.Vector3(0.92, 1, 0.64),
    });

    const connected = DIRECTIONS.filter((direction) => {
      const neighbor = tileMap[coordKey(neighborCoord(tile.coord, direction))];
      return neighbor && neighbor.terrain !== 'water' && roadKeys.has(tileKey(neighbor));
    });
    const targetDirections = DIRECTIONS.filter((direction) => {
      const neighbor = tileMap[coordKey(neighborCoord(tile.coord, direction))];
      return (
        neighbor &&
        neighbor.terrain !== 'water' &&
        visibleKeys.has(tileKey(neighbor)) &&
        !roadKeys.has(tileKey(neighbor)) &&
        isWorldDetailTarget(neighbor, cityKeys)
      );
    }).slice(0, 2);
    const fallbackDirection = Math.floor(hash01(tile.coord.q, tile.coord.r, 31) * 6);
    const visualDirections = connected.length > 0 ? connected : [fallbackDirection, (fallbackDirection + 3) % 6];

    for (const direction of visualDirections) {
      const vector = directionVector(tile, direction);
      const rotation = new THREE.Euler(0, Math.atan2(vector.x, vector.z), 0);
      const base = new THREE.Vector3(wx, y + 0.004, wz).addScaledVector(vector, 0.32);
      const lengthScale = connected.length > 0 ? 1 : 0.58;

      segmentShadow.push({
        position: base,
        rotation,
        scale: new THREE.Vector3(1.18, 1, lengthScale),
      });
      segmentTop.push({
        position: new THREE.Vector3(base.x, base.y + 0.006, base.z),
        rotation,
        scale: new THREE.Vector3(0.82, 1, lengthScale * 0.92),
      });
    }

    for (const direction of targetDirections) {
      const vector = directionVector(tile, direction);
      const rotation = new THREE.Euler(0, Math.atan2(vector.x, vector.z), 0);
      const base = new THREE.Vector3(wx, y + 0.01, wz).addScaledVector(vector, 0.28);

      spurShadow.push({
        position: base,
        rotation,
        scale: new THREE.Vector3(1.08, 1, 0.86),
      });
      spurTop.push({
        position: new THREE.Vector3(base.x, base.y + 0.006, base.z),
        rotation,
        scale: new THREE.Vector3(0.9, 1, 0.82),
      });
    }
  }

  return [
    {
      key: 'road-center-shadow',
      def: INFRASTRUCTURE_DEFS['road-center-shadow'],
      instances: centerShadow,
    },
    {
      key: 'road-center-top',
      def: INFRASTRUCTURE_DEFS['road-center-top'],
      instances: centerTop,
    },
    {
      key: 'road-segment-shadow',
      def: INFRASTRUCTURE_DEFS['road-segment-shadow'],
      instances: segmentShadow,
    },
    {
      key: 'road-segment-top',
      def: INFRASTRUCTURE_DEFS['road-segment-top'],
      instances: segmentTop,
    },
    {
      key: 'road-spur-shadow',
      def: INFRASTRUCTURE_DEFS['road-spur-shadow'],
      instances: spurShadow,
    },
    {
      key: 'road-spur-top',
      def: INFRASTRUCTURE_DEFS['road-spur-top'],
      instances: spurTop,
    },
  ];
}

function pushBatch(
  batches: Map<string, InfrastructureBatch>,
  key: string,
  def: InfrastructureDef,
  instance: InfrastructureInstance,
): void {
  const batch = batches.get(key);
  if (batch) {
    batch.instances.push(instance);
  } else {
    batches.set(key, { key, def, instances: [instance] });
  }
}

function improvementAnchor(tile: HexTile, salt: number, radius = 0.32): THREE.Vector3 {
  const [wx, , wz] = hexToWorld(tile.coord);
  const angle = Math.PI * 0.25 + hash01(tile.coord.q, tile.coord.r, salt) * Math.PI * 2;
  return new THREE.Vector3(
    wx + Math.cos(angle) * radius,
    Math.max(0.04, terrainY(tile) + 0.18),
    wz + Math.sin(angle) * radius,
  );
}

function ownerColorForTile(tile: HexTile, gameState: GameState): THREE.Color | undefined {
  if (tile.riftPortalOwner && gameState.players[tile.riftPortalOwner]) {
    return new THREE.Color(gameState.players[tile.riftPortalOwner].color);
  }
  if (!tile.owningCityId) return undefined;
  const city = gameState.cities[tile.owningCityId];
  if (!city) return undefined;
  const player = gameState.players[city.ownerId];
  return player ? new THREE.Color(player.color) : undefined;
}

function pushGroundAndOwner(
  batches: Map<string, InfrastructureBatch>,
  tile: HexTile,
  gameState: GameState,
): void {
  const [wx, , wz] = hexToWorld(tile.coord);
  const y = Math.max(0.04, terrainY(tile) + 0.12);
  const turn = hash01(tile.coord.q, tile.coord.r, 47) * Math.PI * 2;
  pushBatch(batches, 'improvement-ground', INFRASTRUCTURE_DEFS['improvement-ground'], {
    position: new THREE.Vector3(wx, y, wz),
    rotation: new THREE.Euler(0, turn, 0),
    scale: new THREE.Vector3(1, 1, 0.72),
  });

  const ownerColor = ownerColorForTile(tile, gameState);
  if (!ownerColor) return;

  const anchor = improvementAnchor(tile, 83, 0.52);
  pushBatch(batches, 'owner-marker-stone', INFRASTRUCTURE_DEFS['owner-marker-stone'], {
    position: new THREE.Vector3(anchor.x, anchor.y - 0.02, anchor.z),
    rotation: new THREE.Euler(0, turn, 0),
    scale: new THREE.Vector3(0.78, 1, 0.78),
  });
  pushBatch(batches, 'owner-marker-cloth', INFRASTRUCTURE_DEFS['owner-marker-cloth'], {
    position: new THREE.Vector3(anchor.x, anchor.y + 0.08, anchor.z),
    rotation: new THREE.Euler(0, turn + 0.3, 0.18),
    scale: new THREE.Vector3(0.9, 0.82, 0.9),
    color: ownerColor,
  });
}

function buildImprovementBatches(tiles: HexTile[], gameState: GameState): InfrastructureBatch[] {
  const batches = new Map<string, InfrastructureBatch>();

  for (const tile of tiles) {
    const turn = hash01(tile.coord.q, tile.coord.r, 41) * Math.PI * 2;
    pushGroundAndOwner(batches, tile, gameState);

    if (tile.hasFort) {
      const [wx, , wz] = hexToWorld(tile.coord);
      const y = Math.max(0.05, terrainY(tile) + 0.24);
      pushBatch(batches, 'fort-ring', INFRASTRUCTURE_DEFS['fort-ring'], {
        position: new THREE.Vector3(wx, y, wz),
        rotation: new THREE.Euler(Math.PI / 2, 0, turn),
        scale: new THREE.Vector3(1, 1, 1),
      });
      pushBatch(batches, 'fort-tower', INFRASTRUCTURE_DEFS['fort-tower'], {
        position: new THREE.Vector3(wx, y + 0.11, wz),
        rotation: new THREE.Euler(0, turn, 0),
        scale: new THREE.Vector3(1, 1, 1),
      });
    }

    if (tile.hasRiftPortal) {
      const [wx, , wz] = hexToWorld(tile.coord);
      const y = Math.max(0.06, terrainY(tile) + 0.24);
      const ownerColor = tile.riftPortalOwner ? gameState.players[tile.riftPortalOwner]?.color : undefined;
      pushBatch(batches, 'rift-base', INFRASTRUCTURE_DEFS['rift-base'], {
        position: new THREE.Vector3(wx, y, wz),
        rotation: new THREE.Euler(0, turn, 0),
        scale: new THREE.Vector3(1, 1, 1),
      });
      pushBatch(batches, 'rift-arc', INFRASTRUCTURE_DEFS['rift-arc'], {
        position: new THREE.Vector3(wx, y + 0.24, wz),
        rotation: new THREE.Euler(0, turn, 0),
        scale: new THREE.Vector3(1, 1, 1),
        color: ownerColor ? new THREE.Color(ownerColor) : undefined,
      });
    }

    switch (tile.improvement) {
      case 'farm': {
        const position = improvementAnchor(tile, 53, 0.26);
        for (let strip = -1; strip <= 1; strip++) {
          pushBatch(batches, 'farm-strip', INFRASTRUCTURE_DEFS['farm-strip'], {
            position: new THREE.Vector3(position.x + strip * 0.08, position.y, position.z),
            rotation: new THREE.Euler(0, turn, 0),
            scale: new THREE.Vector3(1, 1, 1),
          });
        }
        break;
      }
      case 'mine': {
        const position = improvementAnchor(tile, 59);
        pushBatch(batches, 'mine-mouth', INFRASTRUCTURE_DEFS['mine-mouth'], {
          position: new THREE.Vector3(position.x, position.y + 0.05, position.z),
          rotation: new THREE.Euler(0, turn, Math.PI),
          scale: new THREE.Vector3(1, 0.75, 1),
        });
        pushBatch(batches, 'mine-post', INFRASTRUCTURE_DEFS['mine-post'], {
          position: new THREE.Vector3(position.x, position.y + 0.08, position.z),
          rotation: new THREE.Euler(0, turn, 0),
          scale: new THREE.Vector3(1, 1, 1),
        });
        break;
      }
      case 'lumber_mill': {
        const position = improvementAnchor(tile, 61, 0.36);
        for (let log = 0; log < 2; log++) {
          const key = log === 0 ? 'lumber-log-dark' : 'lumber-log-light';
          pushBatch(batches, key, INFRASTRUCTURE_DEFS[key], {
            position: new THREE.Vector3(position.x, position.y + log * 0.052, position.z + (log - 0.5) * 0.07),
            rotation: new THREE.Euler(Math.PI / 2, 0, turn),
            scale: new THREE.Vector3(1, 1, 1),
          });
        }
        break;
      }
      case 'quarry_improvement': {
        const position = improvementAnchor(tile, 67, 0.3);
        pushBatch(batches, 'quarry-stone', INFRASTRUCTURE_DEFS['quarry-stone'], {
          position: new THREE.Vector3(position.x, position.y + 0.04, position.z),
          rotation: new THREE.Euler(0, turn, 0.2),
          scale: new THREE.Vector3(1, 0.68, 1),
        });
        pushBatch(batches, 'quarry-cut', INFRASTRUCTURE_DEFS['quarry-cut'], {
          position: new THREE.Vector3(position.x + 0.11, position.y + 0.05, position.z - 0.08),
          rotation: new THREE.Euler(0, turn + 0.4, 0),
          scale: new THREE.Vector3(1, 1, 1),
        });
        break;
      }
      case 'mana_focus': {
        const position = improvementAnchor(tile, 71, 0.28);
        pushBatch(batches, 'mana-base', INFRASTRUCTURE_DEFS['mana-base'], {
          position,
          rotation: new THREE.Euler(0, turn, 0),
          scale: new THREE.Vector3(1, 1, 1),
        });
        pushBatch(batches, 'mana-crystal', INFRASTRUCTURE_DEFS['mana-crystal'], {
          position: new THREE.Vector3(position.x, position.y + 0.18, position.z),
          rotation: new THREE.Euler(0.3, turn, 0.2),
          scale: new THREE.Vector3(1, 1.2, 1),
        });
        break;
      }
      default:
        break;
    }
  }

  return [...batches.values()];
}

function InfrastructureMesh({ def, instances }: { def: InfrastructureDef; instances: InfrastructureInstance[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const baseColor = new THREE.Color(def.color);
    for (let index = 0; index < instances.length; index++) {
      const instance = instances[index];
      dummy.position.copy(instance.position);
      dummy.rotation.copy(instance.rotation);
      dummy.scale.copy(instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, instance.color ?? baseColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [def.color, instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[def.geometry, undefined, instances.length]} castShadow receiveShadow renderOrder={def.renderOrder ?? 0}>
      <meshStandardMaterial
        color="#ffffff"
        emissive={def.emissive ?? '#000000'}
        emissiveIntensity={def.emissiveIntensity ?? 0}
        roughness={def.roughness ?? 0.82}
        metalness={def.metalness ?? 0.04}
        transparent={def.transparent ?? false}
        opacity={def.opacity ?? 1}
        depthWrite={def.depthWrite ?? true}
        depthTest={def.depthTest ?? true}
        vertexColors
        flatShading
      />
    </instancedMesh>
  );
}

export function InfrastructureLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const batches = useMemo(() => {
    if (!gameState) return [];
    const tiles = visibleInfrastructureTiles(gameState, activePlayerId, showFog);
    const improvementTiles = tiles.filter((tile) => (
      tile.hasFort ||
      tile.hasRiftPortal ||
      (tile.improvement !== null && IMPROVEMENT_TYPES.includes(tile.improvement as typeof IMPROVEMENT_TYPES[number]))
    ));

    return [
      ...buildRoadBatches(
        tiles,
        gameState.map.tiles,
        new Set(Object.values(gameState.cities).map((city) => coordKey(city.hex))),
      ),
      ...buildImprovementBatches(improvementTiles, gameState),
    ].filter((batch) => batch.instances.length > 0);
  }, [activePlayerId, gameState, showFog]);

  if (!gameState || batches.length === 0) return null;

  return (
    <group>
      {batches.map((batch) => (
        <InfrastructureMesh key={batch.key} def={batch.def} instances={batch.instances} />
      ))}
    </group>
  );
}

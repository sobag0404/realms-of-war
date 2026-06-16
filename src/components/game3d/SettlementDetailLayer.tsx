'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { CityState, GameState } from '@/engine/core/GameState';
import { useGameStore } from '@/store/useGameStore';
import { detailHash, terrainY } from './worldDetailLayout';

type DetailDef = {
  geometry: THREE.BufferGeometry;
  color: string;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  renderOrder?: number;
};

type DetailInstance = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color?: THREE.Color;
};

type DetailBatch = {
  key: string;
  def: DetailDef;
  instances: DetailInstance[];
};

const DETAIL_DEFS = {
  'settlement-footprint': {
    geometry: new THREE.CylinderGeometry(0.25, 0.32, 0.02, 6),
    color: '#1b1510',
    roughness: 0.98,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    renderOrder: 11,
  },
  'settlement-annex': {
    geometry: new THREE.BoxGeometry(0.24, 0.16, 0.18),
    color: '#8f7b5d',
    roughness: 0.88,
    metalness: 0.02,
  },
  'settlement-roof': {
    geometry: new THREE.ConeGeometry(0.17, 0.13, 4),
    color: '#7c4f38',
    roughness: 0.78,
    metalness: 0.03,
  },
  'settlement-supply': {
    geometry: new THREE.BoxGeometry(0.14, 0.09, 0.12),
    color: '#b09a6f',
    roughness: 0.84,
    metalness: 0.03,
  },
  'settlement-gate-post': {
    geometry: new THREE.BoxGeometry(0.055, 0.19, 0.055),
    color: '#5c4634',
    roughness: 0.86,
  },
  'settlement-owner-pennant': {
    geometry: new THREE.ConeGeometry(0.085, 0.15, 3),
    color: '#ffffff',
    roughness: 0.62,
    metalness: 0.04,
  },
} satisfies Record<string, DetailDef>;

function pushBatch(
  batches: Map<string, DetailBatch>,
  key: keyof typeof DETAIL_DEFS,
  instance: DetailInstance,
): void {
  const batch = batches.get(key);
  if (batch) {
    batch.instances.push(instance);
  } else {
    batches.set(key, { key, def: DETAIL_DEFS[key], instances: [instance] });
  }
}

function cityTerrainY(city: CityState, gameState: GameState): number {
  const tile = gameState.map.tiles[`${city.hex.q},${city.hex.r}`];
  return tile ? terrainY(tile) : 0;
}

function detailPoint(city: CityState, index: number, radius: number, y: number): { position: THREE.Vector3; angle: number } {
  const [wx, , wz] = hexToWorld(city.hex);
  const angle = detailHash(city.hex.q, city.hex.r, 97 + index * 17) * Math.PI * 2;
  const wobble = (detailHash(city.hex.q, city.hex.r, 211 + index) - 0.5) * 0.08;
  const finalRadius = radius + wobble;
  return {
    position: new THREE.Vector3(
      wx + Math.cos(angle) * finalRadius,
      y,
      wz + Math.sin(angle) * finalRadius,
    ),
    angle,
  };
}

function buildCityDetailBatches(gameState: GameState): DetailBatch[] {
  const batches = new Map<string, DetailBatch>();

  for (const city of Object.values(gameState.cities)) {
    const owner = gameState.players[city.ownerId];
    const ownerColor = new THREE.Color(owner?.color ?? '#ffffff');
    const mutedOwner = ownerColor.clone().lerp(new THREE.Color('#d5c18b'), 0.45);
    const baseY = cityTerrainY(city, gameState);
    const annexCount = Math.min(6, 3 + city.level + Math.floor(city.buildings.length / 2));

    for (let index = 0; index < annexCount; index++) {
      const radius = 0.98 + (index % 3) * 0.08;
      const { position, angle } = detailPoint(city, index, radius, baseY + 0.22);
      const turn = angle + Math.PI / 2;
      const scaleJitter = 0.88 + detailHash(city.hex.q, city.hex.r, 301 + index) * 0.22;

      pushBatch(batches, 'settlement-footprint', {
        position: new THREE.Vector3(position.x, baseY + 0.145, position.z),
        rotation: new THREE.Euler(0, turn, 0),
        scale: new THREE.Vector3(0.9, 1, 0.64),
      });
      pushBatch(batches, 'settlement-annex', {
        position: new THREE.Vector3(position.x, position.y + 0.075, position.z),
        rotation: new THREE.Euler(0, turn, 0),
        scale: new THREE.Vector3(scaleJitter * 1.08, 0.92 + city.level * 0.04, 0.94),
        color: mutedOwner,
      });
      pushBatch(batches, 'settlement-roof', {
        position: new THREE.Vector3(position.x, position.y + 0.19, position.z),
        rotation: new THREE.Euler(0, turn + 0.78, 0),
        scale: new THREE.Vector3(0.9, 0.74, 0.9),
      });

      if (index % 2 === 0) {
        const supply = detailPoint(city, index + 9, radius + 0.08, baseY + 0.23);
        pushBatch(batches, 'settlement-supply', {
          position: new THREE.Vector3(supply.position.x, supply.position.y + 0.045, supply.position.z),
          rotation: new THREE.Euler(0, supply.angle, 0),
          scale: new THREE.Vector3(0.82, 0.78, 0.82),
        });
      }
    }

    if (city.wallHp > 0 || city.level >= 2) {
      const gate = detailPoint(city, 23, 1.12, baseY + 0.22);
      const side = new THREE.Vector3(Math.cos(gate.angle + Math.PI / 2), 0, Math.sin(gate.angle + Math.PI / 2));
      for (const offset of [-0.06, 0.06]) {
        pushBatch(batches, 'settlement-gate-post', {
          position: new THREE.Vector3(
            gate.position.x + side.x * offset,
            gate.position.y + 0.08,
            gate.position.z + side.z * offset,
          ),
          rotation: new THREE.Euler(0, gate.angle, 0),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    }

    const pennant = detailPoint(city, 31, 1.08, baseY + 0.38);
    pushBatch(batches, 'settlement-owner-pennant', {
      position: new THREE.Vector3(pennant.position.x, pennant.position.y + 0.1, pennant.position.z),
      rotation: new THREE.Euler(0, pennant.angle + 0.35, 0.14),
      scale: new THREE.Vector3(0.9, 0.86, 0.9),
      color: ownerColor,
    });
  }

  return [...batches.values()].filter((batch) => batch.instances.length > 0);
}

function SettlementDetailMesh({ def, instances }: { def: DetailDef; instances: DetailInstance[] }) {
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
        roughness={def.roughness ?? 0.82}
        metalness={def.metalness ?? 0.04}
        transparent={def.transparent ?? false}
        opacity={def.opacity ?? 1}
        depthWrite={def.depthWrite ?? true}
        vertexColors
        flatShading
      />
    </instancedMesh>
  );
}

export function SettlementDetailLayer() {
  const gameState = useGameStore((s) => s.gameState);

  const batches = useMemo(() => {
    if (!gameState) return [];
    return buildCityDetailBatches(gameState);
  }, [gameState]);

  if (!gameState || batches.length === 0) return null;

  return (
    <group>
      {batches.map((batch) => (
        <SettlementDetailMesh key={batch.key} def={batch.def} instances={batch.instances} />
      ))}
    </group>
  );
}

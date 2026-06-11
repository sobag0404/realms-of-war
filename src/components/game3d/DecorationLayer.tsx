'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION, TERRAIN_TYPES } from '@/data/terrain';
import type { TerrainTypeId } from '@/engine/core/types';
import type { HexTile } from '@/engine/core/GameState';

// ─── Seeded random for deterministic decoration placement ─────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Decoration definitions per terrain type ──────────────────────────────────

interface DecorationDef {
  geometry: THREE.BufferGeometry;
  color: string;
  yOffset: number;
  scaleRange: [number, number];
}

function getDecorationDefs(terrain: TerrainTypeId): DecorationDef[] {
  switch (terrain) {
    case 'forest':
      return [
        {
          geometry: new THREE.ConeGeometry(0.12, 0.4, 6),
          color: '#1a5c2a',
          yOffset: 0.2,
          scaleRange: [0.8, 1.3],
        },
        {
          geometry: new THREE.ConeGeometry(0.08, 0.25, 6),
          color: '#2d8a4e',
          yOffset: 0.12,
          scaleRange: [0.6, 1.0],
        },
        {
          // Tree trunk
          geometry: new THREE.CylinderGeometry(0.03, 0.04, 0.15, 5),
          color: '#5c3a1e',
          yOffset: 0.07,
          scaleRange: [0.8, 1.2],
        },
      ];
    case 'mountain':
      return [
        {
          geometry: new THREE.DodecahedronGeometry(0.15, 0),
          color: '#6b6e73',
          yOffset: 0.1,
          scaleRange: [0.7, 1.4],
        },
        {
          geometry: new THREE.DodecahedronGeometry(0.08, 0),
          color: '#8a8d92',
          yOffset: 0.06,
          scaleRange: [0.5, 1.0],
        },
      ];
    case 'desert':
      return [
        {
          // Cactus body
          geometry: new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6),
          color: '#3a6b35',
          yOffset: 0.15,
          scaleRange: [0.7, 1.3],
        },
        {
          // Small cactus arm
          geometry: new THREE.CylinderGeometry(0.025, 0.03, 0.12, 5),
          color: '#4a8b45',
          yOffset: 0.06,
          scaleRange: [0.6, 1.0],
        },
      ];
    case 'swamp':
      return [
        {
          // Mushroom cap
          geometry: new THREE.SphereGeometry(0.07, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
          color: '#5a4a3a',
          yOffset: 0.08,
          scaleRange: [0.7, 1.2],
        },
        {
          // Mushroom stem
          geometry: new THREE.CylinderGeometry(0.02, 0.025, 0.08, 5),
          color: '#8a7a6a',
          yOffset: 0.04,
          scaleRange: [0.8, 1.1],
        },
      ];
    case 'plains':
      return [
        {
          // Grass tuft
          geometry: new THREE.ConeGeometry(0.04, 0.12, 4),
          color: '#8bc34a',
          yOffset: 0.06,
          scaleRange: [0.6, 1.2],
        },
        {
          geometry: new THREE.ConeGeometry(0.03, 0.08, 4),
          color: '#a4d65e',
          yOffset: 0.04,
          scaleRange: [0.5, 0.9],
        },
      ];
    case 'ruins':
      return [
        {
          // Broken pillar
          geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.35, 6),
          color: '#8a8478',
          yOffset: 0.17,
          scaleRange: [0.6, 1.3],
        },
        {
          // Rubble
          geometry: new THREE.BoxGeometry(0.1, 0.06, 0.1),
          color: '#6e6960',
          yOffset: 0.03,
          scaleRange: [0.5, 1.0],
        },
      ];
    case 'hills':
      return [
        {
          // Small rock
          geometry: new THREE.DodecahedronGeometry(0.08, 0),
          color: '#7a7462',
          yOffset: 0.05,
          scaleRange: [0.6, 1.2],
        },
        {
          // Grass patch
          geometry: new THREE.ConeGeometry(0.035, 0.1, 4),
          color: '#7fa34e',
          yOffset: 0.05,
          scaleRange: [0.6, 1.0],
        },
      ];
    case 'water':
    default:
      return [];
  }
}

// ─── Instanced decoration group per terrain type ──────────────────────────────

interface DecoInstanceData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: THREE.Color;
}

function DecorationInstances({
  terrain,
  tiles,
}: {
  terrain: TerrainTypeId;
  tiles: HexTile[];
}) {
  const defs = useMemo(() => getDecorationDefs(terrain), [terrain]);

  // For each decoration definition, compute instance data from tiles
  const instanceGroups = useMemo(() => {
    return defs.map((def) => {
      const instances: DecoInstanceData[] = [];

      for (const tile of tiles) {
        const { min, max } = TERRAIN_TYPES[terrain].decorationCount;
        const count = min + Math.floor(seededRandom(tile.coord.q * 73856093 + tile.coord.r * 19349663)() * (max - min + 1));
        const rng = seededRandom(tile.coord.q * 83492791 + tile.coord.r * 58718301 + terrain.charCodeAt(0));

        const [wx, , wz] = hexToWorld(tile.coord);
        const elevation = TERRAIN_ELEVATION[terrain] ?? 0;
        const baseY = elevation > 0 ? elevation : 0;

        for (let i = 0; i < count; i++) {
          // Random position within hex (polar coordinates within radius)
          const angle = rng() * Math.PI * 2;
          const radius = Math.sqrt(rng()) * 0.7; // sqrt for uniform distribution
          const px = wx + Math.cos(angle) * radius;
          const pz = wz + Math.sin(angle) * radius;

          const scaleMin = def.scaleRange[0];
          const scaleMax = def.scaleRange[1];
          const s = scaleMin + rng() * (scaleMax - scaleMin);

          instances.push({
            position: new THREE.Vector3(px, baseY + def.yOffset * s, pz),
            rotation: new THREE.Euler(rng() * Math.PI * 2, 0, rng() * 0.3 - 0.15),
            scale: new THREE.Vector3(s, s, s),
            color: new THREE.Color(def.color),
          });
        }
      }

      return { def, instances };
    });
  }, [terrain, tiles, defs]);

  return (
    <group>
      {instanceGroups.map(({ def, instances }, groupIdx) => {
        if (instances.length === 0) return null;
        return (
          <InstancedDecorationMesh
            key={`${terrain}-deco-${groupIdx}`}
            geometry={def.geometry}
            baseColor={def.color}
            instances={instances}
          />
        );
      })}
    </group>
  );
}

// ─── Single instanced mesh for many decorations ──────────────────────────────

function InstancedDecorationMesh({
  geometry,
  baseColor,
  instances,
}: {
  geometry: THREE.BufferGeometry;
  baseColor: string;
  instances: DecoInstanceData[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Set up instance matrices and colors
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      dummy.position.copy(inst.position);
      dummy.rotation.copy(inst.rotation);
      dummy.scale.copy(inst.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Slight color variation per instance
      color.copy(inst.color);
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      color.setHSL(
        hsl.h + (Math.random() - 0.5) * 0.02,
        hsl.s + (Math.random() - 0.5) * 0.1,
        hsl.l + (Math.random() - 0.5) * 0.08,
      );
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances]);

  // Gentle wind sway for vegetation
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Only sway forest/plains decorations (optimization)
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    for (let i = 0; i < Math.min(instances.length, 200); i++) {
      const inst = instances[i];
      dummy.position.copy(inst.position);
      // Subtle sway
      const swayPhase = inst.position.x * 2.0 + inst.position.z * 1.5;
      dummy.position.x += Math.sin(t * 1.5 + swayPhase) * 0.008;
      dummy.rotation.copy(inst.rotation);
      dummy.rotation.z += Math.sin(t * 1.2 + swayPhase) * 0.03;
      dummy.scale.copy(inst.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    if (instances.length > 0) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, instances.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={baseColor}
        roughness={0.85}
        metalness={0.05}
        flatShading
        vertexColors
      />
    </instancedMesh>
  );
}

// ─── Main DecorationLayer component ──────────────────────────────────────────

export function DecorationLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  // Group tiles by terrain type (excluding water which has no decorations)
  const tilesByTerrain = useMemo(() => {
    if (!gameState) return new Map<TerrainTypeId, HexTile[]>();

    const map = new Map<TerrainTypeId, HexTile[]>();

    // Determine visible hexes for fog filtering
    const player = gameState.players[activePlayerId];
    const visibleSet = showFog && player
      ? new Set(player.visibleHexes)
      : null;

    for (const tile of Object.values(gameState.map.tiles)) {
      // Skip water — no decorations
      if (tile.terrain === 'water') continue;

      // Skip fog-hidden tiles
      if (visibleSet) {
        const key = `${tile.coord.q},${tile.coord.r}`;
        if (!visibleSet.has(key)) continue;
      }

      const terrain = tile.terrain as TerrainTypeId;
      if (!map.has(terrain)) {
        map.set(terrain, []);
      }
      map.get(terrain)!.push(tile);
    }

    return map;
  }, [gameState, showFog, activePlayerId]);

  if (!gameState || tilesByTerrain.size === 0) return null;

  return (
    <group>
      {Array.from(tilesByTerrain.entries()).map(([terrain, tiles]) => (
        <DecorationInstances
          key={`deco-${terrain}`}
          terrain={terrain}
          tiles={tiles}
        />
      ))}
    </group>
  );
}

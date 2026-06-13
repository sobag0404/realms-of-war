'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { CityState } from '@/engine/core/GameState';
import { getModelDefinition, buildMesh } from '@/rendering/assets/ModelRegistry';
import { InstancedModelPool } from '@/rendering/instancing/InstancedModelPool';

/** Single building/city mesh using ModelRegistry definitions */
function CityMesh({ city, playerColor }: { city: CityState; playerColor: string }) {
  const [wx, , wz] = hexToWorld(city.hex);
  const yOffset = 0.1;

  // Try to get the city center model from ModelRegistry for the main building
  const cityCenterModel = useMemo(() => getModelDefinition('building_city_center'), []);

  // Build compound mesh from ModelRegistry if available
  const modelGroup = useMemo(() => {
    if (!cityCenterModel) return null;
    const meshOrGroup = buildMesh(cityCenterModel);
    if (meshOrGroup instanceof THREE.Group) {
      return meshOrGroup;
    }
    // Single mesh — wrap in group for consistent handling
    const group = new THREE.Group();
    group.add(meshOrGroup);
    return group;
  }, [cityCenterModel]);

  // City size based on level
  const baseSize = 0.2 + city.level * 0.1;

  return (
    <group position={[wx, yOffset, wz]}>
      <mesh position={[0, -0.035, 0]} receiveShadow>
        <cylinderGeometry args={[0.72, 0.8, 0.08, 6]} />
        <meshStandardMaterial color="#7a6a4e" roughness={0.92} metalness={0.02} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}>
        <circleGeometry args={[0.86, 32]} />
        <meshBasicMaterial color="#030507" transparent opacity={0.24} depthWrite={false} />
      </mesh>

      {/* City building — use ModelRegistry if available, otherwise fallback */}
      {modelGroup ? (
        <group scale={[1 + city.level * 0.08, 1 + city.level * 0.08, 1 + city.level * 0.08]}>
          <primitive object={modelGroup} castShadow />
        </group>
      ) : (
        <>
          {/* Fallback: City base (main building) */}
          <mesh castShadow position={[0, baseSize / 2, 0]}>
            <boxGeometry args={[baseSize, baseSize, baseSize]} />
            <meshStandardMaterial
              color={playerColor}
              roughness={0.5}
              metalness={0.3}
              emissive={playerColor}
              emissiveIntensity={0.15}
            />
          </mesh>

          {/* City roof */}
          <mesh castShadow position={[0, baseSize + 0.1, 0]}>
            <coneGeometry args={[baseSize * 0.7, baseSize * 0.6, 4]} />
            <meshStandardMaterial color="#8B4513" roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Walls indicator */}
      {city.wallHp > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.55, 6]} />
          <meshBasicMaterial color="#ead08a" transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Territory border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.64, 0.71, 6]} />
        <meshBasicMaterial
          color={playerColor}
          transparent
          opacity={0.62}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-0.38, 0.48, 0.18]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.62, 6]} />
        <meshStandardMaterial color="#2d2118" roughness={0.72} />
      </mesh>
      <mesh position={[-0.3, 0.68, 0.18]} rotation={[0, 0, 0.18]} castShadow>
        <coneGeometry args={[0.15, 0.22, 3]} />
        <meshStandardMaterial color={playerColor} roughness={0.58} metalness={0.04} />
      </mesh>
    </group>
  );
}

export function BuildingLayer() {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) return null;

  const cities = Object.values(gameState.cities);

  return (
    <group>
      {cities.map((city) => {
        const playerColor = gameState.players[city.ownerId]?.color ?? '#ffffff';
        return (
          <CityMesh
            key={city.id}
            city={city}
            playerColor={playerColor}
          />
        );
      })}
    </group>
  );
}

// ─── Instanced Building Layer (for future optimization) ─────────────────────
// Uses InstancedModelPool for efficient rendering of many buildings.
// Currently not used as the primary renderer because:
// - Cities have unique per-level sizing that doesn't map well to instancing
// - Territory borders and wall indicators need per-city rendering
// - ModelRegistry compound models can't be directly instanced
//
// To activate: replace BuildingLayer with InstancedBuildingLayer in SceneRoot
// when the building count is very high and compound detail isn't needed.

export function InstancedBuildingLayer() {
  const gameState = useGameStore((s) => s.gameState);

  const cities = useMemo(() => {
    if (!gameState) return [];
    return Object.values(gameState.cities);
  }, [gameState]);

  // Build instanced mesh using useMemo (not in effect to avoid setState issues)
  const instancedMesh = useMemo(() => {
    if (!gameState || cities.length === 0) return null;

    const pool = new InstancedModelPool();

    // Create a simple box geometry for instanced buildings
    const buildingGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const buildingMat = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.3,
      flatShading: true,
    });

    pool.initPool('building', buildingGeo, buildingMat, Math.max(100, cities.length * 2));

    // Add each city as an instance
    for (const city of cities) {
      const [wx, , wz] = hexToWorld(city.hex);
      const baseSize = 0.2 + city.level * 0.1;
      const position = new THREE.Vector3(wx, 0.1 + baseSize / 2, wz);
      const scale = new THREE.Vector3(baseSize / 0.4, baseSize / 0.4, baseSize / 0.4);

      const index = pool.addInstance('building', position, undefined, scale);
      if (index >= 0) {
        const playerColor = new THREE.Color(
          gameState.players[city.ownerId]?.color ?? '#ffffff'
        );
        pool.setInstanceColor('building', index, playerColor);
      }
    }

    return pool.getMesh('building') ?? null;
  }, [cities, gameState]);

  // Cleanup handled by React when primitive unmounts

  if (!gameState || cities.length === 0) return null;

  return (
    <group>
      {/* Instanced building meshes */}
      {instancedMesh && <primitive object={instancedMesh} />}

      {/* Per-city decorations: territory borders, walls — can't be instanced */}
      {cities.map((city) => {
        const [wx, , wz] = hexToWorld(city.hex);
        const playerColor = gameState.players[city.ownerId]?.color ?? '#ffffff';

        return (
          <group key={`decor-${city.id}`} position={[wx, 0.1, wz]}>
            {city.wallHp > 0 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.5, 0.55, 6]} />
                <meshBasicMaterial color="#c0a060" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[0.6, 0.65, 6]} />
              <meshBasicMaterial color={playerColor} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { CityState } from '@/engine/core/GameState';

/** Single building/city mesh */
function CityMesh({ city, playerColor }: { city: CityState; playerColor: string }) {
  const [wx, , wz] = hexToWorld(city.hex);
  const yOffset = 0.1;

  // City size based on level
  const baseSize = 0.2 + city.level * 0.1;

  return (
    <group position={[wx, yOffset, wz]}>
      {/* City base (main building) */}
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

      {/* Walls indicator */}
      {city.wallHp > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.55, 6]} />
          <meshBasicMaterial color="#c0a060" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Territory border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.6, 0.65, 6]} />
        <meshBasicMaterial
          color={playerColor}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
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

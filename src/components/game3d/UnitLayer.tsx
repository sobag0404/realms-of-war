'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { EntityData } from '@/engine/core/GameState';
import type { AttackType } from '@/engine/core/types';

/** Get player color from game state */
function getPlayerColor(gameState: { players: Record<string, { color: string }> }, playerId: string): string {
  return gameState.players[playerId]?.color ?? '#ffffff';
}

/** Get geometry for unit type */
function getUnitGeometry(attackType: AttackType): THREE.BufferGeometry {
  switch (attackType) {
    case 'melee':
      return new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8);
    case 'ranged':
      return new THREE.ConeGeometry(0.3, 0.6, 8);
    case 'magic':
      return new THREE.OctahedronGeometry(0.3);
    case 'siege':
      return new THREE.BoxGeometry(0.4, 0.3, 0.5);
    default:
      return new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8);
  }
}

/** Health bar component */
function HealthBar({ hp, maxHp, position }: { hp: number; maxHp: number; position: [number, number, number] }) {
  const healthRatio = hp / maxHp;
  const barColor = healthRatio > 0.6 ? '#2ecc71' : healthRatio > 0.3 ? '#f39c12' : '#e74c3c';
  const barWidth = 0.6;
  const barHeight = 0.06;

  return (
    <group position={position}>
      {/* Background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Health fill */}
      <mesh position={[(healthRatio - 1) * barWidth / 2, 0, 0.001]}>
        <planeGeometry args={[barWidth * healthRatio, barHeight]} />
        <meshBasicMaterial color={barColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Single unit mesh */
function UnitMesh({ entity, playerColor, isSelected }: {
  entity: EntityData;
  playerColor: string;
  isSelected: boolean;
}) {
  const [wx, , wz] = hexToWorld(entity.hex);
  const geometry = useMemo(() => getUnitGeometry(entity.attackType), [entity.attackType]);

  // Height offset: raise unit above terrain
  const yOffset = 0.4;

  // Make health bar face camera - we'll use billboard-like approach
  return (
    <group position={[wx, yOffset, wz]}>
      {/* Unit body */}
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color={playerColor}
          roughness={0.6}
          metalness={0.2}
          emissive={playerColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshBasicMaterial
            color="#ffdd00"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Health bar */}
      <HealthBar
        hp={entity.hp}
        maxHp={entity.maxHp}
        position={[0, 0.5, 0]}
      />
    </group>
  );
}

export function UnitLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);

  if (!gameState) return null;

  const entities = Object.values(gameState.entities);

  return (
    <group>
      {entities.map((entity) => (
        <UnitMesh
          key={entity.id}
          entity={entity}
          playerColor={getPlayerColor(gameState, entity.ownerId)}
          isSelected={selectedEntityId === entity.id}
        />
      ))}
    </group>
  );
}

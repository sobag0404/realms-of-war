'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { EntityData } from '@/engine/core/GameState';
import type { AttackType } from '@/engine/core/types';
import { getModelDefinition } from '@/rendering/assets/ModelRegistry';

/** Get player color from game state */
function getPlayerColor(gameState: { players: Record<string, { color: string }> }, playerId: string): string {
  return gameState.players[playerId]?.color ?? '#ffffff';
}

/** Get geometry for unit type using ModelRegistry when available, falling back to attack type */
function getUnitGeometry(typeId: string, attackType: AttackType): THREE.BufferGeometry {
  // Try to get geometry from ModelRegistry first
  const modelDef = getModelDefinition(`unit_${typeId}`);
  if (modelDef) {
    // Use the top-level shape geometry (not compound children)
    const { dimensions } = modelDef;
    switch (modelDef.shape) {
      case 'box':
        return new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
      case 'sphere':
        return new THREE.SphereGeometry(Math.max(dimensions.width, dimensions.height) / 2, 12, 8);
      case 'cylinder':
        return new THREE.CylinderGeometry(dimensions.width / 2, dimensions.depth / 2, dimensions.height, 12);
      case 'cone':
        return new THREE.ConeGeometry(Math.max(dimensions.width, dimensions.depth) / 2, dimensions.height, 12);
      default:
        // For compound shapes, use cylinder as the base
        return new THREE.CylinderGeometry(dimensions.width / 2, dimensions.depth / 2, dimensions.height, 12);
    }
  }

  // Fallback to attack type-based geometry
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
  const barWidth = 0.5;
  const barHeight = 0.045;

  return (
    <group position={position}>
      {/* Background */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[barWidth + 0.08, barHeight + 0.045]} />
        <meshBasicMaterial color="#071018" transparent opacity={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshBasicMaterial color="#18202a" transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
      {/* Health fill */}
      <mesh position={[(healthRatio - 1) * barWidth / 2, 0, 0.001]}>
        <planeGeometry args={[barWidth * healthRatio, barHeight]} />
        <meshBasicMaterial color={barColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function UnitBaseMarker({ playerColor, isSelected }: { playerColor: string; isSelected: boolean }) {
  return (
    <group position={[0, -0.32, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <circleGeometry args={[0.44, 32]} />
        <meshBasicMaterial color="#030507" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.47, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#ffd84d' : playerColor}
          transparent
          opacity={isSelected ? 0.92 : 0.68}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.24, 0.42, 0.03]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.54, 6]} />
        <meshStandardMaterial color="#2d2118" roughness={0.72} />
      </mesh>
      <mesh position={[0.3, 0.58, 0.03]} rotation={[0, 0, -0.18]} castShadow>
        <coneGeometry args={[0.13, 0.18, 3]} />
        <meshStandardMaterial color={playerColor} roughness={0.58} metalness={0.04} />
      </mesh>
    </group>
  );
}

/** Build compound mesh group from ModelRegistry definition */
function buildCompoundGroup(modelDef: ReturnType<typeof getModelDefinition>): THREE.Group | null {
  if (!modelDef || modelDef.shape !== 'compound' || !modelDef.children) return null;

  const group = new THREE.Group();
  for (const child of modelDef.children) {
    const childGeo = (() => {
      switch (child.shape) {
        case 'box': return new THREE.BoxGeometry(child.dimensions.width, child.dimensions.height, child.dimensions.depth);
        case 'sphere': return new THREE.SphereGeometry(Math.max(child.dimensions.width, child.dimensions.height) / 2, 12, 8);
        case 'cylinder': return new THREE.CylinderGeometry(child.dimensions.width / 2, child.dimensions.depth / 2, child.dimensions.height, 12);
        case 'cone': return new THREE.ConeGeometry(Math.max(child.dimensions.width, child.dimensions.depth) / 2, child.dimensions.height, 12);
        default: return new THREE.BoxGeometry(0.1, 0.1, 0.1);
      }
    })();
    const childMatParams: THREE.MeshStandardMaterialParameters = {
      color: new THREE.Color(child.color),
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    };
    if (child.emissive) {
      childMatParams.emissive = new THREE.Color(child.emissive);
      childMatParams.emissiveIntensity = 0.3;
    }
    const childMat = new THREE.MeshStandardMaterial(childMatParams);
    const childMesh = new THREE.Mesh(childGeo, childMat);
    childMesh.position.set(...child.position);
    childMesh.castShadow = true;
    childMesh.receiveShadow = true;
    group.add(childMesh);
  }
  return group;
}

/** Single unit mesh */
function UnitMesh({ entity, playerColor, isSelected }: {
  entity: EntityData;
  playerColor: string;
  isSelected: boolean;
}) {
  const [wx, , wz] = hexToWorld(entity.hex);

  // Try ModelRegistry for full compound model first
  const modelDef = useMemo(() => getModelDefinition(`unit_${entity.typeId}`), [entity.typeId]);
  const geometry = useMemo(() => getUnitGeometry(entity.typeId, entity.attackType), [entity.typeId, entity.attackType]);

  // Height offset: raise unit above terrain
  const yOffset = 0.4;

  // Build compound mesh group from ModelRegistry if available
  const compoundGroup = useMemo(() => buildCompoundGroup(modelDef), [modelDef]);

  return (
    <group position={[wx, yOffset, wz]}>
      <UnitBaseMarker playerColor={playerColor} isSelected={isSelected} />

      {/* Unit body — use compound model if available, otherwise single geometry */}
      {compoundGroup ? (
        <group scale={[1.08, 1.08, 1.08]}>
          <primitive object={compoundGroup} castShadow />
        </group>
      ) : (
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial
            color={playerColor}
            roughness={0.6}
            metalness={0.2}
            emissive={playerColor}
            emissiveIntensity={0.1}
          />
        </mesh>
      )}

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
        position={[0, 0.72, 0]}
      />
    </group>
  );
}

export function UnitLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);

  if (!gameState) return null;

  const entities = Object.values(gameState.entities);

  // TODO: InstancedModelPool integration for performance optimization.
  // The InstancedModelPool from rendering/instancing/ can be used to batch
  // units of the same type into a single InstancedMesh draw call. This is
  // beneficial when there are many units of the same attack type on screen.
  // Current approach renders each unit individually because:
  // - Compound models from ModelRegistry can't be instanced as easily
  // - Health bars and selection rings need per-unit rendering
  // - The current unit count doesn't justify the added complexity
  // To activate: add an InstancedUnitLayer component similar to
  // InstancedBuildingLayer in BuildingLayer.tsx

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

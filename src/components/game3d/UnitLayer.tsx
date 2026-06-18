'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { EntityData } from '@/engine/core/GameState';
import type { AttackType, TerrainTypeId } from '@/engine/core/types';
import { getModelDefinition } from '@/rendering/assets/ModelRegistry';
import { TERRAIN_ELEVATION } from '@/data/terrain';

type UnitTacticalState = {
  hpRatio: number;
  canMove: boolean;
  canAttack: boolean;
  isReady: boolean;
  isSpent: boolean;
  isDamaged: boolean;
  isFortified: boolean;
};

/** Get player color from game state */
function getPlayerColor(gameState: { players: Record<string, { color: string }> }, playerId: string): string {
  return gameState.players[playerId]?.color ?? '#ffffff';
}

function getUnitTacticalState(entity: EntityData): UnitTacticalState {
  const hpRatio = entity.maxHp > 0 ? Math.max(0, Math.min(1, entity.hp / entity.maxHp)) : 1;
  const canMove = entity.movementPoints > 0 && !entity.hasMoved;
  const canAttack = entity.attack > 0 && !entity.hasActed;
  return {
    hpRatio,
    canMove,
    canAttack,
    isReady: canMove || canAttack,
    isSpent: entity.hasActed && (entity.hasMoved || entity.movementPoints <= 0),
    isDamaged: hpRatio < 0.72,
    isFortified: entity.statusEffects.includes('fortified'),
  };
}

function darkenColor(color: string, amount = 0.58): string {
  return new THREE.Color(color).multiplyScalar(amount).getStyle();
}

function isSameHex(a: { q: number; r: number } | null, b: { q: number; r: number }): boolean {
  return Boolean(a && a.q === b.q && a.r === b.r);
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
  const healthRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 1;
  const barColor = healthRatio > 0.6 ? '#2ecc71' : healthRatio > 0.3 ? '#f39c12' : '#e74c3c';
  const barWidth = 0.62;
  const barHeight = 0.055;

  return (
    <group position={position}>
      {/* Background */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[barWidth + 0.12, barHeight + 0.055]} />
        <meshBasicMaterial color="#020507" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshBasicMaterial color="#18202a" transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Health fill */}
      <mesh position={[(healthRatio - 1) * barWidth / 2, 0, 0.001]}>
        <planeGeometry args={[barWidth * healthRatio, barHeight]} />
        <meshBasicMaterial color={barColor} transparent opacity={0.96} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function UnitBaseMarker({
  playerColor,
  isSelected,
  tacticalState,
}: {
  playerColor: string;
  isSelected: boolean;
  tacticalState: UnitTacticalState;
}) {
  const accentColor = isSelected ? '#ffd84d' : playerColor;
  const outerOpacity = isSelected ? 0.98 : tacticalState.isReady ? 0.88 : 0.62;

  return (
    <group position={[0, -0.32, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <circleGeometry args={[0.64, 40]} />
        <meshBasicMaterial color="#020406" transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.007, 0]}>
        <circleGeometry args={[0.48, 40]} />
        <meshBasicMaterial color="#071016" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
        <ringGeometry args={[0.42, 0.56, 40]} />
        <meshBasicMaterial color="#05080b" transparent opacity={0.82} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.52, 40]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={outerOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[0.2, 0.26, 6]} />
        <meshBasicMaterial color={playerColor} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.29, 0.34, 6]} />
        <meshBasicMaterial
          color={tacticalState.isSpent ? '#89909a' : playerColor}
          transparent
          opacity={tacticalState.isSpent ? 0.7 : 0.95}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.28, 0.42, 0.03]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.58, 6]} />
        <meshStandardMaterial color="#2d2118" roughness={0.72} />
      </mesh>
      <mesh position={[0.34, 0.6, 0.03]} rotation={[0, 0, -0.18]} castShadow>
        <coneGeometry args={[0.16, 0.22, 3]} />
        <meshStandardMaterial color={playerColor} emissive={playerColor} emissiveIntensity={0.18} roughness={0.58} metalness={0.04} />
      </mesh>
    </group>
  );
}

function UnitTacticalHalo({
  playerColor,
  isSelected,
  tacticalState,
}: {
  playerColor: string;
  isSelected: boolean;
  tacticalState: UnitTacticalState;
}) {
  const ringColor = tacticalState.isDamaged ? '#ff7d53' : isSelected ? '#ffe66b' : playerColor;
  const ringOpacity = tacticalState.isDamaged ? 0.82 : isSelected ? 0.94 : tacticalState.isReady ? 0.52 : 0.32;

  return (
    <group position={[0, -0.28, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.53, 0.59, 40]} />
        <meshBasicMaterial color="#05080c" transparent opacity={0.76} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <ringGeometry args={[0.56, 0.62, 40]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={ringOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.67, 0.72, 40]} />
          <meshBasicMaterial color="#fff5b0" transparent opacity={0.66} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function UnitFormationMarks({
  attackType,
  playerColor,
  tacticalState,
}: {
  attackType: AttackType;
  playerColor: string;
  tacticalState: UnitTacticalState;
}) {
  const markColor = tacticalState.isSpent ? '#7d8790' : playerColor;
  const darkColor = darkenColor(playerColor, 0.34);

  if (attackType === 'ranged') {
    return (
      <group position={[0, -0.18, 0.02]}>
        {[-0.18, 0, 0.18].map((x) => (
          <mesh key={x} position={[x, 0.1, -0.34]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.035, 0.28, 0.035]} />
            <meshStandardMaterial color={markColor} roughness={0.62} emissive={darkColor} emissiveIntensity={0.16} />
          </mesh>
        ))}
      </group>
    );
  }

  if (attackType === 'magic') {
    return (
      <group position={[0, -0.2, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.11, -0.38]}>
          <ringGeometry args={[0.08, 0.12, 4]} />
          <meshBasicMaterial color="#e8d7ff" transparent opacity={0.86} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.16, -0.38]}>
          <octahedronGeometry args={[0.08]} />
          <meshStandardMaterial color={markColor} emissive={markColor} emissiveIntensity={0.45} roughness={0.42} />
        </mesh>
      </group>
    );
  }

  if (attackType === 'siege') {
    return (
      <group position={[0, -0.21, -0.36]}>
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.1]} />
            <meshStandardMaterial color={markColor} roughness={0.74} emissive={darkColor} emissiveIntensity={0.1} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[0, -0.2, -0.36]}>
      {[-0.18, 0, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.07, 0.13, 6]} />
          <meshStandardMaterial color={markColor} roughness={0.58} emissive={darkColor} emissiveIntensity={0.14} />
        </mesh>
      ))}
    </group>
  );
}

function UnitStatusBadges({
  tacticalState,
  playerColor,
}: {
  tacticalState: UnitTacticalState;
  playerColor: string;
}) {
  return (
    <group position={[-0.39, 0.28, 0.33]} rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.08, 0.38, 0.035]} />
        <meshStandardMaterial color="#151b21" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.39, 0.001]} castShadow>
        <boxGeometry args={[0.18, 0.16, 0.03]} />
        <meshStandardMaterial
          color={tacticalState.isSpent ? '#75808a' : playerColor}
          emissive={tacticalState.isReady ? playerColor : '#000000'}
          emissiveIntensity={tacticalState.isReady ? 0.22 : 0}
          roughness={0.58}
        />
      </mesh>
      {tacticalState.canMove && (
        <mesh position={[-0.12, 0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.055, 0.12, 3]} />
          <meshBasicMaterial color="#8de0ff" transparent opacity={0.92} depthWrite={false} />
        </mesh>
      )}
      {tacticalState.canAttack && (
        <mesh position={[0.12, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.055, 0.12, 3]} />
          <meshBasicMaterial color="#ff9a67" transparent opacity={0.94} depthWrite={false} />
        </mesh>
      )}
      {tacticalState.isFortified && (
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.24, 0.08, 0.04]} />
          <meshStandardMaterial color="#a99a73" roughness={0.8} />
        </mesh>
      )}
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
  const gameState = useGameStore((s) => s.gameState);
  const [wx, , wz] = hexToWorld(entity.hex);
  const tile = gameState?.map.tiles[`${entity.hex.q},${entity.hex.r}`];
  const terrainY = tile ? TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0 : 0;

  // Try ModelRegistry for full compound model first
  const modelDef = useMemo(() => getModelDefinition(`unit_${entity.typeId}`), [entity.typeId]);
  const geometry = useMemo(() => getUnitGeometry(entity.typeId, entity.attackType), [entity.typeId, entity.attackType]);
  const tacticalState = useMemo(() => getUnitTacticalState(entity), [entity]);

  // Height offset: raise unit above terrain
  const yOffset = terrainY + 0.52;

  // Build compound mesh group from ModelRegistry if available
  const compoundGroup = useMemo(() => buildCompoundGroup(modelDef), [modelDef]);

  return (
    <group position={[wx, yOffset, wz]}>
      <UnitTacticalHalo playerColor={playerColor} isSelected={isSelected} tacticalState={tacticalState} />
      <UnitBaseMarker playerColor={playerColor} isSelected={isSelected} tacticalState={tacticalState} />
      <UnitFormationMarks attackType={entity.attackType} playerColor={playerColor} tacticalState={tacticalState} />
      <UnitStatusBadges tacticalState={tacticalState} playerColor={playerColor} />

      {/* Unit body — use compound model if available, otherwise single geometry */}
      {compoundGroup ? (
        <group scale={[1.16, 1.16, 1.16]}>
          <primitive object={compoundGroup} castShadow />
        </group>
      ) : (
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial
            color={playerColor}
            roughness={0.6}
            metalness={0.2}
            emissive={playerColor}
            emissiveIntensity={tacticalState.isReady ? 0.2 : 0.08}
          />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
          <ringGeometry args={[0.72, 0.8, 48]} />
          <meshBasicMaterial
            color="#fff2a8"
            transparent
            opacity={0.76}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]} position={[0, -0.238, 0]}>
          <ringGeometry args={[0.84, 0.9, 6]} />
          <meshBasicMaterial color={playerColor} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {(isSelected || tacticalState.isDamaged) && (
        <HealthBar
          hp={entity.hp}
          maxHp={entity.maxHp}
          position={[0, 0.84, 0]}
        />
      )}
    </group>
  );
}

export function UnitLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const selectedHex = useGameStore((s) => s.selectedHex);

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
          isSelected={selectedEntityId === entity.id || isSameHex(selectedHex, entity.hex)}
        />
      ))}
    </group>
  );
}

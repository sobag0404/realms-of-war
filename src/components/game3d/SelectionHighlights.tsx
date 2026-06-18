'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexCoord } from '@/engine/core/types';
import type { TerrainTypeId } from '@/engine/core/types';

/** Create hex overlay geometry */
function createHexOverlay(radius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createChevronOverlay(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.16);
  shape.lineTo(0.14, -0.12);
  shape.lineTo(0.04, -0.08);
  shape.lineTo(0, -0.02);
  shape.lineTo(-0.04, -0.08);
  shape.lineTo(-0.14, -0.12);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function SelectionHighlights() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const hoveredHex = useGameStore((s) => s.hoveredHex);
  const movementPath = useGameStore((s) => s.movementPath);
  const attackTargets = useGameStore((s) => s.attackTargets);

  const fillGeometry = useMemo(() => createHexOverlay(0.9), []);
  const innerRingGeometry = useMemo(() => new THREE.RingGeometry(0.72, 0.86, 6), []);
  const outerRingGeometry = useMemo(() => new THREE.RingGeometry(0.9, 1.0, 6), []);
  const chevronGeometry = useMemo(() => createChevronOverlay(), []);
  const pipGeometry = useMemo(() => new THREE.CircleGeometry(0.055, 12), []);

  if (!gameState) return null;

  // Build list of highlighted hexes
  const highlights: Array<{ hex: HexCoord; type: 'selected' | 'hovered' | 'reachable' | 'attackable' }> = [];

  if (selectedHex) {
    highlights.push({ hex: selectedHex, type: 'selected' });
  }
  if (hoveredHex && !(selectedHex && hoveredHex.q === selectedHex.q && hoveredHex.r === selectedHex.r)) {
    highlights.push({ hex: hoveredHex, type: 'hovered' });
  }

  // Reachable hexes (movement path, blue overlay)
  for (const hex of movementPath) {
    if (!(selectedHex && hex.q === selectedHex.q && hex.r === selectedHex.r)) {
      highlights.push({ hex, type: 'reachable' });
    }
  }

  // Attackable entities — resolve to hex positions (red overlay)
  if (gameState && attackTargets.length > 0) {
    for (const entityId of attackTargets) {
      const entity = gameState.entities[entityId];
      if (entity) {
        const hex: HexCoord = entity.hex;
        highlights.push({ hex, type: 'attackable' });
      }
    }
  }

  if (highlights.length === 0) return null;

  return (
    <group>
      {highlights.map(({ hex, type }, i) => {
        const [wx, , wz] = hexToWorld(hex);
        const tile = gameState.map.tiles[`${hex.q},${hex.r}`];
        const terrain = tile?.terrain as TerrainTypeId | undefined;
        const terrainY = terrain ? TERRAIN_ELEVATION[terrain] ?? 0 : 0;

        let color: string;
        let fillOpacity: number;
        let ringOpacity: number;
        let yOffset: number;

        switch (type) {
          case 'selected':
            color = '#ffdd00';
            fillOpacity = 0.18;
            ringOpacity = 0.96;
            yOffset = 0.14;
            break;
          case 'hovered':
            color = '#ffffff';
            fillOpacity = 0.08;
            ringOpacity = 0.66;
            yOffset = 0.1;
            break;
          case 'reachable':
            color = '#67cfff';
            fillOpacity = 0.07;
            ringOpacity = 0.66;
            yOffset = 0.1;
            break;
          case 'attackable':
            color = '#ff5d45';
            fillOpacity = 0.2;
            ringOpacity = 0.92;
            yOffset = 0.15;
            break;
          default:
            color = '#ffffff';
            fillOpacity = 0.08;
            ringOpacity = 0.4;
            yOffset = 0.05;
        }

        return (
          <group key={`highlight-${i}-${hex.q},${hex.r}`} position={[wx, terrainY + 0.18 + yOffset, wz]} renderOrder={40 + i}>
            <mesh geometry={fillGeometry} rotation={[-Math.PI / 2, 0, 0]} renderOrder={40 + i}>
              <meshBasicMaterial color={color} transparent opacity={fillOpacity} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
            </mesh>
            <mesh geometry={outerRingGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} renderOrder={41 + i}>
              <meshBasicMaterial color="#030507" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
            </mesh>
            <mesh geometry={outerRingGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={42 + i}>
              <meshBasicMaterial color={color} transparent opacity={ringOpacity} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
            </mesh>
            {(type === 'selected' || type === 'attackable') && (
              <mesh geometry={innerRingGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} renderOrder={43 + i}>
                <meshBasicMaterial color={color} transparent opacity={ringOpacity * 0.7} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
              </mesh>
            )}
            {type === 'reachable' && (
              <group>
                {[0, 2, 4].map((side) => {
                  const angle = (Math.PI / 180) * (60 * side - 30);
                  return (
                    <mesh
                      key={`reachable-pip-${side}`}
                      geometry={pipGeometry}
                      rotation={[-Math.PI / 2, 0, 0]}
                      position={[0.58 * Math.cos(angle), 0.024, 0.58 * Math.sin(angle)]}
                      renderOrder={44 + i}
                    >
                      <meshBasicMaterial color="#d5f5ff" transparent opacity={0.82} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
                    </mesh>
                  );
                })}
              </group>
            )}
            {type === 'attackable' && (
              <group>
                {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => (
                  <mesh
                    key={`attack-chevron-${angle}`}
                    geometry={chevronGeometry}
                    rotation={[-Math.PI / 2, 0, -angle]}
                    position={[0.7 * Math.sin(angle), 0.032, 0.7 * Math.cos(angle)]}
                    renderOrder={45 + i}
                  >
                    <meshBasicMaterial color="#ffd5c8" transparent opacity={0.94} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

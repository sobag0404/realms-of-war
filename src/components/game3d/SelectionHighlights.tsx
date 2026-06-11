'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { HexCoord } from '@/engine/core/types';

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

export function SelectionHighlights() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const hoveredHex = useGameStore((s) => s.hoveredHex);
  const movementPath = useGameStore((s) => s.movementPath);
  const attackTargets = useGameStore((s) => s.attackTargets);

  const geometry = useMemo(() => createHexOverlay(0.92), []);

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

        let color: string;
        let opacity: number;
        let yOffset: number;

        switch (type) {
          case 'selected':
            color = '#ffdd00';
            opacity = 0.35;
            yOffset = 0.08;
            break;
          case 'hovered':
            color = '#ffffff';
            opacity = 0.2;
            yOffset = 0.07;
            break;
          case 'reachable':
            color = '#4488ff';
            opacity = 0.2;
            yOffset = 0.06;
            break;
          case 'attackable':
            color = '#ff4444';
            opacity = 0.25;
            yOffset = 0.09;
            break;
          default:
            color = '#ffffff';
            opacity = 0.1;
            yOffset = 0.05;
        }

        return (
          <mesh
            key={`highlight-${i}-${hex.q},${hex.r}`}
            geometry={geometry}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[wx, yOffset, wz]}
          >
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

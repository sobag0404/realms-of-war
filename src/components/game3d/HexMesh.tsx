'use client';

import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';
import { TERRAIN_COLORS, TERRAIN_ELEVATION } from '@/data/terrain';

/** Create a pointy-top hex shape for extrusion */
function createHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

interface HexMeshProps {
  position: [number, number, number];
  terrain: TerrainTypeId;
  hex: HexCoord;
  elevation: number;
  isHighlighted?: boolean;
  isHovered?: boolean;
  onClick?: (hex: HexCoord) => void;
  onHover?: (hex: HexCoord | null) => void;
}

export function HexMesh({
  position,
  terrain,
  hex,
  elevation,
  isHighlighted,
  isHovered,
  onClick,
  onHover,
}: HexMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Create hex geometry with slight extrusion for height
  const geometry = useMemo(() => {
    const shape = createHexShape(0.95); // Slightly smaller than 1.0 to show gaps
    const extrudeSettings = {
      depth: Math.max(0.05, elevation + 0.1),
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [elevation]);

  // Get terrain color
  const color = useMemo(() => {
    const baseColor = TERRAIN_COLORS[terrain] ?? '#555555';
    return new THREE.Color(baseColor);
  }, [terrain]);

  // Slightly brighten on hover
  const displayColor = useMemo(() => {
    if (isHovered || hovered) {
      return color.clone().offsetHSL(0, 0, 0.1);
    }
    return color;
  }, [color, isHovered, hovered]);

  // Handle pointer events
  const handlePointerOver = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    setHovered(true);
    onHover?.(hex);
  };

  const handlePointerOut = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    setHovered(false);
    onHover?.(null);
  };

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    onClick?.(hex);
  };

  // Position: ExtrudeGeometry creates shape on XY plane, we rotate to XZ
  // depth goes along Z in local space, so after rotation it goes along Y (up)
  const yPos = position[1];
  const terrainElev = TERRAIN_ELEVATION[terrain] ?? 0;

  return (
    <group position={[position[0], yPos, position[2]]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, terrainElev > 0 ? terrainElev : 0, 0]}
        receiveShadow
        castShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={displayColor}
          roughness={0.85}
          metalness={0.05}
          flatShading
        />
      </mesh>

      {/* Highlight ring */}
      {(isHighlighted || isHovered || hovered) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, (terrainElev > 0 ? terrainElev : 0) + 0.01, 0]}
        >
          <ringGeometry args={[0.85, 0.95, 6]} />
          <meshBasicMaterial
            color={isHighlighted ? '#ffdd00' : '#ffffff'}
            transparent
            opacity={isHighlighted ? 0.8 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

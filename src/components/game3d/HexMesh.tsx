'use client';

import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';
import { TERRAIN_COLORS, TERRAIN_ELEVATION } from '@/data/terrain';
import { buildHexGeometry } from '@/rendering/terrain/buildHexGeometry';
import { createTerrainMaterial, createSelectionMaterial, createHoverMaterial } from '@/rendering/terrain/terrainMaterials';

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

function hash01(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

function colorForVertex(terrain: TerrainTypeId, q: number, r: number, vertexIndex: number, normalY: number): THREE.Color {
  const color = new THREE.Color(TERRAIN_COLORS[terrain] ?? '#555555');
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const tileNoise = hash01(q, r, 1) - 0.5;
  const vertexNoise = hash01(q, r, vertexIndex + 13) - 0.5;
  const sideShade = normalY > 0.5 ? 1 : terrain === 'mountain' ? 0.58 : terrain === 'forest' ? 0.62 : 0.72;
  const centerLift = vertexIndex === 0 ? 0.04 : 0;
  return new THREE.Color().setHSL(
    THREE.MathUtils.euclideanModulo(hsl.h + tileNoise * 0.018, 1),
    THREE.MathUtils.clamp(hsl.s + tileNoise * 0.12, 0.05, 0.95),
    THREE.MathUtils.clamp((hsl.l + vertexNoise * 0.12 + centerLift) * sideShade, 0.08, 0.88),
  );
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

  // Use the optimized buildHexGeometry from rendering utils
  const geometry = useMemo(() => {
    // Use buildHexGeometry with a slight inset for visual gaps between hexes
    const hexHeight = Math.max(0.05, elevation + 0.1);
    const meshGeometry = buildHexGeometry({
      radius: 0.95, // Slightly smaller to show gaps
      height: hexHeight,
      includeTop: true,
      includeSides: true,
      segments: 1,
    });
    const normals = meshGeometry.getAttribute('normal');
    const colors: number[] = [];
    for (let index = 0; index < normals.count; index++) {
      const color = colorForVertex(terrain, hex.q, hex.r, index, normals.getY(index));
      colors.push(color.r, color.g, color.b);
    }
    meshGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return meshGeometry;
  }, [elevation, hex.q, hex.r, terrain]);

  // Use terrainMaterials from rendering utils for the base material
  const baseMaterial = useMemo(() => createTerrainMaterial(terrain), [terrain]);

  // Handle hover highlight: brighten the terrain color slightly
  const material = useMemo(() => {
    const withVertexColors = baseMaterial.clone();
    withVertexColors.vertexColors = true;
    withVertexColors.color = new THREE.Color(isHovered || hovered ? '#ffffff' : '#f4f1df');
    if (isHovered || hovered) {
      withVertexColors.emissive = new THREE.Color('#1f2630');
      withVertexColors.emissiveIntensity = 0.08;
    }
    return withVertexColors;
  }, [baseMaterial, isHovered, hovered]);

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

  // Position: buildHexGeometry creates geometry on the XZ plane with Y up,
  // so no rotation needed (unlike ExtrudeGeometry which creates on XY plane)
  const yPos = position[1];
  const terrainElev = TERRAIN_ELEVATION[terrain] ?? 0;
  const topY = terrainElev + Math.max(0.05, elevation + 0.1);

  return (
    <group position={[position[0], yPos, position[2]]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, terrainElev > 0 ? terrainElev : 0, 0]}
        receiveShadow
        castShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <primitive object={material} attach="material" />
      </mesh>

      {/* Highlight ring — uses terrainMaterials selection/hover materials */}
      {(isHighlighted || isHovered || hovered) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, topY + 0.02, 0]}
        >
          <ringGeometry args={[0.85, 0.95, 6]} />
          <primitive
            object={isHighlighted ? createSelectionMaterial() : createHoverMaterial()}
            attach="material"
          />
        </mesh>
      )}
    </group>
  );
}

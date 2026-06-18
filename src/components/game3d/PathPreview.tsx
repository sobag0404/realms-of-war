'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';

function createRouteChevronGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.16);
  shape.lineTo(0.15, -0.1);
  shape.lineTo(0.05, -0.06);
  shape.lineTo(0, 0.02);
  shape.lineTo(-0.05, -0.06);
  shape.lineTo(-0.15, -0.1);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function PathPreview() {
  const movementPath = useGameStore((s) => s.movementPath);
  const mapTiles = useGameStore((s) => s.gameState?.map.tiles);

  const dotGeometry = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const endpointGeometry = useMemo(() => new THREE.RingGeometry(0.16, 0.24, 24), []);
  const chevronGeometry = useMemo(() => createRouteChevronGeometry(), []);

  // Convert hex path to world coordinates
  const points = useMemo(() => {
    if (!mapTiles || movementPath.length < 2) return [];
    return movementPath.map((hex: HexCoord) => {
      const [wx, , wz] = hexToWorld(hex);
      const tile = mapTiles[`${hex.q},${hex.r}`];
      const terrainY = tile ? TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0 : 0;
      return [wx, terrainY + 0.44, wz] as [number, number, number];
    });
  }, [mapTiles, movementPath]);

  const routeMarks = useMemo(() => {
    return points.slice(0, -1).map((point, i) => {
      const next = points[i + 1];
      const dx = next[0] - point[0];
      const dz = next[2] - point[2];
      return {
        position: [(point[0] + next[0]) / 2, Math.max(point[1], next[1]) + 0.03, (point[2] + next[2]) / 2] as [number, number, number],
        angle: Math.atan2(dx, dz),
      };
    });
  }, [points]);

  if (points.length < 2) return null;

  return (
    <group renderOrder={34}>
      {/* Path line */}
      <Line
        points={points}
        color="#03101a"
        lineWidth={9}
        transparent
        opacity={0.64}
        depthWrite={false}
      />
      <Line
        points={points}
        color="#03101a"
        lineWidth={7}
        dashed
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.82}
        depthWrite={false}
      />
      <Line
        points={points}
        color="#61c7ff"
        lineWidth={4}
        dashed
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.96}
        depthWrite={false}
      />
      <Line
        points={points}
        color="#d9f6ff"
        lineWidth={1.5}
        dashed
        dashSize={0.08}
        gapSize={0.22}
        transparent
        opacity={0.86}
        depthWrite={false}
      />

      {/* Waypoint dots */}
      {points.map((point, i) => (
        <mesh
          key={`path-dot-${i}`}
          position={point}
          geometry={dotGeometry}
          scale={i === points.length - 1 ? 0.09 : 0.065}
          renderOrder={35}
        >
          <meshBasicMaterial color={i === points.length - 1 ? '#fff2a8' : '#61c7ff'} transparent opacity={0.92} depthWrite={false} />
        </mesh>
      ))}
      {routeMarks.map((mark, i) => (
        <mesh
          key={`path-chevron-${i}`}
          position={mark.position}
          geometry={chevronGeometry}
          rotation={[-Math.PI / 2, 0, -mark.angle]}
          renderOrder={36}
        >
          <meshBasicMaterial color="#d9f6ff" transparent opacity={0.88} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <mesh
        position={points[points.length - 1]}
        geometry={endpointGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={37}
      >
        <meshBasicMaterial color="#fff2a8" transparent opacity={0.96} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

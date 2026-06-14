'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';

/** Create hex plane geometry for fog overlay */
function createHexPlane(radius: number): THREE.BufferGeometry {
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

type Visibility = 'hidden' | 'explored' | 'visible';

export function FogLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const geometry = useMemo(() => createHexPlane(0.96), []);
  const hiddenMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#0c1622',
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const exploredMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#2d3d46',
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Compute visibility for each tile
  const fogTiles = useMemo(() => {
    if (!gameState || !showFog) return [];

    const player = gameState.players[activePlayerId];
    if (!player) return [];

    const visibleSet = new Set(player.visibleHexes);
    const exploredSet = new Set(player.exploredHexes);

    return Object.values(gameState.map.tiles).map((tile) => {
      const key = `${tile.coord.q},${tile.coord.r}`;
      let visibility: Visibility = 'hidden';
      if (visibleSet.has(key)) visibility = 'visible';
      else if (exploredSet.has(key)) visibility = 'explored';

      return { tile, visibility };
    }).filter((entry) => entry.visibility !== 'visible');
  }, [gameState, showFog, activePlayerId]);

  if (fogTiles.length === 0) return null;

  return (
    <group>
      {fogTiles.map(({ tile, visibility }) => {
        const [wx, , wz] = hexToWorld(tile.coord);
        const isHidden = visibility === 'hidden';

        return (
          <mesh
            key={`fog-${tile.coord.q},${tile.coord.r}`}
            geometry={geometry}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[wx, 0.5, wz]}
          >
            <primitive object={isHidden ? hiddenMaterial : exploredMaterial} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}

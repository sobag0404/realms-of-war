'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { HEX_DIRECTIONS } from '@/engine/core/types';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import type { TerrainTypeId } from '@/engine/core/types';

const COASTAL_WATER_Y = -0.01;

function createHexRing(innerRadius: number, outerRadius: number): THREE.BufferGeometry {
  return new THREE.RingGeometry(innerRadius, outerRadius, 6);
}

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function CoastLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const showFog = useGameStore((s) => s.showFog);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const knownHexes = useMemo(() => {
    if (!gameState || !showFog) return null;
    const player = gameState.players[activePlayerId];
    const knownKeys = player ? [...player.visibleHexes, ...player.exploredHexes] : [];
    return knownKeys.length > 0 ? new Set(knownKeys) : null;
  }, [activePlayerId, gameState, showFog]);

  const coastalWaterTiles = useMemo(() => {
    if (!gameState) return [];

    const tiles = gameState.map.tiles;
    return Object.values(tiles).filter((tile) => {
      if (tile.terrain !== 'water') return false;
      if (knownHexes && !knownHexes.has(hexKey(tile.coord.q, tile.coord.r))) return false;
      return HEX_DIRECTIONS.some((dir) => {
        const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
        return neighbor && neighbor.terrain !== 'water';
      });
    });
  }, [gameState, knownHexes]);

  const shoreLandTiles = useMemo(() => {
    if (!gameState) return [];

    const tiles = gameState.map.tiles;
    return Object.values(tiles).filter((tile) => {
      if (tile.terrain === 'water') return false;
      if (knownHexes && !knownHexes.has(hexKey(tile.coord.q, tile.coord.r))) return false;
      return HEX_DIRECTIONS.some((dir) => {
        const neighbor = tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
        return neighbor?.terrain === 'water';
      });
    });
  }, [gameState, knownHexes]);

  const sandGeometry = useMemo(() => createHexRing(0.78, 0.98), []);
  const foamGeometry = useMemo(() => createHexRing(0.88, 1), []);
  const shallowsGeometry = useMemo(() => new THREE.CircleGeometry(0.82, 6), []);
  const landShoreGeometry = useMemo(() => createHexRing(0.82, 0.98), []);
  const edgeFoamGeometry = useMemo(() => new THREE.BoxGeometry(0.7, 0.018, 0.08), []);
  const edgeSandGeometry = useMemo(() => new THREE.BoxGeometry(0.6, 0.014, 0.12), []);

  const sandMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#dec88d',
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const foamMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#effff7',
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const shallowsMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#64c1ad',
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const landShoreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#e0ca8d',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const rockyShoreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#4f5f59',
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const coldShoreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#d8eee8',
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);
  const edgeFoamMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f7fff6',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }), []);
  const edgeSandMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#d8bd75',
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }), []);

  if (coastalWaterTiles.length === 0 && shoreLandTiles.length === 0) return null;

  return (
    <group>
      {coastalWaterTiles.map((tile) => {
        const [wx, , wz] = hexToWorld(tile.coord);
        const phase = (tile.coord.q * 17 + tile.coord.r * 31) % 6;
        const rotation = -Math.PI / 2 + phase * 0.018;
        const shoreEdges = HEX_DIRECTIONS.filter((dir) => {
          const neighbor = gameState?.map.tiles[hexKey(tile.coord.q + dir.q, tile.coord.r + dir.r)];
          return neighbor && neighbor.terrain !== 'water';
        });

        return (
          <group key={`coast-${tile.coord.q},${tile.coord.r}`} position={[wx, COASTAL_WATER_Y, wz]} renderOrder={5}>
            <mesh geometry={shallowsGeometry} rotation={[rotation, 0, 0]}>
              <primitive object={shallowsMaterial} attach="material" />
            </mesh>
            <mesh geometry={sandGeometry} rotation={[rotation, 0, 0]} position={[0, 0.006, 0]}>
              <primitive object={sandMaterial} attach="material" />
            </mesh>
            <mesh geometry={foamGeometry} rotation={[rotation, 0, 0]} position={[0, 0.012, 0]}>
              <primitive object={foamMaterial} attach="material" />
            </mesh>
            {shoreEdges.map((dir, index) => {
              const [nx, , nz] = hexToWorld({ q: tile.coord.q + dir.q, r: tile.coord.r + dir.r });
              const edgeX = nx - wx;
              const edgeZ = nz - wz;
              const length = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ) || 1;
              const ux = edgeX / length;
              const uz = edgeZ / length;
              const yaw = Math.atan2(uz, ux);
              return (
                <group
                  key={`edge-${index}`}
                  position={[ux * 0.72, 0.02, uz * 0.72]}
                  rotation={[0, -yaw, 0]}
                >
                  <mesh geometry={edgeSandGeometry} position={[0, 0, 0]}>
                    <primitive object={edgeSandMaterial} attach="material" />
                  </mesh>
                  <mesh geometry={edgeFoamGeometry} position={[0, 0.012, 0.05]}>
                    <primitive object={edgeFoamMaterial} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
      {shoreLandTiles.map((tile) => {
        const [wx, , wz] = hexToWorld(tile.coord);
        const terrainY = TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
        const shoreMaterial = tile.terrain === 'mountain'
          ? coldShoreMaterial
          : terrainY >= 0.2
            ? rockyShoreMaterial
            : landShoreMaterial;
        return (
          <mesh
            key={`shore-land-${tile.coord.q},${tile.coord.r}`}
            geometry={landShoreGeometry}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[wx, terrainY + 0.17, wz]}
          >
            <primitive object={shoreMaterial} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}

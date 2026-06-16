'use client';

import * as THREE from 'three';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { HexTile } from '@/engine/core/GameState';
import type { HexCoord, TerrainTypeId } from '@/engine/core/types';

export function detailHash(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 127.1 + r * 311.7 + salt * 53.9) * 43758.5453;
  return x - Math.floor(x);
}

export function coordKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function tileKey(tile: HexTile): string {
  return coordKey(tile.coord);
}

export function terrainY(tile: HexTile): number {
  return TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
}

export function detailAnchor(coord: HexCoord, radius: number, salt: number, y: number): THREE.Vector3 {
  const [wx, , wz] = hexToWorld(coord);
  const angle = detailHash(coord.q, coord.r, salt) * Math.PI * 2;
  return new THREE.Vector3(
    wx + Math.cos(angle) * radius,
    y,
    wz + Math.sin(angle) * radius,
  );
}

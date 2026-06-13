// ============================================================================
// Terrain Chunking System — Realms of War
// ============================================================================
// Splits the map into chunks of ~16×16 hexes and merges geometries per chunk
// for better draw call performance on large maps.

import * as THREE from 'three';
import { hexToWorld, HEX_RADIUS } from '@/engine/hex/coordinates';
import { TERRAIN_COLORS, TERRAIN_ELEVATION } from '@/data/terrain';
import type { TerrainTypeId } from '@/engine/core/types';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A chunk of terrain geometry */
export interface TerrainChunk {
  /** Chunk coordinates */
  chunkX: number;
  chunkZ: number;
  /** The merged geometry for all hexes in this chunk */
  geometry: THREE.BufferGeometry;
  /** The material for this chunk */
  material: THREE.Material;
  /** Hex keys ("q,r") contained in this chunk */
  hexKeys: string[];
}

/** Tile data passed to the chunk builder */
export interface TileData {
  terrain: string;
  coord: { q: number; r: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default chunk size in hexes (each chunk covers chunkSize × chunkSize hexes) */
const DEFAULT_CHUNK_SIZE = 16;

/** Extrusion height for each hex tile */
const HEX_EXTRUSION_HEIGHT = 0.15;

/** Slight inset for hex gaps (0.95 × radius) */
const HEX_RENDER_RADIUS = 0.95;

// ─── Chunk Key Helpers ───────────────────────────────────────────────────────

/**
 * Get the chunk key for a hex position.
 * Chunks are indexed by floor-dividing the axial coordinates.
 */
export function getChunkKey(q: number, r: number, chunkSize: number = DEFAULT_CHUNK_SIZE): string {
  const cx = Math.floor(q / chunkSize);
  const cz = Math.floor(r / chunkSize);
  return `${cx},${cz}`;
}

/**
 * Get chunk coordinates (chunkX, chunkZ) for a hex position.
 */
export function getChunkCoord(
  q: number,
  r: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): { chunkX: number; chunkZ: number } {
  return {
    chunkX: Math.floor(q / chunkSize),
    chunkZ: Math.floor(r / chunkSize),
  };
}

/**
 * Get all hex keys in a chunk. This requires knowing the actual hexes
 * that exist in the map — it returns the chunk key pattern for filtering.
 */
export function getHexesInChunk(
  chunkX: number,
  chunkZ: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): string[] {
  // Returns hex key patterns for this chunk range
  // Callers should filter their actual map tiles against these ranges
  const keys: string[] = [];
  const qStart = chunkX * chunkSize;
  const rStart = chunkZ * chunkSize;
  for (let q = qStart; q < qStart + chunkSize; q++) {
    for (let r = rStart; r < rStart + chunkSize; r++) {
      keys.push(`${q},${r}`);
    }
  }
  return keys;
}

// ─── Pointy-Top Hex Corners ─────────────────────────────────────────────────

/** Compute hex corners for chunk geometry building */
function hexCornersXZ(cx: number, cz: number, radius: number): Array<[number, number]> {
  const corners: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push([cx + radius * Math.cos(angleRad), cz + radius * Math.sin(angleRad)]);
  }
  return corners;
}

// ─── Build Single Hex Geometry Data ─────────────────────────────────────────

/**
 * Build the raw geometry data (positions, normals, uvs, indices) for a single
 * hex tile positioned in world space. Offsets all indices by the provided base.
 */
function buildHexData(
  worldX: number,
  worldZ: number,
  elevation: number,
  baseIndex: number,
): {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const topY = elevation + HEX_EXTRUSION_HEIGHT;
  const bottomY = elevation;
  const corners = hexCornersXZ(worldX, worldZ, HEX_RENDER_RADIUS);

  // ── Top Face (fan from center) ──────────────────────────────────────
  // Center vertex
  positions.push(worldX, topY, worldZ);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);

  // Corner vertices
  for (let i = 0; i < 6; i++) {
    const [cx, cz] = corners[i];
    positions.push(cx, topY, cz);
    normals.push(0, 1, 0);
    uvs.push(
      0.5 + (cx - worldX) / (2 * HEX_RENDER_RADIUS),
      0.5 + (cz - worldZ) / (2 * HEX_RENDER_RADIUS),
    );
  }

  // Fan triangles (center = baseIndex, corners = baseIndex+1..+6)
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    indices.push(baseIndex, baseIndex + 1 + i, baseIndex + 1 + next);
  }

  let vi = baseIndex + 7; // 1 center + 6 corners

  // ── Side Faces ──────────────────────────────────────────────────────
  for (let side = 0; side < 6; side++) {
    const c0 = corners[side];
    const c1 = corners[(side + 1) % 6];

    // Outward normal
    const edgeX = c1[0] - c0[0];
    const edgeZ = c1[1] - c0[1];
    const len = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ);
    const nx = len > 0 ? -edgeZ / len : 0;
    const nz = len > 0 ? edgeX / len : 1;

    // 4 vertices: top-left, top-right, bottom-left, bottom-right
    positions.push(c0[0], topY, c0[1]);
    normals.push(nx, 0, nz);
    uvs.push(0, 1);

    positions.push(c1[0], topY, c1[1]);
    normals.push(nx, 0, nz);
    uvs.push(1, 1);

    positions.push(c0[0], bottomY, c0[1]);
    normals.push(nx, 0, nz);
    uvs.push(0, 0);

    positions.push(c1[0], bottomY, c1[1]);
    normals.push(nx, 0, nz);
    uvs.push(1, 0);

    // Two triangles for the quad
    indices.push(vi, vi + 2, vi + 1);
    indices.push(vi + 1, vi + 2, vi + 3);

    vi += 4;
  }

  return {
    positions,
    normals,
    uvs,
    indices,
    vertexCount: vi - baseIndex,
  };
}

// ─── Build Terrain Chunks ────────────────────────────────────────────────────

/**
 * Build terrain chunks from map data.
 *
 * Groups tiles by their chunk coordinate, then merges all hex geometries
 * within each chunk into a single BufferGeometry for efficient rendering.
 *
 * Each chunk gets its own material colored by the dominant terrain type
 * (with vertex colors for per-hex terrain variation).
 */
export function buildTerrainChunks(
  tiles: Record<string, TileData>,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): TerrainChunk[] {
  // ── Group tiles by chunk ──────────────────────────────────────────────
  const chunkMap = new Map<string, { chunkX: number; chunkZ: number; tiles: TileData[] }>();

  for (const tile of Object.values(tiles)) {
    const { chunkX, chunkZ } = getChunkCoord(tile.coord.q, tile.coord.r, chunkSize);
    const key = `${chunkX},${chunkZ}`;

    if (!chunkMap.has(key)) {
      chunkMap.set(key, { chunkX, chunkZ, tiles: [] });
    }
    chunkMap.get(key)!.tiles.push(tile);
  }

  // ── Build merged geometry per chunk ───────────────────────────────────
  const chunks: TerrainChunk[] = [];

  for (const [, chunkData] of chunkMap) {
    const { chunkX, chunkZ, tiles: chunkTiles } = chunkData;

    const allPositions: number[] = [];
    const allNormals: number[] = [];
    const allUvs: number[] = [];
    const allColors: number[] = [];
    const allIndices: number[] = [];
    const hexKeys: string[] = [];

    let baseIndex = 0;

    for (const tile of chunkTiles) {
      const [wx, , wz] = hexToWorld(tile.coord);
      const elevation = TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
      const hexData = buildHexData(wx, wz, elevation, baseIndex);

      allPositions.push(...hexData.positions);
      allNormals.push(...hexData.normals);
      allUvs.push(...hexData.uvs);
      allIndices.push(...hexData.indices);

      // Vertex colors based on terrain type
      const color = new THREE.Color(
        TERRAIN_COLORS[tile.terrain as TerrainTypeId] ?? '#555555',
      );
      const vertexCount = hexData.vertexCount;
      for (let v = 0; v < vertexCount; v++) {
        allColors.push(color.r, color.g, color.b);
      }

      baseIndex += vertexCount;
      hexKeys.push(`${tile.coord.q},${tile.coord.r}`);
    }

    // Create merged BufferGeometry for this chunk
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
    geometry.setIndex(allIndices);
    geometry.computeBoundingSphere();

    // Chunk material uses vertex colors
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    chunks.push({
      chunkX,
      chunkZ,
      geometry,
      material,
      hexKeys,
    });
  }

  return chunks;
}

/**
 * Dispose all terrain chunk resources.
 */
export function disposeChunks(chunks: TerrainChunk[]): void {
  for (const chunk of chunks) {
    chunk.geometry.dispose();
    chunk.material.dispose();
  }
}

// ============================================================================
// Hex Geometry Builder — Realms of War
// ============================================================================
// Builds optimized pointy-top hex geometry with proper normals, UVs, and
// shared vertices for optimal rendering performance.

import * as THREE from 'three';
import { HEX_RADIUS } from '@/engine/hex/coordinates';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Options for hex geometry */
export interface HexGeometryOptions {
  /** Hex radius (default: 1.0) */
  radius: number;
  /** Extrusion height (default: 0.15) */
  height: number;
  /** Whether to include top face (default: true) */
  includeTop: boolean;
  /** Whether to include side faces (default: true) */
  includeSides: boolean;
  /** Number of segments per side (default: 1) */
  segments: number;
}

// ─── Default Options ─────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: HexGeometryOptions = {
  radius: HEX_RADIUS,
  height: 0.15,
  includeTop: true,
  includeSides: true,
  segments: 1,
};

// ─── Pointy-Top Hex Corners ─────────────────────────────────────────────────

/**
 * Compute the 6 corner positions of a pointy-top hex on the XZ plane.
 * Corners start at angle -30° (330°) and go counter-clockwise every 60°.
 *
 * This matches the hexToWorld coordinate system:
 *   corner_i angle = 60° * i - 30°
 */
function hexCorners(radius: number): THREE.Vector2[] {
  const corners: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push(new THREE.Vector2(radius * Math.cos(angleRad), radius * Math.sin(angleRad)));
  }
  return corners;
}

// ─── Main Geometry Builder ───────────────────────────────────────────────────

/**
 * Build an optimized hex geometry with merged vertices.
 *
 * The hex lies on the XZ plane (Y is up). The extrusion goes upward
 * along Y by the specified height.
 *
 * The geometry includes:
 * - Top face (hexagonal polygon with center vertex for proper UVs)
 * - Side faces (6 quads connecting top and bottom edges)
 * - Bottom face (optional, typically not needed for terrain tiles)
 *
 * All faces use proper normals and UVs for lighting and texturing.
 */
export function buildHexGeometry(
  options?: Partial<HexGeometryOptions>,
): THREE.BufferGeometry {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { radius, height, includeTop, includeSides } = opts;

  const corners = hexCorners(radius);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let vertexIndex = 0;

  // ── Top Face ──────────────────────────────────────────────────────────
  // Fan triangulation from center: center + 6 corners = 7 vertices
  // Each triangle: center → corner_i → corner_(i+1)
  if (includeTop) {
    const topY = height;

    // Center vertex (index 0)
    positions.push(0, topY, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    vertexIndex = 1; // center is vertex 0

    // Corner vertices
    for (let i = 0; i < 6; i++) {
      const c = corners[i];
      positions.push(c.x, topY, c.y);
      normals.push(0, 1, 0);
      // Map corner to UV: normalize by diameter
      uvs.push(0.5 + c.x / (2 * radius), 0.5 + c.y / (2 * radius));
    }

    // Triangles (winding: CCW from top view = front face)
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      indices.push(0, 1 + next, 1 + i);
    }

    vertexIndex = 7; // 1 center + 6 corners
  }

  // ── Side Faces ────────────────────────────────────────────────────────
  // For each of the 6 sides, create a quad (2 triangles) connecting
  // top edge to bottom edge.
  if (includeSides) {
    const topY = height;
    const bottomY = 0;

    for (let side = 0; side < 6; side++) {
      const c0 = corners[side];
      const c1 = corners[(side + 1) % 6];

      // Calculate outward normal for this side
      const edgeX = c1.x - c0.x;
      const edgeZ = c1.y - c0.y;
      // Normal is perpendicular to edge, pointing outward
      const len = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ);
      const nx = -edgeZ / len;
      const nz = edgeX / len;

      // 4 vertices per side quad
      const baseIdx = vertexIndex;

      // Top-left (c0 at topY)
      positions.push(c0.x, topY, c0.y);
      normals.push(nx, 0, nz);
      uvs.push(0, 1);

      // Top-right (c1 at topY)
      positions.push(c1.x, topY, c1.y);
      normals.push(nx, 0, nz);
      uvs.push(1, 1);

      // Bottom-left (c0 at bottomY)
      positions.push(c0.x, bottomY, c0.y);
      normals.push(nx, 0, nz);
      uvs.push(0, 0);

      // Bottom-right (c1 at bottomY)
      positions.push(c1.x, bottomY, c1.y);
      normals.push(nx, 0, nz);
      uvs.push(1, 0);

      // Two triangles for the quad (CCW winding)
      indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
      indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);

      vertexIndex += 4;
    }
  }

  // ── Build BufferGeometry ──────────────────────────────────────────────
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

// ── Flat Hex ─────────────────────────────────────────────────────────────────

/**
 * Build a flat hex (no extrusion, just the top face on the Y=0 plane).
 * Useful for grid overlays, selection highlights, and UI indicators.
 */
export function buildFlatHexGeometry(radius: number = HEX_RADIUS): THREE.BufferGeometry {
  const corners = hexCorners(radius);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Center vertex
  positions.push(0, 0, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);

  // Corner vertices
  for (let i = 0; i < 6; i++) {
    const c = corners[i];
    positions.push(c.x, 0, c.y);
    normals.push(0, 1, 0);
    uvs.push(0.5 + c.x / (2 * radius), 0.5 + c.y / (2 * radius));
  }

  // Fan triangles
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    indices.push(0, 1 + next, 1 + i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

// ── Cached Default Singleton ─────────────────────────────────────────────────

let _defaultHexGeometry: THREE.BufferGeometry | null = null;
let _defaultFlatHexGeometry: THREE.BufferGeometry | null = null;

/**
 * Get the default hex geometry (cached singleton).
 * Uses standard radius and height. Reused across all terrain tiles.
 */
export function getDefaultHexGeometry(): THREE.BufferGeometry {
  if (!_defaultHexGeometry) {
    _defaultHexGeometry = buildHexGeometry();
  }
  return _defaultHexGeometry;
}

/**
 * Get the default flat hex geometry (cached singleton).
 */
export function getDefaultFlatHexGeometry(): THREE.BufferGeometry {
  if (!_defaultFlatHexGeometry) {
    _defaultFlatHexGeometry = buildFlatHexGeometry();
  }
  return _defaultFlatHexGeometry;
}

/**
 * Dispose cached default geometries. Call on game shutdown.
 */
export function disposeDefaultGeometries(): void {
  if (_defaultHexGeometry) {
    _defaultHexGeometry.dispose();
    _defaultHexGeometry = null;
  }
  if (_defaultFlatHexGeometry) {
    _defaultFlatHexGeometry.dispose();
    _defaultFlatHexGeometry = null;
  }
}

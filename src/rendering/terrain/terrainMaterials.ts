// ============================================================================
// Terrain Materials — Realms of War
// ============================================================================
// Material definitions and factory functions for terrain rendering.
// Includes standard, instanced, explored (fog), and hidden terrain materials
// with a shared material cache for performance.

import * as THREE from 'three';
import { TERRAIN_COLORS } from '@/data/terrain';
import type { TerrainTypeId } from '@/engine/core/types';

// ─── Material Cache ──────────────────────────────────────────────────────────

/** Material cache to avoid creating duplicates */
export const materialCache: Map<string, THREE.Material> = new Map();

/** Cache key helper for terrain materials */
function terrainCacheKey(terrain: TerrainTypeId, variant: string): string {
  return `terrain:${terrain}:${variant}`;
}

const TERRAIN_MATERIAL_TUNING: Record<TerrainTypeId, {
  roughness: number;
  metalness: number;
  saturation: number;
  lightness: number;
}> = {
  plains: { roughness: 0.94, metalness: 0.01, saturation: 1.16, lightness: 1.08 },
  forest: { roughness: 0.98, metalness: 0.0, saturation: 1.18, lightness: 0.82 },
  mountain: { roughness: 0.86, metalness: 0.05, saturation: 0.7, lightness: 1.12 },
  water: { roughness: 0.28, metalness: 0.04, saturation: 1.28, lightness: 1.1 },
  desert: { roughness: 0.99, metalness: 0.0, saturation: 1.02, lightness: 1.13 },
  swamp: { roughness: 0.98, metalness: 0.0, saturation: 0.9, lightness: 0.78 },
  hills: { roughness: 0.93, metalness: 0.02, saturation: 1.02, lightness: 0.98 },
  ruins: { roughness: 0.9, metalness: 0.03, saturation: 0.52, lightness: 1.04 },
};

function tunedTerrainColor(terrain: TerrainTypeId): THREE.Color {
  const tuning = TERRAIN_MATERIAL_TUNING[terrain];
  const color = new THREE.Color(TERRAIN_COLORS[terrain] ?? '#555555');
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return new THREE.Color().setHSL(
    hsl.h,
    Math.min(1, hsl.s * tuning.saturation),
    Math.min(1, hsl.l * tuning.lightness),
  );
}

// ─── Standard Terrain Material ───────────────────────────────────────────────

/**
 * Create a material for a terrain type.
 *
 * Uses the terrain color from TERRAIN_COLORS with standard PBR settings
 * suitable for a strategy game terrain tile. Cached for reuse.
 */
export function createTerrainMaterial(terrain: TerrainTypeId): THREE.MeshStandardMaterial {
  const key = terrainCacheKey(terrain, 'standard');
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const tuning = TERRAIN_MATERIAL_TUNING[terrain];
  const material = new THREE.MeshStandardMaterial({
    color: tunedTerrainColor(terrain),
    roughness: tuning.roughness,
    metalness: tuning.metalness,
    flatShading: true,
  });

  materialCache.set(key, material);
  return material;
}

// ─── Instanced Terrain Material ──────────────────────────────────────────────

/**
 * Create an instanced material for terrain rendering.
 *
 * This material supports per-instance colors via the `instanceColor`
 * buffer attribute on InstancedMesh. Used when all terrain tiles share
 * a single InstancedMesh with different colors per instance.
 */
export function createInstancedTerrainMaterial(): THREE.MeshStandardMaterial {
  const key = 'terrain:instanced:standard';
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0.03,
    flatShading: true,
    // Color will be provided per-instance via instanceColor
    vertexColors: false,
  });

  materialCache.set(key, material);
  return material;
}

// ─── Explored (Fog) Terrain Material ─────────────────────────────────────────

/**
 * Create a material for explored but not currently visible terrain.
 *
 * Explored terrain is shown in a dimmed, desaturated version of the
 * normal terrain color to indicate fog of war — the player has seen
 * this tile before but doesn't have current vision.
 */
export function createExploredTerrainMaterial(terrain: TerrainTypeId): THREE.MeshStandardMaterial {
  const key = terrainCacheKey(terrain, 'explored');
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const baseColor = new THREE.Color(TERRAIN_COLORS[terrain] ?? '#555555');

  // Desaturate and darken for fog-of-war explored state
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);
  const exploredColor = new THREE.Color().setHSL(
    hsl.h,
    hsl.s * 0.3, // significantly desaturated
    hsl.l * 0.5, // significantly darkened
  );

  const material = new THREE.MeshStandardMaterial({
    color: exploredColor,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
    transparent: true,
    opacity: 0.7,
  });

  materialCache.set(key, material);
  return material;
}

// ─── Hidden Terrain Material ─────────────────────────────────────────────────

/**
 * Create a material for hidden (never explored) terrain.
 *
 * Completely unexplored tiles are shown as a dark, uniform color
 * to indicate the player has no information about this area.
 */
export function createHiddenTerrainMaterial(): THREE.MeshStandardMaterial {
  const key = 'terrain:hidden:standard';
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1a1a2e'),
    roughness: 1.0,
    metalness: 0.0,
    flatShading: true,
  });

  materialCache.set(key, material);
  return material;
}

// ─── Highlight Materials ─────────────────────────────────────────────────────

/** Create a selection highlight material */
export function createSelectionMaterial(): THREE.MeshBasicMaterial {
  const key = 'terrain:selection:highlight';
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshBasicMaterial;

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffdd00'),
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  materialCache.set(key, material);
  return material;
}

/** Create a hover highlight material */
export function createHoverMaterial(): THREE.MeshBasicMaterial {
  const key = 'terrain:hover:highlight';
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshBasicMaterial;

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  materialCache.set(key, material);
  return material;
}

/** Create a movement range highlight material */
export function createMovementRangeMaterial(): THREE.MeshBasicMaterial {
  const key = 'terrain:movement:range';
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshBasicMaterial;

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#4488ff'),
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  materialCache.set(key, material);
  return material;
}

/** Create an attack range highlight material */
export function createAttackRangeMaterial(): THREE.MeshBasicMaterial {
  const key = 'terrain:attack:range';
  const cached = materialCache.get(key);
  if (cached) return cached as THREE.MeshBasicMaterial;

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff4444'),
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  materialCache.set(key, material);
  return material;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/** Dispose all cached materials and clear the cache. */
export function disposeMaterials(): void {
  for (const material of materialCache.values()) {
    material.dispose();
  }
  materialCache.clear();
}

/**
 * Get the number of materials currently in the cache.
 * Useful for debugging memory usage.
 */
export function getMaterialCacheSize(): number {
  return materialCache.size;
}

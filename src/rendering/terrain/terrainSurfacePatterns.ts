import * as THREE from 'three';
import { TERRAIN_COLORS } from '@/data/terrain';
import type { TerrainTypeId } from '@/engine/core/types';

type SurfaceTone = {
  hue: number;
  saturation: number;
  lightness: number;
  sideShade: number;
  edgeShade: number;
  centerLift: number;
  innerLift: number;
  outerLift: number;
  relief: number;
  grain: number;
  coolShadow: number;
};

export const TERRAIN_SURFACE_TONE: Record<TerrainTypeId, SurfaceTone> = {
  plains: { hue: -0.014, saturation: 0.12, lightness: 0.12, sideShade: 0.68, edgeShade: 0.92, centerLift: 0.042, innerLift: 0.018, outerLift: -0.012, relief: 0.035, grain: 0.075, coolShadow: 0.015 },
  forest: { hue: 0.012, saturation: 0.13, lightness: 0.1, sideShade: 0.52, edgeShade: 0.86, centerLift: 0.02, innerLift: 0.028, outerLift: -0.024, relief: 0.055, grain: 0.09, coolShadow: 0.035 },
  mountain: { hue: -0.024, saturation: -0.12, lightness: 0.16, sideShade: 0.5, edgeShade: 0.84, centerLift: 0.07, innerLift: 0.09, outerLift: -0.03, relief: 0.12, grain: 0.11, coolShadow: 0.06 },
  water: { hue: -0.016, saturation: 0.12, lightness: 0.1, sideShade: 0.66, edgeShade: 0.96, centerLift: 0.038, innerLift: 0, outerLift: 0, relief: 0, grain: 0.025, coolShadow: 0.04 },
  desert: { hue: 0.022, saturation: -0.01, lightness: 0.14, sideShade: 0.7, edgeShade: 0.93, centerLift: 0.046, innerLift: 0.022, outerLift: -0.014, relief: 0.032, grain: 0.095, coolShadow: -0.015 },
  swamp: { hue: -0.018, saturation: -0.03, lightness: 0.08, sideShade: 0.5, edgeShade: 0.86, centerLift: 0.016, innerLift: -0.006, outerLift: -0.018, relief: 0.026, grain: 0.085, coolShadow: 0.045 },
  hills: { hue: 0.016, saturation: 0.04, lightness: 0.12, sideShade: 0.58, edgeShade: 0.88, centerLift: 0.046, innerLift: 0.068, outerLift: -0.022, relief: 0.082, grain: 0.095, coolShadow: 0.025 },
  ruins: { hue: -0.012, saturation: -0.16, lightness: 0.12, sideShade: 0.58, edgeShade: 0.88, centerLift: 0.032, innerLift: 0.026, outerLift: -0.016, relief: 0.038, grain: 0.1, coolShadow: 0.02 },
};

export function terrainSurfaceHash(q: number, r: number, salt: number): number {
  const x = Math.sin(q * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

function patchSignal(q: number, r: number, vertexIndex: number): number {
  const broad = terrainSurfaceHash(q, r, vertexIndex + 197) - 0.5;
  const fine = terrainSurfaceHash(q, r, vertexIndex * 3 + 271) - 0.5;
  const diagonal = Math.sin((q * 0.71 + r * 1.17 + vertexIndex * 0.41) * Math.PI);
  return broad * 0.55 + fine * 0.3 + diagonal * 0.15;
}

export function getTerrainSurfaceVertexColor(
  terrain: TerrainTypeId,
  q: number,
  r: number,
  vertexIndex: number,
  normalX: number,
  normalY: number,
  normalZ: number,
): THREE.Color {
  const base = new THREE.Color(TERRAIN_COLORS[terrain] ?? '#555555');
  const tone = TERRAIN_SURFACE_TONE[terrain];
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const tileNoise = terrainSurfaceHash(q, r, 1) - 0.5;
  const vertexNoise = terrainSurfaceHash(q, r, vertexIndex + 7) - 0.5;
  const materialPatch = patchSignal(q, r, vertexIndex) * tone.grain;
  const isTop = normalY > 0.5;
  const lightFacing = THREE.MathUtils.clamp(normalX * -0.35 + normalZ * 0.65, -1, 1);
  const sideShade = isTop
    ? 1
    : THREE.MathUtils.clamp(tone.sideShade + lightFacing * 0.08, 0.48, 0.82);
  const isOuterTop = isTop && vertexIndex >= 7 && vertexIndex <= 12;
  const isInnerTop = isTop && vertexIndex >= 1 && vertexIndex <= 6;
  const edgeShade = isOuterTop ? tone.edgeShade : 1;
  const centerGlow = isTop && vertexIndex === 0 ? tone.centerLift : 0;
  const ringGlow = isInnerTop ? tone.innerLift : isOuterTop ? tone.outerLift : 0;
  const coolShadow = isTop ? tone.coolShadow * Math.max(0, -materialPatch) : 0;
  const lightness = (hsl.l + tone.lightness * vertexNoise + centerGlow + ringGlow + materialPatch) * sideShade * edgeShade;

  return new THREE.Color().setHSL(
    THREE.MathUtils.euclideanModulo(hsl.h + tone.hue * tileNoise - coolShadow, 1),
    THREE.MathUtils.clamp(hsl.s + tone.saturation * tileNoise + Math.abs(materialPatch) * 0.25, 0.05, 0.95),
    THREE.MathUtils.clamp(lightness, 0.08, 0.88),
  );
}

export function terrainTopOffset(terrain: TerrainTypeId, q: number, r: number, vertexIndex: number): number {
  if (terrain === 'water') return 0;
  const tone = TERRAIN_SURFACE_TONE[terrain];
  const ringLift = vertexIndex === 0
    ? tone.centerLift * 0.45
    : vertexIndex <= 6
      ? tone.innerLift
      : tone.outerLift;
  const ridge = (terrainSurfaceHash(q, r, vertexIndex + 131) - 0.5) * tone.relief;
  const materialLift = patchSignal(q, r, vertexIndex + 17) * tone.relief * 0.32;
  return ringLift + ridge + materialLift;
}

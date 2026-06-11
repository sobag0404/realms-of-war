// ============================================================================
// Model Registry — Realms of War
// ============================================================================
// Registry for 3D model definitions using primitive shapes as placeholders
// for future GLB model loading. Each definition describes how to build a
// Three.js mesh from basic shapes (box, sphere, cylinder, cone, compound).

import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Model definition using primitive shapes */
export interface ModelDefinition {
  id: string;
  /** Shape type for primitive generation */
  shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'compound';
  /** Dimensions (width = X, height = Y, depth = Z) */
  dimensions: { width: number; height: number; depth: number };
  /** Base color as CSS string */
  color: string;
  /** Emissive color (subtle glow, optional) */
  emissive?: string;
  /** Additional shapes for compound models */
  children?: Array<{
    shape: 'box' | 'sphere' | 'cylinder' | 'cone';
    position: [number, number, number];
    dimensions: { width: number; height: number; depth: number };
    color: string;
    emissive?: string;
  }>;
}

// ─── Model Definitions ──────────────────────────────────────────────────────
// All unit and building IDs match those in src/data/units.ts and src/data/buildings.ts

export const MODEL_REGISTRY: Record<string, ModelDefinition> = {
  // ===== Player Units =====
  unit_hero: {
    id: 'unit_hero',
    shape: 'compound',
    dimensions: { width: 0.35, height: 0.7, depth: 0.35 },
    color: '#ffd700',
    emissive: '#332200',
    children: [
      { shape: 'cylinder', position: [0, 0.2, 0], dimensions: { width: 0.3, height: 0.5, depth: 0.3 }, color: '#ffd700', emissive: '#332200' },
      { shape: 'sphere',   position: [0, 0.55, 0], dimensions: { width: 0.18, height: 0.18, depth: 0.18 }, color: '#ffe066' },
      { shape: 'cone',     position: [0, 0.7, 0],  dimensions: { width: 0.2, height: 0.2, depth: 0.2 }, color: '#cc0000' },
    ],
  },
  unit_settler: {
    id: 'unit_settler',
    shape: 'compound',
    dimensions: { width: 0.3, height: 0.5, depth: 0.3 },
    color: '#4488cc',
    children: [
      { shape: 'box',      position: [0, 0.15, 0], dimensions: { width: 0.25, height: 0.35, depth: 0.25 }, color: '#4488cc' },
      { shape: 'sphere',   position: [0, 0.4, 0],  dimensions: { width: 0.14, height: 0.14, depth: 0.14 }, color: '#ddccaa' },
      { shape: 'cylinder', position: [0, 0.5, 0.1], dimensions: { width: 0.08, height: 0.2, depth: 0.08 }, color: '#8B4513' },
    ],
  },
  unit_worker: {
    id: 'unit_worker',
    shape: 'compound',
    dimensions: { width: 0.28, height: 0.45, depth: 0.28 },
    color: '#aa8844',
    children: [
      { shape: 'box',    position: [0, 0.15, 0],  dimensions: { width: 0.24, height: 0.3, depth: 0.24 }, color: '#aa8844' },
      { shape: 'sphere', position: [0, 0.37, 0],  dimensions: { width: 0.13, height: 0.13, depth: 0.13 }, color: '#ddccaa' },
    ],
  },
  unit_spearman: {
    id: 'unit_spearman',
    shape: 'compound',
    dimensions: { width: 0.3, height: 0.6, depth: 0.3 },
    color: '#cc4444',
    children: [
      { shape: 'cylinder', position: [0, 0.2, 0],    dimensions: { width: 0.26, height: 0.4, depth: 0.26 }, color: '#cc4444' },
      { shape: 'sphere',   position: [0, 0.48, 0],   dimensions: { width: 0.14, height: 0.14, depth: 0.14 }, color: '#ddccaa' },
      { shape: 'cylinder', position: [0.05, 0.45, 0], dimensions: { width: 0.03, height: 0.5, depth: 0.03 }, color: '#666666' },
    ],
  },
  unit_scout: {
    id: 'unit_scout',
    shape: 'compound',
    dimensions: { width: 0.25, height: 0.5, depth: 0.25 },
    color: '#44aa66',
    children: [
      { shape: 'cylinder', position: [0, 0.18, 0],  dimensions: { width: 0.2, height: 0.35, depth: 0.2 }, color: '#44aa66' },
      { shape: 'sphere',   position: [0, 0.42, 0],  dimensions: { width: 0.12, height: 0.12, depth: 0.12 }, color: '#ddccaa' },
    ],
  },
  unit_archer: {
    id: 'unit_archer',
    shape: 'compound',
    dimensions: { width: 0.25, height: 0.55, depth: 0.25 },
    color: '#44cc44',
    children: [
      { shape: 'cylinder', position: [0, 0.18, 0],  dimensions: { width: 0.22, height: 0.35, depth: 0.22 }, color: '#44cc44' },
      { shape: 'sphere',   position: [0, 0.42, 0],  dimensions: { width: 0.13, height: 0.13, depth: 0.13 }, color: '#ddccaa' },
      { shape: 'cylinder', position: [-0.1, 0.35, 0.05], dimensions: { width: 0.02, height: 0.4, depth: 0.02 }, color: '#8B4513' },
    ],
  },
  unit_swordsman: {
    id: 'unit_swordsman',
    shape: 'compound',
    dimensions: { width: 0.32, height: 0.6, depth: 0.32 },
    color: '#7777cc',
    children: [
      { shape: 'cylinder', position: [0, 0.2, 0],    dimensions: { width: 0.28, height: 0.4, depth: 0.28 }, color: '#7777cc' },
      { shape: 'sphere',   position: [0, 0.48, 0],   dimensions: { width: 0.15, height: 0.15, depth: 0.15 }, color: '#ddccaa' },
      { shape: 'box',      position: [0.15, 0.35, 0], dimensions: { width: 0.04, height: 0.35, depth: 0.04 }, color: '#cccccc' },
    ],
  },
  unit_knight: {
    id: 'unit_knight',
    shape: 'compound',
    dimensions: { width: 0.4, height: 0.7, depth: 0.4 },
    color: '#cccccc',
    children: [
      { shape: 'cylinder', position: [0, 0.22, 0],  dimensions: { width: 0.34, height: 0.45, depth: 0.34 }, color: '#888899' },
      { shape: 'sphere',   position: [0, 0.52, 0],  dimensions: { width: 0.16, height: 0.16, depth: 0.16 }, color: '#cccccc' },
      { shape: 'cone',     position: [0, 0.68, 0],  dimensions: { width: 0.18, height: 0.2, depth: 0.18 }, color: '#cc0000' },
      { shape: 'box',      position: [0.18, 0.4, 0], dimensions: { width: 0.05, height: 0.4, depth: 0.04 }, color: '#dddddd' },
    ],
  },
  unit_mage: {
    id: 'unit_mage',
    shape: 'compound',
    dimensions: { width: 0.28, height: 0.6, depth: 0.28 },
    color: '#9944cc',
    emissive: '#1a0033',
    children: [
      { shape: 'cylinder', position: [0, 0.2, 0],  dimensions: { width: 0.24, height: 0.4, depth: 0.24 }, color: '#9944cc', emissive: '#1a0033' },
      { shape: 'sphere',   position: [0, 0.48, 0], dimensions: { width: 0.14, height: 0.14, depth: 0.14 }, color: '#ddccaa' },
      { shape: 'cone',     position: [0, 0.6, 0],  dimensions: { width: 0.22, height: 0.22, depth: 0.22 }, color: '#6622aa' },
      { shape: 'sphere',   position: [0.12, 0.55, 0.05], dimensions: { width: 0.06, height: 0.06, depth: 0.06 }, color: '#ff66ff', emissive: '#330033' },
    ],
  },
  unit_crossbowman: {
    id: 'unit_crossbowman',
    shape: 'compound',
    dimensions: { width: 0.28, height: 0.55, depth: 0.28 },
    color: '#669944',
    children: [
      { shape: 'cylinder', position: [0, 0.18, 0],  dimensions: { width: 0.24, height: 0.35, depth: 0.24 }, color: '#669944' },
      { shape: 'sphere',   position: [0, 0.42, 0],  dimensions: { width: 0.13, height: 0.13, depth: 0.13 }, color: '#ddccaa' },
      { shape: 'box',      position: [-0.1, 0.38, 0.08], dimensions: { width: 0.2, height: 0.04, depth: 0.04 }, color: '#8B4513' },
    ],
  },
  unit_catapult: {
    id: 'unit_catapult',
    shape: 'compound',
    dimensions: { width: 0.5, height: 0.4, depth: 0.5 },
    color: '#8B6914',
    children: [
      { shape: 'box',      position: [0, 0.1, 0],  dimensions: { width: 0.45, height: 0.2, depth: 0.35 }, color: '#8B6914' },
      { shape: 'cylinder', position: [0, 0.25, -0.1], dimensions: { width: 0.06, height: 0.35, depth: 0.06 }, color: '#666666' },
      { shape: 'cylinder', position: [0.2, 0.05, 0.15], dimensions: { width: 0.08, height: 0.08, depth: 0.08 }, color: '#555555' },
      { shape: 'cylinder', position: [-0.2, 0.05, 0.15], dimensions: { width: 0.08, height: 0.08, depth: 0.08 }, color: '#555555' },
    ],
  },
  unit_paladin: {
    id: 'unit_paladin',
    shape: 'compound',
    dimensions: { width: 0.38, height: 0.75, depth: 0.38 },
    color: '#eeeecc',
    emissive: '#222211',
    children: [
      { shape: 'cylinder', position: [0, 0.22, 0],  dimensions: { width: 0.32, height: 0.45, depth: 0.32 }, color: '#cccc99', emissive: '#222211' },
      { shape: 'sphere',   position: [0, 0.52, 0],  dimensions: { width: 0.16, height: 0.16, depth: 0.16 }, color: '#eeeecc' },
      { shape: 'cone',     position: [0, 0.72, 0],  dimensions: { width: 0.2, height: 0.2, depth: 0.2 }, color: '#ffdd44' },
      { shape: 'box',      position: [0.18, 0.4, 0], dimensions: { width: 0.05, height: 0.45, depth: 0.04 }, color: '#ffffff' },
    ],
  },

  // ===== Enemy Units =====
  unit_goblin: {
    id: 'unit_goblin',
    shape: 'compound',
    dimensions: { width: 0.22, height: 0.4, depth: 0.22 },
    color: '#558833',
    children: [
      { shape: 'cylinder', position: [0, 0.12, 0], dimensions: { width: 0.18, height: 0.25, depth: 0.18 }, color: '#558833' },
      { shape: 'sphere',   position: [0, 0.3, 0],  dimensions: { width: 0.12, height: 0.12, depth: 0.12 }, color: '#88aa44' },
    ],
  },
  unit_goblin_archer: {
    id: 'unit_goblin_archer',
    shape: 'compound',
    dimensions: { width: 0.22, height: 0.42, depth: 0.22 },
    color: '#667733',
    children: [
      { shape: 'cylinder', position: [0, 0.13, 0], dimensions: { width: 0.18, height: 0.26, depth: 0.18 }, color: '#667733' },
      { shape: 'sphere',   position: [0, 0.32, 0], dimensions: { width: 0.11, height: 0.11, depth: 0.11 }, color: '#88aa44' },
      { shape: 'cylinder', position: [-0.08, 0.28, 0.04], dimensions: { width: 0.02, height: 0.3, depth: 0.02 }, color: '#8B4513' },
    ],
  },
  unit_wolf: {
    id: 'unit_wolf',
    shape: 'compound',
    dimensions: { width: 0.35, height: 0.3, depth: 0.5 },
    color: '#666666',
    children: [
      { shape: 'box',    position: [0, 0.1, 0],    dimensions: { width: 0.2, height: 0.18, depth: 0.35 }, color: '#666666' },
      { shape: 'sphere', position: [0, 0.15, -0.2], dimensions: { width: 0.12, height: 0.12, depth: 0.12 }, color: '#777777' },
    ],
  },
  unit_bandit: {
    id: 'unit_bandit',
    shape: 'compound',
    dimensions: { width: 0.3, height: 0.55, depth: 0.3 },
    color: '#554433',
    children: [
      { shape: 'cylinder', position: [0, 0.18, 0], dimensions: { width: 0.24, height: 0.36, depth: 0.24 }, color: '#554433' },
      { shape: 'sphere',   position: [0, 0.43, 0], dimensions: { width: 0.13, height: 0.13, depth: 0.13 }, color: '#aa9977' },
      { shape: 'cylinder', position: [0.12, 0.35, 0], dimensions: { width: 0.03, height: 0.3, depth: 0.03 }, color: '#888888' },
    ],
  },
  unit_cultist: {
    id: 'unit_cultist',
    shape: 'compound',
    dimensions: { width: 0.28, height: 0.55, depth: 0.28 },
    color: '#662244',
    emissive: '#220011',
    children: [
      { shape: 'cylinder', position: [0, 0.18, 0], dimensions: { width: 0.24, height: 0.35, depth: 0.24 }, color: '#662244', emissive: '#220011' },
      { shape: 'sphere',   position: [0, 0.42, 0], dimensions: { width: 0.13, height: 0.13, depth: 0.13 }, color: '#aa8899' },
      { shape: 'cone',     position: [0, 0.55, 0], dimensions: { width: 0.2, height: 0.15, depth: 0.2 }, color: '#440022' },
    ],
  },

  // ===== Buildings =====
  building_city_center: {
    id: 'building_city_center',
    shape: 'compound',
    dimensions: { width: 0.7, height: 0.6, depth: 0.7 },
    color: '#ddcc99',
    children: [
      { shape: 'box',      position: [0, 0.15, 0],  dimensions: { width: 0.6, height: 0.3, depth: 0.6 }, color: '#ddcc99' },
      { shape: 'cone',     position: [0, 0.45, 0],  dimensions: { width: 0.65, height: 0.3, depth: 0.65 }, color: '#bb3322' },
      { shape: 'cylinder', position: [0, 0.6, 0],   dimensions: { width: 0.06, height: 0.15, depth: 0.06 }, color: '#888888' },
    ],
  },
  building_castle: {
    id: 'building_castle',
    shape: 'compound',
    dimensions: { width: 0.8, height: 0.8, depth: 0.8 },
    color: '#999999',
    children: [
      { shape: 'box',  position: [0, 0.2, 0], dimensions: { width: 0.7, height: 0.4, depth: 0.7 }, color: '#999999' },
      { shape: 'box',  position: [0.25, 0.5, 0.25],  dimensions: { width: 0.15, height: 0.2, depth: 0.15 }, color: '#888888' },
      { shape: 'box',  position: [-0.25, 0.5, 0.25], dimensions: { width: 0.15, height: 0.2, depth: 0.15 }, color: '#888888' },
      { shape: 'box',  position: [0.25, 0.5, -0.25], dimensions: { width: 0.15, height: 0.2, depth: 0.15 }, color: '#888888' },
      { shape: 'box',  position: [-0.25, 0.5, -0.25],dimensions: { width: 0.15, height: 0.2, depth: 0.15 }, color: '#888888' },
    ],
  },
  building_barracks: {
    id: 'building_barracks',
    shape: 'compound',
    dimensions: { width: 0.6, height: 0.45, depth: 0.6 },
    color: '#886644',
    children: [
      { shape: 'box',  position: [0, 0.12, 0], dimensions: { width: 0.55, height: 0.25, depth: 0.55 }, color: '#886644' },
      { shape: 'cone', position: [0, 0.35, 0], dimensions: { width: 0.6, height: 0.2, depth: 0.6 }, color: '#664422' },
    ],
  },
  building_archery_range: {
    id: 'building_archery_range',
    shape: 'compound',
    dimensions: { width: 0.55, height: 0.35, depth: 0.65 },
    color: '#779944',
    children: [
      { shape: 'box', position: [0, 0.1, 0], dimensions: { width: 0.5, height: 0.2, depth: 0.6 }, color: '#779944' },
      { shape: 'box', position: [0, 0.25, -0.25], dimensions: { width: 0.5, height: 0.1, depth: 0.04 }, color: '#557722' },
    ],
  },
  building_library: {
    id: 'building_library',
    shape: 'compound',
    dimensions: { width: 0.45, height: 0.5, depth: 0.45 },
    color: '#cc9966',
    children: [
      { shape: 'box',  position: [0, 0.15, 0], dimensions: { width: 0.4, height: 0.3, depth: 0.4 }, color: '#cc9966' },
      { shape: 'cone', position: [0, 0.4, 0],  dimensions: { width: 0.45, height: 0.2, depth: 0.45 }, color: '#996633' },
    ],
  },
  building_granary: {
    id: 'building_granary',
    shape: 'compound',
    dimensions: { width: 0.5, height: 0.4, depth: 0.5 },
    color: '#ccaa55',
    children: [
      { shape: 'cylinder', position: [0, 0.15, 0], dimensions: { width: 0.4, height: 0.3, depth: 0.4 }, color: '#ccaa55' },
      { shape: 'cone',     position: [0, 0.35, 0], dimensions: { width: 0.45, height: 0.15, depth: 0.45 }, color: '#aa8833' },
    ],
  },
  building_market: {
    id: 'building_market',
    shape: 'compound',
    dimensions: { width: 0.55, height: 0.4, depth: 0.55 },
    color: '#dd8844',
    children: [
      { shape: 'box',  position: [0, 0.1, 0], dimensions: { width: 0.5, height: 0.2, depth: 0.5 }, color: '#dd8844' },
      { shape: 'cone', position: [0, 0.3, 0], dimensions: { width: 0.55, height: 0.2, depth: 0.55 }, color: '#cc6622' },
    ],
  },
  building_workshop: {
    id: 'building_workshop',
    shape: 'compound',
    dimensions: { width: 0.5, height: 0.4, depth: 0.5 },
    color: '#888888',
    children: [
      { shape: 'box', position: [0, 0.12, 0], dimensions: { width: 0.45, height: 0.24, depth: 0.45 }, color: '#888888' },
      { shape: 'box', position: [0, 0.3, 0],  dimensions: { width: 0.35, height: 0.12, depth: 0.35 }, color: '#777777' },
    ],
  },
  building_blacksmith: {
    id: 'building_blacksmith',
    shape: 'compound',
    dimensions: { width: 0.45, height: 0.4, depth: 0.45 },
    color: '#666666',
    children: [
      { shape: 'box',      position: [0, 0.1, 0],   dimensions: { width: 0.4, height: 0.2, depth: 0.4 }, color: '#666666' },
      { shape: 'cylinder', position: [0.1, 0.25, 0], dimensions: { width: 0.08, height: 0.15, depth: 0.08 }, color: '#444444' },
    ],
  },
  building_mage_tower: {
    id: 'building_mage_tower',
    shape: 'compound',
    dimensions: { width: 0.35, height: 0.8, depth: 0.35 },
    color: '#7744aa',
    emissive: '#110022',
    children: [
      { shape: 'cylinder', position: [0, 0.25, 0], dimensions: { width: 0.28, height: 0.5, depth: 0.28 }, color: '#7744aa', emissive: '#110022' },
      { shape: 'cone',     position: [0, 0.6, 0],  dimensions: { width: 0.35, height: 0.25, depth: 0.35 }, color: '#5522aa' },
      { shape: 'sphere',   position: [0, 0.75, 0], dimensions: { width: 0.08, height: 0.08, depth: 0.08 }, color: '#cc88ff', emissive: '#330066' },
    ],
  },
  building_walls: {
    id: 'building_walls',
    shape: 'box',
    dimensions: { width: 0.6, height: 0.5, depth: 0.12 },
    color: '#aaaaaa',
  },
  building_watchtower: {
    id: 'building_watchtower',
    shape: 'compound',
    dimensions: { width: 0.3, height: 0.7, depth: 0.3 },
    color: '#aa9977',
    children: [
      { shape: 'cylinder', position: [0, 0.2, 0],  dimensions: { width: 0.18, height: 0.4, depth: 0.18 }, color: '#aa9977' },
      { shape: 'cylinder', position: [0, 0.5, 0],  dimensions: { width: 0.28, height: 0.1, depth: 0.28 }, color: '#998866' },
      { shape: 'cone',     position: [0, 0.6, 0],  dimensions: { width: 0.32, height: 0.15, depth: 0.32 }, color: '#776644' },
    ],
  },
  building_temple: {
    id: 'building_temple',
    shape: 'compound',
    dimensions: { width: 0.55, height: 0.55, depth: 0.55 },
    color: '#eeddcc',
    emissive: '#221100',
    children: [
      { shape: 'box',  position: [0, 0.1, 0], dimensions: { width: 0.5, height: 0.2, depth: 0.5 }, color: '#eeddcc' },
      { shape: 'cone', position: [0, 0.35, 0], dimensions: { width: 0.55, height: 0.25, depth: 0.55 }, color: '#ddccbb' },
      { shape: 'sphere', position: [0, 0.5, 0], dimensions: { width: 0.08, height: 0.08, depth: 0.08 }, color: '#ffddaa', emissive: '#332200' },
    ],
  },
  building_harbor: {
    id: 'building_harbor',
    shape: 'compound',
    dimensions: { width: 0.6, height: 0.3, depth: 0.6 },
    color: '#5588aa',
    children: [
      { shape: 'box',      position: [0, 0.08, 0],   dimensions: { width: 0.55, height: 0.15, depth: 0.55 }, color: '#5588aa' },
      { shape: 'cylinder', position: [0, 0.2, 0],    dimensions: { width: 0.06, height: 0.2, depth: 0.06 }, color: '#8B4513' },
    ],
  },
  building_university: {
    id: 'building_university',
    shape: 'compound',
    dimensions: { width: 0.55, height: 0.55, depth: 0.55 },
    color: '#bb9977',
    children: [
      { shape: 'box',  position: [0, 0.15, 0], dimensions: { width: 0.5, height: 0.3, depth: 0.5 }, color: '#bb9977' },
      { shape: 'cone', position: [0, 0.4, 0],  dimensions: { width: 0.55, height: 0.2, depth: 0.55 }, color: '#997755' },
    ],
  },
  building_bank: {
    id: 'building_bank',
    shape: 'compound',
    dimensions: { width: 0.5, height: 0.5, depth: 0.5 },
    color: '#ccaa44',
    children: [
      { shape: 'box', position: [0, 0.12, 0], dimensions: { width: 0.45, height: 0.24, depth: 0.45 }, color: '#ccaa44' },
      { shape: 'box', position: [0, 0.3, 0],  dimensions: { width: 0.35, height: 0.15, depth: 0.35 }, color: '#ddbb55' },
    ],
  },
  building_guild_hall: {
    id: 'building_guild_hall',
    shape: 'compound',
    dimensions: { width: 0.55, height: 0.5, depth: 0.55 },
    color: '#887766',
    children: [
      { shape: 'box',  position: [0, 0.12, 0], dimensions: { width: 0.5, height: 0.24, depth: 0.5 }, color: '#887766' },
      { shape: 'cone', position: [0, 0.35, 0], dimensions: { width: 0.55, height: 0.2, depth: 0.55 }, color: '#665544' },
    ],
  },
  building_siege_yard: {
    id: 'building_siege_yard',
    shape: 'compound',
    dimensions: { width: 0.6, height: 0.35, depth: 0.6 },
    color: '#776655',
    children: [
      { shape: 'box', position: [0, 0.1, 0], dimensions: { width: 0.55, height: 0.2, depth: 0.55 }, color: '#776655' },
      { shape: 'box', position: [0, 0.25, 0], dimensions: { width: 0.3, height: 0.1, depth: 0.3 }, color: '#665544' },
    ],
  },
  building_alchemist_lab: {
    id: 'building_alchemist_lab',
    shape: 'compound',
    dimensions: { width: 0.4, height: 0.45, depth: 0.4 },
    color: '#776688',
    emissive: '#110011',
    children: [
      { shape: 'box',      position: [0, 0.12, 0], dimensions: { width: 0.35, height: 0.24, depth: 0.35 }, color: '#776688' },
      { shape: 'cone',     position: [0, 0.32, 0], dimensions: { width: 0.4, height: 0.18, depth: 0.4 }, color: '#554466' },
      { shape: 'sphere',   position: [0, 0.42, 0], dimensions: { width: 0.06, height: 0.06, depth: 0.06 }, color: '#88ff88', emissive: '#003300' },
    ],
  },
  building_astral_observatory: {
    id: 'building_astral_observatory',
    shape: 'compound',
    dimensions: { width: 0.45, height: 0.7, depth: 0.45 },
    color: '#667799',
    emissive: '#001122',
    children: [
      { shape: 'cylinder', position: [0, 0.2, 0], dimensions: { width: 0.35, height: 0.4, depth: 0.35 }, color: '#667799' },
      { shape: 'sphere',   position: [0, 0.5, 0], dimensions: { width: 0.3, height: 0.2, depth: 0.3 }, color: '#8899bb' },
      { shape: 'cylinder', position: [0, 0.65, 0], dimensions: { width: 0.04, height: 0.15, depth: 0.04 }, color: '#aaaaaa' },
    ],
  },

  // ===== Wonders =====
  wonder_sun_obelisk: {
    id: 'wonder_sun_obelisk',
    shape: 'compound',
    dimensions: { width: 0.3, height: 1.0, depth: 0.3 },
    color: '#ffcc44',
    emissive: '#332200',
    children: [
      { shape: 'box',    position: [0, 0.35, 0], dimensions: { width: 0.2, height: 0.7, depth: 0.2 }, color: '#ffcc44', emissive: '#332200' },
      { shape: 'cone',   position: [0, 0.8, 0],  dimensions: { width: 0.22, height: 0.2, depth: 0.22 }, color: '#ffdd66' },
      { shape: 'sphere', position: [0, 0.95, 0], dimensions: { width: 0.1, height: 0.1, depth: 0.1 }, color: '#ffffff', emissive: '#664400' },
    ],
  },
  wonder_world_tree: {
    id: 'wonder_world_tree',
    shape: 'compound',
    dimensions: { width: 0.6, height: 1.2, depth: 0.6 },
    color: '#33aa33',
    emissive: '#002200',
    children: [
      { shape: 'cylinder', position: [0, 0.3, 0], dimensions: { width: 0.15, height: 0.6, depth: 0.15 }, color: '#8B4513' },
      { shape: 'sphere',   position: [0, 0.8, 0], dimensions: { width: 0.55, height: 0.5, depth: 0.55 }, color: '#33aa33', emissive: '#002200' },
      { shape: 'sphere',   position: [0.15, 0.65, 0.1], dimensions: { width: 0.25, height: 0.25, depth: 0.25 }, color: '#44cc44' },
    ],
  },
  wonder_astral_gate: {
    id: 'wonder_astral_gate',
    shape: 'compound',
    dimensions: { width: 0.7, height: 1.0, depth: 0.15 },
    color: '#7766cc',
    emissive: '#110033',
    children: [
      { shape: 'box',      position: [-0.25, 0.35, 0], dimensions: { width: 0.1, height: 0.7, depth: 0.1 }, color: '#7766cc', emissive: '#110033' },
      { shape: 'box',      position: [0.25, 0.35, 0],  dimensions: { width: 0.1, height: 0.7, depth: 0.1 }, color: '#7766cc', emissive: '#110033' },
      { shape: 'box',      position: [0, 0.75, 0],     dimensions: { width: 0.6, height: 0.1, depth: 0.1 }, color: '#8877dd' },
      { shape: 'sphere',   position: [0, 0.4, 0],      dimensions: { width: 0.2, height: 0.3, depth: 0.05 }, color: '#aa99ff', emissive: '#220066' },
    ],
  },
  wonder_great_foundry: {
    id: 'wonder_great_foundry',
    shape: 'compound',
    dimensions: { width: 0.7, height: 0.65, depth: 0.7 },
    color: '#cc6633',
    emissive: '#331100',
    children: [
      { shape: 'box',      position: [0, 0.15, 0], dimensions: { width: 0.6, height: 0.3, depth: 0.6 }, color: '#cc6633', emissive: '#331100' },
      { shape: 'cylinder', position: [0, 0.4, 0],  dimensions: { width: 0.12, height: 0.2, depth: 0.12 }, color: '#444444' },
      { shape: 'sphere',   position: [0, 0.55, 0], dimensions: { width: 0.08, height: 0.08, depth: 0.08 }, color: '#ff6600', emissive: '#331100' },
    ],
  },
};

// ─── Builder Functions ───────────────────────────────────────────────────────

/** Create a BufferGeometry for a given primitive shape. */
function createPrimitiveGeometry(
  shape: 'box' | 'sphere' | 'cylinder' | 'cone',
  dimensions: { width: number; height: number; depth: number },
): THREE.BufferGeometry {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
    case 'sphere':
      return new THREE.SphereGeometry(Math.max(dimensions.width, dimensions.height) / 2, 12, 8);
    case 'cylinder':
      return new THREE.CylinderGeometry(
        dimensions.width / 2,
        dimensions.depth / 2,
        dimensions.height,
        12,
      );
    case 'cone':
      return new THREE.ConeGeometry(
        Math.max(dimensions.width, dimensions.depth) / 2,
        dimensions.height,
        12,
      );
    default: {
      const _exhaustive: never = shape;
      return new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }
  }
}

/** Build a Three.js geometry from a model definition (top-level shape only). */
export function buildGeometry(def: ModelDefinition): THREE.BufferGeometry {
  return createPrimitiveGeometry(def.shape as 'box' | 'sphere' | 'cylinder' | 'cone', def.dimensions);
}

/** Build a Three.js material from a model definition. */
export function buildMaterial(def: ModelDefinition): THREE.MeshStandardMaterial {
  const params: THREE.MeshStandardMaterialParameters = {
    color: new THREE.Color(def.color),
    roughness: 0.7,
    metalness: 0.1,
    flatShading: true,
  };
  if (def.emissive) {
    params.emissive = new THREE.Color(def.emissive);
    params.emissiveIntensity = 0.3;
  }
  return new THREE.MeshStandardMaterial(params);
}

/** Build a complete Three.js mesh (or group) from a model definition. */
export function buildMesh(def: ModelDefinition): THREE.Mesh | THREE.Group {
  // Simple shape — single mesh
  if (def.shape !== 'compound' || !def.children || def.children.length === 0) {
    const geometry = createPrimitiveGeometry(
      def.shape as 'box' | 'sphere' | 'cylinder' | 'cone',
      def.dimensions,
    );
    const material = buildMaterial(def);
    return new THREE.Mesh(geometry, material);
  }

  // Compound — group of child meshes
  const group = new THREE.Group();

  // Add children
  for (const child of def.children) {
    const childGeo = createPrimitiveGeometry(child.shape, child.dimensions);
    const childMatParams: THREE.MeshStandardMaterialParameters = {
      color: new THREE.Color(child.color),
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    };
    if (child.emissive) {
      childMatParams.emissive = new THREE.Color(child.emissive);
      childMatParams.emissiveIntensity = 0.3;
    }
    const childMat = new THREE.MeshStandardMaterial(childMatParams);
    const childMesh = new THREE.Mesh(childGeo, childMat);
    childMesh.position.set(...child.position);
    childMesh.castShadow = true;
    childMesh.receiveShadow = true;
    group.add(childMesh);
  }

  return group;
}

/** Get a model definition by id. Returns undefined if not found. */
export function getModelDefinition(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY[id];
}

/** Get all model ids in the registry. */
export function getAllModelIds(): string[] {
  return Object.keys(MODEL_REGISTRY);
}

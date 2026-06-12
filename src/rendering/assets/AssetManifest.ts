// ============================================================================
// Asset Manifest — Realms of War
// ============================================================================

/** Asset manifest for game resources */

export interface AssetEntry {
  id: string;
  type: 'model' | 'texture' | 'audio' | 'sprite';
  /** Path relative to /public/assets/ */
  path: string;
  /** Whether this asset is needed immediately (preloaded) */
  preload: boolean;
  /** Estimated size in KB */
  sizeKB: number;
  /** Alternative/placeholder to use while loading */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Manifest — ~30 entries covering terrain, units, buildings, UI, audio
// ---------------------------------------------------------------------------
export const ASSET_MANIFEST: AssetEntry[] = [
  // ---- Terrain Textures (8) ----
  { id: 'tex_plains',   type: 'texture', path: 'textures/terrain/plains.jpg',   preload: true,  sizeKB: 50, placeholder: 'tex_placeholder' },
  { id: 'tex_forest',   type: 'texture', path: 'textures/terrain/forest.jpg',   preload: true,  sizeKB: 55, placeholder: 'tex_placeholder' },
  { id: 'tex_mountain', type: 'texture', path: 'textures/terrain/mountain.jpg', preload: true,  sizeKB: 60, placeholder: 'tex_placeholder' },
  { id: 'tex_water',    type: 'texture', path: 'textures/terrain/water.jpg',    preload: true,  sizeKB: 45, placeholder: 'tex_placeholder' },
  { id: 'tex_desert',   type: 'texture', path: 'textures/terrain/desert.jpg',   preload: true,  sizeKB: 48, placeholder: 'tex_placeholder' },
  { id: 'tex_swamp',    type: 'texture', path: 'textures/terrain/swamp.jpg',    preload: true,  sizeKB: 52, placeholder: 'tex_placeholder' },
  { id: 'tex_hills',    type: 'texture', path: 'textures/terrain/hills.jpg',    preload: true,  sizeKB: 50, placeholder: 'tex_placeholder' },
  { id: 'tex_ruins',    type: 'texture', path: 'textures/terrain/ruins.jpg',    preload: true,  sizeKB: 55, placeholder: 'tex_placeholder' },

  // ---- Unit Models (6 — future GLB, using primitives for now) ----
  { id: 'model_hero',        type: 'model', path: 'models/units/hero.glb',        preload: false, sizeKB: 250 },
  { id: 'model_settler',     type: 'model', path: 'models/units/settler.glb',     preload: false, sizeKB: 200 },
  { id: 'model_spearman',    type: 'model', path: 'models/units/spearman.glb',    preload: false, sizeKB: 220 },
  { id: 'model_archer',      type: 'model', path: 'models/units/archer.glb',      preload: false, sizeKB: 210 },
  { id: 'model_swordsman',   type: 'model', path: 'models/units/swordsman.glb',   preload: false, sizeKB: 230 },
  { id: 'model_knight',      type: 'model', path: 'models/units/knight.glb',      preload: false, sizeKB: 280 },

  // ---- Building Models (4 — future GLB, using primitives for now) ----
  { id: 'model_city_center', type: 'model', path: 'models/buildings/city_center.glb', preload: false, sizeKB: 350 },
  { id: 'model_barracks',    type: 'model', path: 'models/buildings/barracks.glb',    preload: false, sizeKB: 300 },
  { id: 'model_walls',       type: 'model', path: 'models/buildings/walls.glb',       preload: false, sizeKB: 320 },
  { id: 'model_mage_tower',  type: 'model', path: 'models/buildings/mage_tower.glb',  preload: false, sizeKB: 310 },

  // ---- UI Sprites (4) ----
  { id: 'sprite_end_turn',     type: 'sprite', path: 'sprites/ui/end_turn.png',     preload: true,  sizeKB: 8 },
  { id: 'sprite_resource_bg',  type: 'sprite', path: 'sprites/ui/resource_bg.png',  preload: true,  sizeKB: 5 },
  { id: 'sprite_portrait_hero',type: 'sprite', path: 'sprites/portraits/hero.png',  preload: false, sizeKB: 30 },
  { id: 'sprite_fog_overlay',  type: 'sprite', path: 'sprites/fog/fog_overlay.png', preload: true,  sizeKB: 12 },

  // ---- Audio (4) ----
  { id: 'audio_click',       type: 'audio', path: 'audio/ui/click.ogg',       preload: true,  sizeKB: 10 },
  { id: 'audio_turn_start',  type: 'audio', path: 'audio/ui/turn_start.ogg',  preload: true,  sizeKB: 25 },
  { id: 'audio_combat_hit',  type: 'audio', path: 'audio/combat/hit.ogg',     preload: false, sizeKB: 20 },
  { id: 'audio_ambient_wind',type: 'audio', path: 'audio/ambient/wind.ogg',   preload: false, sizeKB: 100 },

  // ---- Misc (4) ----
  { id: 'tex_placeholder',      type: 'texture', path: 'textures/util/placeholder.jpg', preload: true, sizeKB: 10 },
  { id: 'tex_selection_ring',   type: 'texture', path: 'textures/util/selection.png',   preload: true, sizeKB: 8 },
  { id: 'model_selection_ring', type: 'model',   path: 'models/util/selection_ring.glb',preload: false, sizeKB: 50 },
  { id: 'sprite_minimap_frame', type: 'sprite',  path: 'sprites/ui/minimap_frame.png', preload: true,  sizeKB: 6 },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Find an asset entry by its unique id. */
export function getAssetById(id: string): AssetEntry | undefined {
  return ASSET_MANIFEST.find((entry) => entry.id === id);
}

/** Get all asset entries of a given type. */
export function getAssetsByType(type: AssetEntry['type']): AssetEntry[] {
  return ASSET_MANIFEST.filter((entry) => entry.type === type);
}

/** Get all assets that should be preloaded (preload: true). */
export function getPreloadAssets(): AssetEntry[] {
  return ASSET_MANIFEST.filter((entry) => entry.preload);
}

/** Total estimated download size in KB for all preloaded assets. */
export function getPreloadSizeKB(): number {
  return getPreloadAssets().reduce((sum, e) => sum + e.sizeKB, 0);
}

/** Total number of assets in the manifest. */
export function getAssetCount(): number {
  return ASSET_MANIFEST.length;
}

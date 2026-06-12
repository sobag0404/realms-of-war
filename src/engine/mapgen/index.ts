/**
 * Map generation module for "Realms of War"
 *
 * Re-exports all map generation utilities from the sub-modules.
 */

// ─── Noise ────────────────────────────────────────────────────────────────────
export { SeededNoise } from './noise';

// ─── Biomes ───────────────────────────────────────────────────────────────────
export {
  assignBiomes,
  classifyTerrain,
  isWalkableTerrain,
  isLandTerrain,
  TERRAIN_ID,
  TERRAIN_ID_STR,
} from './biomes';

// ─── Rivers ───────────────────────────────────────────────────────────────────
export {
  generateRivers,
  computeRiverMasks,
} from './rivers';
export type { River } from './rivers';

// ─── Resources ────────────────────────────────────────────────────────────────
export {
  placeResources,
  isStrategicResource,
  resourceIdToString,
  RESOURCE_ID,
  RESOURCE_ID_STR,
} from './resources';

// ─── Ruins ────────────────────────────────────────────────────────────────────
export { placeRuins } from './ruins';
export type { Ruin } from './ruins';

// ─── Starting Positions ───────────────────────────────────────────────────────
export { findStartingPositions } from './startingPositions';

// ─── Validation ───────────────────────────────────────────────────────────────
export { validateMap } from './validation';
export type { ValidationResult } from './validation';

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export { generateMap } from './generateMap';
export type { MapGenConfig, MapGenResult } from './generateMap';

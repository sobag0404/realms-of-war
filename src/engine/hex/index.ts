/**
 * Hex math module for "Realms of War"
 *
 * Re-exports all hex coordinate, direction, distance, rounding,
 * layout, pathfinding, and map storage utilities.
 */

// ─── Coordinates ─────────────────────────────────────────────────────────────
export type { HexCoord, CubeCoord } from "./coordinates";
export {
  HEX_RADIUS,
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_VERTICAL_STEP,
  axialToCube,
  cubeToAxial,
  hexToWorld,
  worldToFractionalHex,
} from "./coordinates";

// ─── Directions ──────────────────────────────────────────────────────────────
export { HEX_DIRECTIONS, NUM_DIRECTIONS, neighbor, oppositeDirection } from "./directions";

// ─── Distance ────────────────────────────────────────────────────────────────
export { hexDistance, hexLerp } from "./distance";

// ─── Rounding ────────────────────────────────────────────────────────────────
export { roundAxial } from "./rounding";

// ─── Layout ──────────────────────────────────────────────────────────────────
export { hexCorners, hexCenterToWorld } from "./layout";

// ─── Pathfinding ─────────────────────────────────────────────────────────────
export { findPath, findReachable } from "./pathfinding";

// ─── Map Storage ─────────────────────────────────────────────────────────────
export type { MapStorage } from "./mapStorage";
export {
  toIndex,
  fromIndex,
  createMapStorage,
  getTerrainAt,
  setTerrainAt,
  getBiomeAt,
  setBiomeAt,
  getElevationAt,
  setElevationAt,
  getMoistureAt,
  setMoistureAt,
  getTemperatureAt,
  setTemperatureAt,
  getRiverMaskAt,
  setRiverMaskAt,
  getRoadMaskAt,
  setRoadMaskAt,
  getResourceAt,
  setResourceAt,
  getRegionAt,
  setRegionAt,
  getOwnerAt,
  setOwnerAt,
  getCityAt,
  setCityAt,
  getUnitAt,
  setUnitAt,
  isInBounds,
} from "./mapStorage";

// ─── Line of Sight ──────────────────────────────────────────────────────────
export type { LosResult } from "./lineOfSight";
export {
  checkLineOfSight,
  hexLine,
  isTerrainBlocking,
  isElevatedTerrain,
} from "./lineOfSight";

// ─── Regions ────────────────────────────────────────────────────────────────
export type { HexRegion, RegionAnalysis } from "./regions";
export {
  identifyLandRegions,
  getRegionForHex,
  getContiguousHexes,
  areInSameRegion,
  calculateRegionCenter,
} from "./regions";

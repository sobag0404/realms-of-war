/**
 * Typed-array map storage for "Realms of War"
 *
 * Provides a memory-efficient, flat-map representation using typed arrays.
 * Each hex cell stores terrain, biome, elevation, and other game data
 * in parallel typed arrays indexed by a flat integer index.
 *
 * Coordinate convention:
 *   - Axial coordinates (q, r) with offset rows
 *   - q = column (0 to width-1), r = row (0 to height-1)
 *   - Index = r * width + q
 */

// ─── Map Storage Type ────────────────────────────────────────────────────────

export interface MapStorage {
  readonly width: number;
  readonly height: number;
  readonly size: number;
  readonly seed: number;

  // Per-hex typed arrays
  terrain: Uint8Array;       // Terrain type (0-255)
  biome: Uint8Array;         // Biome type (0-255)
  moisture: Uint8Array;      // Moisture level (0-255)
  temperature: Uint8Array;   // Temperature level (0-255)
  elevation: Int16Array;     // Elevation (-32768 to 32767)
  riverMask: Uint8Array;     // River presence per direction (6 bits)
  roadMask: Uint8Array;      // Road presence per direction (6 bits)
  resourceId: Uint16Array;   // Resource identifier (0-65535, 0 = none)
  regionId: Uint16Array;     // Region identifier (0-65535, 0 = unassigned)
  ownerPlayerId: Int16Array; // Owning player (-1 = unowned)
  cityIdByHex: Int32Array;   // City ID at this hex (-1 = no city)
  unitIdByHex: Int32Array;   // Unit ID at this hex (-1 = no unit)
}

// ─── Index Conversion ────────────────────────────────────────────────────────

/**
 * Convert axial (q, r) coordinates to a flat array index.
 *
 * @param q - Column coordinate (0 to width-1)
 * @param r - Row coordinate (0 to height-1)
 * @param width - Map width
 * @returns Flat array index
 */
export function toIndex(q: number, r: number, width: number): number {
  return r * width + q;
}

/**
 * Convert a flat array index back to axial (q, r) coordinates.
 *
 * @param index - Flat array index
 * @param width - Map width
 * @returns Object with q and r coordinates
 */
export function fromIndex(index: number, width: number): { q: number; r: number } {
  return {
    q: index % width,
    r: Math.floor(index / width),
  };
}

// ─── Simple Seeded RNG ───────────────────────────────────────────────────────

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Used to initialize terrain data deterministically from a seed.
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a new MapStorage instance with all typed arrays zero-initialized.
 *
 * @param width - Map width in hexes
 * @param height - Map height in hexes
 * @param seed - Random seed for deterministic terrain generation
 * @returns Initialized MapStorage
 */
export function createMapStorage(width: number, height: number, seed: number): MapStorage {
  const size = width * height;

  const storage: MapStorage = {
    width,
    height,
    size,
    seed,

    terrain: new Uint8Array(size),
    biome: new Uint8Array(size),
    moisture: new Uint8Array(size),
    temperature: new Uint8Array(size),
    elevation: new Int16Array(size),
    riverMask: new Uint8Array(size),
    roadMask: new Uint8Array(size),
    resourceId: new Uint16Array(size),
    regionId: new Uint16Array(size),
    ownerPlayerId: new Int16Array(size).fill(-1),
    cityIdByHex: new Int32Array(size).fill(-1),
    unitIdByHex: new Int32Array(size).fill(-1),
  };

  return storage;
}

// ─── Terrain Accessors ───────────────────────────────────────────────────────

/**
 * Get terrain type at axial coordinate.
 * Returns 0 (default/void) for out-of-bounds coordinates.
 */
export function getTerrainAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.terrain[toIndex(q, r, storage.width)];
}

/**
 * Set terrain type at axial coordinate.
 * No-op for out-of-bounds coordinates.
 */
export function setTerrainAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.terrain[toIndex(q, r, storage.width)] = value;
}

// ─── Biome Accessors ─────────────────────────────────────────────────────────

/**
 * Get biome type at axial coordinate.
 */
export function getBiomeAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.biome[toIndex(q, r, storage.width)];
}

/**
 * Set biome type at axial coordinate.
 */
export function setBiomeAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.biome[toIndex(q, r, storage.width)] = value;
}

// ─── Elevation Accessors ─────────────────────────────────────────────────────

/**
 * Get elevation at axial coordinate.
 */
export function getElevationAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.elevation[toIndex(q, r, storage.width)];
}

/**
 * Set elevation at axial coordinate.
 */
export function setElevationAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.elevation[toIndex(q, r, storage.width)] = value;
}

// ─── Moisture Accessors ──────────────────────────────────────────────────────

/**
 * Get moisture at axial coordinate.
 */
export function getMoistureAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.moisture[toIndex(q, r, storage.width)];
}

/**
 * Set moisture at axial coordinate.
 */
export function setMoistureAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.moisture[toIndex(q, r, storage.width)] = value;
}

// ─── Temperature Accessors ───────────────────────────────────────────────────

/**
 * Get temperature at axial coordinate.
 */
export function getTemperatureAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.temperature[toIndex(q, r, storage.width)];
}

/**
 * Set temperature at axial coordinate.
 */
export function setTemperatureAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.temperature[toIndex(q, r, storage.width)] = value;
}

// ─── River Mask Accessors ────────────────────────────────────────────────────

/**
 * Get river mask at axial coordinate.
 * Bit i (0-5) indicates river flow in direction i.
 */
export function getRiverMaskAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.riverMask[toIndex(q, r, storage.width)];
}

/**
 * Set river mask at axial coordinate.
 */
export function setRiverMaskAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.riverMask[toIndex(q, r, storage.width)] = value;
}

// ─── Road Mask Accessors ─────────────────────────────────────────────────────

/**
 * Get road mask at axial coordinate.
 * Bit i (0-5) indicates road in direction i.
 */
export function getRoadMaskAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.roadMask[toIndex(q, r, storage.width)];
}

/**
 * Set road mask at axial coordinate.
 */
export function setRoadMaskAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.roadMask[toIndex(q, r, storage.width)] = value;
}

// ─── Resource Accessors ──────────────────────────────────────────────────────

/**
 * Get resource ID at axial coordinate.
 * 0 means no resource.
 */
export function getResourceAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.resourceId[toIndex(q, r, storage.width)];
}

/**
 * Set resource ID at axial coordinate.
 */
export function setResourceAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.resourceId[toIndex(q, r, storage.width)] = value;
}

// ─── Region Accessors ────────────────────────────────────────────────────────

/**
 * Get region ID at axial coordinate.
 * 0 means unassigned.
 */
export function getRegionAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return 0;
  return storage.regionId[toIndex(q, r, storage.width)];
}

/**
 * Set region ID at axial coordinate.
 */
export function setRegionAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.regionId[toIndex(q, r, storage.width)] = value;
}

// ─── Owner Accessors ─────────────────────────────────────────────────────────

/**
 * Get owner player ID at axial coordinate.
 * -1 means unowned.
 */
export function getOwnerAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return -1;
  return storage.ownerPlayerId[toIndex(q, r, storage.width)];
}

/**
 * Set owner player ID at axial coordinate.
 */
export function setOwnerAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.ownerPlayerId[toIndex(q, r, storage.width)] = value;
}

// ─── City Accessors ──────────────────────────────────────────────────────────

/**
 * Get city ID at axial coordinate.
 * -1 means no city.
 */
export function getCityAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return -1;
  return storage.cityIdByHex[toIndex(q, r, storage.width)];
}

/**
 * Set city ID at axial coordinate.
 */
export function setCityAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.cityIdByHex[toIndex(q, r, storage.width)] = value;
}

// ─── Unit Accessors ──────────────────────────────────────────────────────────

/**
 * Get unit ID at axial coordinate.
 * -1 means no unit.
 */
export function getUnitAt(storage: MapStorage, q: number, r: number): number {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return -1;
  return storage.unitIdByHex[toIndex(q, r, storage.width)];
}

/**
 * Set unit ID at axial coordinate.
 */
export function setUnitAt(storage: MapStorage, q: number, r: number, value: number): void {
  if (q < 0 || q >= storage.width || r < 0 || r >= storage.height) return;
  storage.unitIdByHex[toIndex(q, r, storage.width)] = value;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Check if a (q, r) coordinate is within the map bounds.
 */
export function isInBounds(storage: MapStorage, q: number, r: number): boolean {
  return q >= 0 && q < storage.width && r >= 0 && r < storage.height;
}

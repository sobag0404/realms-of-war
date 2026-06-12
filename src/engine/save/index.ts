/**
 * Save/Load module — "Realms of War"
 *
 * Re-exports all save/load, migration, and serialization utilities.
 */

// ─── Save ───────────────────────────────────────────────────────────────────
export type { SaveFile } from "./saveGame";
export {
  saveGame,
  serializeSave,
  calculateChecksum,
} from "./saveGame";

// ─── Load ───────────────────────────────────────────────────────────────────
export {
  deserializeSave,
  validateSave,
  loadGame,
} from "./loadGame";

// ─── Migrations ─────────────────────────────────────────────────────────────
export type { Migration } from "./migrations";
export {
  CURRENT_SAVE_VERSION,
  MIGRATIONS,
  applyMigrations,
} from "./migrations";

/**
 * Save game deserialization & validation — "Realms of War"
 *
 * Loads a save file from JSON, validates its structure, runs migrations,
 * and returns the ready-to-use GameState.
 *
 * All functions are pure and deterministic — no side effects, no DOM.
 */

import type { GameState } from "../core/GameState";
import type { SaveFile } from "./saveGame";
import { CURRENT_SAVE_VERSION, applyMigrations } from "./migrations";

// ─── Deserialization ────────────────────────────────────────────────────────

/**
 * Deserialize a JSON string into a SaveFile.
 *
 * Steps:
 *   1. Parse the JSON string
 *   2. Run migrations if the save version is older than current
 *   3. Validate the resulting structure
 *   4. Return the SaveFile
 *
 * @param json - JSON string of the save file
 * @returns Deserialized and validated SaveFile
 * @throws Error if JSON parsing fails, validation fails, or migrations fail
 */
export function deserializeSave(json: string): SaveFile {
  // Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`Failed to parse save file JSON: ${(e as Error).message}`);
  }

  // Apply migrations to bring up to current version
  const migrated = applyMigrations(raw, CURRENT_SAVE_VERSION);

  // Validate structure
  const validation = validateSave(migrated);
  if (!validation.valid) {
    throw new Error(
      `Save file validation failed:\n${validation.errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  return migrated as SaveFile;
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a SaveFile structure.
 *
 * Checks required fields and basic integrity:
 * - version must be a number
 * - timestamp must be a number
 * - name must be a string
 * - gameState must be a non-null object
 * - gameConfig must be a non-null object
 * - commandLog must be an array
 * - rngState must have seed and position
 *
 * @param save - The save file to validate (may be partially formed)
 * @returns Validation result with valid flag and any error messages
 */
export function validateSave(save: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (save === null || typeof save !== "object") {
    return { valid: false, errors: ["Save file is not an object"] };
  }

  const obj = save as Record<string, unknown>;

  // Version check
  if (typeof obj.version !== "number") {
    errors.push("Missing or invalid field: version (expected number)");
  } else if (obj.version < 1) {
    errors.push(`Invalid version: ${obj.version} (must be >= 1)`);
  } else if (obj.version > CURRENT_SAVE_VERSION) {
    errors.push(
      `Save version ${obj.version} is newer than supported version ${CURRENT_SAVE_VERSION}. ` +
      "Please update the game."
    );
  }

  // Timestamp check
  if (typeof obj.timestamp !== "number") {
    errors.push("Missing or invalid field: timestamp (expected number)");
  }

  // Name check
  if (typeof obj.name !== "string") {
    errors.push("Missing or invalid field: name (expected string)");
  }

  // GameState check
  if (obj.gameState === null || typeof obj.gameState !== "object") {
    errors.push("Missing or invalid field: gameState (expected object)");
  } else {
    // Deep validation of gameState
    const gs = obj.gameState as Record<string, unknown>;

    if (typeof gs.turn !== "number") {
      errors.push("gameState.turn is missing or not a number");
    }
    if (typeof gs.phase !== "string") {
      errors.push("gameState.phase is missing or not a string");
    }
    if (typeof gs.activePlayerId !== "string") {
      errors.push("gameState.activePlayerId is missing or not a string");
    }
    if (!Array.isArray(gs.turnOrder)) {
      errors.push("gameState.turnOrder is missing or not an array");
    }
    if (gs.players === null || typeof gs.players !== "object") {
      errors.push("gameState.players is missing or not an object");
    }
    if (gs.map === null || typeof gs.map !== "object") {
      errors.push("gameState.map is missing or not an object");
    }
    if (gs.entities === null || typeof gs.entities !== "object") {
      errors.push("gameState.entities is missing or not an object");
    }
    if (gs.cities === null || typeof gs.cities !== "object") {
      errors.push("gameState.cities is missing or not an object");
    }
  }

  // GameConfig check
  if (obj.gameConfig === null || typeof obj.gameConfig !== "object") {
    errors.push("Missing or invalid field: gameConfig (expected object)");
  }

  // CommandLog check
  if (!Array.isArray(obj.commandLog)) {
    errors.push("Missing or invalid field: commandLog (expected array)");
  }

  // RNG state check
  if (obj.rngState === null || typeof obj.rngState !== "object") {
    errors.push("Missing or invalid field: rngState (expected object)");
  } else {
    const rng = obj.rngState as Record<string, unknown>;
    if (typeof rng.seed !== "number") {
      errors.push("rngState.seed is missing or not a number");
    }
    if (typeof rng.position !== "number") {
      errors.push("rngState.position is missing or not a number");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Load ───────────────────────────────────────────────────────────────────

/**
 * Load a game from a SaveFile.
 *
 * Returns the validated GameState ready for the engine.
 * The caller is responsible for also reading gameConfig, commandLog,
 * and rngState from the SaveFile to fully reconstruct the engine.
 *
 * @param save - The validated SaveFile
 * @returns The GameState extracted from the save
 */
export function loadGame(save: SaveFile): GameState {
  // The save should already be validated (e.g., via deserializeSave),
  // but do a quick sanity check
  if (!save.gameState) {
    throw new Error("Save file has no gameState");
  }

  // Return the game state as-is (migrations have already been applied)
  return save.gameState as GameState;
}

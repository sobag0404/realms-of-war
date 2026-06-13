/**
 * Unified Save Service — "Realms of War"
 *
 * Centralises all save/load operations through the engine-level save format
 * so that checksums are computed, gameConfig / commandLog / rngState are
 * persisted, and migrations work on load.
 *
 * UI code and API routes MUST go through this module instead of serialising
 * raw GameState objects directly.
 */

import {
  saveGame,
  serializeSave,
  calculateChecksum,
  type SaveFile,
} from '@/engine/save/saveGame';
import { deserializeSave, validateSave, loadGame } from '@/engine/save/loadGame';
import type { GameState } from '@/engine/core/GameState';
import type { GameConfig } from '@/engine/core/GameConfig';
import type { GameCommand } from '@/engine/core/CommandQueue';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum allowed save file size in bytes (≈2 MB). */
const MAX_SAVE_BYTES = 2_000_000;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Options for creating a new save file. */
export interface SaveOptions {
  /** Player-provided name for this save. */
  name: string;
  /** Current game state (from engine.getState()). */
  gameState: GameState;
  /** Game configuration (from engine.getConfig()). */
  gameConfig: GameConfig;
  /** All commands issued so far (for replay / undo). */
  commandLog?: GameCommand[];
  /** PRNG state for exact deterministic reproduction. */
  rngState?: { seed: number; position: number };
}

/** Result of a load attempt. */
export interface LoadResult {
  /** Whether the load succeeded. */
  success: boolean;
  /** The deserialized save file (present on success). */
  saveFile?: SaveFile;
  /** Human-readable error message (present on failure). */
  error?: string;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Create a fully-populated SaveFile from the current engine state.
 *
 * This is the *only* way the UI should build a save file. It guarantees:
 * - A real FNV-1a checksum is calculated
 * - The full GameConfig is included
 * - RNG state is persisted for deterministic replays
 * - The command log is included
 * - The format version is set correctly
 *
 * @param options - Save options including game state, config, and optional extras
 * @returns A complete SaveFile ready for storage
 */
export function createSaveFile(options: SaveOptions): SaveFile {
  return saveGame(
    options.name,
    options.gameState,
    options.gameConfig,
    options.commandLog ?? [],
    options.rngState?.seed ?? options.gameConfig.seed,
    options.rngState?.position ?? 0,
  );
}

/**
 * Serialize a SaveFile to a JSON string with a computed checksum.
 *
 * The checksum is embedded as a top-level `checksum` field in the output
 * string.  Because `serializeSave` produces deterministic JSON, the same
 * SaveFile always yields the same checksum.
 *
 * @param saveFile - The save file to serialize
 * @returns Object with the JSON string and its checksum
 */
export function serializeSaveWithChecksum(saveFile: SaveFile): {
  data: string;
  checksum: string;
} {
  const data = serializeSave(saveFile);
  const checksum = calculateChecksum(data);
  return { data, checksum };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Load and validate a save file from a JSON string.
 *
 * Steps:
 *   1. Size check (reject files > MAX_SAVE_BYTES)
 *   2. JSON parse
 *   3. Validate structure via engine's validateSave()
 *   4. Apply migrations via engine's deserializeSave()
 *
 * @param data - Raw JSON string (typically from the API or localStorage)
 * @returns A LoadResult with either the valid SaveFile or an error message
 */
export function loadSaveFile(data: string): LoadResult {
  // 1. Size check
  if (data.length > MAX_SAVE_BYTES) {
    return {
      success: false,
      error: 'Файл сохранения слишком большой',
    };
  }

  try {
    // 2. Quick JSON parse to get the raw object
    const raw = JSON.parse(data);

    // 3. Validate the structure before attempting migration
    const validation = validateSave(raw);
    if (!validation.valid) {
      const firstError = validation.errors[0] ?? 'Неизвестная ошибка формата';
      return {
        success: false,
        error: `Неверный формат сохранения: ${firstError}`,
      };
    }

    // 4. Deserialize (applies migrations + re-validates)
    const saveFile = deserializeSave(data);

    return { success: true, saveFile };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Неизвестная ошибка';
    return {
      success: false,
      error: `Не удалось загрузить сохранение: ${message}`,
    };
  }
}

/**
 * Verify a checksum for a given save data string.
 *
 * @param data - The JSON string that was saved
 * @param expectedChecksum - The checksum that was computed at save time
 * @returns Whether the checksum matches
 */
export function verifyChecksum(data: string, expectedChecksum: string): boolean {
  const actual = calculateChecksum(data);
  return actual === expectedChecksum;
}

/**
 * Extract the GameState from a validated SaveFile.
 *
 * This is a thin wrapper around the engine's loadGame() for semantic clarity
 * in calling code.
 *
 * @param saveFile - A validated SaveFile (from loadSaveFile)
 * @returns The GameState ready for engine.setState()
 */
export function extractGameState(saveFile: SaveFile): GameState {
  return loadGame(saveFile);
}

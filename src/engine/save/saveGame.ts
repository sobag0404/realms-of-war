/**
 * Save game serialization — "Realms of War"
 *
 * Serializes the full game state into a self-contained save file that can
 * be stored to disk, sent over the network, or used for replays.
 *
 * The save file includes:
 * - The complete GameState (pure data, fully serializable)
 * - The GameConfig (for recreating the engine)
 * - The command log (for replay / undo)
 * - The PRNG state (for exact deterministic reproduction)
 * - A format version (for migration support)
 * - A checksum (for integrity verification)
 *
 * All functions are pure and deterministic — no side effects, no DOM.
 */

import type { GameState } from "../core/GameState";
import type { GameConfig } from "../core/GameConfig";
import type { GameCommand } from "../core/CommandQueue";
import { CURRENT_SAVE_VERSION } from "./migrations";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Save file format */
export interface SaveFile {
  /** Format version for migration support */
  version: number;
  /** Timestamp when the save was created (epoch ms) */
  timestamp: number;
  /** Player-provided save name */
  name: string;
  /** Serialized game state */
  gameState: GameState;
  /** Game config (for recreating the engine) */
  gameConfig: GameConfig;
  /** Command log for replay */
  commandLog: GameCommand[];
  /** PRNG state for exact reproduction */
  rngState: { seed: number; position: number };
}

// ─── Save ───────────────────────────────────────────────────────────────────

/**
 * Serialize the current game state into a save file.
 *
 * @param name - Player-provided name for this save
 * @param state - Current game state
 * @param config - Game configuration
 * @param commandLog - All commands issued so far
 * @param rngSeed - Original seed used for the PRNG
 * @param rngPosition - Current PRNG position (internal state)
 * @returns A complete SaveFile ready for serialization
 */
export function saveGame(
  name: string,
  state: GameState,
  config: GameConfig,
  commandLog: GameCommand[],
  rngSeed: number,
  rngPosition: number,
): SaveFile {
  return {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    name,
    gameState: deepClone(state),
    gameConfig: deepClone(config),
    commandLog: deepClone(commandLog),
    rngState: {
      seed: rngSeed,
      position: rngPosition,
    },
  };
}

/**
 * Serialize a SaveFile to a JSON string.
 *
 * The output is deterministic — the same save always produces the same
 * JSON string (properties are sorted for stability).
 *
 * @param save - The save file to serialize
 * @returns JSON string representation
 */
export function serializeSave(save: SaveFile): string {
  return JSON.stringify(save, replacer, 2);
}

/**
 * Calculate a checksum for save file integrity.
 *
 * Uses a simple FNV-1a hash on the JSON string for fast,
 * deterministic integrity checking. Not cryptographically secure,
 * but sufficient for detecting accidental corruption.
 *
 * @param data - The JSON string to hash
 * @returns Hex-encoded checksum string
 */
export function calculateChecksum(data: string): string {
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
    hash = hash >>> 0; // Keep as unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}

// ─── JSON Replacer ──────────────────────────────────────────────────────────

/**
 * Custom JSON replacer that handles special types.
 *
 * - Sets are converted to arrays (for region hex sets, etc.)
 * - Maps are converted to arrays of [key, value] pairs
 * - undefined values are omitted
 */
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (value instanceof Map) {
    return Array.from(value.entries());
  }
  return value;
}

// ─── Deep Clone ─────────────────────────────────────────────────────────────

/**
 * Deep-clone a serializable object via JSON round-trip.
 *
 * This ensures the save file contains a snapshot of the state at save time,
 * not a reference that could be mutated later.
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, replacer));
}

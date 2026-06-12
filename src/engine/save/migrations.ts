/**
 * Save file migrations — "Realms of War"
 *
 * Migration system for save file format upgrades.
 *
 * Each migration takes a save file at version N and upgrades it to version N+1.
 * Migrations are applied sequentially when loading an older save.
 *
 * When the game format changes (e.g., new fields, renamed properties, restructured
 * data), add a new Migration entry here. The loadGame function will automatically
 * apply all necessary migrations to bring older saves up to the current version.
 *
 * All functions are pure and deterministic — no side effects, no DOM.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single migration step from one version to the next */
export interface Migration {
  /** Version this migration transforms FROM */
  fromVersion: number;
  /** Version this migration transforms TO */
  toVersion: number;
  /** Human-readable description of what this migration does */
  description: string;
  /** The migration function — transforms save data in place */
  migrate(save: unknown): unknown;
}

// ─── Current Version ────────────────────────────────────────────────────────

/** Current save format version */
export const CURRENT_SAVE_VERSION = 1;

// ─── Migrations ─────────────────────────────────────────────────────────────

/**
 * All registered migrations, ordered by fromVersion.
 *
 * As the game evolves and the save format changes, add new migrations here.
 * Example:
 *   {
 *     fromVersion: 1,
 *     toVersion: 2,
 *     description: "Add diplomacy.relations field",
 *     migrate(save) {
 *       const s = { ...save };
 *       s.version = 2;
 *       if (!s.gameState.diplomacy) {
 *         s.gameState.diplomacy = {};
 *       }
 *       return s;
 *     },
 *   }
 */
export const MIGRATIONS: Migration[] = [
  // No migrations yet — version 1 is the initial format.
  // Add future migrations here as the save format evolves.
];

// ─── Migration Application ──────────────────────────────────────────────────

/**
 * Apply all necessary migrations to bring a save to the target version.
 *
 * Migrations are applied sequentially in version order. If the save is already
 * at or above the target version, no migrations are applied.
 *
 * @param save - The raw save data (parsed JSON object)
 * @param targetVersion - The version to migrate to (usually CURRENT_SAVE_VERSION)
 * @returns The migrated save data
 * @throws Error if a required migration is missing
 */
export function applyMigrations(save: unknown, targetVersion: number): unknown {
  if (save === null || typeof save !== "object") {
    return save;
  }

  const saveObj = save as Record<string, unknown>;
  let currentVersion = typeof saveObj.version === "number" ? saveObj.version : 0;

  // If already at or above target, nothing to do
  if (currentVersion >= targetVersion) {
    return save;
  }

  // Build a lookup: fromVersion → migration
  const migrationMap = new Map<number, Migration>();
  for (const migration of MIGRATIONS) {
    migrationMap.set(migration.fromVersion, migration);
  }

  // Apply migrations one at a time
  let current: unknown = save;
  while (currentVersion < targetVersion) {
    const migration = migrationMap.get(currentVersion);
    if (!migration) {
      throw new Error(
        `Missing migration from version ${currentVersion} to ${currentVersion + 1}. ` +
        `Cannot upgrade save to version ${targetVersion}.`
      );
    }
    current = migration.migrate(current);
    currentVersion = migration.toVersion;
  }

  return current;
}

import { Database } from 'bun:sqlite';
import { dirname, isAbsolute, resolve } from 'path';
import { mkdirSync } from 'fs';

function sqlitePathFromDatabaseUrl(url: string): string {
  if (!url.startsWith('file:')) {
    throw new Error('Only SQLite file: DATABASE_URL values are supported by this local-alpha db:push script.');
  }

  const rawPath = url.slice('file:'.length);
  if (!rawPath) {
    throw new Error('DATABASE_URL must include a SQLite file path.');
  }

  return isAbsolute(rawPath)
    ? rawPath
    : resolve(process.cwd(), 'prisma', rawPath);
}

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbPath = sqlitePathFromDatabaseUrl(databaseUrl);

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS "SaveGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "players" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL DEFAULT 'local',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS "SaveGame_ownerId_updatedAt_idx"
    ON "SaveGame" ("ownerId", "updatedAt");

  PRAGMA user_version = 1;
`);

db.close();

console.log(`SQLite schema is ready at ${dbPath}`);

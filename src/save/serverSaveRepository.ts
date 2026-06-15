import { serializeSaveWithChecksum } from '@/lib/saveService';
import type {
  LoadedSave,
  SaveRepository,
  SaveSummary,
  SaveWriteInput,
} from './types';
import { SaveRepositoryError } from './types';
import {
  loadStoredSave,
  summarizeStoredSave,
  type StoredSavePayload,
} from './saveRecordHealth';

type ServerLoadPayload = SaveSummary & {
  data: string;
  checksum: string;
};

function isSaveSummary(value: unknown): value is SaveSummary {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Partial<SaveSummary>;
  return (
    typeof summary.id === 'string' &&
    typeof summary.name === 'string' &&
    typeof summary.turn === 'number' &&
    typeof summary.players === 'string' &&
    typeof summary.createdAt === 'string' &&
    typeof summary.updatedAt === 'string'
  );
}

function isServerLoadPayload(value: unknown): value is ServerLoadPayload {
  return (
    isSaveSummary(value) &&
    typeof (value as Partial<ServerLoadPayload>).data === 'string' &&
    typeof (value as Partial<ServerLoadPayload>).checksum === 'string'
  );
}

export class ServerSaveRepository implements SaveRepository {
  readonly kind = 'server' as const;

  async list(): Promise<SaveSummary[]> {
    const response = await fetch('/api/saves');
    if (!response.ok) {
      throw new SaveRepositoryError('Failed to list server saves', 'network');
    }

    const payload = await response.json() as { saves?: unknown };
    if (!Array.isArray(payload.saves) || !payload.saves.every(isSaveSummary)) {
      throw new SaveRepositoryError('Invalid save list response', 'invalid-response');
    }

    return payload.saves.map((summary) => ({
      ...summary,
      source: this.kind,
      health: summary.health ?? 'available',
    }));
  }

  async load(id: string): Promise<LoadedSave> {
    const response = await fetch(`/api/load?id=${encodeURIComponent(id)}`);
    if (response.status === 404) {
      throw new SaveRepositoryError('Save not found', 'not-found');
    }
    if (!response.ok) {
      throw new SaveRepositoryError('Failed to load server save', 'network');
    }

    const payload = await response.json();
    if (!isServerLoadPayload(payload)) {
      throw new SaveRepositoryError('Invalid save load response', 'invalid-response');
    }

    return loadStoredSave(payload, { source: this.kind });
  }

  async save(input: SaveWriteInput): Promise<SaveSummary> {
    const { data, checksum } = serializeSaveWithChecksum(input.saveFile);
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        turn: input.turn,
        players: input.players,
        data,
        checksum,
      }),
    });

    if (!response.ok) {
      throw new SaveRepositoryError('Failed to save through server API', 'network');
    }

    const payload = await response.json() as { id?: unknown; createdAt?: unknown; updatedAt?: unknown };
    const now = new Date().toISOString();
    const record: StoredSavePayload = {
      id: String(payload.id),
      name: input.name,
      turn: input.turn,
      players: input.players,
      createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : now,
      updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : now,
      data,
      checksum,
    };
    return summarizeStoredSave(record, { source: this.kind });
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/load?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      throw new SaveRepositoryError('Save not found', 'not-found');
    }
    if (!response.ok) {
      throw new SaveRepositoryError('Failed to delete server save', 'network');
    }
  }
}

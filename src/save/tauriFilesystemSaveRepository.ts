import {
  isSaveDataWithinSizeLimit,
  serializeSaveWithChecksum,
} from '@/lib/saveService';
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

const STORAGE_VERSION = 1;

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

interface DesktopStoredSaveRecord extends StoredSavePayload {
  storageVersion: number;
}

type TauriFilesystemSaveRepositoryOptions = {
  invoke?: TauriInvoke;
  fallbackRepository?: SaveRepository;
  now?: () => number;
  idFactory?: () => string;
};

function makeSaveId(now: number): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 10);
  return `desktop-${now}-${random}`;
}

async function defaultInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

function isDesktopSaveId(id: string): boolean {
  return id.startsWith('desktop-');
}

function isStoredSaveRecord(value: unknown): value is DesktopStoredSaveRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesktopStoredSaveRecord>;
  return (
    typeof record.storageVersion === 'number' &&
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.turn === 'number' &&
    typeof record.players === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    typeof record.data === 'string' &&
    typeof record.checksum === 'string'
  );
}

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export class TauriFilesystemSaveRepository implements SaveRepository {
  readonly kind = 'tauri-fs' as const;

  private readonly invoke: TauriInvoke;
  private readonly fallbackRepository?: SaveRepository;
  private readonly now: () => number;
  private readonly idFactory?: () => string;

  constructor(options: TauriFilesystemSaveRepositoryOptions = {}) {
    this.invoke = options.invoke ?? defaultInvoke;
    this.fallbackRepository = options.fallbackRepository;
    this.now = options.now ?? Date.now;
    this.idFactory = options.idFactory;
  }

  async list(): Promise<SaveSummary[]> {
    const records = await this.invoke<unknown[]>('desktop_save_list');
    const summaries = records
      .filter(isStoredSaveRecord)
      .map((record) => summarizeStoredSave(record, {
        source: this.kind,
        storageVersion: record.storageVersion,
        maxStorageVersion: STORAGE_VERSION,
      }));

    const fallbackSummaries = this.fallbackRepository
      ? await this.fallbackRepository.list()
      : [];

    return [...summaries, ...fallbackSummaries]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async load(id: string): Promise<LoadedSave> {
    if (!isDesktopSaveId(id) && this.fallbackRepository) {
      return this.fallbackRepository.load(id);
    }

    let record: unknown | null;
    try {
      record = await this.invoke<unknown | null>('desktop_save_load', { id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new SaveRepositoryError(message, 'corrupt');
    }

    if (!record) {
      throw new SaveRepositoryError('Save not found', 'not-found');
    }
    if (!isStoredSaveRecord(record)) {
      throw new SaveRepositoryError('Desktop save metadata is invalid', 'corrupt');
    }
    return loadStoredSave(record, {
      source: this.kind,
      storageVersion: record.storageVersion,
      maxStorageVersion: STORAGE_VERSION,
    });
  }

  async save(input: SaveWriteInput): Promise<SaveSummary> {
    const { data, checksum } = serializeSaveWithChecksum(input.saveFile);
    if (!isSaveDataWithinSizeLimit(data)) {
      throw new SaveRepositoryError('Save data is too large for desktop storage', 'too-large');
    }

    const nowIso = new Date(this.now()).toISOString();
    const id = this.idFactory?.() ?? makeSaveId(this.now());
    const existing = await this.tryLoadExistingRecord(id);
    const record: DesktopStoredSaveRecord = {
      storageVersion: STORAGE_VERSION,
      id,
      name: input.name,
      turn: input.turn,
      players: input.players,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      data,
      checksum,
      backupData: existing?.data ?? data,
      backupChecksum: existing?.checksum ?? checksum,
    };

    await this.invoke<void>('desktop_save_write', { record });
    return summarizeStoredSave(record, {
      source: this.kind,
      storageVersion: record.storageVersion,
      maxStorageVersion: STORAGE_VERSION,
    });
  }

  async delete(id: string): Promise<void> {
    if (!isDesktopSaveId(id) && this.fallbackRepository) {
      return this.fallbackRepository.delete(id);
    }

    await this.invoke<void>('desktop_save_delete', { id });
  }

  private async tryLoadExistingRecord(id: string): Promise<DesktopStoredSaveRecord | null> {
    try {
      const record = await this.invoke<unknown | null>('desktop_save_load', { id });
      if (!record || !isStoredSaveRecord(record) || record.storageVersion > STORAGE_VERSION) {
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }
}

import {
  loadSaveFile,
  serializeSaveWithChecksum,
  verifyChecksum,
} from '@/lib/saveService';
import type {
  LoadedSave,
  SaveRepository,
  SaveSummary,
  SaveWriteInput,
} from './types';
import { SaveRepositoryError } from './types';

const STORAGE_VERSION = 1;

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

interface DesktopStoredSaveRecord extends SaveSummary {
  storageVersion: number;
  data: string;
  checksum: string;
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

function toSummary(record: DesktopStoredSaveRecord): SaveSummary {
  const {
    storageVersion: _storageVersion,
    data: _data,
    checksum: _checksum,
    ...summary
  } = record;
  return summary;
}

function toLoadedSave(record: DesktopStoredSaveRecord): LoadedSave {
  if (!verifyChecksum(record.data, record.checksum)) {
    throw new SaveRepositoryError('Desktop save checksum mismatch', 'corrupt');
  }

  const loadResult = loadSaveFile(record.data);
  if (!loadResult.success || !loadResult.saveFile) {
    throw new SaveRepositoryError(
      loadResult.error ?? 'Desktop save is invalid',
      'corrupt',
    );
  }

  return {
    summary: toSummary(record),
    saveFile: loadResult.saveFile,
  };
}

function isDesktopSaveId(id: string): boolean {
  return id.startsWith('desktop-');
}

function isStoredSaveRecord(value: unknown): value is DesktopStoredSaveRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesktopStoredSaveRecord>;
  return (
    record.storageVersion === STORAGE_VERSION &&
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
      .map(toSummary);

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

    const record = await this.invoke<unknown | null>('desktop_save_load', { id });
    if (!record) {
      throw new SaveRepositoryError('Save not found', 'not-found');
    }
    if (!isStoredSaveRecord(record)) {
      throw new SaveRepositoryError('Desktop save metadata is invalid', 'corrupt');
    }
    return toLoadedSave(record);
  }

  async save(input: SaveWriteInput): Promise<SaveSummary> {
    const { data, checksum } = serializeSaveWithChecksum(input.saveFile);
    const nowIso = new Date(this.now()).toISOString();
    const id = this.idFactory?.() ?? makeSaveId(this.now());
    const existing = await this.tryLoadExisting(id);
    const record: DesktopStoredSaveRecord = {
      storageVersion: STORAGE_VERSION,
      id,
      name: input.name,
      turn: input.turn,
      players: input.players,
      createdAt: existing?.summary.createdAt ?? nowIso,
      updatedAt: nowIso,
      data,
      checksum,
    };

    await this.invoke<void>('desktop_save_write', { record });
    return toSummary(record);
  }

  async delete(id: string): Promise<void> {
    if (!isDesktopSaveId(id) && this.fallbackRepository) {
      return this.fallbackRepository.delete(id);
    }

    await this.invoke<void>('desktop_save_delete', { id });
  }

  private async tryLoadExisting(id: string): Promise<LoadedSave | null> {
    try {
      return await this.load(id);
    } catch (error) {
      if (error instanceof SaveRepositoryError && error.code === 'not-found') {
        return null;
      }
      throw error;
    }
  }
}

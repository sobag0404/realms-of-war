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

const DB_NAME = 'realms-of-war-local-saves';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const LOCAL_STORAGE_KEY = 'realms-of-war.local-saves.v1';

interface StoredSaveRecord extends SaveSummary {
  data: string;
  checksum: string;
}

type BrowserLocalSaveRepositoryOptions = {
  indexedDB?: IDBFactory;
  localStorage?: Storage;
  now?: () => number;
  idFactory?: () => string;
};

function makeSaveId(now: number): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 10);
  return `local-${now}-${random}`;
}

function toLoadedSave(record: StoredSaveRecord): LoadedSave {
  if (!verifyChecksum(record.data, record.checksum)) {
    throw new SaveRepositoryError('Local save checksum mismatch', 'corrupt');
  }

  const loadResult = loadSaveFile(record.data);
  if (!loadResult.success || !loadResult.saveFile) {
    throw new SaveRepositoryError(
      loadResult.error ?? 'Local save is invalid',
      'corrupt',
    );
  }

  const { data: _data, checksum: _checksum, ...summary } = record;
  return { summary, saveFile: loadResult.saveFile };
}

export class BrowserLocalSaveRepository implements SaveRepository {
  readonly kind = 'browser-local' as const;

  private readonly indexedDB?: IDBFactory;
  private readonly localStorage?: Storage;
  private readonly now: () => number;
  private readonly idFactory?: () => string;
  private dbPromise?: Promise<IDBDatabase>;

  constructor(options: BrowserLocalSaveRepositoryOptions = {}) {
    this.indexedDB = options.indexedDB ?? globalThis.indexedDB;
    this.localStorage = options.localStorage ?? globalThis.localStorage;
    this.now = options.now ?? Date.now;
    this.idFactory = options.idFactory;
  }

  async list(): Promise<SaveSummary[]> {
    const records = await this.getAllRecords();
    return records
      .map(({ data: _data, checksum: _checksum, ...summary }) => summary)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async load(id: string): Promise<LoadedSave> {
    const record = await this.getRecord(id);
    if (!record) {
      throw new SaveRepositoryError('Save not found', 'not-found');
    }
    return toLoadedSave(record);
  }

  async save(input: SaveWriteInput): Promise<SaveSummary> {
    const { data, checksum } = serializeSaveWithChecksum(input.saveFile);
    const nowIso = new Date(this.now()).toISOString();
    const id = this.idFactory?.() ?? makeSaveId(this.now());
    const existing = await this.getRecord(id);
    const record: StoredSaveRecord = {
      id,
      name: input.name,
      turn: input.turn,
      players: input.players,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
      data,
      checksum,
    };

    await this.putRecord(record);
    const { data: _data, checksum: _checksum, ...summary } = record;
    return summary;
  }

  async delete(id: string): Promise<void> {
    if (this.indexedDB) {
      const db = await this.openDb();
      await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id));
      return;
    }

    const records = this.readLocalStorageRecords().filter((record) => record.id !== id);
    this.writeLocalStorageRecords(records);
  }

  private async getAllRecords(): Promise<StoredSaveRecord[]> {
    if (this.indexedDB) {
      const db = await this.openDb();
      return requestToPromise<StoredSaveRecord[]>(
        db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll(),
      );
    }

    return this.readLocalStorageRecords();
  }

  private async getRecord(id: string): Promise<StoredSaveRecord | undefined> {
    if (this.indexedDB) {
      const db = await this.openDb();
      return requestToPromise<StoredSaveRecord | undefined>(
        db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id),
      );
    }

    return this.readLocalStorageRecords().find((record) => record.id === id);
  }

  private async putRecord(record: StoredSaveRecord): Promise<void> {
    if (this.indexedDB) {
      const db = await this.openDb();
      await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record));
      return;
    }

    const records = this.readLocalStorageRecords().filter((item) => item.id !== record.id);
    records.push(record);
    this.writeLocalStorageRecords(records);
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.indexedDB) {
      throw new SaveRepositoryError('IndexedDB is not available', 'storage-unavailable');
    }

    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = this.indexedDB!.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open local saves database'));
    });

    return this.dbPromise;
  }

  private readLocalStorageRecords(): StoredSaveRecord[] {
    if (!this.localStorage) {
      throw new SaveRepositoryError('Local browser storage is not available', 'storage-unavailable');
    }

    const raw = this.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isStoredSaveRecord) : [];
    } catch {
      return [];
    }
  }

  private writeLocalStorageRecords(records: StoredSaveRecord[]): void {
    if (!this.localStorage) {
      throw new SaveRepositoryError('Local browser storage is not available', 'storage-unavailable');
    }
    this.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function isStoredSaveRecord(value: unknown): value is StoredSaveRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StoredSaveRecord>;
  return (
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

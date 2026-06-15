import type { SaveFile } from '@/engine/save/saveGame';

export type SaveRepositoryKind = 'browser-local' | 'server' | 'tauri-fs';

export type SaveHealth = 'available' | 'recoverable' | 'corrupt' | 'unsupported';

export interface SaveSummary {
  id: string;
  name: string;
  turn: number;
  players: string;
  map?: string;
  createdAt: string;
  updatedAt: string;
  source?: SaveRepositoryKind;
  health?: SaveHealth;
  healthMessage?: string;
  saveVersion?: number;
  storageVersion?: number;
}

export interface SaveWriteInput {
  name: string;
  turn: number;
  players: string;
  saveFile: SaveFile;
}

export interface LoadedSave {
  summary: SaveSummary;
  saveFile: SaveFile;
}

export interface SaveRepository {
  readonly kind: SaveRepositoryKind;
  list(): Promise<SaveSummary[]>;
  load(id: string): Promise<LoadedSave>;
  save(input: SaveWriteInput): Promise<SaveSummary>;
  delete(id: string): Promise<void>;
}

export class SaveRepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'not-found'
      | 'corrupt'
      | 'unsupported'
      | 'too-large'
      | 'storage-unavailable'
      | 'network'
      | 'invalid-response',
  ) {
    super(message);
    this.name = 'SaveRepositoryError';
  }
}

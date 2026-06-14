import type { SaveFile } from '@/engine/save/saveGame';

export interface SaveSummary {
  id: string;
  name: string;
  turn: number;
  players: string;
  createdAt: string;
  updatedAt: string;
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
  readonly kind: 'browser-local' | 'server' | 'tauri-fs';
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
      | 'storage-unavailable'
      | 'network'
      | 'invalid-response',
  ) {
    super(message);
    this.name = 'SaveRepositoryError';
  }
}

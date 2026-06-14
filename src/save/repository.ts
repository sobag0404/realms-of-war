import { BrowserLocalSaveRepository } from './browserLocalSaveRepository';
import { ServerSaveRepository } from './serverSaveRepository';
import {
  isTauriRuntime,
  TauriFilesystemSaveRepository,
} from './tauriFilesystemSaveRepository';
import type { SaveRepository } from './types';

let repository: SaveRepository | null = null;

export function getSaveRepository(): SaveRepository {
  if (repository) return repository;

  const mode = process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY;
  const browserLocalRepository = new BrowserLocalSaveRepository();

  if (mode === 'server') {
    repository = new ServerSaveRepository();
  } else if (mode === 'browser-local') {
    repository = browserLocalRepository;
  } else if (mode === 'tauri-fs' || isTauriRuntime()) {
    repository = new TauriFilesystemSaveRepository({
      fallbackRepository: browserLocalRepository,
    });
  } else {
    repository = browserLocalRepository;
  }

  return repository;
}

export function setSaveRepositoryForTests(nextRepository: SaveRepository | null): void {
  repository = nextRepository;
}

export type {
  LoadedSave,
  SaveRepository,
  SaveSummary,
  SaveWriteInput,
} from './types';
export { SaveRepositoryError } from './types';

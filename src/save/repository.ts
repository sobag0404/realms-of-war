import { BrowserLocalSaveRepository } from './browserLocalSaveRepository';
import { ServerSaveRepository } from './serverSaveRepository';
import type { SaveRepository } from './types';

let repository: SaveRepository | null = null;

export function getSaveRepository(): SaveRepository {
  if (repository) return repository;

  const mode = process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY;
  repository = mode === 'server'
    ? new ServerSaveRepository()
    : new BrowserLocalSaveRepository();

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

import { loadSaveFile, verifyChecksum } from '@/lib/saveService';
import type {
  LoadedSave,
  SaveRepository,
  SaveSummary,
  SaveWriteInput,
} from './types';
import { SaveRepositoryError } from './types';
import { serializeSaveWithChecksum } from '@/lib/saveService';

type ServerLoadPayload = SaveSummary & {
  data: string;
  checksum: string;
};

export class ServerSaveRepository implements SaveRepository {
  readonly kind = 'server' as const;

  async list(): Promise<SaveSummary[]> {
    const response = await fetch('/api/saves');
    if (!response.ok) {
      throw new SaveRepositoryError('Failed to list server saves', 'network');
    }

    const payload = await response.json();
    if (!Array.isArray(payload.saves)) {
      throw new SaveRepositoryError('Invalid save list response', 'invalid-response');
    }

    return payload.saves as SaveSummary[];
  }

  async load(id: string): Promise<LoadedSave> {
    const response = await fetch(`/api/load?id=${encodeURIComponent(id)}`);
    if (response.status === 404) {
      throw new SaveRepositoryError('Save not found', 'not-found');
    }
    if (!response.ok) {
      throw new SaveRepositoryError('Failed to load server save', 'network');
    }

    const payload = (await response.json()) as ServerLoadPayload;
    if (!verifyChecksum(payload.data, payload.checksum)) {
      throw new SaveRepositoryError('Server save checksum mismatch', 'corrupt');
    }

    const loadResult = loadSaveFile(payload.data);
    if (!loadResult.success || !loadResult.saveFile) {
      throw new SaveRepositoryError(loadResult.error ?? 'Server save is invalid', 'corrupt');
    }

    return {
      summary: {
        id: payload.id,
        name: payload.name,
        turn: payload.turn,
        players: payload.players,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      },
      saveFile: loadResult.saveFile,
    };
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

    const payload = await response.json();
    return {
      id: String(payload.id),
      name: input.name,
      turn: input.turn,
      players: input.players,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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

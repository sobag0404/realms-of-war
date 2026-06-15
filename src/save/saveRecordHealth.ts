import { loadSaveFile, verifyChecksum } from '@/lib/saveService';
import type {
  LoadedSave,
  SaveRepositoryKind,
  SaveSummary,
} from './types';
import { SaveRepositoryError } from './types';

export interface StoredSavePayload extends SaveSummary {
  data: string;
  checksum: string;
  backupData?: string;
  backupChecksum?: string;
}

type PayloadCheck =
  | {
      ok: true;
      saveFile: LoadedSave['saveFile'];
      saveVersion?: number;
    }
  | {
      ok: false;
      health: 'corrupt' | 'unsupported';
      message: string;
    };

type SummaryOptions = {
  source: SaveRepositoryKind;
  storageVersion?: number;
  maxStorageVersion?: number;
  backup?: Pick<StoredSavePayload, 'data' | 'checksum'> | null;
};

function extractSaveVersion(data: string): number | undefined {
  try {
    const parsed = JSON.parse(data) as { version?: unknown };
    return typeof parsed.version === 'number' ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

function isUnsupportedMessage(message: string): boolean {
  return /newer than supported|unsupported|update the game/i.test(message);
}

function mapLabel(saveFile: LoadedSave['saveFile']): string | undefined {
  const map = saveFile.gameConfig?.map;
  if (!map) return undefined;
  return `${map.type}, radius ${map.radius}`;
}

function checkPayload(data: string, checksum: string): PayloadCheck {
  if (!verifyChecksum(data, checksum)) {
    return {
      ok: false,
      health: 'corrupt',
      message: 'Save checksum does not match the stored data.',
    };
  }

  const loadResult = loadSaveFile(data);
  if (!loadResult.success || !loadResult.saveFile) {
    const message = loadResult.error ?? 'Save data is invalid.';
    return {
      ok: false,
      health: isUnsupportedMessage(message) ? 'unsupported' : 'corrupt',
      message,
    };
  }

  return {
    ok: true,
    saveFile: loadResult.saveFile,
    saveVersion: loadResult.saveFile.version,
  };
}

function baseSummary(
  record: StoredSavePayload,
  options: SummaryOptions,
): SaveSummary {
  return {
    id: record.id,
    name: record.name,
    turn: record.turn,
    players: record.players,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    source: options.source,
    storageVersion: options.storageVersion,
  };
}

export function summarizeStoredSave(
  record: StoredSavePayload,
  options: SummaryOptions,
): SaveSummary {
  const summary = baseSummary(record, options);

  if (
    options.storageVersion !== undefined &&
    options.maxStorageVersion !== undefined &&
    options.storageVersion > options.maxStorageVersion
  ) {
    return {
      ...summary,
      health: 'unsupported',
      healthMessage: `Save storage version ${options.storageVersion} is newer than supported version ${options.maxStorageVersion}.`,
      saveVersion: extractSaveVersion(record.data),
    };
  }

  const primary = checkPayload(record.data, record.checksum);
  if (primary.ok) {
    return {
      ...summary,
      health: 'available',
      saveVersion: primary.saveVersion,
      map: mapLabel(primary.saveFile),
    };
  }

  const backup = options.backup ?? (
    record.backupData && record.backupChecksum
      ? { data: record.backupData, checksum: record.backupChecksum }
      : null
  );
  if (backup) {
    const backupCheck = checkPayload(backup.data, backup.checksum);
    if (backupCheck.ok) {
      return {
        ...summary,
        health: 'recoverable',
        healthMessage: 'Primary save data is damaged; a backup copy is available.',
        saveVersion: backupCheck.saveVersion,
        map: mapLabel(backupCheck.saveFile),
      };
    }
  }

  return {
    ...summary,
    health: primary.health,
    healthMessage: primary.message,
    saveVersion: extractSaveVersion(record.data),
  };
}

export function loadStoredSave(
  record: StoredSavePayload,
  options: SummaryOptions,
): LoadedSave {
  const summary = summarizeStoredSave(record, options);
  if (summary.health === 'unsupported') {
    throw new SaveRepositoryError(
      summary.healthMessage ?? 'Save version is not supported by this build.',
      'unsupported',
    );
  }

  const primary = checkPayload(record.data, record.checksum);
  if (primary.ok) {
    return {
      summary,
      saveFile: primary.saveFile,
    };
  }

  const backup = options.backup ?? (
    record.backupData && record.backupChecksum
      ? { data: record.backupData, checksum: record.backupChecksum }
      : null
  );
  if (backup) {
    const backupCheck = checkPayload(backup.data, backup.checksum);
    if (backupCheck.ok) {
      return {
        summary: {
          ...summary,
          health: 'recoverable',
          healthMessage: 'Loaded from the backup copy because primary save data is damaged.',
          saveVersion: backupCheck.saveVersion,
          map: mapLabel(backupCheck.saveFile),
        },
        saveFile: backupCheck.saveFile,
      };
    }
  }

  throw new SaveRepositoryError(primary.message, primary.health);
}

export const LOCAL_ALPHA_OWNER_ID = 'local';

const SERVER_SAVES_MODE_ENV = 'REALMS_SERVER_SAVES';
const LOCAL_ALPHA_MODE = 'local-alpha';

export interface SaveAccessEnabled {
  enabled: true;
  ownerId: typeof LOCAL_ALPHA_OWNER_ID;
}

export interface SaveAccessDisabled {
  enabled: false;
  status: 403;
  error: string;
}

export type SaveAccess = SaveAccessEnabled | SaveAccessDisabled;

/**
 * Server saves intentionally remain a local-alpha feature until real auth and
 * per-user ownership are added.
 *
 * Development and tests default to local-alpha mode. Production disables these
 * endpoints unless REALMS_SERVER_SAVES=local-alpha is set explicitly.
 */
export function resolveSaveAccess(): SaveAccess {
  const mode =
    process.env[SERVER_SAVES_MODE_ENV] ??
    (process.env.NODE_ENV === 'production' ? 'disabled' : LOCAL_ALPHA_MODE);

  if (mode === LOCAL_ALPHA_MODE) {
    return { enabled: true, ownerId: LOCAL_ALPHA_OWNER_ID };
  }

  return {
    enabled: false,
    status: 403,
    error:
      'Server-side saves are disabled. Enable local-alpha saves only after adding a deployment boundary or auth.',
  };
}

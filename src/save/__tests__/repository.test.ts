import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY;

describe('save repository selection', () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY = originalEnv;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses browser-local storage by default outside Tauri', async () => {
    process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY = '';
    const { getSaveRepository, setSaveRepositoryForTests } = await import('@/save/repository');
    setSaveRepositoryForTests(null);

    expect(getSaveRepository().kind).toBe('browser-local');
  });

  it('uses server storage when explicitly requested', async () => {
    process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY = 'server';
    const { getSaveRepository, setSaveRepositoryForTests } = await import('@/save/repository');
    setSaveRepositoryForTests(null);

    expect(getSaveRepository().kind).toBe('server');
  });

  it('uses Tauri filesystem storage when the Tauri runtime is detected', async () => {
    process.env.NEXT_PUBLIC_REALMS_SAVE_REPOSITORY = '';
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    const { getSaveRepository, setSaveRepositoryForTests } = await import('@/save/repository');
    setSaveRepositoryForTests(null);

    expect(getSaveRepository().kind).toBe('tauri-fs');
  });
});

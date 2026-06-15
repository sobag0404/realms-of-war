'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/store/useGameStore';
import { getSaveRepository, SaveRepositoryError } from '@/save/repository';
import type { SaveSummary } from '@/save/repository';

function formatSaveDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function sourceLabel(source?: SaveSummary['source']): string {
  if (source === 'tauri-fs') return 'Desktop file';
  if (source === 'browser-local') return 'Browser local';
  if (source === 'server') return 'Server';
  return 'Local save';
}

function healthLabel(save: SaveSummary): string | null {
  if (!save.health || save.health === 'available') return null;
  if (save.health === 'recoverable') return 'Backup available';
  if (save.health === 'unsupported') return 'Unsupported version';
  return 'Corrupt save';
}

function canLoadSave(save: SaveSummary): boolean {
  return !save.health || save.health === 'available' || save.health === 'recoverable';
}

// ─── Save Entry ──────────────────────────────────────────────────────────────

/**
 * MainMenuScreen — full-screen overlay shown when mode === 'menu'.
 *
 * Fantasy-themed dark background, game title, menu buttons.
 * Load game button now works.
 */
export function MainMenuScreen() {
  const mode = useGameStore((s) => s.mode);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const loadSaveFileIntoStore = useGameStore((s) => s.loadSaveFile);
  const addNotification = useGameStore((s) => s.addNotification);
  const [visible, setVisible] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [saves, setSaves] = useState<SaveSummary[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [loadPanelError, setLoadPanelError] = useState<string | null>(null);

  useEffect(() => {
    // Trigger fade-in animation on mount
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const fetchSaves = useCallback(async () => {
    setLoadingSaves(true);
    setLoadPanelError(null);
    try {
      setSaves(await getSaveRepository().list());
    } catch (error) {
      const message = error instanceof SaveRepositoryError
        ? error.message
        : 'Failed to list saves';
      setSaves([]);
      setLoadPanelError(message);
      addNotification({
        type: 'error',
        title: 'РћС€РёР±РєР°',
        message: error instanceof SaveRepositoryError
          ? error.message
          : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє СЃРѕС…СЂР°РЅРµРЅРёР№',
        duration: 4000,
      });
    } finally {
      setLoadingSaves(false);
    }
  }, [addNotification]);

  const handleLoadClick = useCallback(() => {
    setShowLoadPanel(true);
    fetchSaves();
  }, [fetchSaves]);

  const handleLoadSave = useCallback(
    async (saveId: string) => {
      try {
        const loaded = await getSaveRepository().load(saveId);
        loadSaveFileIntoStore(loaded.saveFile);
        setShowLoadPanel(false);
        const loadedFromBackup = loaded.summary.health === 'recoverable';
        addNotification({
          type: 'success',
          title: loadedFromBackup ? 'Recovered save' : 'Loaded',
          message: loadedFromBackup
            ? `Loaded backup copy for "${loaded.summary.name}" (turn ${loaded.summary.turn})`
            : `Loaded "${loaded.summary.name}" (turn ${loaded.summary.turn})`,
          duration: 3000,
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Ошибка',
          message: error instanceof SaveRepositoryError
            ? error.message
            : 'Не удалось загрузить сохранение',
          duration: 4000,
        });
      }
    },
    [loadSaveFileIntoStore, addNotification],
  );

  const handleDeleteSave = useCallback(
    async (save: SaveSummary) => {
      if (
        typeof window !== 'undefined' &&
        !window.confirm(`Delete "${save.name}" from ${formatSaveDate(save.updatedAt)}?`)
      ) {
        return;
      }

      try {
        await getSaveRepository().delete(save.id);
        setSaves((prev) => prev.filter((s) => s.id !== save.id));
        addNotification({
          type: 'info',
          title: 'Deleted',
          message: `Deleted "${save.name}"`,
          duration: 3000,
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Ошибка',
          message: error instanceof SaveRepositoryError
            ? error.message
            : 'Не удалось удалить сохранение',
          duration: 4000,
        });
      }
    },
    [addNotification],
  );

  if (mode !== 'menu') return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, #1a1207 0%, #0d0a04 40%, #050302 100%)',
      }}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #d4a44c 0px, #d4a44c 1px, transparent 1px, transparent 12px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-widest"
            style={{
              color: '#D4A44C',
              textShadow:
                '0 0 40px rgba(212,164,76,0.3), 0 2px 4px rgba(0,0,0,0.8)',
              fontFamily: 'serif',
            }}
          >
            REALMS OF WAR
          </h1>
          <p
            className="mt-3 text-lg sm:text-xl tracking-wider"
            style={{ color: '#a08050' }}
          >
            Пошаговая стратегия
          </p>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-3 w-72 mt-4">
          <Button
            onClick={() => setOpenPanel('newGame')}
            data-testid="main-menu-new-game"
            className="h-14 text-lg font-semibold bg-amber-700 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/30 transition-all duration-200 hover:scale-[1.02]"
          >
            ⚔️ Новая игра
          </Button>

          <Button
            onClick={handleLoadClick}
            data-testid="main-menu-load-game"
            className="h-14 text-lg font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all duration-200 hover:scale-[1.02]"
          >
            📂 Загрузить
          </Button>

          <Button
            onClick={() => setOpenPanel('settings')}
            className="h-14 text-lg font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all duration-200 hover:scale-[1.02]"
          >
            ⚙️ Настройки
          </Button>
        </div>
      </div>

      {/* Load game panel */}
      {showLoadPanel && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-amber-400">Загрузить игру</h3>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-white"
                onClick={() => setShowLoadPanel(false)}
              >
                ✕
              </Button>
            </div>
            <ScrollArea className="max-h-96">
              <div className="p-4 space-y-2">
                {loadPanelError && (
                  <div className="rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100">
                    <div className="mb-2">{loadPanelError}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-red-100 hover:bg-red-900/40 hover:text-white"
                      onClick={fetchSaves}
                    >
                      Retry
                    </Button>
                  </div>
                )}
                {loadingSaves ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">
                    Загрузка...
                  </div>
                ) : saves.length === 0 && !loadPanelError ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">
                    Нет сохранений
                  </div>
                ) : (
                  saves.map((save) => (
                    <Card
                      key={save.id}
                      className={`bg-zinc-800/50 ${canLoadSave(save) ? 'border-zinc-700' : 'border-red-900/60'}`}
                      data-testid="save-list-entry"
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {save.name}
                          </div>
                          <div className="text-zinc-400 text-xs">
                            Turn {save.turn} | {formatSaveDate(save.updatedAt)}
                          </div>
                          <div className="text-zinc-500 text-xs">
                            {sourceLabel(save.source)} | v{save.saveVersion ?? '?'}
                            {save.map ? ` | ${save.map}` : ''}
                          </div>
                          <div className="text-zinc-500 text-xs truncate">
                            {save.players}
                          </div>
                          {healthLabel(save) && (
                            <div
                              className={`text-xs ${canLoadSave(save) ? 'text-amber-300' : 'text-red-300'}`}
                              title={save.healthMessage}
                            >
                              {healthLabel(save)}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="bg-amber-700 hover:bg-amber-600 text-white text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleLoadSave(save.id)}
                          disabled={!canLoadSave(save)}
                          title={save.healthMessage}
                          data-testid="save-list-load"
                        >
                          {save.health === 'recoverable' ? 'Recover' : 'Load'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-zinc-400 hover:text-red-300 text-xs"
                          onClick={() => handleDeleteSave(save)}
                          aria-label={`Delete ${save.name}`}
                          title={`Delete ${save.name}`}
                          data-testid="save-list-delete"
                        >
                          Delete
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Version number */}
      <div className="absolute bottom-6 text-zinc-600 text-xs tracking-wide">
        v0.1-alpha
      </div>
    </div>
  );
}

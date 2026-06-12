'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/store/useGameStore';
import type { GameState } from '@/engine/core/GameState';

// ─── Save Entry ──────────────────────────────────────────────────────────────

interface SaveEntry {
  id: string;
  name: string;
  turn: number;
  players: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * MainMenuScreen — full-screen overlay shown when mode === 'menu'.
 *
 * Fantasy-themed dark background, game title, menu buttons.
 * Load game button now works.
 */
export function MainMenuScreen() {
  const mode = useGameStore((s) => s.mode);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const loadGame = useGameStore((s) => s.loadGame);
  const addNotification = useGameStore((s) => s.addNotification);
  const [visible, setVisible] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [saves, setSaves] = useState<SaveEntry[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation on mount
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const fetchSaves = useCallback(async () => {
    setLoadingSaves(true);
    try {
      const res = await fetch('/api/saves');
      if (res.ok) {
        const data = await res.json();
        setSaves(data.saves ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingSaves(false);
    }
  }, []);

  const handleLoadClick = useCallback(() => {
    setShowLoadPanel(true);
    fetchSaves();
  }, [fetchSaves]);

  const handleLoadSave = useCallback(
    async (saveId: string) => {
      try {
        const res = await fetch(`/api/load?id=${saveId}`);
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json();
        const gameState: GameState = JSON.parse(data.data);
        loadGame(gameState);
        setShowLoadPanel(false);
        addNotification({
          type: 'success',
          title: 'Загрузка',
          message: `Игра "${data.name}" загружена (ход ${data.turn})`,
          duration: 3000,
        });
      } catch {
        addNotification({
          type: 'error',
          title: 'Ошибка',
          message: 'Не удалось загрузить сохранение',
          duration: 4000,
        });
      }
    },
    [loadGame, addNotification],
  );

  const handleDeleteSave = useCallback(
    async (saveId: string, saveName: string) => {
      try {
        const res = await fetch(`/api/load?id=${saveId}`, { method: 'DELETE' });
        if (res.ok) {
          setSaves((prev) => prev.filter((s) => s.id !== saveId));
          addNotification({
            type: 'info',
            title: 'Удалено',
            message: `Сохранение "${saveName}" удалено`,
            duration: 3000,
          });
        }
      } catch {
        // Silently fail
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
            className="h-14 text-lg font-semibold bg-amber-700 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/30 transition-all duration-200 hover:scale-[1.02]"
          >
            ⚔️ Новая игра
          </Button>

          <Button
            onClick={handleLoadClick}
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
                {loadingSaves ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">
                    Загрузка...
                  </div>
                ) : saves.length === 0 ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">
                    Нет сохранений
                  </div>
                ) : (
                  saves.map((save) => (
                    <Card key={save.id} className="bg-zinc-800/50 border-zinc-700">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {save.name}
                          </div>
                          <div className="text-zinc-500 text-xs">
                            Ход {save.turn} · {new Date(save.updatedAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-amber-700 hover:bg-amber-600 text-white text-xs"
                          onClick={() => handleLoadSave(save.id)}
                        >
                          Загрузить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-zinc-500 hover:text-red-400 text-xs"
                          onClick={() => handleDeleteSave(save.id, save.name)}
                        >
                          🗑
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

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/useGameStore';

/**
 * MainMenuScreen — full-screen overlay shown when mode === 'menu'.
 *
 * Fantasy-themed dark background, game title, menu buttons.
 * All text in Russian.
 */
export function MainMenuScreen() {
  const mode = useGameStore((s) => s.mode);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation on mount
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

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
            disabled
            className="h-14 text-lg font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
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

      {/* Version number */}
      <div className="absolute bottom-6 text-zinc-600 text-xs tracking-wide">
        v0.1-alpha
      </div>
    </div>
  );
}

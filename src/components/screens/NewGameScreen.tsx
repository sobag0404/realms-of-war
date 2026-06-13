'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/store/useGameStore';
import { createDefaultConfig } from '@/engine/core/GameConfig';
import type { GameConfig, PlayerSetup, Difficulty, MapType } from '@/engine/core/GameConfig';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_SIZES = [
  { label: 'Маленькая', radius: 8 },
  { label: 'Средняя', radius: 12 },
  { label: 'Большая', radius: 16 },
  { label: 'Огромная', radius: 20 },
] as const;

const PLAYER_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'settler', label: 'Лёгкий' },
  { value: 'chieftain', label: 'Нормальный' },
  { value: 'warlord', label: 'Сложный' },
  { value: 'emperor', label: 'Безумный' },
];

const MAP_TYPE_OPTIONS: { value: MapType; label: string }[] = [
  { value: 'continents', label: 'Континенты' },
  { value: 'archipelago', label: 'Архипелаг' },
  { value: 'pangea', label: 'Пангея' },
  { value: 'highlands', label: 'Нагорье' },
  { value: 'riftlands', label: 'Разломы' },
];

/**
 * NewGameScreen — side panel for game setup configuration.
 *
 * Allows the user to configure map size, player count, game mode,
 * difficulty, and per-player settings before starting a new game.
 */
export function NewGameScreen() {
  const openPanel = useGameStore((s) => s.openPanel);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const startNewGame = useGameStore((s) => s.startNewGame);

  // ── Local config state ─────────────────────────────────────────────────
  const [mapSizeIndex, setMapSizeIndex] = useState(1); // Medium
  const [playerCount, setPlayerCount] = useState(2);
  const [gameMode, setGameMode] = useState<'single' | 'hotseat'>('single');
  const [difficulty, setDifficulty] = useState<Difficulty>('chieftain');
  const [mapType, setMapType] = useState<MapType>('continents');
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { id: 'player-0', name: 'Игрок 1', color: PLAYER_COLORS[0], isAI: false, slot: 0 },
    { id: 'player-1', name: 'ИИ 1', color: PLAYER_COLORS[1], isAI: true, slot: 1 },
  ]);

  // ── Escape key handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpenPanel]);

  // ── Update player count and resize players array ───────────────────────
  const handlePlayerCountChange = useCallback((count: number) => {
    setPlayerCount(count);
    setPlayers((prev) => {
      const next: PlayerSetup[] = [];
      for (let i = 0; i < count; i++) {
        if (prev[i]) {
          next.push(prev[i]);
        } else {
          next.push({
            id: `player-${i}`,
            name: i === 0 ? `Игрок ${i + 1}` : `ИИ ${i}`,
            color: PLAYER_COLORS[i % PLAYER_COLORS.length],
            isAI: i > 0,
            slot: i,
          });
        }
      }
      return next;
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePlayerNameChange = useCallback(
    (index: number, name: string) => {
      setPlayers((prev) =>
        prev.map((p, i) => (i === index ? { ...p, name } : p)),
      );
    },
    [],
  );

  const handlePlayerColorChange = useCallback(
    (index: number, color: string) => {
      setPlayers((prev) =>
        prev.map((p, i) => (i === index ? { ...p, color } : p)),
      );
    },
    [],
  );

  const handlePlayerAIToggle = useCallback(
    (index: number, isAI: boolean) => {
      setPlayers((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, isAI, name: isAI ? `ИИ ${index}` : `Игрок ${index + 1}` }
            : p,
        ),
      );
    },
    [],
  );

  const handleStartGame = useCallback(() => {
    const config: GameConfig = createDefaultConfig({
      mode: gameMode,
      difficulty,
      // NOTE: Date.now() for seed is OK in UI code — the seed is set once here
      // at game creation and then the RNG state is tracked deterministically.
      // This is NOT game-state logic; it's user-initiated configuration.
      seed: Date.now(),
      players,
      map: {
        radius: MAP_SIZES[mapSizeIndex].radius,
        type: mapType,
        waterLevel: 0.3,
        mountainDensity: 0.1,
        forestDensity: 0.2,
        resourceAbundance: 0.5,
        riftPortals: 3,
      },
    });
    startNewGame(config);
    setOpenPanel('none');
  }, [gameMode, difficulty, players, mapSizeIndex, mapType, startNewGame, setOpenPanel]);

  if (openPanel !== 'newGame') return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-amber-400">Новая игра</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={() => setOpenPanel('none')}
        >
          ✕
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Map Size */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Размер карты</Label>
            <Select
              value={String(mapSizeIndex)}
              onValueChange={(v) => setMapSizeIndex(Number(v))}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {MAP_SIZES.map((size, i) => (
                  <SelectItem key={i} value={String(i)} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                    {size.label} (r={size.radius})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Map Type */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Тип карты</Label>
            <Select value={mapType} onValueChange={(v) => setMapType(v as MapType)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {MAP_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Player Count */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Количество игроков</Label>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <Button
                  key={count}
                  variant={playerCount === count ? 'default' : 'outline'}
                  size="sm"
                  className={
                    playerCount === count
                      ? 'bg-amber-700 hover:bg-amber-600 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:text-white'
                  }
                  onClick={() => handlePlayerCountChange(count)}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          {/* Game Mode */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Режим игры</Label>
            <Select value={gameMode} onValueChange={(v) => setGameMode(v as 'single' | 'hotseat')}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="single" className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                  Одиночная
                </SelectItem>
                <SelectItem value="hotseat" className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                  Hotseat
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Сложность</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Player settings */}
          <div className="space-y-4">
            <Label className="text-amber-400 text-sm font-semibold">Игроки</Label>
            {players.map((player, index) => (
              <div
                key={player.id}
                className="bg-zinc-900/50 rounded-lg p-3 space-y-3 border border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  {/* Color picker */}
                  <div className="flex gap-1.5">
                    {PLAYER_COLORS.slice(0, 6).map((color) => (
                      <button
                        key={color}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          player.color === color
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handlePlayerColorChange(index, color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={player.name}
                    onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm h-8"
                    placeholder="Имя игрока"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`ai-${index}`}
                    checked={player.isAI}
                    onCheckedChange={(checked) =>
                      handlePlayerAIToggle(index, checked === true)
                    }
                    className="border-zinc-600 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
                  />
                  <Label
                    htmlFor={`ai-${index}`}
                    className="text-zinc-400 text-xs cursor-pointer"
                  >
                    Управляется ИИ
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer with start button */}
      <div className="p-4 border-t border-zinc-800">
        <Button
          onClick={handleStartGame}
          className="w-full h-12 text-lg font-semibold bg-amber-700 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/30"
        >
          Начать игру
        </Button>
      </div>
    </div>
  );
}

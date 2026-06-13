'use client';

import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/store/useGameStore';
import type {
  GraphicsPreset,
  ShadowQuality,
  MaxFps,
  ColorBlindMode,
  Language,
} from '@/store/slices/settingsSlice';

// ─── Label maps ───────────────────────────────────────────────────────────────

const GRAPHICS_PRESETS: { value: GraphicsPreset; label: string }[] = [
  { value: 'low', label: 'Низкое' },
  { value: 'medium', label: 'Среднее' },
  { value: 'high', label: 'Высокое' },
  { value: 'ultra', label: 'Ультра' },
];

const FPS_OPTIONS: { value: string; label: string }[] = [
  { value: '30', label: '30 FPS' },
  { value: '60', label: '60 FPS' },
  { value: '120', label: '120 FPS' },
  { value: '0', label: 'Без ограничений' },
];

const COLOR_BLIND_OPTIONS: { value: ColorBlindMode; label: string }[] = [
  { value: 'none', label: 'Выкл' },
  { value: 'protanopia', label: 'Протанопия' },
  { value: 'deuteranopia', label: 'Дейтеранопия' },
  { value: 'tritanopia', label: 'Тританопия' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

/**
 * SettingsScreen — side panel with graphics, audio, and interface settings.
 *
 * All settings persist to localStorage automatically via the store.
 */
export function SettingsScreen() {
  const openPanel = useGameStore((s) => s.openPanel);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);

  // Settings state
  const graphicsPreset = useGameStore((s) => s.graphicsPreset);
  const shadowQuality = useGameStore((s) => s.shadowQuality);
  const maxFps = useGameStore((s) => s.maxFps);
  const masterVolume = useGameStore((s) => s.masterVolume);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const ambienceVolume = useGameStore((s) => s.ambienceVolume);
  const language = useGameStore((s) => s.language);
  const uiScale = useGameStore((s) => s.uiScale);
  const colorBlindMode = useGameStore((s) => s.colorBlindMode);

  // Actions
  const setGraphicsPreset = useGameStore((s) => s.setGraphicsPreset);
  const setShadowQuality = useGameStore((s) => s.setShadowQuality);
  const setMaxFps = useGameStore((s) => s.setMaxFps);
  const setVolume = useGameStore((s) => s.setVolume);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const setUiScale = useGameStore((s) => s.setUiScale);
  const setColorBlindMode = useGameStore((s) => s.setColorBlindMode);
  const resetToDefaults = useGameStore((s) => s.resetToDefaults);

  // ── Escape key handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpenPanel]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleMaxFpsChange = useCallback(
    (value: string) => {
      setMaxFps(Number(value) as MaxFps);
    },
    [setMaxFps],
  );

  if (openPanel !== 'settings') return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-amber-400">Настройки</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={() => setOpenPanel('none')}
        >
          ✕
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="graphics" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 bg-zinc-900 border border-zinc-800">
          <TabsTrigger
            value="graphics"
            className="data-[state=active]:bg-amber-700 data-[state=active]:text-white text-zinc-400"
          >
            Графика
          </TabsTrigger>
          <TabsTrigger
            value="sound"
            className="data-[state=active]:bg-amber-700 data-[state=active]:text-white text-zinc-400"
          >
            Звук
          </TabsTrigger>
          <TabsTrigger
            value="ui"
            className="data-[state=active]:bg-amber-700 data-[state=active]:text-white text-zinc-400"
          >
            Интерфейс
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Graphics Tab */}
          <TabsContent value="graphics" className="p-4 space-y-5 mt-0">
            {/* Graphics Preset */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Качество графики</Label>
              <Select value={graphicsPreset} onValueChange={(v) => setGraphicsPreset(v as GraphicsPreset)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {GRAPHICS_PRESETS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shadow Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Качество теней</Label>
                <span className="text-zinc-500 text-xs">{shadowQuality}/3</span>
              </div>
              <Slider
                value={[shadowQuality]}
                min={0}
                max={3}
                step={1}
                onValueChange={([v]) => setShadowQuality(v as ShadowQuality)}
                className="w-full"
              />
            </div>

            {/* Max FPS */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Макс. FPS</Label>
              <Select value={String(maxFps)} onValueChange={handleMaxFpsChange}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {FPS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Sound Tab */}
          <TabsContent value="sound" className="p-4 space-y-5 mt-0">
            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Общая громкость</Label>
                <span className="text-zinc-500 text-xs">{Math.round(masterVolume * 100)}%</span>
              </div>
              <Slider
                value={[masterVolume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setVolume('master', v)}
                className="w-full"
              />
            </div>

            {/* Music Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Музыка</Label>
                <span className="text-zinc-500 text-xs">{Math.round(musicVolume * 100)}%</span>
              </div>
              <Slider
                value={[musicVolume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setVolume('music', v)}
                className="w-full"
              />
            </div>

            {/* SFX Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Эффекты</Label>
                <span className="text-zinc-500 text-xs">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <Slider
                value={[sfxVolume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setVolume('sfx', v)}
                className="w-full"
              />
            </div>

            {/* Ambience Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Окружение</Label>
                <span className="text-zinc-500 text-xs">{Math.round(ambienceVolume * 100)}%</span>
              </div>
              <Slider
                value={[ambienceVolume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => setVolume('ambience', v)}
                className="w-full"
              />
            </div>
          </TabsContent>

          {/* UI Tab */}
          <TabsContent value="ui" className="p-4 space-y-5 mt-0">
            {/* Language */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Язык</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UI Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-sm">Масштаб интерфейса</Label>
                <span className="text-zinc-500 text-xs">{uiScale.toFixed(1)}x</span>
              </div>
              <Slider
                value={[uiScale]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={([v]) => setUiScale(v)}
                className="w-full"
              />
            </div>

            {/* Color Blind Mode */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Режим дальтонизма</Label>
              <Select value={colorBlindMode} onValueChange={(v) => setColorBlindMode(v as ColorBlindMode)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {COLOR_BLIND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 space-y-2">
        <Button
          variant="outline"
          className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          onClick={resetToDefaults}
        >
          Сбросить настройки
        </Button>
        <Button
          className="w-full bg-amber-700 hover:bg-amber-600 text-white"
          onClick={() => setOpenPanel('none')}
        >
          Закрыть
        </Button>
      </div>
    </div>
  );
}

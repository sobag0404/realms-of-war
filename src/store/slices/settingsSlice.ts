/**
 * Settings slice — user preferences with localStorage persistence.
 *
 * Manages language, audio volumes, graphics quality, color blind mode,
 * and UI scale. All settings are persisted to localStorage and
 * automatically loaded on store initialization.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../useGameStore';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const SETTINGS_STORAGE_KEY = 'realms-of-war-settings';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowQuality = 0 | 1 | 2 | 3;
export type MaxFps = 30 | 60 | 120 | 0;
export type ColorBlindMode =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia';
export type Language = 'ru' | 'en';

// ─── Slice Interface ──────────────────────────────────────────────────────────

export interface SettingsSlice {
  language: Language;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  graphicsPreset: GraphicsPreset;
  shadowQuality: ShadowQuality;
  maxFps: MaxFps;
  colorBlindMode: ColorBlindMode;
  uiScale: number;

  setLanguage: (lang: SettingsSlice['language']) => void;
  setVolume: (
    type: 'master' | 'music' | 'sfx' | 'ambience',
    value: number,
  ) => void;
  setGraphicsPreset: (preset: SettingsSlice['graphicsPreset']) => void;
  setShadowQuality: (quality: SettingsSlice['shadowQuality']) => void;
  setMaxFps: (fps: SettingsSlice['maxFps']) => void;
  setColorBlindMode: (mode: SettingsSlice['colorBlindMode']) => void;
  setUiScale: (scale: number) => void;
  resetToDefaults: () => void;
}

// ─── Default Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Omit<
  SettingsSlice,
  | 'setLanguage'
  | 'setVolume'
  | 'setGraphicsPreset'
  | 'setShadowQuality'
  | 'setMaxFps'
  | 'setColorBlindMode'
  | 'setUiScale'
  | 'resetToDefaults'
> = {
  language: 'ru',
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  ambienceVolume: 0.6,
  graphicsPreset: 'high',
  shadowQuality: 2,
  maxFps: 60,
  colorBlindMode: 'none',
  uiScale: 1.0,
};

// ─── Persistence Helpers ──────────────────────────────────────────────────────

function loadSettingsFromStorage(): Partial<typeof DEFAULT_SETTINGS> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<typeof DEFAULT_SETTINGS>;
  } catch {
    return {};
  }
}

interface SettingsData {
  language: Language;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  graphicsPreset: GraphicsPreset;
  shadowQuality: ShadowQuality;
  maxFps: MaxFps;
  colorBlindMode: ColorBlindMode;
  uiScale: number;
}

function saveSettingsToStorage(settings: SettingsData): void {
  if (typeof window === 'undefined') return;
  try {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      data[key] = settings[key as keyof typeof DEFAULT_SETTINGS];
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is not available
  }
}

// ─── Slice Creator ────────────────────────────────────────────────────────────

export const createSettingsSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  SettingsSlice
> = (set, get) => {
  // Load persisted settings on initialization
  const persisted = loadSettingsFromStorage();
  const initial = { ...DEFAULT_SETTINGS, ...persisted };

  // Helper to persist settings after each change
  const persistSettings = () => {
    const state = get();
    const settingsToSave = {
      language: state.language,
      masterVolume: state.masterVolume,
      musicVolume: state.musicVolume,
      sfxVolume: state.sfxVolume,
      ambienceVolume: state.ambienceVolume,
      graphicsPreset: state.graphicsPreset,
      shadowQuality: state.shadowQuality,
      maxFps: state.maxFps,
      colorBlindMode: state.colorBlindMode,
      uiScale: state.uiScale,
    };
    saveSettingsToStorage(settingsToSave);
  };

  return {
    // ── Initial State ──────────────────────────────────────────────────────

    ...initial,

    // ── Actions ────────────────────────────────────────────────────────────

    setLanguage: (lang) => {
      set({ language: lang }, false, 'settings/setLanguage');
      persistSettings();
    },

    setVolume: (type, value) => {
      const clamped = Math.max(0, Math.min(1, value));
      switch (type) {
        case 'master':
          set({ masterVolume: clamped }, false, 'settings/setVolume/master');
          break;
        case 'music':
          set({ musicVolume: clamped }, false, 'settings/setVolume/music');
          break;
        case 'sfx':
          set({ sfxVolume: clamped }, false, 'settings/setVolume/sfx');
          break;
        case 'ambience':
          set(
            { ambienceVolume: clamped },
            false,
            'settings/setVolume/ambience',
          );
          break;
      }
      persistSettings();
    },

    setGraphicsPreset: (preset) => {
      set({ graphicsPreset: preset }, false, 'settings/setGraphicsPreset');
      persistSettings();
    },

    setShadowQuality: (quality) => {
      set({ shadowQuality: quality }, false, 'settings/setShadowQuality');
      persistSettings();
    },

    setMaxFps: (fps) => {
      set({ maxFps: fps }, false, 'settings/setMaxFps');
      persistSettings();
    },

    setColorBlindMode: (mode) => {
      set({ colorBlindMode: mode }, false, 'settings/setColorBlindMode');
      persistSettings();
    },

    setUiScale: (scale) => {
      const clamped = Math.max(0.5, Math.min(2.0, scale));
      set({ uiScale: clamped }, false, 'settings/setUiScale');
      persistSettings();
    },

    resetToDefaults: () => {
      set({ ...DEFAULT_SETTINGS }, false, 'settings/resetToDefaults');
      persistSettings();
    },
  };
};

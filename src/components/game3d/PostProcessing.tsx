'use client';

import { useMemo, type ReactElement } from 'react';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useGameStore } from '@/store/useGameStore';
import type { GraphicsPreset } from '@/store/slices/settingsSlice';

// ─── Post-processing config per graphics preset ──────────────────────────────

interface PostProcessConfig {
  bloom: {
    enabled: boolean;
    intensity: number;
    luminanceThreshold: number;
    luminanceSmoothing: number;
    mipmapBlur: boolean;
  };
  vignette: {
    enabled: boolean;
    offset: number;
    darkness: number;
  };
  toneMapping: {
    enabled: boolean;
    mode: ToneMappingMode;
    exposure: number;
  };
}

const CONFIGS: Record<GraphicsPreset, PostProcessConfig> = {
  low: {
    bloom: { enabled: false, intensity: 0, luminanceThreshold: 1, luminanceSmoothing: 0, mipmapBlur: false },
    vignette: { enabled: false, offset: 0, darkness: 0 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.0 },
  },
  medium: {
    bloom: { enabled: true, intensity: 0.22, luminanceThreshold: 0.88, luminanceSmoothing: 0.35, mipmapBlur: false },
    vignette: { enabled: true, offset: 0.18, darkness: 0.24 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.14 },
  },
  high: {
    bloom: { enabled: true, intensity: 0.34, luminanceThreshold: 0.82, luminanceSmoothing: 0.42, mipmapBlur: true },
    vignette: { enabled: true, offset: 0.2, darkness: 0.28 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.2 },
  },
  ultra: {
    bloom: { enabled: true, intensity: 0.42, luminanceThreshold: 0.78, luminanceSmoothing: 0.5, mipmapBlur: true },
    vignette: { enabled: true, offset: 0.22, darkness: 0.32 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.24 },
  },
};

// ─── Main PostProcessing component ───────────────────────────────────────────

export function PostProcessing() {
  const graphicsPreset = useGameStore((s) => s.graphicsPreset);
  const config = useMemo(() => CONFIGS[graphicsPreset], [graphicsPreset]);

  // Build effects list based on config
  const effects = useMemo(() => {
    const list: ReactElement[] = [];

    if (config.bloom.enabled) {
      list.push(
        <Bloom
          key="bloom"
          intensity={config.bloom.intensity}
          luminanceThreshold={config.bloom.luminanceThreshold}
          luminanceSmoothing={config.bloom.luminanceSmoothing}
          mipmapBlur={config.bloom.mipmapBlur}
        />,
      );
    }

    if (config.vignette.enabled) {
      list.push(
        <Vignette
          key="vignette"
          offset={config.vignette.offset}
          darkness={config.vignette.darkness}
        />,
      );
    }

    if (config.toneMapping.enabled) {
      list.push(
        <ToneMapping
          key="toneMapping"
          mode={config.toneMapping.mode}
          exposure={config.toneMapping.exposure}
        />,
      );
    }

    return list;
  }, [config]);

  if (effects.length === 0) return null;

  return (
    <EffectComposer>
      {effects}
    </EffectComposer>
  );
}

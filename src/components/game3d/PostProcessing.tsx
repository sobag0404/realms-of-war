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
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.04 },
  },
  medium: {
    bloom: { enabled: true, intensity: 0.16, luminanceThreshold: 0.93, luminanceSmoothing: 0.26, mipmapBlur: false },
    vignette: { enabled: true, offset: 0.24, darkness: 0.16 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.08 },
  },
  high: {
    bloom: { enabled: true, intensity: 0.24, luminanceThreshold: 0.9, luminanceSmoothing: 0.3, mipmapBlur: true },
    vignette: { enabled: true, offset: 0.26, darkness: 0.2 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.12 },
  },
  ultra: {
    bloom: { enabled: true, intensity: 0.3, luminanceThreshold: 0.88, luminanceSmoothing: 0.34, mipmapBlur: true },
    vignette: { enabled: true, offset: 0.28, darkness: 0.22 },
    toneMapping: { enabled: true, mode: ToneMappingMode.ACES_FILMIC, exposure: 1.15 },
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

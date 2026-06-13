'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AssetLoader } from '@/rendering/assets/AssetLoader';
import type { LoadingProgress } from '@/rendering/assets/AssetLoader';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Return type of the useAssetLoader hook */
export interface UseAssetLoaderResult {
  /** The AssetLoader instance (null before initialization) */
  loader: AssetLoader | null;
  /** Current loading progress */
  progress: LoadingProgress;
  /** Whether assets are fully loaded */
  isLoaded: boolean;
  /** Whether loading has started */
  isLoading: boolean;
  /** Any error that occurred during loading */
  error: string | null;
  /** Manually trigger asset loading */
  startLoading: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * React hook for managing the AssetLoader lifecycle.
 *
 * Initializes the AssetLoader, tracks loading progress, and provides
 * loaded assets to components. Supports both automatic and manual loading.
 *
 * Usage:
 *   const { loader, progress, isLoaded, isLoading } = useAssetLoader();
 *
 *   // Start loading automatically on mount:
 *   const { loader, progress, isLoaded } = useAssetLoader({ autoStart: true });
 *
 *   // Start manually:
 *   const { loader, startLoading } = useAssetLoader({ autoStart: false });
 *   startLoading();
 */
export function useAssetLoader(options?: {
  /** Whether to start loading automatically on mount (default: false) */
  autoStart?: boolean;
}): UseAssetLoaderResult {
  const { autoStart = false } = options ?? {};

  // Store the loader instance in a ref for internal access,
  // but expose it via state so consumers don't read a ref during render
  const internalRef = useRef<AssetLoader | null>(null);
  const [loader, setLoader] = useState<AssetLoader | null>(null);
  const [progress, setProgress] = useState<LoadingProgress>({
    total: 0,
    loaded: 0,
    failed: 0,
    percentage: 0,
    currentAsset: '',
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the loader — called once via lazy init pattern
  const ensureLoader = useCallback(() => {
    if (internalRef.current) return internalRef.current;

    const loaderInstance = new AssetLoader((progressUpdate) => {
      setProgress(progressUpdate);

      // Check if loading is complete
      const done = progressUpdate.loaded + progressUpdate.failed;
      if (done >= progressUpdate.total && progressUpdate.total > 0) {
        setIsLoaded(true);
        setIsLoading(false);
      }
    });

    internalRef.current = loaderInstance;
    // Use a microtask to set state, avoiding sync setState issues
    queueMicrotask(() => setLoader(loaderInstance));
    return loaderInstance;
  }, []);

  // Initialize on mount
  useEffect(() => {
    ensureLoader();

    return () => {
      if (internalRef.current) {
        internalRef.current.dispose();
        internalRef.current = null;
      }
      setLoader(null);
    };
  }, [ensureLoader]);

  // Start loading function
  const startLoading = useCallback(async () => {
    const currentLoader = internalRef.current ?? ensureLoader();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await currentLoader.loadPreloadAssets();
      setIsLoaded(true);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading assets';
      setError(message);
      setIsLoading(false);
      console.error('[useAssetLoader] Error:', message);
    }
  }, [isLoading, ensureLoader]);

  // Auto-start loading via requestAnimationFrame to avoid sync setState in effect
  useEffect(() => {
    if (!autoStart || isLoading || isLoaded) return;

    const timer = requestAnimationFrame(() => {
      startLoading();
    });
    return () => cancelAnimationFrame(timer);
  }, [autoStart, isLoading, isLoaded, startLoading]);

  return {
    loader,
    progress,
    isLoaded,
    isLoading,
    error,
    startLoading,
  };
}

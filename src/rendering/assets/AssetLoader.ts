// ============================================================================
// Asset Loader — Realms of War
// ============================================================================

import * as THREE from 'three';
import { getPreloadAssets, getAssetById } from './AssetManifest';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Asset loading state */
export interface LoadingProgress {
  total: number;
  loaded: number;
  failed: number;
  percentage: number;
  currentAsset: string;
}

/** Cached loaded assets */
export interface AssetCache {
  textures: Map<string, THREE.Texture>;
  geometries: Map<string, THREE.BufferGeometry>;
  materials: Map<string, THREE.Material>;
}

/** Callback type for progress updates */
export type ProgressCallback = (progress: LoadingProgress) => void;

// ─── Asset Loader Class ─────────────────────────────────────────────────────

/**
 * Asset loading manager with progress tracking and caching.
 *
 * Uses Three.js LoadingManager for coordinated loading and provides
 * a simple cache keyed by asset id for textures, geometries, and materials.
 */
export class AssetLoader {
  private cache: AssetCache;
  private loadingManager: THREE.LoadingManager;
  private textureLoader: THREE.TextureLoader;
  private progress: LoadingProgress;
  private onProgress: ProgressCallback | null;

  constructor(onProgress?: ProgressCallback) {
    this.cache = {
      textures: new Map(),
      geometries: new Map(),
      materials: new Map(),
    };

    this.onProgress = onProgress ?? null;

    this.progress = {
      total: 0,
      loaded: 0,
      failed: 0,
      percentage: 0,
      currentAsset: '',
    };

    // Set up Three.js loading manager with progress hooks
    this.loadingManager = new THREE.LoadingManager(
      // onLoad — all items finished
      () => {
        this.updateProgress();
      },
      // onProgress — single item loaded
      (url, loaded, total) => {
        this.progress.loaded = loaded;
        this.progress.total = total;
        this.progress.currentAsset = url;
        this.progress.percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
        this.onProgress?.(this.getProgress());
      },
      // onError — single item failed
      (url) => {
        this.progress.failed++;
        this.progress.currentAsset = url;
        console.warn(`[AssetLoader] Failed to load: ${url}`);
        this.onProgress?.(this.getProgress());
      },
    );

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
  }

  // ── Texture Loading ──────────────────────────────────────────────────────

  /** Load a single texture by asset id. Returns cached version if available. */
  async loadTextureById(id: string): Promise<THREE.Texture> {
    const cached = this.cache.textures.get(id);
    if (cached) return cached;

    const entry = getAssetById(id);
    if (!entry || entry.type !== 'texture') {
      throw new Error(`[AssetLoader] No texture asset with id "${id}"`);
    }

    return this.loadTexture(id, entry.path);
  }

  /** Load a single texture from a path and cache it under the given id. */
  async loadTexture(id: string, path: string): Promise<THREE.Texture> {
    const cached = this.cache.textures.get(id);
    if (cached) return cached;

    return new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        `/assets/${path}`,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          this.cache.textures.set(id, texture);
          resolve(texture);
        },
        undefined,
        (err) => {
          reject(new Error(`[AssetLoader] Failed to load texture "${id}" from "${path}": ${err}`));
        },
      );
    });
  }

  // ── Geometry & Material Caching ──────────────────────────────────────────

  /** Cache a geometry under an id. */
  cacheGeometry(id: string, geometry: THREE.BufferGeometry): void {
    if (!this.cache.geometries.has(id)) {
      this.cache.geometries.set(id, geometry);
    }
  }

  /** Cache a material under an id. */
  cacheMaterial(id: string, material: THREE.Material): void {
    if (!this.cache.materials.has(id)) {
      this.cache.materials.set(id, material);
    }
  }

  // ── Bulk Loading ─────────────────────────────────────────────────────────

  /** Load all assets marked as preload in the manifest. */
  async loadPreloadAssets(): Promise<void> {
    const preloadList = getPreloadAssets();
    const textureAssets = preloadList.filter((a) => a.type === 'texture');

    this.progress.total = textureAssets.length;
    this.progress.loaded = 0;
    this.progress.failed = 0;
    this.progress.percentage = 0;

    const promises = textureAssets.map((entry) =>
      this.loadTexture(entry.id, entry.path).catch(() => {
        // Error already tracked by loadingManager; continue loading others
      }),
    );

    await Promise.all(promises);
  }

  // ── Cache Access ─────────────────────────────────────────────────────────

  /** Get a cached texture by id. Returns undefined if not loaded. */
  getTexture(id: string): THREE.Texture | undefined {
    return this.cache.textures.get(id);
  }

  /** Get a cached geometry by id. Returns undefined if not loaded. */
  getGeometry(id: string): THREE.BufferGeometry | undefined {
    return this.cache.geometries.get(id);
  }

  /** Get a cached material by id. Returns undefined if not loaded. */
  getMaterial(id: string): THREE.Material | undefined {
    return this.cache.materials.get(id);
  }

  /** Get the current loading progress. */
  getProgress(): LoadingProgress {
    return { ...this.progress };
  }

  /** Check whether a specific asset is already in cache. */
  isLoaded(id: string): boolean {
    return (
      this.cache.textures.has(id) ||
      this.cache.geometries.has(id) ||
      this.cache.materials.has(id)
    );
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  /** Dispose all cached assets and free GPU resources. */
  dispose(): void {
    for (const texture of this.cache.textures.values()) {
      texture.dispose();
    }
    for (const geometry of this.cache.geometries.values()) {
      geometry.dispose();
    }
    for (const material of this.cache.materials.values()) {
      material.dispose();
    }
    this.cache.textures.clear();
    this.cache.geometries.clear();
    this.cache.materials.clear();

    this.progress = {
      total: 0,
      loaded: 0,
      failed: 0,
      percentage: 0,
      currentAsset: '',
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /** Recalculate percentage from current counters. */
  private updateProgress(): void {
    const done = this.progress.loaded + this.progress.failed;
    this.progress.percentage =
      this.progress.total > 0 ? Math.round((done / this.progress.total) * 100) : 100;
    this.onProgress?.(this.getProgress());
  }
}

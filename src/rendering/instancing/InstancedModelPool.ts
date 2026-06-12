// ============================================================================
// Instanced Model Pool — Realms of War
// ============================================================================
// Pool for instanced model rendering. Manages InstancedMesh objects for
// repeated models (units, buildings, decorations), providing efficient
// draw-call batching via Three.js InstancedMesh.

import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Pool entry for an instanced model */
export interface PoolEntry {
  modelId: string;
  mesh: THREE.InstancedMesh;
  count: number;
  maxCount: number;
  transformMatrix: THREE.Matrix4;
  dummy: THREE.Object3D;
}

// ─── InstancedModelPool ──────────────────────────────────────────────────────

/**
 * Instanced model pool for efficient rendering of repeated models.
 *
 * Instead of creating one mesh per game entity, we group entities of the
 * same model type into a single InstancedMesh. This dramatically reduces
 * draw calls when there are many units or buildings of the same type.
 *
 * Usage:
 *   1. Call `initPool()` for each model type with an estimated max count.
 *   2. Call `addInstance()` for each entity, getting back an instance index.
 *   3. Call `updateInstance()` when an entity moves/rotates.
 *   4. Call `removeInstance()` when an entity is destroyed.
 *   5. Call `resetFrame()` at the start of each frame to reset counts.
 */
export class InstancedModelPool {
  private pools: Map<string, PoolEntry>;
  private scene: THREE.Scene | null;

  constructor(scene?: THREE.Scene) {
    this.pools = new Map();
    this.scene = scene ?? null;
  }

  // ── Pool Setup ─────────────────────────────────────────────────────────

  /**
   * Initialize the pool for a specific model.
   *
   * @param modelId - Unique identifier for this model type
   * @param geometry - The geometry to instance
   * @param material - The material to use
   * @param maxCount - Maximum number of instances (pre-allocated)
   */
  initPool(
    modelId: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxCount: number,
  ): void {
    if (this.pools.has(modelId)) {
      // Dispose existing pool if re-initializing
      this.removePool(modelId);
    }

    const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    mesh.count = 0; // Start with 0 visible instances
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // We manage visibility manually

    const entry: PoolEntry = {
      modelId,
      mesh,
      count: 0,
      maxCount,
      transformMatrix: new THREE.Matrix4(),
      dummy: new THREE.Object3D(),
    };

    this.pools.set(modelId, entry);

    // Add to scene if available
    if (this.scene) {
      this.scene.add(mesh);
    }
  }

  // ── Instance Management ────────────────────────────────────────────────

  /**
   * Add an instance of a model at a position.
   *
   * @returns The instance index, or -1 if the pool is full
   */
  addInstance(
    modelId: string,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3,
  ): number {
    const entry = this.pools.get(modelId);
    if (!entry) {
      console.warn(`[InstancedModelPool] No pool for model "${modelId}"`);
      return -1;
    }

    if (entry.count >= entry.maxCount) {
      console.warn(`[InstancedModelPool] Pool full for model "${modelId}" (max: ${entry.maxCount})`);
      return -1;
    }

    const index = entry.count;

    // Set up the dummy object for matrix computation
    entry.dummy.position.copy(position);
    entry.dummy.rotation.copy(rotation ?? new THREE.Euler(0, 0, 0));
    entry.dummy.scale.copy(scale ?? new THREE.Vector3(1, 1, 1));
    entry.dummy.updateMatrix();

    entry.mesh.setMatrixAt(index, entry.dummy.matrix);
    entry.count++;
    entry.mesh.count = entry.count;
    entry.mesh.instanceMatrix.needsUpdate = true;

    return index;
  }

  /**
   * Update an instance's transform.
   */
  updateInstance(
    modelId: string,
    index: number,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3,
  ): void {
    const entry = this.pools.get(modelId);
    if (!entry) return;

    if (index < 0 || index >= entry.count) {
      console.warn(`[InstancedModelPool] Invalid index ${index} for model "${modelId}"`);
      return;
    }

    entry.dummy.position.copy(position);
    entry.dummy.rotation.copy(rotation ?? new THREE.Euler(0, 0, 0));
    entry.dummy.scale.copy(scale ?? new THREE.Vector3(1, 1, 1));
    entry.dummy.updateMatrix();

    entry.mesh.setMatrixAt(index, entry.dummy.matrix);
    entry.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Remove an instance by swapping it with the last instance and decrementing count.
   * This is O(1) but changes the indices of instances — callers must track remapping.
   *
   * @returns The new index of the element that was swapped in, or -1 if nothing changed
   */
  removeInstance(modelId: string, index: number): number {
    const entry = this.pools.get(modelId);
    if (!entry) return -1;

    if (index < 0 || index >= entry.count) {
      console.warn(`[InstancedModelPool] Invalid index ${index} for model "${modelId}"`);
      return -1;
    }

    const lastIndex = entry.count - 1;

    if (index !== lastIndex) {
      // Swap: copy the last instance's matrix to the removed index
      const lastMatrix = new THREE.Matrix4();
      entry.mesh.getMatrixAt(lastIndex, lastMatrix);
      entry.mesh.setMatrixAt(index, lastMatrix);
    }

    entry.count--;
    entry.mesh.count = entry.count;
    entry.mesh.instanceMatrix.needsUpdate = true;

    // The element that was at lastIndex is now at index
    return index;
  }

  // ── Visibility ─────────────────────────────────────────────────────────

  /**
   * Set the visibility of all instances of a model.
   */
  setVisible(modelId: string, visible: boolean): void {
    const entry = this.pools.get(modelId);
    if (!entry) return;
    entry.mesh.visible = visible;
  }

  /**
   * Set the visibility of all pools.
   */
  setAllVisible(visible: boolean): void {
    for (const entry of this.pools.values()) {
      entry.mesh.visible = visible;
    }
  }

  // ── Per-Instance Color ─────────────────────────────────────────────────

  /**
   * Set the color of a specific instance (e.g., for player ownership coloring).
   */
  setInstanceColor(modelId: string, index: number, color: THREE.Color): void {
    const entry = this.pools.get(modelId);
    if (!entry) return;

    if (index < 0 || index >= entry.count) return;

    // Initialize instance color attribute if not present
    if (!entry.mesh.instanceColor) {
      const colors = new Float32Array(entry.maxCount * 3);
      // Fill with white by default
      colors.fill(1);
      entry.mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }

    entry.mesh.instanceColor.setXYZ(index, color.r, color.g, color.b);
    entry.mesh.instanceColor.needsUpdate = true;
  }

  // ── Frame Reset ────────────────────────────────────────────────────────

  /**
   * Reset all pools for a new frame.
   * Sets all instance counts to 0, ready for re-population.
   */
  resetFrame(): void {
    for (const entry of this.pools.values()) {
      entry.count = 0;
      entry.mesh.count = 0;
    }
  }

  // ── Query ──────────────────────────────────────────────────────────────

  /** Get the pool entry for a model. */
  getPool(modelId: string): PoolEntry | undefined {
    return this.pools.get(modelId);
  }

  /** Get the InstancedMesh for a model. */
  getMesh(modelId: string): THREE.InstancedMesh | undefined {
    return this.pools.get(modelId)?.mesh;
  }

  /** Get the current instance count for a model. */
  getInstanceCount(modelId: string): number {
    return this.pools.get(modelId)?.count ?? 0;
  }

  /** Get all model ids with active pools. */
  getModelIds(): string[] {
    return Array.from(this.pools.keys());
  }

  /** Get total instance count across all pools. */
  getTotalInstanceCount(): number {
    let total = 0;
    for (const entry of this.pools.values()) {
      total += entry.count;
    }
    return total;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  /** Remove a specific pool and its mesh from the scene. */
  private removePool(modelId: string): void {
    const entry = this.pools.get(modelId);
    if (!entry) return;

    if (this.scene) {
      this.scene.remove(entry.mesh);
    }

    entry.mesh.geometry.dispose();
    if (Array.isArray(entry.mesh.material)) {
      entry.mesh.material.forEach((m) => m.dispose());
    } else {
      entry.mesh.material.dispose();
    }

    this.pools.delete(modelId);
  }

  /** Dispose all resources and remove meshes from the scene. */
  dispose(): void {
    for (const modelId of Array.from(this.pools.keys())) {
      this.removePool(modelId);
    }
    this.pools.clear();
  }
}

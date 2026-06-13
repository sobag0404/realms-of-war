// ============================================================================
// Hex Raycaster — Realms of War
// ============================================================================
// Raycasting utility for hex picking on the XZ plane.
// Casts a ray from the camera through the mouse position and intersects
// with the Y=0 ground plane, then converts the intersection point to
// hex coordinates using the axial coordinate system.

import * as THREE from 'three';
import { worldToFractionalHex, HEX_RADIUS } from '@/engine/hex/coordinates';
import { roundAxial } from '@/engine/hex/rounding';
import type { HexCoord } from '@/engine/core/types';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of a hex pick */
export interface HexPickResult {
  /** The hex coordinate that was picked */
  hex: HexCoord;
  /** The 3D world position of the intersection */
  point: THREE.Vector3;
  /** Distance from camera */
  distance: number;
}

// ─── HexRaycaster ────────────────────────────────────────────────────────────

/**
 * Hex raycaster for mouse picking on the hex grid.
 *
 * Instead of raycasting against individual hex meshes (expensive for large maps),
 * we raycast against the Y=0 ground plane and convert the intersection point
 * to hex coordinates mathematically. This is O(1) regardless of map size.
 */
export class HexRaycaster {
  private raycaster: THREE.Raycaster;
  private hexPlane: THREE.Plane;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    // The hex grid lies on the XZ plane at Y=0
    this.hexPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  // ── Picking ────────────────────────────────────────────────────────────

  /**
   * Pick a hex from a mouse event.
   *
   * @param event - The mouse event from the canvas
   * @param camera - The current Three.js camera
   * @param canvas - The canvas element (for coordinate normalization)
   * @returns HexPickResult with the hex coordinate and intersection info, or null
   */
  pickHex(
    event: MouseEvent,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
  ): HexPickResult | null {
    const coords = this.getNormalizedCoords(event, canvas);
    if (!coords) return null;

    this.raycaster.setFromCamera(coords, camera);

    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.hexPlane, intersection);

    if (!hit) return null;

    const hex = this.worldToHex(intersection);

    return {
      hex,
      point: intersection.clone(),
      distance: this.raycaster.ray.origin.distanceTo(intersection),
    };
  }

  /**
   * Convert screen coordinates to a hex coordinate.
   *
   * @param screenX - Screen X position (pixels)
   * @param screenY - Screen Y position (pixels)
   * @param camera - The current Three.js camera
   * @param canvas - The canvas element (for coordinate normalization)
   * @returns HexCoord or null if no intersection
   */
  screenToHex(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
  ): HexCoord | null {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.hexPlane, intersection);

    if (!hit) return null;

    return this.worldToHex(intersection);
  }

  /**
   * Convert a world position to a hex coordinate.
   *
   * Uses the worldToFractionalHex function from the hex module
   * and rounds to the nearest valid hex using cube rounding.
   *
   * @param worldPos - World position (XZ plane, Y is ignored)
   * @param radius - Hex radius (default: 1.0)
   * @returns Rounded hex coordinate
   */
  worldToHex(worldPos: THREE.Vector3, radius: number = HEX_RADIUS): HexCoord {
    const fractional = worldToFractionalHex(worldPos.x, worldPos.z, radius);
    return roundAxial(fractional);
  }

  // ── Batch Picking ──────────────────────────────────────────────────────

  /**
   * Pick multiple hexes along a line (useful for drag selection).
   *
   * @param startEvent - Mouse event at drag start
   * @param endEvent - Mouse event at drag end
   * @param camera - The current Three.js camera
   * @param canvas - The canvas element
   * @returns Array of HexPickResult for all hexes along the line
   */
  pickHexLine(
    startEvent: MouseEvent,
    endEvent: MouseEvent,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
  ): HexPickResult[] {
    const start = this.pickHex(startEvent, camera, canvas);
    const end = this.pickHex(endEvent, camera, canvas);
    if (!start || !end) return [];

    // Use hex line drawing algorithm to get all hexes
    const results: HexPickResult[] = [];
    const line = hexLine(start.hex, end.hex);

    for (const hex of line) {
      // Compute approximate world position for each hex
      const [wx, , wz] = hexToWorldPos(hex);
      results.push({
        hex,
        point: new THREE.Vector3(wx, 0, wz),
        distance: 0, // Not meaningful for line picks
      });
    }

    return results;
  }

  // ── Internal ───────────────────────────────────────────────────────────

  /** Get NDC coordinates from a mouse event. */
  private getNormalizedCoords(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
  ): THREE.Vector2 | null {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Sanity check — is the click within the canvas?
    if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) return null;

    return new THREE.Vector2(ndcX, ndcY);
  }
}

// ─── Standalone Helpers ──────────────────────────────────────────────────────

/** Convert hex coord to approximate world position (standalone, no Three.js import needed) */
function hexToWorldPos(hex: HexCoord, radius: number = HEX_RADIUS): [number, number, number] {
  const x = radius * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
  const z = radius * (1.5 * hex.r);
  return [x, 0, z];
}

/** Hex line drawing using linear interpolation (Lerp + round) */
function hexLine(start: HexCoord, end: HexCoord): HexCoord[] {
  const results: HexCoord[] = [];

  // Compute distance in cube coordinates
  const dx = end.q - start.q;
  const dr = end.r - start.r;
  const dy = -dx - dr; // cube y = -q - r
  const distance = Math.max(Math.abs(dx), Math.abs(dr), Math.abs(dy));

  if (distance === 0) {
    results.push({ q: start.q, r: start.r });
    return results;
  }

  const step = 1 / Math.max(distance, 1);

  for (let i = 0; i <= distance; i++) {
    const t = i * step;
    const fq = start.q + dx * t;
    const fr = start.r + dr * t;
    results.push(roundAxial({ q: fq, r: fr }));
  }

  return results;
}

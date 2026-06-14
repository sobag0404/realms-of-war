export interface CameraViewportSize {
  width: number;
  height: number;
}

export interface CameraMapSize {
  width: number;
  depth: number;
}

export const CAMERA_MIN_ZOOM = 8;
export const CAMERA_MAX_ZOOM = 56;
export const CAMERA_DEFAULT_ZOOM = 30;
export const CAMERA_DEFAULT_ROTATION = 45;
export const CAMERA_DEFAULT_PITCH = 58;
export const CAMERA_DEFAULT_DISTANCE = 36;
export const CAMERA_BASE_PAN_ZOOM = 24;
export const CAMERA_MAP_PADDING_HEXES = 4;
export const CAMERA_WHEEL_ZOOM_FACTOR = 1.12;

const DEFAULT_VIEWPORT: CameraViewportSize = { width: 1280, height: 720 };
const DEFAULT_MAP_SIZE: CameraMapSize = { width: 42, depth: 26 };
const MIN_DEFAULT_VISIBLE_DEPTH = 22;
const MAX_DEFAULT_VISIBLE_DEPTH = 36;
const COMPACT_MAX_DEFAULT_VISIBLE_DEPTH = 32;
const MAP_DEPTH_VISIBLE_FRACTION = 0.74;
const MAP_WIDTH_VISIBLE_FRACTION = 0.62;

export function clampCameraZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return CAMERA_DEFAULT_ZOOM;
  return Math.max(CAMERA_MIN_ZOOM, Math.min(CAMERA_MAX_ZOOM, zoom));
}

export function getViewportMapDefaultZoom(
  mapSize: CameraMapSize = DEFAULT_MAP_SIZE,
  viewport: CameraViewportSize = DEFAULT_VIEWPORT,
): number {
  const viewportWidth = Math.max(1, viewport.width || DEFAULT_VIEWPORT.width);
  const viewportHeight = Math.max(1, viewport.height || DEFAULT_VIEWPORT.height);
  const aspect = viewportWidth / viewportHeight;

  const widthDrivenDepth = (Math.max(1, mapSize.width) * MAP_WIDTH_VISIBLE_FRACTION) / Math.max(0.75, aspect);
  const depthDrivenDepth = Math.max(1, mapSize.depth) * MAP_DEPTH_VISIBLE_FRACTION;
  if (viewportWidth < 720) {
    const compactVisibleDepth = Math.max(
      MIN_DEFAULT_VISIBLE_DEPTH,
      Math.min(COMPACT_MAX_DEFAULT_VISIBLE_DEPTH, depthDrivenDepth),
    );
    return clampCameraZoom(Math.round((viewportHeight / compactVisibleDepth) * 2) / 2);
  }

  const targetVisibleDepth = Math.max(
    MIN_DEFAULT_VISIBLE_DEPTH,
    Math.min(MAX_DEFAULT_VISIBLE_DEPTH, Math.max(widthDrivenDepth, depthDrivenDepth)),
  );

  return clampCameraZoom(Math.round((viewportHeight / targetVisibleDepth) * 2) / 2);
}

export function getWheelCameraZoom(currentZoom: number, deltaY: number): number {
  const factor = deltaY > 0 ? 1 / CAMERA_WHEEL_ZOOM_FACTOR : CAMERA_WHEEL_ZOOM_FACTOR;
  return clampCameraZoom(Math.round(currentZoom * factor * 2) / 2);
}

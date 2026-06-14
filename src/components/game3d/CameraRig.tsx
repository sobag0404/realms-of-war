'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import {
  CAMERA_BASE_PAN_ZOOM,
  CAMERA_DEFAULT_DISTANCE,
  CAMERA_DEFAULT_PITCH,
  CAMERA_DEFAULT_ROTATION,
  CAMERA_MAP_PADDING_HEXES,
  getViewportMapDefaultZoom,
  getWheelCameraZoom,
} from '@/config/camera';
import { hexToWorld } from '@/engine/hex/coordinates';

/** Edge scroll zone in pixels */
const EDGE_ZONE = 20;

/** Pan speed at the configured reference zoom */
const BASE_PAN_SPEED = 6;

/** Rotation step in degrees */
const ROTATION_STEP = 15;

const CAMERA_INPUT_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

function isKeyboardInputCaptured(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[role="dialog"], [role="menu"], [aria-modal="true"]')) return true;
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"], [data-camera-input-lock]'));
}

export function CameraRig() {
  const { gl, size } = useThree();
  const camRef = useRef<THREE.OrthographicCamera | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const isRotating = useRef(false);
  const keysDown = useRef<Set<string>>(new Set());
  const mousePos = useRef<{ x: number; y: number } | null>(null);
  const cameraPreset = useRef({
    mapSignature: '',
    defaultZoom: 0,
    userAdjustedZoom: false,
  });

  const setCameraTarget = useGameStore((s) => s.setCameraTarget);
  const setCameraZoom = useGameStore((s) => s.setCameraZoom);
  const setCameraRotation = useGameStore((s) => s.setCameraRotation);
  const setCameraPitch = useGameStore((s) => s.setCameraPitch);
  const cameraTarget = useGameStore((s) => s.cameraTarget);
  const cameraZoom = useGameStore((s) => s.cameraZoom);
  const cameraRotation = useGameStore((s) => s.cameraRotation);
  const cameraPitch = useGameStore((s) => s.cameraPitch);
  const gameState = useGameStore((s) => s.gameState);

  const mapMetrics = useMemo(() => {
    if (!gameState) {
      return {
        bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
        size: { width: 60, depth: 60 },
        signature: 'empty',
      };
    }

    const tiles = Object.values(gameState.map.tiles);
    if (tiles.length === 0) {
      return {
        bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
        size: { width: 60, depth: 60 },
        signature: 'empty-map',
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const tile of tiles) {
      const [x, , z] = hexToWorld(tile.coord);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const width = Math.max(1, maxX - minX);
    const depth = Math.max(1, maxZ - minZ);
    const tileStep = Math.max(width, depth) / Math.max(1, Math.sqrt(tiles.length));
    const padWorld = CAMERA_MAP_PADDING_HEXES * Math.max(Math.sqrt(3), tileStep);
    const bounds = {
      minX: minX - padWorld,
      maxX: maxX + padWorld,
      minZ: minZ - padWorld,
      maxZ: maxZ + padWorld,
    };
    const signature = [
      gameState.seed,
      gameState.map.radius,
      tiles.length,
      Math.round(minX * 100),
      Math.round(maxX * 100),
      Math.round(minZ * 100),
      Math.round(maxZ * 100),
    ].join(':');

    return {
      bounds,
      size: { width, depth },
      signature,
    };
  }, [gameState]);

  // Compute map bounds from game state
  const mapBounds = useRef(mapMetrics.bounds);

  useEffect(() => {
    mapBounds.current = mapMetrics.bounds;
  }, [mapMetrics.bounds]);

  useEffect(() => {
    if (!gameState) {
      cameraPreset.current = {
        mapSignature: '',
        defaultZoom: 0,
        userAdjustedZoom: false,
      };
      return;
    }

    const defaultZoom = getViewportMapDefaultZoom(mapMetrics.size, size);
    const isNewMap = cameraPreset.current.mapSignature !== mapMetrics.signature;
    const isStillOnPreset =
      !cameraPreset.current.userAdjustedZoom &&
      (cameraPreset.current.defaultZoom === 0 ||
        Math.abs(cameraZoom - cameraPreset.current.defaultZoom) < 0.01);

    if (isNewMap) {
      cameraPreset.current = {
        mapSignature: mapMetrics.signature,
        defaultZoom,
        userAdjustedZoom: false,
      };
      setCameraZoom(defaultZoom);
      setCameraRotation(CAMERA_DEFAULT_ROTATION);
      setCameraPitch(CAMERA_DEFAULT_PITCH);
      return;
    }

    if (isStillOnPreset && Math.abs(defaultZoom - cameraPreset.current.defaultZoom) >= 0.5) {
      cameraPreset.current.defaultZoom = defaultZoom;
      setCameraZoom(defaultZoom);
    }
  }, [
    cameraZoom,
    gameState,
    mapMetrics.signature,
    mapMetrics.size,
    setCameraPitch,
    setCameraRotation,
    setCameraZoom,
    size,
  ]);

  const clampCameraTarget = useCallback((target: [number, number, number]): [number, number, number] => {
    const bounds = mapBounds.current;
    return [
      Math.max(bounds.minX, Math.min(bounds.maxX, target[0])),
      0,
      Math.max(bounds.minZ, Math.min(bounds.maxZ, target[2])),
    ];
  }, []);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (CAMERA_INPUT_KEYS.has(key) && isKeyboardInputCaptured(e.target)) {
        keysDown.current.delete(key);
        return;
      }
      keysDown.current.add(key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse events for panning and rotation
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or alt+left click = rotate
      isRotating.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    } else if (e.button === 2) {
      // Right click = pan
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };

    if (isDragging.current && lastMouse.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      // Convert screen delta to world delta based on camera orientation
      const yawRad = (cameraRotation * Math.PI) / 180;
      const zoomFactor = cameraZoom / CAMERA_BASE_PAN_ZOOM;
      const panScale = 0.03 / zoomFactor;

      const worldDx = (-dx * Math.cos(yawRad) + dy * Math.sin(yawRad)) * panScale;
      const worldDz = (dx * Math.sin(yawRad) + dy * Math.cos(yawRad)) * panScale;

      setCameraTarget(clampCameraTarget([
        cameraTarget[0] + worldDx,
        0,
        cameraTarget[2] + worldDz,
      ]));
    }

    if (isRotating.current && lastMouse.current) {
      const dx = e.clientX - lastMouse.current.x;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      if (Math.abs(dx) > 5) {
        const direction = dx > 0 ? 1 : -1;
        const newRotation = cameraRotation + direction * ROTATION_STEP;
        setCameraRotation(((newRotation % 360) + 360) % 360);
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    }
  }, [cameraRotation, cameraZoom, cameraTarget, setCameraTarget, setCameraRotation, clampCameraTarget]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    isRotating.current = false;
    lastMouse.current = null;
    mousePos.current = null;
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    cameraPreset.current.userAdjustedZoom = true;
    setCameraZoom(getWheelCameraZoom(cameraZoom, e.deltaY));
  }, [cameraZoom, setCameraZoom]);

  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, handleContextMenu]);

  // Frame update: apply camera position using imperative ref
  useFrame(({ camera }, delta) => {
    // Store camera ref on first frame
    if (camRef.current === null) {
      camRef.current = camera as THREE.OrthographicCamera;
    }
    const cam = camRef.current;
    if (!cam) return;

    // Keyboard panning
    const keys = keysDown.current;
    const zoomFactor = cameraZoom / CAMERA_BASE_PAN_ZOOM;
    const panSpeed = BASE_PAN_SPEED * delta / zoomFactor;
    const yawRad = (cameraRotation * Math.PI) / 180;

    let dx = 0, dz = 0;
    if (keys.has('w') || keys.has('arrowup')) dz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dz += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    let frameTarget = cameraTarget;
    let targetWasUpdated = false;

    if (dx !== 0 || dz !== 0) {
      // Rotate input by camera yaw
      const worldDx = dx * Math.cos(yawRad) - dz * Math.sin(yawRad);
      const worldDz = dx * Math.sin(yawRad) + dz * Math.cos(yawRad);
      const len = Math.sqrt(worldDx * worldDx + worldDz * worldDz);
      const newTarget = clampCameraTarget([
        cameraTarget[0] + (worldDx / len) * panSpeed,
        0,
        cameraTarget[2] + (worldDz / len) * panSpeed,
      ] as [number, number, number]);
      frameTarget = newTarget;
      targetWasUpdated = true;
      setCameraTarget(newTarget);
    }

    // Edge scroll
    const currentMouse = mousePos.current;
    const edgeDx = currentMouse
      ? currentMouse.x < EDGE_ZONE ? -1 : currentMouse.x > window.innerWidth - EDGE_ZONE ? 1 : 0
      : 0;
    const edgeDz = currentMouse
      ? currentMouse.y < EDGE_ZONE ? -1 : currentMouse.y > window.innerHeight - EDGE_ZONE ? 1 : 0
      : 0;

    if (edgeDx !== 0 || edgeDz !== 0) {
      const edgeSpeed = BASE_PAN_SPEED * delta / zoomFactor * 0.5;
      const worldDx = edgeDx * Math.cos(yawRad) - edgeDz * Math.sin(yawRad);
      const worldDz = edgeDx * Math.sin(yawRad) + edgeDz * Math.cos(yawRad);
      const newTarget = clampCameraTarget([
        frameTarget[0] + worldDx * edgeSpeed,
        0,
        frameTarget[2] + worldDz * edgeSpeed,
      ]);
      frameTarget = newTarget;
      targetWasUpdated = true;
      setCameraTarget(newTarget);
    }

    // Clamp target to map bounds
    const clampedTarget = clampCameraTarget(frameTarget);
    if (!targetWasUpdated && (clampedTarget[0] !== cameraTarget[0] || clampedTarget[2] !== cameraTarget[2])) {
      setCameraTarget(clampedTarget);
    }
    const tx = clampedTarget[0];
    const tz = clampedTarget[2];

    // Compute camera position from target, yaw, pitch
    const pitchRad = (cameraPitch * Math.PI) / 180;
    const distance = CAMERA_DEFAULT_DISTANCE;
    const cx = tx + distance * Math.cos(pitchRad) * Math.sin(yawRad);
    const cy = distance * Math.sin(pitchRad);
    const cz = tz + distance * Math.cos(pitchRad) * Math.cos(yawRad);

    cam.position.set(cx, cy, cz);
    cam.lookAt(tx, 0, tz);
    cam.zoom = cameraZoom;
    cam.updateProjectionMatrix();
  });

  return null;
}

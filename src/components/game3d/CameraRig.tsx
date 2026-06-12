'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';

/** Camera zoom limits */
const MIN_ZOOM = 4;
const MAX_ZOOM = 28;

/** Edge scroll zone in pixels */
const EDGE_ZONE = 20;

/** Pan speed at zoom 12 */
const BASE_PAN_SPEED = 6;

/** Rotation step in degrees */
const ROTATION_STEP = 15;

/** Map bounds padding in hex units */
const MAP_PADDING = 4;

export function CameraRig() {
  const { gl } = useThree();
  const camRef = useRef<THREE.OrthographicCamera | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const isRotating = useRef(false);
  const keysDown = useRef<Set<string>>(new Set());
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const setCameraTarget = useGameStore((s) => s.setCameraTarget);
  const setCameraZoom = useGameStore((s) => s.setCameraZoom);
  const setCameraRotation = useGameStore((s) => s.setCameraRotation);
  const cameraTarget = useGameStore((s) => s.cameraTarget);
  const cameraZoom = useGameStore((s) => s.cameraZoom);
  const cameraRotation = useGameStore((s) => s.cameraRotation);
  const cameraPitch = useGameStore((s) => s.cameraPitch);
  const gameState = useGameStore((s) => s.gameState);

  // Compute map bounds from game state
  const mapBounds = useRef({ minX: -30, maxX: 30, minZ: -30, maxZ: 30 });

  useEffect(() => {
    if (!gameState) return;
    const tiles = Object.values(gameState.map.tiles);
    if (tiles.length === 0) return;

    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const tile of tiles) {
      if (tile.coord.q < minQ) minQ = tile.coord.q;
      if (tile.coord.q > maxQ) maxQ = tile.coord.q;
      if (tile.coord.r < minR) minR = tile.coord.r;
      if (tile.coord.r > maxR) maxR = tile.coord.r;
    }

    // Convert to world coords (approximate)
    const sqrt3 = Math.sqrt(3);
    const padWorld = MAP_PADDING * sqrt3;
    mapBounds.current = {
      minX: minQ * sqrt3 - padWorld,
      maxX: maxQ * sqrt3 + padWorld,
      minZ: minR * 1.5 - padWorld,
      maxZ: maxR * 1.5 + padWorld,
    };
  }, [gameState]);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current.add(e.key.toLowerCase());
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
      const zoomFactor = cameraZoom / 12;
      const panScale = 0.03 / zoomFactor;

      const worldDx = (-dx * Math.cos(yawRad) + dy * Math.sin(yawRad)) * panScale;
      const worldDz = (dx * Math.sin(yawRad) + dy * Math.cos(yawRad)) * panScale;

      setCameraTarget([
        cameraTarget[0] + worldDx,
        0,
        cameraTarget[2] + worldDz,
      ]);
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
  }, [cameraRotation, cameraZoom, cameraTarget, setCameraTarget, setCameraRotation]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    isRotating.current = false;
    lastMouse.current = null;
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cameraZoom + delta));
    setCameraZoom(newZoom);
  }, [cameraZoom, setCameraZoom]);

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]);

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
    const zoomFactor = cameraZoom / 12;
    const panSpeed = BASE_PAN_SPEED * delta / zoomFactor;
    const yawRad = (cameraRotation * Math.PI) / 180;

    let dx = 0, dz = 0;
    if (keys.has('w') || keys.has('arrowup')) dz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dz += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dz !== 0) {
      // Rotate input by camera yaw
      const worldDx = dx * Math.cos(yawRad) - dz * Math.sin(yawRad);
      const worldDz = dx * Math.sin(yawRad) + dz * Math.cos(yawRad);
      const len = Math.sqrt(worldDx * worldDx + worldDz * worldDz);
      const newTarget = [
        cameraTarget[0] + (worldDx / len) * panSpeed,
        0,
        cameraTarget[2] + (worldDz / len) * panSpeed,
      ] as [number, number, number];
      setCameraTarget(newTarget);
    }

    // Edge scroll
    const mx = mousePos.current.x;
    const my = mousePos.current.y;
    const edgeDx = mx < EDGE_ZONE ? -1 : mx > window.innerWidth - EDGE_ZONE ? 1 : 0;
    const edgeDz = my < EDGE_ZONE ? -1 : my > window.innerHeight - EDGE_ZONE ? 1 : 0;

    if (edgeDx !== 0 || edgeDz !== 0) {
      const edgeSpeed = BASE_PAN_SPEED * delta / zoomFactor * 0.5;
      const worldDx = edgeDx * Math.cos(yawRad) - edgeDz * Math.sin(yawRad);
      const worldDz = edgeDx * Math.sin(yawRad) + edgeDz * Math.cos(yawRad);
      setCameraTarget([
        cameraTarget[0] + worldDx * edgeSpeed,
        0,
        cameraTarget[2] + worldDz * edgeSpeed,
      ]);
    }

    // Clamp target to map bounds
    const bounds = mapBounds.current;
    const tx = Math.max(bounds.minX, Math.min(bounds.maxX, cameraTarget[0]));
    const tz = Math.max(bounds.minZ, Math.min(bounds.maxZ, cameraTarget[2]));

    // Compute camera position from target, yaw, pitch
    const pitchRad = (cameraPitch * Math.PI) / 180;
    const distance = 30;
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

'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import type { HexCoord } from '@/engine/core/types';

// ─── Projectile types ────────────────────────────────────────────────────────

export type ProjectileType = 'arrow' | 'magic_bolt' | 'siege_stone';

export interface ProjectileData {
  id: number;
  type: ProjectileType;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  speed: number;
  arcHeight: number;
}

interface HitPulseData {
  id: number;
  hex: HexCoord;
  progress: number;
  isCritical: boolean;
  amount?: number;
  isDefeat?: boolean;
}

// ─── Projectile config per type ──────────────────────────────────────────────

interface ProjectileConfig {
  speed: number;
  arcHeight: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  scale: [number, number, number];
  geometryType: 'cylinder' | 'sphere';
  geometryArgs: number[];
  trail: boolean;
}

const PROJECTILE_CONFIGS: Record<ProjectileType, ProjectileConfig> = {
  arrow: {
    speed: 4.0,
    arcHeight: 0.3,
    color: '#c8a84e',
    emissive: '#c8a84e',
    emissiveIntensity: 0.3,
    scale: [0.02, 0.2, 0.02],
    geometryType: 'cylinder',
    geometryArgs: [0.03, 0.01, 0.25, 4],
    trail: true,
  },
  magic_bolt: {
    speed: 2.5,
    arcHeight: 0.15,
    color: '#9b59b6',
    emissive: '#9b59b6',
    emissiveIntensity: 0.8,
    scale: [0.08, 0.08, 0.08],
    geometryType: 'sphere',
    geometryArgs: [0.1, 8, 8],
    trail: true,
  },
  siege_stone: {
    speed: 1.8,
    arcHeight: 1.0,
    color: '#7f8c8d',
    emissive: '#555555',
    emissiveIntensity: 0.1,
    scale: [0.12, 0.12, 0.12],
    geometryType: 'sphere',
    geometryArgs: [0.15, 8, 6],
    trail: false,
  },
};

// ─── Easing functions ────────────────────────────────────────────────────────

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// ─── Single projectile mesh ──────────────────────────────────────────────────

function ProjectileMesh({ data }: { data: ProjectileData }) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Points>(null);
  const config = PROJECTILE_CONFIGS[data.type];

  // Set up trail geometry imperatively
  useEffect(() => {
    if (!config.trail || !trailRef.current) return;

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(30); // 10 trail points * 3 components
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    trailRef.current.geometry = geom;

    return () => {
      geom.dispose();
    };
  }, [config.trail]);

  useFrame(() => {
    if (!groupRef.current) return;

    const t = data.progress;
    const easedT = easeOutQuad(t);

    // Interpolate position
    const x = THREE.MathUtils.lerp(data.startPos.x, data.endPos.x, easedT);
    const z = THREE.MathUtils.lerp(data.startPos.z, data.endPos.z, easedT);

    // Arc trajectory (parabolic)
    const arcT = t < 0.5 ? 2 * t : 2 * (1 - t); // peaks at 0.5
    const arcY = arcT * config.arcHeight;
    const baseY = THREE.MathUtils.lerp(data.startPos.y, data.endPos.y, easedT);
    const y = baseY + arcY;

    groupRef.current.position.set(x, y, z);

    // Rotate projectile to face direction of travel
    const direction = new THREE.Vector3()
      .subVectors(data.endPos, data.startPos)
      .normalize();

    // For arrows, orient along the flight path
    if (data.type === 'arrow') {
      // Calculate velocity direction including arc
      const nextT = Math.min(t + 0.01, 1);
      const nextEased = easeOutQuad(nextT);
      const nx = THREE.MathUtils.lerp(data.startPos.x, data.endPos.x, nextEased);
      const nz = THREE.MathUtils.lerp(data.startPos.z, data.endPos.z, nextEased);
      const nextArcT = nextT < 0.5 ? 2 * nextT : 2 * (1 - nextT);
      const ny = THREE.MathUtils.lerp(data.startPos.y, data.endPos.y, nextEased) + nextArcT * config.arcHeight;

      const vel = new THREE.Vector3(nx - x, ny - y, nz - z).normalize();
      const lookTarget = new THREE.Vector3().copy(groupRef.current.position).add(vel);
      groupRef.current.lookAt(lookTarget);
      // Rotate so cylinder points along flight direction
      groupRef.current.rotateX(Math.PI / 2);
    } else {
      groupRef.current.lookAt(
        new THREE.Vector3(x + direction.x, y, z + direction.z),
      );
    }

    // Update trail
    if (config.trail && trailRef.current) {
      const posAttr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      if (posAttr) {
        const arr = posAttr.array as Float32Array;

        // Shift trail positions
        for (let i = arr.length - 3; i >= 3; i -= 3) {
          arr[i] = arr[i - 3];
          arr[i + 1] = arr[i - 2];
          arr[i + 2] = arr[i - 1];
        }
        arr[0] = x;
        arr[1] = y;
        arr[2] = z;

        posAttr.needsUpdate = true;
      }
    }
  });

  // Fade out near end
  const opacity = data.progress > 0.85 ? 1 - (data.progress - 0.85) / 0.15 : 1;

  return (
    <group ref={groupRef}>
      {/* Main projectile */}
      <mesh scale={config.scale as unknown as undefined}>
        {config.geometryType === 'cylinder' ? (
          <cylinderGeometry args={config.geometryArgs as [number, number, number, number]} />
        ) : (
          <sphereGeometry args={config.geometryArgs as [number, number, number]} />
        )}
        <meshStandardMaterial
          color={config.color}
          emissive={config.emissive}
          emissiveIntensity={config.emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {/* Glow for magic bolts */}
      {data.type === 'magic_bolt' && (
        <mesh scale={[0.2, 0.2, 0.2]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.15 * opacity}
          />
        </mesh>
      )}

      {/* Trail */}
      {config.trail && (
        <points ref={trailRef}>
          <bufferGeometry />
          <pointsMaterial
            color={config.color}
            size={0.04}
            transparent
            opacity={0.4}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  );
}

function CombatTextSprite({ text, color, progress }: { text: string; color: string; progress: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = text.length > 4 ? '700 34px Arial' : '800 46px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(3, 5, 8, 0.95)';
      ctx.fillStyle = color;
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [color, text]);

  useEffect(() => () => texture.dispose(), [texture]);

  const opacity = Math.max(0, 1 - progress * 0.85);

  return (
    <sprite position={[0, 0.44 + progress * 0.42, 0]} scale={[0.98, 0.36, 1]} renderOrder={82}>
      <spriteMaterial map={texture} transparent opacity={opacity} depthWrite={false} depthTest={false} />
    </sprite>
  );
}

function HitPulseMesh({ data }: { data: HitPulseData }) {
  const [wx, , wz] = hexToWorld(data.hex);
  const scale = (data.isDefeat ? 0.7 : 0.55) + data.progress * (data.isDefeat ? 0.98 : 0.7);
  const opacity = Math.max(0, (data.isDefeat ? 0.9 : 0.76) * (1 - data.progress * 0.86));
  const color = data.isDefeat ? '#ff3f32' : data.isCritical ? '#fff0a8' : '#ff6a52';
  const label = data.isDefeat ? 'DEFEATED' : data.amount ? `-${data.amount}` : 'HIT';

  return (
    <group position={[wx, 0.74 + data.progress * 0.2, wz]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]} renderOrder={72}>
        <ringGeometry args={[0.44, 0.54, 40]} />
        <meshBasicMaterial color="#050608" transparent opacity={opacity * 0.78} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]} position={[0, 0.012, 0]} renderOrder={73}>
        <ringGeometry args={[0.5, 0.6, 40]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
      </mesh>
      {data.isDefeat && (
        <group position={[0, 0.04, 0]} renderOrder={78}>
          {[Math.PI / 4, -Math.PI / 4].map((rotation) => (
            <mesh key={rotation} rotation={[-Math.PI / 2, 0, rotation]} position={[0, 0.03, 0]}>
              <boxGeometry args={[0.82, 0.07, 0.03]} />
              <meshBasicMaterial color="#ffd0c7" transparent opacity={opacity} depthWrite={false} depthTest={false} />
            </mesh>
          ))}
        </group>
      )}
      <CombatTextSprite text={label} color={data.isDefeat ? '#ffd0c7' : color} progress={data.progress} />
    </group>
  );
}

// ─── Main ProjectileLayer component ──────────────────────────────────────────

let nextProjectileId = 0;

export function ProjectileLayer() {
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [hitPulses, setHitPulses] = useState<HitPulseData[]>([]);
  const processedEventKeys = useRef<Set<string>>(new Set());
  const demoQueuedRef = useRef(false);
  const gameState = useGameStore((s) => s.gameState);
  const optimisticEvents = useGameStore((s) => s.optimisticEvents);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const attackPreviewHexes = useGameStore((s) => s.attackPreviewHexes);

  const demoMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('combatResolutionDemo') === '1';
  }, []);

  // Listen for attack events to spawn projectiles
  useEffect(() => {
    if (!gameState) return;

    for (const event of optimisticEvents) {
      const eventKey = `${event.type}:${event.turn}:${JSON.stringify(event.payload)}`;
      if (processedEventKeys.current.has(eventKey)) continue;
      processedEventKeys.current.add(eventKey);

      if (event.type === 'AttackStarted' && event.payload) {
        const payload = event.payload as {
          attackerId: string;
          defenderId: string | null;
          targetCityId: string | null;
          attackType: string;
          attackerHex?: HexCoord;
          targetHex?: HexCoord;
        };

        // Determine projectile type from attack type
        let projType: ProjectileType = 'arrow';
        if (payload.attackType === 'magic' || payload.attackType === 'aoe') {
          projType = 'magic_bolt';
        } else if (payload.attackType === 'siege') {
          projType = 'siege_stone';
        }

        // Only spawn for ranged attacks
        if (payload.attackType === 'ranged' || payload.attackType === 'magic' || payload.attackType === 'siege' || payload.attackType === 'aoe') {
          // Find attacker position
          const attacker = gameState.entities[payload.attackerId];
          if (!attacker && !payload.attackerHex) continue;

          const [sx, , sz] = hexToWorld(payload.attackerHex ?? attacker!.hex);
          const startY = 0.4; // Unit height offset

          // Find target position
          let targetHex = payload.targetHex ?? attacker?.hex ?? payload.attackerHex!; // fallback
          if (!payload.targetHex && payload.defenderId) {
            const defender = gameState.entities[payload.defenderId];
            if (defender) targetHex = defender.hex;
          } else if (!payload.targetHex && payload.targetCityId) {
            const city = gameState.cities[payload.targetCityId];
            if (city) targetHex = city.hex;
          }

          const [ex, , ez] = hexToWorld(targetHex);
          const endY = 0.3;

          const config = PROJECTILE_CONFIGS[projType];

          const projectile: ProjectileData = {
            id: nextProjectileId++,
            type: projType,
            startPos: new THREE.Vector3(sx, startY, sz),
            endPos: new THREE.Vector3(ex, endY, ez),
            progress: 0,
            speed: config.speed,
            arcHeight: config.arcHeight,
          };

          setProjectiles((prev) => [...prev, projectile]);
        }
      } else if (event.type === 'DamageApplied' && event.payload) {
        const payload = event.payload as {
          targetId: string;
          amount: number;
          isCritical: boolean;
          targetHex?: HexCoord;
        };
        const targetEntity = gameState.entities[payload.targetId];
        const targetCity = gameState.cities[payload.targetId];
        const targetHex = payload.targetHex ?? targetEntity?.hex ?? targetCity?.hex;

        if (targetHex) {
          setHitPulses((prev) => [
            ...prev,
            {
              id: nextProjectileId++,
              hex: targetHex,
              progress: 0,
              isCritical: payload.isCritical,
              amount: payload.amount,
            },
          ]);
        }
      } else if (event.type === 'UnitKilled' && event.payload) {
        const payload = event.payload as {
          position: HexCoord;
        };
        setHitPulses((prev) => [
          ...prev,
          {
            id: nextProjectileId++,
            hex: payload.position,
            progress: 0,
            isCritical: true,
            isDefeat: true,
          },
        ]);
      }
    }
  }, [optimisticEvents, gameState]);

  useEffect(() => {
    if (!demoMode || !gameState || !selectedEntityId || attackPreviewHexes.length === 0 || demoQueuedRef.current) return;

    const selectedEntity = gameState.entities[selectedEntityId];
    const targetHex = attackPreviewHexes[0];
    if (!selectedEntity || !targetHex) return;

    const timeout = window.setTimeout(() => {
      if (demoQueuedRef.current) return;
      demoQueuedRef.current = true;
      setHitPulses((prev) => [
        ...prev,
        {
          id: nextProjectileId++,
          hex: targetHex,
          progress: 0,
          isCritical: true,
          amount: Math.max(12, selectedEntity.attack * 2),
        },
        {
          id: nextProjectileId++,
          hex: targetHex,
          progress: 0,
          isCritical: true,
          isDefeat: true,
        },
      ]);
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [attackPreviewHexes, demoMode, gameState, selectedEntityId]);

  // Animate projectiles
  useFrame((_, delta) => {
    if (projectiles.length === 0 && hitPulses.length === 0) return;

    setProjectiles((prev) => {
      const updated = prev
        .map((p) => ({
          ...p,
          progress: Math.min(p.progress + delta * p.speed, 1),
        }))
        .filter((p) => p.progress < 1); // Remove completed projectiles

      // Only update state if something changed
      if (updated.length !== prev.length || updated.some((p, i) => p.progress !== prev[i]?.progress)) {
        return updated;
      }
      return prev;
    });

    setHitPulses((prev) => {
      const updated = prev
        .map((p) => ({
          ...p,
          progress: Math.min(p.progress + delta * (p.isDefeat ? 0.28 : 0.34), 1),
        }))
        .filter((p) => p.progress < 1);
      return updated.length !== prev.length || updated.some((p, i) => p.progress !== prev[i]?.progress) ? updated : prev;
    });
  });

  if (projectiles.length === 0 && hitPulses.length === 0) return null;

  return (
    <group>
      {projectiles.map((proj) => (
        <ProjectileMesh key={proj.id} data={proj} />
      ))}
      {hitPulses.map((pulse) => (
        <HitPulseMesh key={pulse.id} data={pulse} />
      ))}
    </group>
  );
}

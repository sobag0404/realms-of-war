'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';

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

// ─── Main ProjectileLayer component ──────────────────────────────────────────

let nextProjectileId = 0;

export function ProjectileLayer() {
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const gameState = useGameStore((s) => s.gameState);
  const optimisticEvents = useGameStore((s) => s.optimisticEvents);

  // Listen for attack events to spawn projectiles
  useEffect(() => {
    if (!gameState) return;

    for (const event of optimisticEvents) {
      if (event.type === 'AttackStarted' && event.payload) {
        const payload = event.payload as {
          attackerId: string;
          defenderId: string | null;
          targetCityId: string | null;
          attackType: string;
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
          if (!attacker) continue;

          const [sx, , sz] = hexToWorld(attacker.hex);
          const startY = 0.4; // Unit height offset

          // Find target position
          let targetHex = attacker.hex; // fallback
          if (payload.defenderId) {
            const defender = gameState.entities[payload.defenderId];
            if (defender) targetHex = defender.hex;
          } else if (payload.targetCityId) {
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
      }
    }
  }, [optimisticEvents, gameState]);

  // Animate projectiles
  useFrame((_, delta) => {
    if (projectiles.length === 0) return;

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
  });

  // Spawn a projectile manually (for external use)
  const spawnProjectile = useCallback(
    (type: ProjectileType, startHex: { q: number; r: number }, endHex: { q: number; r: number }) => {
      const [sx, , sz] = hexToWorld(startHex);
      const [ex, , ez] = hexToWorld(endHex);
      const config = PROJECTILE_CONFIGS[type];

      const projectile: ProjectileData = {
        id: nextProjectileId++,
        type,
        startPos: new THREE.Vector3(sx, 0.4, sz),
        endPos: new THREE.Vector3(ex, 0.3, ez),
        progress: 0,
        speed: config.speed,
        arcHeight: config.arcHeight,
      };

      setProjectiles((prev) => [...prev, projectile]);
    },
    [],
  );

  if (projectiles.length === 0) return null;

  return (
    <group>
      {projectiles.map((proj) => (
        <ProjectileMesh key={proj.id} data={proj} />
      ))}
    </group>
  );
}

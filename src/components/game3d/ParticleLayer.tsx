'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';

// ─── Particle types ──────────────────────────────────────────────────────────

export type ParticleEventType =
  | 'city_founded'
  | 'unit_killed'
  | 'building_completed'
  | 'tech_completed'
  | 'damage'
  | 'heal'
  | 'level_up'
  | 'rift_open';

// ─── Particle system config ──────────────────────────────────────────────────

interface ParticleConfig {
  count: number;
  colorStart: string;
  colorEnd: string;
  sizeStart: number;
  sizeEnd: number;
  life: number; // seconds
  velocityMin: [number, number, number];
  velocityMax: [number, number, number];
  gravity: number;
  spread: number; // initial position spread radius
}

const PARTICLE_CONFIGS: Record<ParticleEventType, ParticleConfig> = {
  city_founded: {
    count: 30,
    colorStart: '#ffd700',
    colorEnd: '#ff8c00',
    sizeStart: 0.08,
    sizeEnd: 0.01,
    life: 1.5,
    velocityMin: [-0.5, 1.0, -0.5],
    velocityMax: [0.5, 2.5, 0.5],
    gravity: -0.3,
    spread: 0.3,
  },
  unit_killed: {
    count: 25,
    colorStart: '#cc0000',
    colorEnd: '#660000',
    sizeStart: 0.06,
    sizeEnd: 0.01,
    life: 1.0,
    velocityMin: [-1.5, 0.5, -1.5],
    velocityMax: [1.5, 2.0, 1.5],
    gravity: -2.0,
    spread: 0.2,
  },
  building_completed: {
    count: 20,
    colorStart: '#4488ff',
    colorEnd: '#ffffff',
    sizeStart: 0.07,
    sizeEnd: 0.01,
    life: 1.2,
    velocityMin: [-0.8, 1.0, -0.8],
    velocityMax: [0.8, 2.0, 0.8],
    gravity: -0.5,
    spread: 0.4,
  },
  tech_completed: {
    count: 35,
    colorStart: '#9b59b6',
    colorEnd: '#8e44ad',
    sizeStart: 0.06,
    sizeEnd: 0.01,
    life: 2.0,
    velocityMin: [-0.3, 1.5, -0.3],
    velocityMax: [0.3, 3.0, 0.3],
    gravity: -0.2,
    spread: 0.3,
  },
  damage: {
    count: 12,
    colorStart: '#ff6600',
    colorEnd: '#cc3300',
    sizeStart: 0.05,
    sizeEnd: 0.01,
    life: 0.6,
    velocityMin: [-1.0, 0.5, -1.0],
    velocityMax: [1.0, 1.5, 1.0],
    gravity: -1.5,
    spread: 0.15,
  },
  heal: {
    count: 15,
    colorStart: '#2ecc71',
    colorEnd: '#27ae60',
    sizeStart: 0.06,
    sizeEnd: 0.01,
    life: 1.0,
    velocityMin: [-0.3, 1.0, -0.3],
    velocityMax: [0.3, 2.0, 0.3],
    gravity: 0,
    spread: 0.2,
  },
  level_up: {
    count: 40,
    colorStart: '#ffd700',
    colorEnd: '#ffaa00',
    sizeStart: 0.05,
    sizeEnd: 0.01,
    life: 1.5,
    velocityMin: [-0.2, 0.8, -0.2],
    velocityMax: [0.2, 1.5, 0.2],
    gravity: 0.1,
    spread: 0.3,
  },
  rift_open: {
    count: 50,
    colorStart: '#8e44ad',
    colorEnd: '#2c003e',
    sizeStart: 0.08,
    sizeEnd: 0.02,
    life: 2.5,
    velocityMin: [-1.0, 1.0, -1.0],
    velocityMax: [1.0, 3.0, 1.0],
    gravity: -0.5,
    spread: 0.5,
  },
};

// ─── Particle system data ────────────────────────────────────────────────────

interface ParticleSystemData {
  id: number;
  type: ParticleEventType;
  origin: THREE.Vector3;
  config: ParticleConfig;
  time: number;
  dead: boolean;
  particles: {
    position: [number, number, number];
    velocity: [number, number, number];
    life: number;
    maxLife: number;
  }[];
}

let nextSystemId = 0;

// ─── Single particle system renderer ─────────────────────────────────────────

function ParticleSystem({ system }: { system: ParticleSystemData }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { config, particles } = system;

  // Pre-compute colors for interpolation
  const colorStart = useMemo(() => new THREE.Color(config.colorStart), [config.colorStart]);
  const colorEnd = useMemo(() => new THREE.Color(config.colorEnd), [config.colorEnd]);

  // Set up buffer geometry imperatively
  useEffect(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const sizes = new Float32Array(config.count);

    // Initialize with first frame data
    const tempColor = new THREE.Color();
    for (let i = 0; i < config.count; i++) {
      const p = particles[i];
      if (!p) continue;
      const lifeRatio = Math.max(0, p.life / p.maxLife);

      positions[i * 3] = p.position[0];
      positions[i * 3 + 1] = p.position[1];
      positions[i * 3 + 2] = p.position[2];

      tempColor.copy(colorStart).lerp(colorEnd, 1 - lifeRatio);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      sizes[i] = THREE.MathUtils.lerp(config.sizeEnd, config.sizeStart, lifeRatio);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    if (pointsRef.current) {
      pointsRef.current.geometry = geom;
    }

    return () => {
      geom.dispose();
    };
  }, [config.count, config.sizeEnd, config.sizeStart, particles, colorStart, colorEnd]);

  // Update buffers every frame
  useFrame(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;

    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = geom.getAttribute('size') as THREE.BufferAttribute;
    if (!posAttr || !colAttr || !sizeAttr) return;

    const tempColor = new THREE.Color();

    for (let i = 0; i < config.count; i++) {
      const p = particles[i];
      if (!p) continue;

      const lifeRatio = Math.max(0, p.life / p.maxLife);

      posAttr.setXYZ(i, p.position[0], p.position[1], p.position[2]);

      tempColor.copy(colorStart).lerp(colorEnd, 1 - lifeRatio);
      colAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);

      sizeAttr.setX(i, THREE.MathUtils.lerp(config.sizeEnd, config.sizeStart, lifeRatio));
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  // Compute overall opacity based on system life
  const systemLife = system.time / (config.life + 0.5);

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={config.sizeStart}
        vertexColors
        transparent
        opacity={Math.max(0, 1 - systemLife * 0.5)}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Main ParticleLayer component ────────────────────────────────────────────

export function ParticleLayer() {
  const [systems, setSystems] = useState<ParticleSystemData[]>([]);
  const gameState = useGameStore((s) => s.gameState);
  const optimisticEvents = useGameStore((s) => s.optimisticEvents);

  // Spawn particles at a hex coordinate
  const spawnParticles = useCallback(
    (type: ParticleEventType, hex: { q: number; r: number }) => {
      const config = PARTICLE_CONFIGS[type];
      const [wx, , wz] = hexToWorld(hex);
      const elevation = 0.5; // Above terrain

      const particles: ParticleSystemData['particles'] = [];
      for (let i = 0; i < config.count; i++) {
        const life = config.life * (0.7 + Math.random() * 0.6);
        particles.push({
          position: [
            wx + (Math.random() - 0.5) * config.spread * 2,
            elevation + Math.random() * config.spread,
            wz + (Math.random() - 0.5) * config.spread * 2,
          ] as [number, number, number],
          velocity: [
            config.velocityMin[0] + Math.random() * (config.velocityMax[0] - config.velocityMin[0]),
            config.velocityMin[1] + Math.random() * (config.velocityMax[1] - config.velocityMin[1]),
            config.velocityMin[2] + Math.random() * (config.velocityMax[2] - config.velocityMin[2]),
          ] as [number, number, number],
          life,
          maxLife: life,
        });
      }

      const system: ParticleSystemData = {
        id: nextSystemId++,
        type,
        origin: new THREE.Vector3(wx, elevation, wz),
        config,
        time: 0,
        dead: false,
        particles,
      };

      setSystems((prev) => [...prev, system]);
    },
    [],
  );

  // Listen for game events to spawn particle effects
  useEffect(() => {
    if (!gameState) return;

    for (const event of optimisticEvents) {
      let type: ParticleEventType | null = null;
      let hex = { q: 0, r: 0 };

      switch (event.type) {
        case 'CityFounded': {
          type = 'city_founded';
          const payload = event.payload as { hex: { q: number; r: number } };
          hex = payload.hex;
          break;
        }
        case 'UnitKilled': {
          type = 'unit_killed';
          const payload = event.payload as { position: { q: number; r: number } };
          hex = payload.position;
          break;
        }
        case 'BuildingCompleted': {
          type = 'building_completed';
          const payload = event.payload as { cityId: string };
          const city = gameState.cities[payload.cityId];
          if (city) hex = city.hex;
          break;
        }
        case 'TechnologyCompleted': {
          type = 'tech_completed';
          // Use active player's first city as origin, or 0,0
          const player = gameState.players[gameState.activePlayerId];
          if (player) {
            const playerCities = Object.values(gameState.cities).filter(
              (c) => c.ownerId === player.id,
            );
            if (playerCities.length > 0) hex = playerCities[0].hex;
          }
          break;
        }
        case 'DamageApplied': {
          type = 'damage';
          const payload = event.payload as { targetId: string };
          const entity = gameState.entities[payload.targetId];
          if (entity) {
            hex = entity.hex;
          } else {
            const city = gameState.cities[payload.targetId];
            if (city) hex = city.hex;
          }
          break;
        }
      }

      if (type) {
        spawnParticles(type, hex);
      }
    }
  }, [optimisticEvents, gameState, spawnParticles]);

  // Update particle systems
  useFrame((_, delta) => {
    if (systems.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1); // Cap delta to avoid large jumps

    setSystems((prev) => {
      const updated = prev
        .map((sys) => {
          let allDead = true;
          const newParticles = sys.particles.map((p) => {
            const newLife = p.life - clampedDelta;
            if (newLife <= 0) return { ...p, life: 0 };

            allDead = false;
            return {
              ...p,
              life: newLife,
              position: [
                p.position[0] + p.velocity[0] * clampedDelta,
                p.position[1] + p.velocity[1] * clampedDelta,
                p.position[2] + p.velocity[2] * clampedDelta,
              ] as [number, number, number],
              velocity: [
                p.velocity[0],
                p.velocity[1] + sys.config.gravity * clampedDelta,
                p.velocity[2],
              ] as [number, number, number],
            };
          });

          return {
            ...sys,
            time: sys.time + clampedDelta,
            particles: newParticles,
            dead: allDead,
          };
        })
        .filter((sys) => !sys.dead);

      if (updated.length !== prev.length) {
        return updated;
      }

      // Check if anything actually changed
      const changed = updated.some((sys, i) => {
        const prevSys = prev[i];
        return sys.time !== prevSys?.time;
      });

      return changed ? updated : prev;
    });
  });

  if (systems.length === 0) return null;

  return (
    <group>
      {systems.map((system) => (
        <ParticleSystem key={system.id} system={system} />
      ))}
    </group>
  );
}

// ─── Expose spawnParticles for external use ──────────────────────────────────

/**
 * Global particle spawner accessible outside the React tree.
 * Call: spawnParticlesGlobal('damage', { q: 3, r: -2 })
 */
let globalSpawnFn: ((type: ParticleEventType, hex: { q: number; r: number }) => void) | null = null;

export function setParticleSpawnFn(fn: (type: ParticleEventType, hex: { q: number; r: number }) => void) {
  globalSpawnFn = fn;
}

export function spawnParticlesGlobal(type: ParticleEventType, hex: { q: number; r: number }) {
  if (globalSpawnFn) {
    globalSpawnFn(type, hex);
  }
}

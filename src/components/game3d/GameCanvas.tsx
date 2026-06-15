'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneRoot } from './SceneRoot';

interface GameCanvasProps {
  className?: string;
}

export function GameCanvas({ className }: GameCanvasProps) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      camera={{ position: [10, 15, 10], zoom: 12, near: 0.1, far: 200 }}
      orthographic
      className={className}
    >
      <SceneRoot />
    </Canvas>
  );
}

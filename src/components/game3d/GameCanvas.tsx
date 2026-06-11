'use client';

import { Canvas } from '@react-three/fiber';
import { SceneRoot } from './SceneRoot';

interface GameCanvasProps {
  className?: string;
}

export function GameCanvas({ className }: GameCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      camera={{ position: [10, 15, 10], zoom: 12, near: 0.1, far: 200 }}
      orthographic
      className={className}
    >
      <SceneRoot />
    </Canvas>
  );
}

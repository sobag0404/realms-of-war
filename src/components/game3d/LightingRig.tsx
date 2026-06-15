'use client';

export function LightingRig() {
  return (
    <>
      <ambientLight color="#d8e7f2" intensity={0.38} />
      <directionalLight
        color="#ffe0aa"
        intensity={2.28}
        position={[24, 38, 18]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={105}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.00018}
        shadow-normalBias={0.032}
      />
      <directionalLight
        color="#a4c9ff"
        intensity={0.52}
        position={[-22, 22, -26]}
      />
      <directionalLight
        color="#fff0d0"
        intensity={0.2}
        position={[-14, 12, 20]}
      />
      <hemisphereLight args={['#d8ecff', '#6d5842', 0.92]} />
    </>
  );
}

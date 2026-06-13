'use client';

export function LightingRig() {
  return (
    <>
      <ambientLight color="#9fb1c8" intensity={0.45} />
      <directionalLight
        color="#fff1d2"
        intensity={2.2}
        position={[20, 35, 15]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight args={['#a7c8ff', '#6a573f', 0.7]} />
    </>
  );
}

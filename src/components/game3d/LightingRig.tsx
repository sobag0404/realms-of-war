'use client';

export function LightingRig() {
  return (
    <>
      <ambientLight color="#d4e3f5" intensity={0.46} />
      <directionalLight
        color="#ffd79a"
        intensity={2.62}
        position={[20, 36, 16]}
        castShadow
        shadow-mapSize-width={3072}
        shadow-mapSize-height={3072}
        shadow-camera-far={95}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />
      <directionalLight
        color="#8ebcff"
        intensity={0.68}
        position={[-20, 20, -24]}
      />
      <hemisphereLight args={['#cfe4ff', '#8a7254', 1.04]} />
    </>
  );
}

'use client';

export function LightingRig() {
  return (
    <>
      <ambientLight color="#c7d7ee" intensity={0.52} />
      <directionalLight
        color="#ffe4ad"
        intensity={2.85}
        position={[18, 34, 14]}
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
        color="#85b7ff"
        intensity={0.58}
        position={[-18, 18, -22]}
      />
      <hemisphereLight args={['#c4ddff', '#7a654e', 0.95]} />
    </>
  );
}

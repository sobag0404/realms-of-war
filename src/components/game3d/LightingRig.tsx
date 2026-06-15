'use client';

export function LightingRig() {
  return (
    <>
      <ambientLight color="#e7edf1" intensity={0.32} />
      <directionalLight
        color="#ffd89a"
        intensity={2.55}
        position={[28, 42, 20]}
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
        color="#a9cdf8"
        intensity={0.44}
        position={[-24, 24, -28]}
      />
      <directionalLight
        color="#fff2cf"
        intensity={0.24}
        position={[-14, 12, 20]}
      />
      <hemisphereLight args={['#dceeff', '#756044', 0.82]} />
    </>
  );
}

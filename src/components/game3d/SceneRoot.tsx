'use client';

import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { TerrainLayer } from './TerrainLayer';
import { DecorationLayer } from './DecorationLayer';
import { WaterLayer } from './WaterLayer';
import { BuildingLayer } from './BuildingLayer';
import { UnitLayer } from './UnitLayer';
import { FogLayer } from './FogLayer';
import { SelectionHighlights } from './SelectionHighlights';
import { PathPreview } from './PathPreview';
import { ProjectileLayer } from './ProjectileLayer';
import { ParticleLayer } from './ParticleLayer';
import { PostProcessing } from './PostProcessing';

export function SceneRoot() {
  return (
    <>
      <color attach="background" args={['#101923']} />
      <fog attach="fog" args={['#101923', 34, 92]} />
      <CameraRig />
      <LightingRig />
      <TerrainLayer />
      <DecorationLayer />
      <WaterLayer />
      <BuildingLayer />
      <UnitLayer />
      <FogLayer />
      <SelectionHighlights />
      <PathPreview />
      <ProjectileLayer />
      <ParticleLayer />
      <PostProcessing />
    </>
  );
}

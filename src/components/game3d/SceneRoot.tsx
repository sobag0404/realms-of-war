'use client';

import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { TerrainLayer } from './TerrainLayer';
import { TerrainAccentLayer } from './TerrainAccentLayer';
import { DecorationLayer } from './DecorationLayer';
import { CoastLayer } from './CoastLayer';
import { WaterLayer } from './WaterLayer';
import { BuildingLayer } from './BuildingLayer';
import { UnitLayer } from './UnitLayer';
import { ResourceLayer } from './ResourceLayer';
import { FogLayer } from './FogLayer';
import { SelectionHighlights } from './SelectionHighlights';
import { PathPreview } from './PathPreview';
import { ProjectileLayer } from './ProjectileLayer';
import { ParticleLayer } from './ParticleLayer';
import { PostProcessing } from './PostProcessing';

export function SceneRoot() {
  return (
    <>
      <color attach="background" args={['#0d1720']} />
      <fog attach="fog" args={['#0d1720', 38, 110]} />
      <CameraRig />
      <LightingRig />
      <TerrainLayer />
      <TerrainAccentLayer />
      <CoastLayer />
      <DecorationLayer />
      <WaterLayer />
      <ResourceLayer />
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

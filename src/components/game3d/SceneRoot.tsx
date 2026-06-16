'use client';

import { CameraRig } from './CameraRig';
import { LightingRig } from './LightingRig';
import { TerrainLayer } from './TerrainLayer';
import { TerrainDepthLayer } from './TerrainDepthLayer';
import { TerrainMaterialPatternLayer } from './TerrainMaterialPatternLayer';
import { StrategicDepthCueLayer } from './StrategicDepthCueLayer';
import { TerrainAccentLayer } from './TerrainAccentLayer';
import { TerrainFeatureLayer } from './TerrainFeatureLayer';
import { DecorationLayer } from './DecorationLayer';
import { CoastLayer } from './CoastLayer';
import { WaterLayer } from './WaterLayer';
import { RiverLayer } from './RiverLayer';
import { AtmosphereLayer } from './AtmosphereLayer';
import { InfrastructureLayer } from './InfrastructureLayer';
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
      <color attach="background" args={['#11181d']} />
      <fog attach="fog" args={['#11181d', 32, 96]} />
      <CameraRig />
      <LightingRig />
      <TerrainLayer />
      <TerrainDepthLayer />
      <TerrainMaterialPatternLayer />
      <StrategicDepthCueLayer />
      <TerrainAccentLayer />
      <TerrainFeatureLayer />
      <CoastLayer />
      <DecorationLayer />
      <WaterLayer />
      <RiverLayer />
      <AtmosphereLayer />
      <InfrastructureLayer />
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

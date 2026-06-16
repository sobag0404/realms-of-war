/**
 * Game3D component barrel file
 *
 * Re-exports all 3D rendering components for the hex-based strategy game.
 */

export { GameCanvas } from './GameCanvas';
export { SceneRoot } from './SceneRoot';
export { CameraRig } from './CameraRig';
export { LightingRig } from './LightingRig';
export { TerrainLayer } from './TerrainLayer';
export { TerrainDepthLayer } from './TerrainDepthLayer';
export { TerrainFeatureLayer } from './TerrainFeatureLayer';
export { HexMesh } from './HexMesh';
export { WaterLayer } from './WaterLayer';
export { RiverLayer } from './RiverLayer';
export { InfrastructureLayer } from './InfrastructureLayer';
export { UnitLayer } from './UnitLayer';
export { BuildingLayer } from './BuildingLayer';
export { FogLayer } from './FogLayer';
export { SelectionHighlights } from './SelectionHighlights';
export { PathPreview } from './PathPreview';
export { DecorationLayer } from './DecorationLayer';
export { ProjectileLayer } from './ProjectileLayer';
export type { ProjectileType, ProjectileData } from './ProjectileLayer';
export { ParticleLayer, spawnParticlesGlobal, setParticleSpawnFn } from './ParticleLayer';
export type { ParticleEventType } from './ParticleLayer';
export { PostProcessing } from './PostProcessing';

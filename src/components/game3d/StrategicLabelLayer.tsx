'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { hexToWorld } from '@/engine/hex/coordinates';
import { TERRAIN_ELEVATION } from '@/data/terrain';
import { RESOURCES, type ResourceId } from '@/data/resources';
import { UNIT_TYPES } from '@/data/units';
import type { EntityData, HexTile } from '@/engine/core/GameState';
import type { TerrainTypeId } from '@/engine/core/types';

const MAX_STRATEGIC_RESOURCE_LABELS = 18;

function tileKey(q: number, r: number): string {
  return `${q},${r}`;
}

function labelPosition(tile: HexTile, yOffset: number): [number, number, number] {
  const [wx, , wz] = hexToWorld(tile.coord);
  const terrainY = TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0;
  return [wx, terrainY + yOffset, wz];
}

function unitLabelPosition(entity: EntityData, tile: HexTile | undefined): [number, number, number] {
  const [wx, , wz] = hexToWorld(entity.hex);
  const terrainY = tile ? TERRAIN_ELEVATION[tile.terrain as TerrainTypeId] ?? 0 : 0;
  return [wx, terrainY + 1.55, wz];
}

function isVisible(key: string, visibleHexes: Set<string> | null): boolean {
  return !visibleHexes || visibleHexes.has(key);
}

function HtmlLabel({
  position,
  children,
}: {
  position: [number, number, number];
  children: ReactNode;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={0.014}
      zIndexRange={[8, 0]}
      style={{ pointerEvents: 'none' }}
    >
      {children}
    </Html>
  );
}

export function StrategicLabelLayer() {
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const showFog = useGameStore((s) => s.showFog);

  const labelData = useMemo(() => {
    if (!gameState) {
      return {
        cityLabels: [],
        resourceLabels: [],
        selectedEntity: null,
        selectedTile: null,
      };
    }

    const activePlayer = gameState.players[activePlayerId];
    const visibleHexes =
      showFog && activePlayer?.visibleHexes.length
        ? new Set(activePlayer.visibleHexes)
        : null;

    const cityLabels = Object.values(gameState.cities)
      .filter((city) => isVisible(tileKey(city.hex.q, city.hex.r), visibleHexes))
      .map((city) => {
        const tile = gameState.map.tiles[tileKey(city.hex.q, city.hex.r)];
        if (!tile) return null;
        const owner = gameState.players[city.ownerId];
        return {
          city,
          ownerColor: owner?.color ?? '#f5d06f',
          position: labelPosition(tile, 1.34 + city.level * 0.04),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const selectedTile = selectedHex
      ? gameState.map.tiles[tileKey(selectedHex.q, selectedHex.r)] ?? null
      : null;

    const selectedEntity = selectedEntityId
      ? gameState.entities[selectedEntityId] ?? null
      : null;

    const resourceLabels = Object.values(gameState.map.tiles)
      .filter((tile) => {
        if (!tile.resource) return false;
        if (!isVisible(tileKey(tile.coord.q, tile.coord.r), visibleHexes)) return false;
        const resource = RESOURCES[tile.resource as ResourceId];
        if (!resource?.isStrategic) return false;
        if (selectedTile && tileKey(tile.coord.q, tile.coord.r) === tileKey(selectedTile.coord.q, selectedTile.coord.r)) {
          return false;
        }
        return true;
      })
      .slice(0, MAX_STRATEGIC_RESOURCE_LABELS)
      .map((tile) => ({
        tile,
        resource: RESOURCES[tile.resource as ResourceId],
        position: labelPosition(tile, 0.76),
      }));

    return {
      cityLabels,
      resourceLabels,
      selectedEntity,
      selectedTile,
    };
  }, [activePlayerId, gameState, selectedEntityId, selectedHex, showFog]);

  if (!gameState) return null;

  const selectedEntityTile = labelData.selectedEntity
    ? gameState.map.tiles[tileKey(labelData.selectedEntity.hex.q, labelData.selectedEntity.hex.r)]
    : undefined;
  const selectedUnitType = labelData.selectedEntity
    ? UNIT_TYPES[labelData.selectedEntity.typeId]
    : undefined;
  const selectedTileResource = labelData.selectedTile?.resource
    ? RESOURCES[labelData.selectedTile.resource as ResourceId]
    : null;

  return (
    <group>
      {labelData.cityLabels.map(({ city, ownerColor, position }) => (
        <HtmlLabel key={`city-label-${city.id}`} position={position}>
          <div className="strategic-label city-nameplate" style={{ '--owner-color': ownerColor } as CSSProperties}>
            <span className="city-nameplate__name">{city.name}</span>
            <span className="city-nameplate__meta">
              Pop {city.population} · L{city.level}
            </span>
          </div>
        </HtmlLabel>
      ))}

      {labelData.resourceLabels.map(({ tile, resource, position }) => (
        <HtmlLabel key={`resource-label-${tile.coord.q}-${tile.coord.r}`} position={position}>
          <div className="strategic-label resource-nameplate" style={{ '--resource-color': resource.iconColor } as CSSProperties}>
            {resource.name}
          </div>
        </HtmlLabel>
      ))}

      {labelData.selectedEntity && (
        <HtmlLabel
          position={unitLabelPosition(labelData.selectedEntity, selectedEntityTile)}
        >
          <div className="strategic-label unit-nameplate">
            <span>{selectedUnitType?.name ?? labelData.selectedEntity.typeId}</span>
            <span className="unit-nameplate__stats">
              HP {labelData.selectedEntity.hp}/{labelData.selectedEntity.maxHp} · MOV {labelData.selectedEntity.movementPoints}/{labelData.selectedEntity.maxMovement}
            </span>
          </div>
        </HtmlLabel>
      )}

      {labelData.selectedTile && selectedTileResource && (
        <HtmlLabel position={labelPosition(labelData.selectedTile, 1.02)}>
          <div className="strategic-label selected-resource-nameplate" style={{ '--resource-color': selectedTileResource.iconColor } as CSSProperties}>
            {selectedTileResource.name}
          </div>
        </HtmlLabel>
      )}
    </group>
  );
}

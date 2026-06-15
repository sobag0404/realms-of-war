/**
 * SelectionPanel — context-sensitive panel at bottom-left.
 *
 * Shows different content based on what's selected:
 * - Entity → UnitPanel
 * - City → CityPanel
 * - Hex only → hex info
 * - Nothing → hidden
 */

'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TERRAIN_TYPES } from '@/data/terrain';
import type { TerrainTypeId } from '@/data/terrain';
import { RESOURCES } from '@/data/resources';
import type { ResourceId } from '@/data/resources';
import type { EntityData, CityState, HexTile } from '@/engine/core/GameState';
import { UnitPanel } from './UnitPanel';
import { CityPanel } from './CityPanel';

// ─── Component ────────────────────────────────────────────────────────────────

export function SelectionPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const selectedCityId = useGameStore((s) => s.selectedCityId);
  const clearSelection = useGameStore((s) => s.clearSelection);

  const handleClose = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  if (!gameState) return null;

  // Determine what to show
  let entity: EntityData | null = null;
  let city: CityState | null = null;
  let hexTile: HexTile | null = null;

  if (selectedEntityId) {
    entity = gameState.entities[selectedEntityId] ?? null;
  }
  if (selectedCityId) {
    city = gameState.cities[selectedCityId] ?? null;
  }
  // Also check if the selected hex has a city or entity
  if (selectedHex && !entity && !city) {
    const hexKey = `${selectedHex.q},${selectedHex.r}`;
    hexTile = gameState.map.tiles[hexKey] ?? null;

    // Try to find a city on this hex
    if (!city) {
      for (const c of Object.values(gameState.cities)) {
        if (c.hex.q === selectedHex.q && c.hex.r === selectedHex.r) {
          city = c;
          break;
        }
      }
    }
    // Try to find an entity on this hex
    if (!entity) {
      for (const e of Object.values(gameState.entities)) {
        if (e.hex.q === selectedHex.q && e.hex.r === selectedHex.r) {
          entity = e;
          break;
        }
      }
    }
  }

  // Nothing to show
  if (!entity && !city && !selectedHex) return null;

  const hasContent = entity || city || hexTile;

  return (
    <div
      className={`absolute bottom-3 left-2 sm:bottom-4 sm:left-4 z-20 pointer-events-auto
        transition-all duration-200 ease-out
        ${hasContent ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
    >
      <div className="min-w-[220px] max-w-[280px] max-h-[min(48vh,27rem)] overflow-y-auto rounded-lg border border-amber-200/15 bg-slate-950/70 p-3 shadow-2xl shadow-black/30 backdrop-blur-md sm:max-w-[320px] sm:p-4">
        {/* Close button */}
        <div className="flex justify-end mb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-white/40 hover:text-white hover:bg-white/10"
            onClick={handleClose}
            aria-label="Close selection panel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content based on selection */}
        {entity && <UnitPanel entity={entity} />}
        {!entity && city && <CityPanel city={city} />}
        {!entity && !city && hexTile && (
          <HexInfo hexCoord={selectedHex!} hexTile={hexTile} />
        )}
        {!entity && !city && !hexTile && selectedHex && (
          <HexInfo hexCoord={selectedHex} hexTile={null} />
        )}
      </div>
    </div>
  );
}

// ─── Hex Info Sub-Component ───────────────────────────────────────────────────

function HexInfo({
  hexCoord,
  hexTile,
}: {
  hexCoord: { q: number; r: number };
  hexTile: HexTile | null;
}) {
  const terrainDef = hexTile
    ? TERRAIN_TYPES[hexTile.terrain as TerrainTypeId]
    : null;
  const resourceDef = hexTile?.resource
    ? RESOURCES[hexTile.resource as ResourceId]
    : null;

  return (
    <div className="space-y-2">
      {/* Coordinates */}
      <div className="flex items-center gap-2">
        <h3 className="text-white text-sm font-semibold">
          {terrainDef?.nameRu ?? terrainDef?.name ?? 'Unknown'}
        </h3>
        <span className="text-white/40 text-xs tabular-nums">
          ({hexCoord.q}, {hexCoord.r})
        </span>
      </div>

      {/* Terrain color indicator */}
      {terrainDef && (
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded border border-white/20"
            style={{ backgroundColor: terrainDef.color }}
            aria-hidden="true"
          />
          <span className="text-white/60 text-xs">
            {terrainDef.walkable ? 'Walkable' : 'Impassable'}
          </span>
          {terrainDef.movementCost > 0 && (
            <span className="text-white/40 text-xs tabular-nums">
              Cost: {terrainDef.movementCost}
            </span>
          )}
          {terrainDef.defenseModifier !== 0 && (
            <span
              className={`text-xs tabular-nums ${
                terrainDef.defenseModifier > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              Def: {terrainDef.defenseModifier > 0 ? '+' : ''}
              {Math.round(terrainDef.defenseModifier * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Resource */}
      {hexTile?.resource && resourceDef && (
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: resourceDef.iconColor }}
            aria-hidden="true"
          />
          <span className="text-white/70 text-xs">
            {resourceDef.nameRu ?? resourceDef.name}
          </span>
        </div>
      )}

      {/* Yields */}
      {hexTile && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(hexTile.yield).map(([key, value]) => {
            if (!value || value <= 0) return null;
            const resDef = RESOURCES[key as ResourceId];
            return (
              <Badge
                key={key}
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-white/70 border-white/20 bg-white/5"
              >
                {resDef?.nameRu ?? key}: +{value}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Improvements */}
      {(hexTile?.hasRoad || hexTile?.hasFort || hexTile?.improvement) && (
        <div className="flex flex-wrap gap-1">
          {hexTile.hasRoad && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-600/50 text-amber-100">
              Road
            </Badge>
          )}
          {hexTile.hasFort && (
            <Badge className="text-[10px] px-1.5 py-0 bg-stone-600/50 text-stone-100">
              Fort
            </Badge>
          )}
          {hexTile.improvement && (
            <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600/50 text-emerald-100">
              {hexTile.improvement.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CityPanel — selected city details for the SelectionPanel.
 *
 * Displays city info, population, HP, production queue, buildings,
 * and action buttons for city management and recruitment.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BUILDINGS } from '@/data/buildings';
import type { BuildingId } from '@/data/buildings';
import type { CityState } from '@/engine/core/GameState';

// ─── Component ────────────────────────────────────────────────────────────────

interface CityPanelProps {
  city: CityState;
}

export function CityPanel({ city }: CityPanelProps) {
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);

  const owner = gameState?.players[city.ownerId];
  const isOwnedByActive = city.ownerId === activePlayerId;

  const hpRatio = city.maxHp > 0 ? city.hp / city.maxHp : 0;
  const wallHpRatio = city.maxWallHp > 0 ? city.wallHp / city.maxWallHp : 0;
  const growthRatio = city.growthTarget > 0 ? city.growthProgress / city.growthTarget : 0;

  // Current production item
  const currentProduction = city.productionQueue[0] ?? null;
  const productionRatio = currentProduction
    ? currentProduction.cost > 0
      ? currentProduction.progress / currentProduction.cost
      : 0
    : 0;

  // Building names
  const buildingNames = useMemo(() => {
    return city.buildings.map((id) => {
      const def = BUILDINGS[id as BuildingId];
      return {
        id,
        name: def?.nameRu ?? def?.name ?? id,
        isWonder: def?.isWonder ?? false,
      };
    });
  }, [city.buildings]);

  const handleManage = useCallback(() => {
    setOpenPanel('city');
  }, [setOpenPanel]);

  const handleRecruit = useCallback(() => {
    setOpenPanel('recruitment');
  }, [setOpenPanel]);

  return (
    <div className="space-y-2">
      {/* Header: City name + level + owner */}
      <div className="flex items-center gap-2">
        {owner && (
          <span
            className="w-3 h-3 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: owner.color }}
            aria-label={`Owner: ${owner.name}`}
          />
        )}
        <h3 className="text-white text-sm font-semibold truncate">
          {city.name}
        </h3>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-300 border-amber-500/30 bg-amber-500/10">
          Lvl {city.level}
        </Badge>
        {city.isUnderSiege && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Under Siege
          </Badge>
        )}
      </div>

      {/* Population + growth */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-white/60">
          <span>Population</span>
          <span className="tabular-nums">
            {city.population} ({city.growthProgress}/{city.growthTarget})
          </span>
        </div>
        <Progress
          value={growthRatio * 100}
          className="h-1.5 bg-white/10 [&>div]:bg-emerald-500"
        />
      </div>

      {/* HP + Wall HP */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-white/60">
            <span>City HP</span>
            <span className="tabular-nums">
              {city.hp}/{city.maxHp}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hpRatio > 0.6 ? 'bg-emerald-500' : hpRatio > 0.3 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }}
            />
          </div>
        </div>
        {city.maxWallHp > 0 && (
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px] text-white/60">
              <span>Walls</span>
              <span className="tabular-nums">
                {city.wallHp}/{city.maxWallHp}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, wallHpRatio * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Production Queue */}
      {currentProduction && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-white/60">
            <span>
              Building: {currentProduction.kind === 'building' ? '🏗️' : '⚔️'}{' '}
              {currentProduction.id.replace(/_/g, ' ')}
            </span>
            <span className="tabular-nums">
              {currentProduction.progress}/{currentProduction.cost}
            </span>
          </div>
          <Progress
            value={productionRatio * 100}
            className="h-1.5 bg-white/10 [&>div]:bg-amber-500"
          />
        </div>
      )}

      {/* Per-turn yields */}
      <div className="flex gap-2 text-[10px] text-white/60">
        <span>
          🌾 {city.foodPerTurn}
        </span>
        <span>
          🔨 {city.productionPerTurn}
        </span>
      </div>

      {/* Buildings list */}
      {buildingNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {buildingNames.map((b) => (
            <Badge
              key={b.id}
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                b.isWonder
                  ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                  : 'text-white/70 border-white/20 bg-white/5'
              }`}
            >
              {b.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {isOwnedByActive && (
        <>
          <Separator className="bg-white/10" />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs flex-1"
              onClick={handleManage}
            >
              Manage
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs flex-1"
              onClick={handleRecruit}
            >
              Recruit
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

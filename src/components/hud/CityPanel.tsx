/**
 * CityPanel — selected city details for the SelectionPanel.
 *
 * Displays compact city info: name, population, current production item
 * with progress, key yields per turn, and quick access buttons.
 * All text in Russian.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BUILDINGS } from '@/data/buildings';
import { UNIT_TYPES } from '@/data/units';
import { calculateCityYield } from '@/engine/rules/cityRules';
import type { BuildingId } from '@/data/buildings';
import type { UnitTypeId } from '@/data/units';
import type { ResourceId } from '@/engine/core/types';
import type { CityState, ProductionItem } from '@/engine/core/GameState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const YIELD_ICONS: Partial<Record<ResourceId, string>> = {
  gold: '🪙',
  food: '🌾',
  wood: '🪵',
  stone: '🪨',
  iron: '⚔️',
  mana: '🔮',
  progress: '📜',
  science: '🔬',
};

/** Get display name for a production item */
function getProductionItemName(item: ProductionItem): string {
  if (item.kind === 'building') {
    const building = BUILDINGS[item.id as BuildingId];
    return building?.nameRu ?? item.id;
  }
  const unit = UNIT_TYPES[item.id as UnitTypeId];
  return unit?.nameRu ?? item.id;
}

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

  // Turns left for current production
  const turnsLeft =
    currentProduction && city.productionPerTurn > 0
      ? Math.ceil((currentProduction.cost - currentProduction.progress) / city.productionPerTurn)
      : currentProduction
      ? '?'
      : null;

  // ── City yield from rules ──────────────────────────────────────────────
  const cityYield = useMemo(() => {
    if (!gameState || !city.id) return null;
    return calculateCityYield(gameState, city.id);
  }, [gameState, city.id]);

  // Food surplus
  const foodSurplus = (cityYield?.food ?? 0) - city.population;

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

  // Key yield items for compact display
  const keyYields = useMemo(() => {
    if (!cityYield) return [];
    const keys: ResourceId[] = ['food', 'progress', 'gold', 'science'];
    return keys
      .map((k) => ({ key: k, value: cityYield[k] ?? 0 }))
      .filter((item) => item.value !== 0);
  }, [cityYield]);

  const handleManage = useCallback(() => {
    setOpenPanel('city');
  }, [setOpenPanel]);

  const handleRecruit = useCallback(() => {
    setOpenPanel('recruitment');
  }, [setOpenPanel]);

  return (
    <div className="space-y-2.5">
      {/* Header: City name + level + owner */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {owner && (
          <span
            className="w-3 h-3 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: owner.color }}
            aria-label={`Владелец: ${owner.name}`}
          />
        )}
        <h3 className="text-white text-sm font-bold truncate">
          {city.name}
        </h3>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-300 border-amber-500/30 bg-amber-500/10">
          Ур. {city.level}
        </Badge>
        {city.isUnderSiege && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Осада
          </Badge>
        )}
      </div>

      {/* Production Queue - current item */}
      {currentProduction && (
        <div className="hud-chip space-y-1 px-2 py-2">
          <div className="flex justify-between gap-3 text-[11px] text-white/70">
            <span className="min-w-0 truncate font-bold text-amber-100">
              {currentProduction.kind === 'building' ? '🏗️' : '⚔️'}{' '}
              {getProductionItemName(currentProduction)}
            </span>
            <span className="shrink-0 tabular-nums">
              {Math.floor(currentProduction.progress)}/{currentProduction.cost}
              {turnsLeft && typeof turnsLeft === 'number' && (
                <span className="text-amber-200/70"> · {turnsLeft} ход.</span>
              )}
            </span>
          </div>
          <Progress
            value={productionRatio * 100}
            className="h-2 bg-white/10 [&>div]:bg-amber-500"
          />
          {city.productionQueue.length > 1 && (
            <div className="text-[10px] text-zinc-400">
              +{city.productionQueue.length - 1} в очереди
            </div>
          )}
        </div>
      )}

      {/* Population + growth */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-white/60">
          <span>Население</span>
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
            <span>HP города</span>
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
              <span>Стены</span>
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

      {/* Per-turn yields — compact */}
      <div className="flex gap-2 text-[10px] text-white/60 flex-wrap">
        {keyYields.map((item) => {
          const icon = YIELD_ICONS[item.key] ?? '';
          const displayValue =
            item.key === 'food'
              ? foodSurplus
              : item.value;
          return (
            <span
              key={item.key}
              className={
                item.key === 'food' && foodSurplus < 0
                  ? 'text-red-400'
                  : item.key === 'food' && foodSurplus >= 0
                  ? 'text-emerald-400'
                  : ''
              }
            >
              {icon} {displayValue >= 0 && item.key === 'food' ? '+' : ''}{displayValue}
            </span>
          );
        })}
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
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-bold bg-amber-500/90 text-slate-950 hover:bg-amber-400"
              onClick={handleManage}
            >
              Управление
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-bold"
              onClick={handleRecruit}
            >
              Найм
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

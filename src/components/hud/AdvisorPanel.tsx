'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, ArrowRight, Building2, CircleDollarSign, ClipboardList, Hammer, MousePointer2, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/useGameStore';
import { BUILDINGS } from '@/data/buildings';
import { UNIT_TYPES } from '@/data/units';
import type { CityState, EntityData } from '@/engine/core/GameState';
import type { ResourceId } from '@/engine/core/types';
import type { BuildingId } from '@/data/buildings';
import type { UnitTypeId } from '@/data/units';

type AdvisorItem = {
  id: string;
  priority: number;
  tone: 'warning' | 'action' | 'info' | 'success';
  icon: ReactNode;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
};

const RESOURCE_NAMES: Partial<Record<ResourceId, string>> = {
  gold: 'Gold',
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
  iron: 'Iron',
  mana: 'Mana',
  progress: 'Production',
  science: 'Science',
};

function productionName(item: CityState['productionQueue'][number] | undefined): string {
  if (!item) return 'No production';
  if (item.kind === 'building') {
    const building = BUILDINGS[item.id as BuildingId];
    return building?.name ?? building?.nameRu ?? item.id;
  }
  const unit = UNIT_TYPES[item.id as UnitTypeId];
  return unit?.name ?? unit?.nameRu ?? item.id;
}

function unitName(entity: EntityData): string {
  const unit = UNIT_TYPES[entity.typeId as UnitTypeId];
  return unit?.name ?? unit?.nameRu ?? entity.typeId;
}

function turnsLeft(city: CityState): number | null {
  const item = city.productionQueue[0];
  if (!item || city.productionPerTurn <= 0) return null;
  return Math.max(1, Math.ceil((item.cost - item.progress) / city.productionPerTurn));
}

export function AdvisorPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const selectEntity = useGameStore((s) => s.selectEntity);
  const selectCity = useGameStore((s) => s.selectCity);
  const centerOnHex = useGameStore((s) => s.centerOnHex);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);

  const items = useMemo<AdvisorItem[]>(() => {
    if (!gameState) return [];
    const player = gameState.players[activePlayerId];
    if (!player) return [];

    const ownedCities = Object.values(gameState.cities).filter((city) => city.ownerId === activePlayerId);
    const ownedUnits = Object.values(gameState.entities).filter((entity) => entity.ownerId === activePlayerId);
    const localItems: AdvisorItem[] = [];

    const idleUnits = ownedUnits.filter((entity) => !entity.hasActed && entity.movementPoints > 0);
    if (idleUnits.length > 0) {
      const target = idleUnits[0];
      localItems.push({
        id: 'idle-units',
        priority: 10,
        tone: 'action',
        icon: <Route className="h-3.5 w-3.5" />,
        title: `${idleUnits.length} unit${idleUnits.length === 1 ? '' : 's'} can act`,
        detail: `${unitName(target)} has ${target.movementPoints}/${target.maxMovement} movement.`,
        actionLabel: 'Select',
        onAction: () => {
          selectEntity(target.id);
          centerOnHex(target.hex);
        },
      });
    }

    const emptyProductionCities = ownedCities.filter((city) => city.productionQueue.length === 0);
    if (emptyProductionCities.length > 0) {
      const city = emptyProductionCities[0];
      localItems.push({
        id: 'empty-production',
        priority: 9,
        tone: 'warning',
        icon: <Hammer className="h-3.5 w-3.5" />,
        title: `${emptyProductionCities.length} ${emptyProductionCities.length === 1 ? 'city' : 'cities'} idle`,
        detail: `${city.name} needs a production order.`,
        actionLabel: 'Manage',
        onAction: () => {
          selectCity(city.id);
          centerOnHex(city.hex);
          setOpenPanel('city');
        },
      });
    }

    const finishingCities = ownedCities
      .map((city) => ({ city, left: turnsLeft(city) }))
      .filter((entry): entry is { city: CityState; left: number } => entry.left !== null && entry.left <= 2)
      .sort((a, b) => a.left - b.left);
    if (finishingCities.length > 0) {
      const { city, left } = finishingCities[0];
      localItems.push({
        id: 'production-soon',
        priority: 7,
        tone: 'success',
        icon: <Building2 className="h-3.5 w-3.5" />,
        title: 'Production soon',
        detail: `${city.name}: ${productionName(city.productionQueue[0])} in ${left} turn${left === 1 ? '' : 's'}.`,
        actionLabel: 'View',
        onAction: () => {
          selectCity(city.id);
          centerOnHex(city.hex);
        },
      });
    }

    const negativeResources = Object.entries(player.incomePerTurn)
      .map(([resourceId, income]) => {
        const upkeep = player.upkeepPerTurn[resourceId as ResourceId] ?? 0;
        return { resourceId: resourceId as ResourceId, net: (income ?? 0) - upkeep };
      })
      .filter((entry) => entry.net < 0)
      .sort((a, b) => a.net - b.net);
    if (negativeResources.length > 0) {
      const resource = negativeResources[0];
      localItems.push({
        id: 'negative-income',
        priority: 8,
        tone: 'warning',
        icon: <CircleDollarSign className="h-3.5 w-3.5" />,
        title: 'Income pressure',
        detail: `${RESOURCE_NAMES[resource.resourceId] ?? resource.resourceId}: ${resource.net}/turn after upkeep.`,
      });
    }

    const lowStocks = Object.entries(player.resources)
      .filter(([resourceId, amount]) => {
        const id = resourceId as ResourceId;
        const net = (player.incomePerTurn[id] ?? 0) - (player.upkeepPerTurn[id] ?? 0);
        return amount <= 10 && net <= 0;
      })
      .map(([resourceId, amount]) => ({ resourceId: resourceId as ResourceId, amount }))
      .sort((a, b) => a.amount - b.amount);
    if (lowStocks.length > 0) {
      const stock = lowStocks[0];
      localItems.push({
        id: 'low-stock',
        priority: 6,
        tone: 'info',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        title: 'Low stockpile',
        detail: `${RESOURCE_NAMES[stock.resourceId] ?? stock.resourceId}: ${stock.amount} available.`,
      });
    }

    if (localItems.length === 0) {
      localItems.push({
        id: 'ready',
        priority: 0,
        tone: 'info',
        icon: <MousePointer2 className="h-3.5 w-3.5" />,
        title: 'No urgent tasks',
        detail: 'Review the map, manage a city, or end the turn.',
      });
    }

    return localItems.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }, [activePlayerId, centerOnHex, gameState, selectCity, selectEntity, setOpenPanel]);

  if (!gameState) return null;

  return (
    <aside className="absolute right-2 top-[7.25rem] z-20 w-64 pointer-events-auto sm:right-4 sm:w-72">
      <div className="hud-panel hud-panel-strong overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <ClipboardList className="h-4 w-4 text-amber-200" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-100/80">
              Advisor
            </div>
            <div className="text-[10px] text-white/45">
              Turn priorities
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/8">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1rem_1fr_auto] items-start gap-2 px-3 py-2">
              <span
                className={
                  item.tone === 'warning'
                    ? 'mt-0.5 text-amber-300'
                    : item.tone === 'success'
                    ? 'mt-0.5 text-emerald-300'
                    : item.tone === 'action'
                    ? 'mt-0.5 text-sky-300'
                    : 'mt-0.5 text-white/55'
                }
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white/90">{item.title}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/55">{item.detail}</div>
              </div>
              {item.onAction && item.actionLabel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px] font-bold text-amber-100 hover:bg-amber-500/15 hover:text-amber-50"
                  onClick={item.onAction}
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

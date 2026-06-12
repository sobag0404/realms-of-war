'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/store/useGameStore';
import { BUILDINGS, getBuildingById } from '@/data/buildings';
import { RESOURCES } from '@/data/resources';
import type { ResourceId } from '@/engine/core/types';
import type { CityState } from '@/engine/core/GameState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESOURCE_ICONS: Partial<Record<ResourceId, string>> = {
  gold: '🪙',
  food: '🍞',
  wood: '🪵',
  stone: '🪨',
  iron: '⚒️',
  mana: '🔮',
  progress: '⚙️',
  science: '📚',
};

function renderYield(yieldObj: Partial<Record<string, number>>): string {
  return Object.entries(yieldObj)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => {
      const icon = RESOURCE_ICONS[k as ResourceId] ?? '';
      return `${icon}${v}`;
    })
    .join(' ');
}

/**
 * CityManagementScreen — side panel for managing a selected city.
 *
 * Shows population, production, buildings, territory, and defense info.
 */
export function CityManagementScreen() {
  const openPanel = useGameStore((s) => s.openPanel);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const gameState = useGameStore((s) => s.gameState);
  const selectedCityId = useGameStore((s) => s.selectedCityId);

  // ── Escape key handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpenPanel]);

  // ── Find the city ──────────────────────────────────────────────────────
  const city = useMemo<CityState | null>(() => {
    if (!gameState || !selectedCityId) return null;
    return gameState.cities[selectedCityId] ?? null;
  }, [gameState, selectedCityId]);

  // ── Get building details ───────────────────────────────────────────────
  const buildingDetails = useMemo(() => {
    if (!city) return [];
    return city.buildings
      .map((bId) => {
        try {
          return getBuildingById(bId as keyof typeof BUILDINGS);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }, [city]);

  if (openPanel !== 'city' || !city || !gameState) return null;

  const player = gameState.players[city.ownerId];
  const growthPercent =
    city.growthTarget > 0
      ? (city.growthProgress / city.growthTarget) * 100
      : 0;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[450px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">{city.name}</h2>
          <span className="text-zinc-500 text-xs">
            Уровень {city.level} • {player?.name ?? 'Неизвестный'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={() => setOpenPanel('none')}
        >
          ✕
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* ── Население ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              👥 Население
            </h3>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">
                    {city.population} жителей
                  </span>
                  <span className="text-zinc-500 text-xs">
                    🍞 {city.foodPerTurn}/ход
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress value={growthPercent} className="h-2" />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Рост: {city.growthProgress}</span>
                    <span>Цель: {city.growthTarget}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ── Производство ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              ⚒️ Производство
            </h3>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">
                    Очередь производства
                  </span>
                  <span className="text-zinc-500 text-xs">
                    ⚙️ {city.productionPerTurn}/ход
                  </span>
                </div>
                {city.productionQueue.length === 0 ? (
                  <div className="text-zinc-600 text-xs py-2">
                    Ничего не производится
                  </div>
                ) : (
                  <div className="space-y-2">
                    {city.productionQueue.map((item, i) => {
                      const progressPercent =
                        item.cost > 0 ? (item.progress / item.cost) * 100 : 0;
                      return (
                        <div key={`${item.id}-${i}`} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-200 text-xs">
                              {i === 0 ? '▶ ' : ''}
                              {item.kind === 'building' ? '🏗️' : '⚔️'}{' '}
                              {item.id}
                            </span>
                            <span className="text-zinc-500 text-[10px]">
                              {item.progress}/{item.cost}
                            </span>
                          </div>
                          <Progress value={progressPercent} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Separator className="bg-zinc-800" />

          {/* ── Здания ────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              🏛️ Здания ({city.buildings.length})
            </h3>
            {buildingDetails.length === 0 ? (
              <div className="text-zinc-600 text-xs py-2">
                Нет построенных зданий
              </div>
            ) : (
              <div className="space-y-2">
                {buildingDetails.map((building) => {
                  if (!building) return null;
                  return (
                    <Card
                      key={building.id}
                      className="bg-zinc-900/50 border-zinc-800"
                    >
                      <CardContent className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 text-xs font-medium">
                            {building.nameRu}
                          </span>
                          {building.isWonder && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-900/40 text-amber-400 border-amber-800/50" variant="outline">
                              Чудо
                            </Badge>
                          )}
                        </div>
                        <div className="text-zinc-500 text-[10px] space-y-0.5">
                          {building.effects.map((effect, i) => (
                            <div key={i}>• {effect.description}</div>
                          ))}
                        </div>
                        {(Object.keys(building.upkeep).length > 0) && (
                          <div className="text-zinc-600 text-[10px]">
                            Содержание: {renderYield(building.upkeep)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <Separator className="bg-zinc-800" />

          {/* ── Территория ────────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              🗺️ Территория
            </h3>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3 space-y-1">
                <div className="text-zinc-200 text-xs">
                  Гексов: {city.territory.length}
                </div>
                <div className="text-zinc-500 text-[10px]">
                  Обрабатывается: {city.workedHexes.length} из{' '}
                  {city.territory.length}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ── Оборона ────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              🛡️ Оборона
            </h3>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500">HP города:</span>
                    <div className="text-white">
                      {city.hp}/{city.maxHp}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-500">HP стен:</span>
                    <div className="text-white">
                      {city.wallHp}/{city.maxWallHp}
                    </div>
                  </div>
                </div>
                {city.isUnderSiege && (
                  <Badge className="bg-red-900/40 text-red-400 border-red-800/50 text-xs" variant="outline">
                    ⚔️ Город под осадой!
                  </Badge>
                )}
                <div className="text-zinc-600 text-[10px]">
                  Основан на ходе {city.foundedTurn}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </ScrollArea>

      {/* Footer with action buttons */}
      <div className="p-4 border-t border-zinc-800 flex gap-2">
        <Button
          className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm"
          onClick={() => {
            // Open building selection modal - future implementation
          }}
        >
          🏗️ Построить
        </Button>
        <Button
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm"
          onClick={() => setOpenPanel('recruitment')}
        >
          ⚔️ Нанять
        </Button>
      </div>
    </div>
  );
}

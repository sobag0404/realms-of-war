'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/store/useGameStore';
import { BUILDINGS, getBuildingById } from '@/data/buildings';
import { UNIT_TYPES } from '@/data/units';
import { calculateCityYield, getAvailableBuildings } from '@/engine/rules/cityRules';
import type { ResourceId } from '@/engine/core/types';
import type { CityState, ProductionItem } from '@/engine/core/GameState';
import type { BuildingId } from '@/data/buildings';
import type { UnitTypeId } from '@/data/units';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESOURCE_ICONS: Partial<Record<ResourceId, string>> = {
  gold: '🪙',
  food: '🌾',
  wood: '🪵',
  stone: '🪨',
  iron: '⚔️',
  mana: '🔮',
  progress: '📜',
  science: '🔬',
};

const YIELD_LABELS: Partial<Record<ResourceId, string>> = {
  gold: 'Золото',
  food: 'Еда',
  wood: 'Дерево',
  stone: 'Камень',
  iron: 'Железо',
  mana: 'Мана',
  progress: 'Производство',
  science: 'Наука',
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

function canAfford(
  cost: Partial<Record<string, number>>,
  resources: Record<string, number>,
): boolean {
  for (const [key, value] of Object.entries(cost)) {
    if (value !== undefined && value > 0 && (resources[key] ?? 0) < value) {
      return false;
    }
  }
  return true;
}

/** Get display name for a production item */
function getProductionItemName(item: ProductionItem): string {
  if (item.kind === 'building') {
    const building = BUILDINGS[item.id as BuildingId];
    return building?.nameRu ?? item.id;
  }
  const unit = UNIT_TYPES[item.id as UnitTypeId];
  return unit?.nameRu ?? item.id;
}

/**
 * CityManagementScreen — side panel for managing a selected city.
 *
 * Shows population, production queue, city yield breakdown,
 * available buildings for construction, and existing buildings.
 */
export function CityManagementScreen() {
  const openPanel = useGameStore((s) => s.openPanel);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const gameState = useGameStore((s) => s.gameState);
  const selectedCityId = useGameStore((s) => s.selectedCityId);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const dispatchCommand = useGameStore((s) => s.dispatchCommand);

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

  // ── Player for affordability checks ────────────────────────────────────
  const player = useMemo(() => {
    if (!gameState || !activePlayerId) return null;
    return gameState.players[activePlayerId] ?? null;
  }, [gameState, activePlayerId]);

  // ── City yield from rules ──────────────────────────────────────────────
  const cityYield = useMemo(() => {
    if (!gameState || !selectedCityId) return null;
    return calculateCityYield(gameState, selectedCityId);
  }, [gameState, selectedCityId]);

  // ── Available buildings from rules ─────────────────────────────────────
  const availableBuildings = useMemo(() => {
    if (!gameState || !selectedCityId) return [];
    return getAvailableBuildings(gameState, selectedCityId);
  }, [gameState, selectedCityId]);

  // ── Get existing building details ──────────────────────────────────────
  const buildingDetails = useMemo(() => {
    if (!city) return [];
    return city.buildings
      .map((bId) => {
        try {
          return getBuildingById(bId as BuildingId);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }, [city]);

  // ── Build handler ──────────────────────────────────────────────────────
  const handleBuild = useCallback(
    (buildingTypeId: string) => {
      if (!activePlayerId || !selectedCityId) return;
      dispatchCommand({
        type: 'BuildBuilding',
        playerId: activePlayerId,
        cityId: selectedCityId,
        buildingTypeId,
      });
    },
    [activePlayerId, selectedCityId, dispatchCommand],
  );

  if (openPanel !== 'city' || !city || !gameState) return null;

  const ownerPlayer = gameState.players[city.ownerId];
  const growthPercent =
    city.growthTarget > 0
      ? (city.growthProgress / city.growthTarget) * 100
      : 0;

  // Food surplus = total food yield - population consumption
  const foodYield = cityYield?.food ?? 0;
  const foodConsumption = city.population;
  const foodSurplus = foodYield - foodConsumption;

  // Calculate turns to grow
  const turnsToGrow =
    foodSurplus > 0
      ? Math.ceil((city.growthTarget - city.growthProgress) / foodSurplus)
      : foodSurplus === 0
      ? '∞'
      : '';

  const currentProduction = city.productionQueue[0] ?? null;
  const currentProductionTurns =
    currentProduction && city.productionPerTurn > 0
      ? Math.max(1, Math.ceil((currentProduction.cost - currentProduction.progress) / city.productionPerTurn))
      : currentProduction
      ? '?'
      : null;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[450px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">{city.name}</h2>
          <span className="text-zinc-500 text-xs">
            Уровень {city.level} • {ownerPlayer?.name ?? 'Неизвестный'}
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
          <section>
            <Card className="border-amber-900/40 bg-amber-950/20">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/70">
                      City brief
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-white">
                      {currentProduction ? getProductionItemName(currentProduction) : 'Choose production'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {currentProduction
                        ? `${city.productionQueue.length} queued, ${currentProductionTurns} turn${currentProductionTurns === 1 ? '' : 's'} to finish`
                        : 'No queue item is using this city output.'}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      currentProduction
                        ? 'border-amber-700/50 bg-amber-900/25 text-amber-200'
                        : 'border-red-700/50 bg-red-900/25 text-red-200'
                    }
                  >
                    {currentProduction ? 'Producing' : 'Idle'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="text-zinc-500">Output</div>
                    <div className="mt-0.5 font-semibold text-amber-200 tabular-nums">
                      {city.productionPerTurn}/turn
                    </div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="text-zinc-500">Food net</div>
                    <div className={`mt-0.5 font-semibold tabular-nums ${foodSurplus < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                      {foodSurplus >= 0 ? '+' : ''}{foodSurplus}/turn
                    </div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="text-zinc-500">Worked</div>
                    <div className="mt-0.5 font-semibold text-white/80 tabular-nums">
                      {city.workedHexes.length}/{city.territory.length}
                    </div>
                  </div>
                </div>

                {!currentProduction && (
                  <Button
                    size="sm"
                    className="h-8 w-full bg-amber-700 text-xs font-bold text-white hover:bg-amber-600"
                    onClick={() => setOpenPanel('recruitment')}
                  >
                    Queue unit
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>

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
                  <span className={`text-xs tabular-nums ${
                    foodSurplus > 0 ? 'text-emerald-400' : foodSurplus < 0 ? 'text-red-400' : 'text-zinc-500'
                  }`}>
                    🌾 {foodSurplus >= 0 ? '+' : ''}{foodSurplus}/ход
                    {turnsToGrow && typeof turnsToGrow === 'number' && (
                      <span className="text-zinc-500 ml-1">({turnsToGrow} ход.)</span>
                    )}
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress value={growthPercent} className="h-2 bg-white/10 [&>div]:bg-emerald-500" />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Рост: {city.growthProgress}</span>
                    <span>Цель: {city.growthTarget}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ── Доходы города ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              💰 Доходы города
            </h3>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {cityYield && Object.entries(cityYield)
                    .filter(([, v]) => v !== undefined && v !== 0)
                    .map(([key, value]) => {
                      const icon = RESOURCE_ICONS[key as ResourceId] ?? '';
                      const label = YIELD_LABELS[key as ResourceId] ?? key;
                      return (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">
                            {icon} {label}
                          </span>
                          <span className={`text-white tabular-nums font-medium ${
                            key === 'food' && foodSurplus < 0 ? 'text-red-400' : ''
                          }`}>
                            +{value}
                          </span>
                        </div>
                      );
                    })}
                  {(!cityYield || Object.values(cityYield).every((v) => !v)) && (
                    <div className="text-zinc-600 text-xs col-span-2 py-1">
                      Нет доходов
                    </div>
                  )}
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
                  <span className="text-zinc-500 text-xs tabular-nums">
                    📜 {city.productionPerTurn}/ход
                  </span>
                </div>
                {city.productionQueue.length === 0 ? (
                  <div className="text-zinc-600 text-xs py-2">
                    Ничего не производится. Выберите здание или юнита.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {city.productionQueue.map((item, i) => {
                      const progressPercent =
                        item.cost > 0 ? (item.progress / item.cost) * 100 : 0;
                      const turnsLeft =
                        city.productionPerTurn > 0
                          ? Math.ceil((item.cost - item.progress) / city.productionPerTurn)
                          : '?';
                      return (
                        <div key={`${item.id}-${i}`} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-200 text-xs">
                              {i === 0 ? '▶ ' : `${i + 1}. `}
                              {item.kind === 'building' ? '🏗️' : '⚔️'}{' '}
                              {getProductionItemName(item)}
                            </span>
                            <span className="text-zinc-500 text-[10px] tabular-nums">
                              {Math.floor(item.progress)}/{item.cost} • {turnsLeft} ход.
                            </span>
                          </div>
                          <Progress
                            value={progressPercent}
                            className="h-1.5 bg-white/10 [&>div]:bg-amber-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Separator className="bg-zinc-800" />

          {/* ── Доступные здания ───────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              🏗️ Доступные здания ({availableBuildings.length})
            </h3>
            {availableBuildings.length === 0 ? (
              <div className="text-zinc-600 text-xs py-2">
                Нет доступных зданий для постройки.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#52525b transparent' }}
              >
                {availableBuildings.map((buildingId) => {
                  const building = BUILDINGS[buildingId as BuildingId];
                  if (!building) return null;
                  const affordable = player
                    ? canAfford(building.cost, player.resources)
                    : false;

                  // Calculate production cost (sum of resource costs / 2, minimum 1)
                  const costValues = Object.values(building.cost) as number[];
                  const productionCost = Math.max(1, costValues.reduce((sum, v) => sum + v, 0) / 2);
                  const turnsToBuild =
                    city.productionPerTurn > 0
                      ? Math.ceil(productionCost / city.productionPerTurn)
                      : '?';

                  return (
                    <Card
                      key={buildingId}
                      className="bg-zinc-900/50 border-zinc-800"
                    >
                      <CardContent className="p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 text-xs font-medium">
                            {building.nameRu}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 text-[10px] tabular-nums">
                              ⏱ {turnsToBuild} ход.
                            </span>
                            {building.isWonder && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-900/40 text-amber-400 border-amber-800/50" variant="outline">
                                Чудо
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Effects */}
                        <div className="text-zinc-500 text-[10px] space-y-0.5">
                          {building.effects.slice(0, 3).map((effect, i) => (
                            <div key={i}>• {effect.description}</div>
                          ))}
                          {building.effects.length > 3 && (
                            <div className="text-zinc-600">
                              + ещё {building.effects.length - 3}...
                            </div>
                          )}
                        </div>

                        {/* Cost */}
                        <div className="text-xs">
                          <span className="text-zinc-500">Стоимость: </span>
                          <span className={affordable ? 'text-zinc-200' : 'text-red-400'}>
                            {renderYield(building.cost)}
                          </span>
                        </div>

                        {/* Upkeep */}
                        {Object.keys(building.upkeep).length > 0 && (
                          <div className="text-[10px]">
                            <span className="text-zinc-500">Содержание: </span>
                            <span className="text-zinc-400">
                              {renderYield(building.upkeep)}
                            </span>
                          </div>
                        )}

                        {/* Build button */}
                        <Button
                          size="sm"
                          className={`w-full text-xs h-7 ${
                            affordable
                              ? 'bg-amber-700 hover:bg-amber-600 text-white'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                          disabled={!affordable}
                          onClick={() => handleBuild(buildingId)}
                        >
                          {affordable ? 'Построить' : 'Недостаточно ресурсов'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <Separator className="bg-zinc-800" />

          {/* ── Построенные здания ─────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              🏛️ Построенные здания ({city.buildings.length})
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
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm"
          onClick={() => setOpenPanel('recruitment')}
        >
          ⚔️ Нанять
        </Button>
      </div>
    </div>
  );
}

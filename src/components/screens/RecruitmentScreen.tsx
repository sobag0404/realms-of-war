'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/store/useGameStore';
import { UNIT_TYPES, PLAYER_UNIT_IDS } from '@/data/units';
import { canRecruitUnit, getRecruitableUnits, getRecruitmentCost } from '@/engine/rules/recruitmentRules';
import type { UnitType, UnitTypeId } from '@/data/units';
import type { ResourceId } from '@/engine/core/types';

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

function renderCost(cost: Partial<Record<string, number>>): string {
  return Object.entries(cost)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => {
      const icon = RESOURCE_ICONS[k as ResourceId] ?? '';
      return `${icon}${v}`;
    })
    .join('  ');
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

// ─── Era order for sorting ────────────────────────────────────────────────────

const ERA_ORDER = [
  'primitives',
  'earlyCiv',
  'medieval',
  'renaissance',
  'rift',
] as const;

const ERA_LABELS: Record<string, string> = {
  primitives: 'Примитивы',
  earlyCiv: 'Ранняя цивилизация',
  medieval: 'Средневековье',
  renaissance: 'Ренессанс',
  rift: 'Разломы',
};

/**
 * RecruitmentScreen — side panel for recruiting units in a city.
 *
 * Shows available units filtered by city buildings, player techs, and era.
 * Units are added to the production queue (not instant).
 * Displays the current production queue with progress bars.
 */
export function RecruitmentScreen() {
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

  // ── Get city and player info ───────────────────────────────────────────
  const city = useMemo(() => {
    if (!gameState || !selectedCityId) return null;
    return gameState.cities[selectedCityId] ?? null;
  }, [gameState, selectedCityId]);

  const player = useMemo(() => {
    if (!gameState || !activePlayerId) return null;
    return gameState.players[activePlayerId] ?? null;
  }, [gameState, activePlayerId]);

  // ── Recruitable unit IDs from rules ────────────────────────────────────
  const recruitableUnitIds = useMemo(() => {
    if (!gameState || !selectedCityId) return [];
    return getRecruitableUnits(gameState, selectedCityId);
  }, [gameState, selectedCityId]);

  // ── Full unit type objects for recruitable units ───────────────────────
  const recruitableUnits = useMemo(() => {
    return recruitableUnitIds
      .map((id) => UNIT_TYPES[id as UnitTypeId])
      .filter(Boolean) as UnitType[];
  }, [recruitableUnitIds]);

  // ── Production queue items that are units ──────────────────────────────
  const unitQueue = useMemo(() => {
    if (!city) return [];
    return city.productionQueue.filter((item) => item.kind === 'unit');
  }, [city]);

  // ── Check if city is already producing a unit ──────────────────────────
  const hasUnitInQueue = unitQueue.length > 0;

  // ── Recruit handler ────────────────────────────────────────────────────
  const handleRecruit = useCallback(
    (unitTypeId: UnitTypeId) => {
      if (!activePlayerId || !selectedCityId) return;
      dispatchCommand({
        type: 'RecruitUnit',
        playerId: activePlayerId,
        cityId: selectedCityId,
        unitTypeId,
      });
    },
    [activePlayerId, selectedCityId, dispatchCommand],
  );

  if (openPanel !== 'recruitment' || !gameState) return null;

  const cityName = city?.name ?? 'Город';

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-amber-400">
            Найм юнитов
          </h2>
          <span className="text-zinc-500 text-xs">{cityName}</span>
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
        <div className="p-4 space-y-4">
          {/* ── Очередь найма ─────────────────────────────────────────── */}
          {unitQueue.length > 0 && (
            <section>
              <h3 className="text-zinc-300 text-sm font-semibold mb-2">
                📜 Очередь найма ({unitQueue.length})
              </h3>
              <div className="space-y-2">
                {unitQueue.map((item, i) => {
                  const progressPercent =
                    item.cost > 0 ? (item.progress / item.cost) * 100 : 0;
                  const unitDef = UNIT_TYPES[item.id as UnitTypeId];
                  const turnsLeft =
                    city && city.productionPerTurn > 0
                      ? Math.ceil((item.cost - item.progress) / city.productionPerTurn)
                      : '?';
                  return (
                    <Card key={`${item.id}-${i}`} className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 text-xs font-medium">
                            {i === 0 ? '▶ ' : `${i + 1}. `}
                            ⚔️ {unitDef?.nameRu ?? item.id}
                          </span>
                          <span className="text-zinc-500 text-[10px] tabular-nums">
                            {Math.floor(item.progress)}/{item.cost} • {turnsLeft} ход.
                          </span>
                        </div>
                        <Progress
                          value={progressPercent}
                          className="h-1.5 bg-white/10 [&>div]:bg-amber-500"
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Separator className="bg-zinc-800 mt-3" />
            </section>
          )}

          {/* ── Доступные юниты ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              ⚔️ Доступные юниты
            </h3>
            {recruitableUnits.length === 0 ? (
              <div className="text-zinc-600 text-sm py-8 text-center">
                Нет доступных юнитов для найма.
                <br />
                Постройте казармы или изучите технологии.
              </div>
            ) : (
              <div className="space-y-3">
                {recruitableUnits.map((unit) => {
                  const affordable = player
                    ? canAfford(unit.cost, player.resources)
                    : false;

                  // Also check if city already has a unit in queue (rules allow only 1 unit at a time)
                  const queueBlocked = hasUnitInQueue;

                  const canRecruit = affordable && !queueBlocked;

                  // Calculate production turns
                  const productionCost = Object.values(unit.cost).reduce(
                    (sum: number, v) => sum + (v ?? 0),
                    0,
                  ) / 2;
                  const turnsToProduce =
                    city && city.productionPerTurn > 0
                      ? Math.ceil(Math.max(1, productionCost) / city.productionPerTurn)
                      : '?';

                  return (
                    <Card
                      key={unit.id}
                      className="bg-zinc-900/50 border-zinc-800"
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Unit name and era */}
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">
                            {unit.nameRu}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 text-[10px] tabular-nums">
                              ⏱ {turnsToProduce} ход.
                            </span>
                            <Badge
                              className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700"
                              variant="outline"
                            >
                              {ERA_LABELS[unit.era] ?? unit.era}
                            </Badge>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                          <div>
                            <div className="text-zinc-500">HP</div>
                            <div className="text-white">{unit.hp}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500">ATK</div>
                            <div className="text-red-400">{unit.atk}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500">DEF</div>
                            <div className="text-blue-400">{unit.def}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500">MOV</div>
                            <div className="text-green-400">{unit.mov}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500">RNG</div>
                            <div className="text-yellow-400">{unit.range}</div>
                          </div>
                        </div>

                        {/* Cost */}
                        <div className="text-xs">
                          <span className="text-zinc-500">Стоимость: </span>
                          <span
                            className={
                              affordable ? 'text-zinc-200' : 'text-red-400'
                            }
                          >
                            {renderCost(unit.cost)}
                          </span>
                        </div>

                        {/* Upkeep */}
                        {Object.keys(unit.upkeep).length > 0 && (
                          <div className="text-xs">
                            <span className="text-zinc-500">Содержание: </span>
                            <span className="text-zinc-400">
                              {renderCost(unit.upkeep)}
                            </span>
                          </div>
                        )}

                        {/* Abilities */}
                        {unit.abilities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {unit.abilities.map((ability) => (
                              <Badge
                                key={ability}
                                className="text-[9px] px-1 py-0 bg-zinc-800 text-zinc-400 border-zinc-700"
                                variant="outline"
                              >
                                {ability}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Recruit button */}
                        <Button
                          size="sm"
                          className={`w-full text-xs ${
                            canRecruit
                              ? 'bg-amber-700 hover:bg-amber-600 text-white'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                          disabled={!canRecruit}
                          onClick={() => handleRecruit(unit.id)}
                        >
                          {queueBlocked
                            ? 'Очередь найма занята'
                            : affordable
                            ? 'Нанять'
                            : 'Недостаточно ресурсов'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

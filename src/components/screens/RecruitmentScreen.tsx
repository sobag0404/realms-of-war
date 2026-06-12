'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/store/useGameStore';
import { UNIT_TYPES, PLAYER_UNIT_IDS } from '@/data/units';
import { RESOURCES } from '@/data/resources';
import type { UnitType, UnitTypeId } from '@/data/units';
import type { ResourceId } from '@/engine/core/types';

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

  // ── Filter recruitable units ───────────────────────────────────────────
  const recruitableUnits = useMemo(() => {
    if (!player || !city) return [];

    const playerTechs = new Set(player.techs);
    const cityBuildings = new Set(city.buildings);

    return PLAYER_UNIT_IDS.map((id) => UNIT_TYPES[id]).filter((unit) => {
      // Check tech requirement
      if (unit.tech && !playerTechs.has(unit.tech as typeof player.techs[number])) {
        return false;
      }
      // Check era requirement — player must be at or past this era
      const unitEraIndex = ERA_ORDER.indexOf(unit.era as typeof ERA_ORDER[number]);
      const playerEraIndex = ERA_ORDER.indexOf(player.era as typeof ERA_ORDER[number]);
      if (unitEraIndex > playerEraIndex) {
        return false;
      }
      // Check building requirement for certain unit types
      if (unit.id === 'archer' && !cityBuildings.has('archery_range')) return false;
      if (unit.id === 'mage' && !cityBuildings.has('mage_tower')) return false;
      if (unit.id === 'catapult' && !cityBuildings.has('siege_yard')) return false;
      // Melee units need barracks (except primitive ones)
      if (
        ['swordsman', 'knight', 'paladin'].includes(unit.id) &&
        !cityBuildings.has('barracks')
      )
        return false;

      return true;
    });
  }, [player, city]);

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

      {/* Unit list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {recruitableUnits.length === 0 ? (
            <div className="text-zinc-600 text-sm py-8 text-center">
              Нет доступных юнитов для найма.
              <br />
              Постройте казармы или изучите технологии.
            </div>
          ) : (
            recruitableUnits.map((unit) => {
              const affordable = player
                ? canAfford(unit.cost, player.resources)
                : false;

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
                      <Badge
                        className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700"
                        variant="outline"
                      >
                        {ERA_LABELS[unit.era] ?? unit.era}
                      </Badge>
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
                        affordable
                          ? 'bg-amber-700 hover:bg-amber-600 text-white'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                      disabled={!affordable}
                      onClick={() => handleRecruit(unit.id)}
                    >
                      {affordable ? 'Нанять' : 'Недостаточно ресурсов'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

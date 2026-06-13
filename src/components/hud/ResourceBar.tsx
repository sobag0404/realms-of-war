/**
 * ResourceBar — horizontal resource display at the top of the screen.
 *
 * Shows the active player's resources with per-turn deltas.
 * Displays income per turn, net income (income - upkeep) with color coding,
 * and tooltips with income breakdown by source.
 * Responsive: collapses to essential resources on mobile with expand button.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import type { ResourceId } from '@/engine/core/types';

// ─── Resource Display Config ──────────────────────────────────────────────────

interface ResourceDisplay {
  id: ResourceId;
  icon: string;
  label: string;
  labelRu: string;
}

const RESOURCE_DISPLAYS: ResourceDisplay[] = [
  { id: 'gold', icon: '🪙', label: 'Gold', labelRu: 'Золото' },
  { id: 'food', icon: '🌾', label: 'Food', labelRu: 'Еда' },
  { id: 'wood', icon: '🪵', label: 'Wood', labelRu: 'Дерево' },
  { id: 'stone', icon: '🪨', label: 'Stone', labelRu: 'Камень' },
  { id: 'iron', icon: '⚔️', label: 'Iron', labelRu: 'Железо' },
  { id: 'mana', icon: '🔮', label: 'Mana', labelRu: 'Мана' },
  { id: 'science', icon: '🔬', label: 'Science', labelRu: 'Наука' },
  { id: 'progress', icon: '📜', label: 'Progress', labelRu: 'Производство' },
];

/** Resources shown on mobile by default */
const MOBILE_ESSENTIAL_IDS: ResourceId[] = ['gold', 'food', 'science'];

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourceBar() {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // ── Compute income breakdown by source ────────────────────────────────
  const incomeBreakdown = useMemo(() => {
    if (!gameState || !activePlayerId) return {};

    const player = gameState.players[activePlayerId];
    if (!player) return {};

    const breakdown: Record<ResourceId, { cityNames: string[]; cityYields: Record<string, number> }> = {};

    // Initialize all resource keys
    for (const res of RESOURCE_DISPLAYS) {
      breakdown[res.id] = { cityNames: [], cityYields: {} };
    }

    // Calculate income from each city
    for (const city of Object.values(gameState.cities)) {
      if (city.ownerId !== activePlayerId) continue;

      // Count worked hexes yield + building bonuses
      // We approximate from the city's cached values + building info
      const cityName = city.name;

      // Use the player's incomePerTurn as the aggregate, but we can show
      // per-city contribution by examining each city's production/food output
      // For simplicity, use the cached city values as the primary source
      if (city.foodPerTurn !== 0) {
        const key = 'food';
        if (!breakdown[key]) breakdown[key] = { cityNames: [], cityYields: {} };
        breakdown[key].cityNames.push(cityName);
        breakdown[key].cityYields[cityName] = (breakdown[key].cityYields[cityName] ?? 0) + city.foodPerTurn;
      }
      if (city.productionPerTurn !== 0) {
        const key = 'progress';
        if (!breakdown[key]) breakdown[key] = { cityNames: [], cityYields: {} };
        breakdown[key].cityNames.push(cityName);
        breakdown[key].cityYields[cityName] = (breakdown[key].cityYields[cityName] ?? 0) + city.productionPerTurn;
      }
    }

    return breakdown;
  }, [gameState, activePlayerId]);

  if (!gameState) return null;

  const player = gameState.players[activePlayerId];
  if (!player) return null;

  const resources = player.resources;
  const income = player.incomePerTurn;
  const upkeep = player.upkeepPerTurn;

  // On mobile, show only essentials unless expanded; on desktop, show all
  const visibleResources = isMobile
    ? (expanded
        ? RESOURCE_DISPLAYS
        : RESOURCE_DISPLAYS.filter((r) => MOBILE_ESSENTIAL_IDS.includes(r.id)))
    : RESOURCE_DISPLAYS;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-auto">
      <div className="flex items-center gap-1 sm:gap-3 px-2 sm:px-4 py-1.5 bg-black/60 backdrop-blur-sm">
        {/* Resource items */}
        {visibleResources.map((res) => {
          const amount = resources[res.id] ?? 0;
          const incomeValue = income[res.id] ?? 0;
          const upkeepValue = upkeep[res.id] ?? 0;
          const netIncome = incomeValue - upkeepValue;

          // Build tooltip content
          const bd = incomeBreakdown[res.id];
          const hasCityBreakdown = bd && bd.cityNames.length > 0;
          const tooltipLines: string[] = [];

          tooltipLines.push(`${res.labelRu}`);

          if (incomeValue > 0) {
            tooltipLines.push(`Доход: +${incomeValue}`);
          }
          if (upkeepValue > 0) {
            tooltipLines.push(`Содержание: -${upkeepValue}`);
          }
          if (netIncome !== 0) {
            tooltipLines.push(
              `Чистый: ${netIncome > 0 ? '+' : ''}${netIncome}/ход`
            );
          }

          // Show city-by-city breakdown if available
          if (hasCityBreakdown) {
            tooltipLines.push('─'.repeat(12));
            for (const cityName of bd.cityNames) {
              const val = bd.cityYields[cityName] ?? 0;
              if (val !== 0) {
                tooltipLines.push(`${cityName}: ${val > 0 ? '+' : ''}${val}`);
              }
            }
          }

          return (
            <Tooltip key={res.id}>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-default"
                  aria-label={`${res.labelRu}: ${amount}, ${netIncome >= 0 ? '+' : ''}${netIncome} за ход`}
                >
                  <span className="text-sm sm:text-base" role="img" aria-hidden="true">
                    {res.icon}
                  </span>
                  <span className="text-white text-xs sm:text-sm font-medium tabular-nums">
                    {amount}
                  </span>
                  {netIncome !== 0 && (
                    <span
                      className={`text-[10px] sm:text-xs tabular-nums font-medium ${
                        netIncome > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {netIncome > 0 ? '+' : ''}
                      {netIncome}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-zinc-900 text-zinc-200 border-zinc-700 text-[11px] max-w-[200px]"
              >
                {tooltipLines.map((line, i) => (
                  <div key={i} className={
                    line === '─'.repeat(12)
                      ? 'text-zinc-600 my-0.5'
                      : line.startsWith('Чистый')
                      ? netIncome >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'
                      : line.startsWith('Доход')
                      ? 'text-emerald-400/80'
                      : line.startsWith('Содержание')
                      ? 'text-red-400/80'
                      : ''
                  }>
                    {line === '─'.repeat(12) ? (
                      <div className="border-t border-zinc-700 my-0.5" />
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Expand/collapse button (mobile only) */}
        <button
          onClick={toggleExpanded}
          className="ml-auto flex items-center justify-center w-8 h-8 sm:hidden rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          aria-label={expanded ? 'Свернуть ресурсы' : 'Развернуть ресурсы'}
          aria-expanded={expanded}
        >
          <span className="text-sm">{expanded ? '◀' : '▶'}</span>
        </button>
      </div>
    </div>
  );
}

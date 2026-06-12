/**
 * ResourceBar — horizontal resource display at the top of the screen.
 *
 * Shows the active player's resources with per-turn deltas.
 * Responsive: collapses to essential resources on mobile with expand button.
 */

'use client';

import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ResourceId } from '@/engine/core/types';

// ─── Resource Display Config ──────────────────────────────────────────────────

interface ResourceDisplay {
  id: ResourceId;
  icon: string;
  label: string;
}

const RESOURCE_DISPLAYS: ResourceDisplay[] = [
  { id: 'gold', icon: '💰', label: 'Gold' },
  { id: 'food', icon: '🌾', label: 'Food' },
  { id: 'wood', icon: '🪵', label: 'Wood' },
  { id: 'stone', icon: '🪨', label: 'Stone' },
  { id: 'iron', icon: '⚔️', label: 'Iron' },
  { id: 'mana', icon: '✨', label: 'Mana' },
  { id: 'science', icon: '🔬', label: 'Science' },
  { id: 'progress', icon: '🔨', label: 'Progress' },
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
          const delta = incomeValue - upkeepValue;

          return (
            <div
              key={res.id}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
              aria-label={`${res.label}: ${amount}, ${delta >= 0 ? '+' : ''}${delta} per turn`}
            >
              <span className="text-sm sm:text-base" role="img" aria-hidden="true">
                {res.icon}
              </span>
              <span className="text-white text-xs sm:text-sm font-medium tabular-nums">
                {amount}
              </span>
              {delta !== 0 && (
                <span
                  className={`text-[10px] sm:text-xs tabular-nums ${
                    delta > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
              )}
            </div>
          );
        })}

        {/* Expand/collapse button (mobile only) */}
        <button
          onClick={toggleExpanded}
          className="ml-auto flex items-center justify-center w-8 h-8 sm:hidden rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          aria-label={expanded ? 'Collapse resources' : 'Expand resources'}
          aria-expanded={expanded}
        >
          <span className="text-sm">{expanded ? '◀' : '▶'}</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/store/useGameStore';
import {
  TECHNOLOGIES,
  getTechsByEra,
  getAvailableTechs,
} from '@/data/technologies';
import type { TechBranch, TechId } from '@/engine/core/types';
import type { Technology } from '@/data/technologies';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const ERA_COLORS: Record<string, string> = {
  primitives: '#a08060',
  earlyCiv: '#d4a44c',
  medieval: '#2ecc71',
  renaissance: '#e74c3c',
  rift: '#9b59b6',
};

const BRANCH_COLORS: Record<TechBranch, string> = {
  military: '#e74c3c',
  economic: '#f39c12',
  science: '#42a5f5',
  mystical: '#9b59b6',
};

const BRANCH_LABELS: Record<TechBranch | 'all', string> = {
  all: 'Все',
  military: 'Военные',
  economic: 'Экономика',
  science: 'Наука',
  mystical: 'Мистика',
};

type TechStatus = 'researched' | 'inProgress' | 'available' | 'locked';

const STATUS_ICONS: Record<TechStatus, string> = {
  researched: '✅',
  inProgress: '🔬',
  available: '🔓',
  locked: '🔒',
};

const STATUS_LABELS: Record<TechStatus, string> = {
  researched: 'Изучено',
  inProgress: 'В процессе',
  available: 'Доступно',
  locked: 'Заблокировано',
};

/**
 * TechTreeScreen — side panel showing the technology tree.
 *
 * Displays technologies grouped by era with branch filtering,
 * progress indicators, and click-to-research functionality.
 */
export function TechTreeScreen() {
  const openPanel = useGameStore((s) => s.openPanel);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const techTreeFilter = useGameStore((s) => s.techTreeFilter);
  const setTechTreeFilter = useGameStore((s) => s.setTechTreeFilter);
  const gameState = useGameStore((s) => s.gameState);
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

  // ── Derived data ───────────────────────────────────────────────────────
  const player = gameState?.players[activePlayerId];
  const playerTechs = useMemo(() => new Set<TechId>(player?.techs ?? []), [player?.techs]);
  const currentResearch = player?.currentResearch ?? null;
  const researchProgress = player?.researchProgress ?? 0;
  const sciencePerTurn = player?.sciencePerTurn ?? 0;

  const availableTechs = useMemo(
    () => getAvailableTechs(playerTechs),
    [playerTechs],
  );

  const getTechStatus = useCallback(
    (tech: Technology): TechStatus => {
      if (playerTechs.has(tech.id)) return 'researched';
      if (currentResearch === tech.id) return 'inProgress';
      if (availableTechs.some((t) => t.id === tech.id)) return 'available';
      return 'locked';
    },
    [playerTechs, currentResearch, availableTechs],
  );

  // Compute research cost for display
  const getTechCost = useCallback((tech: Technology): number => {
    return Math.round(25 * tech.costMultiplier);
  }, []);

  // ── Research handler ───────────────────────────────────────────────────
  const handleStartResearch = useCallback(
    (techId: TechId) => {
      if (!activePlayerId || !gameState) return;
      dispatchCommand({
        type: 'ResearchTechnology',
        playerId: activePlayerId,
        techId,
      });
    },
    [activePlayerId, gameState, dispatchCommand],
  );

  // ── Group techs by era ─────────────────────────────────────────────────
  const techsByEra = useMemo(() => {
    const groups: { era: string; techs: Technology[] }[] = [];
    for (const era of ERA_ORDER) {
      let eraTechs = getTechsByEra(era);
      // Apply branch filter
      if (techTreeFilter !== 'all') {
        eraTechs = eraTechs.filter((t) => t.branch === techTreeFilter);
      }
      if (eraTechs.length > 0) {
        groups.push({ era, techs: eraTechs });
      }
    }
    return groups;
  }, [techTreeFilter]);

  if (openPanel !== 'techTree') return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[500px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-amber-400">
          Дерево технологий
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={() => setOpenPanel('none')}
        >
          ✕
        </Button>
      </div>

      {/* Current research banner */}
      {currentResearch && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-900/20 border border-amber-800/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-amber-400 text-sm font-medium">
              🔬 Текущее исследование
            </span>
            <span className="text-zinc-400 text-xs">
              {sciencePerTurn} науки/ход
            </span>
          </div>
          <div className="text-white text-sm mb-2">
            {TECHNOLOGIES[currentResearch as TechId]?.nameRu ?? currentResearch}
          </div>
          <Progress
            value={
              getTechCost(TECHNOLOGIES[currentResearch as TechId]) > 0
                ? (researchProgress /
                    getTechCost(TECHNOLOGIES[currentResearch as TechId])) *
                  100
                : 0
            }
            className="h-2"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-zinc-500 text-xs">
              {researchProgress}/{getTechCost(TECHNOLOGIES[currentResearch as TechId])}
            </span>
            <span className="text-zinc-500 text-xs">
              ~{Math.ceil((getTechCost(TECHNOLOGIES[currentResearch as TechId]) - researchProgress) / Math.max(1, sciencePerTurn))} ходов
            </span>
          </div>
        </div>
      )}

      {/* Branch filter tabs */}
      <div className="px-4 mt-3">
        <Tabs
          value={techTreeFilter}
          onValueChange={(v) => setTechTreeFilter(v as TechBranch | 'all')}
        >
          <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
            {(['all', 'military', 'economic', 'science', 'mystical'] as const).map(
              (branch) => (
                <TabsTrigger
                  key={branch}
                  value={branch}
                  className="data-[state=active]:bg-amber-700 data-[state=active]:text-white text-zinc-400 text-xs flex-1"
                >
                  {BRANCH_LABELS[branch]}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Tech list by era */}
      <ScrollArea className="flex-1 mt-3">
        <div className="px-4 pb-4 space-y-5">
          {techsByEra.map(({ era, techs }) => (
            <div key={era}>
              {/* Era header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ERA_COLORS[era] }}
                />
                <h3
                  className="text-sm font-semibold"
                  style={{ color: ERA_COLORS[era] }}
                >
                  {ERA_LABELS[era]}
                </h3>
              </div>

              {/* Tech cards */}
              <div className="space-y-2">
                {techs.map((tech) => {
                  const status = getTechStatus(tech);
                  const isAvailable = status === 'available';
                  const isInProgress = status === 'inProgress';

                  return (
                    <Card
                      key={tech.id}
                      className={`bg-zinc-900/50 border transition-colors cursor-pointer ${
                        isAvailable
                          ? 'border-amber-800/40 hover:border-amber-600/60'
                          : isInProgress
                            ? 'border-amber-700/60'
                            : 'border-zinc-800'
                      } ${status === 'researched' ? 'opacity-60' : ''}`}
                      onClick={() => isAvailable && handleStartResearch(tech.id)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {STATUS_ICONS[status]}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                status === 'researched'
                                  ? 'text-zinc-400 line-through'
                                  : 'text-white'
                              }`}
                            >
                              {tech.nameRu}
                            </span>
                          </div>
                          <Badge
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: `${BRANCH_COLORS[tech.branch]}33`,
                              color: BRANCH_COLORS[tech.branch],
                              borderColor: `${BRANCH_COLORS[tech.branch]}66`,
                            }}
                            variant="outline"
                          >
                            {BRANCH_LABELS[tech.branch]}
                          </Badge>
                        </div>

                        {/* Prerequisites */}
                        {tech.prerequisites.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-zinc-500 text-xs">
                              Требует:
                            </span>
                            {tech.prerequisites.map((preId) => (
                              <Badge
                                key={preId}
                                className={`text-[10px] px-1.5 py-0 ${
                                  playerTechs.has(preId)
                                    ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50'
                                    : 'bg-red-900/30 text-red-400 border-red-800/50'
                                }`}
                                variant="outline"
                              >
                                {TECHNOLOGIES[preId]?.nameRu ?? preId}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Effects */}
                        <div className="text-zinc-500 text-xs space-y-0.5">
                          {tech.effects.map((effect, i) => (
                            <div key={i}>• {effect.description}</div>
                          ))}
                        </div>

                        {/* Progress bar for in-progress tech */}
                        {isInProgress && (
                          <div className="space-y-1">
                            <Progress
                              value={
                                getTechCost(tech) > 0
                                  ? (researchProgress / getTechCost(tech)) * 100
                                  : 0
                              }
                              className="h-1.5"
                            />
                            <div className="text-zinc-500 text-[10px]">
                              {STATUS_LABELS[status]} • {researchProgress}/
                              {getTechCost(tech)}
                            </div>
                          </div>
                        )}

                        {/* Status label for non-progress techs */}
                        {!isInProgress && (
                          <div className="text-zinc-600 text-[10px]">
                            {STATUS_LABELS[status]}
                            {status !== 'researched' &&
                              ` • Стоимость: ${getTechCost(tech)}`}
                          </div>
                        )}

                        {/* Click hint */}
                        {isAvailable && (
                          <div className="text-amber-500/70 text-[10px]">
                            Нажмите для исследования
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Separator className="bg-zinc-800 mt-3" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

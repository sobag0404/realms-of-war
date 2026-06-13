'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/store/useGameStore';
import { RESOURCES } from '@/data/resources';
import type { ResourceId } from '@/engine/core/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESOURCE_LABELS: Record<string, string> = {
  gold: '🪙 Золото',
  food: '🍞 Еда',
  wood: '🪵 Дерево',
  stone: '🪨 Камень',
  iron: '⚒️ Железо',
  mana: '🔮 Мана',
  progress: '⚙️ Прогресс',
  science: '📚 Наука',
};

/**
 * EndTurnSummaryScreen — modal overlay showing a summary of the turn.
 *
 * Displays resources gained/lost, research progress, city growth,
 * and unit production. Simplified for now.
 */
export function EndTurnSummaryScreen() {
  const modal = useGameStore((s) => s.modal);
  const closeModal = useGameStore((s) => s.closeModal);
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);

  // ── Derived data ───────────────────────────────────────────────────────
  const player = gameState?.players[activePlayerId];

  const incomeSummary = useMemo(() => {
    if (!player) return [];
    const lines: { label: string; value: number; color: string }[] = [];
    const income = player.incomePerTurn;
    const upkeep = player.upkeepPerTurn;

    const allResourceIds = new Set<ResourceId>([
      ...Object.keys(income) as ResourceId[],
      ...Object.keys(upkeep) as ResourceId[],
    ]);

    for (const resId of allResourceIds) {
      const inc = income[resId] ?? 0;
      const up = upkeep[resId] ?? 0;
      const net = inc - up;
      if (net === 0 && inc === 0) continue;
      lines.push({
        label: RESOURCE_LABELS[resId] ?? resId,
        value: net,
        color: net > 0 ? 'text-green-400' : net < 0 ? 'text-red-400' : 'text-zinc-400',
      });
    }
    return lines;
  }, [player]);

  const researchSummary = useMemo(() => {
    if (!player || !player.currentResearch) return null;
    return {
      techId: player.currentResearch,
      progress: player.researchProgress,
      sciencePerTurn: player.sciencePerTurn,
    };
  }, [player]);

  if (modal?.type !== 'endTurnSummary') return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-[500px] mx-4 bg-zinc-900/95 border-amber-900/30 shadow-2xl">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-amber-400">
              Итоги хода {gameState?.turn ?? '?'}
            </h2>
            <p className="text-zinc-500 text-xs mt-1">
              {player?.name ?? 'Игрок'}
            </p>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Resources */}
          <section>
            <h3 className="text-zinc-300 text-sm font-semibold mb-2">
              💰 Ресурсы
            </h3>
            {incomeSummary.length === 0 ? (
              <div className="text-zinc-600 text-xs">Нет изменений</div>
            ) : (
              <div className="space-y-1">
                {incomeSummary.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-400">{item.label}</span>
                    <span className={item.color}>
                      {item.value > 0 ? '+' : ''}
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Research */}
          {researchSummary && (
            <>
              <Separator className="bg-zinc-800" />
              <section>
                <h3 className="text-zinc-300 text-sm font-semibold mb-2">
                  🔬 Исследование
                </h3>
                <div className="text-sm">
                  <span className="text-zinc-400">Технология: </span>
                  <span className="text-white">{researchSummary.techId}</span>
                </div>
                <div className="text-sm">
                  <span className="text-zinc-400">Наука/ход: </span>
                  <span className="text-cyan-400">
                    {researchSummary.sciencePerTurn}
                  </span>
                </div>
              </section>
            </>
          )}

          {/* Cities summary */}
          {gameState && (
            <>
              <Separator className="bg-zinc-800" />
              <section>
                <h3 className="text-zinc-300 text-sm font-semibold mb-2">
                  🏛️ Города
                </h3>
                {Object.values(gameState.cities).filter(
                  (c) => c.ownerId === activePlayerId,
                ).length === 0 ? (
                  <div className="text-zinc-600 text-xs">Нет городов</div>
                ) : (
                  <div className="space-y-1">
                    {Object.values(gameState.cities)
                      .filter((c) => c.ownerId === activePlayerId)
                      .map((city) => (
                        <div
                          key={city.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-zinc-400">{city.name}</span>
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-400">
                              👥 {city.population}
                            </span>
                            {city.productionQueue.length > 0 && (
                              <span className="text-amber-400">
                                ⚒️ {city.productionQueue[0].id}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Units count */}
          {gameState && (
            <>
              <Separator className="bg-zinc-800" />
              <section>
                <h3 className="text-zinc-300 text-sm font-semibold mb-2">
                  ⚔️ Юниты
                </h3>
                <div className="text-sm text-zinc-400">
                  Всего:{' '}
                  <span className="text-white">
                    {
                      Object.values(gameState.entities).filter(
                        (e) => e.ownerId === activePlayerId,
                      ).length
                    }
                  </span>
                </div>
              </section>
            </>
          )}

          <Separator className="bg-zinc-800" />

          {/* Continue button */}
          <Button
            className="w-full bg-amber-700 hover:bg-amber-600 text-white"
            onClick={closeModal}
          >
            Продолжить
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

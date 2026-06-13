'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useGameStore } from '@/store/useGameStore';
import type { DiplomacyStatus, PlayerId } from '@/engine/core/types';

// ─── Diplomacy labels ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DiplomacyStatus, string> = {
  neutral: 'Нейтралитет',
  war: 'Война',
  peace: 'Мир',
  alliance: 'Союз',
  vassal: 'Вассал',
  overlord: 'Сюзерен',
};

const STATUS_COLORS: Record<DiplomacyStatus, string> = {
  neutral: '#a0a0a0',
  war: '#e74c3c',
  peace: '#2ecc71',
  alliance: '#3498db',
  vassal: '#f39c12',
  overlord: '#9b59b6',
};

const ERA_LABELS: Record<string, string> = {
  primitives: 'Примитивы',
  earlyCiv: 'Ранняя цивилизация',
  medieval: 'Средневековье',
  renaissance: 'Ренессанс',
  rift: 'Разломы',
};

/**
 * DiplomacyScreen — side panel showing diplomacy overview with other players.
 *
 * Lists all other players with their diplomacy status, score, and era.
 * Diplomacy action buttons are now functional.
 */
export function DiplomacyScreen() {
  const openPanel = useGameStore((s) => s.openPanel);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const dispatchCommand = useGameStore((s) => s.dispatchCommand);
  const addNotification = useGameStore((s) => s.addNotification);

  // ── Escape key handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpenPanel]);

  // ── Get other players ──────────────────────────────────────────────────
  const otherPlayers = useMemo(() => {
    if (!gameState) return [];
    return Object.values(gameState.players).filter(
      (p) => p.id !== activePlayerId,
    );
  }, [gameState, activePlayerId]);

  // ── Get diplomacy status ───────────────────────────────────────────────
  const getDiplomacyStatus = useCallback(
    (playerId: PlayerId): DiplomacyStatus => {
      if (!gameState) return 'war';
      const key = [activePlayerId, playerId].sort().join(':');
      const entry = gameState.diplomacy[key];
      return entry?.status ?? 'war';
    },
    [gameState, activePlayerId],
  );

  // ── Diplomacy actions ──────────────────────────────────────────────────
  const handleChangeDiplomacy = useCallback(
    (targetPlayerId: PlayerId, newStatus: DiplomacyStatus) => {
      dispatchCommand({
        type: 'ChangeDiplomacy',
        playerId: activePlayerId,
        targetPlayerId,
        newStatus,
      });

      const targetName = gameState?.players[targetPlayerId]?.name ?? targetPlayerId;
      const statusLabel = STATUS_LABELS[newStatus];

      addNotification({
        type: newStatus === 'war' ? 'warning' : 'success',
        title: 'Дипломатия',
        message: `Отношения с ${targetName}: ${statusLabel}`,
        duration: 4000,
      });
    },
    [dispatchCommand, activePlayerId, gameState, addNotification],
  );

  if (openPanel !== 'diplomacy' || !gameState) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-black/85 backdrop-blur-md border-l border-amber-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-amber-400">Дипломатия</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={() => setOpenPanel('none')}
        >
          ✕
        </Button>
      </div>

      {/* Player list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {otherPlayers.length === 0 ? (
            <div className="text-zinc-600 text-sm py-8 text-center">
              Нет других игроков
            </div>
          ) : (
            otherPlayers.map((player) => {
              const status = getDiplomacyStatus(player.id);

              return (
                <Card
                  key={player.id}
                  className="bg-zinc-900/50 border-zinc-800"
                >
                  <CardContent className="p-3 space-y-3">
                    {/* Player header */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-white text-sm font-medium flex-1">
                        {player.name}
                      </span>
                      {player.isAI && (
                        <Badge
                          className="text-[9px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700"
                          variant="outline"
                        >
                          ИИ
                        </Badge>
                      )}
                      {!player.isAlive && (
                        <Badge
                          className="text-[9px] px-1.5 py-0 bg-red-900/40 text-red-400 border-red-800/50"
                          variant="outline"
                        >
                          Побеждён
                        </Badge>
                      )}
                    </div>

                    {/* Diplomacy status */}
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">Статус:</span>
                      <Badge
                        className="text-[10px] px-2 py-0.5"
                        style={{
                          backgroundColor: `${STATUS_COLORS[status]}22`,
                          color: STATUS_COLORS[status],
                          borderColor: `${STATUS_COLORS[status]}44`,
                        }}
                        variant="outline"
                      >
                        {STATUS_LABELS[status]}
                      </Badge>
                    </div>

                    {/* Player stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500">Очки: </span>
                        <span className="text-white">{player.score}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Эра: </span>
                        <span className="text-white">
                          {ERA_LABELS[player.era] ?? player.era}
                        </span>
                      </div>
                    </div>

                    <Separator className="bg-zinc-800" />

                    {/* Diplomacy actions */}
                    <div className="flex gap-2">
                      {status === 'war' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[10px] border-green-800/50 text-green-400 hover:bg-green-900/20"
                          onClick={() => handleChangeDiplomacy(player.id, 'peace')}
                        >
                          Предложить мир
                        </Button>
                      ) : status === 'peace' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-[10px] border-red-800/50 text-red-400 hover:bg-red-900/20"
                            onClick={() => handleChangeDiplomacy(player.id, 'war')}
                          >
                            Объявить войну
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-[10px] border-blue-800/50 text-blue-400 hover:bg-blue-900/20"
                            onClick={() => handleChangeDiplomacy(player.id, 'alliance')}
                          >
                            Предложить союз
                          </Button>
                        </>
                      ) : status === 'alliance' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[10px] border-red-800/50 text-red-400 hover:bg-red-900/20"
                          onClick={() => handleChangeDiplomacy(player.id, 'war')}
                        >
                          Разорвать союз
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[10px] border-red-800/50 text-red-400 hover:bg-red-900/20"
                          onClick={() => handleChangeDiplomacy(player.id, 'war')}
                        >
                          Объявить войну
                        </Button>
                      )}
                    </div>
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

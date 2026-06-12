/**
 * TurnPanel — turn info and end turn button at top-right corner.
 *
 * Shows current turn, active player, phase, and provides the
 * END TURN button plus settings/menu access.
 */

'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Menu, RotateCw, FlaskConical, Swords } from 'lucide-react';

// ─── Phase Labels ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  start: 'Начало',
  income: 'Доход',
  research: 'Исследование',
  cityProduction: 'Производство',
  unitReady: 'Юниты готовы',
  playerActions: 'Ваш ход',
  aiActions: 'Ход ИИ',
  end: 'Конец хода',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TurnPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const isProcessingCommand = useGameStore((s) => s.isProcessingCommand);
  const localPlayerIds = useGameStore((s) => s.localPlayerIds);
  const endTurn = useGameStore((s) => s.endTurn);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleEndTurn = useCallback(() => {
    endTurn();
  }, [endTurn]);

  const handleSettings = useCallback(() => {
    setOpenPanel('settings');
  }, [setOpenPanel]);

  const handleMenu = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleTechTree = useCallback(() => {
    setOpenPanel('techTree');
  }, [setOpenPanel]);

  const handleDiplomacy = useCallback(() => {
    setOpenPanel('diplomacy');
  }, [setOpenPanel]);

  if (!gameState) return null;

  const player = gameState.players[activePlayerId];
  const isLocalPlayer = localPlayerIds.includes(activePlayerId);
  const canEndTurn = isLocalPlayer && !isProcessingCommand;
  const phaseLabel = PHASE_LABELS[gameState.phase] ?? gameState.phase;

  return (
    <div className="absolute top-1 right-2 sm:top-2 sm:right-4 z-20 pointer-events-auto">
      <div className="flex flex-col items-end gap-1.5">
        {/* Turn number & phase */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            {player && (
              <span
                className="w-2.5 h-2.5 rounded-full inline-block border border-white/30"
                style={{ backgroundColor: player.color }}
                aria-hidden="true"
              />
            )}
            <span className="text-white text-xs sm:text-sm font-semibold">
              {player?.name ?? 'Unknown'}
            </span>
          </div>
          <span className="text-white/40 text-xs">|</span>
          <span className="text-white/70 text-xs tabular-nums">
            Turn {gameState.turn}
          </span>
          <span className="text-white/40 text-xs">|</span>
          <span className="text-amber-300/80 text-xs">
            {phaseLabel}
          </span>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-1.5">
          {/* Menu button — back to main menu */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={handleMenu}
            aria-label="Back to menu"
            title="Вернуться в меню"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Tech tree button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-amber-400 hover:bg-amber-900/20 transition-colors"
            onClick={handleTechTree}
            aria-label="Technology tree"
            title="Дерево технологий"
          >
            <FlaskConical className="h-4 w-4" />
          </Button>

          {/* Diplomacy button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors"
            onClick={handleDiplomacy}
            aria-label="Diplomacy"
            title="Дипломатия"
          >
            <Swords className="h-4 w-4" />
          </Button>

          {/* Settings button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={handleSettings}
            aria-label="Settings"
            title="Настройки"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* End Turn button */}
          <Button
            onClick={handleEndTurn}
            disabled={!canEndTurn}
            className={`h-8 sm:h-9 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 ${
              canEndTurn
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
            aria-label="End turn"
          >
            {isProcessingCommand ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCw className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">КОНЕЦ ХОДА</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

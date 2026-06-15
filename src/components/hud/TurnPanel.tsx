/**
 * TurnPanel — turn info and end turn button at top-right corner.
 *
 * Shows current turn, active player, phase, and provides the
 * END TURN button plus settings/menu access.
 */

'use client';

import { useCallback, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Menu, RotateCw, FlaskConical, Swords, Save } from 'lucide-react';

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
  const saveGame = useGameStore((s) => s.saveGame);
  const addNotification = useGameStore((s) => s.addNotification);
  const setOpenPanel = useGameStore((s) => s.setOpenPanel);
  const resetGame = useGameStore((s) => s.resetGame);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

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
    setIsMobileActionsOpen(false);
  }, [setOpenPanel]);

  const handleDiplomacy = useCallback(() => {
    setOpenPanel('diplomacy');
    setIsMobileActionsOpen(false);
  }, [setOpenPanel]);

  const handleSave = useCallback(async () => {
    const result = await saveGame();
    setIsMobileActionsOpen(false);
    addNotification({
      type: result.success ? 'success' : 'error',
      title: result.success ? 'Saved' : 'Save failed',
      message: result.success ? 'Game saved' : (result.error ?? 'Failed to save game'),
      duration: 3000,
    });
  }, [saveGame, addNotification]);

  if (!gameState) return null;

  const player = gameState.players[activePlayerId];
  const isLocalPlayer = localPlayerIds.includes(activePlayerId);
  const canEndTurn = isLocalPlayer && !isProcessingCommand;
  const phaseLabel = PHASE_LABELS[gameState.phase] ?? gameState.phase;

  return (
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 pointer-events-auto max-w-[calc(100vw-1rem)]">
      <div className="flex flex-col items-end gap-2">
        {/* Turn number & phase */}
        <div className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1 rounded-lg border border-amber-200/15 bg-slate-950/65 px-3 py-1.5 shadow-2xl shadow-black/25 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            {player && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-white/40 shadow-sm shadow-black"
                style={{ backgroundColor: player.color }}
                aria-hidden="true"
              />
            )}
            <span className="text-xs font-semibold text-stone-50 sm:text-sm">
              {player?.name ?? 'Unknown'}
            </span>
          </div>
          <span className="text-white/40 text-xs">|</span>
          <span className="text-xs tabular-nums text-white/70">
            Turn {gameState.turn}
          </span>
          <span className="text-white/40 text-xs">|</span>
          <span className="text-xs font-medium text-amber-300/90">
            {phaseLabel}
          </span>
        </div>

        {/* Action buttons row */}
        <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
          {/* Menu button — back to main menu */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-white/10 bg-slate-950/60 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white sm:h-9 sm:w-9"
            onClick={handleMenu}
            aria-label="Back to menu"
            data-testid="turn-back-to-menu"
            title="Вернуться в меню"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Tech tree button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 rounded-lg border border-white/10 bg-slate-950/60 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-amber-900/25 hover:text-amber-300 sm:inline-flex sm:h-9 sm:w-9"
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
            className="hidden h-8 w-8 rounded-lg border border-white/10 bg-slate-950/60 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-emerald-900/25 hover:text-emerald-300 sm:inline-flex sm:h-9 sm:w-9"
            onClick={handleDiplomacy}
            aria-label="Diplomacy"
            title="Дипломатия"
          >
            <Swords className="h-4 w-4" />
          </Button>

          {/* Save button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 rounded-lg border border-white/10 bg-slate-950/60 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-amber-900/25 hover:text-amber-300 sm:inline-flex sm:h-9 sm:w-9"
            onClick={handleSave}
            aria-label="Save game"
            data-testid="turn-save-game"
            title="Сохранить"
          >
            <Save className="h-4 w-4" />
          </Button>

          {/* Settings button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-white/10 bg-slate-950/60 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white sm:h-9 sm:w-9"
            onClick={handleSettings}
            aria-label="Settings"
            title="Настройки"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg border border-white/10 bg-slate-950/60 text-white/70 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white sm:hidden"
            onClick={() => setIsMobileActionsOpen((open) => !open)}
            aria-label="More actions"
            aria-expanded={isMobileActionsOpen}
            aria-controls="mobile-turn-actions"
            title="Дополнительно"
          >
            <Swords className="h-4 w-4" />
          </Button>

          {/* End Turn button */}
          <Button
            onClick={handleEndTurn}
            disabled={!canEndTurn}
            className={`h-8 min-w-[4.5rem] px-2 sm:h-9 sm:px-4 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 ${
              canEndTurn
                ? 'border border-amber-200/30 bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/35'
                : 'border border-white/10 bg-white/10 text-white/30 cursor-not-allowed'
            }`}
            aria-label="End turn"
          >
            {isProcessingCommand ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCw className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="ml-1 sm:hidden">ХОД</span>
                <span className="hidden sm:inline">КОНЕЦ ХОДА</span>
              </>
            )}
          </Button>
        </div>

        {isMobileActionsOpen && (
          <div
            id="mobile-turn-actions"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/75 p-1.5 shadow-xl shadow-black/25 backdrop-blur-md sm:hidden"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md text-white/75 hover:bg-amber-900/25 hover:text-amber-300"
              onClick={handleTechTree}
              aria-label="Technology tree"
            >
              <FlaskConical className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md text-white/75 hover:bg-emerald-900/25 hover:text-emerald-300"
              onClick={handleDiplomacy}
              aria-label="Diplomacy"
            >
              <Swords className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md text-white/75 hover:bg-amber-900/25 hover:text-amber-300"
              onClick={handleSave}
              aria-label="Save game"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { GameCanvas } from '@/components/game3d/GameCanvas';
import { GameHud } from '@/components/hud/GameHud';
import {
  MainMenuScreen,
  NewGameScreen,
  SettingsScreen,
  TechTreeScreen,
  CityManagementScreen,
  RecruitmentScreen,
  DiplomacyScreen,
  EndTurnSummaryScreen,
} from '@/components/screens';
import { useGameStore } from '@/store/useGameStore';

export default function Home() {
  const mode = useGameStore((s) => s.mode);
  const gameState = useGameStore((s) => s.gameState);
  const openPanel = useGameStore((s) => s.openPanel);
  const modal = useGameStore((s) => s.modal);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Canvas — always rendered as background */}
      <GameCanvas className="w-full h-full" />

      {/* Loading overlay when generating world */}
      {mode !== 'menu' && !gameState && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="text-amber-400 text-2xl font-bold tracking-widest animate-pulse">
              REALMS OF WAR
            </div>
            <div className="text-white/70 text-sm animate-pulse">
              Генерация мира...
            </div>
          </div>
        </div>
      )}

      {/* ── Main menu screen (when in menu mode) ─────────────────────────── */}
      {mode === 'menu' && <MainMenuScreen />}

      {/* ── Game HUD overlay (when in game) ──────────────────────────────── */}
      {mode !== 'menu' && gameState && <GameHud />}

      {/* ── Side panel overlays ──────────────────────────────────────────── */}
      {openPanel === 'newGame' && <NewGameScreen />}
      {openPanel === 'settings' && <SettingsScreen />}
      {openPanel === 'techTree' && <TechTreeScreen />}
      {openPanel === 'city' && <CityManagementScreen />}
      {openPanel === 'recruitment' && <RecruitmentScreen />}
      {openPanel === 'diplomacy' && <DiplomacyScreen />}

      {/* ── Modal overlays ───────────────────────────────────────────────── */}
      {modal?.type === 'endTurnSummary' && <EndTurnSummaryScreen />}
    </div>
  );
}

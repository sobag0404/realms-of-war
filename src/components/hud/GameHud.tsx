/**
 * GameHud — root HUD overlay component.
 *
 * Renders all HUD elements as an overlay on top of the 3D game view.
 * Only renders when gameState is not null.
 * Container is pointer-events-none, children are pointer-events-auto.
 */

'use client';

import { useGameStore } from '@/store/useGameStore';
import { ResourceBar } from './ResourceBar';
import { TurnPanel } from './TurnPanel';
import { SelectionPanel } from './SelectionPanel';
import { Minimap } from './Minimap';
import { NotificationStack } from './NotificationStack';
import { ControlsHelp } from './ControlsHelp';
import { AdvisorPanel } from './AdvisorPanel';

// ─── Component ────────────────────────────────────────────────────────────────

export function GameHud() {
  const gameState = useGameStore((s) => s.gameState);

  // Don't render HUD if no game is active
  if (!gameState) return null;

  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none"
      aria-label="Game HUD overlay"
    >
      <div className="hud-edge-scrim-top absolute inset-x-0 top-0 h-24" aria-hidden="true" />
      <div className="hud-edge-scrim-bottom absolute inset-x-0 bottom-0 h-48" aria-hidden="true" />

      {/* Top: Resource bar */}
      <ResourceBar />

      {/* Top-right: Turn info + End Turn */}
      <TurnPanel />

      {/* Right side: compact next-step advisor */}
      <AdvisorPanel />

      {/* Bottom-left: Selection panel (unit/city/hex info) */}
      <SelectionPanel />

      {/* Bottom-right, above minimap: Controls help */}
      <ControlsHelp />

      {/* Bottom-right: Minimap */}
      <Minimap />

      {/* Right side, below TurnPanel: Notifications */}
      <NotificationStack />
    </div>
  );
}

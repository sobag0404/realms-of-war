'use client';

import { useEffect } from 'react';
import { GameCanvas } from '@/components/game3d/GameCanvas';
import { GameHud } from '@/components/hud/GameHud';
import { createGraphicsShowcaseSession } from '@/engine/graphics/graphicsShowcaseState';
import { useGameStore } from '@/store/useGameStore';

export default function GraphicsShowcasePage() {
  useEffect(() => {
    const showcase = createGraphicsShowcaseSession();
    useGameStore.setState((state) => ({
      engine: showcase.engine,
      gameState: showcase.gameState,
      snapshotVersion: state.snapshotVersion + 1,
      mode: 'single',
      activePlayerId: showcase.activePlayerId,
      localPlayerIds: showcase.localPlayerIds,
      isProcessingCommand: false,
      lastError: null,
      cameraTarget: showcase.cameraTarget,
      cameraZoom: 30,
      cameraRotation: 42,
      cameraPitch: 58,
      showFog: true,
      showGrid: true,
      showYields: false,
      showThreat: false,
      hoveredHex: null,
      hoveredEntityId: null,
      selectedEntityId: showcase.selectedEntityId,
      selectedHex: showcase.selectedHex,
      selectedCityId: null,
      movementPath: showcase.movementPath,
      reachableHexes: showcase.reachableHexes,
      attackPreviewHexes: showcase.attackPreviewHexes,
      attackTargets: showcase.attackTargets,
      openPanel: 'none',
      modal: null,
      tooltip: null,
    }), false, 'graphicsShowcase/load');
  }, []);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-black"
      data-testid="graphics-showcase-route"
    >
      <GameCanvas className="h-full w-full" />
      <GameHud />
    </main>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { EntityData, GameState } from '@/engine/core/GameState';
import type { HexCoord } from '@/engine/core/types';
import { hexDistance, hexKey } from '@/engine/core/types';
import { findPath } from '@/engine/hex/pathfinding';
import { CombatSystem } from '@/engine/ecs/systems/CombatSystem';
import { calculateMovementCost, canMoveTo, getReachableHexes } from '@/engine/rules/movementRules';
import { TERRAIN_TYPES } from '@/data/terrain';

function sameHex(a: HexCoord | null | undefined, b: HexCoord | null | undefined): boolean {
  return Boolean(a && b && a.q === b.q && a.r === b.r);
}

function getEntityAtHex(state: GameState, hex: HexCoord | null): EntityData | null {
  if (!hex) return null;
  const key = hexKey(hex);
  return Object.values(state.entities).find((entity) => hexKey(entity.hex) === key) ?? null;
}

function isUnitSelectable(state: GameState, entity: EntityData | null): entity is EntityData {
  return Boolean(entity && entity.ownerId === state.activePlayerId);
}

function isWalkableForPath(state: GameState, entity: EntityData, targetHex: HexCoord, hex: HexCoord): boolean {
  const tile = state.map.tiles[hexKey(hex)];
  if (!tile) return false;

  const terrain = TERRAIN_TYPES[tile.terrain];
  if (!terrain) return false;
  if (!terrain.walkable) {
    if (entity.abilities.includes('pathfinding') && tile.terrain === 'forest') return true;
    if (entity.abilities.includes('swift') && tile.terrain === 'swamp') return true;
    return false;
  }

  const occupant = getEntityAtHex(state, hex);
  if (!occupant || occupant.id === entity.id) return true;
  if (occupant.ownerId !== entity.ownerId) return sameHex(hex, targetHex);
  return !sameHex(hex, targetHex);
}

function getPreviewPath(state: GameState, entity: EntityData, targetHex: HexCoord | null): HexCoord[] {
  if (!targetHex || !canMoveTo(state, entity.id, targetHex).canMove) return [];

  return findPath(
    entity.hex,
    targetHex,
    (hex) => isWalkableForPath(state, entity, targetHex, hex),
    (hex) => Math.max(0.5, calculateMovementCost(state, entity.hex, hex, entity.id)),
    entity.movementPoints + 4,
  );
}

function getFirstActiveUnit(state: GameState): EntityData | null {
  return Object.values(state.entities).find((entity) => isUnitSelectable(state, entity)) ?? null;
}

function getDemoAttackPreviewHex(reachableHexes: HexCoord[], selectedHex: HexCoord): HexCoord[] {
  const closest = [...reachableHexes]
    .sort((a, b) => hexDistance(a, selectedHex) - hexDistance(b, selectedHex))
    .find((hex) => !sameHex(hex, selectedHex));
  return closest ? [closest] : [];
}

function useBattlefieldPreviewDemo(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('battlefieldPreviewDemo') === '1' || params.get('combatResolutionDemo') === '1';
  }, []);
}

export function BattlefieldPreviewController() {
  const gameState = useGameStore((s) => s.gameState);
  const selectedEntityId = useGameStore((s) => s.selectedEntityId);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const hoveredHex = useGameStore((s) => s.hoveredHex);
  const selectEntity = useGameStore((s) => s.selectEntity);
  const setMovementPath = useGameStore((s) => s.setMovementPath);
  const setReachableHexes = useGameStore((s) => s.setReachableHexes);
  const setAttackPreviewHexes = useGameStore((s) => s.setAttackPreviewHexes);
  const setAttackTargets = useGameStore((s) => s.setAttackTargets);
  const demoMode = useBattlefieldPreviewDemo();

  const selectedEntity = useMemo(() => {
    if (!gameState) return null;
    if (selectedEntityId) return gameState.entities[selectedEntityId] ?? null;
    return getEntityAtHex(gameState, selectedHex);
  }, [gameState, selectedEntityId, selectedHex]);

  useEffect(() => {
    if (!gameState || !demoMode || selectedEntityId) return;

    const firstUnit = getFirstActiveUnit(gameState);
    if (firstUnit) selectEntity(firstUnit.id);
  }, [demoMode, gameState, selectEntity, selectedEntityId]);

  useEffect(() => {
    if (!gameState || !isUnitSelectable(gameState, selectedEntity)) {
      setReachableHexes([]);
      setAttackTargets([]);
      setAttackPreviewHexes([]);
      return;
    }

    const reachableHexes = getReachableHexes(gameState, selectedEntity.id);
    const attackTargets = CombatSystem.getAttackTargets(gameState, selectedEntity.id);

    setReachableHexes(reachableHexes);
    setAttackTargets(attackTargets);
    setAttackPreviewHexes(demoMode && attackTargets.length === 0 ? getDemoAttackPreviewHex(reachableHexes, selectedEntity.hex) : []);
  }, [demoMode, gameState, selectedEntity, setAttackPreviewHexes, setAttackTargets, setReachableHexes]);

  useEffect(() => {
    if (!gameState || !isUnitSelectable(gameState, selectedEntity)) {
      setMovementPath([]);
      return;
    }

    if (demoMode && !hoveredHex) {
      const reachableHexes = getReachableHexes(gameState, selectedEntity.id);
      setMovementPath(getPreviewPath(gameState, selectedEntity, reachableHexes[0] ?? null));
      return;
    }

    setMovementPath(getPreviewPath(gameState, selectedEntity, hoveredHex));
  }, [demoMode, gameState, hoveredHex, selectedEntity, setMovementPath]);

  return null;
}

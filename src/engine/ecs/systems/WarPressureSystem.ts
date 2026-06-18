/**
 * Derived war-pressure stance for AI and player-facing turn feedback.
 *
 * The report is calculated from existing serializable state and is never
 * persisted, so older saves keep loading without migration.
 */

import type { GameState } from '../../core/GameState';
import type { GameEventMap } from '../../core/EventBus';
import type { HexCoord, PlayerId } from '../../core/types';
import { hexDistance } from '../../core/types';
import { getDiplomacyStatus } from '../../rules/diplomacyRules';

type WarPressureReport = GameEventMap['WarPressureChanged'];

export class WarPressureSystem {
  static createReport(state: GameState, playerId: PlayerId): WarPressureReport | null {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return null;

    const cities = Object.values(state.cities).filter((city) => city.ownerId === playerId);
    const ownUnits = Object.values(state.entities).filter((unit) => unit.ownerId === playerId);
    const ownMilitary = ownUnits.filter((unit) => unit.typeId !== 'settler' && unit.typeId !== 'worker');
    const warEnemies = Object.values(state.players)
      .filter((other) => other.id !== playerId && other.isAlive)
      .filter((other) => getDiplomacyStatus(state, playerId, other.id) === 'war');
    const enemyUnits = Object.values(state.entities).filter(
      (unit) => warEnemies.some((enemy) => enemy.id === unit.ownerId),
    );
    const enemyMilitary = enemyUnits.filter((unit) => unit.typeId !== 'settler' && unit.typeId !== 'worker');
    const nearest = WarPressureSystem.findNearestDistance(
      [
        ...cities.map((city) => city.hex),
        ...ownUnits.map((unit) => unit.hex),
      ],
      enemyUnits.map((unit) => unit.hex),
    );
    const threatenedCityCount = cities.filter((city) => (
      enemyUnits.some((unit) => hexDistance(unit.hex, city.hex) <= 3)
    )).length;
    const militaryDeficit = Math.max(0, enemyMilitary.length - ownMilitary.length);
    const proximityPressure = nearest === null ? 0 : Math.max(0, 7 - nearest) * 7;
    const pressureScore = Math.min(100, Math.round(
      threatenedCityCount * 24 +
      militaryDeficit * 14 +
      proximityPressure +
      Math.max(0, warEnemies.length - 1) * 6,
    ));
    const stance = pressureScore >= 70
      ? 'crisis'
      : threatenedCityCount > 0 || pressureScore >= 40
        ? 'mobilizing'
        : ownMilitary.length >= enemyMilitary.length + 2 && nearest !== null && nearest <= 5
          ? 'pressing'
          : 'guarded';
    const recommendedFocus = stance === 'crisis'
      ? 'defend'
      : stance === 'mobilizing' || stance === 'pressing'
        ? 'military'
        : 'balanced';
    const primaryThreatPlayerId = WarPressureSystem.findPrimaryThreatPlayer(
      state,
      playerId,
      warEnemies.map((enemy) => enemy.id),
    );

    return {
      playerId,
      turn: state.turn,
      stance,
      recommendedFocus,
      pressureScore,
      nearestEnemyDistance: nearest,
      threatenedCityCount,
      ownMilitaryCount: ownMilitary.length,
      enemyMilitaryCount: enemyMilitary.length,
      primaryThreatPlayerId,
    };
  }

  private static findNearestDistance(own: HexCoord[], enemy: HexCoord[]): number | null {
    if (own.length === 0 || enemy.length === 0) return null;

    let nearest = Infinity;
    for (const ownHex of own) {
      for (const enemyHex of enemy) {
        nearest = Math.min(nearest, hexDistance(ownHex, enemyHex));
      }
    }
    return nearest === Infinity ? null : nearest;
  }

  private static findPrimaryThreatPlayer(
    state: GameState,
    playerId: PlayerId,
    enemyIds: PlayerId[],
  ): PlayerId | null {
    const anchors = [
      ...Object.values(state.cities).filter((city) => city.ownerId === playerId).map((city) => city.hex),
      ...Object.values(state.entities).filter((unit) => unit.ownerId === playerId).map((unit) => unit.hex),
    ];
    if (anchors.length === 0) return enemyIds[0] ?? null;

    let bestEnemy: PlayerId | null = null;
    let bestDistance = Infinity;
    for (const enemyId of enemyIds) {
      const enemyAnchors = [
        ...Object.values(state.cities).filter((city) => city.ownerId === enemyId).map((city) => city.hex),
        ...Object.values(state.entities).filter((unit) => unit.ownerId === enemyId).map((unit) => unit.hex),
      ];
      const distance = WarPressureSystem.findNearestDistance(anchors, enemyAnchors);
      if (distance !== null && distance < bestDistance) {
        bestDistance = distance;
        bestEnemy = enemyId;
      }
    }
    return bestEnemy ?? enemyIds[0] ?? null;
  }
}

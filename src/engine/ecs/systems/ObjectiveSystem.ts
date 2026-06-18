/**
 * Strategic objective feedback for the local-first gameplay loop.
 *
 * This system derives objective progress from existing serializable state and
 * emits no persisted fields, preserving save compatibility.
 */

import type { GameState } from '../../core/GameState';
import type { GameEventMap } from '../../core/EventBus';
import type { HexCoord, PlayerId } from '../../core/types';
import { hexDistance } from '../../core/types';

type ObjectiveReport = GameEventMap['StrategicObjectiveUpdated'];
type ObjectiveItem = ObjectiveReport['objectives'][number];

export class ObjectiveSystem {
  static createObjectiveReport(
    state: GameState,
    playerId: PlayerId,
  ): ObjectiveReport | null {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return null;

    const cities = Object.values(state.cities).filter((city) => city.ownerId === playerId);
    const units = Object.values(state.entities).filter((entity) => entity.ownerId === playerId);
    const militaryUnits = units.filter(
      (unit) => unit.typeId !== 'settler' && unit.typeId !== 'worker',
    );
    const activeProduction = cities.reduce(
      (sum, city) => sum + city.productionQueue.length,
      0,
    );
    const gold = player.resources.gold ?? 0;
    const goldIncome = player.incomePerTurn.gold ?? 0;
    const nearestEnemyDistance = ObjectiveSystem.findNearestEnemyDistance(state, playerId);
    const threatBonus = nearestEnemyDistance === null
      ? 0
      : Math.max(0, 6 - nearestEnemyDistance) * 5;

    const expansionTarget = 2;
    const militaryTarget = Math.max(3, cities.length * 2);
    const economyTarget = 6;

    const objectives: ObjectiveItem[] = [
      {
        id: 'secure_second_city',
        label: 'Secure a second city',
        progress: Math.min(cities.length, expansionTarget),
        target: expansionTarget,
        completed: cities.length >= expansionTarget,
        priority: cities.length < expansionTarget ? 90 : 25,
        reason: `${cities.length}/${expansionTarget} cities held`,
      },
      {
        id: 'field_defense_force',
        label: 'Field a defense force',
        progress: Math.min(militaryUnits.length, militaryTarget),
        target: militaryTarget,
        completed: militaryUnits.length >= militaryTarget,
        priority: Math.max(30, 85 - militaryUnits.length * 12 + threatBonus),
        reason: `${militaryUnits.length}/${militaryTarget} combat units ready`,
      },
      {
        id: 'stabilize_war_economy',
        label: 'Stabilize war economy',
        progress: Math.min(Math.max(0, goldIncome) + activeProduction, economyTarget),
        target: economyTarget,
        completed: Math.max(0, goldIncome) + activeProduction >= economyTarget,
        priority: gold < 30 ? 80 : 50,
        reason: `+${goldIncome} gold income, ${activeProduction} active production queues`,
      },
    ];

    const activeObjective = [...objectives]
      .filter((objective) => !objective.completed)
      .sort((a, b) => b.priority - a.priority)[0] ?? objectives[0];
    const overallProgress = Math.round(
      objectives.reduce((sum, objective) => {
        return sum + Math.min(1, objective.progress / objective.target);
      }, 0) / objectives.length * 100,
    );
    const pressureScore = Math.min(100, Math.round(
      (100 - overallProgress) * 0.45 +
      militaryUnits.length * 6 +
      activeProduction * 5 +
      Math.max(0, goldIncome) * 3 +
      threatBonus,
    ));

    return {
      playerId,
      turn: state.turn,
      activeObjectiveId: activeObjective.id,
      overallProgress,
      pressureScore,
      pressureLevel: pressureScore >= 70 ? 'high' : pressureScore >= 35 ? 'medium' : 'low',
      objectives,
    };
  }

  private static findNearestEnemyDistance(state: GameState, playerId: PlayerId): number | null {
    const ownAnchors: HexCoord[] = [
      ...Object.values(state.cities).filter((city) => city.ownerId === playerId).map((city) => city.hex),
      ...Object.values(state.entities).filter((entity) => entity.ownerId === playerId).map((entity) => entity.hex),
    ];
    const enemyAnchors: HexCoord[] = [
      ...Object.values(state.cities).filter((city) => city.ownerId !== playerId).map((city) => city.hex),
      ...Object.values(state.entities).filter((entity) => entity.ownerId !== playerId).map((entity) => entity.hex),
    ];
    if (ownAnchors.length === 0 || enemyAnchors.length === 0) return null;

    let nearest = Infinity;
    for (const ownHex of ownAnchors) {
      for (const enemyHex of enemyAnchors) {
        nearest = Math.min(nearest, hexDistance(ownHex, enemyHex));
      }
    }
    return nearest === Infinity ? null : nearest;
  }
}

/**
 * Strategic Planner for "Realms of War" AI.
 *
 * Evaluates the global strategic situation and produces high-level goals.
 * This is the "big picture" layer — it decides WHAT the AI should focus on,
 * while the TacticalPlanner decides HOW to achieve it.
 *
 * Assessment factors:
 * - Military strength (units, city defenses)
 * - Economic health (resources, income)
 * - Tech progress (researched technologies, current era)
 * - Expansion potential (available land, settler availability)
 * - Diplomatic situation (allies, enemies, contested zones)
 * - Threat level (enemy proximity, military balance)
 */

import type { PlayerId, TechBranch } from '../core/types';
import { hexDistance } from '../core/types';
import type { GameState } from '../core/GameState';
import type { InfluenceMap } from './InfluenceMap';
import type { AiMemory } from './AiMemory';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Strategic goals the AI can pursue. */
export type StrategicGoal =
  | 'expand'
  | 'consolidate'
  | 'military_buildup'
  | 'science_rush'
  | 'economic_growth'
  | 'defensive_war'
  | 'offensive_war'
  | 'cultural_development'
  | 'rift_pursuit';

export interface StrategicAssessment {
  primaryGoal: StrategicGoal;
  secondaryGoal: StrategicGoal | null;
  threatLevel: number;        // 0-100
  expansionUrgency: number;   // 0-100
  economicHealth: number;     // 0-100
  militaryStrength: number;   // 0-100
  techProgress: number;       // 0-100
  recommendedTechBranch: TechBranch;
  diplomacyStance: 'aggressive' | 'neutral' | 'defensive' | 'allied';
}

// ─── StrategicPlanner ─────────────────────────────────────────────────────────

export class StrategicPlanner {
  /**
   * Assess the current strategic situation for a player.
   *
   * Evaluates all dimensions of the game state and produces
   * a comprehensive assessment with recommended goals.
   */
  assessSituation(
    state: GameState,
    playerId: PlayerId,
    influenceMap: InfluenceMap,
    memory: AiMemory,
  ): StrategicAssessment {
    const player = state.players[playerId];
    if (!player || !player.isAlive) {
      return this.defaultAssessment();
    }

    // Compute individual metrics
    const threatLevel = this.computeThreatLevel(state, playerId, influenceMap);
    const expansionUrgency = this.computeExpansionUrgency(state, playerId);
    const economicHealth = this.computeEconomicHealth(state, playerId);
    const militaryStrength = this.computeMilitaryStrength(state, playerId);
    const techProgress = this.computeTechProgress(state, playerId);
    const diplomacyStance = this.computeDiplomacyStance(state, playerId, memory);

    // Determine goals based on metrics
    const { primary, secondary } = this.selectGoals(
      threatLevel,
      expansionUrgency,
      economicHealth,
      militaryStrength,
      techProgress,
      diplomacyStance,
      state,
      playerId,
    );

    // Determine recommended tech branch
    const recommendedTechBranch = this.recommendTechBranch(
      primary,
      techProgress,
      economicHealth,
    );

    return {
      primaryGoal: primary,
      secondaryGoal: secondary,
      threatLevel,
      expansionUrgency,
      economicHealth,
      militaryStrength,
      techProgress,
      recommendedTechBranch,
      diplomacyStance,
    };
  }

  /**
   * Generate strategic goals based on assessment.
   * Returns an ordered list of goals by priority.
   */
  generateGoals(assessment: StrategicAssessment): StrategicGoal[] {
    const goals: StrategicGoal[] = [assessment.primaryGoal];

    if (assessment.secondaryGoal) {
      goals.push(assessment.secondaryGoal);
    }

    // Always add consolidate as a low-priority fallback
    if (!goals.includes('consolidate')) {
      goals.push('consolidate');
    }

    return goals;
  }

  /**
   * Evaluate how well current state matches a goal (0-100).
   * Higher values mean the goal is more achieved.
   */
  evaluateGoalProgress(
    state: GameState,
    playerId: PlayerId,
    goal: StrategicGoal,
  ): number {
    const player = state.players[playerId];
    if (!player) return 0;

    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );
    const playerUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId,
    );

    switch (goal) {
      case 'expand': {
        // Progress based on number of cities
        return Math.min(100, playerCities.length * 15);
      }

      case 'consolidate': {
        // Progress based on city development and economic health
        const avgPop = playerCities.length > 0
          ? playerCities.reduce((sum, c) => sum + c.population, 0) / playerCities.length
          : 0;
        return Math.min(100, avgPop * 10);
      }

      case 'military_buildup': {
        // Progress based on military unit count
        const militaryUnits = playerUnits.filter(
          (u) => u.typeId !== 'settler' && u.typeId !== 'worker',
        );
        return Math.min(100, militaryUnits.length * 10);
      }

      case 'science_rush': {
        // Progress based on tech count
        return Math.min(100, player.techs.length * 5);
      }

      case 'economic_growth': {
        // Progress based on gold reserves and income
        const gold = player.resources.gold ?? 0;
        return Math.min(100, gold / 5);
      }

      case 'defensive_war': {
        // Progress based on cities being safe
        const safeCities = playerCities.filter((c) => !c.isUnderSiege).length;
        return playerCities.length > 0
          ? Math.round((safeCities / playerCities.length) * 100)
          : 100;
      }

      case 'offensive_war': {
        // Progress based on enemy cities captured or enemies weakened
        const enemyCities = Object.values(state.cities).filter(
          (c) => c.ownerId !== playerId,
        );
        const totalCities = Object.keys(state.cities).length;
        return totalCities > 0
          ? Math.round((playerCities.length / totalCities) * 100)
          : 0;
      }

      case 'cultural_development': {
        // Progress based on wonders and score
        const wonderCount = playerCities.reduce(
          (sum, c) => sum + c.buildings.filter((b) => b.startsWith('wonder_')).length,
          0,
        );
        return Math.min(100, wonderCount * 25);
      }

      case 'rift_pursuit': {
        // Progress based on rift portal control
        const ownedPortals = Object.values(state.map.tiles).filter(
          (t) => t.hasRiftPortal && t.riftPortalOwner === playerId,
        ).length;
        return Math.min(100, ownedPortals * 33);
      }

      default:
        return 0;
    }
  }

  // ─── Metric Computation ────────────────────────────────────────────────

  private computeThreatLevel(
    state: GameState,
    playerId: PlayerId,
    influenceMap: InfluenceMap,
  ): number {
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    if (playerCities.length === 0) return 100;

    // Average threat at player cities
    let totalThreat = 0;
    for (const city of playerCities) {
      totalThreat += influenceMap.getThreatAt(city.hex);
    }

    // Also consider nearby enemy units
    const enemyUnits = Object.values(state.entities).filter(
      (e) => e.ownerId !== playerId,
    );

    let proximityThreat = 0;
    for (const enemy of enemyUnits) {
      for (const city of playerCities) {
        const dist = hexDistance(enemy.hex, city.hex);
        if (dist <= 3) {
          proximityThreat += (4 - dist) * 10;
        }
      }
    }

    const avgThreat = totalThreat / playerCities.length;
    return Math.min(100, Math.round(avgThreat * 0.7 + Math.min(proximityThreat, 100) * 0.3));
  }

  private computeExpansionUrgency(
    state: GameState,
    playerId: PlayerId,
  ): number {
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    const playerUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId,
    );

    const hasSettler = playerUnits.some((u) => u.typeId === 'settler');

    // Fewer cities = more urgent
    if (playerCities.length === 0) return 100;
    if (playerCities.length === 1) return 80;
    if (playerCities.length === 2) return 60;
    if (playerCities.length <= 4) return 40;

    // Having a settler increases urgency (we have the means)
    const baseUrgency = 20;
    return hasSettler ? baseUrgency + 20 : baseUrgency;
  }

  private computeEconomicHealth(
    state: GameState,
    playerId: PlayerId,
  ): number {
    const player = state.players[playerId];
    if (!player) return 0;

    const gold = player.resources.gold ?? 0;
    const goldIncome = player.incomePerTurn.gold ?? 0;
    const foodIncome = player.incomePerTurn.food ?? 0;

    // Score based on reserves and income
    const reserveScore = Math.min(50, gold / 2);
    const incomeScore = Math.min(50, (goldIncome + foodIncome) * 5);

    return Math.round(reserveScore + incomeScore);
  }

  private computeMilitaryStrength(
    state: GameState,
    playerId: PlayerId,
  ): number {
    const playerUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId,
    );

    const militaryUnits = playerUnits.filter(
      (u) => u.typeId !== 'settler' && u.typeId !== 'worker',
    );

    if (militaryUnits.length === 0) return 0;

    // Score based on count and average combat power
    const countScore = Math.min(40, militaryUnits.length * 8);
    const avgPower = militaryUnits.reduce(
      (sum, u) => sum + (u.attack + u.defense) / 2,
      0,
    ) / militaryUnits.length;
    const powerScore = Math.min(40, avgPower * 8);
    const hpScore = Math.min(20, militaryUnits.reduce(
      (sum, u) => sum + (u.hp / u.maxHp), 0,
    ) / militaryUnits.length * 20);

    return Math.round(countScore + powerScore + hpScore);
  }

  private computeTechProgress(
    state: GameState,
    playerId: PlayerId,
  ): number {
    const player = state.players[playerId];
    if (!player) return 0;

    // Score based on tech count and era
    const techCount = player.techs.length;
    const techScore = Math.min(60, techCount * 4);

    const eraValues: Record<string, number> = {
      primitives: 0,
      earlyCiv: 10,
      medieval: 20,
      renaissance: 30,
      rift: 40,
    };
    const eraScore = eraValues[player.era] ?? 0;

    // Bonus for actively researching
    const researchScore = player.currentResearch ? 10 : 0;

    return Math.min(100, Math.round(techScore + eraScore + researchScore));
  }

  private computeDiplomacyStance(
    state: GameState,
    playerId: PlayerId,
    memory: AiMemory,
  ): 'aggressive' | 'neutral' | 'defensive' | 'allied' {
    // Check if at war with anyone
    const atWarWith: PlayerId[] = [];
    const atPeaceWith: PlayerId[] = [];
    const alliedWith: PlayerId[] = [];

    for (const [key, entry] of Object.entries(state.diplomacy)) {
      const [a, b] = key.split(':');
      const otherId = a === playerId ? b : a;
      if (a !== playerId && b !== playerId) continue;

      switch (entry.status) {
        case 'war':
          atWarWith.push(otherId);
          break;
        case 'peace':
          atPeaceWith.push(otherId);
          break;
        case 'alliance':
          alliedWith.push(otherId);
          break;
        default:
          break;
      }
    }

    // Default: war with everyone not explicitly at peace
    const allOthers = Object.keys(state.players).filter((id) => id !== playerId);
    const unaffiliated = allOthers.filter(
      (id) => !atWarWith.includes(id) && !atPeaceWith.includes(id) && !alliedWith.includes(id),
    );

    if (atWarWith.length > 0) {
      // Check relative strength
      const ownMilitary = this.computeMilitaryStrength(state, playerId);
      let enemyMilitaryTotal = 0;
      for (const enemyId of atWarWith) {
        enemyMilitaryTotal += this.computeMilitaryStrength(state, enemyId);
      }
      const avgEnemyMilitary = enemyMilitaryTotal / atWarWith.length;

      if (ownMilitary > avgEnemyMilitary * 1.3) {
        return 'aggressive';
      }
      return 'defensive';
    }

    if (alliedWith.length > 0) {
      return 'allied';
    }

    // Check trust levels from memory
    const avgTrust = unaffiliated.length > 0
      ? unaffiliated.reduce((sum, id) => sum + memory.getPlayerTrust(id), 0) / unaffiliated.length
      : 50;

    if (avgTrust < 30) return 'aggressive';
    if (avgTrust > 70) return 'allied';
    return 'neutral';
  }

  // ─── Goal Selection ────────────────────────────────────────────────────

  private selectGoals(
    threatLevel: number,
    expansionUrgency: number,
    economicHealth: number,
    militaryStrength: number,
    techProgress: number,
    diplomacyStance: 'aggressive' | 'neutral' | 'defensive' | 'allied',
    state: GameState,
    playerId: PlayerId,
  ): { primary: StrategicGoal; secondary: StrategicGoal | null } {
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    // ─── Critical situations (override everything) ──────────────────────

    // No cities: must expand immediately
    if (playerCities.length === 0) {
      return { primary: 'expand', secondary: null };
    }

    // Under severe threat with weak military: defensive war
    if (threatLevel > 70 && militaryStrength < 40) {
      return { primary: 'defensive_war', secondary: 'military_buildup' };
    }

    // At war with advantage: offensive war
    if (diplomacyStance === 'aggressive' && militaryStrength > 60) {
      return { primary: 'offensive_war', secondary: 'military_buildup' };
    }

    // At war but defensive: defend first
    if (diplomacyStance === 'defensive') {
      return { primary: 'defensive_war', secondary: 'military_buildup' };
    }

    // ─── Standard priority selection ────────────────────────────────────

    // Score each goal based on current metrics
    const goalScores: Array<{ goal: StrategicGoal; score: number }> = [
      {
        goal: 'expand',
        score: expansionUrgency * 1.2 - threatLevel * 0.3,
      },
      {
        goal: 'economic_growth',
        score: (100 - economicHealth) * 1.0 - threatLevel * 0.2,
      },
      {
        goal: 'military_buildup',
        score: (100 - militaryStrength) * 0.8 + threatLevel * 0.4,
      },
      {
        goal: 'science_rush',
        score: (100 - techProgress) * 0.7 - threatLevel * 0.3 + economicHealth * 0.2,
      },
      {
        goal: 'consolidate',
        score: economicHealth * 0.3 + militaryStrength * 0.3 - threatLevel * 0.1,
      },
      {
        goal: 'cultural_development',
        score: economicHealth * 0.4 + techProgress * 0.3 - threatLevel * 0.2,
      },
    ];

    // Check for rift portal availability (only if tech is advanced enough)
    const player = state.players[playerId];
    if (player && (player.era === 'renaissance' || player.era === 'rift')) {
      goalScores.push({
        goal: 'rift_pursuit',
        score: techProgress * 0.5 + militaryStrength * 0.3 - threatLevel * 0.2,
      });
    }

    // Sort by score (highest first)
    goalScores.sort((a, b) => b.score - a.score);

    const primary = goalScores[0]?.goal ?? 'consolidate';
    const secondary = goalScores[1]?.goal ?? null;

    return { primary, secondary };
  }

  // ─── Tech Branch Recommendation ────────────────────────────────────────

  private recommendTechBranch(
    primaryGoal: StrategicGoal,
    techProgress: number,
    economicHealth: number,
  ): TechBranch {
    switch (primaryGoal) {
      case 'military_buildup':
      case 'offensive_war':
      case 'defensive_war':
        return 'military';

      case 'science_rush':
        return 'science';

      case 'economic_growth':
        return 'economic';

      case 'rift_pursuit':
        return 'mystical';

      case 'expand':
        // Early expansion benefits from economy tech
        return economicHealth < 50 ? 'economic' : 'military';

      case 'consolidate':
        // Consolidation benefits from balanced research
        return techProgress < 40 ? 'science' : 'economic';

      case 'cultural_development':
        return 'mystical';

      default:
        return 'economic';
    }
  }

  // ─── Default Assessment ────────────────────────────────────────────────

  private defaultAssessment(): StrategicAssessment {
    return {
      primaryGoal: 'consolidate',
      secondaryGoal: null,
      threatLevel: 0,
      expansionUrgency: 50,
      economicHealth: 50,
      militaryStrength: 50,
      techProgress: 0,
      recommendedTechBranch: 'economic',
      diplomacyStance: 'neutral',
    };
  }
}

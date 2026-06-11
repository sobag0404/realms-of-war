/**
 * Utility AI Scoring for "Realms of War" AI.
 *
 * Evaluates potential actions using a utility-based approach.
 * Each action is scored based on the current strategic context,
 * and the highest-scoring actions are preferred.
 *
 * Uses diminishing returns curves to prevent over-investment
 * in any single strategic dimension.
 */

import type { PlayerId } from '../core/types';
import type { GameState } from '../core/GameState';
import type { GameCommand } from '../core/CommandQueue';
import type { StrategicAssessment } from './StrategicPlanner';
import type { InfluenceMap } from './InfluenceMap';
import { AiSystem } from '../ecs/systems/AiSystem';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UtilityContext {
  state: GameState;
  playerId: PlayerId;
  assessment: StrategicAssessment;
  influenceMap: InfluenceMap;
}

export interface ScoredAction {
  command: GameCommand;
  score: number;
  reasoning: string;
}

// ─── UtilityScoring ───────────────────────────────────────────────────────────

export class UtilityScoring {
  /**
   * Score a single action in context.
   *
   * Builds on the base AiSystem.scoreAction but adds influence map
   * and strategic assessment modifiers.
   */
  scoreAction(context: UtilityContext, action: GameCommand): ScoredAction {
    const { state, playerId, assessment, influenceMap } = context;

    // Start with the base score from AiSystem
    let score = AiSystem.scoreAction(state, playerId, action);
    let reasoning = `Base score: ${score}`;

    // Apply strategic assessment modifiers
    const strategicModifier = this.computeStrategicModifier(action, assessment);
    score += strategicModifier.modifier;
    if (strategicModifier.reason) {
      reasoning += ` | ${strategicModifier.reason}`;
    }

    // Apply influence map modifiers
    const influenceModifier = this.computeInfluenceModifier(action, influenceMap, playerId);
    score += influenceModifier.modifier;
    if (influenceModifier.reason) {
      reasoning += ` | ${influenceModifier.reason}`;
    }

    // Apply diminishing returns for over-concentration
    score = this.applyDiminishingReturns(action, score, assessment);

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    return { command: action, score, reasoning };
  }

  /**
   * Score multiple actions and return them sorted by score (highest first).
   */
  scoreActions(context: UtilityContext, actions: GameCommand[]): ScoredAction[] {
    const scored = actions.map((action) => this.scoreAction(context, action));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Calculate a utility curve with diminishing returns.
   *
   * Uses a logistic-style curve that provides strong returns
   * up to the inflection point, then tapers off.
   *
   * @param value - Current value (e.g., number of cities, gold)
   * @param inflectionPoint - Value at which returns start diminishing
   * @returns Utility value between 0 and 1
   */
  utilityCurve(value: number, inflectionPoint: number): number {
    if (inflectionPoint <= 0) return 1;
    // Logistic curve: 2 / (1 + e^(-k*(x - inflection))) - 1
    // Simplified: value / (value + inflectionPoint)
    return value / (value + inflectionPoint);
  }

  // ─── Strategic Modifier ────────────────────────────────────────────────

  private computeStrategicModifier(
    action: GameCommand,
    assessment: StrategicAssessment,
  ): { modifier: number; reason: string } {
    let modifier = 0;
    const reasons: string[] = [];

    switch (action.type) {
      case 'FoundCity': {
        // Expand goal makes city founding more attractive
        if (assessment.primaryGoal === 'expand' || assessment.secondaryGoal === 'expand') {
          modifier += 20;
          reasons.push('Expand goal: +20');
        }
        // High expansion urgency amplifies
        if (assessment.expansionUrgency > 60) {
          modifier += 15;
          reasons.push('High expansion urgency: +15');
        }
        break;
      }

      case 'RecruitUnit': {
        // Military goals make recruitment more valuable
        if (assessment.primaryGoal === 'military_buildup' ||
            assessment.primaryGoal === 'offensive_war' ||
            assessment.primaryGoal === 'defensive_war') {
          modifier += 25;
          reasons.push('Military goal: +25');
        }
        // High threat makes defensive recruitment urgent
        if (assessment.threatLevel > 50) {
          modifier += 15;
          reasons.push('High threat: +15');
        }
        break;
      }

      case 'Attack': {
        // Offensive war makes attacks more desirable
        if (assessment.primaryGoal === 'offensive_war') {
          modifier += 20;
          reasons.push('Offensive war: +20');
        }
        // Don't attack when militarily weak
        if (assessment.militaryStrength < 30) {
          modifier -= 30;
          reasons.push('Weak military: -30');
        }
        break;
      }

      case 'BuildBuilding': {
        // Economic growth makes buildings more valuable
        if (assessment.primaryGoal === 'economic_growth') {
          modifier += 15;
          reasons.push('Economic goal: +15');
        }
        // Science rush makes research buildings more valuable
        if (assessment.primaryGoal === 'science_rush') {
          const scienceBuildings = ['library', 'university', 'academy'];
          if (scienceBuildings.includes(action.buildingTypeId)) {
            modifier += 25;
            reasons.push('Science rush + science building: +25');
          }
        }
        break;
      }

      case 'ResearchTechnology': {
        // Science rush makes research very valuable
        if (assessment.primaryGoal === 'science_rush') {
          modifier += 30;
          reasons.push('Science rush: +30');
        }
        // Low tech progress increases research value
        if (assessment.techProgress < 30) {
          modifier += 10;
          reasons.push('Low tech: +10');
        }
        break;
      }

      case 'MoveUnit': {
        // Moving toward contested zones is valuable during war
        if (assessment.diplomacyStance === 'aggressive' ||
            assessment.diplomacyStance === 'defensive') {
          modifier += 5;
          reasons.push('War movement: +5');
        }
        break;
      }

      case 'EndTurn': {
        modifier = 0;
        break;
      }

      default: {
        break;
      }
    }

    return { modifier, reason: reasons.join('; ') };
  }

  // ─── Influence Map Modifier ────────────────────────────────────────────

  private computeInfluenceModifier(
    action: GameCommand,
    influenceMap: InfluenceMap,
    playerId: PlayerId,
  ): { modifier: number; reason: string } {
    let modifier = 0;
    const reasons: string[] = [];

    switch (action.type) {
      case 'FoundCity': {
        // Check if the founding location is safe
        const threat = influenceMap.getThreatAt(action.hex);
        if (threat > 60) {
          modifier -= 20;
          reasons.push(`High threat at location (${threat}): -20`);
        } else if (threat < 20) {
          modifier += 10;
          reasons.push(`Safe location (threat ${threat}): +10`);
        }
        break;
      }

      case 'MoveUnit': {
        // Check destination threat
        if (action.path.length > 0) {
          const dest = action.path[action.path.length - 1]!;
          const threat = influenceMap.getThreatAt(dest);
          if (threat > 70) {
            modifier -= 15;
            reasons.push(`Moving into danger zone (${threat}): -15`);
          }
        }
        break;
      }

      case 'Attack': {
        // Check if we have local military superiority
        const attacker = action.attackerId; // We can't access entity here but the base score handles HP
        void attacker; // Suppress unused warning
        break;
      }

      case 'RecruitUnit': {
        // Check if the city is in a threatened area
        // Cities under threat need defenders more
        break;
      }

      default: {
        break;
      }
    }

    return { modifier, reason: reasons.join('; ') };
  }

  // ─── Diminishing Returns ───────────────────────────────────────────────

  /**
   * Apply diminishing returns to prevent the AI from over-concentrating
   * on one type of action.
   */
  private applyDiminishingReturns(
    action: GameCommand,
    score: number,
    assessment: StrategicAssessment,
  ): number {
    // If we already have high military strength, reduce military action scores
    if (assessment.militaryStrength > 80) {
      if (action.type === 'RecruitUnit') {
        return score * 0.6;
      }
    }

    // If we already have strong economy, reduce economy action scores
    if (assessment.economicHealth > 80) {
      if (action.type === 'BuildBuilding') {
        const economyBuildings = ['granary', 'market', 'bank', 'workshop', 'guild_hall'];
        if (economyBuildings.includes(action.buildingTypeId)) {
          return score * 0.7;
        }
      }
    }

    // If we have many cities, reduce expansion urge
    if (assessment.expansionUrgency < 20) {
      if (action.type === 'FoundCity') {
        return score * 0.5;
      }
    }

    return score;
  }
}

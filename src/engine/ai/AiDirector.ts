/**
 * AI Director for "Realms of War".
 *
 * Top-level orchestrator for all AI decision-making. Manages strategic
 * planning, delegates to tactical planner, and produces final command
 * sequences for a player's turn.
 *
 * Architecture:
 *   AiDirector → StrategicPlanner → TacticalPlanner → Commands
 *
 * The director runs once per turn and produces a complete set of commands.
 * It uses the InfluenceMap for spatial awareness, BehaviorTree for
 * decision-making, and UtilityScoring for prioritization.
 *
 * The existing AiSystem.generateTurn() is used as a fallback for
 * easy difficulty or when the advanced AI encounters issues.
 */

import type { PlayerId } from '../core/types';
import type { GameState } from '../core/GameState';
import type { GameCommand } from '../core/CommandQueue';
import type { EventBus } from '../core/EventBus';
import { AiSystem } from '../ecs/systems/AiSystem';
import { StrategicPlanner } from './StrategicPlanner';
import type { StrategicGoal, StrategicAssessment } from './StrategicPlanner';
import { TacticalPlanner } from './TacticalPlanner';
import { InfluenceMap } from './InfluenceMap';
import { AiMemory } from './AiMemory';
import { UtilityScoring } from './UtilityScoring';
import { buildAiBehaviorTree } from './BehaviorTree';
import type { BehaviorNode } from './BehaviorTree';
import {
  getDifficultyModifiers,
  type DifficultyLevel,
  type DifficultyModifiers,
} from './difficultyModifiers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiDebugInfo {
  strategy: string;
  priorityWeights: Record<string, number>;
  threatLevel: number;
  expansionUrgency: number;
  researchFocus: string;
}

// ─── AiDirector ───────────────────────────────────────────────────────────────

export class AiDirector {
  private playerId: PlayerId;
  private difficulty: DifficultyLevel;
  private difficultyModifiers: DifficultyModifiers;
  private strategicPlanner: StrategicPlanner;
  private tacticalPlanner: TacticalPlanner;
  private influenceMap: InfluenceMap;
  private memory: AiMemory;
  private utilityScoring: UtilityScoring;
  private behaviorTree: BehaviorNode | null;

  /** Cached assessment from the most recent turn. */
  private lastAssessment: StrategicAssessment | null;

  constructor(playerId: PlayerId, difficulty: DifficultyLevel) {
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.difficultyModifiers = getDifficultyModifiers(difficulty);
    this.strategicPlanner = new StrategicPlanner();
    this.tacticalPlanner = new TacticalPlanner();
    this.influenceMap = new InfluenceMap(playerId);
    this.memory = new AiMemory();
    this.utilityScoring = new UtilityScoring();
    this.behaviorTree = this.difficultyModifiers.useBehaviorTree
      ? buildAiBehaviorTree(difficulty)
      : null;
    this.lastAssessment = null;
  }

  // ─── Main Entry Point ──────────────────────────────────────────────────

  /**
   * Generate all commands for this AI player's turn.
   * This is the main entry point called by the TurnSystem.
   */
  generateTurnCommands(state: GameState, eventBus: EventBus): GameCommand[] {
    const player = state.players[this.playerId];
    if (!player || !player.isAlive) return [];

    // Step 1: Update knowledge
    this.updateKnowledge(state);

    // Step 2: Check if we should use the simple AI (easy mode without behavior tree)
    if (!this.difficultyModifiers.useBehaviorTree) {
      return this.generateSimpleTurn(state, eventBus);
    }

    // Step 3: Generate strategic assessment
    const assessment = this.strategicPlanner.assessSituation(
      state,
      this.playerId,
      this.influenceMap,
      this.memory,
    );
    this.lastAssessment = assessment;

    // Step 4: Record this turn's decision
    this.memory.recordDecision(state.turn, assessment.primaryGoal);

    // Step 5: Run behavior tree for high-level decision validation
    const context = {
      state,
      playerId: this.playerId,
      assessment,
      influenceMap: this.influenceMap,
    };

    if (this.behaviorTree) {
      const treeResult = this.behaviorTree.execute(context);
      // The behavior tree validates the strategic direction.
      // If it fails, we fall back to the simple AI.
      if (treeResult === 'failure' && this.difficulty === 'easy') {
        return this.generateSimpleTurn(state, eventBus);
      }
    }

    // Step 6: Generate tactical plans for strategic goals
    const goals = this.strategicPlanner.generateGoals(assessment);
    const plans = goals.map((goal) =>
      this.tacticalPlanner.createPlan(
        state,
        this.playerId,
        goal,
        assessment,
        this.influenceMap,
      ),
    );

    // Step 7: Prioritize plans
    const prioritizedPlans = this.tacticalPlanner.prioritizePlans(plans, assessment);

    // Step 8: Score and select commands from plans
    const commands = this.selectCommands(state, prioritizedPlans, assessment);

    // Step 9: Apply mistake probability (AI makes suboptimal choices)
    const finalCommands = this.applyMistakeFilter(commands, state);

    // Step 10: Always end with EndTurn
    finalCommands.push({ type: 'EndTurn', playerId: this.playerId });

    // Step 11: Evaluate previous decision outcome
    this.evaluatePreviousDecision(state);

    return finalCommands;
  }

  // ─── Knowledge Update ──────────────────────────────────────────────────

  /**
   * Update the AI's internal models based on new information.
   * Called after vision updates and at turn start.
   */
  updateKnowledge(state: GameState): void {
    // Update memory with current observations
    this.memory.updateFromState(state, this.playerId);

    // Prune stale enemy positions
    this.memory.pruneStalePositions(state.turn, 10);

    // Recalculate influence map
    this.influenceMap.recalculate(state, this.playerId);
  }

  // ─── Debug Info ────────────────────────────────────────────────────────

  /**
   * Get the current strategic assessment for debugging/display.
   */
  getDebugInfo(): AiDebugInfo {
    if (!this.lastAssessment) {
      return {
        strategy: 'No assessment yet',
        priorityWeights: {},
        threatLevel: 0,
        expansionUrgency: 0,
        researchFocus: 'economy',
      };
    }

    const assessment = this.lastAssessment;
    const progress = this.strategicPlanner.evaluateGoalProgress(
      { turn: 0 } as GameState, // Minimal state for the method
      this.playerId,
      assessment.primaryGoal,
    );

    return {
      strategy: assessment.primaryGoal,
      priorityWeights: {
        [assessment.primaryGoal]: 100 - progress,
        ...(assessment.secondaryGoal ? { [assessment.secondaryGoal]: 60 } : {}),
      },
      threatLevel: assessment.threatLevel,
      expansionUrgency: assessment.expansionUrgency,
      researchFocus: assessment.recommendedTechBranch,
    };
  }

  // ─── Memory Access ─────────────────────────────────────────────────────

  /** Get the AI memory (for save/load or debugging). */
  getMemory(): AiMemory {
    return this.memory;
  }

  /** Set the AI memory (for loading a save). */
  setMemory(memory: AiMemory): void {
    this.memory = memory;
  }

  /** Get the influence map. */
  getInfluenceMap(): InfluenceMap {
    return this.influenceMap;
  }

  /** Get the current difficulty level. */
  getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }

  /** Get the current strategic assessment. */
  getAssessment(): StrategicAssessment | null {
    return this.lastAssessment;
  }

  // ─── Serialization ─────────────────────────────────────────────────────

  /** Serialize the director's persistent state for save/load. */
  serialize(): { memory: ReturnType<AiMemory['serialize']>; difficulty: DifficultyLevel } {
    return {
      memory: this.memory.serialize(),
      difficulty: this.difficulty,
    };
  }

  // ─── Internal Methods ──────────────────────────────────────────────────

  /**
   * Generate a simple turn using the existing AiSystem.
   * Used as fallback for easy mode or when behavior tree fails.
   */
  private generateSimpleTurn(state: GameState, eventBus: EventBus): GameCommand[] {
    return AiSystem.generateTurn(state, this.playerId, eventBus);
  }

  /**
   * Select commands from prioritized tactical plans.
   * Merges commands from multiple plans, deduplicates, and scores them.
   */
  private selectCommands(
    state: GameState,
    plans: import('./TacticalPlanner').TacticalPlan[],
    assessment: StrategicAssessment,
  ): GameCommand[] {
    const allCommands: GameCommand[] = [];

    // Collect commands from plans in priority order
    for (const plan of plans) {
      allCommands.push(...plan.commands);
    }

    // Deduplicate: only keep one command per entity per turn
    const seenEntities = new Set<string>();
    const seenCities = new Set<string>();
    const seenResearch = new Set<string>();
    const deduped: GameCommand[] = [];

    for (const cmd of allCommands) {
      switch (cmd.type) {
        case 'MoveUnit': {
          if (!seenEntities.has(cmd.entityId)) {
            seenEntities.add(cmd.entityId);
            deduped.push(cmd);
          }
          break;
        }
        case 'Attack': {
          if (!seenEntities.has(cmd.attackerId)) {
            seenEntities.add(cmd.attackerId);
            deduped.push(cmd);
          }
          break;
        }
        case 'RecruitUnit': {
          const key = `${cmd.cityId}:${cmd.unitTypeId}`;
          if (!seenCities.has(key)) {
            seenCities.add(key);
            deduped.push(cmd);
          }
          break;
        }
        case 'BuildBuilding': {
          const key = `${cmd.cityId}:${cmd.buildingTypeId}`;
          if (!seenCities.has(key)) {
            seenCities.add(key);
            deduped.push(cmd);
          }
          break;
        }
        case 'FoundCity': {
          deduped.push(cmd); // Always allow city founding
          break;
        }
        case 'ResearchTechnology': {
          if (!seenResearch.has(cmd.playerId)) {
            seenResearch.add(cmd.playerId);
            deduped.push(cmd);
          }
          break;
        }
        case 'EndTurn': {
          // EndTurn is added separately at the end
          break;
        }
        default: {
          deduped.push(cmd);
          break;
        }
      }
    }

    // Score commands using utility scoring
    if (deduped.length > 0) {
      const context = {
        state,
        playerId: this.playerId,
        assessment,
        influenceMap: this.influenceMap,
      };

      const scored = this.utilityScoring.scoreActions(context, deduped);

      // Keep only commands with score > 0 (except EndTurn which is handled separately)
      return scored
        .filter((s) => s.score > 0)
        .map((s) => s.command);
    }

    return deduped;
  }

  /**
   * Apply mistake filter based on difficulty.
   * On easy mode, the AI may skip some good commands.
   * On deity, the AI always plays optimally.
   */
  private applyMistakeFilter(
    commands: GameCommand[],
    _state: GameState,
  ): GameCommand[] {
    if (this.difficultyModifiers.mistakeProbability <= 0) {
      return commands;
    }

    // Randomly skip some commands based on mistake probability
    return commands.filter((cmd) => {
      // Never skip critical commands
      if (cmd.type === 'EndTurn' || cmd.type === 'FoundCity' || cmd.type === 'ResearchTechnology') {
        return true;
      }

      // Roll for mistake
      return Math.random() > this.difficultyModifiers.mistakeProbability;
    });
  }

  /**
   * Evaluate the outcome of the previous turn's strategic decision.
   * Compares the state before and after to determine success/failure.
   */
  private evaluatePreviousDecision(state: GameState): void {
    const lastDecision = this.memory.getLatestDecision();
    if (!lastDecision) return;

    // Don't evaluate the current turn's decision yet
    if (lastDecision.turn >= state.turn) return;

    // Only evaluate if not already updated
    if (lastDecision.outcome !== 'partial') return;

    // Evaluate based on the goal
    const progress = this.strategicPlanner.evaluateGoalProgress(
      state,
      this.playerId,
      lastDecision.goal,
    );

    if (progress >= 70) {
      this.memory.updateDecisionOutcome(lastDecision.turn, 'success');
    } else if (progress >= 30) {
      this.memory.updateDecisionOutcome(lastDecision.turn, 'partial');
    } else {
      this.memory.updateDecisionOutcome(lastDecision.turn, 'failure');
    }
  }
}

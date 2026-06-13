/**
 * AI module for "Realms of War".
 *
 * Re-exports all AI system components:
 * - AiDirector: Top-level orchestrator
 * - StrategicPlanner: Strategic goal assessment
 * - TacticalPlanner: Goal-to-command conversion
 * - UtilityScoring: Utility-based action evaluation
 * - BehaviorTree: Structured decision-making
 * - InfluenceMap: Spatial strategic awareness
 * - AiMemory: Persistent memory across turns
 * - difficultyModifiers: Difficulty scaling
 */

// ─── AiDirector ───────────────────────────────────────────────────────────────
export { AiDirector } from './AiDirector';
export type { AiDebugInfo } from './AiDirector';

// ─── StrategicPlanner ─────────────────────────────────────────────────────────
export { StrategicPlanner } from './StrategicPlanner';
export type { StrategicGoal, StrategicAssessment } from './StrategicPlanner';

// ─── TacticalPlanner ─────────────────────────────────────────────────────────
export { TacticalPlanner } from './TacticalPlanner';
export type { TacticalPlan } from './TacticalPlanner';

// ─── UtilityScoring ──────────────────────────────────────────────────────────
export { UtilityScoring } from './UtilityScoring';
export type { UtilityContext, ScoredAction } from './UtilityScoring';

// ─── BehaviorTree ─────────────────────────────────────────────────────────────
export {
  Selector,
  Sequence,
  Decorator,
  Condition,
  Action,
  buildAiBehaviorTree,
} from './BehaviorTree';
export type { NodeStatus, BehaviorNode } from './BehaviorTree';

// ─── InfluenceMap ─────────────────────────────────────────────────────────────
export { InfluenceMap } from './InfluenceMap';
export type { InfluenceData } from './InfluenceMap';

// ─── AiMemory ─────────────────────────────────────────────────────────────────
export { AiMemory } from './AiMemory';
export type {
  AiMemoryData,
  EnemyPosition,
  KnownCity,
  PlayerRelation,
  PastDecision,
  DiscoveredFeature,
} from './AiMemory';

// ─── Difficulty ───────────────────────────────────────────────────────────────
export { getDifficultyModifiers, DIFFICULTY_SETTINGS } from './difficultyModifiers';
export type { DifficultyLevel, DifficultyModifiers } from './difficultyModifiers';

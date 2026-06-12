/**
 * Behavior Tree for "Realms of War" AI.
 *
 * Provides structured decision-making through composable tree nodes.
 * The AI uses this to evaluate complex strategic situations and
 * select appropriate tactical responses.
 *
 * Node types:
 * - Selector: succeeds if ANY child succeeds (OR)
 * - Sequence: succeeds only if ALL children succeed (AND)
 * - Decorator: modifies child behavior (invert, repeat, etc.)
 * - Condition: checks a predicate without side effects
 * - Action: performs a game action
 */

import type { UtilityContext } from './UtilityScoring';
import type { DifficultyLevel } from './difficultyModifiers';

// ─── Node Status ──────────────────────────────────────────────────────────────

export type NodeStatus = 'success' | 'failure' | 'running';

// ─── Behavior Node Interface ──────────────────────────────────────────────────

export interface BehaviorNode {
  name: string;
  execute(context: UtilityContext): NodeStatus;
}

// ─── Selector ─────────────────────────────────────────────────────────────────

/**
 * Selector node: succeeds if any child succeeds.
 * Evaluates children in order, returning success on the first
 * child that succeeds. If all fail, returns failure.
 */
export class Selector implements BehaviorNode {
  name: string;
  private children: BehaviorNode[];

  constructor(name: string, children: BehaviorNode[]) {
    this.name = name;
    this.children = children;
  }

  execute(context: UtilityContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      if (status === 'success' || status === 'running') {
        return status;
      }
    }
    return 'failure';
  }
}

// ─── Sequence ─────────────────────────────────────────────────────────────────

/**
 * Sequence node: succeeds only if all children succeed.
 * Evaluates children in order, returning failure on the first
 * child that fails. If all succeed, returns success.
 */
export class Sequence implements BehaviorNode {
  name: string;
  private children: BehaviorNode[];

  constructor(name: string, children: BehaviorNode[]) {
    this.name = name;
    this.children = children;
  }

  execute(context: UtilityContext): NodeStatus {
    for (const child of this.children) {
      const status = child.execute(context);
      if (status === 'failure' || status === 'running') {
        return status;
      }
    }
    return 'success';
  }
}

// ─── Decorator ────────────────────────────────────────────────────────────────

/**
 * Decorator node: modifies child behavior.
 * Supports inversion, repetition, and threshold-based gating.
 */
export class Decorator implements BehaviorNode {
  name: string;
  private child: BehaviorNode;
  private mode: 'invert' | 'repeat' | 'untilFail' | 'succeedOnRunning';

  constructor(
    name: string,
    child: BehaviorNode,
    mode: 'invert' | 'repeat' | 'untilFail' | 'succeedOnRunning' = 'invert',
  ) {
    this.name = name;
    this.child = child;
    this.mode = mode;
  }

  execute(context: UtilityContext): NodeStatus {
    const status = this.child.execute(context);

    switch (this.mode) {
      case 'invert':
        if (status === 'success') return 'failure';
        if (status === 'failure') return 'success';
        return status;

      case 'repeat': {
        // Execute up to 3 times, succeed if any succeeds
        let result = status;
        for (let i = 0; i < 2; i++) {
          if (result === 'failure') return 'failure';
          if (result === 'success') return 'success';
          result = this.child.execute(context);
        }
        return result;
      }

      case 'untilFail':
        if (status === 'failure') return 'success';
        return 'running';

      case 'succeedOnRunning':
        if (status === 'running') return 'success';
        return status;

      default:
        return status;
    }
  }
}

// ─── Condition ────────────────────────────────────────────────────────────────

/**
 * Condition node: checks a predicate without side effects.
 * Returns success if the predicate is true, failure otherwise.
 */
export class Condition implements BehaviorNode {
  name: string;
  private predicate: (context: UtilityContext) => boolean;

  constructor(name: string, predicate: (context: UtilityContext) => boolean) {
    this.name = name;
    this.predicate = predicate;
  }

  execute(context: UtilityContext): NodeStatus {
    return this.predicate(context) ? 'success' : 'failure';
  }
}

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Action node: performs a game action.
 * Returns success if the action was performed, failure if not possible.
 */
export class Action implements BehaviorNode {
  name: string;
  private action: (context: UtilityContext) => boolean;

  constructor(name: string, action: (context: UtilityContext) => boolean) {
    this.name = name;
    this.action = action;
  }

  execute(context: UtilityContext): NodeStatus {
    return this.action(context) ? 'success' : 'failure';
  }
}

// ─── Behavior Tree Builder ────────────────────────────────────────────────────

/**
 * Build the AI behavior tree based on difficulty level.
 *
 * The tree has a top-level selector that tries strategic priorities
 * in order. Each priority is a sequence of: condition check → action.
 * Higher difficulty levels have more sophisticated trees.
 */
export function buildAiBehaviorTree(difficulty: DifficultyLevel): BehaviorNode {
  // ─── Common Conditions ────────────────────────────────────────────────

  const isThreatened = new Condition('isThreatened', (ctx) => {
    return ctx.assessment.threatLevel > 50;
  });

  const needsExpansion = new Condition('needsExpansion', (ctx) => {
    return ctx.assessment.expansionUrgency > 60;
  });

  const economyWeak = new Condition('economyWeak', (ctx) => {
    return ctx.assessment.economicHealth < 40;
  });

  const militaryWeak = new Condition('militaryWeak', (ctx) => {
    return ctx.assessment.militaryStrength < 40;
  });

  const atWar = new Condition('atWar', (ctx) => {
    return ctx.assessment.diplomacyStance === 'aggressive';
  });

  const techBehind = new Condition('techBehind', (ctx) => {
    return ctx.assessment.techProgress < 30;
  });

  // ─── Common Actions (stubs that return true to indicate "handled") ────

  const defendAction = new Action('defend', () => true);
  const expandAction = new Action('expand', () => true);
  const growEconomyAction = new Action('growEconomy', () => true);
  const buildMilitaryAction = new Action('buildMilitary', () => true);
  const attackAction = new Action('attack', () => true);
  const researchAction = new Action('research', () => true);
  const pursueRiftAction = new Action('pursueRift', () => true);

  // ─── Easy AI: Simple reactive tree ────────────────────────────────────

  if (difficulty === 'easy') {
    return new Selector('EasyAI', [
      new Sequence('Defend', [isThreatened, defendAction]),
      new Sequence('Expand', [needsExpansion, expandAction]),
      new Sequence('Economy', [economyWeak, growEconomyAction]),
      new Sequence('Military', [militaryWeak, buildMilitaryAction]),
      expandAction, // Default: just expand
    ]);
  }

  // ─── Normal AI: More nuanced tree ─────────────────────────────────────

  if (difficulty === 'normal') {
    return new Selector('NormalAI', [
      // Priority 1: Survival — defend if threatened
      new Sequence('Survival', [
        isThreatened,
        new Selector('DefenseOptions', [
          new Sequence('StrongDefend', [
            new Decorator('notWeak', militaryWeak, 'invert'),
            defendAction,
          ]),
          new Sequence('EmergencyRecruit', [buildMilitaryAction, defendAction]),
        ]),
      ]),

      // Priority 2: War — attack if at war and strong enough
      new Sequence('Offensive', [
        atWar,
        new Decorator('notWeak', militaryWeak, 'invert'),
        attackAction,
      ]),

      // Priority 3: Expansion
      new Sequence('Expand', [needsExpansion, expandAction]),

      // Priority 4: Economy
      new Sequence('Economy', [economyWeak, growEconomyAction]),

      // Priority 5: Research
      new Sequence('Research', [techBehind, researchAction]),

      // Priority 6: Build military if affordable
      buildMilitaryAction,
    ]);
  }

  // ─── Hard/Deity AI: Full strategic tree ───────────────────────────────

  return new Selector('StrategicAI', [
    // Priority 1: Critical defense — threatened AND militarily weak
    new Sequence('CriticalDefense', [
      isThreatened,
      militaryWeak,
      new Selector('EmergencyResponse', [
        new Sequence('BuildAndDefend', [buildMilitaryAction, defendAction]),
        defendAction,
      ]),
    ]),

    // Priority 2: Offensive war — only if we have advantage
    new Sequence('OffensiveWar', [
      atWar,
      new Decorator('militaryAdvantage', militaryWeak, 'invert'),
      new Condition('lowThreatHome', (ctx) => ctx.assessment.threatLevel < 30),
      attackAction,
    ]),

    // Priority 3: Defensive war — hold ground
    new Sequence('DefensiveWar', [
      atWar,
      isThreatened,
      defendAction,
    ]),

    // Priority 4: Strategic expansion
    new Sequence('StrategicExpansion', [
      needsExpansion,
      new Condition('safeToExpand', (ctx) => ctx.assessment.threatLevel < 40),
      expandAction,
    ]),

    // Priority 5: Economic foundation
    new Sequence('EconomicFoundation', [
      economyWeak,
      new Selector('EconStrategy', [
        new Sequence('GrowCities', [growEconomyAction]),
        new Sequence('TechForEcon', [researchAction]),
      ]),
    ]),

    // Priority 6: Science rush if safe
    new Sequence('ScienceRush', [
      techBehind,
      new Condition('safeToResearch', (ctx) =>
        ctx.assessment.threatLevel < 25 && ctx.assessment.economicHealth > 50,
      ),
      researchAction,
    ]),

    // Priority 7: Military buildup
    new Sequence('MilitaryBuildup', [
      new Decorator('notOverStrength', new Condition('underStrength',
        (ctx) => ctx.assessment.militaryStrength < 70,
      ), 'invert'),
      buildMilitaryAction,
    ]),

    // Priority 8: Rift pursuit (only for deity)
    ...(difficulty === 'deity' ? [
      new Sequence('RiftPursuit', [
        new Condition('hasRiftAccess', (ctx) =>
          ctx.assessment.techProgress > 50 && ctx.assessment.militaryStrength > 60,
        ),
        pursueRiftAction,
      ]),
    ] : []),

    // Default fallback: balanced growth
    new Selector('BalancedGrowth', [
      new Sequence('EconThenMilitary', [growEconomyAction, buildMilitaryAction]),
      expandAction,
    ]),
  ]);
}

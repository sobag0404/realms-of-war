/**
 * Game rules module for "Realms of War".
 *
 * Re-exports all rule submodules for convenient importing.
 */

// ─── Movement Rules ──────────────────────────────────────────────────────────

export {
  canMoveTo,
  calculateMovementCost,
  getReachableHexes,
  applyMovement,
} from './movementRules';

export type { MovementResult } from './movementRules';

// ─── Combat Rules ────────────────────────────────────────────────────────────

export {
  canAttack,
  calculateCombat,
  applyCombat,
} from './combatRules';

export type { CombatResult, CombatBonus } from './combatRules';

// ─── Economy Rules ───────────────────────────────────────────────────────────

export {
  calculateIncome,
  calculateUpkeep,
  applyIncome,
  checkBankruptcy,
  getHexYield,
} from './economyRules';

// ─── Research Rules ──────────────────────────────────────────────────────────

export {
  canResearch,
  getAvailableTechs,
  calculateResearchProgress,
  applyResearch,
  getCurrentEra,
} from './researchRules';

// ─── City Rules ──────────────────────────────────────────────────────────────

export {
  canFoundCity,
  foundCity,
  calculateCityYield,
  applyCityGrowth,
  getCityTerritory,
  getAvailableBuildings,
} from './cityRules';

// ─── Recruitment Rules ───────────────────────────────────────────────────────

export {
  canRecruitUnit,
  getRecruitableUnits,
  getRecruitmentCost,
  startRecruitment,
  processRecruitment,
} from './recruitmentRules';

// ─── Diplomacy Rules ─────────────────────────────────────────────────────────

export {
  getDiplomacyStatus,
  canPropose,
  setDiplomacyStatus,
  isUnitInFriendlyTerritory,
  canEnterTerritory,
} from './diplomacyRules';

// ─── Victory Rules ───────────────────────────────────────────────────────────

export {
  checkVictory,
  hasWon,
  eliminatePlayer,
  isPlayerAlive,
} from './victoryRules';

export type { VictoryCheck } from './victoryRules';

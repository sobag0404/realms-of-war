/**
 * GameEngine — the main facade for "Realms of War".
 *
 * This class is the single entry-point for all game logic.  External code
 * (UI, AI, network) should never touch GameState or subsystems directly;
 * instead they dispatch commands through the engine and observe events
 * via the EventBus.
 *
 * Architecture:
 *   Command → validate (rules/) → apply (systems/) → events emitted by systems
 *
 * The engine is deterministic: given the same seed and the same sequence of
 * commands it will always produce the same state.  All randomness flows
 * through the seeded GameRng.
 *
 * Validation delegates to the rules/ module (pure predicate functions).
 * Application delegates to the ECS systems/ module (which in turn call
 * rules/ for the actual state transitions and emit events on the bus).
 */

import type { PlayerId } from './types';
import type { GameConfig } from './GameConfig';
import type { GameState } from './GameState';
import { createInitialGameState } from './GameState';
import { GameRng } from './GameRng';
import { CommandQueue } from './CommandQueue';
import type {
  GameCommand,
  MoveUnitCommand,
  AttackCommand,
  FoundCityCommand,
  BuildBuildingCommand,
  RecruitUnitCommand,
  ResearchTechnologyCommand,
  ChangeDiplomacyCommand,
  EndTurnCommand,
  HotseatSwitchCommand,
} from './CommandQueue';
import { EventBus } from './EventBus';

// ─── System imports ────────────────────────────────────────────────────────────

import { MovementSystem } from '../ecs/systems/MovementSystem';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { CitySystem } from '../ecs/systems/CitySystem';
import { ResearchSystem } from '../ecs/systems/ResearchSystem';
import { TurnSystem } from '../ecs/systems/TurnSystem';

// ─── Rules imports (validation only) ───────────────────────────────────────────

import { canAttack as rulesCanAttack } from '../rules/combatRules';
import { canMoveTo, validateMovementPath } from '../rules/movementRules';
import { canFoundCity } from '../rules/cityRules';
import { canRecruitUnit } from '../rules/recruitmentRules';
import { canResearch } from '../rules/researchRules';
import { canPropose, setDiplomacyStatus } from '../rules/diplomacyRules';
import { startRecruitment } from '../rules/recruitmentRules';
import { getAvailableBuildings } from '../rules/cityRules';
import {
  validateFortifyUnit,
  applyFortifyUnit,
  validateBuildImprovement,
  applyBuildImprovement,
  validateSellResource,
  applySellResource,
  validateBuyResource,
  applyBuyResource,
} from './commandHandlers';

// ─── Validation result ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ─── GameEngine ────────────────────────────────────────────────────────────────

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private rng: GameRng;
  private commandQueue: CommandQueue;
  private eventBus: EventBus;
  private executedCommands: GameCommand[] = [];

  constructor(config: GameConfig) {
    this.config = config;
    this.rng = new GameRng(config.seed);
    this.state = createInitialGameState(config);
    this.commandQueue = new CommandQueue();
    this.eventBus = new EventBus();
    this.eventBus.setTurn(this.state.turn);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Dispatch a command: validate → apply → return new state.
   * Throws if the command is invalid.
   *
   * Systems emit their own events during apply, so we no longer
   * need a separate emitCommandEvents() step.
   */
  dispatch(command: GameCommand): GameState {
    const validation = this.validateCommand(command);
    if (!validation.valid) {
      throw new EngineError(
        `Invalid command "${command.type}": ${validation.error ?? 'unknown error'}`,
      );
    }
    this.state = this.applyCommand(command);
    this.executedCommands.push(structuredClone(command));
    return this.state;
  }

  /**
   * Get the current game state as a read-only snapshot.
   * Callers must not mutate the returned object.
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Replace the internal game state with a new one.
   * Used for save/load: after constructing an engine with a config,
   * call setState() to restore a previously saved state.
   * Also updates the event bus turn counter.
   */
  setState(state: GameState): void {
    this.state = state;
    this.eventBus.setTurn(state.turn);
    this.executedCommands = [];
  }

  /** Access the event bus for subscribing to game events. */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /** Access the command queue (e.g. to pre-queue commands). */
  getCommandQueue(): CommandQueue {
    return this.commandQueue;
  }

  /** Get the log of all successfully executed commands. Returns a readonly copy. */
  getCommandLog(): readonly GameCommand[] {
    return this.executedCommands;
  }

  /** Restore a previously saved command log (used during loadSaveFile). */
  restoreCommandLog(commands: GameCommand[]): void {
    this.executedCommands = commands.map(c => structuredClone(c));
  }

  /** Access the PRNG (e.g. for map generation). */
  getRng(): GameRng {
    return this.rng;
  }

  /** Access the game config. */
  getConfig(): Readonly<GameConfig> {
    return this.config;
  }

  /**
   * Validate a command without executing it.
   * Returns `{ valid: true }` or `{ valid: false, error: "reason" }`.
   */
  validate(command: GameCommand): ValidationResult {
    return this.validateCommand(command);
  }

  /**
   * Process all queued commands in FIFO order.
   * Stops processing if any command is invalid (skips it with a warning).
   * Returns the final game state after all valid commands are applied.
   */
  processQueue(): GameState {
    while (!this.commandQueue.isEmpty) {
      const command = this.commandQueue.dequeue();
      if (!command) break;

      const validation = this.validateCommand(command);
      if (!validation.valid) {
        // Skip invalid commands silently — in production we'd log this
        continue;
      }
      this.state = this.applyCommand(command);
    }
    return this.state;
  }

  /**
   * End the current player's turn.
   * Delegates to TurnSystem.endTurn() which runs the full pipeline:
   * turn-end → victory check → advance → turn-start for next player.
   */
  endTurn(playerId: PlayerId): GameState {
    return this.dispatch({ type: 'EndTurn', playerId });
  }

  // ─── Private: Validation ─────────────────────────────────────────────────

  private validateCommand(command: GameCommand): ValidationResult {
    // Game-over check
    if (this.state.gameOver) {
      return { valid: false, error: 'Game is over' };
    }

    switch (command.type) {
      case 'MoveUnit':
        return this.validateMoveUnit(command);
      case 'Attack':
        return this.validateAttack(command);
      case 'FoundCity':
        return this.validateFoundCity(command);
      case 'BuildBuilding':
        return this.validateBuildBuilding(command);
      case 'RecruitUnit':
        return this.validateRecruitUnit(command);
      case 'ResearchTechnology':
        return this.validateResearchTechnology(command);
      case 'ChangeDiplomacy':
        return this.validateChangeDiplomacy(command);
      case 'EndTurn':
        return this.validateEndTurn(command);
      case 'HotseatSwitch':
        return this.validateHotseatSwitch(command);
      case 'FortifyUnit':
        return validateFortifyUnit(this.state, command);
      case 'BuildImprovement':
        return validateBuildImprovement(this.state, command);
      case 'SellResource':
        return validateSellResource(this.state, command);
      case 'BuyResource':
        return validateBuyResource(this.state, command);
      default:
        return { valid: false, error: `Unknown command type` };
    }
  }

  private validateMoveUnit(command: MoveUnitCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    if (command.path.length === 0) {
      return { valid: false, error: 'Path is empty' };
    }

    // Validate destination
    const destination = command.path[command.path.length - 1];
    const result = canMoveTo(this.state, command.entityId, destination);
    if (!result.canMove) {
      return { valid: false, error: result.reason ?? 'Cannot move to target' };
    }

    // Validate the full path step-by-step
    const pathResult = validateMovementPath(this.state, command.entityId, command.path);
    if (!pathResult.valid) {
      return { valid: false, error: pathResult.error ?? 'Invalid movement path' };
    }

    return { valid: true };
  }

  private validateAttack(command: AttackCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const targetId = command.targetEntityId ?? command.targetCityId;
    if (!targetId) {
      return { valid: false, error: 'No target specified' };
    }
    const result = rulesCanAttack(this.state, command.attackerId, targetId);
    if (!result.canAttack) {
      return { valid: false, error: result.reason ?? 'Cannot attack target' };
    }
    return { valid: true };
  }

  private validateFoundCity(command: FoundCityCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const result = canFoundCity(this.state, command.playerId, command.hex);
    if (!result.canFound) {
      return { valid: false, error: result.reason ?? 'Cannot found city here' };
    }
    return { valid: true };
  }

  private validateBuildBuilding(command: BuildBuildingCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const city = this.state.cities[command.cityId];
    if (!city) {
      return { valid: false, error: 'City not found' };
    }
    if (city.ownerId !== command.playerId) {
      return { valid: false, error: 'You do not own this city' };
    }
    // Check that the building is available for construction
    const available = getAvailableBuildings(this.state, command.cityId);
    if (!available.includes(command.buildingTypeId)) {
      return { valid: false, error: 'Building not available for construction' };
    }
    return { valid: true };
  }

  private validateRecruitUnit(command: RecruitUnitCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const result = canRecruitUnit(this.state, command.playerId, command.cityId, command.unitTypeId);
    if (!result.canRecruit) {
      return { valid: false, error: result.reason ?? 'Cannot recruit this unit' };
    }
    return { valid: true };
  }

  private validateResearchTechnology(command: ResearchTechnologyCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const result = canResearch(this.state, command.playerId, command.techId);
    if (!result.canResearch) {
      return { valid: false, error: result.reason ?? 'Cannot research this technology' };
    }
    return { valid: true };
  }

  private validateChangeDiplomacy(command: ChangeDiplomacyCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const result = canPropose(this.state, command.playerId, command.targetPlayerId, command.newStatus);
    if (!result.canPropose) {
      return { valid: false, error: result.reason ?? 'Cannot propose this diplomatic change' };
    }
    return { valid: true };
  }

  private validateEndTurn(command: EndTurnCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    return { valid: true };
  }

  private validateHotseatSwitch(command: HotseatSwitchCommand): ValidationResult {
    if (command.fromPlayerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not the active player' };
    }
    return { valid: true };
  }

  // ─── Private: Apply ──────────────────────────────────────────────────────

  /**
   * Apply a validated command to the state.
   * Delegates to the appropriate ECS system which handles
   * state transitions and event emission.
   */
  private applyCommand(command: GameCommand): GameState {
    switch (command.type) {
      case 'MoveUnit':
        return this.applyMoveUnit(command);
      case 'Attack':
        return this.applyAttack(command);
      case 'FoundCity':
        return this.applyFoundCity(command);
      case 'BuildBuilding':
        return this.applyBuildBuilding(command);
      case 'RecruitUnit':
        return this.applyRecruitUnit(command);
      case 'ResearchTechnology':
        return this.applyResearchTechnology(command);
      case 'ChangeDiplomacy':
        return this.applyChangeDiplomacy(command);
      case 'EndTurn':
        return this.applyEndTurn(command);
      case 'HotseatSwitch':
        return this.applyHotseatSwitch(command);
      case 'FortifyUnit':
        return applyFortifyUnit(this.state, command, this.eventBus);
      case 'BuildImprovement':
        return applyBuildImprovement(this.state, command, this.eventBus);
      case 'SellResource':
        return applySellResource(this.state, command, this.eventBus);
      case 'BuyResource':
        return applyBuyResource(this.state, command, this.eventBus);
      default:
        return this.state;
    }
  }

  private applyMoveUnit(command: MoveUnitCommand): GameState {
    return MovementSystem.process(this.state, command, this.eventBus);
  }

  private applyAttack(command: AttackCommand): GameState {
    return CombatSystem.process(this.state, command, this.eventBus);
  }

  private applyFoundCity(command: FoundCityCommand): GameState {
    return CitySystem.foundCity(this.state, command, this.eventBus);
  }

  private applyBuildBuilding(command: BuildBuildingCommand): GameState {
    return CitySystem.buildBuilding(this.state, command, this.eventBus);
  }

  private applyRecruitUnit(command: RecruitUnitCommand): GameState {
    // startRecruitment adds the unit to the city's production queue
    return startRecruitment(this.state, command.playerId, command.cityId, command.unitTypeId);
  }

  private applyResearchTechnology(command: ResearchTechnologyCommand): GameState {
    // Starts research (sets currentResearch), does NOT instantly complete it
    return ResearchSystem.startResearch(this.state, command.playerId, command.techId, this.eventBus);
  }

  private applyChangeDiplomacy(command: ChangeDiplomacyCommand): GameState {
    return setDiplomacyStatus(this.state, command.playerId, command.targetPlayerId, command.newStatus);
  }

  private applyEndTurn(command: EndTurnCommand): GameState {
    // TurnSystem.endTurn runs the full pipeline:
    // turn-end → victory check → advance turn → turn-start for next player
    return TurnSystem.endTurn(this.state, command.playerId, this.eventBus);
  }

  private applyHotseatSwitch(command: HotseatSwitchCommand): GameState {
    return {
      ...this.state,
      activePlayerId: command.toPlayerId,
    };
  }
}

// ─── Custom Error ──────────────────────────────────────────────────────────────

/**
 * Error thrown when a command fails validation during dispatch.
 * This is a typed error so callers can distinguish engine errors
 * from other runtime errors.
 */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

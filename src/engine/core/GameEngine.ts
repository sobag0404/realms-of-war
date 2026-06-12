/**
 * GameEngine — the main facade for "Realms of War".
 *
 * This class is the single entry-point for all game logic.  External code
 * (UI, AI, network) should never touch GameState or subsystems directly;
 * instead they dispatch commands through the engine and observe events
 * via the EventBus.
 *
 * Architecture:
 *   Command → validate → apply (immutable state update) → emit events
 *
 * The engine is deterministic: given the same seed and the same sequence of
 * commands it will always produce the same state.  All randomness flows
 * through the seeded GameRng.
 *
 * Current implementation uses inline placeholder logic for each command
 * type.  The rules/ module (built separately) will provide the real
 * validation and execution logic, which we'll plug in later.
 */

import type { PlayerId } from './types';
import type { GameConfig } from './GameConfig';
import type { GameState } from './GameState';
import { createInitialGameState } from './GameState';
import { GameRng } from './GameRng';
import { CommandQueue } from './CommandQueue';
import type { GameCommand } from './CommandQueue';
import { EventBus } from './EventBus';
import type { GameEventType } from './EventBus';

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
   * Dispatch a command: validate → apply → emit events.
   * Returns the new (immutable) game state.
   * Throws if the command is invalid.
   */
  dispatch(command: GameCommand): GameState {
    const validation = this.validateCommand(command);
    if (!validation.valid) {
      throw new EngineError(
        `Invalid command "${command.type}": ${validation.error ?? 'unknown error'}`,
      );
    }
    this.state = this.applyCommand(command);
    this.emitCommandEvents(command);
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
  }

  /** Access the event bus for subscribing to game events. */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /** Access the command queue (e.g. to pre-queue commands). */
  getCommandQueue(): CommandQueue {
    return this.commandQueue;
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
      this.emitCommandEvents(command);
    }
    return this.state;
  }

  /**
   * End the current player's turn.
   * Advances to the next player in turn order, or advances the global
   * turn counter if all players have acted.
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
      default:
        return { valid: false, error: `Unknown command type` };
    }
  }

  private validateMoveUnit(command: import('./CommandQueue').MoveUnitCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const entity = this.state.entities[command.entityId];
    if (!entity) {
      return { valid: false, error: 'Entity not found' };
    }
    if (entity.ownerId !== command.playerId) {
      return { valid: false, error: 'You do not own this unit' };
    }
    if (entity.movementPoints <= 0) {
      return { valid: false, error: 'No movement points remaining' };
    }
    if (command.path.length === 0) {
      return { valid: false, error: 'Path is empty' };
    }
    return { valid: true };
  }

  private validateAttack(command: import('./CommandQueue').AttackCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const attacker = this.state.entities[command.attackerId];
    if (!attacker) {
      return { valid: false, error: 'Attacker not found' };
    }
    if (attacker.ownerId !== command.playerId) {
      return { valid: false, error: 'You do not own the attacker' };
    }
    if (attacker.hasActed) {
      return { valid: false, error: 'Unit has already acted this turn' };
    }
    if (!command.targetEntityId && !command.targetCityId) {
      return { valid: false, error: 'No target specified' };
    }
    return { valid: true };
  }

  private validateFoundCity(command: import('./CommandQueue').FoundCityCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    // Check that no city already exists at this hex
    const hexKey = `${command.hex.q},${command.hex.r}`;
    for (const city of Object.values(this.state.cities)) {
      if (`${city.hex.q},${city.hex.r}` === hexKey) {
        return { valid: false, error: 'A city already exists at this hex' };
      }
    }
    return { valid: true };
  }

  private validateBuildBuilding(command: import('./CommandQueue').BuildBuildingCommand): ValidationResult {
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
    return { valid: true };
  }

  private validateRecruitUnit(command: import('./CommandQueue').RecruitUnitCommand): ValidationResult {
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
    return { valid: true };
  }

  private validateResearchTechnology(command: import('./CommandQueue').ResearchTechnologyCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    const player = this.state.players[command.playerId];
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }
    if (player.techs.includes(command.techId)) {
      return { valid: false, error: 'Technology already researched' };
    }
    return { valid: true };
  }

  private validateChangeDiplomacy(command: import('./CommandQueue').ChangeDiplomacyCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    if (!this.state.players[command.playerId]) {
      return { valid: false, error: 'Player not found' };
    }
    if (!this.state.players[command.targetPlayerId]) {
      return { valid: false, error: 'Target player not found' };
    }
    if (command.playerId === command.targetPlayerId) {
      return { valid: false, error: 'Cannot change diplomacy with yourself' };
    }
    return { valid: true };
  }

  private validateEndTurn(command: import('./CommandQueue').EndTurnCommand): ValidationResult {
    if (command.playerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not your turn' };
    }
    return { valid: true };
  }

  private validateHotseatSwitch(command: import('./CommandQueue').HotseatSwitchCommand): ValidationResult {
    if (command.fromPlayerId !== this.state.activePlayerId) {
      return { valid: false, error: 'Not the active player' };
    }
    return { valid: true };
  }

  // ─── Private: Apply ──────────────────────────────────────────────────────

  /**
   * Apply a validated command to the state.
   * Returns a new state object (immutable update pattern).
   *
   * NOTE: Current implementations are placeholders with basic logic.
   * The rules/ module will provide the authoritative implementations.
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
      default:
        return this.state;
    }
  }

  private applyMoveUnit(command: import('./CommandQueue').MoveUnitCommand): GameState {
    const entity = this.state.entities[command.entityId];
    if (!entity) return this.state;

    const destination = command.path[command.path.length - 1];
    // Placeholder: consume 1 movement point per hex in path
    const cost = command.path.length;

    return {
      ...this.state,
      entities: {
        ...this.state.entities,
        [command.entityId]: {
          ...entity,
          hex: destination,
          movementPoints: Math.max(0, entity.movementPoints - cost),
          hasMoved: true,
        },
      },
    };
  }

  private applyAttack(command: import('./CommandQueue').AttackCommand): GameState {
    let newState = { ...this.state };
    const attacker = newState.entities[command.attackerId];
    if (!attacker) return this.state;

    // Unit-vs-unit combat (placeholder)
    if (command.targetEntityId) {
      const defender = newState.entities[command.targetEntityId];
      if (!defender) return this.state;

      // Simple placeholder damage formula: attacker.attack - defender.defense / 2
      const damageToDefender = Math.max(1, attacker.attack - Math.floor(defender.defense / 2));
      const damageToAttacker = Math.max(0, Math.floor(defender.defense / 2) - Math.floor(attacker.defense / 3));

      const defenderHp = Math.max(0, defender.hp - damageToDefender);
      const attackerHp = Math.max(0, attacker.hp - damageToAttacker);

      const updatedEntities = { ...newState.entities };

      if (defenderHp <= 0) {
        // Defender killed — remove from state
        const { [command.targetEntityId]: _removed, ...remaining } = updatedEntities;
        updatedEntities[command.attackerId] = {
          ...attacker,
          hp: attackerHp,
          hasActed: true,
          xp: attacker.xp + 10,
        };
        newState = { ...newState, entities: remaining };
      } else {
        updatedEntities[command.targetEntityId] = { ...defender, hp: defenderHp };
        updatedEntities[command.attackerId] = {
          ...attacker,
          hp: attackerHp,
          hasActed: true,
        };
        newState = { ...newState, entities: updatedEntities };
      }
    }

    // Unit-vs-City combat (placeholder)
    if (command.targetCityId) {
      const city = newState.cities[command.targetCityId];
      if (!city) return this.state;

      const damageToCity = Math.max(1, attacker.attack - Math.floor(city.wallHp > 0 ? city.maxWallHp / 4 : 0));

      const newWallHp = city.wallHp > 0 ? Math.max(0, city.wallHp - damageToCity) : 0;
      const cityHpAfterWall = newWallHp === 0 && city.wallHp > 0
        ? city.hp
        : newWallHp === 0
          ? Math.max(0, city.hp - damageToCity)
          : city.hp;

      const updatedCities = { ...newState.cities };
      updatedCities[command.targetCityId] = {
        ...city,
        wallHp: newWallHp,
        hp: cityHpAfterWall,
      };

      const updatedEntities = { ...newState.entities };
      updatedEntities[command.attackerId] = {
        ...attacker,
        hasActed: true,
      };

      newState = {
        ...newState,
        cities: updatedCities,
        entities: updatedEntities,
      };
    }

    return newState;
  }

  private applyFoundCity(command: import('./CommandQueue').FoundCityCommand): GameState {
    const cityId = `city-${Date.now()}-${this.rng.int(0, 9999)}`;
    const newCity: import('./GameState').CityState = {
      id: cityId,
      name: command.name,
      hex: command.hex,
      ownerId: command.playerId,
      level: 1,
      population: 1,
      hp: 100,
      maxHp: 100,
      wallHp: 0,
      maxWallHp: 50,
      buildings: [],
      growthProgress: 0,
      growthTarget: 10,
      workedHexes: [],
      productionQueue: [],
      productionPerTurn: 1,
      foodPerTurn: 2,
      territory: [`${command.hex.q},${command.hex.r}`],
      isUnderSiege: false,
      foundedTurn: this.state.turn,
    };

    return {
      ...this.state,
      cities: {
        ...this.state.cities,
        [cityId]: newCity,
      },
    };
  }

  private applyBuildBuilding(command: import('./CommandQueue').BuildBuildingCommand): GameState {
    const city = this.state.cities[command.cityId];
    if (!city) return this.state;

    // Placeholder: add building directly (no production queue logic yet)
    return {
      ...this.state,
      cities: {
        ...this.state.cities,
        [command.cityId]: {
          ...city,
          buildings: [...city.buildings, command.buildingTypeId],
        },
      },
    };
  }

  private applyRecruitUnit(command: import('./CommandQueue').RecruitUnitCommand): GameState {
    const city = this.state.cities[command.cityId];
    if (!city) return this.state;

    // Placeholder: create a basic unit at the city hex
    const entityId = `unit-${Date.now()}-${this.rng.int(0, 9999)}`;
    const newEntity: import('./GameState').EntityData = {
      id: entityId,
      typeId: command.unitTypeId,
      ownerId: command.playerId,
      hex: city.hex,
      movementPoints: 3,
      maxMovement: 3,
      hp: 100,
      maxHp: 100,
      attack: 5,
      defense: 3,
      attackType: 'melee',
      range: 1,
      hasActed: false,
      hasMoved: false,
      xp: 0,
      level: 1,
      promotions: [],
      upkeep: { gold: 1 },
      abilities: [],
      statusEffects: [],
    };

    return {
      ...this.state,
      entities: {
        ...this.state.entities,
        [entityId]: newEntity,
      },
    };
  }

  private applyResearchTechnology(command: import('./CommandQueue').ResearchTechnologyCommand): GameState {
    const player = this.state.players[command.playerId];
    if (!player) return this.state;

    // Placeholder: instantly complete the research
    return {
      ...this.state,
      players: {
        ...this.state.players,
        [command.playerId]: {
          ...player,
          techs: [...player.techs, command.techId],
          currentResearch: null,
          researchProgress: 0,
        },
      },
    };
  }

  private applyChangeDiplomacy(command: import('./CommandQueue').ChangeDiplomacyCommand): GameState {
    // DiplomacyMap is indexed by "playerA:playerB" (always sorted alphabetically)
    const key = [command.playerId, command.targetPlayerId].sort().join(':');
    const existing = this.state.diplomacy[key];

    const updatedDiplomacy = {
      ...this.state.diplomacy,
      [key]: {
        status: command.newStatus,
        sinceTurn: this.state.turn,
        peaceTreatyTurns: command.newStatus === 'peace' ? 10 : (existing?.peaceTreatyTurns ?? 0),
      },
    };

    return {
      ...this.state,
      diplomacy: updatedDiplomacy,
    };
  }

  private applyEndTurn(_command: import('./CommandQueue').EndTurnCommand): GameState {
    const turnOrder = this.state.turnOrder;
    const currentIdx = turnOrder.indexOf(this.state.activePlayerId);
    const nextIdx = (currentIdx + 1) % turnOrder.length;
    const isFullCycle = nextIdx === 0;
    const newTurn = isFullCycle ? this.state.turn + 1 : this.state.turn;
    const nextPlayerId = turnOrder[nextIdx];

    // Reset movement and action flags for the next player's units
    const updatedEntities = { ...this.state.entities };
    for (const [id, entity] of Object.entries(updatedEntities)) {
      if (entity.ownerId === nextPlayerId) {
        updatedEntities[id] = {
          ...entity,
          movementPoints: entity.maxMovement,
          hasMoved: false,
          hasActed: false,
        };
      }
    }

    // Update the event bus turn counter
    this.eventBus.setTurn(newTurn);

    return {
      ...this.state,
      turn: newTurn,
      activePlayerId: nextPlayerId,
      phase: isFullCycle ? 'start' : 'playerActions',
      entities: updatedEntities,
    };
  }

  private applyHotseatSwitch(command: import('./CommandQueue').HotseatSwitchCommand): GameState {
    return {
      ...this.state,
      activePlayerId: command.toPlayerId,
    };
  }

  // ─── Private: Event Emission ─────────────────────────────────────────────

  /**
   * Emit events corresponding to a successfully applied command.
   * These are lightweight notifications — the heavy lifting is done
   * in applyCommand above.
   */
  private emitCommandEvents(command: GameCommand): void {
    switch (command.type) {
      case 'MoveUnit': {
        const entity = this.state.entities[command.entityId];
        if (entity) {
          this.eventBus.emit('UnitMoved', {
            entityId: command.entityId,
            from: command.path[0],
            to: command.path[command.path.length - 1],
            remainingMP: entity.movementPoints,
          });
        }
        break;
      }

      case 'Attack': {
        this.eventBus.emit('AttackStarted', {
          attackerId: command.attackerId,
          defenderId: command.targetEntityId,
          targetCityId: command.targetCityId,
          attackType: 'melee', // placeholder
        });

        // If the target entity was killed
        if (command.targetEntityId && !this.state.entities[command.targetEntityId]) {
          this.eventBus.emit('UnitKilled', {
            entityId: command.targetEntityId,
            killedBy: command.playerId,
            position: { q: 0, r: 0 }, // placeholder — actual position lost after removal
          });
        }
        break;
      }

      case 'FoundCity': {
        // Find the newly created city
        const newCity = Object.values(this.state.cities).find(
          (c) => c.ownerId === command.playerId && `${c.hex.q},${c.hex.r}` === `${command.hex.q},${command.hex.r}`,
        );
        if (newCity) {
          this.eventBus.emit('CityFounded', {
            cityId: newCity.id,
            name: command.name,
            hex: command.hex,
            ownerId: command.playerId,
          });
        }
        break;
      }

      case 'BuildBuilding': {
        this.eventBus.emit('BuildingCompleted', {
          cityId: command.cityId,
          buildingType: command.buildingTypeId,
        });
        break;
      }

      case 'ResearchTechnology': {
        this.eventBus.emit('TechnologyCompleted', {
          playerId: command.playerId,
          techId: command.techId,
        });
        break;
      }

      case 'EndTurn': {
        this.eventBus.emit('TurnStarted', {
          turn: this.state.turn,
          playerId: this.state.activePlayerId,
        });
        break;
      }

      default:
        // HotseatSwitch, RecruitUnit — no specific events yet
        break;
    }
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

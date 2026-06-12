/**
 * Command queue for "Realms of War".
 *
 * All player and AI actions are encoded as `GameCommand` objects and placed in
 * a queue.  The engine processes them one-at-a-time in FIFO order, ensuring
 * deterministic execution and enabling replay / undo.
 *
 * Commands are pure data — no functions, no references to runtime objects.
 */

import type { CityId, DiplomacyStatus, EntityId, HexCoord, PlayerId } from './types';

// ─── Command Types ────────────────────────────────────────────────────────────

export type GameCommandType =
  | 'MoveUnit'
  | 'Attack'
  | 'FoundCity'
  | 'BuildBuilding'
  | 'RecruitUnit'
  | 'ResearchTechnology'
  | 'ChangeDiplomacy'
  | 'EndTurn'
  | 'HotseatSwitch';

// ─── Command Payloads ─────────────────────────────────────────────────────────

export interface MoveUnitCommand {
  type: 'MoveUnit';
  playerId: PlayerId;
  entityId: EntityId;
  path: HexCoord[];
}

export interface AttackCommand {
  type: 'Attack';
  playerId: PlayerId;
  attackerId: EntityId;
  /** Target entity ID (for unit-vs-unit). */
  targetEntityId: EntityId | null;
  /** Target city ID (for unit-vs-city). */
  targetCityId: CityId | null;
}

export interface FoundCityCommand {
  type: 'FoundCity';
  playerId: PlayerId;
  /** Hex where the city is founded. */
  hex: HexCoord;
  /** Name chosen for the city. */
  name: string;
}

export interface BuildBuildingCommand {
  type: 'BuildBuilding';
  playerId: PlayerId;
  cityId: CityId;
  buildingTypeId: string;
}

export interface RecruitUnitCommand {
  type: 'RecruitUnit';
  playerId: PlayerId;
  cityId: CityId;
  unitTypeId: string;
}

export interface ResearchTechnologyCommand {
  type: 'ResearchTechnology';
  playerId: PlayerId;
  techId: string;
}

export interface ChangeDiplomacyCommand {
  type: 'ChangeDiplomacy';
  playerId: PlayerId;
  targetPlayerId: PlayerId;
  newStatus: DiplomacyStatus;
}

export interface EndTurnCommand {
  type: 'EndTurn';
  playerId: PlayerId;
}

export interface HotseatSwitchCommand {
  type: 'HotseatSwitch';
  /** ID of the player who is ending their turn. */
  fromPlayerId: PlayerId;
  /** ID of the next player in hotseat rotation. */
  toPlayerId: PlayerId;
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type GameCommand =
  | MoveUnitCommand
  | AttackCommand
  | FoundCityCommand
  | BuildBuildingCommand
  | RecruitUnitCommand
  | ResearchTechnologyCommand
  | ChangeDiplomacyCommand
  | EndTurnCommand
  | HotseatSwitchCommand;

// ─── Queue ────────────────────────────────────────────────────────────────────

export class CommandQueue {
  private queue: GameCommand[] = [];

  /** Add a command to the end of the queue. */
  enqueue(command: GameCommand): void {
    this.queue.push(command);
  }

  /** Remove and return the command at the front of the queue. */
  dequeue(): GameCommand | undefined {
    return this.queue.shift();
  }

  /** Look at the front command without removing it. */
  peek(): GameCommand | undefined {
    return this.queue[0];
  }

  /** Remove all commands from the queue. */
  clear(): void {
    this.queue = [];
  }

  /** Number of commands currently in the queue. */
  get size(): number {
    return this.queue.length;
  }

  /** Whether the queue is empty. */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Return all commands in the queue without removing them.
   * Useful for validation or replay serialization.
   */
  toArray(): readonly GameCommand[] {
    return this.queue;
  }

  /**
   * Remove all commands of a specific type from the queue.
   * Returns the number of removed commands.
   */
  removeByType(type: GameCommandType): number {
    const before = this.queue.length;
    this.queue = this.queue.filter((cmd) => cmd.type !== type);
    return before - this.queue.length;
  }

  /**
   * Remove all commands from a specific player.
   * Useful when a player disconnects or their turn is force-ended.
   * Returns the number of removed commands.
   */
  removeByPlayer(playerId: PlayerId): number {
    const before = this.queue.length;
    this.queue = this.queue.filter((cmd) => {
      const p = cmd as unknown as Record<string, unknown>;
      return p['playerId'] !== playerId && p['fromPlayerId'] !== playerId;
    });
    return before - this.queue.length;
  }
}

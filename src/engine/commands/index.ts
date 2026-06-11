/**
 * Commands barrel — re-exports all command types and utilities from CommandQueue.
 */

export type {
  GameCommandType,
  MoveUnitCommand,
  AttackCommand,
  FoundCityCommand,
  BuildBuildingCommand,
  RecruitUnitCommand,
  ResearchTechnologyCommand,
  EndTurnCommand,
  HotseatSwitchCommand,
  GameCommand,
} from '../core/CommandQueue';

export { CommandQueue } from '../core/CommandQueue';

// ─── Command utilities ─────────────────────────────────────────────────────────

import type { GameCommand, GameCommandType } from '../core/CommandQueue';

/**
 * Get the player ID associated with a command.
 * Works for all command types including HotseatSwitch.
 */
export function getCommandPlayerId(command: GameCommand): string {
  if (command.type === 'HotseatSwitch') {
    return command.fromPlayerId;
  }
  return command.playerId;
}

/**
 * Check if a command is of a specific type.
 * Useful for filtering command arrays.
 */
export function isCommandType<T extends GameCommandType>(
  command: GameCommand,
  type: T,
): command is Extract<GameCommand, { type: T }> {
  return command.type === type;
}

/**
 * AI System for "Realms of War".
 *
 * Generates AI commands for a player's turn using utility-based scoring.
 * The AI evaluates strategic priorities and produces a list of commands
 * without executing them directly (the engine must dispatch them).
 *
 * Priority heuristics:
 * - No cities → expand (found city)
 * - Gold < 10 → economy (build income buildings)
 * - Enemy nearby → military (recruit/attack)
 * - Otherwise → research or expand
 */

import type { PlayerId, HexCoord, ResourceId, ResourceYield } from '../../core/types';
import type { GameState, EntityData } from '../../core/GameState';
import type { GameCommand, MoveUnitCommand, AttackCommand, FoundCityCommand, BuildBuildingCommand, RecruitUnitCommand, ResearchTechnologyCommand, EndTurnCommand } from '../../core/CommandQueue';
import type { EventBus } from '../../core/EventBus';
import { hexKey, hexDistance, hexRing, HEX_DIRECTIONS } from '../../core/types';
import { getReachableHexes } from '../../rules/movementRules';
import { canAttack } from '../../rules/combatRules';
import { canFoundCity } from '../../rules/cityRules';
import { getAvailableBuildings } from '../../rules/cityRules';
import { getRecruitableUnits, getRecruitmentCost } from '../../rules/recruitmentRules';
import { getAvailableTechs, canResearch } from '../../rules/researchRules';
import { BUILDINGS } from '../../../data/buildings';
import { UNIT_TYPES } from '../../../data/units';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Strategic priority with weight. */
export interface AiPriority {
  type: 'expand' | 'military' | 'economy' | 'research' | 'defend';
  weight: number;
}

// ─── AiSystem ──────────────────────────────────────────────────────────────────

export class AiSystem {
  /**
   * Generate and queue AI commands for a player's turn.
   *
   * Evaluates the current game state, determines priorities, and
   * generates a sequence of commands. Returns the commands without
   * executing them — the engine must dispatch them.
   *
   * @param state - Current game state
   * @param playerId - AI player generating commands
   * @param eventBus - Event bus (not used for command generation, but available)
   * @returns Array of commands the AI wants to execute this turn
   */
  static generateTurn(
    state: GameState,
    playerId: PlayerId,
    eventBus: EventBus,
  ): GameCommand[] {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return [];

    const commands: GameCommand[] = [];
    const priorities = AiSystem.evaluatePriorities(state, playerId);

    // Sort priorities by weight (highest first)
    const sorted = [...priorities].sort((a, b) => b.weight - a.weight);

    // Track what we've done this turn
    let hasMovedUnits = false;
    let hasAttacked = false;
    let hasBuilt = false;
    let hasResearched = false;
    let hasRecruited = false;

    // Process each priority
    for (const priority of sorted) {
      if (priority.weight <= 0) continue;

      switch (priority.type) {
        case 'expand': {
          // Try to found a city with a settler
          const settlerUnits = Object.values(state.entities).filter(
            (e) => e.ownerId === playerId && e.typeId === 'settler',
          );

          for (const settler of settlerUnits) {
            // Find a good location near the settler
            const bestHex = AiSystem.findBestCityLocation(state, playerId, settler.hex);
            if (bestHex) {
              // Move settler toward the location
              if (hexDistance(settler.hex, bestHex) > 0) {
                const moveCmd: MoveUnitCommand = {
                  type: 'MoveUnit',
                  playerId,
                  entityId: settler.id,
                  path: [settler.hex, bestHex],
                };
                commands.push(moveCmd);
                hasMovedUnits = true;
              }

              // Found city if settler is at the location
              if (hexDistance(settler.hex, bestHex) <= 1) {
                const foundCmd: FoundCityCommand = {
                  type: 'FoundCity',
                  playerId,
                  hex: bestHex,
                  name: `City ${Object.values(state.cities).filter(c => c.ownerId === playerId).length + 1}`,
                };
                commands.push(foundCmd);
              }
            }
          }
          break;
        }

        case 'military': {
          // Attack nearby enemies
          const playerUnits = Object.values(state.entities).filter(
            (e) => e.ownerId === playerId && !e.hasActed,
          );

          for (const unit of playerUnits) {
            // Find nearby enemy units
            const enemyUnits = Object.values(state.entities).filter(
              (e) => e.ownerId !== playerId && e.hp > 0,
            );

            let closestEnemy: EntityData | null = null;
            let closestDist = Infinity;
            for (const enemy of enemyUnits) {
              const dist = hexDistance(unit.hex, enemy.hex);
              if (dist < closestDist && dist <= unit.range + 2) {
                closestDist = dist;
                closestEnemy = enemy;
              }
            }

            if (closestEnemy && closestDist <= unit.range) {
              // Attack
              const attackCmd: AttackCommand = {
                type: 'Attack',
                playerId,
                attackerId: unit.id,
                targetEntityId: closestEnemy.id,
                targetCityId: null,
              };
              commands.push(attackCmd);
              hasAttacked = true;
            } else if (closestEnemy && !unit.hasMoved) {
              // Move toward enemy
              const moveCmd: MoveUnitCommand = {
                type: 'MoveUnit',
                playerId,
                entityId: unit.id,
                path: [unit.hex, closestEnemy.hex],
              };
              commands.push(moveCmd);
              hasMovedUnits = true;
            }
          }

          // Recruit military units in cities
          const playerCities = Object.values(state.cities).filter(
            (c) => c.ownerId === playerId,
          );

          for (const city of playerCities) {
            const recruitable = getRecruitableUnits(state, city.id);
            // Prefer military units (not settler/worker)
            const militaryUnits = recruitable.filter(
              (id) => id !== 'settler' && id !== 'worker' && id !== 'scout',
            );
            const unitToRecruit = militaryUnits[0] ?? recruitable[0];

            if (unitToRecruit && !hasRecruited) {
              const recruitCmd: RecruitUnitCommand = {
                type: 'RecruitUnit',
                playerId,
                cityId: city.id,
                unitTypeId: unitToRecruit,
              };
              commands.push(recruitCmd);
              hasRecruited = true;
              break; // Only recruit once per turn
            }
          }
          break;
        }

        case 'economy': {
          // Build income-generating buildings
          const playerCities = Object.values(state.cities).filter(
            (c) => c.ownerId === playerId,
          );

          for (const city of playerCities) {
            const available = getAvailableBuildings(state, city.id);
            // Prefer economy buildings
            const economyBuildings = ['granary', 'market', 'bank', 'workshop', 'guild_hall'];
            const preferred = available.find((b) => economyBuildings.includes(b));

            if (preferred && !hasBuilt) {
              const buildCmd: BuildBuildingCommand = {
                type: 'BuildBuilding',
                playerId,
                cityId: city.id,
                buildingTypeId: preferred,
              };
              commands.push(buildCmd);
              hasBuilt = true;
              break; // Only build once per turn
            }
          }
          break;
        }

        case 'research': {
          // Start research if not already researching
          if (!player.currentResearch && !hasResearched) {
            const availableTechs = getAvailableTechs(state, playerId);
            if (availableTechs.length > 0) {
              // Prefer economy/science techs first
              const preferredTechs = ['writing', 'trade', 'craftsmanship', 'scholarship'];
              const preferred = availableTechs.find((t) => preferredTechs.includes(t));
              const techToResearch = preferred ?? availableTechs[0];

              const researchCmd: ResearchTechnologyCommand = {
                type: 'ResearchTechnology',
                playerId,
                techId: techToResearch,
              };
              commands.push(researchCmd);
              hasResearched = true;
            }
          }
          break;
        }

        case 'defend': {
          // Move units toward threatened cities
          const playerCities = Object.values(state.cities).filter(
            (c) => c.ownerId === playerId,
          );

          for (const city of playerCities) {
            // Check for nearby enemies
            const nearbyEnemies = Object.values(state.entities).filter(
              (e) => e.ownerId !== playerId &&
                     hexDistance(e.hex, city.hex) <= 4,
            );

            if (nearbyEnemies.length > 0) {
              // Move idle units toward the city
              const idleUnits = Object.values(state.entities).filter(
                (e) => e.ownerId === playerId &&
                       !e.hasMoved &&
                       hexDistance(e.hex, city.hex) > 1 &&
                       e.typeId !== 'settler' &&
                       e.typeId !== 'worker',
              );

              for (const unit of idleUnits.slice(0, 2)) {
                const moveCmd: MoveUnitCommand = {
                  type: 'MoveUnit',
                  playerId,
                  entityId: unit.id,
                  path: [unit.hex, city.hex],
                };
                commands.push(moveCmd);
                hasMovedUnits = true;
              }
            }
          }
          break;
        }
      }
    }

    // Always end turn
    const endTurnCmd: EndTurnCommand = {
      type: 'EndTurn',
      playerId,
    };
    commands.push(endTurnCmd);

    return commands;
  }

  /**
   * Evaluate strategic priorities for a player.
   *
   * Uses simple heuristics to determine what the AI should focus on.
   *
   * @param state - Current game state
   * @param playerId - Player to evaluate
   * @returns Array of priorities with weights (0-100)
   */
  static evaluatePriorities(state: GameState, playerId: PlayerId): AiPriority[] {
    const player = state.players[playerId];
    if (!player || !player.isAlive) return [];

    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );
    const playerUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId,
    );
    const gold = player.resources.gold ?? 0;

    const priorities: AiPriority[] = [];

    // ─── Expand: If no cities or few cities ─────────────────────────────
    const expandWeight = playerCities.length === 0 ? 100 :
                        playerCities.length <= 2 ? 60 :
                        playerCities.length <= 4 ? 30 : 10;
    priorities.push({ type: 'expand', weight: expandWeight });

    // ─── Economy: If gold is low ────────────────────────────────────────
    const economyWeight = gold < 10 ? 80 :
                         gold < 30 ? 50 :
                         gold < 100 ? 20 : 5;
    priorities.push({ type: 'economy', weight: economyWeight });

    // ─── Military: If enemies are nearby ────────────────────────────────
    let enemyNearby = false;
    for (const city of playerCities) {
      const nearbyEnemies = Object.values(state.entities).filter(
        (e) => e.ownerId !== playerId &&
               hexDistance(e.hex, city.hex) <= 5,
      );
      if (nearbyEnemies.length > 0) {
        enemyNearby = true;
        break;
      }
    }

    const militaryWeight = enemyNearby ? 70 :
                          playerUnits.filter(u => u.typeId !== 'settler' && u.typeId !== 'worker').length < 3 ? 50 : 20;
    priorities.push({ type: 'military', weight: militaryWeight });

    // ─── Research: If not researching and have cities ───────────────────
    const researchWeight = !player.currentResearch && playerCities.length > 0 ? 40 :
                          player.techs.length < 5 ? 30 : 15;
    priorities.push({ type: 'research', weight: researchWeight });

    // ─── Defend: If cities are threatened ───────────────────────────────
    let threatenedCities = 0;
    for (const city of playerCities) {
      const nearbyEnemies = Object.values(state.entities).filter(
        (e) => e.ownerId !== playerId &&
               hexDistance(e.hex, city.hex) <= 3,
      );
      if (nearbyEnemies.length > 0) threatenedCities++;
    }
    const defendWeight = threatenedCities > 0 ? 60 + threatenedCities * 10 : 5;
    priorities.push({ type: 'defend', weight: Math.min(defendWeight, 90) });

    return priorities;
  }

  /**
   * Score a potential action.
   *
   * Returns a numeric score (higher = more desirable) for a given command.
   * Used by the AI to compare alternative actions.
   *
   * @param state - Current game state
   * @param playerId - Player considering the action
   * @param action - The command to score
   * @returns Score from 0 to 100
   */
  static scoreAction(state: GameState, playerId: PlayerId, action: GameCommand): number {
    const player = state.players[playerId];
    if (!player) return 0;

    switch (action.type) {
      case 'FoundCity': {
        const playerCities = Object.values(state.cities).filter(
          (c) => c.ownerId === playerId,
        );
        // More valuable when you have fewer cities
        return playerCities.length === 0 ? 100 :
               playerCities.length <= 2 ? 70 : 30;
      }

      case 'BuildBuilding': {
        const gold = player.resources.gold ?? 0;
        // Economy buildings are more valuable when gold is low
        const economyBuildings = ['granary', 'market', 'bank', 'workshop'];
        if (economyBuildings.includes(action.buildingTypeId) && gold < 30) return 75;
        if (economyBuildings.includes(action.buildingTypeId)) return 50;
        // Military buildings
        const militaryBuildings = ['barracks', 'archery_range', 'siege_yard'];
        if (militaryBuildings.includes(action.buildingTypeId)) return 60;
        // Science buildings
        const scienceBuildings = ['library', 'university'];
        if (scienceBuildings.includes(action.buildingTypeId)) return 45;
        return 40;
      }

      case 'RecruitUnit': {
        const militaryUnits = Object.values(state.entities).filter(
          (e) => e.ownerId === playerId &&
                 e.typeId !== 'settler' &&
                 e.typeId !== 'worker',
        );
        // More valuable when military is small
        return militaryUnits.length < 3 ? 70 :
               militaryUnits.length < 6 ? 50 : 30;
      }

      case 'Attack': {
        // Attacking is valuable when we have HP advantage
        const attacker = state.entities[action.attackerId];
        const defender = action.targetEntityId
          ? state.entities[action.targetEntityId]
          : null;
        if (!attacker || !defender) return 30;
        return attacker.hp > defender.hp * 1.5 ? 80 :
               attacker.hp > defender.hp ? 60 : 35;
      }

      case 'ResearchTechnology': {
        return !player.currentResearch ? 60 : 0;
      }

      case 'MoveUnit': {
        // Movement is situational — moderate base score
        return 40;
      }

      case 'EndTurn': {
        return 0; // EndTurn is always added last regardless of score
      }

      default:
        return 25;
    }
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────

  /**
   * Find the best hex to found a city near a given position.
   *
   * Evaluates candidate hexes based on:
   * - Terrain yield
   * - Proximity to resources
   * - Distance from existing cities (prefer spread out)
   * - Walkability
   */
  private static findBestCityLocation(
    state: GameState,
    playerId: PlayerId,
    nearHex: HexCoord,
  ): HexCoord | null {
    const searchRadius = 5;
    let bestHex: HexCoord | null = null;
    let bestScore = -1;

    // Check hexes in a radius around the settler
    for (let r = 0; r <= searchRadius; r++) {
      const ring = r === 0 ? [nearHex] : hexRing(nearHex, r);
      for (const hex of ring) {
        const key = hexKey(hex);
        const tile = state.map.tiles[key];
        if (!tile) continue;

        // Must be walkable land
        if (tile.terrain === 'mountain' || tile.terrain === 'water') continue;

        // Check if can found city here
        const result = canFoundCity(state, playerId, hex);
        if (!result.canFound) continue;

        // Score this location
        let score = 0;

        // Prefer hexes with resources
        if (tile.resource) score += 20;

        // Prefer hexes near the settler (closer = can found sooner)
        const dist = hexDistance(nearHex, hex);
        score += Math.max(0, 10 - dist * 2);

        // Prefer hexes far from existing cities (spread out)
        const playerCities = Object.values(state.cities).filter(
          (c) => c.ownerId === playerId,
        );
        for (const city of playerCities) {
          const cityDist = hexDistance(city.hex, hex);
          if (cityDist < 4) score -= 15; // Too close to another city
          else if (cityDist < 7) score += 5;  // Good distance
          else score += 2;
        }

        // Count adjacent walkable hexes (more = better for territory)
        let adjWalkable = 0;
        for (let d = 0; d < 6; d++) {
          const adjKey = hexKey({
            q: hex.q + HEX_DIRECTIONS[d].q,
            r: hex.r + HEX_DIRECTIONS[d].r,
          });
          const adjTile = state.map.tiles[adjKey];
          if (adjTile && adjTile.terrain !== 'mountain' && adjTile.terrain !== 'water') {
            adjWalkable++;
          }
        }
        score += adjWalkable * 2;

        if (score > bestScore) {
          bestScore = score;
          bestHex = hex;
        }
      }
    }

    return bestHex;
  }
}

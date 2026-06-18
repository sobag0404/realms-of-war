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
import type { EventBus, GameEventMap } from '../../core/EventBus';
import { hexKey, hexDistance, hexRing, HEX_DIRECTIONS } from '../../core/types';
import { findPath } from '../../hex/pathfinding';
import { canFoundCity } from '../../rules/cityRules';
import { getAvailableBuildings } from '../../rules/cityRules';
import { getRecruitableUnits } from '../../rules/recruitmentRules';
import { getAvailableTechs } from '../../rules/researchRules';
import { calculateMovementCost } from '../../rules/movementRules';
import { TERRAIN_TYPES } from '../../../data/terrain';
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
    let hasResearched = false;
    let hasPlannedProduction = false;

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
            const canFoundHere = canFoundCity(state, playerId, settler.hex);
            if (canFoundHere.canFound) {
              const foundCmd: FoundCityCommand = {
                type: 'FoundCity',
                playerId,
                hex: settler.hex,
                name: `City ${Object.values(state.cities).filter(c => c.ownerId === playerId).length + 1}`,
              };
              commands.push(foundCmd);
              continue;
            }

            // Find a good location near the settler
            const bestHex = AiSystem.findBestCityLocation(state, playerId, settler.hex);
            if (bestHex) {
              // Move settler toward the location
              const path = AiSystem.findMovementPathToward(state, settler, bestHex);
              if (path) {
                const moveCmd: MoveUnitCommand = {
                  type: 'MoveUnit',
                  playerId,
                  entityId: settler.id,
                  path,
                };
                commands.push(moveCmd);
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
            } else if (closestEnemy && !unit.hasMoved) {
              // Move toward enemy
              const path = AiSystem.findMovementPathToward(state, unit, closestEnemy.hex, true);
              if (path) {
                const moveCmd: MoveUnitCommand = {
                  type: 'MoveUnit',
                  playerId,
                  entityId: unit.id,
                  path,
                };
                commands.push(moveCmd);
              }
            }
          }

          if (!hasPlannedProduction) {
            commands.push(...AiSystem.planIdleCityProduction(state, playerId, 'military'));
            hasPlannedProduction = true;
          }
          break;
        }

        case 'economy': {
          if (!hasPlannedProduction) {
            commands.push(...AiSystem.planIdleCityProduction(state, playerId, 'economy'));
            hasPlannedProduction = true;
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
                const path = AiSystem.findMovementPathToward(state, unit, city.hex, true);
                if (path) {
                  const moveCmd: MoveUnitCommand = {
                    type: 'MoveUnit',
                    playerId,
                    entityId: unit.id,
                    path,
                  };
                  commands.push(moveCmd);
                }
              }
            }
          }
          break;
        }
      }
    }

    if (!hasPlannedProduction) {
      commands.push(...AiSystem.planIdleCityProduction(state, playerId, 'balanced'));
    }

    eventBus.emit('AiPressureChanged', AiSystem.createPressureReport(
      state,
      playerId,
      commands,
      sorted[0]?.type ?? 'none',
    ));

    // Always end turn
    const endTurnCmd: EndTurnCommand = {
      type: 'EndTurn',
      playerId,
    };
    commands.push(endTurnCmd);

    return commands;
  }

  static createPressureReport(
    state: GameState,
    playerId: PlayerId,
    plannedCommands: readonly GameCommand[] = [],
    primaryFocus = AiSystem.evaluatePriorities(state, playerId)
      .sort((a, b) => b.weight - a.weight)[0]?.type ?? 'none',
  ): GameEventMap['AiPressureChanged'] {
    const player = state.players[playerId];
    const cities = Object.values(state.cities).filter((city) => city.ownerId === playerId);
    const units = Object.values(state.entities).filter((entity) => entity.ownerId === playerId);
    const militaryUnits = units.filter(
      (unit) => unit.typeId !== 'settler' && unit.typeId !== 'worker',
    );
    const productionItems = cities.flatMap((city) => city.productionQueue);
    const queuedUnitCount = productionItems.filter((item) => item.kind === 'unit').length;
    const queuedBuildingCount = productionItems.filter((item) => item.kind === 'building').length;
    const plannedProduction: GameEventMap['AiPressureChanged']['plannedProduction'] = [];
    for (const command of plannedCommands) {
      if (command.type === 'BuildBuilding') {
        plannedProduction.push({ cityId: command.cityId, kind: 'building', id: command.buildingTypeId });
      }
      if (command.type === 'RecruitUnit') {
        plannedProduction.push({ cityId: command.cityId, kind: 'unit', id: command.unitTypeId });
      }
    }
    const nearestEnemyDistance = AiSystem.findNearestEnemyDistance(state, playerId);
    const gold = player?.resources.gold ?? 0;
    const goldIncome = player?.incomePerTurn.gold ?? 0;
    const threatBonus = nearestEnemyDistance === null ? 0 : Math.max(0, 6 - nearestEnemyDistance) * 4;
    const pressureScore = Math.min(100, Math.round(
      cities.length * 12 +
      militaryUnits.length * 8 +
      queuedUnitCount * 6 +
      queuedBuildingCount * 4 +
      plannedProduction.length * 4 +
      Math.max(0, goldIncome) * 3 +
      threatBonus,
    ));

    return {
      playerId,
      pressureScore,
      primaryFocus,
      cityCount: cities.length,
      militaryUnitCount: militaryUnits.length,
      activeProductionCount: productionItems.length,
      queuedUnitCount,
      queuedBuildingCount,
      gold,
      goldIncome,
      nearestEnemyDistance,
      plannedProduction,
    };
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

        if (!AiSystem.isViableCitySite(state, playerId, hex)) continue;

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

  private static isViableCitySite(
    state: GameState,
    playerId: PlayerId,
    hex: HexCoord,
  ): boolean {
    const tile = state.map.tiles[hexKey(hex)];
    if (!tile) return false;

    const terrain = TERRAIN_TYPES[tile.terrain];
    if (!terrain?.walkable) return false;

    const cityAtHex = Object.values(state.cities).find((city) => hexKey(city.hex) === hexKey(hex));
    if (cityAtHex) return false;

    if (tile.owningCityId) {
      const owningCity = state.cities[tile.owningCityId];
      if (owningCity && owningCity.ownerId !== playerId) return false;
    }

    return true;
  }

  private static planIdleCityProduction(
    state: GameState,
    playerId: PlayerId,
    focus: 'military' | 'economy' | 'balanced',
  ): Array<BuildBuildingCommand | RecruitUnitCommand> {
    const player = state.players[playerId];
    if (!player) return [];

    const commands: Array<BuildBuildingCommand | RecruitUnitCommand> = [];
    const budget: ResourceYield = { ...player.resources };
    const cities = Object.values(state.cities)
      .filter((city) => city.ownerId === playerId && city.productionQueue.length === 0)
      .sort((a, b) => a.id.localeCompare(b.id));

    const militaryCount = Object.values(state.entities).filter(
      (entity) => entity.ownerId === playerId &&
        entity.typeId !== 'settler' &&
        entity.typeId !== 'worker',
    ).length;

    for (const city of cities) {
      const shouldRecruit = focus === 'military' ||
        (focus === 'balanced' && militaryCount + commands.filter((c) => c.type === 'RecruitUnit').length < cities.length * 2);

      const firstChoice = shouldRecruit
        ? AiSystem.pickAffordableUnit(state, city.id, budget, focus)
        : AiSystem.pickAffordableBuilding(state, city.id, budget, focus);
      const fallback = shouldRecruit
        ? AiSystem.pickAffordableBuilding(state, city.id, budget, focus)
        : AiSystem.pickAffordableUnit(state, city.id, budget, focus);
      const choice = firstChoice ?? fallback;

      if (!choice) continue;

      AiSystem.deductBudget(budget, choice.cost);
      if (choice.kind === 'unit') {
        commands.push({
          type: 'RecruitUnit',
          playerId,
          cityId: city.id,
          unitTypeId: choice.id,
        });
      } else {
        commands.push({
          type: 'BuildBuilding',
          playerId,
          cityId: city.id,
          buildingTypeId: choice.id,
        });
      }
    }

    return commands;
  }

  private static pickAffordableBuilding(
    state: GameState,
    cityId: string,
    budget: ResourceYield,
    focus: 'military' | 'economy' | 'balanced',
  ): { kind: 'building'; id: string; cost: ResourceYield } | null {
    const available = getAvailableBuildings(state, cityId);
    const priority = focus === 'military'
      ? ['barracks', 'watchtower', 'walls', 'granary', 'workshop', 'market']
      : ['granary', 'workshop', 'market', 'barracks', 'watchtower', 'walls'];

    for (const buildingId of priority) {
      if (!available.includes(buildingId)) continue;
      const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
      if (!building || !AiSystem.canAfford(budget, building.cost as ResourceYield)) continue;
      return { kind: 'building', id: buildingId, cost: building.cost as ResourceYield };
    }

    for (const buildingId of available) {
      const building = BUILDINGS[buildingId as keyof typeof BUILDINGS];
      if (!building || !AiSystem.canAfford(budget, building.cost as ResourceYield)) continue;
      return { kind: 'building', id: buildingId, cost: building.cost as ResourceYield };
    }

    return null;
  }

  private static pickAffordableUnit(
    state: GameState,
    cityId: string,
    budget: ResourceYield,
    focus: 'military' | 'economy' | 'balanced',
  ): { kind: 'unit'; id: string; cost: ResourceYield } | null {
    const recruitable = getRecruitableUnits(state, cityId);
    const priority = focus === 'economy'
      ? ['worker', 'scout', 'spearman', 'settler']
      : ['spearman', 'scout', 'worker', 'settler'];

    for (const unitId of priority) {
      if (!recruitable.includes(unitId)) continue;
      const unit = UNIT_TYPES[unitId as keyof typeof UNIT_TYPES];
      if (!unit || !AiSystem.canAfford(budget, unit.cost as ResourceYield)) continue;
      return { kind: 'unit', id: unitId, cost: unit.cost as ResourceYield };
    }

    for (const unitId of recruitable) {
      const unit = UNIT_TYPES[unitId as keyof typeof UNIT_TYPES];
      if (!unit || !AiSystem.canAfford(budget, unit.cost as ResourceYield)) continue;
      return { kind: 'unit', id: unitId, cost: unit.cost as ResourceYield };
    }

    return null;
  }

  private static canAfford(resources: ResourceYield, cost: ResourceYield): boolean {
    for (const key of Object.keys(cost) as ResourceId[]) {
      if ((resources[key] ?? 0) < (cost[key] ?? 0)) return false;
    }
    return true;
  }

  private static deductBudget(resources: ResourceYield, cost: ResourceYield): void {
    for (const key of Object.keys(cost) as ResourceId[]) {
      resources[key] = (resources[key] ?? 0) - (cost[key] ?? 0);
    }
  }

  private static findNearestEnemyDistance(state: GameState, playerId: PlayerId): number | null {
    const ownAnchors = [
      ...Object.values(state.cities).filter((city) => city.ownerId === playerId).map((city) => city.hex),
      ...Object.values(state.entities).filter((entity) => entity.ownerId === playerId).map((entity) => entity.hex),
    ];
    const enemyAnchors = [
      ...Object.values(state.cities).filter((city) => city.ownerId !== playerId).map((city) => city.hex),
      ...Object.values(state.entities).filter((entity) => entity.ownerId !== playerId).map((entity) => entity.hex),
    ];
    if (ownAnchors.length === 0 || enemyAnchors.length === 0) return null;

    let nearest = Infinity;
    for (const ownHex of ownAnchors) {
      for (const enemyHex of enemyAnchors) {
        nearest = Math.min(nearest, hexDistance(ownHex, enemyHex));
      }
    }
    return nearest === Infinity ? null : nearest;
  }

  private static findMovementPathToward(
    state: GameState,
    unit: EntityData,
    targetHex: HexCoord,
    stopAdjacent = false,
  ): HexCoord[] | null {
    const path = findPath(
      unit.hex,
      targetHex,
      (hex) => AiSystem.canPathThroughHex(state, unit, hex, targetHex),
      (hex) => calculateMovementCost(state, unit.hex, hex, unit.id),
    );

    if (path.length < 2) return null;

    let movementCost = 0;
    let lastReachableIndex = 0;
    for (let i = 1; i < path.length; i++) {
      const nextStep = path[i];
      if (stopAdjacent && hexDistance(nextStep, targetHex) === 0) break;

      const stepCost = calculateMovementCost(state, path[i - 1], nextStep, unit.id);
      if (stepCost <= 0 || movementCost + stepCost > unit.movementPoints) break;

      movementCost += stepCost;
      lastReachableIndex = i;
    }

    if (lastReachableIndex === 0) return null;
    return path.slice(0, lastReachableIndex + 1);
  }

  private static canPathThroughHex(
    state: GameState,
    unit: EntityData,
    hex: HexCoord,
    targetHex: HexCoord,
  ): boolean {
    const tile = state.map.tiles[hexKey(hex)];
    if (!tile) return false;

    const terrain = TERRAIN_TYPES[tile.terrain];
    if (!terrain?.walkable) return false;

    const occupant = Object.values(state.entities).find((e) => hexKey(e.hex) === hexKey(hex));
    if (!occupant || occupant.id === unit.id) return true;
    if (occupant.ownerId === unit.ownerId) return false;

    return hexDistance(hex, targetHex) === 0;
  }
}

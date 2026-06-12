/**
 * Tactical Planner for "Realms of War" AI.
 *
 * Converts strategic goals into concrete sequences of commands.
 * While the StrategicPlanner decides WHAT to focus on, the
 * TacticalPlanner decides HOW to achieve it.
 *
 * Each strategic goal has a corresponding tactical plan generator
 * that produces a prioritized list of commands.
 */

import type { PlayerId, HexCoord } from '../core/types';
import type { EntityData } from '../core/GameState';
import { hexKey, hexDistance, HEX_DIRECTIONS, hexRing } from '../core/types';
import type { GameState } from '../core/GameState';
import type {
  GameCommand,
  MoveUnitCommand,
  AttackCommand,
  FoundCityCommand,
  BuildBuildingCommand,
  RecruitUnitCommand,
  ResearchTechnologyCommand,
  EndTurnCommand,
} from '../core/CommandQueue';
import type { StrategicGoal, StrategicAssessment } from './StrategicPlanner';
import type { InfluenceMap } from './InfluenceMap';
import { canFoundCity } from '../rules/cityRules';
import { getAvailableBuildings } from '../rules/cityRules';
import { getRecruitableUnits } from '../rules/recruitmentRules';
import { getAvailableTechs } from '../rules/researchRules';
import { canAttack } from '../rules/combatRules';
import { getReachableHexes } from '../rules/movementRules';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TacticalPlan {
  commands: GameCommand[];
  estimatedOutcome: string;
  riskLevel: number; // 0-100
}

// ─── TacticalPlanner ──────────────────────────────────────────────────────────

export class TacticalPlanner {
  /**
   * Create a tactical plan for a strategic goal.
   * Produces a sequence of commands that work toward the goal.
   */
  createPlan(
    state: GameState,
    playerId: PlayerId,
    goal: StrategicGoal,
    assessment: StrategicAssessment,
    influenceMap: InfluenceMap,
  ): TacticalPlan {
    const player = state.players[playerId];
    if (!player || !player.isAlive) {
      return { commands: [], estimatedOutcome: 'Player dead', riskLevel: 100 };
    }

    switch (goal) {
      case 'expand':
        return this.planExpansion(state, playerId, assessment, influenceMap);
      case 'consolidate':
        return this.planConsolidation(state, playerId, assessment, influenceMap);
      case 'military_buildup':
        return this.planMilitaryBuildup(state, playerId, assessment, influenceMap);
      case 'science_rush':
        return this.planScienceRush(state, playerId, assessment);
      case 'economic_growth':
        return this.planEconomicGrowth(state, playerId, assessment, influenceMap);
      case 'defensive_war':
        return this.planDefensiveWar(state, playerId, assessment, influenceMap);
      case 'offensive_war':
        return this.planOffensiveWar(state, playerId, assessment, influenceMap);
      case 'cultural_development':
        return this.planCulturalDevelopment(state, playerId, assessment);
      case 'rift_pursuit':
        return this.planRiftPursuit(state, playerId, assessment, influenceMap);
      default:
        return this.planConsolidation(state, playerId, assessment, influenceMap);
    }
  }

  /**
   * Prioritize multiple tactical plans.
   * Returns them sorted by a combined score of goal importance and plan quality.
   */
  prioritizePlans(
    plans: TacticalPlan[],
    assessment: StrategicAssessment,
  ): TacticalPlan[] {
    // Lower risk is generally preferred, but high threat situations
    // may require accepting higher risk
    const riskTolerance = assessment.threatLevel > 50 ? 0.5 : 0.2;

    return [...plans].sort((a, b) => {
      // Score = (100 - riskLevel * riskTolerance)
      // Higher score = better plan
      const scoreA = 100 - a.riskLevel * riskTolerance;
      const scoreB = 100 - b.riskLevel * riskTolerance;
      return scoreB - scoreA;
    });
  }

  // ─── Goal-Specific Planners ────────────────────────────────────────────

  private planExpansion(
    state: GameState,
    playerId: PlayerId,
    assessment: StrategicAssessment,
    influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];
    let riskLevel = 20;

    // Find settler units
    const settlers = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId && e.typeId === 'settler',
    );

    if (settlers.length === 0) {
      // Need to recruit a settler first
      const recruitCmd = this.recruitUnitInBestCity(state, playerId, 'settler');
      if (recruitCmd) {
        commands.push(recruitCmd);
      }
      return {
        commands,
        estimatedOutcome: 'Recruiting settler for expansion',
        riskLevel: 30,
      };
    }

    // Move settlers toward the best expansion location
    for (const settler of settlers) {
      const bestHex = this.findBestExpansionHex(
        state, playerId, settler.hex, influenceMap,
      );

      if (bestHex) {
        const dist = hexDistance(settler.hex, bestHex);

        if (dist === 0) {
          // Found city here
          const cityCount = Object.values(state.cities).filter(
            (c) => c.ownerId === playerId,
          ).length;
          const foundCmd: FoundCityCommand = {
            type: 'FoundCity',
            playerId,
            hex: bestHex,
            name: `City ${cityCount + 1}`,
          };
          commands.push(foundCmd);
        } else {
          // Move toward the location
          const moveCmd: MoveUnitCommand = {
            type: 'MoveUnit',
            playerId,
            entityId: settler.id,
            path: [settler.hex, bestHex],
          };
          commands.push(moveCmd);

          // If adjacent, also found city this turn
          if (dist <= 1) {
            const check = canFoundCity(state, playerId, bestHex);
            if (check.canFound) {
              const cityCount = Object.values(state.cities).filter(
                (c) => c.ownerId === playerId,
              ).length;
              const foundCmd: FoundCityCommand = {
                type: 'FoundCity',
                playerId,
                hex: bestHex,
                name: `City ${cityCount + 1}`,
              };
              commands.push(foundCmd);
            }
          }
        }
      }

      // Adjust risk based on threat at destination
      if (bestHex) {
        riskLevel += Math.round(influenceMap.getThreatAt(bestHex) * 0.3);
      }
    }

    // Also move military units to escort settlers
    const militaryUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId &&
             !e.hasMoved &&
             e.typeId !== 'settler' &&
             e.typeId !== 'worker',
    );

    for (const settler of settlers) {
      // Find closest idle military unit
      let closestUnit: EntityData | null = null;
      let closestDist = Infinity;
      for (const unit of militaryUnits) {
        const dist = hexDistance(unit.hex, settler.hex);
        if (dist < closestDist && dist > 1) {
          closestDist = dist;
          closestUnit = unit;
        }
      }

      if (closestUnit && closestDist <= 6) {
        const escortCmd: MoveUnitCommand = {
          type: 'MoveUnit',
          playerId,
          entityId: closestUnit.id,
          path: [closestUnit.hex, settler.hex],
        };
        commands.push(escortCmd);
      }
    }

    return {
      commands,
      estimatedOutcome: `Expanding with ${settlers.length} settler(s)`,
      riskLevel: Math.min(100, riskLevel),
    };
  }

  private planConsolidation(
    state: GameState,
    playerId: PlayerId,
    assessment: StrategicAssessment,
    _influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];

    // Build improvements in cities
    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    for (const city of cities) {
      // Build infrastructure if production queue is empty
      if (city.productionQueue.length === 0) {
        const available = getAvailableBuildings(state, city.id);

        // Priority order: economy > defense > science > military
        const priorityOrder = [
          'granary', 'market', 'workshop', 'bank', 'guild_hall',
          'walls', 'castle', 'watchtower',
          'library', 'university', 'academy',
          'barracks', 'archery_range', 'mage_tower', 'siege_yard',
        ];

        for (const pref of priorityOrder) {
          if (available.includes(pref)) {
            const buildCmd: BuildBuildingCommand = {
              type: 'BuildBuilding',
              playerId,
              cityId: city.id,
              buildingTypeId: pref,
            };
            commands.push(buildCmd);
            break;
          }
        }
      }
    }

    // Start research if not researching
    const player = state.players[playerId];
    if (player && !player.currentResearch) {
      const techs = getAvailableTechs(state, playerId);
      if (techs.length > 0) {
        // Pick a tech aligned with recommended branch
        const researchCmd: ResearchTechnologyCommand = {
          type: 'ResearchTechnology',
          playerId,
          techId: this.pickBestTech(techs, assessment.recommendedTechBranch),
        };
        commands.push(researchCmd);
      }
    }

    return {
      commands,
      estimatedOutcome: 'Consolidating: building infrastructure and researching',
      riskLevel: 10,
    };
  }

  private planMilitaryBuildup(
    state: GameState,
    playerId: PlayerId,
    _assessment: StrategicAssessment,
    _influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];

    // Recruit military units in all cities
    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId && c.productionQueue.length === 0,
    );

    for (const city of cities) {
      const recruitable = getRecruitableUnits(state, city.id);
      // Prefer combat units over settlers/workers
      const combatUnits = recruitable.filter(
        (id) => id !== 'settler' && id !== 'worker',
      );

      if (combatUnits.length > 0) {
        // Pick a balanced mix: prefer melee first, then ranged, then special
        const priorityOrder = ['swordsman', 'spearman', 'archer', 'crossbowman',
                               'knight', 'mage', 'catapult', 'paladin'];
        let unitToRecruit = combatUnits[0];

        for (const pref of priorityOrder) {
          if (combatUnits.includes(pref)) {
            unitToRecruit = pref;
            break;
          }
        }

        const recruitCmd: RecruitUnitCommand = {
          type: 'RecruitUnit',
          playerId,
          cityId: city.id,
          unitTypeId: unitToRecruit,
        };
        commands.push(recruitCmd);
      }
    }

    // Build military buildings in cities without them
    for (const city of cities) {
      const available = getAvailableBuildings(state, city.id);
      const militaryBuildings = ['barracks', 'archery_range', 'mage_tower', 'siege_yard'];

      for (const milBuilding of militaryBuildings) {
        if (available.includes(milBuilding)) {
          const buildCmd: BuildBuildingCommand = {
            type: 'BuildBuilding',
            playerId,
            cityId: city.id,
            buildingTypeId: milBuilding,
          };
          commands.push(buildCmd);
          break;
        }
      }
    }

    return {
      commands,
      estimatedOutcome: `Recruiting military units in ${cities.length} cities`,
      riskLevel: 15,
    };
  }

  private planScienceRush(
    state: GameState,
    playerId: PlayerId,
    assessment: StrategicAssessment,
  ): TacticalPlan {
    const commands: GameCommand[] = [];

    // Start research if not already researching
    const player = state.players[playerId];
    if (player && !player.currentResearch) {
      const techs = getAvailableTechs(state, playerId);
      if (techs.length > 0) {
        const researchCmd: ResearchTechnologyCommand = {
          type: 'ResearchTechnology',
          playerId,
          techId: this.pickBestTech(techs, assessment.recommendedTechBranch),
        };
        commands.push(researchCmd);
      }
    }

    // Build science buildings
    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    for (const city of cities) {
      const available = getAvailableBuildings(state, city.id);
      const scienceBuildings = ['library', 'university', 'academy'];

      for (const sciBuilding of scienceBuildings) {
        if (available.includes(sciBuilding)) {
          const buildCmd: BuildBuildingCommand = {
            type: 'BuildBuilding',
            playerId,
            cityId: city.id,
            buildingTypeId: sciBuilding,
          };
          commands.push(buildCmd);
          break;
        }
      }
    }

    return {
      commands,
      estimatedOutcome: 'Rushing science: research and building science infrastructure',
      riskLevel: 25, // Neglecting military for science is risky
    };
  }

  private planEconomicGrowth(
    state: GameState,
    playerId: PlayerId,
    _assessment: StrategicAssessment,
    _influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];

    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    // Build economy buildings in cities
    for (const city of cities) {
      const available = getAvailableBuildings(state, city.id);
      const economyBuildings = ['granary', 'market', 'workshop', 'bank', 'guild_hall',
                                'trading_post'];

      for (const econBuilding of economyBuildings) {
        if (available.includes(econBuilding)) {
          const buildCmd: BuildBuildingCommand = {
            type: 'BuildBuilding',
            playerId,
            cityId: city.id,
            buildingTypeId: econBuilding,
          };
          commands.push(buildCmd);
          break;
        }
      }
    }

    // Recruit workers for improvements
    const workers = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId && e.typeId === 'worker',
    );
    if (workers.length < cities.length) {
      const recruitCmd = this.recruitUnitInBestCity(state, playerId, 'worker');
      if (recruitCmd) {
        commands.push(recruitCmd);
      }
    }

    return {
      commands,
      estimatedOutcome: 'Growing economy: building income structures and workers',
      riskLevel: 15,
    };
  }

  private planDefensiveWar(
    state: GameState,
    playerId: PlayerId,
    _assessment: StrategicAssessment,
    influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];
    let riskLevel = 40;

    // Move units to defend threatened cities
    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    const militaryUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId &&
             !e.hasActed &&
             e.typeId !== 'settler' &&
             e.typeId !== 'worker',
    );

    for (const city of cities) {
      const threat = influenceMap.getThreatAt(city.hex);

      if (threat > 30) {
        // Find nearby enemies to attack
        const nearbyEnemies = Object.values(state.entities).filter(
          (e) => e.ownerId !== playerId &&
                 hexDistance(e.hex, city.hex) <= 3,
        );

        // Attack enemies adjacent to our units first
        for (const unit of militaryUnits) {
          for (const enemy of nearbyEnemies) {
            const dist = hexDistance(unit.hex, enemy.hex);
            if (dist <= unit.range) {
              const check = canAttack(state, unit.id, enemy.id);
              if (check.canAttack) {
                const attackCmd: AttackCommand = {
                  type: 'Attack',
                  playerId,
                  attackerId: unit.id,
                  targetEntityId: enemy.id,
                  targetCityId: null,
                };
                commands.push(attackCmd);
                break; // One attack per unit per plan
              }
            }
          }
        }

        // Move idle units toward threatened city
        for (const unit of militaryUnits) {
          if (!unit.hasMoved && hexDistance(unit.hex, city.hex) > 1) {
            const moveCmd: MoveUnitCommand = {
              type: 'MoveUnit',
              playerId,
              entityId: unit.id,
              path: [unit.hex, city.hex],
            };
            commands.push(moveCmd);
          }
        }
      }
    }

    // Recruit defenders if military is weak
    if (militaryUnits.length < cities.length * 2) {
      for (const city of cities) {
        if (city.productionQueue.length === 0) {
          const recruitable = getRecruitableUnits(state, city.id);
          const defenders = recruitable.filter(
            (id) => id !== 'settler' && id !== 'worker',
          );
          if (defenders.length > 0) {
            const recruitCmd: RecruitUnitCommand = {
              type: 'RecruitUnit',
              playerId,
              cityId: city.id,
              unitTypeId: defenders[0],
            };
            commands.push(recruitCmd);
            break; // One recruitment per plan
          }
        }
      }
    }

    // Build defensive buildings
    for (const city of cities) {
      const available = getAvailableBuildings(state, city.id);
      if (available.includes('walls')) {
        const buildCmd: BuildBuildingCommand = {
          type: 'BuildBuilding',
          playerId,
          cityId: city.id,
          buildingTypeId: 'walls',
        };
        commands.push(buildCmd);
      }
    }

    riskLevel += Math.round(_assessment.threatLevel * 0.3);

    return {
      commands,
      estimatedOutcome: 'Defending: attacking nearby enemies and reinforcing cities',
      riskLevel: Math.min(100, riskLevel),
    };
  }

  private planOffensiveWar(
    state: GameState,
    playerId: PlayerId,
    _assessment: StrategicAssessment,
    influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];
    let riskLevel = 50;

    // Find enemy targets (units and cities)
    const enemyUnits = Object.values(state.entities).filter(
      (e) => e.ownerId !== playerId,
    );

    const enemyCities = Object.values(state.cities).filter(
      (c) => c.ownerId !== playerId,
    );

    const militaryUnits = Object.values(state.entities).filter(
      (e) => e.ownerId === playerId &&
             !e.hasActed &&
             e.typeId !== 'settler' &&
             e.typeId !== 'worker',
    );

    // Attack enemy units in range
    for (const unit of militaryUnits) {
      // Find best target (weakest enemy in range)
      let bestTarget: EntityData | null = null;
      let bestScore = -1;

      for (const enemy of enemyUnits) {
        const dist = hexDistance(unit.hex, enemy.hex);
        if (dist > unit.range) continue;

        const check = canAttack(state, unit.id, enemy.id);
        if (!check.canAttack) continue;

        // Prefer weaker enemies and those closer to our cities
        const score = (100 - enemy.hp) + (enemy.attack + enemy.defense) * 2;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = enemy;
        }
      }

      if (bestTarget) {
        const attackCmd: AttackCommand = {
          type: 'Attack',
          playerId,
          attackerId: unit.id,
          targetEntityId: bestTarget.id,
          targetCityId: null,
        };
        commands.push(attackCmd);
      }
    }

    // Move units toward enemy cities
    const idleUnits = militaryUnits.filter(
      (u) => !u.hasMoved && !commands.some(
        (c) => c.type === 'Attack' && c.attackerId === u.id,
      ),
    );

    if (enemyCities.length > 0 && idleUnits.length > 0) {
      // Find closest enemy city
      const target = this.findClosestEnemyCity(state, playerId, influenceMap);
      if (target) {
        // Send idle units toward it
        for (const unit of idleUnits.slice(0, 3)) {
          const moveCmd: MoveUnitCommand = {
            type: 'MoveUnit',
            playerId,
            entityId: unit.id,
            path: [unit.hex, target.hex],
          };
          commands.push(moveCmd);
        }
      }
    }

    // Continue military recruitment
    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId && c.productionQueue.length === 0,
    );

    for (const city of cities.slice(0, 2)) {
      const recruitable = getRecruitableUnits(state, city.id);
      const combatUnits = recruitable.filter(
        (id) => id !== 'settler' && id !== 'worker',
      );
      if (combatUnits.length > 0) {
        const recruitCmd: RecruitUnitCommand = {
          type: 'RecruitUnit',
          playerId,
          cityId: city.id,
          unitTypeId: combatUnits[0],
        };
        commands.push(recruitCmd);
      }
    }

    riskLevel += Math.round(_assessment.threatLevel * 0.2);

    return {
      commands,
      estimatedOutcome: `Offensive: attacking enemies with ${militaryUnits.length} units`,
      riskLevel: Math.min(100, riskLevel),
    };
  }

  private planCulturalDevelopment(
    state: GameState,
    playerId: PlayerId,
    _assessment: StrategicAssessment,
  ): TacticalPlan {
    const commands: GameCommand[] = [];

    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );

    // Build cultural/wonder buildings
    for (const city of cities) {
      const available = getAvailableBuildings(state, city.id);
      const culturalBuildings = ['temple', 'monument', 'theater', 'wonder_statue',
                                 'wonder_garden', 'wonder_library'];

      for (const cBuilding of culturalBuildings) {
        if (available.includes(cBuilding)) {
          const buildCmd: BuildBuildingCommand = {
            type: 'BuildBuilding',
            playerId,
            cityId: city.id,
            buildingTypeId: cBuilding,
          };
          commands.push(buildCmd);
          break;
        }
      }
    }

    // Research magic branch for cultural benefits
    const player = state.players[playerId];
    if (player && !player.currentResearch) {
      const techs = getAvailableTechs(state, playerId);
      if (techs.length > 0) {
        const researchCmd: ResearchTechnologyCommand = {
          type: 'ResearchTechnology',
          playerId,
          techId: this.pickBestTech(techs, 'magic'),
        };
        commands.push(researchCmd);
      }
    }

    return {
      commands,
      estimatedOutcome: 'Developing culture: building wonders and researching magic',
      riskLevel: 20,
    };
  }

  private planRiftPursuit(
    state: GameState,
    playerId: PlayerId,
    _assessment: StrategicAssessment,
    influenceMap: InfluenceMap,
  ): TacticalPlan {
    const commands: GameCommand[] = [];

    // Find uncontrolled rift portals
    const riftPortals = Object.values(state.map.tiles).filter(
      (t) => t.hasRiftPortal && t.riftPortalOwner !== playerId,
    );

    if (riftPortals.length > 0) {
      // Move military units toward nearest rift portal
      const militaryUnits = Object.values(state.entities).filter(
        (e) => e.ownerId === playerId &&
               !e.hasMoved &&
               e.typeId !== 'settler' &&
               e.typeId !== 'worker',
      );

      for (const tile of riftPortals.slice(0, 2)) {
        const [q, r] = hexKey({ q: 0, r: 0 }).split(',').map(Number);
        void q; void r;

        // Find the hex of this tile
        let portalHex: HexCoord | null = null;
        for (const [key, t] of Object.entries(state.map.tiles)) {
          if (t === tile) {
            const [pq, pr] = key.split(',').map(Number);
            portalHex = { q: pq, r: pr };
            break;
          }
        }

        if (portalHex) {
          // Send closest idle units
          const sortedUnits = [...militaryUnits].sort(
            (a, b) => hexDistance(a.hex, portalHex!) - hexDistance(b.hex, portalHex!),
          );

          for (const unit of sortedUnits.slice(0, 2)) {
            const moveCmd: MoveUnitCommand = {
              type: 'MoveUnit',
              playerId,
              entityId: unit.id,
              path: [unit.hex, portalHex],
            };
            commands.push(moveCmd);
          }
        }
      }
    }

    // Research magic for rift access
    const player = state.players[playerId];
    if (player && !player.currentResearch) {
      const techs = getAvailableTechs(state, playerId);
      if (techs.length > 0) {
        const researchCmd: ResearchTechnologyCommand = {
          type: 'ResearchTechnology',
          playerId,
          techId: this.pickBestTech(techs, 'magic'),
        };
        commands.push(researchCmd);
      }
    }

    return {
      commands,
      estimatedOutcome: 'Pursuing rift portals: moving units and researching magic',
      riskLevel: 35,
    };
  }

  // ─── Helper Methods ────────────────────────────────────────────────────

  /**
   * Find the best hex to found a new city.
   * Considers resources, distance from other cities, and threat levels.
   */
  private findBestExpansionHex(
    state: GameState,
    playerId: PlayerId,
    nearHex: HexCoord,
    influenceMap: InfluenceMap,
  ): HexCoord | null {
    const searchRadius = 5;
    let bestHex: HexCoord | null = null;
    let bestScore = -Infinity;

    for (let r = 0; r <= searchRadius; r++) {
      const ring = r === 0 ? [nearHex] : hexRing(nearHex, r);
      for (const hex of ring) {
        const key = hexKey(hex);
        const tile = state.map.tiles[key];
        if (!tile) continue;
        if (tile.terrain === 'mountain' || tile.terrain === 'water') continue;

        const check = canFoundCity(state, playerId, hex);
        if (!check.canFound) continue;

        let score = 0;

        // Prefer hexes with resources
        if (tile.resource) score += 20;

        // Prefer closer hexes (can found sooner)
        const dist = hexDistance(nearHex, hex);
        score += Math.max(0, 10 - dist * 2);

        // Prefer hexes far from existing cities (spread out)
        const playerCities = Object.values(state.cities).filter(
          (c) => c.ownerId === playerId,
        );
        for (const city of playerCities) {
          const cityDist = hexDistance(city.hex, hex);
          if (cityDist < 4) score -= 15;
          else if (cityDist < 7) score += 5;
          else score += 2;
        }

        // Penalize high-threat areas
        const threat = influenceMap.getThreatAt(hex);
        score -= threat * 0.5;

        // Count adjacent walkable hexes
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

  /** Find the closest enemy city to the player's territory. */
  private findClosestEnemyCity(
    state: GameState,
    playerId: PlayerId,
    _influenceMap: InfluenceMap,
  ): { hex: HexCoord; id: string } | null {
    const playerCities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId,
    );
    const enemyCities = Object.values(state.cities).filter(
      (c) => c.ownerId !== playerId,
    );

    if (playerCities.length === 0 || enemyCities.length === 0) return null;

    let closest: { hex: HexCoord; id: string } | null = null;
    let closestDist = Infinity;

    for (const pCity of playerCities) {
      for (const eCity of enemyCities) {
        const dist = hexDistance(pCity.hex, eCity.hex);
        if (dist < closestDist) {
          closestDist = dist;
          closest = { hex: eCity.hex, id: eCity.id };
        }
      }
    }

    return closest;
  }

  /** Recruit a specific unit type in the best available city. */
  private recruitUnitInBestCity(
    state: GameState,
    playerId: PlayerId,
    unitType: string,
  ): RecruitUnitCommand | null {
    const cities = Object.values(state.cities).filter(
      (c) => c.ownerId === playerId && c.productionQueue.length === 0,
    );

    for (const city of cities) {
      const recruitable = getRecruitableUnits(state, city.id);
      if (recruitable.includes(unitType)) {
        return {
          type: 'RecruitUnit',
          playerId,
          cityId: city.id,
          unitTypeId: unitType,
        };
      }
    }

    return null;
  }

  /**
   * Pick the best technology to research, aligned with a preferred branch.
   */
  private pickBestTech(
    availableTechs: string[],
    preferredBranch: string,
  ): string {
    // Simple heuristic: prefer techs aligned with the recommended branch
    const branchKeywords: Record<string, string[]> = {
      military: ['weapon', 'armor', 'siege', 'military', 'combat', 'warfare', 'iron', 'steel'],
      economy: ['trade', 'craft', 'agriculture', 'mining', 'banking', 'commerce', 'guild'],
      science: ['writing', 'scholar', 'mathematics', 'philosophy', 'education', 'observat'],
      magic: ['mystic', 'arcane', 'enchant', 'ritual', 'divine', 'sorcery', 'alchemy'],
    };

    const keywords = branchKeywords[preferredBranch] ?? [];

    // Score each tech based on keyword matching
    for (const tech of availableTechs) {
      const techLower = tech.toLowerCase();
      if (keywords.some((kw) => techLower.includes(kw))) {
        return tech;
      }
    }

    // Fallback: first available
    return availableTechs[0] ?? '';
  }

  /**
   * Create the always-present EndTurn command.
   */
  createEndTurnCommand(playerId: PlayerId): EndTurnCommand {
    return { type: 'EndTurn', playerId };
  }
}

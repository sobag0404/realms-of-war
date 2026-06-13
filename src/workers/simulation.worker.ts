// @ts-nocheck
/**
 * Web Worker for game turn simulation.
 *
 * Applies a sequence of commands to a game state and returns the
 * resulting state + events. Used for combat preview, AI planning,
 * and "what-if" analysis without modifying the real game state.
 *
 * This worker is entirely self-contained — it cannot import from the main
 * bundle. All simulation logic is re-implemented inline with simplified rules.
 *
 * Message protocol:
 *   Input:  { type: 'simulate', requestId, state, commands }
 *   Output: { type: 'simulateResult', requestId, finalState, events }
 */

// ─── Inline Hex Math ──────────────────────────────────────────────────────────

function hexDistance(
  a: { q: number; r: number },
  b: { q: number; r: number },
): number {
  const ax = a.q;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q;
  const bz = b.r;
  const by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
}

// ─── Terrain Costs ─────────────────────────────────────────────────────────────

const TERRAIN_COSTS: Record<string, number> = {
  plains: 1,
  forest: 2,
  mountain: 0,
  water: 0,
  desert: 2,
  swamp: 3,
  hills: 2,
  ruins: 1,
};

// ─── Deep Clone ────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Deterministic ID Generation ─────────────────────────────────────────────
//
// The simulation worker is self-contained and cannot import from the main bundle.
// We use the state's nextEntitySeq / nextCitySeq counters (part of the
// serializable GameState) to generate deterministic IDs instead of Date.now()
// or Math.random(). This keeps replays reproducible.

function simNextEntityId(state: SimState): string {
  const seq = state.nextEntitySeq ?? 1;
  state.nextEntitySeq = seq + 1;
  return `entity-${seq}`;
}

function simNextCityId(state: SimState): string {
  const seq = state.nextCitySeq ?? 1;
  state.nextCitySeq = seq + 1;
  return `city-${seq}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type SimState = any;
type SimCommand = any;

// ─── Command Application ──────────────────────────────────────────────────────

function applyCommand(state: SimState, command: SimCommand): unknown[] {
  const events: unknown[] = [];

  try {
    switch (command.type) {
      case 'MoveUnit': {
        const entity = state.entities?.[command.entityId];
        if (!entity) {
          events.push({ type: 'error', message: `Entity ${command.entityId} not found` });
          break;
        }

        // Calculate total movement cost along path
        let totalCost = 0;
        const path = command.path;
        if (path && path.length > 1) {
          for (let i = 1; i < path.length; i++) {
            const key = `${path[i].q},${path[i].r}`;
            const tile = state.map?.tiles?.[key];
            if (tile) {
              const cost = TERRAIN_COSTS[tile.terrain];
              if (cost === undefined || cost === 0) {
                events.push({ type: 'error', message: `Impassable terrain at ${key}` });
                return events;
              }
              totalCost += cost;
            }
          }
        }

        if (totalCost <= entity.movementPoints) {
          const lastStep = path[path.length - 1];
          entity.hex = { ...lastStep };
          entity.movementPoints -= totalCost;
          entity.hasMoved = true;

          events.push({
            type: 'UnitMoved',
            payload: { entityId: entity.id, from: path[0], to: lastStep },
          });
        } else {
          events.push({
            type: 'error',
            message: `Not enough movement points (${entity.movementPoints} < ${totalCost})`,
          });
        }
        break;
      }

      case 'Attack': {
        const attacker = state.entities?.[command.attackerId];
        const defender = state.entities?.[command.targetEntityId];

        if (!attacker || !defender) {
          events.push({ type: 'error', message: 'Attacker or defender not found' });
          break;
        }

        // Simple combat calculation
        const attackerDamage = Math.max(1, attacker.attack - defender.defense * 0.5);
        const defenderDamage = Math.max(1, defender.attack * 0.5 - attacker.defense * 0.3);

        defender.hp -= attackerDamage;
        attacker.hp -= defenderDamage;
        attacker.hasActed = true;

        events.push({
          type: 'DamageApplied',
          payload: {
            attackerId: attacker.id,
            defenderId: defender.id,
            attackerDamage,
            defenderDamage,
          },
        });

        // Check for kills
        if (defender.hp <= 0) {
          delete state.entities[defender.id];
          events.push({
            type: 'UnitKilled',
            payload: { entityId: defender.id, killedBy: attacker.id },
          });
        }

        if (attacker.hp <= 0) {
          delete state.entities[attacker.id];
          events.push({
            type: 'UnitKilled',
            payload: { entityId: attacker.id, killedBy: defender.id },
          });
        }
        break;
      }

      case 'FoundCity': {
        const hex = command.hex;
        const key = `${hex.q},${hex.r}`;
        const tile = state.map?.tiles?.[key];

        if (!tile || tile.terrain === 'water' || tile.terrain === 'mountain') {
          events.push({ type: 'error', message: 'Cannot found city here' });
          break;
        }

        // Check no existing city on this hex
        const existingCity = Object.values(state.cities || {}).some((c: any) =>
          c.hex.q === hex.q && c.hex.r === hex.r,
        );
        if (existingCity) {
          events.push({ type: 'error', message: 'City already exists here' });
          break;
        }

        const cityId = simNextCityId(state);
        const cityName = command.name ?? `City ${Object.keys(state.cities || {}).length + 1}`;

        state.cities[cityId] = {
          id: cityId,
          name: cityName,
          hex: { ...hex },
          ownerId: command.playerId,
          level: 1,
          population: 1,
          hp: 100,
          maxHp: 100,
          wallHp: 0,
          maxWallHp: 0,
          buildings: [],
          growthProgress: 0,
          growthTarget: 10,
          workedHexes: [key],
          productionQueue: [],
          productionPerTurn: 2,
          foodPerTurn: 2,
          territory: [key],
          isUnderSiege: false,
          foundedTurn: state.turn ?? 1,
        };

        events.push({
          type: 'CityFounded',
          payload: { cityId, name: cityName, hex },
        });

        // Consume settler if present
        const settler = Object.values(state.entities || {}).find((e: any) =>
          e.ownerId === command.playerId && e.typeId === 'settler' &&
          e.hex.q === hex.q && e.hex.r === hex.r,
        );
        if (settler) {
          delete state.entities[settler.id];
        }
        break;
      }

      case 'BuildBuilding': {
        const city = state.cities?.[command.cityId];
        if (!city) {
          events.push({ type: 'error', message: 'City not found' });
          break;
        }

        if (city.buildings.includes(command.buildingTypeId)) {
          events.push({ type: 'error', message: 'Building already exists' });
          break;
        }

        city.buildings.push(command.buildingTypeId);

        events.push({
          type: 'BuildingCompleted',
          payload: { cityId: city.id, buildingType: command.buildingTypeId },
        });
        break;
      }

      case 'RecruitUnit': {
        const city = state.cities?.[command.cityId];
        if (!city) {
          events.push({ type: 'error', message: 'City not found' });
          break;
        }

        const entityId = simNextEntityId(state);

        // Simple unit stats
        const unitStats: Record<string, { attack: number; defense: number; hp: number; range: number; movement: number }> = {
          spearman: { attack: 5, defense: 6, hp: 30, range: 1, movement: 2 },
          archer: { attack: 6, defense: 3, hp: 25, range: 2, movement: 2 },
          swordsman: { attack: 7, defense: 5, hp: 35, range: 1, movement: 2 },
          scout: { attack: 3, defense: 2, hp: 20, range: 1, movement: 4 },
          settler: { attack: 0, defense: 0, hp: 15, range: 0, movement: 2 },
          worker: { attack: 0, defense: 0, hp: 15, range: 0, movement: 2 },
        };

        const stats = unitStats[command.unitTypeId] ?? unitStats.spearman;

        state.entities[entityId] = {
          id: entityId,
          typeId: command.unitTypeId,
          ownerId: command.playerId,
          hex: { ...city.hex },
          movementPoints: stats.movement,
          maxMovement: stats.movement,
          hp: stats.hp,
          maxHp: stats.hp,
          attack: stats.attack,
          defense: stats.defense,
          attackType: stats.range > 1 ? 'ranged' : 'melee',
          range: stats.range,
          hasActed: false,
          hasMoved: false,
          xp: 0,
          level: 1,
          promotions: [],
          upkeep: { gold: 1 },
          abilities: [],
          statusEffects: [],
        };

        events.push({
          type: 'UnitRecruited',
          payload: { entityId, typeId: command.unitTypeId, cityId: city.id },
        });
        break;
      }

      case 'ResearchTechnology': {
        const player = state.players?.[command.playerId];
        if (!player) {
          events.push({ type: 'error', message: 'Player not found' });
          break;
        }

        player.currentResearch = command.techId;
        player.researchProgress = 0;

        events.push({
          type: 'ResearchStarted',
          payload: { playerId: command.playerId, techId: command.techId },
        });
        break;
      }

      case 'EndTurn': {
        const player = state.players?.[command.playerId];
        if (player) {
          // Add science per turn to research
          if (player.currentResearch) {
            player.researchProgress += player.sciencePerTurn ?? 1;

            // Check if research is complete (simplified: cost = 25)
            if (player.researchProgress >= 25) {
              if (!player.techs) player.techs = [];
              player.techs.push(player.currentResearch);

              events.push({
                type: 'TechnologyCompleted',
                payload: { playerId: command.playerId, techId: player.currentResearch },
              });

              player.currentResearch = null;
              player.researchProgress = 0;
            }
          }
        }

        // Reset unit movement for this player
        for (const entity of Object.values(state.entities || {}) as any[]) {
          if (entity.ownerId === command.playerId) {
            entity.movementPoints = entity.maxMovement;
            entity.hasMoved = false;
            entity.hasActed = false;
          }
        }

        // Advance turn counter
        state.turn = (state.turn ?? 0) + 1;

        events.push({
          type: 'TurnEnded',
          payload: { playerId: command.playerId, turn: state.turn },
        });
        break;
      }

      default:
        events.push({
          type: 'error',
          message: `Unknown command type: ${command.type}`,
        });
    }
  } catch (err) {
    events.push({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return events;
}

// ─── Simulation ────────────────────────────────────────────────────────────────

function simulateTurns(state: SimState, commands: SimCommand[]): { state: SimState; events: unknown[] } {
  // Deep clone state to avoid mutating the original
  const simState = deepClone(state);
  const allEvents: unknown[] = [];

  // Apply each command sequentially
  for (const command of commands) {
    const events = applyCommand(simState, command);
    allEvents.push(...events);
  }

  return { state: simState, events: allEvents };
}

// ─── Message Handler ───────────────────────────────────────────────────────────

self.onmessage = function (e: MessageEvent) {
  const request = e.data;
  const requestId: string = request.requestId ?? '';

  try {
    if (request.type === 'simulate') {
      const { state, commands } = request;
      const result = simulateTurns(state, commands ?? []);

      self.postMessage({
        type: 'simulateResult',
        requestId,
        finalState: result.state,
        events: result.events,
      });
    } else {
      self.postMessage({
        type: 'error',
        requestId,
        requestType: request.type,
        message: `Unknown request type: ${request.type}`,
      });
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      requestId,
      requestType: request.type ?? 'unknown',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

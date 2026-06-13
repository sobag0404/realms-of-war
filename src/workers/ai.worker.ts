// @ts-nocheck
/**
 * Web Worker for AI turn generation.
 *
 * Runs AI decision-making in a background thread to avoid blocking the main
 * rendering loop. Implements a simplified utility-based AI that evaluates
 * strategic priorities and generates commands.
 *
 * This worker is entirely self-contained — it cannot import from the main
 * bundle. All AI logic is re-implemented inline with simplified heuristics.
 *
 * Message protocol:
 *   Input:  { type: 'generateTurn', requestId, state, playerId, difficulty }
 *   Output: { type: 'generateTurnResult', requestId, commands }
 */

// ─── Inline Hex Math ──────────────────────────────────────────────────────────

const HEX_DIRECTIONS: Array<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function hexKey(hex: { q: number; r: number }): string {
  return `${hex.q},${hex.r}`;
}

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

// ─── Difficulty Modifiers ──────────────────────────────────────────────────────

const DIFFICULTY_MODIFIERS: Record<string, {
  expandWeight: number;
  militaryWeight: number;
  economyWeight: number;
  researchWeight: number;
  defendWeight: number;
}> = {
  easy: { expandWeight: 0.6, militaryWeight: 0.5, economyWeight: 0.7, researchWeight: 0.6, defendWeight: 0.3 },
  normal: { expandWeight: 1.0, militaryWeight: 1.0, economyWeight: 1.0, researchWeight: 1.0, defendWeight: 1.0 },
  hard: { expandWeight: 1.2, militaryWeight: 1.3, economyWeight: 1.1, researchWeight: 1.2, defendWeight: 1.3 },
  nightmare: { expandWeight: 1.5, militaryWeight: 1.6, economyWeight: 1.3, researchWeight: 1.4, defendWeight: 1.5 },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AiPriority {
  type: 'expand' | 'military' | 'economy' | 'research' | 'defend';
  weight: number;
}

type GameState = any;

// ─── Priority Evaluation ───────────────────────────────────────────────────────

function evaluatePriorities(state: GameState, playerId: string, difficulty: string): AiPriority[] {
  const player = state.players?.[playerId];
  if (!player || !player.isAlive) return [];

  const modifiers = DIFFICULTY_MODIFIERS[difficulty] ?? DIFFICULTY_MODIFIERS.normal;

  const playerCities = Object.values(state.cities || {}).filter(
    (c: any) => c.ownerId === playerId,
  );
  const playerUnits = Object.values(state.entities || {}).filter(
    (e: any) => e.ownerId === playerId,
  );
  const gold = player.resources?.gold ?? 0;

  const priorities: AiPriority[] = [];

  // Expand: No cities or few cities
  const expandWeight = playerCities.length === 0 ? 100 :
                       playerCities.length <= 2 ? 60 :
                       playerCities.length <= 4 ? 30 : 10;
  priorities.push({ type: 'expand', weight: expandWeight * modifiers.expandWeight });

  // Economy: Low gold
  const economyWeight = gold < 10 ? 80 :
                        gold < 30 ? 50 :
                        gold < 100 ? 20 : 5;
  priorities.push({ type: 'economy', weight: economyWeight * modifiers.economyWeight });

  // Military: Enemy nearby or few units
  let enemyNearby = false;
  for (const city of playerCities) {
    const nearby = Object.values(state.entities || {}).filter(
      (e: any) => e.ownerId !== playerId && hexDistance(e.hex, city.hex) <= 5,
    );
    if (nearby.length > 0) { enemyNearby = true; break; }
  }

  const militaryWeight = enemyNearby ? 70 :
    playerUnits.filter(
      (u: any) => u.typeId !== 'settler' && u.typeId !== 'worker',
    ).length < 3 ? 50 : 20;
  priorities.push({ type: 'military', weight: militaryWeight * modifiers.militaryWeight });

  // Research: Not researching and have cities
  const researchWeight = !player.currentResearch && playerCities.length > 0 ? 40 :
                         player.techs?.length < 5 ? 30 : 15;
  priorities.push({ type: 'research', weight: researchWeight * modifiers.researchWeight });

  // Defend: Cities are threatened
  let threatenedCities = 0;
  for (const city of playerCities) {
    const nearby = Object.values(state.entities || {}).filter(
      (e: any) => e.ownerId !== playerId && hexDistance(e.hex, city.hex) <= 3,
    );
    if (nearby.length > 0) threatenedCities++;
  }
  const defendWeight = threatenedCities > 0 ? 60 + threatenedCities * 10 : 5;
  priorities.push({ type: 'defend', weight: Math.min(defendWeight, 90) * modifiers.defendWeight });

  return priorities;
}

// ─── Command Generation ────────────────────────────────────────────────────────

function generateTurn(state: GameState, playerId: string, difficulty: string): unknown[] {
  const player = state.players?.[playerId];
  if (!player || !player.isAlive) return [];

  const commands: unknown[] = [];
  const priorities = evaluatePriorities(state, playerId, difficulty);
  const sorted = [...priorities].sort((a, b) => b.weight - a.weight);

  let hasBuilt = false;
  let hasResearched = false;
  let hasRecruited = false;

  const playerUnits = Object.values(state.entities || {}).filter(
    (e: any) => e.ownerId === playerId,
  );
  const playerCities = Object.values(state.cities || {}).filter(
    (c: any) => c.ownerId === playerId,
  );

  for (const priority of sorted) {
    if (priority.weight <= 0) continue;

    switch (priority.type) {
      case 'expand': {
        // Try to found a city with a settler
        const settlers = playerUnits.filter((u: any) => u.typeId === 'settler');
        for (const settler of settlers) {
          // Find a good location near the settler
          const bestHex = findBestCityLocation(state, playerId, settler.hex);
          if (bestHex) {
            if (hexDistance(settler.hex, bestHex) > 0) {
              commands.push({
                type: 'MoveUnit',
                playerId,
                entityId: settler.id,
                path: [settler.hex, bestHex],
              });
            }
            if (hexDistance(settler.hex, bestHex) <= 1) {
              commands.push({
                type: 'FoundCity',
                playerId,
                hex: bestHex,
                name: `City ${playerCities.length + 1}`,
              });
            }
          }
        }
        break;
      }

      case 'military': {
        // Attack nearby enemies with non-acted units
        const combatUnits = playerUnits.filter((u: any) => !u.hasActed && u.typeId !== 'settler' && u.typeId !== 'worker');

        for (const unit of combatUnits) {
          const enemies = Object.values(state.entities || {}).filter((e: any) =>
            e.ownerId !== playerId && e.hp > 0,
          );

          let closestEnemy: { id: string; hex: { q: number; r: number }; hp: number } | null = null;
          let closestDist = Infinity;
          for (const enemy of enemies) {
            const dist = hexDistance(unit.hex, enemy.hex);
            if (dist < closestDist && dist <= (unit.range ?? 1) + 2) {
              closestDist = dist;
              closestEnemy = enemy;
            }
          }

          if (closestEnemy && closestDist <= (unit.range ?? 1)) {
            commands.push({
              type: 'Attack',
              playerId,
              attackerId: unit.id,
              targetEntityId: closestEnemy.id,
              targetCityId: null,
            });
          } else if (closestEnemy && !unit.hasMoved) {
            commands.push({
              type: 'MoveUnit',
              playerId,
              entityId: unit.id,
              path: [unit.hex, closestEnemy.hex],
            });
          }
        }

        // Recruit military units
        for (const city of playerCities) {
          if (hasRecruited) break;
          commands.push({
            type: 'RecruitUnit',
            playerId,
            cityId: city.id,
            unitTypeId: 'spearman',
          });
          hasRecruited = true;
        }
        break;
      }

      case 'economy': {
        // Build income-generating buildings
        for (const city of playerCities) {
          if (hasBuilt) break;
          const economyBuildings = ['granary', 'market', 'workshop'];
          const available = economyBuildings.filter(
            (b) => !city.buildings?.includes(b),
          );
          if (available.length > 0) {
            commands.push({
              type: 'BuildBuilding',
              playerId,
              cityId: city.id,
              buildingTypeId: available[0],
            });
            hasBuilt = true;
          }
        }
        break;
      }

      case 'research': {
        if (!player.currentResearch && !hasResearched) {
          const preferredTechs = ['writing', 'trade', 'craftsmanship'];
          const available = preferredTechs.filter(
            (t) => !player.techs?.includes(t),
          );
          if (available.length > 0) {
            commands.push({
              type: 'ResearchTechnology',
              playerId,
              techId: available[0],
            });
            hasResearched = true;
          }
        }
        break;
      }

      case 'defend': {
        // Move idle units toward threatened cities
        for (const city of playerCities) {
          const nearbyEnemies = Object.values(state.entities || {}).filter((e: any) =>
            e.ownerId !== playerId && hexDistance(e.hex, city.hex) <= 4,
          );
          if (nearbyEnemies.length === 0) continue;

          const idleUnits = playerUnits.filter((u: any) =>
            !u.hasMoved &&
            u.typeId !== 'settler' &&
            u.typeId !== 'worker' &&
            hexDistance(u.hex, city.hex) > 1,
          );

          for (const unit of idleUnits.slice(0, 2)) {
            commands.push({
              type: 'MoveUnit',
              playerId,
              entityId: unit.id,
              path: [unit.hex, city.hex],
            });
          }
        }
        break;
      }
    }
  }

  // Always end turn
  commands.push({
    type: 'EndTurn',
    playerId,
  });

  return commands;
}

// ─── City Location Scoring ─────────────────────────────────────────────────────

function findBestCityLocation(
  state: GameState,
  playerId: string,
  nearHex: { q: number; r: number },
): { q: number; r: number } | null {
  const searchRadius = 5;
  let bestHex: { q: number; r: number } | null = null;
  let bestScore = -1;

  const playerCities = Object.values(state.cities || {}).filter(
    (c: any) => c.ownerId === playerId,
  );

  for (let radius = 0; radius <= searchRadius; radius++) {
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
        const hex = { q: nearHex.q + dq, r: nearHex.r + dr };
        const key = hexKey(hex);
        const tile = state.map?.tiles?.[key];
        if (!tile) continue;

        const terrain = tile.terrain;
        if (terrain === 'mountain' || terrain === 'water') continue;

        // Must not have an existing city
        const existingCity = Object.values(state.cities || {}).some((c: any) =>
          c.hex.q === hex.q && c.hex.r === hex.r,
        );
        if (existingCity) continue;

        let score = 0;

        // Prefer resources
        if (tile.resource) score += 20;

        // Prefer near settler
        const dist = hexDistance(nearHex, hex);
        score += Math.max(0, 10 - dist * 2);

        // Prefer spread from other cities
        for (const city of playerCities) {
          const cityDist = hexDistance(city.hex, hex);
          if (cityDist < 4) score -= 15;
          else if (cityDist < 7) score += 5;
          else score += 2;
        }

        // Count adjacent walkable hexes
        let adjWalkable = 0;
        for (const d of HEX_DIRECTIONS) {
          const adjKey = hexKey({ q: hex.q + d.q, r: hex.r + d.r });
          const adjTile = state.map?.tiles?.[adjKey];
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
  }

  return bestHex;
}

// ─── Message Handler ───────────────────────────────────────────────────────────

self.onmessage = function (e: MessageEvent) {
  const request = e.data;
  const requestId: string = request.requestId ?? '';

  try {
    if (request.type === 'generateTurn') {
      const { state, playerId, difficulty } = request;
      const commands = generateTurn(state, playerId, difficulty ?? 'normal');

      self.postMessage({
        type: 'generateTurnResult',
        requestId,
        commands,
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

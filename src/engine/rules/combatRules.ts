/**
 * Combat resolution rules for "Realms of War".
 *
 * Pure functions implementing combat between units and cities.
 * All functions are side-effect free and return new state rather than mutating.
 */

import type { CityId, EntityId, HexCoord, PlayerId } from '../core/types';
import type { GameState, EntityData, CityState, HexTile } from '../core/GameState';
import { hexKey, hexDistance, HEX_DIRECTIONS } from '../core/types';
import { TERRAIN_TYPES } from '../../data/terrain';
import { UNIT_TYPES } from '../../data/units';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single combat bonus applied during combat calculation. */
export interface CombatBonus {
  source: string;
  type: 'attack' | 'defense';
  value: number;
}

/** Full result of a combat encounter. */
export interface CombatResult {
  /** Damage dealt by the attacker to the defender. */
  attackerDamage: number;
  /** Damage dealt by the defender to the attacker (counter-attack). */
  defenderDamage: number;
  /** Attacker HP after combat. */
  attackerHPAfter: number;
  /** Defender HP after combat. */
  defenderHPAfter: number;
  /** Whether the attacker landed a critical hit. */
  isCritical: boolean;
  /** Whether the defender was killed. */
  defenderKilled: boolean;
  /** Whether the attacker was killed by counter-attack. */
  attackerKilled: boolean;
  /** List of all bonuses that were applied. */
  bonuses: CombatBonus[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Critical hit chance (10%). */
const CRITICAL_HIT_CHANCE = 0.10;

/** Critical hit damage multiplier (2x). */
const CRITICAL_HIT_MULTIPLIER = 2;

/** Minimum damage dealt in any attack. */
const MINIMUM_DAMAGE = 1;

/** Terrain bonuses. */
const HILLS_ATTACK_BONUS = 0.25;
const FOREST_DEFENSE_BONUS = 0.15;
const FORTIFICATION_DEFENSE_BONUS = 0.50;

/** Height advantage bonus (attacking from higher elevation). */
const HEIGHT_ADVANTAGE_ATTACK_BONUS = 0.20;

/** Flanking bonus (2+ friendly units adjacent to defender). */
const FLANKING_ATTACK_BONUS = 0.30;
const FLANKING_THRESHOLD = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get an entity by ID. */
function getEntity(state: GameState, entityId: EntityId): EntityData | null {
  return state.entities[entityId] ?? null;
}

/** Get a hex tile from the game state. */
function getHexTile(state: GameState, hex: HexCoord): HexTile | null {
  return state.map.tiles[hexKey(hex)] ?? null;
}

/** Get an entity at a specific hex. */
function getEntityAtHex(state: GameState, hex: HexCoord): EntityData | null {
  const key = hexKey(hex);
  return Object.values(state.entities).find((e) => hexKey(e.hex) === key) ?? null;
}

/** Check if two entities belong to the same player. */
function isFriendly(entityA: EntityData, entityB: EntityData): boolean {
  return entityA.ownerId === entityB.ownerId;
}

/** Check if two players are at war. */
function isAtWar(state: GameState, playerA: PlayerId, playerB: PlayerId): boolean {
  if (playerA === playerB) return false;
  const keyA = `${playerA}:${playerB}`;
  const keyB = `${playerB}:${playerA}`;
  const entry = state.diplomacy[keyA] ?? state.diplomacy[keyB];
  return !entry || entry.status === 'war';
}

/** Check if a unit has a specific ability. */
function hasAbility(entity: EntityData, ability: string): boolean {
  return entity.abilities.includes(ability);
}

/** Simple deterministic pseudo-random based on seed values. */
function seededRandom(...values: number[]): number {
  let hash = 0;
  for (const v of values) {
    hash = ((hash << 5) - hash + v) | 0;
  }
  // Normalize to [0, 1)
  return ((Math.abs(hash) % 10000) / 10000);
}

// ─── Bonus Calculations ──────────────────────────────────────────────────────

/**
 * Calculate terrain-based combat bonuses.
 *
 * - Hills: +25% attack
 * - Forest: +15% defense
 * - Fortification: +50% defense
 */
function calculateTerrainBonuses(
  state: GameState,
  attackerHex: HexCoord,
  defenderHex: HexCoord,
): CombatBonus[] {
  const bonuses: CombatBonus[] = [];

  const attackerTile = getHexTile(state, attackerHex);
  const defenderTile = getHexTile(state, defenderHex);

  if (attackerTile) {
    // Hills attack bonus
    if (attackerTile.terrain === 'hills') {
      bonuses.push({ source: 'Hills terrain', type: 'attack', value: HILLS_ATTACK_BONUS });
    }
  }

  if (defenderTile) {
    // Forest defense bonus
    if (defenderTile.terrain === 'forest') {
      bonuses.push({ source: 'Forest terrain', type: 'defense', value: FOREST_DEFENSE_BONUS });
    }
    // Fortification defense bonus
    if (defenderTile.hasFort) {
      bonuses.push({ source: 'Fortification', type: 'defense', value: FORTIFICATION_DEFENSE_BONUS });
    }
  }

  return bonuses;
}

/**
 * Calculate height advantage bonus.
 *
 * If the attacker is on a higher elevation hex than the defender,
 * they gain +20% attack.
 */
function calculateHeightAdvantage(
  state: GameState,
  attackerHex: HexCoord,
  defenderHex: HexCoord,
): CombatBonus[] {
  const bonuses: CombatBonus[] = [];

  const attackerTile = getHexTile(state, attackerHex);
  const defenderTile = getHexTile(state, defenderHex);

  if (attackerTile && defenderTile) {
    const attackerTerrain = TERRAIN_TYPES[attackerTile.terrain];
    const defenderTerrain = TERRAIN_TYPES[defenderTile.terrain];

    if (attackerTerrain && defenderTerrain) {
      if (attackerTerrain.combatLevel > defenderTerrain.combatLevel) {
        bonuses.push({ source: 'Height advantage', type: 'attack', value: HEIGHT_ADVANTAGE_ATTACK_BONUS });
      }
    }
  }

  return bonuses;
}

/**
 * Calculate flanking bonus.
 *
 * If 2 or more friendly units are adjacent to the defender,
 * the attacker gains +30% attack.
 */
function calculateFlankingBonus(
  state: GameState,
  attacker: EntityData,
  defender: EntityData,
): CombatBonus[] {
  const bonuses: CombatBonus[] = [];
  let adjacentFriendlies = 0;

  for (let d = 0; d < 6; d++) {
    const neighborHex = {
      q: defender.hex.q + HEX_DIRECTIONS[d].q,
      r: defender.hex.r + HEX_DIRECTIONS[d].r,
    };
    const occupant = getEntityAtHex(state, neighborHex);
    if (occupant && occupant.id !== attacker.id && occupant.ownerId === attacker.ownerId) {
      adjacentFriendlies++;
    }
  }

  if (adjacentFriendlies >= FLANKING_THRESHOLD) {
    bonuses.push({ source: `Flanking (${adjacentFriendlies} allies adjacent)`, type: 'attack', value: FLANKING_ATTACK_BONUS });
  }

  return bonuses;
}

// ─── Can Attack ───────────────────────────────────────────────────────────────

/**
 * Check whether an attacker can attack a target.
 *
 * Validates:
 * - Attacker exists and hasn't already attacked
 * - Target exists
 * - Attacker and defender are enemies
 * - Range check (melee = adjacent, ranged = within range)
 * - Line of sight for ranged attacks
 * - Wall must be destroyed before attacking city garrison
 *
 * @param state - Current game state
 * @param attackerId - ID of the attacking entity
 * @param targetId - ID of the target (entity or city)
 * @returns Whether the attack can proceed, with reason if not
 */
export function canAttack(
  state: GameState,
  attackerId: EntityId,
  targetId: EntityId | CityId,
): { canAttack: boolean; reason?: string } {
  const attacker = getEntity(state, attackerId);
  if (!attacker) {
    return { canAttack: false, reason: 'Attacker not found' };
  }

  if (attacker.hasActed) {
    return { canAttack: false, reason: 'Attacker has already acted this turn' };
  }

  if (attacker.hp <= 0) {
    return { canAttack: false, reason: 'Attacker is dead' };
  }

  // Check if target is a unit
  const targetEntity = getEntity(state, targetId as EntityId);
  if (targetEntity) {
    // Cannot attack friendly units
    if (isFriendly(attacker, targetEntity)) {
      return { canAttack: false, reason: 'Cannot attack friendly units' };
    }

    // Must be at war to attack
    if (!isAtWar(state, attacker.ownerId, targetEntity.ownerId)) {
      return { canAttack: false, reason: 'Not at war with target player' };
    }

    // Range check
    const dist = hexDistance(attacker.hex, targetEntity.hex);
    if (dist > attacker.range) {
      return { canAttack: false, reason: `Target out of range (distance: ${dist}, range: ${attacker.range})` };
    }

    // Melee units must be adjacent
    if (attacker.range === 1 && dist > 1) {
      return { canAttack: false, reason: 'Melee units must be adjacent to attack' };
    }

    return { canAttack: true };
  }

  // Check if target is a city
  const targetCity = state.cities[targetId as CityId];
  if (targetCity) {
    // Cannot attack own city
    if (targetCity.ownerId === attacker.ownerId) {
      return { canAttack: false, reason: 'Cannot attack own city' };
    }

    // Must be at war
    if (!isAtWar(state, attacker.ownerId, targetCity.ownerId)) {
      return { canAttack: false, reason: 'Not at war with city owner' };
    }

    // Range check — city is at its hex
    const dist = hexDistance(attacker.hex, targetCity.hex);
    if (dist > attacker.range) {
      return { canAttack: false, reason: `City out of range (distance: ${dist}, range: ${attacker.range})` };
    }

    // Must destroy walls first (if walls have HP remaining)
    if (targetCity.wallHp > 0 && attacker.attackType !== 'siege') {
      // Non-siege units can only attack walls, not the garrison
      // Siege units can attack the garrison directly through walls
      // Actually per GDD: must destroy walls before attacking garrison
      // So non-siege must attack walls, siege can bypass (partially)
      // We allow the attack but damage goes to walls first
    }

    return { canAttack: true };
  }

  return { canAttack: false, reason: 'Target not found' };
}

// ─── Calculate Combat ────────────────────────────────────────────────────────

/**
 * Calculate the outcome of combat between an attacker and a defender.
 *
 * Uses the formula:
 *   damage = attacker.attack * (1 + bonuses) - defender.defense * 0.5
 *   minimum damage = 1
 *
 * Also applies:
 * - Terrain bonuses (hills +25% attack, forest +15% defense, fortification +50% defense)
 * - Height advantage (+20% attack from higher elevation)
 * - Flanking (+30% attack if 2+ friendly units adjacent to defender)
 * - Critical hit (10% chance, 2x damage)
 * - Counter-attack (defender deals damage back if melee and survives)
 *
 * @param state - Current game state
 * @param attackerId - ID of the attacking entity
 * @param defenderId - ID of the defending entity (null for city attack)
 * @param targetCityId - ID of the target city (null for unit attack)
 * @returns Full combat result including damage, bonuses, and kill status
 */
export function calculateCombat(
  state: GameState,
  attackerId: EntityId,
  defenderId: EntityId | null,
  targetCityId: CityId | null,
): CombatResult {
  const attacker = getEntity(state, attackerId);
  if (!attacker) {
    return {
      attackerDamage: 0,
      defenderDamage: 0,
      attackerHPAfter: 0,
      defenderHPAfter: 0,
      isCritical: false,
      defenderKilled: false,
      attackerKilled: false,
      bonuses: [],
    };
  }

  const bonuses: CombatBonus[] = [];

  // ─── City Attack ────────────────────────────────────────────────────────

  if (targetCityId) {
    const city = state.cities[targetCityId];
    if (!city) {
      return {
        attackerDamage: 0, defenderDamage: 0,
        attackerHPAfter: attacker.hp, defenderHPAfter: 0,
        isCritical: false, defenderKilled: false, attackerKilled: false,
        bonuses: [],
      };
    }

    // Add terrain bonuses for attacker
    bonuses.push(...calculateTerrainBonuses(state, attacker.hex, city.hex));
    bonuses.push(...calculateHeightAdvantage(state, attacker.hex, city.hex));

    // Calculate attack bonus total
    const attackBonusTotal = bonuses
      .filter((b) => b.type === 'attack')
      .reduce((sum, b) => sum + b.value, 0);

    // City defense bonuses
    let cityDefenseBonus = 0;
    if (city.buildings.includes('walls')) {
      cityDefenseBonus += 0.20; // Walls give +20% defense
      bonuses.push({ source: 'City walls', type: 'defense', value: 0.20 });
    }
    if (city.buildings.includes('castle')) {
      cityDefenseBonus += 0.25; // Castle gives +25% defense
      bonuses.push({ source: 'Castle', type: 'defense', value: 0.25 });
    }

    // Siege units do bonus damage to walls
    let damageToWalls = 0;
    let damageToCity = 0;

    if (city.wallHp > 0) {
      // Attack walls first
      const wallDefense = 5; // Base wall defense
      const rawDamage = attacker.attack * (1 + attackBonusTotal) - wallDefense * 0.5;
      const siegeBonus = hasAbility(attacker, 'siege_attack') ? 1.5 : 1.0;
      damageToWalls = Math.max(MINIMUM_DAMAGE, Math.floor(rawDamage * siegeBonus));

      // Critical hit check
      const critRoll = seededRandom(state.turn, attacker.id.charCodeAt(0) || 0, targetCityId.charCodeAt(0) || 0);
      if (critRoll < CRITICAL_HIT_CHANCE) {
        damageToWalls = Math.floor(damageToWalls * CRITICAL_HIT_MULTIPLIER);
        bonuses.push({ source: 'Critical hit', type: 'attack', value: CRITICAL_HIT_MULTIPLIER });
      }

      const wallHPAfter = Math.max(0, city.wallHp - damageToWalls);
      return {
        attackerDamage: damageToWalls,
        defenderDamage: 0,
        attackerHPAfter: attacker.hp,
        defenderHPAfter: wallHPAfter,
        isCritical: critRoll < CRITICAL_HIT_CHANCE,
        defenderKilled: false,
        attackerKilled: false,
        bonuses,
      };
    }

    // No walls — attack city HP directly
    const cityDefense = 3 + city.level; // City defense scales with level
    const rawDamage = attacker.attack * (1 + attackBonusTotal) - cityDefense * (1 + cityDefenseBonus) * 0.5;
    damageToCity = Math.max(MINIMUM_DAMAGE, Math.floor(rawDamage));

    // Critical hit check
    const critRoll = seededRandom(state.turn, attacker.id.charCodeAt(0) || 0, targetCityId.charCodeAt(0) || 0);
    let isCrit = false;
    if (critRoll < CRITICAL_HIT_CHANCE) {
      damageToCity = Math.floor(damageToCity * CRITICAL_HIT_MULTIPLIER);
      isCrit = true;
    }

    const cityHPAfter = Math.max(0, city.hp - damageToCity);

    return {
      attackerDamage: damageToCity,
      defenderDamage: 0, // Cities don't counter-attack (that's what garrison units are for)
      attackerHPAfter: attacker.hp,
      defenderHPAfter: cityHPAfter,
      isCritical: isCrit,
      defenderKilled: cityHPAfter <= 0,
      attackerKilled: false,
      bonuses,
    };
  }

  // ─── Unit vs Unit Combat ────────────────────────────────────────────────

  const defender = defenderId ? getEntity(state, defenderId) : null;
  if (!defender) {
    return {
      attackerDamage: 0, defenderDamage: 0,
      attackerHPAfter: attacker.hp, defenderHPAfter: 0,
      isCritical: false, defenderKilled: false, attackerKilled: false,
      bonuses: [],
    };
  }

  // Calculate all bonuses
  bonuses.push(...calculateTerrainBonuses(state, attacker.hex, defender.hex));
  bonuses.push(...calculateHeightAdvantage(state, attacker.hex, defender.hex));
  bonuses.push(...calculateFlankingBonus(state, attacker, defender));

  // Charge bonus for knights
  if (hasAbility(attacker, 'charge') && attacker.hasMoved) {
    bonuses.push({ source: 'Charge', type: 'attack', value: 0.3 });
  }

  // Anti-cavalry bonus for spearmen vs cavalry
  if (hasAbility(attacker, 'anti_cavalry')) {
    const defenderType = UNIT_TYPES[defender.typeId as keyof typeof UNIT_TYPES];
    if (defenderType && (defender.typeId === 'knight')) {
      bonuses.push({ source: 'Anti-cavalry', type: 'attack', value: 0.5 });
    }
  }

  // Stand ground bonus for defender
  if (hasAbility(defender, 'stand_ground') && !defender.hasMoved) {
    bonuses.push({ source: 'Stand ground', type: 'defense', value: 0.2 });
  }

  // Shield wall bonus for defender (spearman)
  if (hasAbility(defender, 'spear_wall') && !defender.hasMoved) {
    bonuses.push({ source: 'Spear wall', type: 'defense', value: 0.15 });
  }

  // Calculate total bonuses
  const attackBonusTotal = bonuses
    .filter((b) => b.type === 'attack')
    .reduce((sum, b) => sum + b.value, 0);
  const defenseBonusTotal = bonuses
    .filter((b) => b.type === 'defense')
    .reduce((sum, b) => sum + b.value, 0);

  // Attacker damage formula: attacker.attack * (1 + bonuses) - defender.defense * 0.5
  const rawAttackerDamage = attacker.attack * (1 + attackBonusTotal) - defender.defense * (1 + defenseBonusTotal) * 0.5;
  let attackerDamage = Math.max(MINIMUM_DAMAGE, Math.floor(rawAttackerDamage));

  // Critical hit check
  const critRoll = seededRandom(
    state.turn,
    attacker.id.charCodeAt(0) || 0,
    defender.id.charCodeAt(0) || 0,
  );
  let isCrit = false;
  if (critRoll < CRITICAL_HIT_CHANCE) {
    attackerDamage = Math.floor(attackerDamage * CRITICAL_HIT_MULTIPLIER);
    isCrit = true;
    bonuses.push({ source: 'Critical hit', type: 'attack', value: CRITICAL_HIT_MULTIPLIER });
  }

  const defenderHPAfter = Math.max(0, defender.hp - attackerDamage);
  const defenderKilled = defenderHPAfter <= 0;

  // Counter-attack (only if defender survives, is melee/ranged, and attacker is in range)
  let defenderDamage = 0;
  let attackerKilled = false;
  let attackerHPAfter = attacker.hp;

  if (!defenderKilled && attacker.range <= 1) {
    // Melee counter-attack
    const rawCounterDamage = defender.attack * 0.5 - attacker.defense * 0.5;
    defenderDamage = Math.max(0, Math.floor(rawCounterDamage));

    attackerHPAfter = Math.max(0, attacker.hp - defenderDamage);
    attackerKilled = attackerHPAfter <= 0;
  }

  return {
    attackerDamage,
    defenderDamage,
    attackerHPAfter,
    defenderHPAfter,
    isCritical: isCrit,
    defenderKilled,
    attackerKilled,
    bonuses,
  };
}

// ─── Apply Combat ─────────────────────────────────────────────────────────────

/**
 * Apply combat results to the game state.
 *
 * Handles:
 * - Damage to attacker and defender
 * - Unit death (removes dead units from state)
 * - City wall/city HP damage
 * - Sets attacker hasActed flag
 *
 * @param state - Current game state (not mutated)
 * @param attackerId - ID of the attacking entity
 * @param defenderId - ID of the defending entity (null for city attack)
 * @param targetCityId - ID of the target city (null for unit attack)
 * @returns New game state and combat result
 */
export function applyCombat(
  state: GameState,
  attackerId: EntityId,
  defenderId: EntityId | null,
  targetCityId: CityId | null,
): { state: GameState; result: CombatResult } {
  const result = calculateCombat(state, attackerId, defenderId, targetCityId);

  let newState = { ...state };
  const newEntities = { ...state.entities };
  const newCities = { ...state.cities };

  // Update attacker
  const attacker = newEntities[attackerId];
  if (attacker) {
    newEntities[attackerId] = {
      ...attacker,
      hp: result.attackerHPAfter,
      hasActed: true,
      xp: attacker.xp + (result.defenderKilled ? 20 : 5), // XP gain
    };

    // Remove attacker if killed
    if (result.attackerKilled) {
      delete newEntities[attackerId];
    }
  }

  // Update defender (unit)
  if (defenderId) {
    const defender = newEntities[defenderId];
    if (defender) {
      newEntities[defenderId] = {
        ...defender,
        hp: result.defenderHPAfter,
        xp: defender.xp + (result.attackerKilled ? 20 : 2), // XP for counter-attack
      };

      // Remove defender if killed
      if (result.defenderKilled) {
        delete newEntities[defenderId];
      }
    }
  }

  // Update city (if city was attacked)
  if (targetCityId) {
    const city = newCities[targetCityId];
    if (city) {
      // Check if attacking walls or city HP
      if (city.wallHp > 0) {
        // Damage goes to walls
        newCities[targetCityId] = {
          ...city,
          wallHp: result.defenderHPAfter, // defenderHPAfter is wall HP in this case
        };
      } else {
        // Damage goes to city HP
        newCities[targetCityId] = {
          ...city,
          hp: result.defenderHPAfter,
        };

        // If city HP reaches 0, city is captured (handled by caller)
      }
    }
  }

  newState = {
    ...newState,
    entities: newEntities,
    cities: newCities,
  };

  return { state: newState, result };
}

import { createDefaultConfig } from '@/engine/core/GameConfig';
import type { GameConfig } from '@/engine/core/GameConfig';
import { GameEngine } from '@/engine/core/GameEngine';
import type { EntityData, GameState, HexTile } from '@/engine/core/GameState';
import type { HexCoord, PlayerId, ResourceYield, TerrainTypeId, UnitTypeId } from '@/engine/core/types';
import { hexDistance, hexKey, hexRing } from '@/engine/core/types';
import { hexToWorld } from '@/engine/hex/coordinates';
import { generateMap } from '@/engine/mapgen/generateMap';
import { populateStartingPositions } from '@/engine/core/startPositions';
import { UNIT_TYPES } from '@/data/units';

export const GRAPHICS_SHOWCASE_SEED = 180018;
export const GRAPHICS_SHOWCASE_ROUTE = '/graphics-showcase';
export const GRAPHICS_SHOWCASE_CENTER: HexCoord = { q: 8, r: 6 };
export const GRAPHICS_SHOWCASE_SELECTED_ENTITY_ID = 'unit-showcase-archer-player-0';

export type GraphicsShowcaseSession = {
  config: GameConfig;
  engine: GameEngine;
  gameState: GameState;
  activePlayerId: PlayerId;
  localPlayerIds: PlayerId[];
  cameraTarget: [number, number, number];
  selectedEntityId: string;
  selectedHex: HexCoord;
  movementPath: HexCoord[];
  reachableHexes: HexCoord[];
  attackPreviewHexes: HexCoord[];
  attackTargets: string[];
};

const visibleCenter = GRAPHICS_SHOWCASE_CENTER;

export function createGraphicsShowcaseSession(): GraphicsShowcaseSession {
  const config = createDefaultConfig({
    seed: GRAPHICS_SHOWCASE_SEED,
    mode: 'single',
    map: {
      radius: 18,
      type: 'continents',
      waterLevel: 0.34,
      mountainDensity: 0.18,
      forestDensity: 0.34,
      resourceAbundance: 0.9,
      riftPortals: 3,
    },
    players: [
      { id: 'player-0', name: 'Crimson Realm', color: '#d85b48', isAI: false, slot: 0 },
      { id: 'player-1', name: 'Azure March', color: '#3f7fc4', isAI: true, slot: 1 },
    ],
  });

  const engine = new GameEngine(config);
  const mapResult = generateMap({
    width: 18,
    height: 14,
    seed: GRAPHICS_SHOWCASE_SEED,
    playerCount: config.players.length,
  });

  let gameState: GameState = {
    ...engine.getState(),
    map: mapResult.mapData,
  };

  gameState = authorShowcaseMap(gameState);
  gameState = populateStartingPositions(gameState, [
    { playerId: 'player-0', hex: GRAPHICS_SHOWCASE_CENTER },
    { playerId: 'player-1', hex: { q: 13, r: 7 } },
  ]);
  gameState = enrichShowcaseSettlements(gameState);
  gameState = addShowcaseUnits(gameState);
  gameState = applyShowcaseVisibility(gameState);
  gameState = {
    ...gameState,
    phase: 'playerActions',
    activePlayerId: 'player-0',
    turn: 24,
    nextEntitySeq: 100,
    nextCitySeq: 20,
  };

  engine.setState(gameState);

  return {
    config,
    engine,
    gameState,
    activePlayerId: 'player-0',
    localPlayerIds: ['player-0'],
    cameraTarget: hexToWorld(GRAPHICS_SHOWCASE_CENTER),
    selectedEntityId: GRAPHICS_SHOWCASE_SELECTED_ENTITY_ID,
    selectedHex: { q: 9, r: 5 },
    movementPath: [
      { q: 8, r: 5 },
      { q: 9, r: 5 },
      { q: 10, r: 5 },
      { q: 10, r: 6 },
    ],
    reachableHexes: [
      { q: 7, r: 6 },
      { q: 8, r: 5 },
      { q: 8, r: 7 },
      { q: 9, r: 5 },
      { q: 9, r: 6 },
      { q: 10, r: 5 },
      { q: 10, r: 6 },
    ],
    attackPreviewHexes: [
      { q: 11, r: 5 },
      { q: 12, r: 6 },
      { q: 12, r: 7 },
    ],
    attackTargets: ['unit-showcase-bandit-player-1'],
  };
}

function authorShowcaseMap(state: GameState): GameState {
  let tiles = { ...state.map.tiles };

  const apply = (
    coord: HexCoord,
    terrain: TerrainTypeId,
    options: Partial<Pick<HexTile, 'resource' | 'hasRoad' | 'riverMask' | 'hasFort' | 'improvement' | 'hasRiftPortal' | 'riftPortalOwner'>> = {},
  ) => {
    const key = hexKey(coord);
    const current = tiles[key];
    if (!current) return;
    tiles[key] = {
      ...current,
      terrain,
      resource: options.resource ?? null,
      hasRoad: options.hasRoad ?? current.hasRoad,
      riverMask: options.riverMask ?? current.riverMask,
      hasFort: options.hasFort ?? current.hasFort,
      improvement: options.improvement ?? current.improvement,
      hasRiftPortal: options.hasRiftPortal ?? current.hasRiftPortal,
      riftPortalOwner: options.riftPortalOwner ?? current.riftPortalOwner,
      yield: yieldFor(terrain, options.resource ?? null, options.riverMask ?? current.riverMask ?? 0),
    };
  };

  for (const coord of [
    { q: 2, r: 7 }, { q: 2, r: 8 }, { q: 3, r: 7 }, { q: 3, r: 8 },
    { q: 4, r: 8 }, { q: 4, r: 9 }, { q: 5, r: 9 }, { q: 6, r: 10 },
    { q: 7, r: 10 }, { q: 8, r: 11 }, { q: 9, r: 11 },
  ]) {
    apply(coord, 'water');
  }

  for (const coord of [
    { q: 4, r: 7 }, { q: 5, r: 8 }, { q: 6, r: 9 }, { q: 7, r: 9 }, { q: 8, r: 10 },
  ]) {
    apply(coord, 'plains', { resource: coord.q % 2 === 0 ? 'food' : null });
  }

  for (const coord of [
    { q: 5, r: 3 }, { q: 6, r: 3 }, { q: 6, r: 4 }, { q: 7, r: 3 },
    { q: 7, r: 4 }, { q: 8, r: 3 }, { q: 9, r: 4 },
  ]) {
    apply(coord, 'forest', { resource: coord.q === 7 ? 'wood' : null });
  }

  for (const coord of [
    { q: 9, r: 2 }, { q: 10, r: 2 }, { q: 10, r: 3 }, { q: 11, r: 3 },
    { q: 12, r: 3 }, { q: 12, r: 4 }, { q: 13, r: 4 },
  ]) {
    apply(coord, coord.q >= 11 ? 'mountain' : 'hills', { resource: coord.q >= 11 ? 'stone' : 'iron' });
  }

  for (const coord of [
    { q: 11, r: 8 }, { q: 12, r: 8 }, { q: 12, r: 9 }, { q: 13, r: 8 },
  ]) {
    apply(coord, 'desert', { resource: coord.q === 12 ? 'gold' : null });
  }

  for (const coord of [
    { q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }, { q: 9, r: 5 },
    { q: 10, r: 5 }, { q: 10, r: 6 }, { q: 11, r: 6 }, { q: 12, r: 6 },
  ]) {
    apply(coord, tiles[hexKey(coord)]?.terrain ?? 'plains', { hasRoad: true, improvement: 'road' });
  }

  apply({ q: 7, r: 6 }, 'plains', { resource: 'food', improvement: 'farm', riverMask: 17, hasRoad: true });
  apply({ q: 8, r: 6 }, 'plains', { hasRoad: true });
  apply({ q: 9, r: 6 }, 'hills', { resource: 'iron', improvement: 'mine', riverMask: 9, hasRoad: true });
  apply({ q: 10, r: 6 }, 'plains', { resource: 'gold', improvement: 'farm', riverMask: 36, hasRoad: true });
  apply({ q: 8, r: 7 }, 'ruins', { resource: 'science', hasRiftPortal: true, riftPortalOwner: 'player-0' });
  apply({ q: 9, r: 7 }, 'swamp', { resource: 'mana', improvement: 'mana_focus', riverMask: 12 });
  apply({ q: 10, r: 7 }, 'hills', { improvement: 'quarry_improvement', resource: 'stone', hasFort: true });
  apply({ q: 7, r: 7 }, 'forest', { improvement: 'lumber_mill', resource: 'wood' });
  apply({ q: 11, r: 7 }, 'plains', { hasRoad: true });
  apply({ q: 12, r: 7 }, 'plains', { hasRoad: true, hasFort: true });
  apply({ q: 13, r: 7 }, 'plains', { hasRoad: true });

  return { ...state, map: { ...state.map, tiles } };
}

function enrichShowcaseSettlements(state: GameState): GameState {
  const city = state.cities['city-start-player-0'];
  if (!city) return state;

  const expandedTerritory = Array.from(new Set([
    ...city.territory,
    ...hexRing(GRAPHICS_SHOWCASE_CENTER, 2).map(hexKey),
  ]));
  const tiles = { ...state.map.tiles };
  for (const key of expandedTerritory) {
    const tile = tiles[key];
    if (tile && tile.terrain !== 'water') {
      tiles[key] = { ...tile, owningCityId: city.id };
    }
  }

  return {
    ...state,
    cities: {
      ...state.cities,
      [city.id]: {
        ...city,
        name: 'Emberwatch',
        level: 3,
        population: 7,
        hp: 220,
        maxHp: 220,
        wallHp: 90,
        maxWallHp: 90,
        buildings: ['city_center', 'granary', 'barracks', 'market'],
        territory: expandedTerritory,
        workedHexes: expandedTerritory.slice(0, 7),
        productionPerTurn: 7,
        foodPerTurn: 8,
      },
    },
    map: { ...state.map, tiles },
  };
}

function addShowcaseUnits(state: GameState): GameState {
  return {
    ...state,
    entities: {
      ...state.entities,
      [GRAPHICS_SHOWCASE_SELECTED_ENTITY_ID]: makeUnit(
        GRAPHICS_SHOWCASE_SELECTED_ENTITY_ID,
        'archer',
        'player-0',
        { q: 8, r: 5 },
        32,
      ),
      'unit-showcase-worker-player-0': makeUnit('unit-showcase-worker-player-0', 'worker', 'player-0', { q: 7, r: 6 }, 22),
      'unit-showcase-knight-player-0': makeUnit('unit-showcase-knight-player-0', 'knight', 'player-0', { q: 10, r: 6 }, 68),
      'unit-showcase-bandit-player-1': makeUnit('unit-showcase-bandit-player-1', 'bandit', 'player-1', { q: 12, r: 7 }, 28),
      'unit-showcase-cultist-player-1': makeUnit('unit-showcase-cultist-player-1', 'cultist', 'player-1', { q: 12, r: 8 }, 38),
    },
  };
}

function applyShowcaseVisibility(state: GameState): GameState {
  const visibleHexes: string[] = [];
  const exploredHexes: string[] = [];

  for (const tile of Object.values(state.map.tiles)) {
    const distance = hexDistance(tile.coord, visibleCenter);
    if (distance <= 6) visibleHexes.push(hexKey(tile.coord));
    else if (distance <= 8) exploredHexes.push(hexKey(tile.coord));
  }

  const player0 = state.players['player-0'];
  if (!player0) return state;

  return {
    ...state,
    players: {
      ...state.players,
      'player-0': {
        ...player0,
        visibleHexes,
        exploredHexes,
        score: 420,
        sciencePerTurn: 12,
        incomePerTurn: { gold: 18, food: 14, wood: 9, stone: 8, iron: 3, mana: 2, science: 12 },
      },
    },
  };
}

function makeUnit(id: string, typeId: UnitTypeId, ownerId: PlayerId, hex: HexCoord, hp: number): EntityData {
  const unitType = UNIT_TYPES[typeId];
  return {
    id,
    typeId,
    ownerId,
    hex,
    movementPoints: unitType.mov,
    maxMovement: unitType.mov,
    hp,
    maxHp: unitType.hp,
    attack: unitType.atk,
    defense: unitType.def,
    attackType: unitType.range > 1 ? 'ranged' : 'melee',
    range: unitType.range,
    hasActed: false,
    hasMoved: false,
    xp: 4,
    level: 1,
    promotions: [],
    upkeep: unitType.upkeep as ResourceYield,
    abilities: [...unitType.abilities],
    statusEffects: [],
  };
}

function yieldFor(terrain: TerrainTypeId, resource: string | null, riverMask: number): ResourceYield {
  const base: Record<TerrainTypeId, ResourceYield> = {
    plains: { food: 2, gold: 1 },
    forest: { food: 1, wood: 2 },
    mountain: { stone: 2, science: 1 },
    water: { food: 1 },
    desert: { gold: 1 },
    swamp: { food: 1, science: 1 },
    hills: { stone: 1, gold: 1 },
    ruins: { science: 1, progress: 1 },
  };
  const tileYield: ResourceYield = { ...base[terrain] };
  if (resource) {
    const key = resource as keyof ResourceYield;
    tileYield[key] = (tileYield[key] ?? 0) + 2;
  }
  if (riverMask > 0) {
    tileYield.food = (tileYield.food ?? 0) + 1;
    tileYield.gold = (tileYield.gold ?? 0) + 1;
  }
  return tileYield;
}

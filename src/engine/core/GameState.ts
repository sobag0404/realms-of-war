/**
 * Complete game state for "Realms of War".
 *
 * Every field is pure serializable data — no Three.js, React, DOM references,
 * or functions.  The state can be JSON.stringify'd for save/load, replays,
 * and network sync.
 */

import type {
  AttackType,
  BuildingTypeId,
  CityId,
  DiplomacyStatus,
  EntityId,
  EraId,
  HexCoord,
  PlayerId,
  ResourceId,
  ResourceYield,
  TechBranch,
  TechId,
  TerrainTypeId,
  TurnPhase,
  UnitTypeId,
} from './types';
import type { GameConfig } from './GameConfig';

// ─── Player ───────────────────────────────────────────────────────────────────

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: string;
  isAI: boolean;
  isAlive: boolean;

  /** Current stockpile of resources. */
  resources: Record<ResourceId, number>;

  /** Completed techs (set of tech IDs). */
  techs: TechId[];

  /** Current era. */
  era: EraId;

  /** Current research project (null if none). */
  currentResearch: TechId | null;

  /** Science accumulated toward current research. */
  researchProgress: number;

  /** Total science per turn (cached, recalculated each turn). */
  sciencePerTurn: number;

  /** Per-turn resource income (cached). */
  incomePerTurn: ResourceYield;

  /** Per-turn upkeep cost (cached). */
  upkeepPerTurn: ResourceYield;

  /** Set of hexes visible to this player (hex keys "q,r"). */
  visibleHexes: string[];

  /** Set of hexes previously seen but no longer visible (hex keys). */
  exploredHexes: string[];

  /** Score points accumulated. */
  score: number;

  /** Last turn this player was active (for AFK / disconnect detection). */
  lastActiveTurn: number;
}

// ─── Entity (Unit) ────────────────────────────────────────────────────────────

export interface EntityData {
  id: EntityId;
  typeId: UnitTypeId;
  ownerId: PlayerId;
  /** Current hex position. */
  hex: HexCoord;
  /** Remaining movement points this turn. */
  movementPoints: number;
  /** Max movement points per turn. */
  maxMovement: number;
  hp: number;
  maxHp: number;
  /** Attack strength (base). */
  attack: number;
  /** Defense strength (base). */
  defense: number;
  /** Attack type this unit uses. */
  attackType: AttackType;
  /** Range in hexes (1 = melee). */
  range: number;
  /** Whether this unit has acted this turn. */
  hasActed: boolean;
  /** Whether this unit has moved this turn. */
  hasMoved: boolean;
  /** Experience points. */
  xp: number;
  /** Level (derived from xp thresholds). */
  level: number;
  /** Promotions chosen. */
  promotions: string[];
  /** Upkeep cost per turn. */
  upkeep: ResourceYield;
  /** Abilities this unit has (IDs). */
  abilities: string[];
  /** Status effects (e.g. "fortified", "poisoned"). */
  statusEffects: string[];
}

// ─── City ─────────────────────────────────────────────────────────────────────

export interface ProductionItem {
  /** What is being produced (building or unit type ID). */
  id: string;
  /** Kind of production. */
  kind: 'building' | 'unit';
  /** Production points accumulated so far. */
  progress: number;
  /** Total production points needed. */
  cost: number;
}

export interface CityState {
  id: CityId;
  name: string;
  hex: HexCoord;
  ownerId: PlayerId;

  level: number;
  population: number;
  hp: number;
  maxHp: number;
  wallHp: number;
  maxWallHp: number;

  /** Buildings constructed in this city. */
  buildings: BuildingTypeId[];

  /** Growth progress toward next population point. */
  growthProgress: number;
  /** Food needed for next population point. */
  growthTarget: number;

  /** Hexes this city is working (hex keys). */
  workedHexes: string[];

  /** Current production queue (first item is active). */
  productionQueue: ProductionItem[];

  /** Cached production output per turn. */
  productionPerTurn: number;

  /** Cached food output per turn. */
  foodPerTurn: number;

  /** Territory hexes owned by this city (hex keys). */
  territory: string[];

  /** Whether the city is under siege this turn. */
  isUnderSiege: boolean;

  /** Turn the city was founded. */
  foundedTurn: number;
}

// ─── Hex Tile ─────────────────────────────────────────────────────────────────

export interface HexTile {
  coord: HexCoord;
  terrain: TerrainTypeId;
  /** Resource on this hex (null if none). */
  resource: string | null;
  /** Yield override (e.g. from improvements). */
  yield: ResourceYield;
  /** Whether this hex has a road. */
  hasRoad: boolean;
  /** River edge mask, one bit per hex direction. Visual/content data; 0 means no river edge. */
  riverMask?: number;
  /** Whether this hex has a fortification. */
  hasFort: boolean;
  /** Owning city ID (null if unclaimed). */
  owningCityId: CityId | null;
  /** Improvement built on this hex. */
  improvement: string | null;
  /** Whether this hex contains a rift portal. */
  hasRiftPortal: boolean;
  /** Owner of the rift portal (if any). */
  riftPortalOwner: PlayerId | null;
}

// ─── Diplomacy ────────────────────────────────────────────────────────────────

export interface DiplomacyEntry {
  status: DiplomacyStatus;
  /** Turn the current status was established. */
  sinceTurn: number;
  /** Turns remaining on a peace treaty (0 = none). */
  peaceTreatyTurns: number;
}

/** Indexed by "playerA:playerB" (always sorted alphabetically). */
export type DiplomacyMap = Record<string, DiplomacyEntry>;

// ─── Fog of War ───────────────────────────────────────────────────────────────

export type Visibility = 'hidden' | 'explored' | 'visible';

// ─── Map Data ─────────────────────────────────────────────────────────────────

export interface MapData {
  radius: number;
  /** Hex tiles indexed by "q,r" key. */
  tiles: Record<string, HexTile>;
}

// ─── Command Log ──────────────────────────────────────────────────────────────

export interface CommandLogEntry {
  turn: number;
  playerId: PlayerId;
  commandType: string;
  /** SHA-256 or simple hash of the command payload for integrity checks. */
  payloadHash: string;
}

// ─── Full Game State ──────────────────────────────────────────────────────────

export interface GameState {
  /** Schema version for deserialization. */
  version: number;
  /** Seed used to generate the game (for reproducibility). */
  seed: number;
  /** Current turn number (1-indexed). */
  turn: number;
  /** Current phase within the turn. */
  phase: TurnPhase;
  /** ID of the player whose turn it is. */
  activePlayerId: PlayerId;
  /** Ordered list of player IDs for turn rotation. */
  turnOrder: PlayerId[];

  /** Player states indexed by player ID. */
  players: Record<PlayerId, PlayerState>;

  /** The hex map. */
  map: MapData;

  /** All entities (units) indexed by entity ID. */
  entities: Record<EntityId, EntityData>;

  /** All cities indexed by city ID. */
  cities: Record<CityId, CityState>;

  /** Diplomatic relations between players. */
  diplomacy: DiplomacyMap;

  /** Hash of the command log for integrity / replay verification. */
  commandLogHash: string;

  /** Whether the game is over. */
  gameOver: boolean;

  /** Winner player ID (null if no winner yet). */
  winnerId: PlayerId | null;

  /** Victory condition that ended the game. */
  victoryCondition: string | null;

  /** Monotonic counter for generating deterministic entity IDs. Part of serializable state. */
  nextEntitySeq: number;

  /** Monotonic counter for generating deterministic city IDs. Part of serializable state. */
  nextCitySeq: number;
}

// ─── State Factory ────────────────────────────────────────────────────────────

export function createInitialGameState(config: GameConfig): GameState {
  const players: Record<PlayerId, PlayerState> = {};

  for (const setup of config.players) {
    const startRes = { ...config.startResources };
    players[setup.id] = {
      id: setup.id,
      name: setup.name,
      color: setup.color,
      isAI: setup.isAI,
      isAlive: true,
      resources: {
        gold: startRes.gold ?? 0,
        food: startRes.food ?? 0,
        wood: startRes.wood ?? 0,
        stone: startRes.stone ?? 0,
        iron: startRes.iron ?? 0,
        mana: startRes.mana ?? 0,
        progress: startRes.progress ?? 0,
        science: startRes.science ?? 0,
      },
      techs: [],
      era: config.startEra,
      currentResearch: null,
      researchProgress: 0,
      sciencePerTurn: 0,
      incomePerTurn: {},
      upkeepPerTurn: {},
      visibleHexes: [],
      exploredHexes: [],
      score: 0,
      lastActiveTurn: 1,
    };
  }

  return {
    version: config.version,
    seed: config.seed,
    turn: 1,
    phase: 'start',
    activePlayerId: config.players[0]?.id ?? '',
    turnOrder: config.players.map((p) => p.id),
    players,
    map: {
      radius: config.map.radius,
      tiles: {},
    },
    entities: {},
    cities: {},
    diplomacy: {},
    commandLogHash: '',
    gameOver: false,
    winnerId: null,
    victoryCondition: null,
    nextEntitySeq: 1,
    nextCitySeq: 1,
  };
}

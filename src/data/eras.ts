// ============================================================================
// Era Definitions — Realms of War
// ============================================================================

import type { EraId } from '@/engine/core/types';

/** Full era definition */
export interface EraDefinition {
  id: EraId;
  name: string;
  nameRu: string;
  /** Turn when this era typically begins */
  typicalStartTurn: number;
  /** Number of technologies in this era */
  techCount: number;
  /** Description */
  description: string;
  descriptionRu: string;
  /** Color theme for this era */
  color: string;
  /** Unlocked game features at this era */
  unlocks: string[];
}

// ---------------------------------------------------------------------------
// Era data
// ---------------------------------------------------------------------------
export const ERAS: Record<EraId, EraDefinition> = {
  primitives: {
    id: 'primitives',
    name: 'Primitives',
    nameRu: 'Первобытность',
    typicalStartTurn: 0,
    techCount: 6,
    description: 'The dawn of civilization. Tribes struggle to survive with stone tools and crude shelters, laying the foundations of a future empire.',
    descriptionRu: 'Рассвет цивилизации. Племена борются за выживание с каменными орудиями и примитивными укрытиями, закладывая основы будущей империи.',
    color: '#8B7355',
    unlocks: ['settler', 'worker', 'spearman', 'scout', 'barracks', 'granary', 'watchtower'],
  },
  earlyCiv: {
    id: 'earlyCiv',
    name: 'Early Civilization',
    nameRu: 'Ранняя цивилизация',
    typicalStartTurn: 15,
    techCount: 6,
    description: 'Bronze age dawn. The first cities rise, trade networks form, and writing unlocks the power of knowledge.',
    descriptionRu: 'Рассвет бронзового века. Возвышаются первые города, формируются торговые сети, а письменность открывает силу знаний.',
    color: '#CD853F',
    unlocks: ['archer', 'library', 'market', 'walls', 'archery_range'],
  },
  medieval: {
    id: 'medieval',
    name: 'Medieval',
    nameRu: 'Средневековье',
    typicalStartTurn: 35,
    techCount: 8,
    description: 'Iron age and feudalism. Knights ride to war, mages unlock arcane secrets, and siege engines break castle walls.',
    descriptionRu: 'Железный век и феодализм. Рыцари отправляются на войну, маги открывают тайные знания, а осадные орудия рушат стены замков.',
    color: '#708090',
    unlocks: ['swordsman', 'knight', 'mage', 'crossbowman', 'catapult', 'blacksmith', 'temple', 'harbor', 'bank', 'siege_yard', 'mage_tower'],
  },
  renaissance: {
    id: 'renaissance',
    name: 'Renaissance',
    nameRu: 'Возрождение',
    typicalStartTurn: 60,
    techCount: 7,
    description: 'Gunpowder reshapes warfare, alchemy blurs the line between science and magic, and empires vie for world wonders.',
    descriptionRu: 'Порох меняет войну, алхимия стирает границу между наукой и магией, а империи борются за мировые чудеса.',
    color: '#B8860B',
    unlocks: ['paladin', 'castle', 'guild_hall', 'alchemist_lab', 'wonder_sun_obelisk', 'wonder_world_tree', 'wonder_great_foundry'],
  },
  rift: {
    id: 'rift',
    name: 'Rift',
    nameRu: 'Разлом',
    typicalStartTurn: 90,
    techCount: 10,
    description: 'The sky tears open. Dimensional rifts unleash horrors and opportunities alike. Only the strongest empires will survive the apocalypse.',
    descriptionRu: 'Небо разрывается. Пространственные разломы выпускают ужасы и возможности. Только сильнейшие империи переживут апокалипсис.',
    color: '#8B008B',
    unlocks: ['astral_observatory', 'wonder_astral_gate', 'rift_interaction', 'advanced_diplomacy'],
  },
} as const;

/** All era IDs in chronological order. */
export const ERA_ORDER: EraId[] = ['primitives', 'earlyCiv', 'medieval', 'renaissance', 'rift'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve an era definition by its ID. Throws if not found. */
export function getEraById(id: EraId): EraDefinition {
  const e = ERAS[id];
  if (!e) throw new Error(`Unknown era id: ${id}`);
  return e as EraDefinition;
}

/** Get the era that comes after the given era, or null if this is the last era. */
export function getNextEra(current: EraId): EraId | null {
  const idx = ERA_ORDER.indexOf(current);
  if (idx < 0 || idx >= ERA_ORDER.length - 1) return null;
  return ERA_ORDER[idx + 1];
}

/** Get the era that comes before the given era, or null if this is the first era. */
export function getPreviousEra(current: EraId): EraId | null {
  const idx = ERA_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return ERA_ORDER[idx - 1];
}

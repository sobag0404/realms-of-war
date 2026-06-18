/**
 * UnitPanel — selected unit details for the SelectionPanel.
 *
 * Displays unit stats, HP bar, abilities, status effects, and action buttons.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { UNIT_TYPES } from '@/data/units';
import type { UnitTypeId } from '@/data/units';
import type { EntityData } from '@/engine/core/GameState';

// ─── Status Effect Config ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  fortified: 'bg-amber-600/80 text-amber-100',
  poisoned: 'bg-green-700/80 text-green-100',
  healing: 'bg-emerald-600/80 text-emerald-100',
  rallied: 'bg-orange-600/80 text-orange-100',
  stunned: 'bg-gray-600/80 text-gray-100',
  blessed: 'bg-yellow-500/80 text-yellow-100',
  cursed: 'bg-purple-700/80 text-purple-100',
};

const RESOURCE_ICONS: Record<string, string> = {
  gold: 'G',
  food: 'F',
  wood: 'W',
  stone: 'S',
  iron: 'I',
  mana: 'M',
  progress: 'P',
  science: 'Sci',
};

// ─── HP Bar Color ─────────────────────────────────────────────────────────────

function getHpColor(ratio: number): string {
  if (ratio > 0.6) return 'bg-emerald-500';
  if (ratio > 0.3) return 'bg-amber-500';
  return 'bg-red-500';
}

function renderUpkeepBrief(upkeep: EntityData['upkeep']): string {
  return Object.entries(upkeep)
    .filter(([, value]) => value !== undefined && value > 0)
    .map(([key, value]) => `${RESOURCE_ICONS[key] ?? key} ${value}`)
    .join('  ');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UnitPanelProps {
  entity: EntityData;
}

export function UnitPanel({ entity }: UnitPanelProps) {
  const gameState = useGameStore((s) => s.gameState);
  const activePlayerId = useGameStore((s) => s.activePlayerId);
  const dispatchCommand = useGameStore((s) => s.dispatchCommand);

  // Look up unit type definition
  const unitType = useMemo(() => {
    try {
      return UNIT_TYPES[entity.typeId as UnitTypeId];
    } catch {
      return null;
    }
  }, [entity.typeId]);

  const owner = gameState?.players[entity.ownerId];
  const isOwnedByActive = entity.ownerId === activePlayerId;

  const hpRatio = entity.maxHp > 0 ? entity.hp / entity.maxHp : 0;
  const mpRatio = entity.maxMovement > 0 ? entity.movementPoints / entity.maxMovement : 0;
  const upkeepLine = renderUpkeepBrief(entity.upkeep);
  const actionStatus = !isOwnedByActive
    ? 'Foreign unit'
    : entity.hasActed
    ? 'Acted this turn'
    : entity.movementPoints <= 0
    ? 'No movement left'
    : 'Ready for orders';

  // Parse status effects (format: "effectId:duration" or just "effectId")
  const statusEffects = useMemo(() => {
    return entity.statusEffects.map((s) => {
      const parts = s.split(':');
      return { id: parts[0], duration: parts[1] ? Number(parts[1]) : null, raw: s };
    });
  }, [entity.statusEffects]);

  const isFortified = entity.statusEffects.some(
    (s) => s.startsWith('fortified'),
  );

  const handleFortify = useCallback(() => {
    // Dispatch FortifyUnit command — adds fortified status, ends unit's turn
    if (!isOwnedByActive) return;
    dispatchCommand({
      type: 'FortifyUnit',
      playerId: activePlayerId,
      entityId: entity.id,
    });
  }, [dispatchCommand, activePlayerId, isOwnedByActive, entity.id]);

  const handleWake = useCallback(() => {
    if (!isOwnedByActive) return;
    // Would dispatch wake command
  }, [isOwnedByActive]);

  const handleWait = useCallback(() => {
    if (!isOwnedByActive) return;
    // Would dispatch wait command
  }, [isOwnedByActive]);

  return (
    <div className="space-y-2.5">
      {/* Header: Unit name + owner */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {owner && (
          <span
            className="w-3 h-3 rounded-full border border-white/30 shrink-0"
            style={{ backgroundColor: owner.color }}
            aria-label={`Owner: ${owner.name}`}
          />
        )}
        <h3 className="text-white text-sm font-bold truncate">
          {unitType?.nameRu ?? unitType?.name ?? entity.typeId}
        </h3>
        {unitType?.isEnemy && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Enemy
          </Badge>
        )}
      </div>

      {/* HP Bar */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-white/60">
          <span>HP</span>
          <span className="tabular-nums">
            {entity.hp} / {entity.maxHp}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getHpColor(hpRatio)}`}
            style={{ width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }}
            role="progressbar"
            aria-valuenow={entity.hp}
            aria-valuemin={0}
            aria-valuemax={entity.maxHp}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5">
        <StatBox label="ATK" value={entity.attack} />
        <StatBox label="DEF" value={entity.defense} />
        <StatBox label="RNG" value={entity.range} />
        <StatBox
          label="MOV"
          value={entity.movementPoints}
          max={entity.maxMovement}
        />
      </div>

      {/* Level & XP */}
      <div className="flex items-center gap-2 text-xs text-white/60">
        <span>
          Lvl {entity.level}
        </span>
        <span className="text-white/30">|</span>
        <span>
          XP {entity.xp}
        </span>
      </div>

      {/* Movement Points bar */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-white/60">
          <span>Movement</span>
          <span className="tabular-nums">
            {entity.movementPoints} / {entity.maxMovement}
          </span>
        </div>
        <Progress
          value={mpRatio * 100}
          className="h-1.5 bg-white/10"
        />
      </div>

      <div className="hud-chip flex items-center justify-between gap-2 px-2 py-1.5 text-[10px]">
        <span className="font-bold uppercase tracking-[0.14em] text-white/45">Status</span>
        <span className={!isOwnedByActive || entity.hasActed || entity.movementPoints <= 0 ? 'text-white/55' : 'text-emerald-300'}>
          {actionStatus}
        </span>
      </div>

      {upkeepLine && (
        <div className="hud-chip flex items-center justify-between gap-2 px-2 py-1.5 text-[10px]">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">Upkeep</span>
          <span className="text-white/70">{upkeepLine}/turn</span>
        </div>
      )}

      {/* Action buttons */}
      {isOwnedByActive && (
        <div className="grid grid-cols-2 gap-1.5 border-y border-white/10 py-2">
          {isFortified ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-bold"
              onClick={handleWake}
            >
              Wake
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-bold bg-amber-500/90 text-slate-950 hover:bg-amber-400"
              onClick={handleFortify}
            >
              Fortify
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleWait}
          >
            Wait
          </Button>
        </div>
      )}

      {/* Abilities */}
      {entity.abilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entity.abilities.map((ability) => (
            <Badge
              key={ability}
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-white/70 border-white/20 bg-white/5"
            >
              {ability.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      )}

      {/* Status Effects */}
      {statusEffects.length > 0 && (
        <>
          <Separator className="bg-white/10" />
          <div className="flex flex-wrap gap-1">
            {statusEffects.map((effect) => (
              <Badge
                key={effect.raw}
                className={`text-[10px] px-1.5 py-0 ${
                  STATUS_COLORS[effect.id] ?? 'bg-gray-600/80 text-gray-100'
                }`}
              >
                {effect.id.replace(/_/g, ' ')}
                {effect.duration !== null && ` (${effect.duration})`}
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat Box Sub-Component ───────────────────────────────────────────────────

function StatBox({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  return (
    <div className="hud-chip flex flex-col items-center px-1 py-1">
      <span className="text-[10px] text-white/45 uppercase">{label}</span>
      <span className="text-[13px] text-white font-bold tabular-nums">
        {value}
        {max !== undefined && (
          <span className="text-white/30">/{max}</span>
        )}
      </span>
    </div>
  );
}

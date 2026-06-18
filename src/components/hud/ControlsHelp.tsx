/**
 * ControlsHelp — collapsible controls reference panel.
 *
 * Default: collapsed, shows "?" button.
 * Expanded: shows all keyboard/mouse controls.
 * Position: bottom-right, above minimap.
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';

// ─── Control Definitions ──────────────────────────────────────────────────────

interface ControlEntry {
  keys: string;
  action: string;
}

const CONTROLS: ControlEntry[] = [
  { keys: 'WASD / Arrows', action: 'Pan camera' },
  { keys: 'Mouse Wheel', action: 'Zoom' },
  { keys: 'Right Drag', action: 'Pan' },
  { keys: 'Middle / Alt Drag', action: 'Rotate' },
  { keys: 'Left Click', action: 'Select' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ControlsHelp() {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className="absolute bottom-[172px] sm:bottom-[224px] right-2 sm:right-4 z-20 pointer-events-auto">
      {expanded ? (
        <div className="hud-panel min-w-[210px] p-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-xs font-semibold">
              Controls
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
              onClick={toggleExpanded}
              aria-label="Collapse controls"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Controls list */}
          <div className="space-y-1">
            {CONTROLS.map((ctrl) => (
              <div
                key={ctrl.keys}
                className="flex items-center justify-between gap-3"
              >
                <kbd className="text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded font-mono">
                  {ctrl.keys}
                </kbd>
                <span className="text-[10px] text-white/60 text-right">
                  {ctrl.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="hud-control h-8 w-8 rounded-full text-white/50"
          onClick={toggleExpanded}
          aria-label="Show controls"
          aria-expanded={expanded}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

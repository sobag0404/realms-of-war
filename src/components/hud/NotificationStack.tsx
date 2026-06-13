/**
 * NotificationStack — toast notifications on the right side.
 *
 * Shows notifications from the store with auto-dismiss.
 * Stacks vertically, newest on top, max 5 visible.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { UiNotification } from '@/store/slices/uiSlice';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 4000;

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const NOTIFICATION_ICONS: Record<UiNotification['type'], React.ReactNode> = {
  info: <Info className="h-4 w-4 text-sky-400" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-400" />,
};

const NOTIFICATION_BORDERS: Record<UiNotification['type'], string> = {
  info: 'border-sky-500/30',
  success: 'border-emerald-500/30',
  warning: 'border-amber-500/30',
  error: 'border-red-500/30',
};

// ─── Single Notification ──────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: UiNotification;
  onDismiss: (id: string) => void;
}) {
  const dismissNotification = useGameStore((s) => s.dismissNotification);

  // Auto-dismiss
  useEffect(() => {
    const duration = notification.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(() => {
      dismissNotification(notification.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, dismissNotification]);

  const handleDismiss = useCallback(() => {
    onDismiss(notification.id);
  }, [onDismiss, notification.id]);

  return (
    <Card
      className={`flex items-start gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm border ${NOTIFICATION_BORDERS[notification.type]} shadow-lg animate-in slide-in-from-right-2 fade-in duration-200`}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {NOTIFICATION_ICONS[notification.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-semibold truncate">
          {notification.title}
        </div>
        {notification.message && (
          <div className="text-white/60 text-[11px] leading-tight mt-0.5 line-clamp-2">
            {notification.message}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-white/30 hover:text-white hover:bg-white/10"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <X className="h-3 w-3" />
      </Button>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationStack() {
  const notifications = useGameStore((s) => s.notifications);
  const dismissNotification = useGameStore((s) => s.dismissNotification);

  // Show only the most recent MAX_VISIBLE notifications, newest first
  const visibleNotifications = notifications.slice(-MAX_VISIBLE).reverse();

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="absolute top-20 sm:top-24 right-2 sm:right-4 z-40 pointer-events-auto flex flex-col gap-2 w-64 sm:w-72">
      {visibleNotifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}

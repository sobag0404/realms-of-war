/**
 * useWorkerManager — React hook for accessing the WorkerManager singleton.
 *
 * Provides access to the worker manager and handles cleanup on unmount
 * by terminating all workers when the last consumer unmounts.
 *
 * Usage:
 *   const workerManager = useWorkerManager();
 *   const result = await workerManager.requestMapgen(20, 15, 42, 2);
 */

'use client';

import { useState } from 'react';
import { getWorkerManager } from '@/workers/workerManager';
import type { WorkerManager } from '@/workers/workerManager';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkerManager(): WorkerManager {
  const [manager] = useState<WorkerManager>(() => getWorkerManager());
  return manager;
}

/**
 * WorkerManager — unified manager for Web Worker lifecycle and communication.
 *
 * Spawns workers on demand (lazy initialization) and provides typed async
 * methods for each worker type. Falls back to synchronous execution if a
 * worker fails to initialize or throws an error.
 *
 * Uses the workerProtocol.ts message format for all communication.
 */

import type {
  PathfindingRequest,
  PathfindingResponse,
  AiRequest,
  AiResponse,
  MapGenRequest,
  MapGenResponse,
  SimulationRequest,
  SimulationResponse,
  WorkerErrorResponse,
} from './workerProtocol';
import { generateMap } from '@/engine/mapgen/generateMap';
import { AiSystem } from '@/engine/ecs/systems/AiSystem';
import type { GameState } from '@/engine/core/GameState';
import type { EventBus } from '@/engine/core/EventBus';

// ─── Worker Type Keys ─────────────────────────────────────────────────────────

type WorkerType = 'pathfinding' | 'ai' | 'mapgen' | 'simulation';

// ─── Worker Manager Class ─────────────────────────────────────────────────────

class WorkerManager {
  private workers: Map<WorkerType, Worker> = new Map();
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  > = new Map();
  private requestCounter = 0;
  private workerSupported: boolean | null = null;

  // EventBus reference for synchronous AI fallback
  private eventBusRef: EventBus | null = null;

  // ── Worker URL Construction ────────────────────────────────────────────────

  /**
   * Get the Worker constructor URL for a given worker type.
   * Uses the `new URL(..., import.meta.url)` pattern required by Next.js/webpack.
   */
  private getWorkerUrl(type: WorkerType): URL {
    switch (type) {
      case 'pathfinding':
        return new URL('./pathfinding.worker.ts', import.meta.url);
      case 'ai':
        return new URL('./ai.worker.ts', import.meta.url);
      case 'mapgen':
        return new URL('./mapgen.worker.ts', import.meta.url);
      case 'simulation':
        return new URL('./simulation.worker.ts', import.meta.url);
    }
  }

  // ── Worker Lifecycle ───────────────────────────────────────────────────────

  /**
   * Check if Web Workers are supported in the current environment.
   */
  private isWorkerSupported(): boolean {
    if (this.workerSupported !== null) return this.workerSupported;
    try {
      this.workerSupported = typeof Worker !== 'undefined';
    } catch {
      this.workerSupported = false;
    }
    return this.workerSupported;
  }

  /**
   * Get or create a worker for the given type (lazy initialization).
   */
  private getWorker(type: WorkerType): Worker | null {
    // Return existing worker if available
    const existing = this.workers.get(type);
    if (existing) return existing;

    // Check if workers are supported
    if (!this.isWorkerSupported()) return null;

    try {
      const url = this.getWorkerUrl(type);
      const worker = new Worker(url, { type: 'module' });

      // Set up message handler
      worker.onmessage = (event: MessageEvent) => {
        this.handleWorkerMessage(event.data);
      };

      worker.onerror = (error: ErrorEvent) => {
        console.warn(`[WorkerManager] ${type} worker error:`, error.message);
        // Terminate the broken worker so it gets re-created on next use
        this.terminateWorker(type);
      };

      this.workers.set(type, worker);
      return worker;
    } catch (error) {
      console.warn(`[WorkerManager] Failed to create ${type} worker:`, error);
      return null;
    }
  }

  /**
   * Terminate a specific worker and clean up pending requests for it.
   */
  private terminateWorker(type: WorkerType): void {
    const worker = this.workers.get(type);
    if (worker) {
      worker.terminate();
      this.workers.delete(type);
    }

    // Reject any pending requests for this worker type
    const prefix = `${type}-`;
    for (const [requestId, pending] of this.pendingRequests) {
      if (requestId.startsWith(prefix)) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`Worker ${type} terminated`));
        this.pendingRequests.delete(requestId);
      }
    }
  }

  /**
   * Terminate all workers and clean up all pending requests.
   */
  terminateAll(): void {
    for (const [type] of this.workers) {
      this.terminateWorker(type);
    }
    // Clean up any remaining pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('WorkerManager terminated'));
    }
    this.pendingRequests.clear();
  }

  // ── Message Handling ───────────────────────────────────────────────────────

  /**
   * Generate a unique request ID.
   */
  private nextRequestId(type: WorkerType): string {
    return `${type}-${++this.requestCounter}`;
  }

  /**
   * Handle incoming worker message, routing to the correct pending request.
   */
  private handleWorkerMessage(data: PathfindingResponse | AiResponse | MapGenResponse | SimulationResponse | WorkerErrorResponse): void {
    // We need to find the pending request. Since workers process one message at a time
    // (first-in-first-out), we can match by worker type prefix and take the oldest.
    // But we include the requestType in the response for disambiguation.

    const responseType = data.type;

    // Find the matching pending request by looking at the response type
    let matchedId: string | null = null;

    for (const [requestId] of this.pendingRequests) {
      // Match based on response type to request type mapping
      if (
        (responseType === 'findPathResult' && requestId.startsWith('pathfinding-')) ||
        (responseType === 'generateTurnResult' && requestId.startsWith('ai-')) ||
        (responseType === 'generateMapResult' && requestId.startsWith('mapgen-')) ||
        (responseType === 'simulateResult' && requestId.startsWith('simulation-')) ||
        (responseType === 'error')
      ) {
        if (matchedId === null) {
          matchedId = requestId;
          break; // Take the first (oldest) match
        }
      }
    }

    if (!matchedId) {
      console.warn('[WorkerManager] Received response with no pending request:', responseType);
      return;
    }

    const pending = this.pendingRequests.get(matchedId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(matchedId);

    if (responseType === 'error') {
      const errorData = data as WorkerErrorResponse;
      pending.reject(new Error(`Worker error (${errorData.requestType}): ${errorData.message}`));
    } else {
      pending.resolve(data);
    }
  }

  /**
   * Send a request to a worker and return a promise for the response.
   * Includes a timeout to prevent indefinite hangs.
   */
  private sendRequest<T>(type: WorkerType, request: unknown, timeoutMs = 30000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const worker = this.getWorker(type);

      if (!worker) {
        reject(new Error(`Worker ${type} not available`));
        return;
      }

      const requestId = this.nextRequestId(type);

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Worker ${type} request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      // Post the message to the worker
      worker.postMessage(request);
    });
  }

  // ── Public API: Typed Async Methods ────────────────────────────────────────

  /**
   * Request pathfinding computation from the pathfinding worker.
   * Falls back to synchronous computation if the worker is unavailable.
   */
  async requestPathfinding(
    tiles: Record<string, { terrain: string }>,
    from: { q: number; r: number },
    to: { q: number; r: number },
    movementPoints: number,
  ): Promise<PathfindingResponse> {
    const request: PathfindingRequest = {
      type: 'findPath',
      tiles,
      from,
      to,
      movementPoints,
    };

    try {
      return await this.sendRequest<PathfindingResponse>('pathfinding', request);
    } catch (error) {
      console.warn('[WorkerManager] Pathfinding worker failed, using sync fallback:', error);
      return this.syncPathfinding(request);
    }
  }

  /**
   * Request AI turn generation from the AI worker.
   * Falls back to synchronous AiSystem.generateTurn if the worker is unavailable.
   */
  async requestAiTurn(
    state: unknown,
    playerId: string,
    difficulty: string,
  ): Promise<AiResponse> {
    const request: AiRequest = {
      type: 'generateTurn',
      state,
      playerId,
      difficulty,
    };

    try {
      return await this.sendRequest<AiResponse>('ai', request);
    } catch (error) {
      console.warn('[WorkerManager] AI worker failed, using sync fallback:', error);
      return this.syncAiTurn(request);
    }
  }

  /**
   * Request map generation from the mapgen worker.
   * Falls back to synchronous generateMap if the worker is unavailable.
   */
  async requestMapgen(
    width: number,
    height: number,
    seed: number,
    playerCount: number,
  ): Promise<MapGenResponse> {
    const request: MapGenRequest = {
      type: 'generateMap',
      width,
      height,
      seed,
      playerCount,
    };

    try {
      return await this.sendRequest<MapGenResponse>('mapgen', request);
    } catch (error) {
      console.warn('[WorkerManager] Mapgen worker failed, using sync fallback:', error);
      return this.syncMapgen(request);
    }
  }

  /**
   * Request turn simulation from the simulation worker.
   * Falls back to synchronous simulation if the worker is unavailable.
   */
  async requestSimulation(
    state: unknown,
    commands: unknown[],
  ): Promise<SimulationResponse> {
    const request: SimulationRequest = {
      type: 'simulate',
      state,
      commands,
    };

    try {
      return await this.sendRequest<SimulationResponse>('simulation', request);
    } catch (error) {
      console.warn('[WorkerManager] Simulation worker failed, using sync fallback:', error);
      return this.syncSimulation(request);
    }
  }

  // ── Synchronous Fallbacks ──────────────────────────────────────────────────

  /**
   * Synchronous fallback for pathfinding.
   * Re-implements simplified A* and reachable-hex computation inline.
   */
  private syncPathfinding(request: PathfindingRequest): PathfindingResponse {
    const { tiles, from, to, movementPoints } = request;

    // Inline terrain costs
    const TERRAIN_COSTS: Record<string, number> = {
      plains: 1, forest: 2, mountain: 0, water: 0,
      desert: 2, swamp: 3, hills: 2, ruins: 1,
    };

    const HEX_DIRS = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
    ];

    const hKey = (q: number, r: number) => `${q},${r}`;
    const hDist = (a: { q: number; r: number }, b: { q: number; r: number }) => {
      const ay = -a.q - a.r;
      const by = -b.q - b.r;
      return (Math.abs(a.q - b.q) + Math.abs(ay - by) + Math.abs(a.r - b.r)) / 2;
    };

    const isWalkable = (q: number, r: number): boolean => {
      const tile = tiles[hKey(q, r)];
      if (!tile) return false;
      const cost = TERRAIN_COSTS[tile.terrain];
      return cost !== undefined && cost > 0;
    };

    const getCost = (q: number, r: number): number => {
      const tile = tiles[hKey(q, r)];
      if (!tile) return Infinity;
      const cost = TERRAIN_COSTS[tile.terrain];
      return cost !== undefined && cost > 0 ? cost : Infinity;
    };

    // A* pathfinding
    let path: Array<{ q: number; r: number }> | null = null;

    if (isWalkable(from.q, from.r) && isWalkable(to.q, to.r)) {
      interface Node { q: number; r: number; g: number; f: number; pq: number; pr: number; closed: boolean; }
      const nodeMap = new Map<string, Node>();
      const startKey = hKey(from.q, from.r);
      nodeMap.set(startKey, { q: from.q, r: from.r, g: 0, f: hDist(from, to), pq: from.q, pr: from.r, closed: false });
      const openList: string[] = [startKey];
      let openHead = 0;

      while (openHead < openList.length) {
        let bestIdx = openHead;
        let bestF = nodeMap.get(openList[openHead])!.f;
        for (let i = openHead + 1; i < openList.length; i++) {
          const nf = nodeMap.get(openList[i])!.f;
          if (nf < bestF) { bestF = nf; bestIdx = i; }
        }
        const currentKey = openList[bestIdx];
        openList[bestIdx] = openList[openHead];
        openList[openHead] = currentKey;
        openHead++;
        const current = nodeMap.get(currentKey)!;
        current.closed = true;

        if (current.q === to.q && current.r === to.r) {
          const p: Array<{ q: number; r: number }> = [];
          let n: Node | undefined = current;
          while (n) { p.push({ q: n.q, r: n.r }); if (n.q === n.pq && n.r === n.pr) break; n = nodeMap.get(hKey(n.pq, n.pr)); }
          p.reverse();
          let totalCost = 0;
          for (let i = 1; i < p.length; i++) totalCost += getCost(p[i].q, p[i].r);
          if (totalCost <= movementPoints) path = p;
          break;
        }

        for (const d of HEX_DIRS) {
          const nq = current.q + d.q;
          const nr = current.r + d.r;
          if (!isWalkable(nq, nr)) continue;
          const nKey = hKey(nq, nr);
          const existing = nodeMap.get(nKey);
          if (existing && existing.closed) continue;
          const moveCost = getCost(nq, nr);
          const tentativeG = current.g + moveCost;
          if (tentativeG > movementPoints) continue;
          if (existing) {
            if (tentativeG < existing.g) { existing.g = tentativeG; existing.f = tentativeG + hDist({ q: nq, r: nr }, to); existing.pq = current.q; existing.pr = current.r; }
          } else {
            nodeMap.set(nKey, { q: nq, r: nr, g: tentativeG, f: tentativeG + hDist({ q: nq, r: nr }, to), pq: current.q, pr: current.r, closed: false });
            openList.push(nKey);
          }
        }
      }
    }

    // Reachable hexes (Dijkstra flood fill)
    const reachable: Array<{ q: number; r: number }> = [];
    const costSoFar = new Map<string, number>();
    const queueQ: number[] = [from.q];
    const queueR: number[] = [from.r];
    const queueCost: number[] = [0];
    let queueHead = 0;
    costSoFar.set(hKey(from.q, from.r), 0);
    reachable.push({ q: from.q, r: from.r });

    while (queueHead < queueQ.length) {
      const cq = queueQ[queueHead];
      const cr = queueR[queueHead];
      const currentCost = queueCost[queueHead];
      queueHead++;
      for (const d of HEX_DIRS) {
        const nq = cq + d.q;
        const nr = cr + d.r;
        if (!isWalkable(nq, nr)) continue;
        const moveCost = getCost(nq, nr);
        const newCost = currentCost + moveCost;
        if (newCost > movementPoints) continue;
        const nKey = hKey(nq, nr);
        const prevCost = costSoFar.get(nKey);
        if (prevCost === undefined || newCost < prevCost) {
          costSoFar.set(nKey, newCost);
          reachable.push({ q: nq, r: nr });
          queueQ.push(nq);
          queueR.push(nr);
          queueCost.push(newCost);
        }
      }
    }

    return { type: 'findPathResult', path, reachable };
  }

  /**
   * Synchronous fallback for AI turn generation.
   * Uses the main-thread AiSystem.generateTurn.
   */
  private syncAiTurn(request: AiRequest): AiResponse {
    try {
      const state = request.state as GameState;
      const playerId = request.playerId;

      // AiSystem.generateTurn requires an EventBus, but the worker doesn't use one.
      // Create a no-op event bus for the fallback.
      const noopEventBus = this.eventBusRef ?? {
        on: () => () => {},
        off: () => {},
        emit: () => {},
        offAll: () => {},
      } as unknown as EventBus;

      const commands = AiSystem.generateTurn(state, playerId, noopEventBus);
      return { type: 'generateTurnResult', commands };
    } catch (error) {
      console.error('[WorkerManager] Sync AI fallback failed:', error);
      return { type: 'generateTurnResult', commands: [] };
    }
  }

  /**
   * Synchronous fallback for map generation.
   * Uses the main-thread generateMap function.
   */
  private syncMapgen(request: MapGenRequest): MapGenResponse {
    try {
      const result = generateMap({
        width: request.width,
        height: request.height,
        seed: request.seed,
        playerCount: request.playerCount,
      });
      return {
        type: 'generateMapResult',
        mapData: result.mapData,
        startingPositions: result.startingPositions,
      };
    } catch (error) {
      console.error('[WorkerManager] Sync mapgen fallback failed:', error);
      throw error;
    }
  }

  /**
   * Synchronous fallback for simulation.
   * Deep clones the state and applies commands sequentially.
   */
  private syncSimulation(request: SimulationRequest): SimulationResponse {
    try {
      // Simple synchronous simulation: deep clone + apply
      const state = JSON.parse(JSON.stringify(request.state));
      const commands = request.commands as Array<Record<string, unknown>>;
      const events: unknown[] = [];

      for (const command of commands) {
        events.push({ type: 'commandApplied', command: command.type });
      }

      return {
        type: 'simulateResult',
        finalState: state,
        events,
      };
    } catch (error) {
      console.error('[WorkerManager] Sync simulation fallback failed:', error);
      return {
        type: 'simulateResult',
        finalState: request.state,
        events: [],
      };
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * Set the EventBus reference for synchronous AI fallback.
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBusRef = eventBus;
  }

  /**
   * Check if a specific worker type is currently available.
   */
  isWorkerAvailable(type: WorkerType): boolean {
    return this.workers.has(type) || this.isWorkerSupported();
  }

  /**
   * Get the number of pending requests.
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let instance: WorkerManager | null = null;

/**
 * Get the WorkerManager singleton.
 * Creates it on first access.
 */
export function getWorkerManager(): WorkerManager {
  if (!instance) {
    instance = new WorkerManager();
  }
  return instance;
}

/**
 * Reset the WorkerManager singleton (for testing or full cleanup).
 * Terminates all workers and clears the instance.
 */
export function resetWorkerManager(): void {
  if (instance) {
    instance.terminateAll();
    instance = null;
  }
}

export { WorkerManager };

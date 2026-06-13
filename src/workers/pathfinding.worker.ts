/**
 * Web Worker for pathfinding computations.
 *
 * Offloads A* pathfinding and reachable-hex flood fill from the main thread.
 * This worker is entirely self-contained — it cannot import from the main bundle.
 * All hex math and terrain costs are re-implemented inline.
 *
 * Message protocol:
 *   Input:  { type: 'findPath', requestId, tiles, from, to, movementPoints }
 *   Output: { type: 'findPathResult', requestId, path, reachable }
 */

// ─── Inline Hex Math ──────────────────────────────────────────────────────────

/** The six hex directions in axial coordinates (pointy-top). */
const HEX_DIRECTIONS: Array<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** String key for a hex coordinate. */
function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/** Cube distance between two axial hexes. */
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

/** Get the six neighbors of a hex. */
function hexNeighbors(q: number, r: number): Array<{ q: number; r: number }> {
  return HEX_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

// ─── Terrain Costs ─────────────────────────────────────────────────────────────

/** Movement cost per terrain type (0 = impassable). */
const TERRAIN_COSTS: Record<string, number> = {
  plains: 1,
  forest: 2,
  mountain: 0, // impassable
  water: 0, // impassable
  desert: 2,
  swamp: 3,
  hills: 2,
  ruins: 1,
};

/** Whether a terrain type is walkable. */
function isWalkable(tiles: Record<string, { terrain: string }>, q: number, r: number): boolean {
  const key = hexKey(q, r);
  const tile = tiles[key];
  if (!tile) return false;
  const cost = TERRAIN_COSTS[tile.terrain];
  return cost !== undefined && cost > 0;
}

/** Movement cost to enter a hex. Returns Infinity if impassable. */
function getTerrainCost(tiles: Record<string, { terrain: string }>, q: number, r: number): number {
  const key = hexKey(q, r);
  const tile = tiles[key];
  if (!tile) return Infinity;
  const cost = TERRAIN_COSTS[tile.terrain];
  return cost !== undefined && cost > 0 ? cost : Infinity;
}

// ─── A* Pathfinding ───────────────────────────────────────────────────────────

interface AStarNode {
  q: number;
  r: number;
  g: number; // Cost from start
  f: number; // g + heuristic
  parentQ: number;
  parentR: number;
  closed: boolean;
}

/**
 * Find the shortest path from `from` to `to` using A*.
 *
 * @returns Array of hex coords from start to end (inclusive), or null if no path.
 */
function findPath(
  tiles: Record<string, { terrain: string }>,
  from: { q: number; r: number },
  to: { q: number; r: number },
  movementPoints: number,
): Array<{ q: number; r: number }> | null {
  // Quick rejection
  if (!isWalkable(tiles, from.q, from.r) || !isWalkable(tiles, to.q, to.r)) {
    return null;
  }

  const nodeMap = new Map<string, AStarNode>();
  const startKey = hexKey(from.q, from.r);
  nodeMap.set(startKey, {
    q: from.q,
    r: from.r,
    g: 0,
    f: hexDistance(from, to),
    parentQ: from.q,
    parentR: from.r,
    closed: false,
  });

  // Open list with index-based head for O(1) dequeue-like scan
  const openList: string[] = [startKey];
  let openHead = 0;

  while (openHead < openList.length) {
    // Find node with lowest f score
    let bestIdx = openHead;
    let bestF = nodeMap.get(openList[openHead])!.f;

    for (let i = openHead + 1; i < openList.length; i++) {
      const nodeF = nodeMap.get(openList[i])!.f;
      if (nodeF < bestF) {
        bestF = nodeF;
        bestIdx = i;
      }
    }

    // Swap best to head position
    const currentKey = openList[bestIdx];
    openList[bestIdx] = openList[openHead];
    openList[openHead] = currentKey;
    openHead++;

    const current = nodeMap.get(currentKey)!;
    current.closed = true;

    // Reached destination?
    if (current.q === to.q && current.r === to.r) {
      // Reconstruct path
      const path: Array<{ q: number; r: number }> = [];
      let node: AStarNode | undefined = current;
      while (node !== undefined) {
        path.push({ q: node.q, r: node.r });
        if (node.q === node.parentQ && node.r === node.parentR) break;
        node = nodeMap.get(hexKey(node.parentQ, node.parentR));
      }
      path.reverse();

      // Check if path is within movement points
      let totalCost = 0;
      for (let i = 1; i < path.length; i++) {
        totalCost += getTerrainCost(tiles, path[i].q, path[i].r);
      }
      if (totalCost > movementPoints) return null;

      return path;
    }

    // Explore neighbors
    const neighbors = hexNeighbors(current.q, current.r);
    for (const neighbor of neighbors) {
      if (!isWalkable(tiles, neighbor.q, neighbor.r)) continue;

      const nKey = hexKey(neighbor.q, neighbor.r);
      const existing = nodeMap.get(nKey);

      // Skip closed nodes
      if (existing && existing.closed) continue;

      const moveCost = getTerrainCost(tiles, neighbor.q, neighbor.r);
      const tentativeG = current.g + moveCost;

      // Prune if already over budget
      if (tentativeG > movementPoints) continue;

      if (existing) {
        // Update if we found a better path
        if (tentativeG < existing.g) {
          existing.g = tentativeG;
          existing.f = tentativeG + hexDistance(neighbor, to);
          existing.parentQ = current.q;
          existing.parentR = current.r;
        }
      } else {
        const h = hexDistance(neighbor, to);
        nodeMap.set(nKey, {
          q: neighbor.q,
          r: neighbor.r,
          g: tentativeG,
          f: tentativeG + h,
          parentQ: current.q,
          parentR: current.r,
          closed: false,
        });
        openList.push(nKey);
      }
    }
  }

  return null; // No path found
}

// ─── Reachable Hexes (Dijkstra flood fill) ─────────────────────────────────────

/**
 * Find all hexes reachable within a movement budget.
 *
 * Uses Dijkstra-style flood fill with an index-based queue.
 */
function findReachable(
  tiles: Record<string, { terrain: string }>,
  from: { q: number; r: number },
  movementPoints: number,
): Array<{ q: number; r: number }> {
  const reachable: Array<{ q: number; r: number }> = [];
  const costSoFar = new Map<string, number>();

  // Index-based queue
  const queueQ: number[] = [from.q];
  const queueR: number[] = [from.r];
  const queueCost: number[] = [0];
  let queueHead = 0;

  const startKey = hexKey(from.q, from.r);
  costSoFar.set(startKey, 0);
  reachable.push({ q: from.q, r: from.r });

  while (queueHead < queueQ.length) {
    const cq = queueQ[queueHead];
    const cr = queueR[queueHead];
    const currentCost = queueCost[queueHead];
    queueHead++;

    const neighbors = hexNeighbors(cq, cr);
    for (const neighbor of neighbors) {
      if (!isWalkable(tiles, neighbor.q, neighbor.r)) continue;

      const moveCost = getTerrainCost(tiles, neighbor.q, neighbor.r);
      const newCost = currentCost + moveCost;

      if (newCost > movementPoints) continue;

      const nKey = hexKey(neighbor.q, neighbor.r);
      const prevCost = costSoFar.get(nKey);

      if (prevCost === undefined || newCost < prevCost) {
        costSoFar.set(nKey, newCost);
        reachable.push({ q: neighbor.q, r: neighbor.r });

        queueQ.push(neighbor.q);
        queueR.push(neighbor.r);
        queueCost.push(newCost);
      }
    }
  }

  return reachable;
}

// ─── Message Types ────────────────────────────────────────────────────────────

interface PathfindingRequest {
  type: 'findPath';
  requestId: string;
  tiles: Record<string, { terrain: string }>;
  from: { q: number; r: number };
  to: { q: number; r: number };
  movementPoints: number;
}

type PathfindingResponse = {
  type: 'findPathResult';
  requestId: string;
  path: Array<{ q: number; r: number }> | null;
  reachable: Array<{ q: number; r: number }>;
};

type ErrorResponse = {
  type: 'error';
  requestId: string;
  requestType: string;
  message: string;
};

// ─── Message Handler ───────────────────────────────────────────────────────────

self.onmessage = function (e: MessageEvent<PathfindingRequest>) {
  const request = e.data;
  const requestId: string = request.requestId ?? '';

  try {
    if (request.type === 'findPath') {
      const { tiles, from, to, movementPoints } = request;

      // Run A* pathfinding
      const path = findPath(tiles, from, to, movementPoints);

      // Run reachable hex computation
      const reachable = findReachable(tiles, from, movementPoints);

      const response = {
        type: 'findPathResult' as const,
        requestId,
        path,
        reachable,
      };
      self.postMessage(response);
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

// Module export to ensure file is treated as a module (avoids global scope conflicts)
export {};

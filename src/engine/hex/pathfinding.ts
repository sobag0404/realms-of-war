/**
 * Hex pathfinding for "Realms of War"
 *
 * Implements A* for shortest path and Dijkstra-style flood fill
 * for reachable hex computation. Uses index-based queue (not shift())
 * for O(1) dequeue operations.
 */

import type { HexCoord } from "./coordinates";
import { hexDistance } from "./distance";
import { HEX_DIRECTIONS } from "./directions";

// ─── Key Utilities ───────────────────────────────────────────────────────────

/**
 * Create a string key from a hex coordinate for use in Maps/Sets.
 */
function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

// ─── A* Pathfinding ──────────────────────────────────────────────────────────

/**
 * Find the shortest path between two hexes using A*.
 *
 * @param from - Starting hex coordinate
 * @param to - Destination hex coordinate
 * @param isWalkable - Predicate: returns true if a hex can be entered
 * @param movementCost - Function returning movement cost to enter a hex (must be >= 1)
 * @param maxDistance - Optional maximum hex distance to consider (prunes search)
 * @returns Array of HexCoord from `from` to `to` (inclusive), or empty array if no path
 */
export function findPath(
  from: HexCoord,
  to: HexCoord,
  isWalkable: (hex: HexCoord) => boolean,
  movementCost: (hex: HexCoord) => number,
  maxDistance?: number,
): HexCoord[] {
  // Quick rejection: if start or end is not walkable
  if (!isWalkable(from) || !isWalkable(to)) {
    return [];
  }

  // Quick rejection: if maxDistance is set and the hex distance exceeds it
  if (maxDistance !== undefined && hexDistance(from, to) > maxDistance) {
    return [];
  }

  // A* open set as a flat array (index-based queue, no shift())
  interface Node {
    q: number;
    r: number;
    g: number;       // Cost from start
    f: number;       // g + heuristic
    parentQ: number; // Parent hex q
    parentR: number; // Parent hex r
    closed: boolean; // Whether this node is in the closed set
  }

  const nodeMap = new Map<string, Node>();

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

  // Open list: flat array with head index for O(1) dequeue-like scan
  const openList: string[] = [startKey];
  let openHead = 0;

  while (openHead < openList.length) {
    // Find the node with lowest f in the open list
    // (For very large maps, a binary heap would be better, but for hex grids
    // this linear scan is often sufficient and simpler)
    let bestIdx = openHead;
    let bestF = nodeMap.get(openList[openHead])!.f;

    for (let i = openHead + 1; i < openList.length; i++) {
      const nodeF = nodeMap.get(openList[i])!.f;
      if (nodeF < bestF) {
        bestF = nodeF;
        bestIdx = i;
      }
    }

    // Swap best to current head position
    const currentKey = openList[bestIdx];
    openList[bestIdx] = openList[openHead];
    openList[openHead] = currentKey;
    openHead++;

    const current = nodeMap.get(currentKey)!;
    current.closed = true;

    // Check if we reached the destination
    if (current.q === to.q && current.r === to.r) {
      // Reconstruct path
      const path: HexCoord[] = [];
      let node: Node | undefined = current;

      while (node !== undefined) {
        path.push({ q: node.q, r: node.r });
        if (node.q === node.parentQ && node.r === node.parentR) {
          break; // Reached the start node
        }
        node = nodeMap.get(hexKey(node.parentQ, node.parentR));
      }

      path.reverse();
      return path;
    }

    // Explore neighbors
    for (let d = 0; d < 6; d++) {
      const nq = current.q + HEX_DIRECTIONS[d].q;
      const nr = current.r + HEX_DIRECTIONS[d].r;
      const neighborHex: HexCoord = { q: nq, r: nr };

      // Skip non-walkable hexes
      if (!isWalkable(neighborHex)) {
        continue;
      }

      // Skip if max distance exceeded
      if (maxDistance !== undefined && hexDistance(from, neighborHex) > maxDistance) {
        continue;
      }

      const nKey = hexKey(nq, nr);
      const existing = nodeMap.get(nKey);

      // Skip closed nodes
      if (existing && existing.closed) {
        continue;
      }

      const tentativeG = current.g + movementCost(neighborHex);

      if (existing) {
        // Update if we found a better path
        if (tentativeG < existing.g) {
          existing.g = tentativeG;
          existing.f = tentativeG + hexDistance(neighborHex, to);
          existing.parentQ = current.q;
          existing.parentR = current.r;

          // Re-add to open list if it was removed (closed)
          // This shouldn't happen since we skip closed above, but safety check
        }
      } else {
        // New node
        const h = hexDistance(neighborHex, to);
        nodeMap.set(nKey, {
          q: nq,
          r: nr,
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

  // No path found
  return [];
}

// ─── Reachable Hexes ─────────────────────────────────────────────────────────

/**
 * Find all hexes reachable from a starting hex within a given movement budget.
 *
 * Uses Dijkstra-style flood fill with an index-based queue.
 *
 * @param from - Starting hex coordinate
 * @param movementPoints - Total movement budget
 * @param isWalkable - Predicate: returns true if a hex can be entered
 * @param movementCost - Function returning movement cost to enter a hex (must be >= 1)
 * @returns Set of hex coordinates reachable within the movement budget (including `from`)
 */
export function findReachable(
  from: HexCoord,
  movementPoints: number,
  isWalkable: (hex: HexCoord) => boolean,
  movementCost: (hex: HexCoord) => number,
): Set<HexCoord> {
  const reachable = new Set<HexCoord>();
  const costSoFar = new Map<string, number>();

  // Index-based queue for O(1) dequeue
  const queueQ: number[] = [from.q];
  const queueR: number[] = [from.r];
  const queueCost: number[] = [0];
  let queueHead = 0;

  const startKey = hexKey(from.q, from.r);
  costSoFar.set(startKey, 0);
  reachable.add({ q: from.q, r: from.r });

  while (queueHead < queueQ.length) {
    const cq = queueQ[queueHead];
    const cr = queueR[queueHead];
    const currentCost = queueCost[queueHead];
    queueHead++; // O(1) dequeue via index advancement

    // Explore neighbors
    for (let d = 0; d < 6; d++) {
      const nq = cq + HEX_DIRECTIONS[d].q;
      const nr = cr + HEX_DIRECTIONS[d].r;
      const neighborHex: HexCoord = { q: nq, r: nr };

      // Skip non-walkable hexes
      if (!isWalkable(neighborHex)) {
        continue;
      }

      const moveCost = movementCost(neighborHex);
      const newCost = currentCost + moveCost;

      // Skip if over budget
      if (newCost > movementPoints) {
        continue;
      }

      const nKey = hexKey(nq, nr);
      const prevCost = costSoFar.get(nKey);

      // Only process if we haven't visited, or found a cheaper path
      if (prevCost === undefined || newCost < prevCost) {
        costSoFar.set(nKey, newCost);
        reachable.add({ q: nq, r: nr });

        queueQ.push(nq);
        queueR.push(nr);
        queueCost.push(newCost);
      }
    }
  }

  return reachable;
}

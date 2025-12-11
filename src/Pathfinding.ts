import type { Point } from './utils';

interface AStarNode {
    x: number;
    y: number;
    g: number; // Cost from start
    h: number; // Heuristic (estimated cost to goal)
    f: number; // g + h
    parent: AStarNode | null;
}

// Simple cache for pathfinding results
const pathCache = new Map<string, { path: Point[], timestamp: number }>();
const CACHE_TTL = 500; // Cache paths for 500ms
const MAX_ITERATIONS = 500; // Limit iterations to prevent long computations

function getCacheKey(start: Point, end: Point): string {
    return `${start.x},${start.y}-${end.x},${end.y}`;
}

function heuristic(a: Point, b: Point): number {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function aStar(
    start: Point,
    end: Point,
    isBlocked: (x: number, y: number) => boolean
): Point[] {
    // Check cache first
    const cacheKey = getCacheKey(start, end);
    const cached = pathCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return cached.path;
    }

    // Quick distance check - if too far, don't bother with expensive pathfinding
    const quickDist = heuristic(start, end);
    if (quickDist > 30) {
        // Return simple path toward target for long distances
        return [start];
    }

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
        x: start.x,
        y: start.y,
        g: 0,
        h: heuristic(start, end),
        f: heuristic(start, end),
        parent: null
    };

    openSet.push(startNode);

    const directions = [
        { dx: 0, dy: -1 },  // up
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 1, dy: 0 }    // right
    ];

    let iterations = 0;

    while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;

        // Find node with lowest f score
        let lowestIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        const current = openSet[lowestIndex];

        // Found the goal
        if (current.x === end.x && current.y === end.y) {
            const path: Point[] = [];
            let node: AStarNode | null = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }

            // Cache the result
            pathCache.set(cacheKey, { path, timestamp: now });

            // Clean old cache entries periodically
            if (pathCache.size > 100) {
                for (const [key, value] of pathCache.entries()) {
                    if (now - value.timestamp > CACHE_TTL * 2) {
                        pathCache.delete(key);
                    }
                }
            }

            return path;
        }

        // Move current from open to closed
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);

        // Check all neighbors
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            const key = `${nx},${ny}`;

            // Skip if in closed set or blocked
            if (closedSet.has(key) || isBlocked(nx, ny)) {
                continue;
            }

            const g = current.g + 1;
            const h = heuristic({ x: nx, y: ny }, end);
            const f = g + h;

            // Check if already in open set with better score
            const existingIndex = openSet.findIndex(n => n.x === nx && n.y === ny);
            if (existingIndex !== -1) {
                if (g < openSet[existingIndex].g) {
                    openSet[existingIndex].g = g;
                    openSet[existingIndex].f = f;
                    openSet[existingIndex].parent = current;
                }
                continue;
            }

            openSet.push({
                x: nx,
                y: ny,
                g,
                h,
                f,
                parent: current
            });
        }
    }

    // No path found (or too many iterations)
    const emptyPath = [start];
    pathCache.set(cacheKey, { path: emptyPath, timestamp: now });
    return emptyPath;
}

// Clear the path cache (useful when map changes)
export function clearPathCache(): void {
    pathCache.clear();
}

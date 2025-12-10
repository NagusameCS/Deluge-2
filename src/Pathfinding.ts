import type { Point } from './utils';

export class PriorityQueue<T> {
    items: { element: T, priority: number }[] = [];

    enqueue(element: T, priority: number) {
        const queueElement = { element, priority };
        let added = false;
        for (let i = 0; i < this.items.length; i++) {
            if (queueElement.priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        if (!added) {
            this.items.push(queueElement);
        }
    }

    dequeue(): T | undefined {
        return this.items.shift()?.element;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }
}

export function aStar(start: Point, goal: Point, isBlocked: (x: number, y: number) => boolean): Point[] {
    const frontier = new PriorityQueue<Point>();
    frontier.enqueue(start, 0);

    const cameFrom = new Map<string, Point | null>();
    const costSoFar = new Map<string, number>();

    const startKey = `${start.x},${start.y}`;
    cameFrom.set(startKey, null);
    costSoFar.set(startKey, 0);

    let current: Point | undefined;

    while (!frontier.isEmpty()) {
        current = frontier.dequeue();
        if (!current) break;

        if (current.x === goal.x && current.y === goal.y) {
            break;
        }

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const next of neighbors) {
            if (isBlocked(next.x, next.y)) continue;

            const nextKey = `${next.x},${next.y}`;
            const newCost = (costSoFar.get(`${current.x},${current.y}`) || 0) + 1;

            if (!costSoFar.has(nextKey) || newCost < (costSoFar.get(nextKey) || Infinity)) {
                costSoFar.set(nextKey, newCost);
                const priority = newCost + Math.abs(goal.x - next.x) + Math.abs(goal.y - next.y);
                frontier.enqueue(next, priority);
                cameFrom.set(nextKey, current);
            }
        }
    }

    // Reconstruct path
    const path: Point[] = [];
    if (!current || (current.x !== goal.x || current.y !== goal.y)) {
        return []; // No path found
    }

    let curr: Point | null | undefined = current;
    while (curr) {
        path.push(curr);
        const key: string = `${curr.x},${curr.y}`;
        curr = cameFrom.get(key);
    }

    return path.reverse().slice(1); // Remove start node
}

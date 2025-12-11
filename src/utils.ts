export const TILE_SIZE = 32;
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const VIEWPORT_WIDTH = 25;
export const VIEWPORT_HEIGHT = 15;

export interface Point {
    x: number;
    y: number;
}

export const TileType = {
    Wall: 0,
    Floor: 1,
    Door: 2,
    PuzzleFloor: 3,
    PressurePlate: 4
} as const;

export type TileType = typeof TileType[keyof typeof TileType];

export const ItemType = {
    Potion: 'potion',
    Weapon: 'weapon',
    Armor: 'armor',
    Scroll: 'scroll',
    Coin: 'coin',
    Material: 'material',
    Key: 'key'
} as const;

export type ItemType = typeof ItemType[keyof typeof ItemType];

export const TrapType = {
    Spike: 'spike',
    Fire: 'fire',
    Poison: 'poison',
    Teleport: 'teleport',
    Alarm: 'alarm'
} as const;

export type TrapType = typeof TrapType[keyof typeof TrapType];

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

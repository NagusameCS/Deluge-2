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
    Door: 2
} as const;

export type TileType = typeof TileType[keyof typeof TileType];

export const ItemType = {
    Potion: 'potion',
    Weapon: 'weapon',
    Armor: 'armor',
    Scroll: 'scroll',
    Coin: 'coin'
} as const;

export type ItemType = typeof ItemType[keyof typeof ItemType];

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

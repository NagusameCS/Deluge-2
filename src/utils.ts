export const TILE_SIZE = 32;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 30;

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

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

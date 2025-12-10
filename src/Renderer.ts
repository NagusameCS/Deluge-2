import { GameMap } from './Map';
import { Entity } from './Entity';
import { TILE_SIZE, TileType } from './utils';

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;

    constructor(canvasId: string, width: number, height: number) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.width = width;
        this.height = height;
        this.canvas.width = width * TILE_SIZE;
        this.canvas.height = height * TILE_SIZE;
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMap(map: GameMap) {
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.tiles[y][x];
                if (tile === TileType.Wall) {
                    this.ctx.fillStyle = '#444';
                } else if (tile === TileType.Floor) {
                    this.ctx.fillStyle = '#888';
                } else {
                    this.ctx.fillStyle = '#000';
                }
                this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    drawEntity(entity: Entity) {
        this.ctx.fillStyle = entity.color;
        this.ctx.fillRect(entity.x * TILE_SIZE, entity.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

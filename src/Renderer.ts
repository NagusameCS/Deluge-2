import { GameMap } from './Map';
import { Entity, Item, Trap } from './Entity';
import { TILE_SIZE, TileType, ItemType } from './utils';

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
        this.ctx.font = '12px monospace';
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMap(map: GameMap) {
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.tiles[y][x];
                const visible = map.visible[y][x];
                const explored = map.explored[y][x];

                if (visible) {
                    if (tile === TileType.Wall) {
                        this.ctx.fillStyle = '#888'; // Lit wall
                    } else if (tile === TileType.Floor) {
                        this.ctx.fillStyle = '#ccc'; // Lit floor
                    } else {
                        this.ctx.fillStyle = '#000';
                    }
                } else if (explored) {
                    if (tile === TileType.Wall) {
                        this.ctx.fillStyle = '#444'; // Dark wall
                    } else if (tile === TileType.Floor) {
                        this.ctx.fillStyle = '#666'; // Dark floor
                    } else {
                        this.ctx.fillStyle = '#000';
                    }
                } else {
                    this.ctx.fillStyle = '#000'; // Unexplored
                }
                this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    drawEntity(entity: Entity, map: GameMap) {
        if (!map.visible[entity.y][entity.x]) return;

        this.ctx.fillStyle = entity.color;
        this.ctx.fillRect(entity.x * TILE_SIZE, entity.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Draw HP bar
        const hpPercent = entity.stats.hp / entity.stats.maxHp;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(entity.x * TILE_SIZE, entity.y * TILE_SIZE - 4, TILE_SIZE, 3);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(entity.x * TILE_SIZE, entity.y * TILE_SIZE - 4, TILE_SIZE * hpPercent, 3);
    }

    drawItem(item: Item, map: GameMap) {
        if (!map.visible[item.y][item.x]) return;

        this.ctx.fillStyle = item.color;
        // Draw a small circle or diamond for items
        const cx = item.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = item.y * TILE_SIZE + TILE_SIZE / 2;

        this.ctx.beginPath();
        if (item.type === ItemType.Potion) {
            this.ctx.arc(cx, cy, TILE_SIZE / 4, 0, Math.PI * 2);
        } else if (item.type === ItemType.Weapon) {
            this.ctx.moveTo(cx, cy - 5);
            this.ctx.lineTo(cx + 5, cy + 5);
            this.ctx.lineTo(cx - 5, cy + 5);
        } else {
            this.ctx.rect(cx - 4, cy - 4, 8, 8);
        }
        this.ctx.fill();
    }

    drawTrap(trap: Trap) {
        this.ctx.fillStyle = '#555'; // Grey for trap
        if (trap.triggered) this.ctx.fillStyle = '#f00'; // Red if triggered

        const cx = trap.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = trap.y * TILE_SIZE + TILE_SIZE / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - 8);
        this.ctx.lineTo(cx + 8, cy + 8);
        this.ctx.lineTo(cx - 8, cy + 8);
        this.ctx.fill();
    }

    drawUI(player: Entity, logs: string[], floor: number) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Floor: ${floor}  HP: ${player.stats.hp}/${player.stats.maxHp}  Mana: ${player.stats.mana}/${player.stats.maxMana}  Lvl: ${player.stats.level}  XP: ${player.stats.xp}`, 10, 20);

        // Draw Skills
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Skills: [1] Heal (10 MP)  [2] Fireball (15 MP)`, 10, 40);

        // Draw logs
        this.ctx.font = '14px monospace';
        let y = this.canvas.height - 10;
        for (let i = logs.length - 1; i >= Math.max(0, logs.length - 5); i--) {
            this.ctx.fillText(logs[i], 10, y);
            y -= 20;
        }
    }
}

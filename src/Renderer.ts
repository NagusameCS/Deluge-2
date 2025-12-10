import { GameMap } from './Map';
import { Entity, Item, Trap } from './Entity';
import { TILE_SIZE, TileType, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './utils';
import { CombatSystem } from './Combat';

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

    drawMap(map: GameMap, playerX: number, playerY: number) {
        // Calculate camera offset
        const camX = Math.max(0, Math.min(map.width - VIEWPORT_WIDTH, playerX - Math.floor(VIEWPORT_WIDTH / 2)));
        const camY = Math.max(0, Math.min(map.height - VIEWPORT_HEIGHT, playerY - Math.floor(VIEWPORT_HEIGHT / 2)));

        for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
            for (let x = 0; x < VIEWPORT_WIDTH; x++) {
                const mapX = camX + x;
                const mapY = camY + y;

                if (mapX >= map.width || mapY >= map.height) continue;

                const tile = map.tiles[mapY][mapX];
                const visible = map.visible[mapY][mapX];
                const explored = map.explored[mapY][mapX];

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

        return { camX, camY };
    }

    drawEntity(entity: Entity, map: GameMap, camX: number, camY: number) {
        if (!map.visible[entity.y][entity.x]) return;

        const screenX = entity.x - camX;
        const screenY = entity.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        this.ctx.fillStyle = entity.color;
        this.ctx.fillRect(screenX * TILE_SIZE, screenY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Draw HP bar
        const hpPercent = entity.stats.hp / entity.stats.maxHp;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(screenX * TILE_SIZE, screenY * TILE_SIZE - 4, TILE_SIZE, 3);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(screenX * TILE_SIZE, screenY * TILE_SIZE - 4, TILE_SIZE * hpPercent, 3);
    }

    drawItem(item: Item, map: GameMap, camX: number, camY: number) {
        if (!map.visible[item.y][item.x]) return;

        const screenX = item.x - camX;
        const screenY = item.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        this.ctx.fillStyle = item.color;
        const cx = screenX * TILE_SIZE + TILE_SIZE / 2;
        const cy = screenY * TILE_SIZE + TILE_SIZE / 2;

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

    drawTrap(trap: Trap, camX: number, camY: number) {
        const screenX = trap.x - camX;
        const screenY = trap.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        this.ctx.fillStyle = '#555'; // Grey for trap
        if (trap.triggered) this.ctx.fillStyle = '#f00'; // Red if triggered

        const cx = screenX * TILE_SIZE + TILE_SIZE / 2;
        const cy = screenY * TILE_SIZE + TILE_SIZE / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - 8);
        this.ctx.lineTo(cx + 8, cy + 8);
        this.ctx.lineTo(cx - 8, cy + 8);
        this.ctx.fill();
    }

    drawMinimap(map: GameMap, player: Entity) {
        const scale = 2;
        const mmWidth = map.width * scale;
        const mmHeight = map.height * scale;
        const mmX = this.canvas.width - mmWidth - 10;
        const mmY = 10;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(mmX, mmY, mmWidth, mmHeight);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(mmX, mmY, mmWidth, mmHeight);

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.explored[y][x]) {
                    if (map.tiles[y][x] === TileType.Wall) {
                        this.ctx.fillStyle = '#444';
                    } else {
                        this.ctx.fillStyle = '#888';
                    }
                    this.ctx.fillRect(mmX + x * scale, mmY + y * scale, scale, scale);
                }
            }
        }

        // Player on minimap
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(mmX + player.x * scale, mmY + player.y * scale, scale, scale);
    }

    drawCombat(combat: CombatSystem) {
        // Draw overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cellSize = 40;
        const gridStartX = (this.canvas.width - (combat.gridSize * cellSize)) / 2;
        const gridStartY = (this.canvas.height - (combat.gridSize * cellSize)) / 2;

        // Draw Grid
        this.ctx.strokeStyle = '#444';
        for (let y = 0; y < combat.gridSize; y++) {
            for (let x = 0; x < combat.gridSize; x++) {
                this.ctx.strokeRect(gridStartX + x * cellSize, gridStartY + y * cellSize, cellSize, cellSize);
            }
        }

        // Draw Player
        this.ctx.fillStyle = '#00f';
        this.ctx.fillRect(gridStartX + combat.playerPos.x * cellSize + 5, gridStartY + combat.playerPos.y * cellSize + 5, cellSize - 10, cellSize - 10);

        // Draw Enemy
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(gridStartX + combat.enemyPos.x * cellSize + 5, gridStartY + combat.enemyPos.y * cellSize + 5, cellSize - 10, cellSize - 10);

        // Draw Slashes
        for (const slash of combat.slashes) {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${slash.life / 20})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            const sx = gridStartX + slash.x * cellSize + cellSize / 2;
            const sy = gridStartY + slash.y * cellSize + cellSize / 2;
            const len = 30;
            this.ctx.moveTo(sx - Math.cos(slash.angle) * len, sy - Math.sin(slash.angle) * len);
            this.ctx.lineTo(sx + Math.cos(slash.angle) * len, sy + Math.sin(slash.angle) * len);
            this.ctx.stroke();
        }

        // Draw UI
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px monospace';
        this.ctx.fillText("COMBAT MODE", 20, 40);
        this.ctx.font = '16px monospace';
        this.ctx.fillText("[A] Attack  [D] Defend  [S] Dodge", 20, 70);

        // Combat Log
        let y = this.canvas.height - 20;
        for (let i = combat.log.length - 1; i >= Math.max(0, combat.log.length - 5); i--) {
            this.ctx.fillText(combat.log[i], 20, y);
            y -= 25;
        }
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

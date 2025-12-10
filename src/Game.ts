import { GameMap } from './Map';
import { Player, Enemy, Item } from './Entity';
import { Renderer } from './Renderer';
import { InputHandler } from './Input';
import { MAP_WIDTH, MAP_HEIGHT } from './utils';

export class Game {
    map: GameMap;
    player: Player;
    enemies: Enemy[];
    items: Item[];
    renderer: Renderer;
    inputHandler: InputHandler;
    logs: string[] = [];

    constructor() {
        this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
        this.map.generate();

        // Place player in the first room
        const startRoom = this.map.rooms[0];
        const startCenter = startRoom.center();
        this.player = new Player(startCenter.x, startCenter.y);
        this.map.computeFOV(this.player.x, this.player.y, 8);

        this.enemies = [];
        this.items = [];

        // Place some enemies and items
        for (let i = 1; i < this.map.rooms.length; i++) {
            const room = this.map.rooms[i];
            const center = room.center();

            if (Math.random() > 0.5) {
                this.enemies.push(new Enemy(center.x, center.y));
            } else {
                const typeRoll = Math.random();
                if (typeRoll < 0.6) {
                    this.items.push(new Item(center.x, center.y, 'Health Potion', '#0f0', 'potion', 10));
                } else if (typeRoll < 0.8) {
                    this.items.push(new Item(center.x, center.y, 'Sword', '#ff0', 'weapon', 2));
                } else {
                    this.items.push(new Item(center.x, center.y, 'Gold Coin', '#ffd700', 'coin', 5));
                }
            }
        }

        this.renderer = new Renderer('gameCanvas', MAP_WIDTH, MAP_HEIGHT);
        this.inputHandler = new InputHandler(this.handleInput.bind(this));
        this.log("Welcome to Deluge-2!");

        this.loop();
    }

    log(message: string) {
        this.logs.push(message);
        if (this.logs.length > 10) this.logs.shift();
    }

    handleInput(key: string) {
        if (this.player.isDead) return;

        let dx = 0;
        let dy = 0;

        if (key === 'ArrowUp' || key === 'w') dy = -1;
        if (key === 'ArrowDown' || key === 's') dy = 1;
        if (key === 'ArrowLeft' || key === 'a') dx = -1;
        if (key === 'ArrowRight' || key === 'd') dx = 1;

        if (dx !== 0 || dy !== 0) {
            const destX = this.player.x + dx;
            const destY = this.player.y + dy;

            // Check for enemies
            const targetEnemy = this.enemies.find(e => e.x === destX && e.y === destY);
            if (targetEnemy) {
                this.attack(this.player, targetEnemy);
            } else if (!this.map.isBlocked(destX, destY)) {
                this.player.move(dx, dy);

                // Check for items
                const itemIndex = this.items.findIndex(i => i.x === destX && i.y === destY);
                if (itemIndex !== -1) {
                    const item = this.items[itemIndex];
                    this.pickupItem(item);
                    this.items.splice(itemIndex, 1);
                }
            }

            this.map.computeFOV(this.player.x, this.player.y, 8);
            this.updateEnemies();
        }
    }

    attack(attacker: any, defender: any) {
        const damage = defender.takeDamage(attacker.stats.attack);
        this.log(`${attacker.name} hits ${defender.name} for ${damage} damage.`);
        if (defender.isDead) {
            this.log(`${defender.name} dies!`);
            if (defender instanceof Enemy) {
                this.player.stats.xp += defender.stats.xp;
                this.log(`You gain ${defender.stats.xp} XP.`);
                // Remove dead enemy
                this.enemies = this.enemies.filter(e => e !== defender);
            } else {
                this.log("Game Over!");
            }
        }
    }

    pickupItem(item: Item) {
        this.log(`You picked up ${item.name}.`);
        if (item.type === 'potion') {
            this.player.heal(item.value);
            this.log(`You healed for ${item.value} HP.`);
        } else if (item.type === 'weapon') {
            this.player.stats.attack += item.value;
            this.log(`Attack increased by ${item.value}.`);
        } else if (item.type === 'coin') {
            // Just score for now
            this.log(`You found ${item.value} gold.`);
        }
    }

    updateEnemies() {
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            // Only move if player is visible (simple aggro)
            if (this.map.visible[enemy.y][enemy.x]) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.abs(dx) + Math.abs(dy);

                if (distance === 1) {
                    this.attack(enemy, this.player);
                } else {
                    let moveX = 0;
                    let moveY = 0;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        moveX = dx > 0 ? 1 : -1;
                    } else {
                        moveY = dy > 0 ? 1 : -1;
                    }

                    if (!this.map.isBlocked(enemy.x + moveX, enemy.y + moveY)) {
                        let blocked = false;
                        // Don't move into other enemies
                        if (this.enemies.some(e => e.x === enemy.x + moveX && e.y === enemy.y + moveY)) blocked = true;
                        if (enemy.x + moveX === this.player.x && enemy.y + moveY === this.player.y) blocked = true;

                        if (!blocked) {
                            enemy.move(moveX, moveY);
                        }
                    }
                }
            }
        }
    }

    loop() {
        this.renderer.clear();
        this.renderer.drawMap(this.map);

        for (const item of this.items) {
            this.renderer.drawItem(item, this.map);
        }

        for (const enemy of this.enemies) {
            this.renderer.drawEntity(enemy, this.map);
        }

        this.renderer.drawEntity(this.player, this.map);
        this.renderer.drawUI(this.player, this.logs);

        requestAnimationFrame(this.loop.bind(this));
    }
}

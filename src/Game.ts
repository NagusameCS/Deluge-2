import { GameMap } from './Map';
import { Player, Enemy, Item, DungeonCore, Entity } from './Entity';
import { Renderer } from './Renderer';
import { InputHandler } from './Input';
import { MAP_WIDTH, MAP_HEIGHT, ItemType } from './utils';

export class Game {
    map!: GameMap;
    player!: Player;
    enemies!: Enemy[];
    items!: Item[];
    core: DungeonCore | null = null;
    renderer: Renderer;
    inputHandler: InputHandler;
    logs: string[] = [];
    floor: number = 1;

    constructor() {
        this.renderer = new Renderer('gameCanvas', MAP_WIDTH, MAP_HEIGHT);
        this.inputHandler = new InputHandler(this.handleInput.bind(this));

        if (this.loadGame()) {
            this.log("Welcome back to Deluge-2!");
        } else {
            this.startNewGame();
            this.log("Welcome to Deluge-2!");
        }

        this.loop();
    }

    startNewGame() {
        this.floor = 1;
        this.player = new Player(0, 0); // Position will be set in generateLevel
        this.generateLevel();
    }

    generateLevel() {
        this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
        this.map.generate();

        // Place player in the first room
        const startRoom = this.map.rooms[0];
        const startCenter = startRoom.center();
        this.player.x = startCenter.x;
        this.player.y = startCenter.y;
        this.map.computeFOV(this.player.x, this.player.y, 8);

        this.enemies = [];
        this.items = [];

        // Place enemies, items, and core
        for (let i = 1; i < this.map.rooms.length; i++) {
            const room = this.map.rooms[i];
            const center = room.center();

            // Last room gets the core
            if (i === this.map.rooms.length - 1) {
                this.core = new DungeonCore(center.x, center.y);
                continue;
            }

            if (Math.random() > 0.4) {
                this.enemies.push(new Enemy(center.x, center.y, this.floor));
            } else {
                const typeRoll = Math.random();
                if (typeRoll < 0.4) {
                    this.items.push(new Item(center.x, center.y, 'Health Potion', '#0f0', ItemType.Potion, 20));
                } else if (typeRoll < 0.6) {
                    this.items.push(new Item(center.x, center.y, 'Mana Potion', '#00f', ItemType.Potion, 20)); // Reusing potion type for now, logic in pickup
                } else if (typeRoll < 0.7) {
                    this.items.push(new Item(center.x, center.y, 'Iron Sword', '#ccc', ItemType.Weapon, 2));
                } else if (typeRoll < 0.8) {
                    this.items.push(new Item(center.x, center.y, 'Leather Armor', '#8b4513', ItemType.Armor, 1));
                } else {
                    this.items.push(new Item(center.x, center.y, 'Gold Coin', '#ffd700', ItemType.Coin, 10));
                }
            }
        }

        this.saveGame();
    }

    saveGame() {
        const saveData = {
            player: this.player,
            floor: this.floor
        };
        localStorage.setItem('deluge2_save', JSON.stringify(saveData));
    }

    loadGame(): boolean {
        const saveString = localStorage.getItem('deluge2_save');
        if (!saveString) return false;

        try {
            const data = JSON.parse(saveString);
            this.floor = data.floor;
            // Reconstruct player
            this.player = new Player(0, 0);
            Object.assign(this.player, data.player);
            // Re-assign prototype methods if lost (JSON doesn't save methods)
            // A better way is to hydrate, but for now we just copy stats
            // Actually, we need to regenerate the level because we don't save the map state
            // This is a "roguelite" save - save progress between runs or floors, but maybe not exact state if we want to be simple.
            // But user asked for "progress saves when game is closed".
            // Let's just generate a new level for the current floor for simplicity, keeping player stats.
            this.generateLevel();
            return true;
        } catch (e) {
            console.error("Failed to load save", e);
            return false;
        }
    }

    log(message: string) {
        this.logs.push(message);
        if (this.logs.length > 10) this.logs.shift();
    }

    handleInput(key: string) {
        if (this.player.isDead) {
            if (key === 'Enter') {
                this.startNewGame();
                this.log("New Game Started!");
            }
            return;
        }

        let dx = 0;
        let dy = 0;

        if (key === 'ArrowUp' || key === 'w') dy = -1;
        if (key === 'ArrowDown' || key === 's') dy = 1;
        if (key === 'ArrowLeft' || key === 'a') dx = -1;
        if (key === 'ArrowRight' || key === 'd') dx = 1;

        // Skills
        if (key === '1') this.useSkill(0);
        if (key === '2') this.useSkill(1);

        if (dx !== 0 || dy !== 0) {
            const destX = this.player.x + dx;
            const destY = this.player.y + dy;

            // Check for enemies
            const targetEnemy = this.enemies.find(e => e.x === destX && e.y === destY);
            if (targetEnemy) {
                this.attack(this.player, targetEnemy);
            } else if (this.core && this.core.x === destX && this.core.y === destY) {
                this.attack(this.player, this.core);
            } else if (!this.map.isBlocked(destX, destY)) {
                this.player.move(dx, dy);

                // Check for items
                const itemIndex = this.items.findIndex(i => i.x === destX && i.y === destY);
                if (itemIndex !== -1) {
                    const item = this.items[itemIndex];
                    this.pickupItem(item);
                    this.items.splice(itemIndex, 1);
                }

                // Check for traps
                const trap = this.map.traps.find(t => t.x === destX && t.y === destY && !t.triggered);
                if (trap) {
                    trap.triggered = true;
                    const damage = this.player.takeDamage(trap.damage);
                    this.log(`You stepped on a ${trap.name} and took ${damage.damage} damage!`);
                }
            }

            this.player.updateBuffs();
            this.map.computeFOV(this.player.x, this.player.y, 8);
            this.updateEnemies();
            this.saveGame();
        }
    }

    useSkill(index: number) {
        if (index >= this.player.skills.length) return;
        const skill = this.player.skills[index];

        if (skill.currentCooldown > 0) {
            this.log(`${skill.name} is on cooldown (${skill.currentCooldown})`);
            return;
        }

        if (this.player.stats.mana < skill.cost) {
            this.log(`Not enough mana for ${skill.name}`);
            return;
        }

        this.player.stats.mana -= skill.cost;
        skill.currentCooldown = skill.cooldown;

        if (skill.id === 'heal') {
            this.player.heal(20);
            this.log(`You used ${skill.name} and healed 20 HP.`);
        } else if (skill.id === 'fireball') {
            // Find nearest enemy
            let nearest: Enemy | null = null;
            let minDist = 6; // Range 5

            for (const enemy of this.enemies) {
                if (!this.map.visible[enemy.y][enemy.x]) continue;
                const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = enemy;
                }
            }

            if (nearest) {
                this.log(`You cast Fireball at ${nearest.name}!`);
                this.attack(this.player, nearest, 15); // Flat 15 damage
            } else {
                this.log("No target in range for Fireball.");
            }
        }

        this.updateEnemies();
    }

    attack(attacker: Entity, defender: Entity, bonusDamage: number = 0) {
        const result = defender.takeDamage(attacker.stats.attack + bonusDamage);

        let msg = `${attacker.name} hits ${defender.name} for ${result.damage} damage.`;
        if (result.isCrit) msg += " (CRIT!)";
        if (result.isDodge) msg = `${defender.name} dodged ${attacker.name}'s attack!`;

        this.log(msg);

        if (defender.isDead) {
            this.log(`${defender.name} dies!`);
            if (defender instanceof Enemy || defender instanceof DungeonCore) {
                this.player.stats.xp += defender.stats.xp;
                this.log(`You gain ${defender.stats.xp} XP.`);

                if (this.player.stats.xp >= this.player.stats.level * 100) {
                    this.player.stats.xp -= this.player.stats.level * 100;
                    this.player.levelUp();
                    this.log(`Level Up! You are now level ${this.player.stats.level}.`);
                }

                if (defender instanceof DungeonCore) {
                    this.log("Dungeon Core destroyed! Moving to next floor...");
                    this.floor++;
                    setTimeout(() => this.generateLevel(), 1000);
                } else {
                    // Remove dead enemy
                    this.enemies = this.enemies.filter(e => e !== defender);
                }
            } else {
                this.log("Game Over! Press Enter to restart.");
                localStorage.removeItem('deluge2_save');
            }
        }
    }

    pickupItem(item: Item) {
        this.log(`You picked up ${item.name}.`);
        if (item.type === ItemType.Potion) {
            if (item.name.includes('Health')) {
                this.player.heal(item.value);
                this.log(`You healed for ${item.value} HP.`);
            } else {
                this.player.restoreMana(item.value);
                this.log(`You restored ${item.value} Mana.`);
            }
        } else if (item.type === ItemType.Weapon) {
            this.player.stats.attack += item.value;
            this.log(`Attack increased by ${item.value}.`);
        } else if (item.type === ItemType.Armor) {
            this.player.stats.defense += item.value;
            this.log(`Defense increased by ${item.value}.`);
        } else if (item.type === ItemType.Coin) {
            this.log(`You found ${item.value} gold.`);
        }
    }

    updateEnemies() {
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            enemy.updateBuffs();

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
                        if (this.core && this.core.x === enemy.x + moveX && this.core.y === enemy.y + moveY) blocked = true;
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

        // Draw traps (only if visible/triggered logic? For now draw if visible)
        for (const trap of this.map.traps) {
            if (this.map.visible[trap.y][trap.x] || trap.triggered) {
                this.renderer.drawTrap(trap);
            }
        }

        for (const item of this.items) {
            this.renderer.drawItem(item, this.map);
        }

        if (this.core && !this.core.isDead && this.map.visible[this.core.y][this.core.x]) {
            this.renderer.drawEntity(this.core, this.map);
        }

        for (const enemy of this.enemies) {
            this.renderer.drawEntity(enemy, this.map);
        }

        this.renderer.drawEntity(this.player, this.map);
        this.renderer.drawUI(this.player, this.logs, this.floor);

        requestAnimationFrame(this.loop.bind(this));
    }
}

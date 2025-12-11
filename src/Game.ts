import { GameMap } from './Map';
import { Player, Enemy, Item, DungeonCore, Entity } from './Entity';
import { Renderer } from './Renderer';
import { InputHandler } from './Input';
import { MAP_WIDTH, MAP_HEIGHT, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './utils';
import { CombatSystem, CombatPhase } from './Combat';
import { aStar, clearPathCache } from './Pathfinding';

export const GameState = {
    Map: 0,
    Combat: 1,
    LevelUp: 2
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

export class Game {
    map!: GameMap;
    player!: Player;
    enemies!: Enemy[];
    items!: Item[];
    core: DungeonCore | null = null;
    renderer: Renderer;
    inputHandler: InputHandler;
    combatSystem: CombatSystem | null = null;
    logs: string[] = [];
    floor: number = 1;
    turnCounter: number = 0;
    state: GameState = GameState.Map;

    constructor() {
        this.renderer = new Renderer('gameCanvas', VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
        this.inputHandler = new InputHandler(this.handleInput.bind(this));
        // combatSystem initialized when combat starts

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

        // Clear pathfinding cache when generating a new level
        clearPathCache();

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
                    this.items.push(new Item(center.x, center.y, 'Mana Potion', '#00f', ItemType.Potion, 20));
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
            this.player = new Player(0, 0);
            Object.assign(this.player, data.player);
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

    startCombat(enemy: Enemy | DungeonCore) {
        if (enemy instanceof Enemy) {
            this.combatSystem = new CombatSystem(this.player, enemy);
            this.state = GameState.Combat;
            this.log(`Combat started with ${enemy.name}!`);
        } else {
            // DungeonCore combat might be different or same? 
            // CombatSystem expects Enemy, but DungeonCore extends Entity.
            // Let's assume for now we only fight Enemies in this mode, or cast DungeonCore to Enemy if compatible.
            // Actually DungeonCore is not an Enemy.
            // Let's just do simple attack for Core for now, or make CombatSystem accept Entity.
            // For now, fallback to simple attack for Core.
            this.attack(this.player, enemy);
        }
    }

    handleInput(key: string) {
        if (this.player.isDead) {
            if (key === 'Enter') {
                this.startNewGame();
                this.log("New Game Started!");
            }
            return;
        }

        if (this.state === GameState.LevelUp) {
            if (key === '1') { this.player.stats.maxHp += 10; this.player.stats.hp += 10; }
            else if (key === '2') { this.player.stats.maxMana += 10; this.player.stats.mana += 10; }
            else if (key === '3') { this.player.stats.attack += 2; }
            else if (key === '4') { this.player.stats.defense += 1; }
            else return;

            this.player.stats.skillPoints--; // Using skillPoints as generic stat points for now
            if (this.player.stats.skillPoints <= 0) {
                this.state = GameState.Map;
                this.log("Stats upgraded!");
            }
            return;
        }

        if (this.state === GameState.Combat && this.combatSystem) {
            // Pass all keys directly to the new combat system
            this.combatSystem.handleInput(key);
            return;
        }

        let dx = 0;
        let dy = 0;
        if (key === 'ArrowUp' || key === 'w') dy = -1;
        if (key === 'ArrowDown' || key === 's') dy = 1;
        if (key === 'ArrowLeft' || key === 'a') dx = -1;
        if (key === 'ArrowRight' || key === 'd') dx = 1;

        // Skills (Only in map mode)
        if (this.state === GameState.Map) {
            if (key === '1') this.useSkill(0);
            if (key === '2') this.useSkill(1);
        }

        if (dx !== 0 || dy !== 0) {
            const destX = this.player.x + dx;
            const destY = this.player.y + dy;

            // Check for enemies
            const targetEnemy = this.enemies.find(e => e.x === destX && e.y === destY);
            if (targetEnemy) {
                this.startCombat(targetEnemy);
            } else if (this.core && this.core.x === destX && this.core.y === destY) {
                this.startCombat(this.core);
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
                // Instant damage for now, maybe integrate into combat later
                const result = nearest.takeDamage(15);
                this.log(`Fireball hits ${nearest.name} for ${result.damage} damage.`);
                if (nearest.isDead) {
                    this.handleEnemyDeath(nearest);
                }
            } else {
                this.log("No target in range for Fireball.");
            }
        }
    }

    handleEnemyDeath(enemy: Entity) {
        this.log(`${enemy.name} dies!`);
        this.player.stats.xp += enemy.stats.xp;
        this.log(`You gain ${enemy.stats.xp} XP.`);

        if (this.player.stats.xp >= this.player.stats.level * 100) {
            this.player.stats.xp -= this.player.stats.level * 100;
            this.player.levelUp();
            this.log(`Level Up! You are now level ${this.player.stats.level}.`);
            this.state = GameState.LevelUp;
            this.player.stats.skillPoints += 3; // Give 3 points to spend
        }

        if (enemy instanceof DungeonCore) {
            this.log("Dungeon Core destroyed! Moving to next floor...");
            this.floor++;
            setTimeout(() => this.generateLevel(), 1000);
        } else {
            this.enemies = this.enemies.filter(e => e !== enemy);
        }
    }

    attack(attacker: Entity, defender: Entity, bonusDamage: number = 0) {
        const result = defender.takeDamage(attacker.stats.attack + bonusDamage);

        let msg = `${attacker.name} hits ${defender.name} for ${result.damage} damage.`;
        if (result.isCrit) msg += " (CRIT!)";
        if (result.isDodge) msg = `${defender.name} dodged ${attacker.name}'s attack!`;

        this.log(msg);

        if (defender.isDead) {
            this.handleEnemyDeath(defender);
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
        this.turnCounter++;

        // Passive movement for enemies
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            enemy.updateBuffs();

            // Only move if player is visible (simple aggro)
            if (this.map.visible[enemy.y][enemy.x]) {
                // Optimization: Only pathfind if close enough
                const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);

                if (dist < 15) {
                    if (dist === 1) {
                        this.attack(enemy, this.player);
                    } else {
                        // Throttle pathfinding: only compute path every few turns per enemy
                        // Use turnCounter and enemy position as a simple hash to stagger updates
                        const enemyHash = (enemy.x * 31 + enemy.y) % 3;
                        if ((this.turnCounter + enemyHash) % 2 === 0) {
                            const path = aStar({ x: enemy.x, y: enemy.y }, { x: this.player.x, y: this.player.y }, (x, y) => this.map.isBlocked(x, y));
                            if (path.length > 1) { // path[0] is current pos
                                const nextStep = path[1];
                                // Don't move into player (combat trigger is player -> enemy)
                                if (nextStep.x !== this.player.x || nextStep.y !== this.player.y) {
                                    // Check for other enemies
                                    if (!this.enemies.some(e => e.x === nextStep.x && e.y === nextStep.y)) {
                                        enemy.x = nextStep.x;
                                        enemy.y = nextStep.y;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Random wander if not visible
                if (Math.random() < 0.1) { // Reduced wander rate
                    const dx = Math.floor(Math.random() * 3) - 1;
                    const dy = Math.floor(Math.random() * 3) - 1;
                    if (!this.map.isBlocked(enemy.x + dx, enemy.y + dy)) {
                        enemy.x += dx;
                        enemy.y += dy;
                    }
                }
            }
        }
    }

    update() {
        if (this.state === GameState.Combat && this.combatSystem) {
            this.combatSystem.update();

            // Check for combat end conditions
            if (this.combatSystem.phase === CombatPhase.Victory) {
                this.handleEnemyDeath(this.combatSystem.enemy);
                this.combatSystem.endCombat();
                this.combatSystem = null;
                this.state = GameState.Map;
            } else if (this.combatSystem.phase === CombatPhase.Defeat || this.player.isDead) {
                this.log("You died in combat!");
                this.combatSystem.endCombat();
                this.combatSystem = null;
                this.state = GameState.Map;
                localStorage.removeItem('deluge2_save');
            }
        }
    }

    draw() {
        this.renderer.clear();

        if (this.state === GameState.Combat && this.combatSystem) {
            this.renderer.drawCombat(this.combatSystem);
        } else if (this.state === GameState.LevelUp) {
            // Draw map in background
            this.renderer.drawMap(this.map, this.player.x, this.player.y);
            this.renderer.drawUI(this.player, this.logs, this.floor);
            // Draw Level Up Menu
            this.renderer.drawLevelUp(this.player);
        } else {
            const { camX, camY } = this.renderer.drawMap(this.map, this.player.x, this.player.y);

            for (const item of this.items) {
                this.renderer.drawItem(item, this.map, camX, camY);
            }

            for (const trap of this.map.traps) {
                this.renderer.drawTrap(trap, camX, camY);
            }

            if (this.core) {
                this.renderer.drawEntity(this.core, this.map, camX, camY);
            }

            for (const enemy of this.enemies) {
                this.renderer.drawEntity(enemy, this.map, camX, camY);
            }

            this.renderer.drawEntity(this.player, this.map, camX, camY);
            this.renderer.drawMinimap(this.map, this.player);
            this.renderer.drawUI(this.player, this.logs, this.floor);
        }
    }
    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }
}

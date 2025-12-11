import { GameMap } from './Map';
import { Player, Enemy, Item, DungeonCore, Entity, Trap } from './Entity';
import { Renderer } from './Renderer';
import { InputHandler } from './Input';
import { MAP_WIDTH, MAP_HEIGHT, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, TrapType, getRandomInt } from './utils';
import { CombatSystem, CombatPhase } from './Combat';
import { aStar, clearPathCache } from './Pathfinding';
import { Chest, generateEquipment, CRAFTING_RECIPES, MaterialType, MATERIALS } from './Equipment';
import { SpriteManager, type SpriteData } from './Sprite';

export const GameState = {
    Map: 0,
    Combat: 1,
    LevelUp: 2,
    Stats: 3,
    Equipment: 4,
    Crafting: 5,
    Puzzle: 6,
    ClassSelect: 7
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

// Notification with timestamp for timed display
export interface Notification {
    message: string;
    timestamp: number;
    duration: number; // ms
}

export class Game {
    map!: GameMap;
    player!: Player;
    enemies!: Enemy[];
    items!: Item[];
    chests!: Chest[];
    traps!: Trap[];
    core: DungeonCore | null = null;
    renderer: Renderer;
    inputHandler: InputHandler;
    combatSystem: CombatSystem | null = null;
    logs: string[] = [];
    floor: number = 1;
    turnCounter: number = 0;
    state: GameState = GameState.Map;

    // UI state
    selectedInventoryIndex: number = 0;
    selectedCraftingIndex: number = 0;
    menuCursor: number = 0;

    // Class selection
    availableClasses: SpriteData[] = [];
    selectedClassIndex: number = 0;
    playerSprite: SpriteData | null = null;

    // Timed notifications
    notifications: Notification[] = [];

    constructor() {
        this.renderer = new Renderer('gameCanvas', VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
        this.inputHandler = new InputHandler(this.handleInput.bind(this));
        // combatSystem initialized when combat starts

        // Load available player classes
        this.loadPlayerClasses();

        if (this.loadGame()) {
            this.log("Welcome back to Deluge-2!");
        } else {
            // Check if we need class selection
            if (this.availableClasses.length > 1) {
                this.state = GameState.ClassSelect;
            } else {
                this.startNewGame();
                this.log("Welcome to Deluge-2!");
            }
        }

        this.loop();
    }

    loadPlayerClasses() {
        this.availableClasses = SpriteManager.getPlayerSprites();
    }

    notify(message: string, duration: number = 2000) {
        this.notifications.push({
            message,
            timestamp: Date.now(),
            duration
        });
    }

    updateNotifications() {
        const now = Date.now();
        this.notifications = this.notifications.filter(n => now - n.timestamp < n.duration);
    }

    startNewGame(selectedClass?: SpriteData) {
        this.floor = 1;
        this.player = new Player(0, 0); // Position will be set in generateLevel

        // Apply class stats if selected
        if (selectedClass) {
            this.playerSprite = selectedClass;
            this.player.stats.maxHp = selectedClass.stats.baseHp;
            this.player.stats.hp = selectedClass.stats.baseHp;
            this.player.stats.maxMana = selectedClass.stats.baseMana;
            this.player.stats.mana = selectedClass.stats.baseMana;
            this.player.stats.attack = selectedClass.stats.baseAttack;
            this.player.stats.defense = selectedClass.stats.baseDefense;
            this.player.stats.critChance = selectedClass.stats.critChance / 100;
            this.player.stats.dodgeChance = selectedClass.stats.dodgeChance / 100;
            this.player.baseStats = { ...this.player.stats };
            this.player.char = selectedClass.char;
            this.player.color = selectedClass.color;
            this.player.name = selectedClass.name;
        }

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
        this.chests = [];
        this.traps = [];

        // Place enemies, items, chests, traps and core
        for (let i = 1; i < this.map.rooms.length; i++) {
            const room = this.map.rooms[i];
            const center = room.center();

            // Last room gets the core
            if (i === this.map.rooms.length - 1) {
                this.core = new DungeonCore(center.x, center.y, this.floor);
                continue;
            }

            // Spawn enemies (more on higher floors)
            const enemyChance = 0.4 + (this.floor * 0.05);
            if (Math.random() < enemyChance) {
                // Potentially spawn multiple enemies in later floors
                const numEnemies = this.floor >= 3 && Math.random() < 0.3 ? 2 : 1;
                for (let e = 0; e < numEnemies; e++) {
                    const ex = center.x + getRandomInt(-2, 3);
                    const ey = center.y + getRandomInt(-2, 3);
                    if (!this.map.isBlocked(ex, ey)) {
                        const enemy = new Enemy(ex, ey, this.floor);

                        // Golden mob chance (5% base, increases slightly per floor)
                        if (Math.random() < 0.05 + this.floor * 0.01) {
                            enemy.makeGolden();
                        }

                        this.enemies.push(enemy);
                    }
                }
            }

            // Spawn chest (rarer than items)
            if (Math.random() < 0.15) {
                this.chests.push(new Chest(center.x + 1, center.y, this.floor));
            }

            // Spawn items
            const typeRoll = Math.random();
            if (typeRoll < 0.3) {
                this.items.push(new Item(center.x, center.y, 'Health Potion', '#0f0', ItemType.Potion, 20));
            } else if (typeRoll < 0.45) {
                this.items.push(new Item(center.x, center.y, 'Mana Potion', '#00f', ItemType.Potion, 20));
            } else if (typeRoll < 0.55) {
                // Material drop
                const matTypes = Object.values(MaterialType);
                const matType = matTypes[getRandomInt(0, matTypes.length)] as MaterialType;
                const mat = MATERIALS[matType];
                this.items.push(new Item(center.x, center.y, mat.name, mat.color, ItemType.Material, 1, matType));
            } else if (typeRoll < 0.65) {
                this.items.push(new Item(center.x, center.y, 'Gold Coin', '#ffd700', ItemType.Coin, 10 + this.floor * 5));
            }

            // Spawn traps (more on higher floors)
            if (Math.random() < 0.1 + (this.floor * 0.02)) {
                const trapTypes: TrapType[] = ['spike', 'fire', 'poison', 'teleport', 'alarm'];
                const trapType = trapTypes[getRandomInt(0, trapTypes.length)];
                const tx = center.x + getRandomInt(-3, 4);
                const ty = center.y + getRandomInt(-3, 4);
                if (!this.map.isBlocked(tx, ty)) {
                    this.traps.push(new Trap(tx, ty, trapType, this.floor));
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
        // Class selection
        if (this.state === GameState.ClassSelect) {
            if (key === 'ArrowUp' || key === 'w') {
                this.selectedClassIndex = Math.max(0, this.selectedClassIndex - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.selectedClassIndex = Math.min(this.availableClasses.length - 1, this.selectedClassIndex + 1);
            } else if (key === 'Enter' || key === ' ') {
                const selectedClass = this.availableClasses[this.selectedClassIndex];
                this.startNewGame(selectedClass);
                this.state = GameState.Map;
                this.log(`Starting as ${selectedClass.name}!`);
                this.notify(`Playing as ${selectedClass.name}`, 2000);
            }
            return;
        }

        if (this.player.isDead) {
            if (key === 'Enter') {
                this.resetGame();
            }
            return;
        }

        // Stats menu
        if (this.state === GameState.Stats) {
            if (key === 'Escape' || key === 'Tab') {
                this.state = GameState.Map;
            }
            return;
        }

        // Equipment menu
        if (this.state === GameState.Equipment) {
            if (key === 'Escape' || key === 'Tab') {
                this.state = GameState.Map;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.selectedInventoryIndex = Math.max(0, this.selectedInventoryIndex - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.selectedInventoryIndex = Math.min(this.player.inventory.equipment.length - 1, this.selectedInventoryIndex + 1);
            } else if (key === 'Enter' || key === 'e') {
                // Equip selected item
                const item = this.player.inventory.equipment[this.selectedInventoryIndex];
                if (item) {
                    this.player.equipItem(item);
                    this.log(`Equipped ${item.name}`);
                }
            } else if (key === 'u') {
                // Unequip menu cycle through slots
                const slots: (keyof typeof this.player.equipped)[] = ['weapon', 'armor', 'helmet', 'boots', 'accessory'];
                const slot = slots[this.menuCursor % slots.length];
                if (this.player.equipped[slot]) {
                    this.player.unequipItem(this.player.equipped[slot]!.slot);
                    this.log(`Unequipped ${slot}`);
                }
            } else if (key === 'ArrowLeft' || key === 'a') {
                this.menuCursor = Math.max(0, this.menuCursor - 1);
            } else if (key === 'ArrowRight' || key === 'd') {
                this.menuCursor = Math.min(4, this.menuCursor + 1);
            }
            return;
        }

        // Crafting menu
        if (this.state === GameState.Crafting) {
            if (key === 'Escape' || key === 'Tab') {
                this.state = GameState.Map;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.selectedCraftingIndex = Math.max(0, this.selectedCraftingIndex - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.selectedCraftingIndex = Math.min(CRAFTING_RECIPES.length - 1, this.selectedCraftingIndex + 1);
            } else if (key === 'Enter' || key === 'c') {
                // Try to craft
                const recipe = CRAFTING_RECIPES[this.selectedCraftingIndex];
                if (recipe) {
                    let canCraft = true;
                    for (const mat of recipe.materials) {
                        if (this.player.getMaterialCount(mat.type) < mat.count) {
                            canCraft = false;
                            break;
                        }
                    }
                    if (canCraft && this.player.inventory.equipment.length < this.player.inventory.maxSize) {
                        // Consume materials
                        for (const mat of recipe.materials) {
                            const current = this.player.getMaterialCount(mat.type);
                            this.player.inventory.materials.set(mat.type, current - mat.count);
                        }
                        // Create item from recipe
                        const newItem = generateEquipment(recipe.resultSlot, this.floor, recipe.resultRarity);
                        newItem.name = recipe.name;
                        this.player.inventory.equipment.push(newItem);
                        this.log(`Crafted ${newItem.name}!`);
                    } else if (!canCraft) {
                        this.log("Not enough materials!");
                    } else {
                        this.log("Inventory full!");
                    }
                }
            }
            return;
        }

        // Puzzle state (Dungeon Core)
        if (this.state === GameState.Puzzle && this.core) {
            this.handlePuzzleInput(key);
            return;
        }

        if (this.state === GameState.LevelUp) {
            if (key === '1') { this.player.baseStats.maxHp += 10; this.player.stats.hp += 10; }
            else if (key === '2') { this.player.baseStats.maxMana += 10; this.player.stats.mana += 10; }
            else if (key === '3') { this.player.baseStats.attack += 2; }
            else if (key === '4') { this.player.baseStats.defense += 1; }
            else return;

            this.player.stats.skillPoints--;
            this.player.recalculateStats();
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

        // Menu shortcuts (Map mode only)
        if (this.state === GameState.Map) {
            if (key === 'Tab') {
                this.state = GameState.Stats;
                return;
            }
            if (key === 'i' || key === 'I') {
                this.state = GameState.Equipment;
                return;
            }
            if (key === 'c' || key === 'C') {
                this.state = GameState.Crafting;
                return;
            }
            // Skills
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
                // Start puzzle for dungeon core
                if (!this.core.puzzleSolved) {
                    this.state = GameState.Puzzle;
                    this.log("A puzzle blocks your way to the Dungeon Core...");
                } else {
                    this.startCombat(this.core);
                }
            } else if (!this.map.isBlocked(destX, destY)) {
                this.player.move(dx, dy);

                // Check for items
                const itemIndex = this.items.findIndex(i => i.x === destX && i.y === destY);
                if (itemIndex !== -1) {
                    const item = this.items[itemIndex];
                    this.pickupItem(item);
                    this.items.splice(itemIndex, 1);
                }

                // Check for chests
                const chestIndex = this.chests.findIndex(c => c.x === destX && c.y === destY && !c.opened);
                if (chestIndex !== -1) {
                    const chest = this.chests[chestIndex];
                    this.openChest(chest);
                }

                // Check for traps
                const trap = this.traps.find(t => t.x === destX && t.y === destY && !t.triggered);
                if (trap) {
                    this.triggerTrap(trap);
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

    openChest(chest: Chest) {
        chest.opened = true;
        this.log("You open the chest!");

        // Collect gold
        if (chest.contents.gold > 0) {
            this.player.addGold(chest.contents.gold);
            this.log(`Found ${chest.contents.gold} gold!`);
        }

        // Collect materials
        for (const mat of chest.contents.materials) {
            this.player.addMaterial(mat.type, mat.count);
            const matInfo = MATERIALS[mat.type];
            this.log(`Found ${mat.count}x ${matInfo.name}!`);
        }

        // Collect equipment
        if (chest.contents.equipment) {
            if (this.player.inventory.equipment.length < this.player.inventory.maxSize) {
                this.player.inventory.equipment.push(chest.contents.equipment);
                this.log(`Found ${chest.contents.equipment.name}!`);
            } else {
                this.log("Inventory full! Equipment left behind.");
            }
        }
    }

    triggerTrap(trap: Trap) {
        trap.triggered = true;
        trap.visible = true;

        switch (trap.trapType) {
            case 'spike':
            case 'fire': {
                const damage = this.player.takeDamage(trap.damage);
                this.log(`You stepped on a ${trap.name} and took ${damage.damage} damage!`);
                break;
            }
            case 'poison': {
                const damage = this.player.takeDamage(trap.damage);
                this.log(`Poison trap! ${damage.damage} damage + poisoned!`);
                // Add poison debuff
                this.player.addBuff({
                    name: 'Poisoned',
                    duration: 5,
                    apply: () => { },
                    remove: () => { }
                });
                break;
            }
            case 'teleport': {
                // Teleport to random room
                const room = this.map.rooms[getRandomInt(0, this.map.rooms.length)];
                const center = room.center();
                this.player.x = center.x;
                this.player.y = center.y;
                this.log("Teleport trap! You were warped away!");
                break;
            }
            case 'alarm': {
                this.log("Alarm trap! Enemies alerted!");
                // Wake up all enemies and give them a path to player
                for (const enemy of this.enemies) {
                    enemy.goal = { x: this.player.x, y: this.player.y };
                }
                break;
            }
        }
    }

    handlePuzzleInput(key: string) {
        if (!this.core) return;

        if (key === 'Escape') {
            this.state = GameState.Map;
            return;
        }

        const puzzle = this.core.puzzleData;

        if (this.core.puzzleType === 'sequence') {
            // Simon-says style: press 1-4 to match the sequence
            if (puzzle.showingSequence) {
                // Waiting for display, any key to start input
                puzzle.showingSequence = false;
                return;
            }

            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                if (num === puzzle.sequence[puzzle.currentIndex]) {
                    puzzle.currentIndex++;
                    if (puzzle.currentIndex >= puzzle.sequence.length) {
                        this.core.puzzleSolved = true;
                        this.log("Puzzle solved! The Core is vulnerable!");
                        this.state = GameState.Map;
                    }
                } else {
                    // Wrong input, reset
                    puzzle.currentIndex = 0;
                    puzzle.showingSequence = true;
                    puzzle.showIndex = 0;
                    this.log("Wrong sequence! Try again...");
                }
            }
        } else if (this.core.puzzleType === 'match') {
            // Memory match: 1-8 to select cards
            const num = parseInt(key);
            if (num >= 1 && num <= 8) {
                const idx = num - 1;
                const card = puzzle.cards[idx];

                if (card.matched || card.revealed) return;

                card.revealed = true;

                if (puzzle.firstSelection === -1) {
                    puzzle.firstSelection = idx;
                } else {
                    const first = puzzle.cards[puzzle.firstSelection];
                    if (first.symbol === card.symbol) {
                        // Match!
                        first.matched = true;
                        card.matched = true;
                        puzzle.matchesMade++;

                        if (puzzle.matchesMade >= puzzle.matchesNeeded) {
                            this.core.puzzleSolved = true;
                            this.log("Puzzle solved! The Core is vulnerable!");
                            this.state = GameState.Map;
                        }
                    } else {
                        // No match, hide after delay
                        setTimeout(() => {
                            first.revealed = false;
                            card.revealed = false;
                        }, 500);
                    }
                    puzzle.firstSelection = -1;
                }
            }
        } else if (this.core.puzzleType === 'memory') {
            // Grid memory: after seeing pattern, recreate it with numpad/keys
            if (puzzle.showingPattern) {
                puzzle.showTimer--;
                if (puzzle.showTimer <= 0) {
                    puzzle.showingPattern = false;
                }
                return;
            }

            // Use numpad or 1-9 keys for 3x3 grid
            const num = parseInt(key);
            if (num >= 1 && num <= 9) {
                const idx = num - 1;
                const gx = idx % 3;
                const gy = Math.floor(idx / 3);
                puzzle.playerPattern[gy][gx] = !puzzle.playerPattern[gy][gx];
            }

            // Check if pattern matches
            if (key === 'Enter') {
                let correct = true;
                for (let y = 0; y < puzzle.gridSize; y++) {
                    for (let x = 0; x < puzzle.gridSize; x++) {
                        if (puzzle.pattern[y][x] !== puzzle.playerPattern[y][x]) {
                            correct = false;
                        }
                    }
                }

                if (correct) {
                    this.core.puzzleSolved = true;
                    this.log("Puzzle solved! The Core is vulnerable!");
                    this.state = GameState.Map;
                } else {
                    // Reset
                    puzzle.showingPattern = true;
                    puzzle.showTimer = 60;
                    for (let y = 0; y < puzzle.gridSize; y++) {
                        for (let x = 0; x < puzzle.gridSize; x++) {
                            puzzle.playerPattern[y][x] = false;
                        }
                    }
                    this.log("Wrong pattern! Watch again...");
                }
            }
        }
    }

    handleEnemyDeath(enemy: Entity) {
        this.log(`${enemy.name} dies!`);
        
        // Calculate XP with potential bonus
        const baseXp = enemy.stats.xp;
        const xpBonus = Math.floor(baseXp * this.player.stats.xpBonus);
        const totalXp = baseXp + xpBonus;
        this.player.stats.xp += totalXp;
        this.log(`You gain ${totalXp} XP.`);

        // Check for level up with overflow bonus
        const xpNeeded = this.player.stats.level * 100;
        if (this.player.stats.xp >= xpNeeded) {
            const overflow = this.player.stats.xp - xpNeeded;
            const overflowPercent = overflow / xpNeeded;
            
            this.player.stats.xp = overflow;
            this.player.levelUp();
            this.log(`Level Up! You are now level ${this.player.stats.level}.`);
            this.player.stats.skillPoints += 3;
            
            // Bonus level if overflow > 10%
            if (overflowPercent > 0.10) {
                // Check if the remaining XP also exceeds the new level requirement
                const newXpNeeded = this.player.stats.level * 100;
                if (this.player.stats.xp >= newXpNeeded) {
                    this.player.stats.xp -= newXpNeeded;
                    this.player.levelUp();
                    this.log(`BONUS LEVEL! XP overflow granted extra level!`);
                    this.player.stats.skillPoints += 3;
                    this.notify('BONUS LEVEL UP!', 2500);
                } else if (overflowPercent > 0.10) {
                    // Grant bonus level anyway for massive overflow
                    this.player.levelUp();
                    this.log(`BONUS LEVEL! Massive XP overflow granted extra level!`);
                    this.player.stats.skillPoints += 3;
                    this.notify('BONUS LEVEL UP!', 2500);
                }
            }
            
            this.state = GameState.LevelUp;
        }

        if (enemy instanceof DungeonCore) {
            this.log("Dungeon Core destroyed! Moving to next floor...");
            this.floor++;
            this.notify(`Floor ${this.floor}!`, 2000);
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

            const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);

            // Golden enemies flee from player
            if (enemy.isGolden && dist <= enemy.aggroRange) {
                // Move away from player
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const fleeX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
                const fleeY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

                // Try to move away
                if (!this.map.isBlocked(enemy.x + fleeX, enemy.y + fleeY) &&
                    !this.enemies.some(e => e.x === enemy.x + fleeX && e.y === enemy.y + fleeY)) {
                    enemy.x += fleeX;
                    enemy.y += fleeY;
                } else if (fleeX !== 0 && !this.map.isBlocked(enemy.x + fleeX, enemy.y) &&
                    !this.enemies.some(e => e.x === enemy.x + fleeX && e.y === enemy.y)) {
                    enemy.x += fleeX;
                } else if (fleeY !== 0 && !this.map.isBlocked(enemy.x, enemy.y + fleeY) &&
                    !this.enemies.some(e => e.x === enemy.x && e.y === enemy.y + fleeY)) {
                    enemy.y += fleeY;
                }
                continue;
            }

            // Aggressive enemies within range initiate combat
            if (this.map.visible[enemy.y][enemy.x] && dist <= enemy.aggroRange) {
                if (dist === 1) {
                    // Adjacent - initiate combat!
                    this.log(`${enemy.name} attacks!`);
                    this.combatSystem = new CombatSystem(this.player, enemy);
                    this.state = GameState.Combat;
                    this.notify('Combat Started!', 1500);
                    return; // Only one combat can start per turn
                } else if (dist < 15) {
                    // Move towards player
                    const enemyHash = (enemy.x * 31 + enemy.y) % 3;
                    if ((this.turnCounter + enemyHash) % 2 === 0) {
                        const path = aStar({ x: enemy.x, y: enemy.y }, { x: this.player.x, y: this.player.y }, (x, y) => this.map.isBlocked(x, y));
                        if (path.length > 1) {
                            const nextStep = path[1];
                            if (nextStep.x !== this.player.x || nextStep.y !== this.player.y) {
                                if (!this.enemies.some(e => e.x === nextStep.x && e.y === nextStep.y)) {
                                    enemy.x = nextStep.x;
                                    enemy.y = nextStep.y;
                                }
                            }
                        }
                    }
                }
            } else {
                // Random wander if not visible
                if (Math.random() < 0.1) {
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
        // Update notification timers
        this.updateNotifications();

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
                // Full game reset on death
                this.resetGame();
            }
        }
    }

    // Full game reset when player dies
    resetGame() {
        localStorage.removeItem('deluge2_save');
        this.floor = 1;
        this.logs = ['You have perished... Starting a new adventure.'];
        this.notifications = [];
        this.notify('GAME OVER - Starting New Run', 3000);

        // Check for class selection
        this.loadPlayerClasses();
        if (this.availableClasses.length > 1) {
            this.state = GameState.ClassSelect;
            this.selectedClassIndex = 0;
        } else {
            this.startNewGame();
            this.state = GameState.Map;
        }
    }

    draw() {
        this.renderer.clear();

        if (this.state === GameState.ClassSelect) {
            this.renderer.drawClassSelection(this.availableClasses, this.selectedClassIndex);
        } else if (this.state === GameState.Combat && this.combatSystem) {
            this.renderer.drawCombat(this.combatSystem);
        } else if (this.state === GameState.Stats) {
            this.renderer.drawStats(this.player, this.floor);
        } else if (this.state === GameState.Equipment) {
            this.renderer.drawEquipment(this.player, this.selectedInventoryIndex, this.menuCursor);
        } else if (this.state === GameState.Crafting) {
            this.renderer.drawCrafting(this.player, this.selectedCraftingIndex);
        } else if (this.state === GameState.Puzzle && this.core) {
            this.renderer.drawPuzzle(this.core);
        } else if (this.state === GameState.LevelUp) {
            // Draw map in background
            this.renderer.drawMap(this.map, this.player.x, this.player.y);
            this.renderer.drawUI(this.player, this.logs, this.floor);
            // Draw Level Up Menu
            this.renderer.drawLevelUp(this.player);
        } else {
            const { camX, camY } = this.renderer.drawMap(this.map, this.player.x, this.player.y);

            // Draw chests
            for (const chest of this.chests) {
                this.renderer.drawChest(chest, this.map, camX, camY);
            }

            for (const item of this.items) {
                this.renderer.drawItem(item, this.map, camX, camY);
            }

            for (const trap of this.traps) {
                if (trap.visible || trap.triggered) {
                    this.renderer.drawTrap(trap, camX, camY);
                }
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

        // Draw timed notifications on top
        this.renderer.drawNotifications(this.notifications);
    }
    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }
}

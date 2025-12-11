import { GameMap } from './Map';
import { Player, Enemy, Item, DungeonCore, Entity, Trap } from './Entity';
import { Renderer } from './Renderer';
import { InputHandler } from './Input';
import { MAP_WIDTH, MAP_HEIGHT, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, TrapType, getRandomInt } from './utils';
import { CombatSystem, CombatPhase, MultiCombatSystem, MultiCombatPhase } from './Combat';
import { aStar, clearPathCache } from './Pathfinding';
import { Chest, generateEquipment, CRAFTING_RECIPES, MaterialType, MATERIALS } from './Equipment';
import { SpriteManager, type SpriteData } from './Sprite';
import { AssetManager } from './GameAssets';
import { generateSwarmConfig, generateBossConfig, generateChallengeConfig, getRandomShrineEffect, generateRoomPuzzle } from './RoomTypes';
import { SKILL_TREES, canMulticlass, getAvailableMulticlasses } from './SkillTree';
import type { SkillTree } from './SkillTree';
import { multiplayer, DuelPhase, DuelAction, type DuelState, type DuelStats, type GameRoom } from './Multiplayer';
import { getBiomeName } from './Biomes';
import { type NPC, type SkillReallocation, generateFloorNPCs, getNPCDialogue, getSoulTraderOptions, applySkillReallocation } from './NPC';

export const GameState = {
    MainMenu: -1,
    Map: 0,
    Combat: 1,
    MultiCombat: 2,
    LevelUp: 3,
    Stats: 4,
    Equipment: 5,
    Crafting: 6,
    Puzzle: 7,
    ClassSelect: 8,
    SkillTree: 9,
    Multiclass: 10,
    MultiplayerLobby: 11,
    DuelSetup: 12,
    Duel: 13,
    Trading: 14,
    SoulTrading: 15,
    PuzzlePractice: 16,
    PuzzlePracticeGame: 17
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
    multiCombatSystem: MultiCombatSystem | null = null;
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
    notificationsEnabled: boolean = true;

    // Skill tree state
    selectedSkillTreeNode: number = 0;
    currentSkillTree: SkillTree | null = null;
    viewingSecondaryTree: boolean = false;

    // Multiclass selection
    multiclassOptions: string[] = [];
    selectedMulticlassIndex: number = 0;

    // Current room tracking
    currentRoomIndex: number = 0;
    lastRoomIndex: number = -1;

    // Multiplayer state
    multiplayerMenuOption: number = 0;
    isEnteringRoomCode: boolean = false;
    roomCodeInput: string = '';
    duelStats: DuelStats | null = null;
    duelSelectedStat: number = 0;
    duelState: DuelState | null = null;
    multiplayerRoom: GameRoom | null = null;

    // Reaper mechanic - spawns if player takes too long
    floorMoveCount: number = 0;
    reaperSpawned: boolean = false;
    reaper: Enemy | null = null;

    // NPCs and Trading
    npcs: NPC[] = [];
    currentNPC: NPC | null = null;
    traderSelectedIndex: number = 0;
    soulTraderOptions: SkillReallocation[] = [];
    soulTraderSelectedIndex: number = 0;

    // Main Menu
    mainMenuOption: number = 0;
    mainMenuOptions: string[] = ['New Game', 'Continue', 'Puzzle Practice', 'Settings', 'Credits'];

    // Puzzle Practice Mode
    puzzlePracticeCore: DungeonCore | null = null;
    puzzleStreak: number = 0;
    puzzleHighScore: number = 0;
    puzzlePracticeMenuOption: number = 0;
    puzzleTotalSolved: number = 0;

    constructor() {
        this.renderer = new Renderer('gameCanvas', VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
        this.inputHandler = new InputHandler(this.handleInput.bind(this));
        // combatSystem initialized when combat starts

        // Initialize asset manager for game visuals
        AssetManager.init();

        // Load available player classes
        this.loadPlayerClasses();

        // Load puzzle high score
        this.loadPuzzleHighScore();

        // Start at main menu
        this.state = GameState.MainMenu;
    }

    loadPuzzleHighScore() {
        try {
            const saved = localStorage.getItem('deluge2_puzzle_highscore');
            if (saved) {
                this.puzzleHighScore = parseInt(saved, 10) || 0;
            }
        } catch (e) {
            console.error('Failed to load puzzle high score:', e);
        }
    }

    savePuzzleHighScore() {
        try {
            localStorage.setItem('deluge2_puzzle_highscore', this.puzzleHighScore.toString());
        } catch (e) {
            console.error('Failed to save puzzle high score:', e);
        }
    }

    startFromMainMenu() {
        // Check for save data
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

    startPuzzlePractice() {
        // Create a dungeon core for practice mode
        this.puzzlePracticeCore = new DungeonCore(0, 0, Math.floor(this.puzzleTotalSolved / 10) + 1);
        this.puzzleStreak = 0;
        this.state = GameState.PuzzlePracticeGame;
    }

    handlePuzzlePracticeInput(key: string) {
        if (!this.puzzlePracticeCore) return;

        if (key === 'Escape') {
            // Exit to puzzle practice menu
            this.state = GameState.PuzzlePractice;
            this.puzzlePracticeCore = null;
            return;
        }

        const puzzleType = this.puzzlePracticeCore.puzzleType;
        const puzzle = this.puzzlePracticeCore.puzzleData;

        // Handle different puzzle types - mirrors handlePuzzleInput but for practice mode
        if (puzzleType === 'sequence') {
            if (puzzle.showingSequence) return;

            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                if (num === puzzle.sequence[puzzle.currentIndex]) {
                    puzzle.currentIndex++;
                    if (puzzle.currentIndex >= puzzle.sequence.length) {
                        this.onPuzzlePracticeSuccess();
                    }
                } else {
                    this.onPuzzlePracticeFail();
                }
            }
        } else if (puzzleType === 'match') {
            if (puzzle.hideTimer > 0) return;

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
                        first.matched = true;
                        card.matched = true;
                        puzzle.matchesMade++;

                        if (puzzle.matchesMade >= puzzle.matchesNeeded) {
                            this.onPuzzlePracticeSuccess();
                        }
                    } else {
                        puzzle.hideTimer = 40;
                    }
                    puzzle.firstSelection = -1;
                }
            }
        } else if (puzzleType === 'memory') {
            if (puzzle.showingPattern) return;

            const num = parseInt(key);
            if (num >= 1 && num <= 9) {
                const idx = num - 1;
                const gx = idx % 3;
                const gy = Math.floor(idx / 3);
                puzzle.playerPattern[gy][gx] = !puzzle.playerPattern[gy][gx];
            }

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
                    this.onPuzzlePracticeSuccess();
                } else {
                    this.onPuzzlePracticeFail();
                }
            }
        } else if (puzzleType === 'math') {
            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                const selectedAnswer = puzzle.options[num - 1];
                if (selectedAnswer === puzzle.answer) {
                    this.onPuzzlePracticeSuccess();
                } else {
                    this.onPuzzlePracticeFail();
                }
            }
        } else if (puzzleType === 'logic') {
            const num = parseInt(key);
            if (num >= 1 && num <= puzzle.options.length) {
                const selectedAnswer = puzzle.options[num - 1];
                if (selectedAnswer === puzzle.answer) {
                    this.onPuzzlePracticeSuccess();
                } else {
                    this.onPuzzlePracticeFail();
                }
            }
        } else if (puzzleType === 'cipher') {
            const upperKey = key.toUpperCase();

            if (key === 'Backspace') {
                puzzle.playerInput = puzzle.playerInput.slice(0, -1);
            } else if (key === 'Enter') {
                if (puzzle.playerInput.toUpperCase() === puzzle.answer) {
                    this.onPuzzlePracticeSuccess();
                } else {
                    this.onPuzzlePracticeFail();
                }
            } else if (upperKey >= 'A' && upperKey <= 'Z' && puzzle.playerInput.length < puzzle.maxLength) {
                puzzle.playerInput += upperKey;
            }
        } else if (puzzleType === 'slider') {
            const tiles = puzzle.tiles;
            const emptyIdx = tiles.indexOf(0);
            let swapIdx = -1;

            if ((key === 'ArrowLeft' || key === 'a' || key === '2') && emptyIdx % 2 !== 1) {
                swapIdx = emptyIdx + 1;
            } else if ((key === 'ArrowRight' || key === 'd' || key === '1') && emptyIdx % 2 !== 0) {
                swapIdx = emptyIdx - 1;
            } else if ((key === 'ArrowUp' || key === 'w' || key === '4') && emptyIdx < 2) {
                swapIdx = emptyIdx + 2;
            } else if ((key === 'ArrowDown' || key === 's' || key === '3') && emptyIdx >= 2) {
                swapIdx = emptyIdx - 2;
            }

            if (swapIdx >= 0 && swapIdx < 4) {
                [tiles[emptyIdx], tiles[swapIdx]] = [tiles[swapIdx], tiles[emptyIdx]];
                puzzle.moves++;

                let solved = true;
                for (let i = 0; i < 4; i++) {
                    if (tiles[i] !== puzzle.goal[i]) solved = false;
                }
                if (solved) {
                    this.onPuzzlePracticeSuccess();
                }
            }
        } else if (puzzleType === 'wire') {
            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                const idx = num - 1;
                if (puzzle.selectedLeft === -1) {
                    puzzle.selectedLeft = idx;
                } else {
                    puzzle.connections[puzzle.selectedLeft] = idx;
                    puzzle.selectedLeft = -1;

                    let allCorrect = true;
                    for (let i = 0; i < 4; i++) {
                        if (puzzle.connections[i] !== puzzle.correctConnections[i]) {
                            allCorrect = false;
                            break;
                        }
                    }
                    if (allCorrect) {
                        this.onPuzzlePracticeSuccess();
                    }
                }
            }
            if (key === '0') {
                puzzle.selectedLeft = -1;
            }
        }
    }

    onPuzzlePracticeSuccess() {
        this.puzzleStreak++;
        this.puzzleTotalSolved++;

        if (this.puzzleStreak > this.puzzleHighScore) {
            this.puzzleHighScore = this.puzzleStreak;
            this.savePuzzleHighScore();
            this.notify(`NEW HIGH SCORE: ${this.puzzleHighScore}!`, 3000);
        } else {
            this.notify(`Correct! Streak: ${this.puzzleStreak}`, 1500);
        }

        // Generate a new puzzle with increasing difficulty
        const difficulty = Math.floor(this.puzzleTotalSolved / 10) + 1;
        this.puzzlePracticeCore = new DungeonCore(0, 0, Math.min(difficulty, 20));
    }

    onPuzzlePracticeFail() {
        this.notify(`Wrong! Final streak: ${this.puzzleStreak}`, 2500);
        this.puzzleStreak = 0;
        this.state = GameState.PuzzlePractice;
        this.puzzlePracticeCore = null;
    }

    loadPlayerClasses() {
        this.availableClasses = SpriteManager.getPlayerSprites();
    }

    notify(message: string, duration: number = 2000) {
        if (!this.notificationsEnabled) return;
        this.notifications.push({
            message,
            timestamp: Date.now(),
            duration
        });
        // Limit max notifications
        if (this.notifications.length > 5) {
            this.notifications.shift();
        }
    }

    toggleNotifications() {
        this.notificationsEnabled = !this.notificationsEnabled;
        if (this.notificationsEnabled) {
            this.notify('Notifications enabled');
        }
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
        this.map.floor = this.floor;
        this.map.generate();

        // Reset reaper tracking for new floor
        this.floorMoveCount = 0;
        this.reaperSpawned = false;
        this.reaper = null;

        // Clear pathfinding cache when generating a new level
        clearPathCache();

        // Place player in the first room
        const startRoom = this.map.rooms[0];
        const startCenter = startRoom.center();
        this.player.x = startCenter.x;
        this.player.y = startCenter.y;
        this.map.computeFOV(this.player.x, this.player.y, 8);
        this.currentRoomIndex = 0;
        this.lastRoomIndex = -1;

        this.enemies = [];
        this.items = [];
        this.chests = [];
        this.traps = [];

        // Place enemies, items, chests, traps based on room type
        for (let i = 1; i < this.map.rooms.length; i++) {
            const room = this.map.rooms[i];
            const center = room.center();
            const roomData = this.map.roomData[i];
            const roomType = roomData?.type || 'normal';

            // Last room gets the core
            if (i === this.map.rooms.length - 1) {
                this.core = new DungeonCore(center.x, center.y, this.floor);
                continue;
            }

            // Spawn content based on room type
            switch (roomType) {
                case 'treasure':
                    // Lots of items and chests, no enemies
                    this.chests.push(new Chest(center.x, center.y, this.floor));
                    this.chests.push(new Chest(center.x + 2, center.y, this.floor));
                    for (let j = 0; j < 3; j++) {
                        const ix = center.x + getRandomInt(-2, 3);
                        const iy = center.y + getRandomInt(-2, 3);
                        this.items.push(new Item(ix, iy, 'Gold Coin', '#ffd700', ItemType.Coin, 20 + this.floor * 10));
                    }
                    break;

                case 'trap':
                    // Many traps, some items as bait
                    const trapTypes: TrapType[] = ['spike', 'fire', 'poison', 'teleport', 'alarm'];
                    for (let t = 0; t < 5 + this.floor; t++) {
                        const trapType = trapTypes[getRandomInt(0, trapTypes.length)];
                        const tx = center.x + getRandomInt(-4, 5);
                        const ty = center.y + getRandomInt(-4, 5);
                        if (!this.map.isBlocked(tx, ty)) {
                            this.traps.push(new Trap(tx, ty, trapType, this.floor));
                        }
                    }
                    // Bait item in center
                    this.items.push(new Item(center.x, center.y, 'Health Potion', '#0f0', ItemType.Potion, 30));
                    break;

                case 'puzzle':
                    // Puzzle room - store puzzle data
                    const puzzle = generateRoomPuzzle(this.floor);
                    roomData.specialData = puzzle;
                    // Small reward visible
                    this.chests.push(new Chest(center.x, center.y, this.floor + 1)); // Better loot
                    break;

                case 'boss':
                    // Spawn a boss enemy
                    const boss = new Enemy(center.x, center.y, this.floor, true);
                    this.enemies.push(boss);
                    // Some minions
                    const bossConfig = generateBossConfig(this.floor);
                    for (let m = 0; m < bossConfig.minions; m++) {
                        const mx = center.x + getRandomInt(-3, 4);
                        const my = center.y + getRandomInt(-3, 4);
                        if (!this.map.isBlocked(mx, my)) {
                            this.enemies.push(new Enemy(mx, my, Math.max(1, this.floor - 1)));
                        }
                    }
                    roomData.specialData = bossConfig;
                    break;

                case 'swarm':
                    // Many weaker enemies
                    const swarmConfig = generateSwarmConfig(this.floor);
                    for (let s = 0; s < swarmConfig.enemyCount; s++) {
                        const sx = center.x + getRandomInt(-4, 5);
                        const sy = center.y + getRandomInt(-4, 5);
                        if (!this.map.isBlocked(sx, sy)) {
                            const swarmEnemy = new Enemy(sx, sy, Math.max(1, this.floor - 1));
                            this.enemies.push(swarmEnemy);
                        }
                    }
                    roomData.specialData = swarmConfig;
                    break;

                case 'shrine':
                    // Random buff/debuff on interaction - no enemies
                    const shrineEffect = getRandomShrineEffect();
                    roomData.specialData = shrineEffect;
                    // Place a visual marker (handled by renderer)
                    break;

                case 'merchant':
                    // Shop room - no enemies, items for sale
                    roomData.specialData = {
                        items: [
                            { name: 'Health Potion', cost: 50, type: 'potion', value: 30 },
                            { name: 'Mana Potion', cost: 50, type: 'potion', value: 30 },
                            { name: 'Random Equipment', cost: 100 + this.floor * 20, type: 'equipment' }
                        ]
                    };
                    break;

                case 'challenge':
                    // Challenge room - tough enemy with time/conditions
                    const challengeConfig = generateChallengeConfig(this.floor);
                    const challengeEnemy = new Enemy(center.x, center.y, this.floor + 1);
                    this.enemies.push(challengeEnemy);
                    roomData.specialData = challengeConfig;
                    break;

                case 'rest':
                    // Safe room - heal partially, no enemies
                    this.items.push(new Item(center.x, center.y, 'Rest Area', '#4f4', ItemType.Potion, 0));
                    roomData.specialData = { canRest: true };
                    break;

                case 'normal':
                default:
                    // Standard room spawning logic
                    const enemyChance = 0.4 + (this.floor * 0.05);
                    if (Math.random() < enemyChance) {
                        const numEnemies = this.floor >= 3 && Math.random() < 0.3 ? 2 : 1;
                        for (let e = 0; e < numEnemies; e++) {
                            const ex = center.x + getRandomInt(-2, 3);
                            const ey = center.y + getRandomInt(-2, 3);
                            if (!this.map.isBlocked(ex, ey)) {
                                const enemy = new Enemy(ex, ey, this.floor);
                                if (Math.random() < 0.05 + this.floor * 0.01) {
                                    enemy.makeGolden();
                                }
                                this.enemies.push(enemy);
                            }
                        }
                    }

                    if (Math.random() < 0.15) {
                        this.chests.push(new Chest(center.x + 1, center.y, this.floor));
                    }

                    const typeRoll = Math.random();
                    if (typeRoll < 0.3) {
                        this.items.push(new Item(center.x, center.y, 'Health Potion', '#0f0', ItemType.Potion, 20));
                    } else if (typeRoll < 0.45) {
                        this.items.push(new Item(center.x, center.y, 'Mana Potion', '#00f', ItemType.Potion, 20));
                    } else if (typeRoll < 0.55) {
                        const matTypes = Object.values(MaterialType);
                        const matType = matTypes[getRandomInt(0, matTypes.length)] as MaterialType;
                        const mat = MATERIALS[matType];
                        this.items.push(new Item(center.x, center.y, mat.name, mat.color, ItemType.Material, 1, matType));
                    } else if (typeRoll < 0.65) {
                        this.items.push(new Item(center.x, center.y, 'Gold Coin', '#ffd700', ItemType.Coin, 10 + this.floor * 5));
                    }

                    if (Math.random() < 0.1 + (this.floor * 0.02)) {
                        const trapTypes2: TrapType[] = ['spike', 'fire', 'poison', 'teleport', 'alarm'];
                        const trapType2 = trapTypes2[getRandomInt(0, trapTypes2.length)];
                        const tx = center.x + getRandomInt(-3, 4);
                        const ty = center.y + getRandomInt(-3, 4);
                        if (!this.map.isBlocked(tx, ty)) {
                            this.traps.push(new Trap(tx, ty, trapType2, this.floor));
                        }
                    }
                    break;
            }
        }

        // Generate NPCs for this floor (traders, soul traders, etc.)
        this.npcs = generateFloorNPCs(this.floor, this.map.rooms);

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
            // Check if we're in a swarm room - trigger multi-combat
            const roomData = this.map.getRoomDataAt(this.player.x, this.player.y);
            if (roomData && roomData.type === 'swarm') {
                // Get all nearby enemies in the swarm
                const nearbyEnemies = this.enemies.filter(e => {
                    const dist = Math.abs(e.x - this.player.x) + Math.abs(e.y - this.player.y);
                    return dist <= 6 && !e.isDead;
                });

                if (nearbyEnemies.length > 1) {
                    // Multi-combat!
                    this.multiCombatSystem = new MultiCombatSystem(this.player, nearbyEnemies);
                    this.state = GameState.MultiCombat;
                    this.log(`Swarm battle with ${nearbyEnemies.length} enemies!`);
                    this.notify(`SWARM BATTLE! ${nearbyEnemies.length} enemies!`, 2000);
                    return;
                }
            }

            // Standard single combat
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
        // Main Menu
        if (this.state === GameState.MainMenu) {
            if (key === 'ArrowUp' || key === 'w') {
                this.mainMenuOption = Math.max(0, this.mainMenuOption - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.mainMenuOption = Math.min(this.mainMenuOptions.length - 1, this.mainMenuOption + 1);
            } else if (key === 'Enter' || key === ' ') {
                switch (this.mainMenuOption) {
                    case 0: // New Game
                        localStorage.removeItem('deluge2_save');
                        if (this.availableClasses.length > 1) {
                            this.state = GameState.ClassSelect;
                        } else {
                            this.startNewGame();
                            this.state = GameState.Map;
                        }
                        break;
                    case 1: // Continue
                        if (this.loadGame()) {
                            this.state = GameState.Map;
                        } else {
                            this.notify('No save data found!', 2000);
                        }
                        break;
                    case 2: // Puzzle Practice
                        this.state = GameState.PuzzlePractice;
                        this.puzzlePracticeMenuOption = 0;
                        break;
                    case 3: // Settings
                        this.notify('Settings not yet implemented', 2000);
                        break;
                    case 4: // Credits
                        this.notify('Deluge 2 - A Roguelike Adventure', 2000);
                        break;
                }
            }
            return;
        }

        // Puzzle Practice Menu
        if (this.state === GameState.PuzzlePractice) {
            if (key === 'Escape') {
                this.state = GameState.MainMenu;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.puzzlePracticeMenuOption = Math.max(0, this.puzzlePracticeMenuOption - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.puzzlePracticeMenuOption = Math.min(2, this.puzzlePracticeMenuOption + 1);
            } else if (key === 'Enter' || key === ' ') {
                if (this.puzzlePracticeMenuOption === 0) {
                    // Start puzzle practice
                    this.startPuzzlePractice();
                } else if (this.puzzlePracticeMenuOption === 1) {
                    // Reset high score
                    this.puzzleHighScore = 0;
                    this.savePuzzleHighScore();
                    this.notify('High score reset!', 1500);
                } else if (this.puzzlePracticeMenuOption === 2) {
                    // Back to main menu
                    this.state = GameState.MainMenu;
                }
            }
            return;
        }

        // Puzzle Practice Game
        if (this.state === GameState.PuzzlePracticeGame && this.puzzlePracticeCore) {
            this.handlePuzzlePracticeInput(key);
            return;
        }

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

        if (this.player && this.player.isDead) {
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

        // Skill Tree state
        if (this.state === GameState.SkillTree) {
            if (key === 'Escape' || key === 'Tab') {
                this.state = GameState.Map;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.selectedSkillTreeNode = Math.max(0, this.selectedSkillTreeNode - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                const maxNodes = this.currentSkillTree ? this.currentSkillTree.nodes.length - 1 : 0;
                this.selectedSkillTreeNode = Math.min(maxNodes, this.selectedSkillTreeNode + 1);
            } else if (key === 'Enter' || key === ' ') {
                // Try to learn skill
                if (this.currentSkillTree) {
                    const node = this.currentSkillTree.nodes[this.selectedSkillTreeNode];
                    if (node) {
                        if (this.player.learnSkill(node.id, this.viewingSecondaryTree)) {
                            this.notify(`Learned ${node.name}!`);
                        } else {
                            this.notify('Cannot learn this skill');
                        }
                    }
                }
            } else if (key === 'q' || key === 'Q') {
                // Toggle between primary and secondary tree
                if (this.player.multiclass.secondaryClass) {
                    this.viewingSecondaryTree = !this.viewingSecondaryTree;
                    this.currentSkillTree = SKILL_TREES.get(
                        this.viewingSecondaryTree
                            ? this.player.multiclass.secondaryClass
                            : this.player.multiclass.primaryClass
                    ) || null;
                    this.selectedSkillTreeNode = 0;
                }
            }
            return;
        }

        // Multiplayer Lobby state
        if (this.state === GameState.MultiplayerLobby) {
            this.handleMultiplayerLobbyInput(key);
            return;
        }

        // Duel Setup state (stat allocation)
        if (this.state === GameState.DuelSetup) {
            this.handleDuelSetupInput(key);
            return;
        }

        // Duel state
        if (this.state === GameState.Duel) {
            this.handleDuelInput(key);
            return;
        }

        // Multiclass selection state
        if (this.state === GameState.Multiclass) {
            if (key === 'Escape') {
                this.state = GameState.Map;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.selectedMulticlassIndex = Math.max(0, this.selectedMulticlassIndex - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.selectedMulticlassIndex = Math.min(this.multiclassOptions.length - 1, this.selectedMulticlassIndex + 1);
            } else if (key === 'Enter' || key === ' ') {
                const selectedClass = this.multiclassOptions[this.selectedMulticlassIndex];
                if (selectedClass && this.player.multiclassInto(selectedClass)) {
                    this.notify(`Multiclassed into ${selectedClass}!`);
                    this.state = GameState.Map;
                }
            }
            return;
        }

        // Trading state
        if (this.state === GameState.Trading && this.currentNPC) {
            if (key === 'Escape') {
                this.state = GameState.Map;
                this.currentNPC = null;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.traderSelectedIndex = Math.max(0, this.traderSelectedIndex - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.traderSelectedIndex = Math.min(this.currentNPC.inventory.length - 1, this.traderSelectedIndex + 1);
            } else if (key === 'Enter' || key === ' ') {
                const item = this.currentNPC.inventory[this.traderSelectedIndex];
                if (item && this.player.inventory.gold >= item.cost) {
                    this.player.inventory.gold -= item.cost;
                    if (item.type === 'heal') {
                        this.player.heal(item.value);
                        this.log(`Restored ${item.value} HP!`);
                        this.notify(`+${item.value} HP`, 1500);
                    } else if (item.type === 'mana') {
                        this.player.restoreMana(item.value);
                        this.log(`Restored ${item.value} Mana!`);
                        this.notify(`+${item.value} MP`, 1500);
                    } else if (item.type === 'material' && item.materialType) {
                        const current = this.player.getMaterialCount(item.materialType);
                        this.player.inventory.materials.set(item.materialType, current + item.value);
                        this.log(`Bought ${item.name}!`);
                        this.notify(`Got ${item.name}!`, 1500);
                    }
                } else {
                    this.notify("Not enough gold!", 1500);
                }
            }
            return;
        }

        // Soul Trading state
        if (this.state === GameState.SoulTrading && this.currentNPC) {
            if (key === 'Escape') {
                this.state = GameState.Map;
                this.currentNPC = null;
            } else if (key === 'ArrowUp' || key === 'w') {
                this.soulTraderSelectedIndex = Math.max(0, this.soulTraderSelectedIndex - 1);
            } else if (key === 'ArrowDown' || key === 's') {
                this.soulTraderSelectedIndex = Math.min(this.soulTraderOptions.length - 1, this.soulTraderSelectedIndex + 1);
            } else if (key === 'Enter' || key === ' ') {
                const option = this.soulTraderOptions[this.soulTraderSelectedIndex];
                if (option) {
                    if (applySkillReallocation(this.player, option)) {
                        this.log(`Exchanged ${option.from} for ${option.to}!`);
                        this.notify('Stats reallocated!', 1500);
                    } else {
                        this.notify("Can't do that exchange!", 1500);
                    }
                }
            }
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

        if (this.state === GameState.MultiCombat && this.multiCombatSystem) {
            // Pass all keys to multi-combat system
            this.multiCombatSystem.handleInput(key);
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
            // Skill Tree (T key)
            if (key === 't' || key === 'T') {
                this.openSkillTree();
                return;
            }
            // Multiclass (M key) - only at level 25+
            if (key === 'm' || key === 'M') {
                if (canMulticlass(this.player.stats.level, this.player.multiclass)) {
                    this.multiclassOptions = getAvailableMulticlasses(this.player.multiclass.primaryClass);
                    this.selectedMulticlassIndex = 0;
                    this.state = GameState.Multiclass;
                } else if (this.player.multiclass.secondaryClass) {
                    this.notify('Already multiclassed!');
                } else {
                    this.notify(`Multiclass available at level 25 (current: ${this.player.stats.level})`);
                }
                return;
            }
            // Toggle notifications (N key)
            if (key === 'n' || key === 'N') {
                this.toggleNotifications();
                return;
            }
            // Multiplayer (P key)
            if (key === 'p' || key === 'P') {
                this.state = GameState.MultiplayerLobby;
                this.multiplayerMenuOption = 0;
                this.isEnteringRoomCode = false;
                this.roomCodeInput = '';
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
            } else {
                // Check for NPCs
                const npc = this.npcs.find(n => n.x === destX && n.y === destY);
                if (npc) {
                    this.interactWithNPC(npc);
                    return;
                }

                if (!this.map.isBlocked(destX, destY)) {
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

                    // Track movement for reaper spawn
                    this.floorMoveCount++;
                    this.checkReaperSpawn();
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

    openSkillTree() {
        // Load the skill tree for current class
        this.currentSkillTree = SKILL_TREES.get(this.player.multiclass.primaryClass) || null;
        this.viewingSecondaryTree = false;
        this.selectedSkillTreeNode = 0;
        this.state = GameState.SkillTree;
    }

    interactWithNPC(npc: NPC) {
        this.currentNPC = npc;
        const dialogue = getNPCDialogue(npc);
        this.log(`${npc.name}: "${dialogue}"`);

        switch (npc.type) {
            case 'trader':
            case 'blacksmith':
                this.traderSelectedIndex = 0;
                this.state = GameState.Trading;
                this.notify(`Trading with ${npc.name}`, 1500);
                break;
            case 'soul_trader':
                this.soulTraderOptions = getSoulTraderOptions(this.floor);
                this.soulTraderSelectedIndex = 0;
                this.state = GameState.SoulTrading;
                this.notify(`Soul exchange with ${npc.name}`, 1500);
                break;
            case 'healer':
                // Free healing once per floor
                if (!npc.interacted) {
                    npc.interacted = true;
                    const healAmount = 50 + this.floor * 10;
                    this.player.heal(healAmount);
                    this.player.restoreMana(30 + this.floor * 5);
                    this.log(`${npc.name} restores your vitality!`);
                    this.notify(`Healed ${healAmount} HP!`, 2000);
                } else {
                    this.log(`${npc.name}: "I've already blessed you on this floor."`);
                    this.notify('Already healed this floor', 1500);
                }
                break;
            case 'sage':
                // Sage gives hints and maybe a small buff
                if (!npc.interacted) {
                    npc.interacted = true;
                    const tips = [
                        "The deeper floors hold greater dangers... and rewards.",
                        "Don't linger too long, or the Reaper may find you.",
                        "Soul Traders can help reshape your abilities.",
                        "Golden enemies drop extra loot - but they flee!",
                    ];
                    this.log(tips[Math.floor(Math.random() * tips.length)]);
                    // Small XP bonus
                    this.player.stats.xp += 10 * this.floor;
                    this.notify(`+${10 * this.floor} XP from wisdom!`, 2000);
                } else {
                    this.log(`${npc.name}: "Seek wisdom in your actions, not just words."`);
                }
                break;
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
                // Animations handled in update loop now, just wait
                return;
            }

            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                if (num === puzzle.sequence[puzzle.currentIndex]) {
                    puzzle.currentIndex++;
                    if (puzzle.currentIndex >= puzzle.sequence.length) {
                        this.completePuzzleStep();
                    }
                } else {
                    this.core.resetCurrentPuzzle();
                    this.log("Wrong sequence! Try again...");
                    this.notify('Wrong!', 1000);
                }
            }
        } else if (this.core.puzzleType === 'match') {
            // Memory match: 1-8 to select cards
            if (puzzle.hideTimer > 0) return; // Wait for cards to hide

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
                            this.completePuzzleStep();
                        }
                    } else {
                        // No match, set timer to hide
                        puzzle.hideTimer = 40; // ~0.67 seconds
                    }
                    puzzle.firstSelection = -1;
                }
            }
        } else if (this.core.puzzleType === 'memory') {
            // Grid memory: after seeing pattern, recreate it with numpad/keys
            if (puzzle.showingPattern) {
                return; // Just watching
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
                    this.completePuzzleStep();
                } else {
                    this.core.resetCurrentPuzzle();
                    this.log("Wrong pattern! Watch again...");
                    this.notify('Wrong!', 1000);
                }
            }
        } else if (this.core.puzzleType === 'math') {
            // Math puzzle: select answer with 1-4
            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                const selectedAnswer = puzzle.options[num - 1];
                if (selectedAnswer === puzzle.answer) {
                    this.completePuzzleStep();
                } else {
                    this.core.resetCurrentPuzzle();
                    this.log("Wrong answer! Try a new equation...");
                    this.notify('Wrong!', 1000);
                }
            }
        } else if (this.core.puzzleType === 'logic') {
            // Logic puzzle: select answer
            const num = parseInt(key);
            if (num >= 1 && num <= puzzle.options.length) {
                const selectedAnswer = puzzle.options[num - 1];
                if (selectedAnswer === puzzle.answer) {
                    this.completePuzzleStep();
                } else {
                    this.core.resetCurrentPuzzle();
                    this.log("Incorrect logic! Think again...");
                    this.notify('Wrong!', 1000);
                }
            }
        } else if (this.core.puzzleType === 'cipher') {
            // Cipher: type letters to decode
            const upperKey = key.toUpperCase();

            if (key === 'Backspace') {
                puzzle.playerInput = puzzle.playerInput.slice(0, -1);
            } else if (key === 'Enter') {
                if (puzzle.playerInput.toUpperCase() === puzzle.answer) {
                    this.completePuzzleStep();
                } else {
                    puzzle.playerInput = '';
                    this.log("Wrong decoding! Try again...");
                    this.notify('Wrong!', 1000);
                }
            } else if (upperKey >= 'A' && upperKey <= 'Z' && puzzle.playerInput.length < puzzle.maxLength) {
                puzzle.playerInput += upperKey;
            }
        } else if (this.core.puzzleType === 'slider') {
            // Slider puzzle: use arrow keys or 1-4 to move tiles
            const tiles = puzzle.tiles;
            const emptyIdx = tiles.indexOf(0);
            let swapIdx = -1;

            if ((key === 'ArrowLeft' || key === 'a' || key === '2') && emptyIdx % 2 !== 1) {
                swapIdx = emptyIdx + 1; // Move tile from right
            } else if ((key === 'ArrowRight' || key === 'd' || key === '1') && emptyIdx % 2 !== 0) {
                swapIdx = emptyIdx - 1; // Move tile from left
            } else if ((key === 'ArrowUp' || key === 'w' || key === '4') && emptyIdx < 2) {
                swapIdx = emptyIdx + 2; // Move tile from below
            } else if ((key === 'ArrowDown' || key === 's' || key === '3') && emptyIdx >= 2) {
                swapIdx = emptyIdx - 2; // Move tile from above
            }

            if (swapIdx >= 0 && swapIdx < 4) {
                [tiles[emptyIdx], tiles[swapIdx]] = [tiles[swapIdx], tiles[emptyIdx]];
                puzzle.moves++;

                // Check win condition
                let solved = true;
                for (let i = 0; i < 4; i++) {
                    if (tiles[i] !== puzzle.goal[i]) solved = false;
                }
                if (solved) {
                    this.completePuzzleStep();
                }
            }
        } else if (this.core.puzzleType === 'wire') {
            // Wire puzzle: select left wire (1-4), then right connection (1-4)
            const num = parseInt(key);
            if (num >= 1 && num <= 4) {
                const idx = num - 1;
                if (puzzle.selectedLeft === -1) {
                    // Select left wire
                    puzzle.selectedLeft = idx;
                } else {
                    // Connect to right
                    puzzle.connections[puzzle.selectedLeft] = idx;
                    puzzle.selectedLeft = -1;

                    // Check if all connections are correct
                    let allCorrect = true;
                    for (let i = 0; i < 4; i++) {
                        if (puzzle.connections[i] !== puzzle.correctConnections[i]) {
                            allCorrect = false;
                            break;
                        }
                    }
                    if (allCorrect) {
                        this.completePuzzleStep();
                    }
                }
            }
            // Cancel selection with Escape or 0
            if (key === '0') {
                puzzle.selectedLeft = -1;
            }
        }
    }

    // Helper to complete a puzzle step
    completePuzzleStep() {
        if (!this.core) return;

        const allDone = this.core.completePuzzle();
        if (allDone) {
            this.log("All puzzles solved! The Core is vulnerable!");
            this.notify('CORE VULNERABLE!', 2500);
        } else {
            this.log(`Puzzle ${this.core.puzzlesCompleted}/${this.core.puzzlesRequired} complete! Lamp lit!`);
            this.notify(`Lamp ${this.core.puzzlesCompleted} Lit!`, 1500);
        }
        this.state = GameState.Map;
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
            this.renderer.setBiome(this.floor);
            this.notify(`Floor ${this.floor} - ${getBiomeName(this.floor)}!`, 2500);
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

        // Reaper always pursues the player aggressively
        this.updateReaper();
    }

    checkReaperSpawn() {
        if (this.reaperSpawned) return;

        const threshold = Math.floor((this.map.width * this.map.height) / 2);

        if (this.floorMoveCount >= threshold) {
            this.spawnReaper();
        }
    }

    spawnReaper() {
        this.reaperSpawned = true;

        // Find spawn position at the edge of the map, far from player
        let spawnX = 0;
        let spawnY = 0;
        let maxDist = 0;

        // Try corners and edges
        const candidates = [
            { x: 2, y: 2 },
            { x: this.map.width - 3, y: 2 },
            { x: 2, y: this.map.height - 3 },
            { x: this.map.width - 3, y: this.map.height - 3 }
        ];

        for (const pos of candidates) {
            const dist = Math.abs(pos.x - this.player.x) + Math.abs(pos.y - this.player.y);
            if (dist > maxDist && !this.map.isBlocked(pos.x, pos.y)) {
                maxDist = dist;
                spawnX = pos.x;
                spawnY = pos.y;
            }
        }

        // If no valid corner, find any valid spot
        if (maxDist === 0) {
            for (let attempt = 0; attempt < 100; attempt++) {
                const rx = Math.floor(Math.random() * (this.map.width - 4)) + 2;
                const ry = Math.floor(Math.random() * (this.map.height - 4)) + 2;
                if (!this.map.isBlocked(rx, ry)) {
                    const dist = Math.abs(rx - this.player.x) + Math.abs(ry - this.player.y);
                    if (dist > maxDist) {
                        maxDist = dist;
                        spawnX = rx;
                        spawnY = ry;
                    }
                }
            }
        }

        // Create the Reaper - a level 99 death entity
        // Using difficulty 99, not boss (we'll override stats manually)
        this.reaper = new Enemy(spawnX, spawnY, 99, false);
        this.reaper.name = 'The Reaper';
        this.reaper.char = '☠';
        this.reaper.stats.maxHp = 9999;
        this.reaper.stats.hp = 9999;
        this.reaper.stats.attack = 999;
        this.reaper.stats.defense = 99;
        this.reaper.stats.level = 99;
        this.reaper.aggroRange = 999; // Always knows where player is
        this.reaper.color = '#880088'; // Dark purple/magenta

        this.enemies.push(this.reaper);

        this.log("⚠️ THE REAPER HAS COME FOR YOU!");
        this.notify('☠️ THE REAPER APPROACHES ☠️', 3000);
    }

    updateReaper() {
        if (!this.reaper || this.reaper.isDead) return;

        const dist = Math.abs(this.reaper.x - this.player.x) + Math.abs(this.reaper.y - this.player.y);

        // If adjacent, initiate combat
        if (dist === 1) {
            this.log("The Reaper catches you!");
            this.combatSystem = new CombatSystem(this.player, this.reaper);
            this.state = GameState.Combat;
            this.notify('☠️ FACE THE REAPER ☠️', 2000);
            return;
        }

        // Always move toward player, twice as fast (2 steps per turn)
        for (let i = 0; i < 2; i++) {
            const path = aStar(
                { x: this.reaper.x, y: this.reaper.y },
                { x: this.player.x, y: this.player.y },
                (x, y) => this.map.isBlocked(x, y)
            );

            if (path.length > 1) {
                const nextStep = path[1];
                // Don't step on player's tile
                if (nextStep.x !== this.player.x || nextStep.y !== this.player.y) {
                    this.reaper.x = nextStep.x;
                    this.reaper.y = nextStep.y;
                } else {
                    break; // Adjacent to player
                }
            }

            // Check if now adjacent after moving
            const newDist = Math.abs(this.reaper.x - this.player.x) + Math.abs(this.reaper.y - this.player.y);
            if (newDist === 1) {
                break;
            }
        }
    }

    update() {
        // Update notification timers
        this.updateNotifications();

        // Update puzzle animations
        if (this.state === GameState.Puzzle && this.core) {
            this.core.updatePuzzle();

            // Check for math puzzle timeout
            if (this.core.puzzleType === 'math' && this.core.puzzleData.timer <= 0) {
                this.core.resetCurrentPuzzle();
                this.log("Time's up! New equation...");
                this.notify('Time Out!', 1000);
            }
        }

        // Update puzzle practice animations
        if (this.state === GameState.PuzzlePracticeGame && this.puzzlePracticeCore) {
            this.puzzlePracticeCore.updatePuzzle();

            // Check for math puzzle timeout in practice mode
            if (this.puzzlePracticeCore.puzzleType === 'math' && this.puzzlePracticeCore.puzzleData.timer <= 0) {
                this.onPuzzlePracticeFail();
            }
        }

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

        // Multi-combat update
        if (this.state === GameState.MultiCombat && this.multiCombatSystem) {
            this.multiCombatSystem.update();

            // Check for combat end conditions
            if (this.multiCombatSystem.phase === MultiCombatPhase.Victory) {
                // Handle all enemy deaths
                for (const state of this.multiCombatSystem.enemies) {
                    if (state.isDead) {
                        this.handleEnemyDeath(state.enemy);
                    }
                }
                this.multiCombatSystem.endCombat();
                this.multiCombatSystem = null;
                this.state = GameState.Map;
            } else if (this.multiCombatSystem.phase === MultiCombatPhase.Defeat || this.player.isDead) {
                this.log("Overwhelmed by the swarm!");
                this.multiCombatSystem.endCombat();
                this.multiCombatSystem = null;
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

        if (this.state === GameState.MainMenu) {
            this.renderer.drawMainMenu(this.mainMenuOption, this.mainMenuOptions);
        } else if (this.state === GameState.PuzzlePractice) {
            this.renderer.drawPuzzlePracticeMenu(
                this.puzzlePracticeMenuOption,
                this.puzzleStreak,
                this.puzzleHighScore,
                this.puzzleTotalSolved
            );
        } else if (this.state === GameState.PuzzlePracticeGame && this.puzzlePracticeCore) {
            this.renderer.drawPuzzlePractice(this.puzzlePracticeCore, this.puzzleStreak);
        } else if (this.state === GameState.ClassSelect) {
            this.renderer.drawClassSelection(this.availableClasses, this.selectedClassIndex);
        } else if (this.state === GameState.Combat && this.combatSystem) {
            this.renderer.drawCombat(this.combatSystem);
        } else if (this.state === GameState.MultiCombat && this.multiCombatSystem) {
            this.renderer.drawMultiCombat(this.multiCombatSystem);
        } else if (this.state === GameState.Stats) {
            this.renderer.drawStats(this.player, this.floor);
        } else if (this.state === GameState.Equipment) {
            this.renderer.drawEquipment(this.player, this.selectedInventoryIndex, this.menuCursor);
        } else if (this.state === GameState.Crafting) {
            this.renderer.drawCrafting(this.player, this.selectedCraftingIndex);
        } else if (this.state === GameState.Puzzle && this.core) {
            this.renderer.drawPuzzle(this.core);
        } else if (this.state === GameState.SkillTree && this.currentSkillTree) {
            const skillMap = this.viewingSecondaryTree
                ? this.player.multiclass.secondarySkills
                : this.player.multiclass.primarySkills;
            this.renderer.drawSkillTree(
                this.currentSkillTree,
                skillMap,
                this.selectedSkillTreeNode,
                this.player.stats.skillPoints,
                this.viewingSecondaryTree,
                this.player.multiclass.secondaryClass !== null
            );
        } else if (this.state === GameState.Multiclass) {
            this.renderer.drawMulticlassMenu(
                this.multiclassOptions,
                this.selectedMulticlassIndex,
                this.player.multiclass.primaryClass
            );
        } else if (this.state === GameState.MultiplayerLobby) {
            this.renderer.drawMultiplayerLobby(
                this.multiplayerRoom,
                this.multiplayerMenuOption,
                this.isEnteringRoomCode,
                this.roomCodeInput
            );
        } else if (this.state === GameState.DuelSetup && this.duelStats) {
            this.renderer.drawDuelStatAllocation(this.duelStats, this.duelSelectedStat);
        } else if (this.state === GameState.Duel && this.duelState) {
            this.renderer.drawDuel(this.duelState, true); // Always player 1 in local
        } else if (this.state === GameState.Trading && this.currentNPC) {
            this.renderer.drawTrading(this.currentNPC, this.traderSelectedIndex, this.player.inventory.gold);
        } else if (this.state === GameState.SoulTrading && this.currentNPC) {
            this.renderer.drawSoulTrading(
                this.currentNPC,
                this.soulTraderOptions,
                this.soulTraderSelectedIndex,
                this.player.inventory.gold,
                this.player.baseStats
            );
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

            // Draw NPCs
            for (const npc of this.npcs) {
                this.renderer.drawNPC(npc, this.map, camX, camY);
            }

            for (const enemy of this.enemies) {
                this.renderer.drawEntity(enemy, this.map, camX, camY);
            }

            this.renderer.drawEntity(this.player, this.map, camX, camY);
            this.renderer.drawMinimap(this.map, this.player);
            this.renderer.drawUI(this.player, this.logs, this.floor);

            // Draw reaper warning/timer
            const reaperThreshold = Math.floor((this.map.width * this.map.height) / 2);
            this.renderer.drawReaperWarning(this.floorMoveCount, reaperThreshold, this.reaperSpawned);
        }

        // Draw timed notifications on top (combat mode positions them differently)
        const inCombat = this.state === GameState.Combat || this.state === GameState.MultiCombat;
        this.renderer.drawNotifications(this.notifications, this.notificationsEnabled, inCombat);
    }

    // ============================================
    // MULTIPLAYER HANDLERS
    // ============================================

    handleMultiplayerLobbyInput(key: string) {
        if (this.multiplayerRoom) {
            // In a room
            if (key === 'Escape') {
                this.multiplayerRoom = null;
                multiplayer.leaveRoom();
                return;
            }
            if (key === 'Enter') {
                // Start/Ready
                if (this.multiplayerRoom.mode === 'duel') {
                    // Go to stat allocation
                    this.duelStats = multiplayer.createDefaultDuelStats();
                    this.duelSelectedStat = 0;
                    this.state = GameState.DuelSetup;
                }
            }
            return;
        }

        if (this.isEnteringRoomCode) {
            if (key === 'Escape') {
                this.isEnteringRoomCode = false;
                this.roomCodeInput = '';
            } else if (key === 'Enter' && this.roomCodeInput.length === 6) {
                // Join room (would connect to server in real implementation)
                this.notify('Room joining not yet implemented (local only)');
                this.isEnteringRoomCode = false;
            } else if (key === 'Backspace') {
                this.roomCodeInput = this.roomCodeInput.slice(0, -1);
            } else if (key.length === 1 && /[A-Za-z0-9]/.test(key) && this.roomCodeInput.length < 6) {
                this.roomCodeInput += key.toUpperCase();
            }
            return;
        }

        // Main menu navigation
        if (key === 'Escape') {
            this.state = GameState.Map;
        } else if (key === 'ArrowUp' || key === 'w') {
            this.multiplayerMenuOption = Math.max(0, this.multiplayerMenuOption - 1);
        } else if (key === 'ArrowDown' || key === 's') {
            this.multiplayerMenuOption = Math.min(4, this.multiplayerMenuOption + 1);
        } else if (key === 'Enter') {
            switch (this.multiplayerMenuOption) {
                case 0: // Create Duel vs AI
                    this.multiplayerRoom = multiplayer.simulateLocalRoom('duel');
                    multiplayer.addAIOpponent();
                    this.duelStats = multiplayer.createDefaultDuelStats();
                    this.duelSelectedStat = 0;
                    this.state = GameState.DuelSetup;
                    break;
                case 1: // Create Duel vs Player (placeholder)
                    this.notify('Online multiplayer coming soon!');
                    break;
                case 2: // Join Room
                    this.isEnteringRoomCode = true;
                    this.roomCodeInput = '';
                    break;
                case 3: // Co-op
                    this.notify('Co-op dungeon coming soon!');
                    break;
                case 4: // Back
                    this.state = GameState.Map;
                    break;
            }
        }
    }

    handleDuelSetupInput(key: string) {
        if (!this.duelStats) return;

        if (key === 'Escape') {
            this.state = GameState.MultiplayerLobby;
            this.duelStats = null;
        } else if (key === 'ArrowUp' || key === 'w') {
            this.duelSelectedStat = Math.max(0, this.duelSelectedStat - 1);
        } else if (key === 'ArrowDown' || key === 's') {
            this.duelSelectedStat = Math.min(4, this.duelSelectedStat + 1);
        } else if (key === 'ArrowRight' || key === 'd') {
            const stats = ['hp', 'attack', 'defense', 'mana', 'speed'] as const;
            this.duelStats = multiplayer.allocateStat(stats[this.duelSelectedStat], this.duelStats);
        } else if (key === 'ArrowLeft' || key === 'a') {
            const stats = ['hp', 'attack', 'defense', 'mana', 'speed'] as const;
            this.duelStats = multiplayer.deallocateStat(stats[this.duelSelectedStat], this.duelStats);
        } else if (key === 'Enter') {
            if (this.duelStats.pointsRemaining === 0) {
                // Start duel
                const aiStats = this.multiplayerRoom?.players.find(p => p.id.startsWith('AI_'))?.stats;
                if (aiStats) {
                    this.duelState = multiplayer.initDuelState(this.duelStats, aiStats);
                    this.state = GameState.Duel;
                }
            } else {
                this.notify(`Allocate all points first! (${this.duelStats.pointsRemaining} remaining)`);
            }
        }
    }

    handleDuelInput(key: string) {
        if (!this.duelState) return;

        if (this.duelState.phase === DuelPhase.Victory) {
            if (key === 'Escape') {
                this.duelState = null;
                this.multiplayerRoom = null;
                this.state = GameState.Map;
            }
            return;
        }

        if (this.duelState.phase === DuelPhase.Result) {
            // Advance to next turn
            this.duelState.phase = DuelPhase.SelectAction;
            this.duelState.player1Action = null;
            this.duelState.player2Action = null;
            return;
        }

        if (this.duelState.phase === DuelPhase.SelectAction) {
            let playerAction: typeof DuelAction[keyof typeof DuelAction] | null = null;

            if (key === '1') playerAction = DuelAction.Strike;
            else if (key === '2') playerAction = DuelAction.Guard;
            else if (key === '3') playerAction = DuelAction.Feint;
            else if (key === '4') playerAction = DuelAction.HeavyStrike;
            else if (key === 'q' || key === 'Q') playerAction = DuelAction.Heal;
            else if (key === 'w' || key === 'W') playerAction = DuelAction.Fireball;
            else if (key === 'Escape') {
                // Forfeit
                this.duelState = null;
                this.multiplayerRoom = null;
                this.state = GameState.Map;
                return;
            }

            if (playerAction) {
                // Get AI action
                const aiAction = multiplayer.getAIAction(this.duelState);
                // Resolve turn
                this.duelState = multiplayer.resolveDuelTurn(this.duelState, playerAction, aiAction);
            }
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }
}

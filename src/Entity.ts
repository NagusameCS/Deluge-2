
import { ItemType, clamp, TrapType, getRandomInt } from './utils';
import type { Point } from './utils';
import { EquipSlot, MaterialType } from './Equipment';
import type { Equipment } from './Equipment';
import { getEnemySpriteForFloor, getBossSpriteForFloor } from './EnemySprites';
import type { SpriteData } from './Sprite';
import type { MulticlassData } from './SkillTree';
import { SKILL_TREES, calculateSkillBonuses, getUnlockedAbilities, getActivePassives } from './SkillTree';

export interface Stats {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    xp: number;
    level: number;
    skillPoints: number;
    critChance: number; // 0-1
    dodgeChance: number; // 0-1
    // Rune stats
    fireDamage: number;
    iceDamage: number;
    lifesteal: number;
    // Bonus stats from equipment
    thornsDamage: number;
    manaOnHit: number;
    xpBonus: number;
    goldBonus: number;
    poisonChance: number;
    stunChance: number;
}

export interface Buff {
    name: string;
    duration: number; // turns
    apply: (stats: Stats) => void;
    remove: (stats: Stats) => void;
}

export interface Skill {
    id: string;
    name: string;
    cost: number;
    cooldown: number;
    currentCooldown: number;
    description: string;
}

// Inventory system
export interface Inventory {
    equipment: Equipment[];
    materials: Map<MaterialType, number>;
    gold: number;
    maxSize: number;
}

// Equipped items
export interface EquippedGear {
    weapon: Equipment | null;
    armor: Equipment | null;
    helmet: Equipment | null;
    boots: Equipment | null;
    accessory: Equipment | null;
}

export class Entity {
    x: number;
    y: number;
    char: string;
    color: string;
    name: string;
    stats: Stats;
    buffs: Buff[] = [];
    isDead: boolean = false;
    skills: Skill[] = [];

    constructor(x: number, y: number, char: string, color: string, name: string) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.color = color;
        this.name = name;
        this.stats = {
            hp: 100, maxHp: 100,
            mana: 50, maxMana: 50,
            attack: 10, defense: 0,
            xp: 0, level: 1, skillPoints: 0,
            critChance: 0.05, dodgeChance: 0.05,
            fireDamage: 0, iceDamage: 0, lifesteal: 0,
            thornsDamage: 0, manaOnHit: 0, xpBonus: 0, goldBonus: 0,
            poisonChance: 0, stunChance: 0
        };
    }

    move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    takeDamage(amount: number): { damage: number, isCrit: boolean, isDodge: boolean } {
        if (Math.random() < this.stats.dodgeChance) {
            return { damage: 0, isCrit: false, isDodge: true };
        }

        const damage = Math.max(1, amount - this.stats.defense);
        this.stats.hp -= damage;
        if (this.stats.hp <= 0) {
            this.stats.hp = 0;
            this.isDead = true;
        }
        return { damage, isCrit: false, isDodge: false };
    }

    heal(amount: number) {
        this.stats.hp = clamp(this.stats.hp + amount, 0, this.stats.maxHp);
    }

    restoreMana(amount: number) {
        this.stats.mana = clamp(this.stats.mana + amount, 0, this.stats.maxMana);
    }

    addBuff(buff: Buff) {
        this.buffs.push(buff);
        buff.apply(this.stats);
    }

    updateBuffs() {
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            this.buffs[i].duration--;
            if (this.buffs[i].duration <= 0) {
                this.buffs[i].remove(this.stats);
                this.buffs.splice(i, 1);
            }
        }

        // Cooldowns
        this.skills.forEach(s => {
            if (s.currentCooldown > 0) s.currentCooldown--;
        });
    }
}

export class Player extends Entity {
    inventory: Inventory;
    equipped: EquippedGear;
    baseStats: Stats;

    // Skill tree and multiclass system
    multiclass: MulticlassData;
    unlockedAbilities: string[] = [];
    activePassives: string[] = [];
    classId: string = 'default_player';
    sprite: SpriteData | null = null;

    // Used to track second wind for adventurer
    secondWindUsed: boolean = false;

    constructor(x: number, y: number) {
        super(x, y, '@', '#4af', 'Player');
        this.stats.hp = 50;
        this.stats.maxHp = 50;
        this.stats.mana = 30;
        this.stats.maxMana = 30;
        this.stats.attack = 5;
        this.stats.defense = 1;

        // Store base stats before equipment
        this.baseStats = { ...this.stats };

        // Initialize multiclass data
        this.multiclass = {
            primaryClass: 'default_player',
            secondaryClass: null,
            primarySkills: new Map(),
            secondarySkills: new Map(),
            multiclassLevel: 0
        };

        this.inventory = {
            equipment: [],
            materials: new Map(),
            gold: 0,
            maxSize: 20
        };

        this.equipped = {
            weapon: null,
            armor: null,
            helmet: null,
            boots: null,
            accessory: null
        };

        this.skills.push({
            id: 'heal',
            name: 'Heal',
            cost: 10,
            cooldown: 10,
            currentCooldown: 0,
            description: 'Heal 20 HP'
        });

        this.skills.push({
            id: 'fireball',
            name: 'Fireball',
            cost: 15,
            cooldown: 5,
            currentCooldown: 0,
            description: 'Deal 15 DMG (Range 5)'
        });
    }

    // Set player class and update multiclass data
    setClass(classId: string, sprite?: SpriteData) {
        this.classId = classId;
        this.multiclass.primaryClass = classId;
        if (sprite) {
            this.sprite = sprite;
            this.char = sprite.char;
            this.color = sprite.color;
        }
    }

    // Learn a skill from the skill tree
    learnSkill(skillId: string, isSecondary: boolean = false): boolean {
        if (this.stats.skillPoints <= 0) return false;

        const treeId = isSecondary ? this.multiclass.secondaryClass : this.multiclass.primaryClass;
        if (!treeId) return false;

        const tree = SKILL_TREES.get(treeId);
        if (!tree) return false;

        const node = tree.nodes.find(n => n.id === skillId);
        if (!node) return false;

        const skillMap = isSecondary ? this.multiclass.secondarySkills : this.multiclass.primarySkills;
        const currentRanks = skillMap.get(skillId) || 0;

        if (currentRanks >= node.maxRanks) return false;
        if (this.stats.skillPoints < node.cost) return false;

        // Check prerequisites
        for (const reqId of node.requires) {
            const reqRanks = skillMap.get(reqId) || 0;
            if (reqRanks === 0) return false;
        }

        skillMap.set(skillId, currentRanks + 1);
        this.stats.skillPoints -= node.cost;

        // Update unlocked abilities and passives
        this.updateSkillTreeBonuses();
        return true;
    }

    // Multiclass into a secondary class
    multiclassInto(secondaryClassId: string): boolean {
        if (this.stats.level < 25) return false;
        if (this.multiclass.secondaryClass !== null) return false;
        if (secondaryClassId === this.multiclass.primaryClass) return false;

        this.multiclass.secondaryClass = secondaryClassId;
        this.multiclass.multiclassLevel = this.stats.level;
        return true;
    }

    // Update bonuses from skill tree
    updateSkillTreeBonuses() {
        this.unlockedAbilities = getUnlockedAbilities(this.multiclass);
        this.activePassives = getActivePassives(this.multiclass);

        // Apply skill bonuses during recalculateStats
        this.recalculateStats();
    }

    getXpForNextLevel(): number {
        return this.stats.level * 100;
    }

    levelUp() {
        this.stats.level++;
        this.stats.skillPoints++;
        this.baseStats.maxHp += 10;
        this.baseStats.maxMana += 5;
        this.baseStats.attack += 1;
        this.recalculateStats();
        this.stats.hp = this.stats.maxHp;
        this.stats.mana = this.stats.maxMana;
    }

    equipItem(equipment: Equipment): Equipment | null {
        const slotKey = equipment.slot as keyof EquippedGear;
        const oldItem = this.equipped[slotKey];

        // Remove from inventory
        const idx = this.inventory.equipment.indexOf(equipment);
        if (idx !== -1) {
            this.inventory.equipment.splice(idx, 1);
        }

        // Unequip old item if present
        if (oldItem) {
            this.inventory.equipment.push(oldItem);
        }

        // Equip new item
        this.equipped[slotKey] = equipment;
        this.recalculateStats();

        return oldItem;
    }

    unequipItem(slot: EquipSlot): boolean {
        const slotKey = slot as keyof EquippedGear;
        const item = this.equipped[slotKey];

        if (!item) return false;
        if (this.inventory.equipment.length >= this.inventory.maxSize) return false;

        this.inventory.equipment.push(item);
        this.equipped[slotKey] = null;
        this.recalculateStats();
        return true;
    }

    recalculateStats() {
        // Reset to base stats
        this.stats.attack = this.baseStats.attack;
        this.stats.defense = this.baseStats.defense;
        this.stats.maxHp = this.baseStats.maxHp;
        this.stats.maxMana = this.baseStats.maxMana;
        this.stats.critChance = 0.05;
        this.stats.dodgeChance = 0.05;
        this.stats.lifesteal = 0;
        this.stats.fireDamage = 0;
        this.stats.iceDamage = 0;
        this.stats.thornsDamage = 0;
        this.stats.manaOnHit = 0;
        this.stats.xpBonus = 0;
        this.stats.goldBonus = 0;
        this.stats.poisonChance = 0;
        this.stats.stunChance = 0;

        // Apply equipment bonuses
        const equipped = [
            this.equipped.weapon,
            this.equipped.armor,
            this.equipped.helmet,
            this.equipped.boots,
            this.equipped.accessory
        ];

        for (const item of equipped) {
            if (!item) continue;

            this.stats.attack += item.baseAttack;
            this.stats.defense += item.baseDefense;

            // Apply rune effects
            for (const rune of item.runes) {
                if (rune.attackBonus) this.stats.attack += rune.attackBonus;
                if (rune.defenseBonus) this.stats.defense += rune.defenseBonus;
                if (rune.hpBonus) this.stats.maxHp += rune.hpBonus;
                if (rune.manaBonus) this.stats.maxMana += rune.manaBonus;
                if (rune.critBonus) this.stats.critChance += rune.critBonus;
                if (rune.dodgeBonus) this.stats.dodgeChance += rune.dodgeBonus;
                if (rune.lifestealBonus) this.stats.lifesteal += rune.lifestealBonus;
                if (rune.fireDamage) this.stats.fireDamage += rune.fireDamage;
                if (rune.iceDamage) this.stats.iceDamage += rune.iceDamage;
                if (rune.thornsDamage) this.stats.thornsDamage += rune.thornsDamage;
                if (rune.manaOnHit) this.stats.manaOnHit += rune.manaOnHit;
                if (rune.xpBonus) this.stats.xpBonus += rune.xpBonus;
                if (rune.goldBonus) this.stats.goldBonus += rune.goldBonus;
                if (rune.poisonChance) this.stats.poisonChance += rune.poisonChance;
                if (rune.stunChance) this.stats.stunChance += rune.stunChance;
            }
        }

        // Apply skill tree bonuses
        const skillBonuses = calculateSkillBonuses(this.multiclass);
        for (const [stat, value] of skillBonuses) {
            switch (stat) {
                case 'maxHp': this.stats.maxHp += value; break;
                case 'maxMana': this.stats.maxMana += value; break;
                case 'attack': this.stats.attack += value; break;
                case 'defense': this.stats.defense += value; break;
                case 'critChance': this.stats.critChance += value; break;
                case 'dodgeChance': this.stats.dodgeChance += value; break;
                case 'spellPower': this.stats.fireDamage += value; break;
                case 'critDamage': /* Store separately if needed */ break;
                case 'xpBonus': this.stats.xpBonus += value; break;
                // Ultimate class bonuses
                case 'warlord':
                    this.stats.attack = Math.floor(this.stats.attack * 1.2);
                    this.stats.maxHp += 50;
                    break;
                case 'archmage':
                    this.stats.fireDamage = Math.floor(this.stats.fireDamage * 1.5);
                    this.stats.iceDamage = Math.floor(this.stats.iceDamage * 1.5);
                    this.stats.maxMana += 30;
                    break;
                case 'shadowlord':
                    this.stats.critChance += 0.30;
                    this.stats.dodgeChance += 0.30;
                    break;
                case 'hero':
                    this.stats.attack = Math.floor(this.stats.attack * 1.2);
                    this.stats.defense = Math.floor(this.stats.defense * 1.2);
                    this.stats.maxHp = Math.floor(this.stats.maxHp * 1.2);
                    this.stats.maxMana = Math.floor(this.stats.maxMana * 1.2);
                    break;
                case 'all_stats':
                    this.stats.attack = Math.floor(this.stats.attack * (1 + value));
                    this.stats.defense = Math.floor(this.stats.defense * (1 + value));
                    this.stats.maxHp = Math.floor(this.stats.maxHp * (1 + value));
                    this.stats.maxMana = Math.floor(this.stats.maxMana * (1 + value));
                    break;
            }
        }

        // Clamp HP if it exceeds new max
        if (this.stats.hp > this.stats.maxHp) {
            this.stats.hp = this.stats.maxHp;
        }
        if (this.stats.mana > this.stats.maxMana) {
            this.stats.mana = this.stats.maxMana;
        }
    }

    addMaterial(type: MaterialType, count: number = 1) {
        const current = this.inventory.materials.get(type) || 0;
        this.inventory.materials.set(type, current + count);
    }

    getMaterialCount(type: MaterialType): number {
        return this.inventory.materials.get(type) || 0;
    }

    addGold(amount: number) {
        const bonus = Math.floor(amount * this.stats.goldBonus);
        this.inventory.gold += amount + bonus;
    }
}

// Enemy types with different behaviors and appearances
export const EnemyType = {
    Rat: 'rat',
    Goblin: 'goblin',
    Orc: 'orc',
    Skeleton: 'skeleton',
    Ghost: 'ghost',
    Spider: 'spider',
    Slime: 'slime',
    Bat: 'bat',
    Troll: 'troll',
    Demon: 'demon',
    Dragon: 'dragon',
    Lich: 'lich',
    Wraith: 'wraith'
} as const;

export type EnemyType = typeof EnemyType[keyof typeof EnemyType];

interface EnemyTemplate {
    type: EnemyType;
    name: string;
    char: string;
    color: string;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseXp: number;
    minFloor: number;
    isBoss: boolean;
    pattern: 'aggressive' | 'defensive' | 'tricky' | 'balanced';
}

// Fallback templates (used when sprite system fails)
const ENEMY_TEMPLATES: EnemyTemplate[] = [
    { type: EnemyType.Rat, name: 'Rat', char: 'r', color: '#864', baseHp: 8, baseAttack: 2, baseDefense: 0, baseXp: 5, minFloor: 1, isBoss: false, pattern: 'aggressive' },
    { type: EnemyType.Bat, name: 'Bat', char: 'b', color: '#666', baseHp: 6, baseAttack: 3, baseDefense: 0, baseXp: 6, minFloor: 1, isBoss: false, pattern: 'tricky' },
    { type: EnemyType.Slime, name: 'Slime', char: 's', color: '#0a0', baseHp: 15, baseAttack: 2, baseDefense: 1, baseXp: 8, minFloor: 1, isBoss: false, pattern: 'defensive' },
    { type: EnemyType.Goblin, name: 'Goblin', char: 'g', color: '#0a0', baseHp: 12, baseAttack: 4, baseDefense: 1, baseXp: 12, minFloor: 1, isBoss: false, pattern: 'tricky' },
    { type: EnemyType.Spider, name: 'Spider', char: 'S', color: '#444', baseHp: 10, baseAttack: 5, baseDefense: 0, baseXp: 10, minFloor: 2, isBoss: false, pattern: 'aggressive' },
    { type: EnemyType.Skeleton, name: 'Skeleton', char: 'k', color: '#eee', baseHp: 15, baseAttack: 5, baseDefense: 2, baseXp: 15, minFloor: 2, isBoss: false, pattern: 'balanced' },
    { type: EnemyType.Orc, name: 'Orc', char: 'o', color: '#080', baseHp: 25, baseAttack: 6, baseDefense: 2, baseXp: 20, minFloor: 3, isBoss: false, pattern: 'aggressive' },
    { type: EnemyType.Ghost, name: 'Ghost', char: 'G', color: '#aaf', baseHp: 12, baseAttack: 7, baseDefense: 0, baseXp: 18, minFloor: 3, isBoss: false, pattern: 'tricky' },
    { type: EnemyType.Troll, name: 'Troll', char: 'T', color: '#484', baseHp: 40, baseAttack: 8, baseDefense: 4, baseXp: 35, minFloor: 4, isBoss: false, pattern: 'defensive' },
    { type: EnemyType.Demon, name: 'Demon', char: 'D', color: '#f00', baseHp: 35, baseAttack: 10, baseDefense: 3, baseXp: 50, minFloor: 5, isBoss: false, pattern: 'aggressive' },
    { type: EnemyType.Dragon, name: 'Dragon', char: 'W', color: '#f80', baseHp: 80, baseAttack: 15, baseDefense: 8, baseXp: 200, minFloor: 6, isBoss: true, pattern: 'balanced' },
    { type: EnemyType.Lich, name: 'Lich', char: 'L', color: '#a0f', baseHp: 60, baseAttack: 12, baseDefense: 5, baseXp: 150, minFloor: 7, isBoss: true, pattern: 'tricky' },
];

export class Enemy extends Entity {
    goal: Point | null = null;
    path: Point[] = [];
    moveTimer: number = 0;
    enemyType: EnemyType;
    pattern: 'aggressive' | 'defensive' | 'tricky' | 'balanced' | 'fleeing';
    isBoss: boolean;
    isGolden: boolean = false;
    aggroRange: number = 8;
    sprite: SpriteData | null = null;

    constructor(x: number, y: number, difficulty: number, forceBoss: boolean = false) {
        // Try to use new sprite system first
        const bossChance = difficulty >= 5 ? 0.05 : 0;
        const isBoss = forceBoss || Math.random() < bossChance;

        // Get sprite from new system
        const sprite = isBoss
            ? getBossSpriteForFloor(difficulty)
            : getEnemySpriteForFloor(difficulty, false);

        if (sprite) {
            // Use sprite data
            super(x, y, sprite.char, sprite.color, sprite.name);

            this.sprite = sprite;
            this.enemyType = sprite.id as EnemyType;
            this.pattern = sprite.behavior?.pattern || 'aggressive';
            this.isBoss = sprite.isBoss || false;
            this.aggroRange = sprite.behavior?.aggroRange || 8;

            // Use sprite stats scaled with difficulty
            const minFloor = sprite.minFloor || 1;
            const scaleMult = 1 + (difficulty - minFloor) * 0.15;
            this.stats.hp = Math.floor(sprite.stats.baseHp * scaleMult);
            this.stats.maxHp = this.stats.hp;
            this.stats.attack = Math.floor(sprite.stats.baseAttack * scaleMult);
            this.stats.defense = Math.floor(sprite.stats.baseDefense * scaleMult);
            this.stats.critChance = sprite.stats.critChance / 100;
            this.stats.dodgeChance = sprite.stats.dodgeChance / 100;

            // Calculate XP based on stats
            const baseXp = Math.floor((sprite.stats.baseHp + sprite.stats.baseAttack * 5) * 0.5);
            this.stats.xp = Math.floor(baseXp * scaleMult);
            this.stats.level = difficulty;

            // Boss bonuses
            if (this.isBoss) {
                this.stats.hp = Math.floor(this.stats.hp * 1.5);
                this.stats.maxHp = this.stats.hp;
                this.stats.attack = Math.floor(this.stats.attack * 1.3);
                this.stats.xp *= 3;
            }
        } else {
            // Fallback to old system
            const availableTypes = ENEMY_TEMPLATES.filter(t => t.minFloor <= difficulty && !t.isBoss);

            let template: EnemyTemplate;
            if (isBoss) {
                const bossTypes = ENEMY_TEMPLATES.filter(t => t.isBoss && t.minFloor <= difficulty);
                template = bossTypes.length > 0
                    ? bossTypes[getRandomInt(0, bossTypes.length)]
                    : availableTypes[getRandomInt(0, availableTypes.length)];
            } else {
                template = availableTypes.length > 0
                    ? availableTypes[getRandomInt(0, availableTypes.length)]
                    : ENEMY_TEMPLATES[0];
            }

            super(x, y, template.char, template.color, template.name);

            this.enemyType = template.type;
            this.pattern = template.pattern;
            this.isBoss = template.isBoss;

            // Scale stats with difficulty
            const scaleMult = 1 + (difficulty - template.minFloor) * 0.15;
            this.stats.hp = Math.floor(template.baseHp * scaleMult);
            this.stats.maxHp = this.stats.hp;
            this.stats.attack = Math.floor(template.baseAttack * scaleMult);
            this.stats.defense = Math.floor(template.baseDefense * scaleMult);
            this.stats.xp = Math.floor(template.baseXp * scaleMult);
            this.stats.level = difficulty;

            // Boss bonuses
            if (this.isBoss) {
                this.stats.hp *= 2;
                this.stats.maxHp = this.stats.hp;
                this.stats.attack = Math.floor(this.stats.attack * 1.5);
                this.stats.xp *= 3;
                this.name = 'Boss ' + this.name;
            }
        }
    }

    // Make this enemy a golden variant (5x rewards, flees from player)
    makeGolden() {
        this.isGolden = true;
        this.pattern = 'fleeing';
        this.name = 'Golden ' + this.name;
        this.color = '#fd0'; // Golden color
        this.stats.xp *= 5;
        // Golden mobs are slightly tankier but don't attack much
        this.stats.hp = Math.floor(this.stats.hp * 1.5);
        this.stats.maxHp = this.stats.hp;
        this.stats.attack = Math.floor(this.stats.attack * 0.5);
    }
}

export class DungeonCore extends Entity {
    puzzleSolved: boolean = false;
    puzzleType: 'sequence' | 'match' | 'memory';
    puzzleData: any;

    // Multi-puzzle system with lamps
    puzzlesCompleted: number = 0;
    puzzlesRequired: number = 4;
    currentPuzzleTypes: ('sequence' | 'match' | 'memory')[] = [];
    lampStates: boolean[] = [false, false, false, false];

    constructor(x: number, y: number, floor: number) {
        super(x, y, 'C', '#0ff', 'Dungeon Core');
        this.stats.hp = 50 + floor * 20;
        this.stats.maxHp = this.stats.hp;
        this.stats.defense = 5 + floor;
        this.stats.xp = 500 + floor * 100;
        this.stats.level = 99;

        // Generate 4 random puzzle types
        const types: ('sequence' | 'match' | 'memory')[] = ['sequence', 'match', 'memory'];
        for (let i = 0; i < this.puzzlesRequired; i++) {
            this.currentPuzzleTypes.push(types[getRandomInt(0, types.length)]);
        }

        // Start with first puzzle
        this.puzzleType = this.currentPuzzleTypes[0];
        this.initPuzzle();
    }

    initPuzzle() {
        if (this.puzzleType === 'sequence') {
            // Player must input correct sequence (like Simon)
            const length = 4 + Math.floor(this.puzzlesCompleted); // Gets harder
            const sequence: number[] = [];
            for (let i = 0; i < length; i++) {
                sequence.push(getRandomInt(1, 5)); // 1-4 keys
            }
            this.puzzleData = {
                sequence,
                currentIndex: 0,
                showingSequence: true,
                showIndex: 0,
                showTimer: 0
            };
        } else if (this.puzzleType === 'match') {
            // Match pairs of symbols
            const symbols = ['A', 'B', 'C', 'D', 'E', 'F'];
            const pairs: string[] = [];
            for (let i = 0; i < 4; i++) {
                pairs.push(symbols[i], symbols[i]);
            }
            // Shuffle
            for (let i = pairs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
            }
            this.puzzleData = {
                cards: pairs.map(s => ({ symbol: s, revealed: false, matched: false })),
                firstSelection: -1,
                matchesNeeded: 4,
                matchesMade: 0
            };
        } else {
            // Memory: remember and reproduce pattern
            const gridSize = 3;
            const pattern: boolean[][] = [];
            // Ensure at least 2 and at most 5 cells are lit
            let litCount = 0;
            for (let y = 0; y < gridSize; y++) {
                pattern.push([]);
                for (let x = 0; x < gridSize; x++) {
                    const lit = Math.random() < 0.35;
                    pattern[y].push(lit);
                    if (lit) litCount++;
                }
            }
            // Ensure minimum cells lit
            while (litCount < 2) {
                const y = getRandomInt(0, gridSize);
                const x = getRandomInt(0, gridSize);
                if (!pattern[y][x]) {
                    pattern[y][x] = true;
                    litCount++;
                }
            }
            this.puzzleData = {
                pattern,
                playerPattern: Array(gridSize).fill(null).map(() => Array(gridSize).fill(false)),
                gridSize,
                showingPattern: true,
                showTimer: 90 + this.puzzlesCompleted * 10 // More time for later puzzles
            };
        }
    }

    // Called when a puzzle is completed
    completePuzzle(): boolean {
        this.puzzlesCompleted++;
        this.lampStates[this.puzzlesCompleted - 1] = true;

        if (this.puzzlesCompleted >= this.puzzlesRequired) {
            this.puzzleSolved = true;
            return true; // All puzzles done
        }

        // Load next puzzle
        this.puzzleType = this.currentPuzzleTypes[this.puzzlesCompleted];
        this.initPuzzle();
        return false; // More puzzles to go
    }

    // Reset current puzzle (on failure)
    resetCurrentPuzzle() {
        this.initPuzzle();
    }
}

export class Item {
    x: number;
    y: number;
    name: string;
    color: string;
    type: ItemType;
    value: number;
    materialType?: MaterialType;

    constructor(x: number, y: number, name: string, color: string, type: ItemType, value: number, materialType?: MaterialType) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.color = color;
        this.type = type;
        this.value = value;
        this.materialType = materialType;
    }
}

export class Trap {
    x: number;
    y: number;
    name: string;
    triggered: boolean = false;
    damage: number;
    trapType: TrapType;
    visible: boolean = false; // Hidden until triggered or detected

    constructor(x: number, y: number, trapType: TrapType, floor: number) {
        this.x = x;
        this.y = y;
        this.trapType = trapType;

        switch (trapType) {
            case 'spike':
                this.name = 'Spike Trap';
                this.damage = 10 + floor * 3;
                break;
            case 'fire':
                this.name = 'Fire Trap';
                this.damage = 15 + floor * 4;
                break;
            case 'poison':
                this.name = 'Poison Trap';
                this.damage = 5 + floor * 2; // Also applies poison
                break;
            case 'teleport':
                this.name = 'Teleport Trap';
                this.damage = 0;
                break;
            case 'alarm':
                this.name = 'Alarm Trap';
                this.damage = 0; // Alerts nearby enemies
                break;
            default:
                this.name = 'Trap';
                this.damage = 10;
        }
    }
}

// Puzzle room pressure plate
export class PressurePlate {
    x: number;
    y: number;
    activated: boolean = false;
    linkedPlates: PressurePlate[] = [];
    requiredOrder: number = 0; // For sequence puzzles

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

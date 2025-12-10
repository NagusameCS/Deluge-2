
import { ItemType, clamp } from './utils';
import type { Point } from './utils';

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
}

export interface Rune {
    name: string;
    description: string;
    apply: (stats: Stats) => void;
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
            fireDamage: 0, iceDamage: 0, lifesteal: 0
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
    constructor(x: number, y: number) {
        super(x, y, '@', '#00f', 'Player');
        this.stats.hp = 50;
        this.stats.maxHp = 50;
        this.stats.mana = 30;
        this.stats.maxMana = 30;
        this.stats.attack = 5;
        this.stats.defense = 1;

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

    levelUp() {
        this.stats.level++;
        this.stats.skillPoints++;
        this.stats.maxHp += 10;
        this.stats.maxMana += 5;
        this.stats.hp = this.stats.maxHp;
        this.stats.mana = this.stats.maxMana;
        this.stats.attack += 1;
    }
}

export class Enemy extends Entity {
    goal: Point | null = null;
    path: Point[] = [];
    moveTimer: number = 0;

    constructor(x: number, y: number, difficulty: number) {
        const isBoss = Math.random() < 0.05;
        super(x, y, isBoss ? 'B' : 'E', isBoss ? '#800080' : '#f00', isBoss ? 'Boss Orc' : 'Orc');

        this.stats.hp = 10 + (difficulty * 5) + (isBoss ? 50 : 0);
        this.stats.maxHp = this.stats.hp;
        this.stats.attack = 3 + difficulty + (isBoss ? 5 : 0);
        this.stats.defense = Math.floor(difficulty / 2);
        this.stats.xp = 10 + (difficulty * 5) + (isBoss ? 100 : 0);
        this.stats.level = difficulty;
    }
}

export class DungeonCore extends Entity {
    constructor(x: number, y: number) {
        super(x, y, 'C', '#0ff', 'Dungeon Core');
        this.stats.defense = 5;
        this.stats.xp = 500;
        this.stats.level = 99;
    }
}

export class Item {
    x: number;
    y: number;
    name: string;
    color: string;
    type: ItemType;
    value: number;
    runes: Rune[] = [];

    constructor(x: number, y: number, name: string, color: string, type: ItemType, value: number) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.color = color;
        this.type = type;
        this.value = value;
    }
}

export class Trap {
    x: number;
    y: number;
    name: string;
    triggered: boolean = false;
    damage: number;

    constructor(x: number, y: number, name: string, damage: number) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.damage = damage;
    }
}

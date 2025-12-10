
import { ItemType, clamp } from './utils';

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
    color: string;
    symbol: string;
    name: string;
    stats: Stats;
    isDead: boolean = false;
    buffs: Buff[] = [];
    skills: Skill[] = [];

    constructor(x: number, y: number, color: string, symbol: string, name: string, stats: Stats) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.symbol = symbol;
        this.name = name;
        this.stats = stats;
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
        super(x, y, '#00f', '@', 'Player', {
            hp: 50,
            maxHp: 50,
            mana: 30,
            maxMana: 30,
            attack: 5,
            defense: 1,
            xp: 0,
            level: 1,
            skillPoints: 0,
            critChance: 0.05,
            dodgeChance: 0.05
        });
        
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
    constructor(x: number, y: number, difficulty: number) {
        const isBoss = Math.random() < 0.05;
        super(x, y, isBoss ? '#800080' : '#f00', isBoss ? 'B' : 'E', isBoss ? 'Boss Orc' : 'Orc', {
            hp: 10 + (difficulty * 5) + (isBoss ? 50 : 0),
            maxHp: 10 + (difficulty * 5) + (isBoss ? 50 : 0),
            mana: 0,
            maxMana: 0,
            attack: 3 + difficulty + (isBoss ? 5 : 0),
            defense: Math.floor(difficulty / 2),
            xp: 10 + (difficulty * 5) + (isBoss ? 100 : 0),
            level: difficulty,
            skillPoints: 0,
            critChance: 0.05,
            dodgeChance: 0.05
        });
    }
}

export class DungeonCore extends Entity {
    constructor(x: number, y: number) {
        super(x, y, '#0ff', 'C', 'Dungeon Core', {
            hp: 100,
            maxHp: 100,
            mana: 0,
            maxMana: 0,
            attack: 0,
            defense: 5,
            xp: 500,
            level: 99,
            skillPoints: 0,
            critChance: 0,
            dodgeChance: 0
        });
    }
}

export class Item {
    x: number;
    y: number;
    name: string;
    color: string;
    type: ItemType;
    value: number;

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

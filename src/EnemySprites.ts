// ============================================
// ENEMY SPRITES - Enhanced pixel art enemies
// ============================================

import type { SpriteData } from './Sprite';

// ============================================
// TIER 1 ENEMIES (Floors 1-2)
// ============================================

export const RAT_SPRITE: SpriteData = {
    id: 'rat',
    name: 'Giant Rat',
    type: 'enemy',
    metadata: { description: 'A disease-ridden vermin', version: '1.0' },
    pixels: [
        ['', '', '', '#555', '#555', '', '', ''],
        ['', '', '#555', '#777', '#777', '#555', '', ''],
        ['', '#555', '#888', '#888', '#888', '#888', '#555', ''],
        ['#f88', '#888', '#000', '#888', '#888', '#000', '#888', ''],
        ['', '#888', '#888', '#888', '#888', '#888', '#888', ''],
        ['', '', '#888', '#888', '#888', '#888', '', ''],
        ['', '', '#555', '', '', '#555', '#f8a', ''],
        ['', '', '', '', '', '', '#f8a', ''],
    ],
    color: '#888',
    char: 'r',
    stats: { baseHp: 15, baseMana: 0, baseAttack: 3, baseDefense: 0, critChance: 5, dodgeChance: 15, speed: 7 },
    moveset: [
        { id: 'bite', name: 'Bite', description: 'Quick bite', staminaCost: 10, manaCost: 0, baseDamage: 0.8, speed: 7, key: '1' },
        { id: 'scratch', name: 'Scratch', description: 'Claw attack', staminaCost: 15, manaCost: 0, baseDamage: 1.0, speed: 6, key: '2' },
    ],
    behavior: { pattern: 'aggressive', aggroRange: 5 },
    minFloor: 1
};

export const GOBLIN_SPRITE: SpriteData = {
    id: 'goblin',
    name: 'Goblin',
    type: 'enemy',
    metadata: { description: 'A sneaky green menace', version: '1.0' },
    pixels: [
        ['', '', '#3a3', '#3a3', '#3a3', '#3a3', '', ''],
        ['', '#3a3', '#5c5', '#5c5', '#5c5', '#5c5', '#3a3', ''],
        ['#3a3', '#5c5', '#ff0', '#5c5', '#5c5', '#ff0', '#5c5', '#3a3'],
        ['', '#5c5', '#5c5', '#f00', '#f00', '#5c5', '#5c5', ''],
        ['', '', '#840', '#840', '#840', '#840', '', ''],
        ['', '#840', '#840', '#740', '#740', '#840', '#840', ''],
        ['', '', '#740', '', '', '#740', '', ''],
        ['', '', '#530', '', '', '#530', '', ''],
    ],
    color: '#5c5',
    char: 'g',
    stats: { baseHp: 20, baseMana: 5, baseAttack: 4, baseDefense: 1, critChance: 8, dodgeChance: 10, speed: 5 },
    moveset: [
        { id: 'stab', name: 'Stab', description: 'Dagger thrust', staminaCost: 12, manaCost: 0, baseDamage: 1.0, speed: 6, key: '1' },
        { id: 'throw', name: 'Throw Rock', description: 'Ranged attack', staminaCost: 15, manaCost: 0, baseDamage: 0.7, speed: 5, key: '2' },
        { id: 'flee', name: 'Flee', description: 'Run away', staminaCost: 20, manaCost: 0, baseDamage: 0, speed: 10, key: '3' },
    ],
    behavior: { pattern: 'tricky', aggroRange: 6, fleeThreshold: 0.2 },
    minFloor: 1
};

export const BAT_SPRITE: SpriteData = {
    id: 'bat',
    name: 'Cave Bat',
    type: 'enemy',
    metadata: { description: 'A screeching flying nuisance', version: '1.0' },
    pixels: [
        ['', '', '', '#333', '#333', '', '', ''],
        ['', '', '#444', '#555', '#555', '#444', '', ''],
        ['#333', '#444', '#666', '#f00', '#f00', '#666', '#444', '#333'],
        ['#333', '#555', '#666', '#555', '#555', '#666', '#555', '#333'],
        ['', '#444', '#555', '#555', '#555', '#555', '#444', ''],
        ['', '', '#333', '#444', '#444', '#333', '', ''],
        ['', '', '', '#333', '#333', '', '', ''],
        ['', '', '', '', '', '', '', ''],
    ],
    color: '#555',
    char: 'b',
    stats: { baseHp: 12, baseMana: 0, baseAttack: 3, baseDefense: 0, critChance: 5, dodgeChance: 25, speed: 8 },
    moveset: [
        { id: 'swoop', name: 'Swoop', description: 'Diving attack', staminaCost: 10, manaCost: 0, baseDamage: 0.7, speed: 9, key: '1' },
        { id: 'screech', name: 'Screech', description: 'Disorienting cry', staminaCost: 15, manaCost: 0, baseDamage: 0.3, speed: 8, key: '2', special: 'stun' },
    ],
    behavior: { pattern: 'aggressive', aggroRange: 7 },
    minFloor: 1
};

// ============================================
// TIER 2 ENEMIES (Floors 2-4)
// ============================================

export const SKELETON_SPRITE: SpriteData = {
    id: 'skeleton',
    name: 'Skeleton',
    type: 'enemy',
    metadata: { description: 'Animated bones of the fallen', version: '1.0' },
    pixels: [
        ['', '', '#eee', '#eee', '#eee', '#eee', '', ''],
        ['', '#eee', '#000', '#ddd', '#ddd', '#000', '#eee', ''],
        ['', '', '#ddd', '#ddd', '#ddd', '#ddd', '', ''],
        ['', '#ddd', '#ddd', '#ccc', '#ccc', '#ddd', '#ddd', ''],
        ['', '', '#ccc', '#bbb', '#bbb', '#ccc', '', ''],
        ['', '', '#bbb', '', '', '#bbb', '', ''],
        ['', '', '#aaa', '', '', '#aaa', '', ''],
        ['', '', '#999', '', '', '#999', '', ''],
    ],
    color: '#ddd',
    char: 's',
    stats: { baseHp: 25, baseMana: 0, baseAttack: 5, baseDefense: 2, critChance: 5, dodgeChance: 5, speed: 4 },
    moveset: [
        { id: 'slash', name: 'Sword Slash', description: 'Rusty blade', staminaCost: 12, manaCost: 0, baseDamage: 1.1, speed: 5, key: '1' },
        { id: 'block', name: 'Shield Block', description: 'Old shield', staminaCost: 10, manaCost: 0, baseDamage: 0, speed: 3, key: '2' },
        { id: 'rattle', name: 'Bone Rattle', description: 'Intimidate', staminaCost: 15, manaCost: 0, baseDamage: 0.5, speed: 4, key: '3', special: 'slow' },
    ],
    behavior: { pattern: 'defensive', aggroRange: 5 },
    minFloor: 2
};

export const SPIDER_SPRITE: SpriteData = {
    id: 'spider',
    name: 'Giant Spider',
    type: 'enemy',
    metadata: { description: 'A venomous eight-legged horror', version: '1.0' },
    pixels: [
        ['', '#333', '', '', '', '', '#333', ''],
        ['#333', '', '#444', '#555', '#555', '#444', '', '#333'],
        ['', '#444', '#f00', '#666', '#666', '#f00', '#444', ''],
        ['#333', '#555', '#666', '#777', '#777', '#666', '#555', '#333'],
        ['', '#444', '#666', '#777', '#777', '#666', '#444', ''],
        ['#333', '', '#555', '#666', '#666', '#555', '', '#333'],
        ['', '#333', '', '#444', '#444', '', '#333', ''],
        ['#333', '', '', '', '', '', '', '#333'],
    ],
    color: '#555',
    char: 'S',
    stats: { baseHp: 22, baseMana: 10, baseAttack: 4, baseDefense: 1, critChance: 10, dodgeChance: 12, speed: 6 },
    moveset: [
        { id: 'fang', name: 'Venomous Fang', description: 'Poison bite', staminaCost: 15, manaCost: 0, baseDamage: 0.9, speed: 6, key: '1', special: 'poison' },
        { id: 'web', name: 'Web Shot', description: 'Slow enemy', staminaCost: 20, manaCost: 5, baseDamage: 0.3, speed: 7, key: '2', special: 'slow' },
        { id: 'pounce', name: 'Pounce', description: 'Leaping attack', staminaCost: 25, manaCost: 0, baseDamage: 1.5, speed: 8, key: '3' },
    ],
    behavior: { pattern: 'tricky', aggroRange: 6 },
    minFloor: 2
};

export const ORC_SPRITE: SpriteData = {
    id: 'orc',
    name: 'Orc Warrior',
    type: 'enemy',
    metadata: { description: 'A brutal green-skinned brute', version: '1.0' },
    pixels: [
        ['', '', '#2a2', '#2a2', '#2a2', '#2a2', '', ''],
        ['', '#2a2', '#4c4', '#4c4', '#4c4', '#4c4', '#2a2', ''],
        ['#2a2', '#4c4', '#ff0', '#4c4', '#4c4', '#ff0', '#4c4', '#2a2'],
        ['', '#4c4', '#4c4', '#fff', '#fff', '#4c4', '#4c4', ''],
        ['', '#600', '#800', '#800', '#800', '#800', '#600', ''],
        ['#888', '#800', '#800', '#600', '#600', '#800', '#800', '#888'],
        ['', '#600', '#600', '', '', '#600', '#600', ''],
        ['', '', '#400', '', '', '#400', '', ''],
    ],
    color: '#4c4',
    char: 'O',
    stats: { baseHp: 40, baseMana: 5, baseAttack: 8, baseDefense: 3, critChance: 10, dodgeChance: 3, speed: 3 },
    moveset: [
        { id: 'smash', name: 'Club Smash', description: 'Heavy blow', staminaCost: 15, manaCost: 0, baseDamage: 1.4, speed: 3, key: '1' },
        { id: 'roar', name: 'War Cry', description: 'Boost attack', staminaCost: 20, manaCost: 0, baseDamage: 0, speed: 2, key: '2', special: 'buff_attack' },
        { id: 'charge', name: 'Charge', description: 'Rush attack', staminaCost: 25, manaCost: 0, baseDamage: 1.8, speed: 6, key: '3' },
    ],
    behavior: { pattern: 'aggressive', aggroRange: 5 },
    minFloor: 3
};

// ============================================
// TIER 3 ENEMIES (Floors 4-6)
// ============================================

export const DEMON_SPRITE: SpriteData = {
    id: 'demon',
    name: 'Lesser Demon',
    type: 'enemy',
    metadata: { description: 'A fiend from the abyss', version: '1.0' },
    pixels: [
        ['#800', '', '#a00', '#f00', '#f00', '#a00', '', '#800'],
        ['', '#a00', '#f44', '#f44', '#f44', '#f44', '#a00', ''],
        ['', '#a00', '#ff0', '#f44', '#f44', '#ff0', '#a00', ''],
        ['', '', '#f44', '#c00', '#c00', '#f44', '', ''],
        ['#f80', '#a00', '#c00', '#a00', '#a00', '#c00', '#a00', '#f80'],
        ['', '#a00', '#a00', '#800', '#800', '#a00', '#a00', ''],
        ['', '', '#800', '', '', '#800', '', ''],
        ['', '#600', '#600', '', '', '#600', '#600', ''],
    ],
    color: '#f44',
    char: 'D',
    stats: { baseHp: 45, baseMana: 25, baseAttack: 9, baseDefense: 4, critChance: 12, dodgeChance: 8, speed: 5 },
    moveset: [
        { id: 'claw', name: 'Demon Claw', description: 'Burning slash', staminaCost: 12, manaCost: 0, baseDamage: 1.2, speed: 6, key: '1' },
        { id: 'hellfire', name: 'Hellfire', description: 'Fire breath', staminaCost: 15, manaCost: 15, baseDamage: 2.0, speed: 5, key: '2' },
        { id: 'drain', name: 'Soul Drain', description: 'Lifesteal', staminaCost: 20, manaCost: 10, baseDamage: 1.0, speed: 4, key: '3', special: 'heal' },
    ],
    behavior: { pattern: 'aggressive', aggroRange: 7 },
    minFloor: 4
};

export const WRAITH_SPRITE: SpriteData = {
    id: 'wraith',
    name: 'Wraith',
    type: 'enemy',
    metadata: { description: 'A tormented spirit', version: '1.0' },
    pixels: [
        ['', '', '#224', '#336', '#336', '#224', '', ''],
        ['', '#224', '#448', '#55a', '#55a', '#448', '#224', ''],
        ['', '#336', '#88f', '#448', '#448', '#88f', '#336', ''],
        ['', '#448', '#55a', '#55a', '#55a', '#55a', '#448', ''],
        ['', '', '#448', '#55a', '#55a', '#448', '', ''],
        ['', '', '#336', '#448', '#448', '#336', '', ''],
        ['', '', '', '#336', '#336', '', '', ''],
        ['', '', '', '#224', '#224', '', '', ''],
    ],
    color: '#55a',
    char: 'W',
    stats: { baseHp: 30, baseMana: 40, baseAttack: 7, baseDefense: 1, critChance: 15, dodgeChance: 25, speed: 7 },
    moveset: [
        { id: 'touch', name: 'Chilling Touch', description: 'Ice damage', staminaCost: 10, manaCost: 5, baseDamage: 1.0, speed: 7, key: '1' },
        { id: 'wail', name: 'Banshee Wail', description: 'Fear attack', staminaCost: 15, manaCost: 10, baseDamage: 0.5, speed: 8, key: '2', special: 'stun' },
        { id: 'phase', name: 'Phase Shift', description: 'Become intangible', staminaCost: 25, manaCost: 15, baseDamage: 0, speed: 10, key: '3', special: 'dodge_boost' },
    ],
    behavior: { pattern: 'tricky', aggroRange: 8 },
    minFloor: 4
};

// ============================================
// BOSS ENEMIES
// ============================================

export const OGRE_BOSS_SPRITE: SpriteData = {
    id: 'ogre_boss',
    name: 'Ogre Chieftain',
    type: 'enemy',
    metadata: { description: 'A massive ogre leader', version: '1.0' },
    pixels: [
        ['', '#530', '#640', '#640', '#640', '#640', '#530', ''],
        ['#530', '#752', '#862', '#862', '#862', '#862', '#752', '#530'],
        ['#640', '#862', '#ff0', '#973', '#973', '#ff0', '#862', '#640'],
        ['', '#862', '#973', '#fff', '#fff', '#973', '#862', ''],
        ['#888', '#840', '#960', '#960', '#960', '#960', '#840', '#888'],
        ['#888', '#960', '#960', '#840', '#840', '#960', '#960', '#888'],
        ['', '#840', '#730', '#730', '#730', '#730', '#840', ''],
        ['', '#620', '#620', '', '', '#620', '#620', ''],
    ],
    color: '#862',
    char: 'O',
    stats: { baseHp: 120, baseMana: 10, baseAttack: 15, baseDefense: 6, critChance: 15, dodgeChance: 5, speed: 2 },
    moveset: [
        { id: 'crush', name: 'Crushing Blow', description: 'Massive damage', staminaCost: 15, manaCost: 0, baseDamage: 2.0, speed: 2, key: '1' },
        { id: 'stomp', name: 'Ground Stomp', description: 'AoE stun', staminaCost: 25, manaCost: 0, baseDamage: 1.0, speed: 3, key: '2', special: 'stun' },
        { id: 'rage', name: 'Berserk Rage', description: 'Attack buff', staminaCost: 20, manaCost: 0, baseDamage: 0, speed: 1, key: '3', special: 'buff_attack' },
        { id: 'throw', name: 'Boulder Throw', description: 'Ranged attack', staminaCost: 30, manaCost: 0, baseDamage: 2.5, speed: 4, key: '4' },
    ],
    behavior: { pattern: 'aggressive', aggroRange: 6, isBoss: true },
    isBoss: true,
    minFloor: 3
};

export const NECROMANCER_BOSS_SPRITE: SpriteData = {
    id: 'necromancer_boss',
    name: 'Dark Necromancer',
    type: 'enemy',
    metadata: { description: 'Master of the undead', version: '1.0' },
    pixels: [
        ['', '', '#222', '#333', '#333', '#222', '', ''],
        ['', '#222', '#444', '#555', '#555', '#444', '#222', ''],
        ['', '#333', '#0f0', '#555', '#555', '#0f0', '#333', ''],
        ['', '', '#444', '#333', '#333', '#444', '', ''],
        ['#50a', '#333', '#222', '#222', '#222', '#222', '#333', '#50a'],
        ['', '#222', '#222', '#111', '#111', '#222', '#222', ''],
        ['', '', '#222', '#111', '#111', '#222', '', ''],
        ['', '', '#111', '', '', '#111', '', ''],
    ],
    color: '#50a',
    char: 'N',
    stats: { baseHp: 80, baseMana: 100, baseAttack: 8, baseDefense: 3, critChance: 20, dodgeChance: 10, speed: 4 },
    moveset: [
        { id: 'drain', name: 'Life Drain', description: 'Steal HP', staminaCost: 10, manaCost: 15, baseDamage: 1.5, speed: 5, key: '1', special: 'heal' },
        { id: 'summon', name: 'Summon Skeleton', description: 'Call ally', staminaCost: 0, manaCost: 25, baseDamage: 0, speed: 3, key: '2' },
        { id: 'curse', name: 'Death Curse', description: 'DoT attack', staminaCost: 15, manaCost: 20, baseDamage: 0.5, speed: 6, key: '3', special: 'poison' },
        { id: 'nova', name: 'Dark Nova', description: 'AoE dark magic', staminaCost: 20, manaCost: 35, baseDamage: 2.5, speed: 4, key: '4' },
    ],
    behavior: { pattern: 'defensive', aggroRange: 8, isBoss: true },
    isBoss: true,
    minFloor: 5
};

export const DRAGON_BOSS_SPRITE: SpriteData = {
    id: 'dragon_boss',
    name: 'Ancient Dragon',
    type: 'enemy',
    metadata: { description: 'The ultimate challenge', version: '1.0' },
    pixels: [
        ['#f80', '', '#f00', '#f40', '#f40', '#f00', '', '#f80'],
        ['', '#f40', '#f60', '#f80', '#f80', '#f60', '#f40', ''],
        ['#f00', '#f60', '#ff0', '#fa0', '#fa0', '#ff0', '#f60', '#f00'],
        ['#f40', '#f80', '#fa0', '#fc0', '#fc0', '#fa0', '#f80', '#f40'],
        ['#f60', '#fa0', '#fc0', '#fa0', '#fa0', '#fc0', '#fa0', '#f60'],
        ['', '#f80', '#fa0', '#f80', '#f80', '#fa0', '#f80', ''],
        ['#f00', '#f60', '#f80', '', '', '#f80', '#f60', '#f00'],
        ['#f40', '', '', '', '', '', '', '#f40'],
    ],
    color: '#f80',
    char: 'D',
    stats: { baseHp: 200, baseMana: 80, baseAttack: 20, baseDefense: 10, critChance: 15, dodgeChance: 10, speed: 5 },
    moveset: [
        { id: 'bite', name: 'Dragon Bite', description: 'Crushing jaws', staminaCost: 15, manaCost: 0, baseDamage: 2.0, speed: 5, key: '1' },
        { id: 'breath', name: 'Fire Breath', description: 'AoE fire', staminaCost: 20, manaCost: 25, baseDamage: 3.0, speed: 4, key: '2' },
        { id: 'tail', name: 'Tail Swipe', description: 'Knockback', staminaCost: 25, manaCost: 0, baseDamage: 1.5, speed: 6, key: '3', special: 'stun' },
        { id: 'roar', name: 'Terrifying Roar', description: 'Fear all', staminaCost: 30, manaCost: 15, baseDamage: 0, speed: 8, key: '4', special: 'slow' },
    ],
    behavior: { pattern: 'balanced', aggroRange: 10, isBoss: true },
    isBoss: true,
    minFloor: 7
};

// ============================================
// ALL ENEMY SPRITES ARRAY
// ============================================

export const ALL_ENEMY_SPRITES: SpriteData[] = [
    RAT_SPRITE,
    GOBLIN_SPRITE,
    BAT_SPRITE,
    SKELETON_SPRITE,
    SPIDER_SPRITE,
    ORC_SPRITE,
    DEMON_SPRITE,
    WRAITH_SPRITE,
    OGRE_BOSS_SPRITE,
    NECROMANCER_BOSS_SPRITE,
    DRAGON_BOSS_SPRITE,
];

// Get enemy sprite by floor
export function getEnemySpriteForFloor(floor: number, isBoss: boolean = false): SpriteData {
    const available = ALL_ENEMY_SPRITES.filter(s => {
        if (isBoss) return s.isBoss;
        return !s.isBoss && (s.minFloor || 1) <= floor;
    });

    if (available.length === 0) return RAT_SPRITE;

    // Weight towards higher tier enemies on higher floors
    const weighted: SpriteData[] = [];
    for (const sprite of available) {
        const minFloor = sprite.minFloor || 1;
        const relevance = floor - minFloor + 1;
        for (let i = 0; i < Math.max(1, 5 - relevance); i++) {
            weighted.push(sprite);
        }
    }

    return weighted[Math.floor(Math.random() * weighted.length)];
}

// Get boss sprite for floor
export function getBossSpriteForFloor(floor: number): SpriteData {
    const bosses = ALL_ENEMY_SPRITES.filter(s => s.isBoss && (s.minFloor || 1) <= floor);
    if (bosses.length === 0) return OGRE_BOSS_SPRITE;
    return bosses[Math.floor(Math.random() * bosses.length)];
}

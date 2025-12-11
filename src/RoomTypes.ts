// ============================================
// ROOM TYPES - Special dungeon rooms
// ============================================

import { getRandomInt } from './utils';

export type RoomType =
    | 'normal'
    | 'treasure'
    | 'trap'
    | 'puzzle'
    | 'boss'
    | 'swarm'
    | 'shrine'
    | 'merchant'
    | 'challenge'
    | 'rest';

export interface RoomData {
    type: RoomType;
    roomIndex: number;
    cleared: boolean;
    specialData?: any;
}

export interface RoomTypeConfig {
    type: RoomType;
    name: string;
    description: string;
    color: string;
    minFloor: number;
    weight: number; // Higher = more common
    onEnter?: string; // Event ID
}

export const ROOM_TYPES: Map<RoomType, RoomTypeConfig> = new Map([
    ['normal', {
        type: 'normal',
        name: 'Room',
        description: 'A standard dungeon room',
        color: '#666',
        minFloor: 1,
        weight: 50
    }],
    ['treasure', {
        type: 'treasure',
        name: 'Treasure Room',
        description: 'Glittering with gold and valuables',
        color: '#ffd700',
        minFloor: 1,
        weight: 10
    }],
    ['trap', {
        type: 'trap',
        name: 'Trap Room',
        description: 'Filled with deadly mechanisms',
        color: '#f44',
        minFloor: 2,
        weight: 15
    }],
    ['puzzle', {
        type: 'puzzle',
        name: 'Puzzle Room',
        description: 'Ancient runes glow on the walls',
        color: '#a0f',
        minFloor: 2,
        weight: 10
    }],
    ['boss', {
        type: 'boss',
        name: 'Boss Chamber',
        description: 'A powerful enemy lurks here',
        color: '#f00',
        minFloor: 3,
        weight: 5
    }],
    ['swarm', {
        type: 'swarm',
        name: 'Nest',
        description: 'Crawling with enemies',
        color: '#0a0',
        minFloor: 2,
        weight: 12
    }],
    ['shrine', {
        type: 'shrine',
        name: 'Shrine',
        description: 'An ancient altar radiates power',
        color: '#0ff',
        minFloor: 3,
        weight: 5
    }],
    ['merchant', {
        type: 'merchant',
        name: 'Merchant',
        description: 'A mysterious trader awaits',
        color: '#fa0',
        minFloor: 2,
        weight: 3
    }],
    ['challenge', {
        type: 'challenge',
        name: 'Challenge Room',
        description: 'Prove your worth for great rewards',
        color: '#f0f',
        minFloor: 4,
        weight: 5
    }],
    ['rest', {
        type: 'rest',
        name: 'Safe Haven',
        description: 'A place to recover',
        color: '#4f4',
        minFloor: 1,
        weight: 8
    }],
]);

// ============================================
// ROOM TYPE SELECTION
// ============================================

export function selectRoomType(floor: number, isFirstRoom: boolean, isLastRoom: boolean): RoomType {
    // First room is always normal (player start)
    if (isFirstRoom) return 'normal';

    // Last room always has the core (normal type for now)
    if (isLastRoom) return 'normal';

    // Build weighted list of available room types
    const available: { type: RoomType; weight: number }[] = [];

    for (const [type, config] of ROOM_TYPES) {
        if (floor >= config.minFloor) {
            // Adjust weight based on floor
            let adjustedWeight = config.weight;

            // Boss rooms more common on higher floors
            if (type === 'boss') adjustedWeight += floor * 2;

            // Swarm rooms more common on higher floors
            if (type === 'swarm') adjustedWeight += floor;

            // Rest rooms less common on higher floors
            if (type === 'rest') adjustedWeight = Math.max(1, adjustedWeight - floor);

            available.push({ type, weight: adjustedWeight });
        }
    }

    // Calculate total weight
    const totalWeight = available.reduce((sum, r) => sum + r.weight, 0);

    // Roll
    let roll = Math.random() * totalWeight;

    for (const room of available) {
        roll -= room.weight;
        if (roll <= 0) return room.type;
    }

    return 'normal';
}

// ============================================
// ROOM PUZZLE DATA
// ============================================

export interface RoomPuzzle {
    type: 'pressure_plates' | 'symbol_sequence' | 'light_redirect' | 'number_lock';
    solved: boolean;
    data: any;
}

export function generateRoomPuzzle(floor: number): RoomPuzzle {
    const types: RoomPuzzle['type'][] = ['pressure_plates', 'symbol_sequence', 'light_redirect', 'number_lock'];
    const type = types[getRandomInt(0, types.length)];

    switch (type) {
        case 'pressure_plates':
            // Step on plates in correct order
            const plateCount = 3 + Math.min(floor, 3);
            const sequence: number[] = [];
            for (let i = 0; i < plateCount; i++) {
                sequence.push(i);
            }
            // Shuffle
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = getRandomInt(0, i + 1);
                [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
            return {
                type: 'pressure_plates',
                solved: false,
                data: {
                    sequence,
                    currentIndex: 0,
                    platePositions: [] // Will be set when room is generated
                }
            };

        case 'symbol_sequence':
            // Remember and repeat symbol sequence
            const symbols = ['★', '◆', '●', '▲'];
            const length = 3 + Math.min(floor, 4);
            const symbolSeq: string[] = [];
            for (let i = 0; i < length; i++) {
                symbolSeq.push(symbols[getRandomInt(0, symbols.length)]);
            }
            return {
                type: 'symbol_sequence',
                solved: false,
                data: {
                    sequence: symbolSeq,
                    playerInput: [],
                    showing: true,
                    showIndex: 0
                }
            };

        case 'light_redirect':
            // Rotate mirrors to guide light to target
            const gridSize = 3 + Math.min(floor, 2);
            const mirrors: number[][] = [];
            for (let y = 0; y < gridSize; y++) {
                mirrors[y] = [];
                for (let x = 0; x < gridSize; x++) {
                    mirrors[y][x] = getRandomInt(0, 4) * 90; // 0, 90, 180, 270 degrees
                }
            }
            return {
                type: 'light_redirect',
                solved: false,
                data: {
                    gridSize,
                    mirrors,
                    lightSource: { x: 0, y: Math.floor(gridSize / 2) },
                    target: { x: gridSize - 1, y: Math.floor(gridSize / 2) }
                }
            };

        case 'number_lock':
            // Guess the 3-4 digit code with hints
            const digits = 3 + (floor > 5 ? 1 : 0);
            const code: number[] = [];
            for (let i = 0; i < digits; i++) {
                code.push(getRandomInt(1, 10));
            }
            return {
                type: 'number_lock',
                solved: false,
                data: {
                    code,
                    attempts: 5 + floor,
                    guesses: [] as { guess: number[], exact: number, partial: number }[]
                }
            };
    }
}

// ============================================
// SWARM CONFIGURATION
// ============================================

export interface SwarmConfig {
    enemyCount: number;
    enemyTypes: string[];
    waves: number;
}

export function generateSwarmConfig(floor: number): SwarmConfig {
    const baseCount = 3 + floor;
    const maxCount = Math.min(8, baseCount);
    const waves = 1 + Math.floor(floor / 3);

    // Enemy types available based on floor
    const types: string[] = ['goblin', 'rat'];
    if (floor >= 2) types.push('skeleton');
    if (floor >= 3) types.push('spider', 'bat');
    if (floor >= 4) types.push('orc');
    if (floor >= 5) types.push('demon');

    return {
        enemyCount: maxCount,
        enemyTypes: types,
        waves
    };
}

// ============================================
// BOSS CONFIGURATION
// ============================================

export interface BossConfig {
    bossType: string;
    minions: number;
    phases: number;
}

export function generateBossConfig(floor: number): BossConfig {
    const bossTypes = ['ogre', 'necromancer', 'demon_lord', 'dragon', 'lich'];
    const bossIndex = Math.min(Math.floor(floor / 2), bossTypes.length - 1);

    return {
        bossType: bossTypes[bossIndex],
        minions: Math.min(3, Math.floor(floor / 2)),
        phases: 1 + Math.floor(floor / 4)
    };
}

// ============================================
// CHALLENGE ROOM CONFIGURATION
// ============================================

export interface ChallengeConfig {
    type: 'survive' | 'no_damage' | 'speed_kill' | 'no_mana';
    duration: number;
    reward: string;
}

export function generateChallengeConfig(floor: number): ChallengeConfig {
    const types: ChallengeConfig['type'][] = ['survive', 'no_damage', 'speed_kill', 'no_mana'];
    const type = types[getRandomInt(0, types.length)];

    const rewards = ['rare_equipment', 'skill_point', 'stat_boost', 'gold_pile'];

    return {
        type,
        duration: type === 'survive' ? 10 + floor * 2 : 0,
        reward: rewards[getRandomInt(0, rewards.length)]
    };
}

// ============================================
// SHRINE EFFECTS
// ============================================

export interface ShrineEffect {
    name: string;
    description: string;
    positive: boolean;
    effect: () => void;
}

export const SHRINE_EFFECTS: ShrineEffect[] = [
    { name: 'Blessing of Vitality', description: '+20 Max HP permanently', positive: true, effect: () => { } },
    { name: 'Blessing of Power', description: '+5 Attack permanently', positive: true, effect: () => { } },
    { name: 'Blessing of Wisdom', description: '+15 Max Mana permanently', positive: true, effect: () => { } },
    { name: 'Blessing of Fortune', description: '+20% gold find this floor', positive: true, effect: () => { } },
    { name: 'Curse of Weakness', description: '-3 Attack until next floor', positive: false, effect: () => { } },
    { name: 'Curse of Frailty', description: '-15 Max HP until next floor', positive: false, effect: () => { } },
    { name: 'Gambler\'s Blessing', description: 'Random: great reward or harsh penalty', positive: true, effect: () => { } },
];

export function getRandomShrineEffect(): ShrineEffect {
    return SHRINE_EFFECTS[getRandomInt(0, SHRINE_EFFECTS.length)];
}

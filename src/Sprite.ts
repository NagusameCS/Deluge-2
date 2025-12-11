// ============================================
// SPRITE SYSTEM - Custom .sprite File Format
// ============================================

// .sprite file format specification:
// JSON-based format containing:
// - metadata (name, type, description)
// - visual data (8x8 pixel art as color array)
// - stats (for players/enemies)
// - movesets (combat actions)
// - behavior (AI patterns for enemies)

export interface SpritePixel {
    color: string; // hex color or 'transparent'
}

export interface SpriteMovesetAction {
    id: string;
    name: string;
    description: string;
    staminaCost: number;
    manaCost: number;
    baseDamage: number;
    speed: number;
    key: string;
    special?: string; // Special effect identifier
}

export interface SpriteStats {
    baseHp: number;
    baseMana: number;
    baseAttack: number;
    baseDefense: number;
    critChance: number;
    dodgeChance: number;
    speed: number;
}

export interface SpriteBehavior {
    pattern: 'aggressive' | 'defensive' | 'tricky' | 'balanced' | 'fleeing';
    aggroRange: number;
    fleeThreshold?: number; // HP percentage to start fleeing
    preferredActions?: string[]; // Action IDs in order of preference
    minFloor?: number;
    isBoss?: boolean;
    isGolden?: boolean;
}

export interface SpriteMetadata {
    description?: string;
    author?: string;
    version?: string;
    created?: string;
    modified?: string;
}

export interface SpriteData {
    // Core identity
    id: string;
    name: string;
    type: 'player' | 'enemy' | 'npc';

    // Metadata (optional, for editor)
    metadata: SpriteMetadata;

    // Visual - 8x8 grid
    pixels: string[][]; // 8x8 array of hex colors
    color: string; // Primary/fallback color
    char: string; // ASCII fallback character

    // Stats
    stats: SpriteStats;

    // Combat moveset (for players, defines available actions)
    moveset: SpriteMovesetAction[];

    // Behavior (for enemies/NPCs)
    behavior?: SpriteBehavior;

    // Special properties (deprecated - use behavior)
    isGolden?: boolean;
    minFloor?: number;
    isBoss?: boolean;
    xpMultiplier?: number;
    goldMultiplier?: number;
}

// Default player sprite - Improved Adventurer
export const DEFAULT_PLAYER_SPRITE: SpriteData = {
    id: 'default_player',
    name: 'Adventurer',
    type: 'player',
    metadata: {
        description: 'A brave adventurer seeking glory in the dungeon.',
        version: '1.0',
        author: 'System'
    },
    pixels: [
        ['', '', '#4af', '#4af', '#4af', '#4af', '', ''],
        ['', '#4af', '#fea', '#fea', '#fea', '#fea', '#4af', ''],
        ['', '#48a', '#fea', '#222', '#222', '#fea', '#48a', ''],
        ['', '', '#fea', '#f88', '#f88', '#fea', '', ''],
        ['#888', '#4af', '#4af', '#4af', '#4af', '#4af', '#4af', '#888'],
        ['', '#48a', '#4af', '#4af', '#4af', '#4af', '#48a', ''],
        ['', '', '#48a', '', '', '#48a', '', ''],
        ['', '', '#642', '', '', '#642', '', ''],
    ],
    color: '#4af',
    char: '@',
    stats: {
        baseHp: 50,
        baseMana: 30,
        baseAttack: 5,
        baseDefense: 1,
        critChance: 0.05,
        dodgeChance: 0.05,
        speed: 5
    },
    moveset: [
        { id: 'strike', name: 'Strike', description: 'Quick attack', staminaCost: 15, manaCost: 0, baseDamage: 1.0, speed: 5, key: '1' },
        { id: 'guard', name: 'Guard', description: 'Block attacks', staminaCost: 10, manaCost: 0, baseDamage: 0, speed: 3, key: '2' },
        { id: 'feint', name: 'Feint', description: 'Dodge & counter', staminaCost: 20, manaCost: 0, baseDamage: 0.5, speed: 7, key: '3' },
        { id: 'heavy', name: 'Heavy Strike', description: 'Powerful but slow', staminaCost: 30, manaCost: 0, baseDamage: 2.0, speed: 2, key: '4' },
        { id: 'heal', name: 'Heal', description: 'Restore 15 HP', staminaCost: 0, manaCost: 12, baseDamage: 0, speed: 1, key: 'Q' },
        { id: 'fireball', name: 'Fireball', description: 'Magic attack', staminaCost: 10, manaCost: 15, baseDamage: 1.8, speed: 4, key: 'W' },
    ]
};

// Additional player classes
export const WARRIOR_SPRITE: SpriteData = {
    id: 'warrior',
    name: 'Warrior',
    type: 'player',
    metadata: {
        description: 'A heavily armored fighter with high HP and defense.',
        version: '1.0',
        author: 'System'
    },
    pixels: [
        ['', '#888', '#888', '#888', '#888', '#888', '#888', ''],
        ['#aaa', '#888', '#fea', '#fea', '#fea', '#fea', '#888', '#aaa'],
        ['', '#666', '#fea', '#222', '#222', '#fea', '#666', ''],
        ['', '', '#fea', '#fea', '#fea', '#fea', '', ''],
        ['#ccc', '#a00', '#a00', '#888', '#888', '#a00', '#a00', '#ccc'],
        ['', '#800', '#a00', '#a00', '#a00', '#a00', '#800', ''],
        ['', '', '#666', '', '', '#666', '', ''],
        ['', '', '#444', '', '', '#444', '', ''],
    ],
    color: '#a00',
    char: 'W',
    stats: {
        baseHp: 75,
        baseMana: 15,
        baseAttack: 6,
        baseDefense: 3,
        critChance: 0.08,
        dodgeChance: 0.02,
        speed: 3
    },
    moveset: [
        { id: 'strike', name: 'Slash', description: 'Sword attack', staminaCost: 12, manaCost: 0, baseDamage: 1.2, speed: 4, key: '1' },
        { id: 'guard', name: 'Shield Block', description: 'Strong defense', staminaCost: 8, manaCost: 0, baseDamage: 0, speed: 2, key: '2' },
        { id: 'feint', name: 'Shield Bash', description: 'Stun attack', staminaCost: 25, manaCost: 0, baseDamage: 0.8, speed: 3, key: '3', special: 'stun' },
        { id: 'heavy', name: 'Cleave', description: 'Devastating blow', staminaCost: 35, manaCost: 0, baseDamage: 2.5, speed: 1, key: '4' },
        { id: 'heal', name: 'Battle Cry', description: 'Restore 10 HP, boost attack', staminaCost: 20, manaCost: 0, baseDamage: 0, speed: 5, key: 'Q', special: 'buff_attack' },
    ]
};

export const MAGE_SPRITE: SpriteData = {
    id: 'mage',
    name: 'Mage',
    type: 'player',
    metadata: {
        description: 'A powerful spellcaster with devastating magic.',
        version: '1.0',
        author: 'System'
    },
    pixels: [
        ['', '', '#a0f', '#a0f', '#a0f', '#a0f', '', ''],
        ['', '#80c', '#fea', '#fea', '#fea', '#fea', '#80c', ''],
        ['', '#a0f', '#fea', '#a0f', '#a0f', '#fea', '#a0f', ''],
        ['', '', '#fea', '#fea', '#fea', '#fea', '', ''],
        ['#a0f', '#50a', '#50a', '#50a', '#50a', '#50a', '#50a', '#a0f'],
        ['', '#408', '#50a', '#50a', '#50a', '#50a', '#408', ''],
        ['', '', '#408', '#50a', '#50a', '#408', '', ''],
        ['', '', '#432', '', '', '#432', '', ''],
    ],
    color: '#a0f',
    char: 'M',
    stats: {
        baseHp: 35,
        baseMana: 60,
        baseAttack: 3,
        baseDefense: 0,
        critChance: 0.10,
        dodgeChance: 0.05,
        speed: 4
    },
    moveset: [
        { id: 'strike', name: 'Staff Strike', description: 'Weak melee', staminaCost: 10, manaCost: 0, baseDamage: 0.6, speed: 3, key: '1' },
        { id: 'guard', name: 'Mana Shield', description: 'Uses mana to block', staminaCost: 0, manaCost: 10, baseDamage: 0, speed: 6, key: '2' },
        { id: 'fireball', name: 'Fireball', description: 'Fire damage', staminaCost: 5, manaCost: 12, baseDamage: 2.0, speed: 5, key: '3' },
        { id: 'ice', name: 'Ice Shard', description: 'Slow enemy', staminaCost: 5, manaCost: 10, baseDamage: 1.5, speed: 6, key: '4', special: 'slow' },
        { id: 'heal', name: 'Meditation', description: 'Restore 20 mana', staminaCost: 15, manaCost: 0, baseDamage: 0, speed: 1, key: 'Q', special: 'restore_mana' },
        { id: 'lightning', name: 'Lightning', description: 'High damage spell', staminaCost: 10, manaCost: 25, baseDamage: 3.0, speed: 7, key: 'W' },
    ]
};

export const ROGUE_SPRITE: SpriteData = {
    id: 'rogue',
    name: 'Rogue',
    type: 'player',
    metadata: {
        description: 'A swift assassin with high crit and dodge.',
        version: '1.0',
        author: 'System'
    },
    pixels: [
        ['', '', '#333', '#333', '#333', '#333', '', ''],
        ['', '#222', '#fea', '#fea', '#fea', '#fea', '#222', ''],
        ['', '#333', '#fea', '#111', '#111', '#fea', '#333', ''],
        ['', '#222', '#fea', '#333', '#333', '#fea', '#222', ''],
        ['#444', '#222', '#222', '#222', '#222', '#222', '#222', '#444'],
        ['', '#111', '#222', '#222', '#222', '#222', '#111', ''],
        ['', '', '#111', '', '', '#111', '', ''],
        ['', '', '#111', '', '', '#111', '', ''],
    ],
    color: '#333',
    char: 'R',
    stats: {
        baseHp: 40,
        baseMana: 25,
        baseAttack: 7,
        baseDefense: 0,
        critChance: 0.20,
        dodgeChance: 0.15,
        speed: 8
    },
    moveset: [
        { id: 'strike', name: 'Quick Stab', description: 'Fast attack', staminaCost: 10, manaCost: 0, baseDamage: 0.8, speed: 8, key: '1' },
        { id: 'guard', name: 'Dodge', description: 'Evade attacks', staminaCost: 15, manaCost: 0, baseDamage: 0, speed: 9, key: '2', special: 'dodge_boost' },
        { id: 'feint', name: 'Backstab', description: 'High crit chance', staminaCost: 20, manaCost: 0, baseDamage: 1.5, speed: 7, key: '3', special: 'crit_boost' },
        { id: 'heavy', name: 'Assassinate', description: 'Massive damage', staminaCost: 40, manaCost: 0, baseDamage: 4.0, speed: 3, key: '4' },
        { id: 'poison', name: 'Poison Blade', description: 'Damage over time', staminaCost: 15, manaCost: 5, baseDamage: 0.5, speed: 6, key: 'Q', special: 'poison' },
        { id: 'smoke', name: 'Smoke Bomb', description: 'Disengage safely', staminaCost: 25, manaCost: 0, baseDamage: 0, speed: 10, key: 'W', special: 'escape' },
    ]
};

// Built-in player sprites
export const BUILTIN_PLAYER_SPRITES: SpriteData[] = [
    DEFAULT_PLAYER_SPRITE,
    WARRIOR_SPRITE,
    MAGE_SPRITE,
    ROGUE_SPRITE
];

// Sprite storage and management
export class SpriteManager {
    private static playerSprites: Map<string, SpriteData> = new Map();
    private static enemySprites: Map<string, SpriteData> = new Map();
    private static initialized = false;

    static init() {
        if (this.initialized) return;
        this.initialized = true;

        // Load built-in sprites
        for (const sprite of BUILTIN_PLAYER_SPRITES) {
            this.playerSprites.set(sprite.id, sprite);
        }

        // Load custom sprites from localStorage
        this.loadCustomSprites();
    }

    static loadCustomSprites() {
        try {
            const customSpritesJson = localStorage.getItem('deluge2_custom_sprites');
            if (customSpritesJson) {
                const sprites: SpriteData[] = JSON.parse(customSpritesJson);
                for (const sprite of sprites) {
                    if (sprite.type === 'player') {
                        this.playerSprites.set(sprite.id, sprite);
                    } else if (sprite.type === 'enemy') {
                        this.enemySprites.set(sprite.id, sprite);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load custom sprites:', e);
        }
    }

    static saveSprite(sprite: SpriteData) {
        // Get existing custom sprites
        let customSprites: SpriteData[] = [];
        try {
            const existing = localStorage.getItem('deluge2_custom_sprites');
            if (existing) {
                customSprites = JSON.parse(existing);
            }
        } catch (e) {
            console.error('Failed to parse existing sprites:', e);
        }

        // Replace or add
        const idx = customSprites.findIndex(s => s.id === sprite.id);
        if (idx !== -1) {
            customSprites[idx] = sprite;
        } else {
            customSprites.push(sprite);
        }

        // Save
        localStorage.setItem('deluge2_custom_sprites', JSON.stringify(customSprites));

        // Update in-memory
        if (sprite.type === 'player') {
            this.playerSprites.set(sprite.id, sprite);
        } else if (sprite.type === 'enemy') {
            this.enemySprites.set(sprite.id, sprite);
        }
    }

    static getPlayerSprites(): SpriteData[] {
        this.init();
        return Array.from(this.playerSprites.values());
    }

    static getEnemySprites(): SpriteData[] {
        this.init();
        return Array.from(this.enemySprites.values());
    }

    static getAllSprites(): SpriteData[] {
        this.init();
        return [...this.getPlayerSprites(), ...this.getEnemySprites()];
    }

    static getSprite(id: string): SpriteData | undefined {
        this.init();
        return this.playerSprites.get(id) || this.enemySprites.get(id);
    }

    static deleteSprite(id: string): boolean {
        // Don't delete built-in sprites
        if (BUILTIN_PLAYER_SPRITES.some(s => s.id === id)) {
            return false;
        }

        this.playerSprites.delete(id);
        this.enemySprites.delete(id);

        // Update localStorage
        let customSprites: SpriteData[] = [];
        try {
            const existing = localStorage.getItem('deluge2_custom_sprites');
            if (existing) {
                customSprites = JSON.parse(existing);
                customSprites = customSprites.filter(s => s.id !== id);
                localStorage.setItem('deluge2_custom_sprites', JSON.stringify(customSprites));
            }
        } catch (e) {
            console.error('Failed to delete sprite:', e);
        }

        return true;
    }

    // Export sprite as .sprite file content
    static exportSprite(sprite: SpriteData): string {
        return JSON.stringify(sprite, null, 2);
    }

    // Import sprite from .sprite file content
    static importSprite(content: string): SpriteData | null {
        try {
            const sprite = JSON.parse(content) as SpriteData;
            // Validate required fields
            if (!sprite.id || !sprite.name || !sprite.type || !sprite.pixels || !sprite.stats) {
                throw new Error('Invalid sprite format');
            }
            return sprite;
        } catch (e) {
            console.error('Failed to import sprite:', e);
            return null;
        }
    }
}

// Global sprite manager instance (deprecated - use static methods)
export const spriteManager = {
    getPlayerSprites: () => SpriteManager.getPlayerSprites(),
    getEnemySprites: () => SpriteManager.getEnemySprites(),
    getAllSprites: () => SpriteManager.getAllSprites(),
    getSprite: (id: string) => SpriteManager.getSprite(id),
    saveSprite: (sprite: SpriteData) => SpriteManager.saveSprite(sprite),
    deleteSprite: (id: string) => SpriteManager.deleteSprite(id),
    exportSprite: (sprite: SpriteData) => SpriteManager.exportSprite(sprite),
    importSprite: (content: string) => SpriteManager.importSprite(content),
};

// Create a golden variant of any enemy sprite
export function createGoldenVariant(sprite: SpriteData): SpriteData {
    // Replace colors with golden tones
    const goldenPixels = sprite.pixels.map(row =>
        row.map(color => {
            if (color === 'transparent') return color;
            return '#fd0'; // Golden color
        })
    );

    return {
        ...sprite,
        id: `golden_${sprite.id}`,
        name: `Golden ${sprite.name}`,
        metadata: {
            ...sprite.metadata,
            description: `A rare golden ${sprite.name}! Gives 5x rewards but flees from combat.`
        },
        pixels: goldenPixels,
        color: '#fd0',
        isGolden: true,
        xpMultiplier: 5,
        goldMultiplier: 5,
        behavior: {
            pattern: 'fleeing',
            aggroRange: 8,
            fleeThreshold: 1.0, // Always flees
            preferredActions: ['guard', 'feint']
        }
    };
}

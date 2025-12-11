// ============================================
// GAME ASSETS - Editable Visual Assets System
// ============================================
// All game visuals defined here can be edited in the sprite editor

export interface GameAsset {
    id: string;
    name: string;
    category: 'item' | 'trap' | 'object' | 'effect' | 'ui';
    pixels: string[][];  // 8x8 pixel art
    color: string;       // Fallback/primary color
    description?: string;
}

// Built-in game assets
export const BUILTIN_ASSETS: GameAsset[] = [
    // Items
    {
        id: 'health_potion',
        name: 'Health Potion',
        category: 'item',
        color: '#0f0',
        pixels: [
            ['transparent', 'transparent', '#0a0', '#0a0', '#0a0', '#0a0', 'transparent', 'transparent'],
            ['transparent', 'transparent', '#0a0', '#0f0', '#0f0', '#0a0', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', '#0a0', '#0a0', 'transparent', 'transparent', 'transparent'],
            ['transparent', 'transparent', '#0a0', '#0f0', '#0f0', '#0a0', 'transparent', 'transparent'],
            ['transparent', '#0a0', '#0f0', '#0f0', '#0f0', '#0f0', '#0a0', 'transparent'],
            ['transparent', '#0a0', '#0f0', '#afa', '#0f0', '#0f0', '#0a0', 'transparent'],
            ['transparent', '#0a0', '#0f0', '#0f0', '#0f0', '#0f0', '#0a0', 'transparent'],
            ['transparent', 'transparent', '#0a0', '#0a0', '#0a0', '#0a0', 'transparent', 'transparent'],
        ],
        description: 'Restores HP when consumed'
    },
    {
        id: 'mana_potion',
        name: 'Mana Potion',
        category: 'item',
        color: '#00f',
        pixels: [
            ['transparent', 'transparent', '#008', '#008', '#008', '#008', 'transparent', 'transparent'],
            ['transparent', 'transparent', '#008', '#00f', '#00f', '#008', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', '#008', '#008', 'transparent', 'transparent', 'transparent'],
            ['transparent', 'transparent', '#008', '#00f', '#00f', '#008', 'transparent', 'transparent'],
            ['transparent', '#008', '#00f', '#00f', '#00f', '#00f', '#008', 'transparent'],
            ['transparent', '#008', '#00f', '#aaf', '#00f', '#00f', '#008', 'transparent'],
            ['transparent', '#008', '#00f', '#00f', '#00f', '#00f', '#008', 'transparent'],
            ['transparent', 'transparent', '#008', '#008', '#008', '#008', 'transparent', 'transparent'],
        ],
        description: 'Restores Mana when consumed'
    },
    {
        id: 'gold_coin',
        name: 'Gold Coin',
        category: 'item',
        color: '#ffd700',
        pixels: [
            ['transparent', 'transparent', '#a80', '#a80', '#a80', '#a80', 'transparent', 'transparent'],
            ['transparent', '#a80', '#fd0', '#fd0', '#fd0', '#fd0', '#a80', 'transparent'],
            ['#a80', '#fd0', '#fd0', '#a80', '#a80', '#fd0', '#fd0', '#a80'],
            ['#a80', '#fd0', '#a80', '#fd0', '#fd0', '#a80', '#fd0', '#a80'],
            ['#a80', '#fd0', '#a80', '#fd0', '#fd0', '#a80', '#fd0', '#a80'],
            ['#a80', '#fd0', '#fd0', '#a80', '#a80', '#fd0', '#fd0', '#a80'],
            ['transparent', '#a80', '#fd0', '#fd0', '#fd0', '#fd0', '#a80', 'transparent'],
            ['transparent', 'transparent', '#a80', '#a80', '#a80', '#a80', 'transparent', 'transparent'],
        ],
        description: 'Currency for purchasing items'
    },
    {
        id: 'chest_closed',
        name: 'Chest (Closed)',
        category: 'object',
        color: '#a50',
        pixels: [
            ['transparent', '#630', '#630', '#630', '#630', '#630', '#630', 'transparent'],
            ['#630', '#a50', '#a50', '#a50', '#a50', '#a50', '#a50', '#630'],
            ['#630', '#a50', '#fd0', '#a50', '#a50', '#fd0', '#a50', '#630'],
            ['#630', '#a50', '#a50', '#a50', '#a50', '#a50', '#a50', '#630'],
            ['#420', '#630', '#630', '#fd0', '#fd0', '#630', '#630', '#420'],
            ['#420', '#840', '#840', '#840', '#840', '#840', '#840', '#420'],
            ['#420', '#840', '#840', '#840', '#840', '#840', '#840', '#420'],
            ['transparent', '#420', '#420', '#420', '#420', '#420', '#420', 'transparent'],
        ],
        description: 'A treasure chest containing loot'
    },
    {
        id: 'chest_open',
        name: 'Chest (Open)',
        category: 'object',
        color: '#840',
        pixels: [
            ['#630', '#a50', '#a50', '#a50', '#a50', '#a50', '#a50', '#630'],
            ['#630', '#a50', '#fd0', '#a50', '#a50', '#fd0', '#a50', '#630'],
            ['transparent', '#630', '#630', '#630', '#630', '#630', '#630', 'transparent'],
            ['transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent'],
            ['#420', '#630', '#630', '#fd0', '#fd0', '#630', '#630', '#420'],
            ['#420', '#840', '#420', '#420', '#420', '#420', '#840', '#420'],
            ['#420', '#840', '#840', '#840', '#840', '#840', '#840', '#420'],
            ['transparent', '#420', '#420', '#420', '#420', '#420', '#420', 'transparent'],
        ],
        description: 'An opened treasure chest'
    },
    // Traps
    {
        id: 'spike_trap',
        name: 'Spike Trap',
        category: 'trap',
        color: '#888',
        pixels: [
            ['transparent', '#444', 'transparent', '#444', 'transparent', '#444', 'transparent', '#444'],
            ['#444', '#888', '#444', '#888', '#444', '#888', '#444', '#888'],
            ['#444', '#aaa', '#444', '#aaa', '#444', '#aaa', '#444', '#aaa'],
            ['transparent', '#888', 'transparent', '#888', 'transparent', '#888', 'transparent', '#888'],
            ['transparent', '#666', 'transparent', '#666', 'transparent', '#666', 'transparent', '#666'],
            ['#333', '#333', '#333', '#333', '#333', '#333', '#333', '#333'],
            ['#222', '#222', '#222', '#222', '#222', '#222', '#222', '#222'],
            ['#111', '#111', '#111', '#111', '#111', '#111', '#111', '#111'],
        ],
        description: 'Damages entities that step on it'
    },
    {
        id: 'fire_trap',
        name: 'Fire Trap',
        category: 'trap',
        color: '#f80',
        pixels: [
            ['transparent', 'transparent', '#f00', '#f80', '#f80', '#f00', 'transparent', 'transparent'],
            ['transparent', '#f00', '#f80', '#ff0', '#ff0', '#f80', '#f00', 'transparent'],
            ['#f00', '#f80', '#ff0', '#ff0', '#ff0', '#ff0', '#f80', '#f00'],
            ['#f00', '#f80', '#ff0', '#ffa', '#ffa', '#ff0', '#f80', '#f00'],
            ['transparent', '#f00', '#f80', '#ff0', '#ff0', '#f80', '#f00', 'transparent'],
            ['#333', '#333', '#333', '#333', '#333', '#333', '#333', '#333'],
            ['#222', '#222', '#222', '#222', '#222', '#222', '#222', '#222'],
            ['#111', '#111', '#111', '#111', '#111', '#111', '#111', '#111'],
        ],
        description: 'Burns enemies with fire damage'
    },
    {
        id: 'poison_trap',
        name: 'Poison Trap',
        category: 'trap',
        color: '#0a0',
        pixels: [
            ['transparent', 'transparent', '#080', '#0a0', '#0a0', '#080', 'transparent', 'transparent'],
            ['transparent', '#080', '#0a0', '#0f0', '#0f0', '#0a0', '#080', 'transparent'],
            ['transparent', '#080', '#0f0', '#0f0', '#0f0', '#0f0', '#080', 'transparent'],
            ['transparent', 'transparent', '#080', '#0a0', '#0a0', '#080', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', '#080', '#080', 'transparent', 'transparent', 'transparent'],
            ['#333', '#333', '#333', '#333', '#333', '#333', '#333', '#333'],
            ['#222', '#222', '#222', '#222', '#222', '#222', '#222', '#222'],
            ['#111', '#111', '#111', '#111', '#111', '#111', '#111', '#111'],
        ],
        description: 'Poisons entities over time'
    },
    // Core puzzle objects
    {
        id: 'lamp_off',
        name: 'Lamp (Off)',
        category: 'object',
        color: '#444',
        pixels: [
            ['transparent', 'transparent', '#333', '#333', '#333', '#333', 'transparent', 'transparent'],
            ['transparent', '#333', '#444', '#444', '#444', '#444', '#333', 'transparent'],
            ['#333', '#444', '#555', '#555', '#555', '#555', '#444', '#333'],
            ['#333', '#444', '#555', '#666', '#666', '#555', '#444', '#333'],
            ['#333', '#444', '#555', '#555', '#555', '#555', '#444', '#333'],
            ['transparent', '#333', '#444', '#444', '#444', '#444', '#333', 'transparent'],
            ['transparent', 'transparent', '#333', '#333', '#333', '#333', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', '#222', '#222', 'transparent', 'transparent', 'transparent'],
        ],
        description: 'An unlit magical lamp'
    },
    {
        id: 'lamp_on',
        name: 'Lamp (On)',
        category: 'object',
        color: '#ff0',
        pixels: [
            ['transparent', '#ff0', '#ff0', '#ff0', '#ff0', '#ff0', '#ff0', 'transparent'],
            ['#ff0', '#ff0', '#ffa', '#ffa', '#ffa', '#ffa', '#ff0', '#ff0'],
            ['#ff0', '#ffa', '#fff', '#fff', '#fff', '#fff', '#ffa', '#ff0'],
            ['#ff0', '#ffa', '#fff', '#fff', '#fff', '#fff', '#ffa', '#ff0'],
            ['#ff0', '#ffa', '#fff', '#fff', '#fff', '#fff', '#ffa', '#ff0'],
            ['#ff0', '#ff0', '#ffa', '#ffa', '#ffa', '#ffa', '#ff0', '#ff0'],
            ['transparent', '#ff0', '#ff0', '#ff0', '#ff0', '#ff0', '#ff0', 'transparent'],
            ['transparent', 'transparent', 'transparent', '#a80', '#a80', 'transparent', 'transparent', 'transparent'],
        ],
        description: 'A lit magical lamp'
    },
    {
        id: 'dungeon_core',
        name: 'Dungeon Core',
        category: 'object',
        color: '#0ff',
        pixels: [
            ['transparent', 'transparent', '#088', '#0aa', '#0aa', '#088', 'transparent', 'transparent'],
            ['transparent', '#088', '#0ff', '#0ff', '#0ff', '#0ff', '#088', 'transparent'],
            ['#088', '#0ff', '#0ff', '#aff', '#aff', '#0ff', '#0ff', '#088'],
            ['#088', '#0ff', '#aff', '#fff', '#fff', '#aff', '#0ff', '#088'],
            ['#088', '#0ff', '#aff', '#fff', '#fff', '#aff', '#0ff', '#088'],
            ['#088', '#0ff', '#0ff', '#aff', '#aff', '#0ff', '#0ff', '#088'],
            ['transparent', '#088', '#0ff', '#0ff', '#0ff', '#0ff', '#088', 'transparent'],
            ['transparent', 'transparent', '#088', '#088', '#088', '#088', 'transparent', 'transparent'],
        ],
        description: 'The heart of the dungeon floor'
    },
    {
        id: 'dungeon_core_vulnerable',
        name: 'Dungeon Core (Vulnerable)',
        category: 'object',
        color: '#f00',
        pixels: [
            ['transparent', 'transparent', '#800', '#a00', '#a00', '#800', 'transparent', 'transparent'],
            ['transparent', '#800', '#f00', '#f00', '#f00', '#f00', '#800', 'transparent'],
            ['#800', '#f00', '#f00', '#f88', '#f88', '#f00', '#f00', '#800'],
            ['#800', '#f00', '#f88', '#faa', '#faa', '#f88', '#f00', '#800'],
            ['#800', '#f00', '#f88', '#faa', '#faa', '#f88', '#f00', '#800'],
            ['#800', '#f00', '#f00', '#f88', '#f88', '#f00', '#f00', '#800'],
            ['transparent', '#800', '#f00', '#f00', '#f00', '#f00', '#800', 'transparent'],
            ['transparent', 'transparent', '#800', '#800', '#800', '#800', 'transparent', 'transparent'],
        ],
        description: 'The dungeon core ready to be destroyed'
    },
    // Materials
    {
        id: 'iron_ore',
        name: 'Iron Ore',
        category: 'item',
        color: '#888',
        pixels: [
            ['transparent', 'transparent', '#444', '#555', '#555', '#444', 'transparent', 'transparent'],
            ['transparent', '#444', '#666', '#888', '#888', '#666', '#444', 'transparent'],
            ['#444', '#666', '#888', '#aaa', '#888', '#888', '#666', '#444'],
            ['#444', '#888', '#aaa', '#aaa', '#888', '#666', '#888', '#444'],
            ['#444', '#666', '#888', '#888', '#666', '#888', '#666', '#444'],
            ['transparent', '#444', '#666', '#666', '#888', '#666', '#444', 'transparent'],
            ['transparent', 'transparent', '#444', '#444', '#444', '#444', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent'],
        ],
        description: 'Raw iron for crafting'
    },
    {
        id: 'crystal',
        name: 'Crystal',
        category: 'item',
        color: '#a0f',
        pixels: [
            ['transparent', 'transparent', 'transparent', '#80a', 'transparent', 'transparent', 'transparent', 'transparent'],
            ['transparent', 'transparent', '#80a', '#a0f', '#80a', 'transparent', 'transparent', 'transparent'],
            ['transparent', '#80a', '#a0f', '#c4f', '#a0f', '#80a', 'transparent', 'transparent'],
            ['#80a', '#a0f', '#c4f', '#eaf', '#c4f', '#a0f', '#80a', 'transparent'],
            ['transparent', '#80a', '#a0f', '#c4f', '#a0f', '#80a', 'transparent', 'transparent'],
            ['transparent', 'transparent', '#80a', '#a0f', '#80a', 'transparent', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', '#80a', 'transparent', 'transparent', 'transparent', 'transparent'],
            ['transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent'],
        ],
        description: 'Magical crystal for enchanting'
    },
];

// Asset manager for loading/saving custom assets
export class AssetManager {
    private static assets: Map<string, GameAsset> = new Map();
    private static initialized = false;

    static init() {
        if (this.initialized) return;
        this.initialized = true;

        // Load built-in assets
        for (const asset of BUILTIN_ASSETS) {
            this.assets.set(asset.id, asset);
        }

        // Load custom assets from localStorage
        this.loadCustomAssets();
    }

    static loadCustomAssets() {
        try {
            const customJson = localStorage.getItem('deluge2_custom_assets');
            if (customJson) {
                const assets: GameAsset[] = JSON.parse(customJson);
                for (const asset of assets) {
                    this.assets.set(asset.id, asset);
                }
            }
        } catch (e) {
            console.error('Failed to load custom assets:', e);
        }
    }

    static saveAsset(asset: GameAsset) {
        // Get existing custom assets
        let customAssets: GameAsset[] = [];
        try {
            const existing = localStorage.getItem('deluge2_custom_assets');
            if (existing) {
                customAssets = JSON.parse(existing);
            }
        } catch (e) {
            console.error('Failed to parse existing assets:', e);
        }

        // Replace or add
        const idx = customAssets.findIndex(a => a.id === asset.id);
        if (idx !== -1) {
            customAssets[idx] = asset;
        } else {
            customAssets.push(asset);
        }

        // Save
        localStorage.setItem('deluge2_custom_assets', JSON.stringify(customAssets));
        this.assets.set(asset.id, asset);
    }

    static getAsset(id: string): GameAsset | undefined {
        this.init();
        return this.assets.get(id);
    }

    static getAllAssets(): GameAsset[] {
        this.init();
        return Array.from(this.assets.values());
    }

    static getAssetsByCategory(category: GameAsset['category']): GameAsset[] {
        this.init();
        return Array.from(this.assets.values()).filter(a => a.category === category);
    }

    static deleteAsset(id: string): boolean {
        // Don't delete built-in assets
        if (BUILTIN_ASSETS.some(a => a.id === id)) {
            return false;
        }

        this.assets.delete(id);

        // Update localStorage
        try {
            const existing = localStorage.getItem('deluge2_custom_assets');
            if (existing) {
                let customAssets: GameAsset[] = JSON.parse(existing);
                customAssets = customAssets.filter(a => a.id !== id);
                localStorage.setItem('deluge2_custom_assets', JSON.stringify(customAssets));
            }
        } catch (e) {
            console.error('Failed to delete asset:', e);
        }

        return true;
    }

    static exportAsset(asset: GameAsset): string {
        return JSON.stringify(asset, null, 2);
    }

    static importAsset(content: string): GameAsset | null {
        try {
            const asset = JSON.parse(content) as GameAsset;
            if (!asset.id || !asset.name || !asset.category || !asset.pixels) {
                throw new Error('Invalid asset format');
            }
            return asset;
        } catch (e) {
            console.error('Failed to import asset:', e);
            return null;
        }
    }
}

// Helper to draw a pixel art asset at a given position
export function drawAsset(
    ctx: CanvasRenderingContext2D,
    assetId: string,
    x: number,
    y: number,
    size: number = 32
) {
    const asset = AssetManager.getAsset(assetId);
    if (!asset) {
        // Fallback: draw a colored square
        ctx.fillStyle = '#f0f';
        ctx.fillRect(x, y, size, size);
        return;
    }

    const pixelSize = size / 8;
    for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
            const color = asset.pixels[py]?.[px];
            if (color && color !== 'transparent') {
                ctx.fillStyle = color;
                ctx.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

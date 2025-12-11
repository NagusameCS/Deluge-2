import { getRandomInt } from './utils';

// ============================================
// EQUIPMENT & RUNE SYSTEM
// ============================================

export const EquipSlot = {
    Weapon: 'weapon',
    Armor: 'armor',
    Helmet: 'helmet',
    Boots: 'boots',
    Accessory: 'accessory'
} as const;

export type EquipSlot = typeof EquipSlot[keyof typeof EquipSlot];

export const Rarity = {
    Common: 0,
    Uncommon: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 4
} as const;

export type Rarity = typeof Rarity[keyof typeof Rarity];

export const RARITY_COLORS: Record<Rarity, string> = {
    [Rarity.Common]: '#888',
    [Rarity.Uncommon]: '#0f0',
    [Rarity.Rare]: '#00f',
    [Rarity.Epic]: '#a0f',
    [Rarity.Legendary]: '#f80'
};

export const RARITY_NAMES: Record<Rarity, string> = {
    [Rarity.Common]: 'Common',
    [Rarity.Uncommon]: 'Uncommon',
    [Rarity.Rare]: 'Rare',
    [Rarity.Epic]: 'Epic',
    [Rarity.Legendary]: 'Legendary'
};

// Rune effects that modify core mechanics
export interface RuneEffect {
    id: string;
    name: string;
    description: string;
    // Stat modifiers
    attackBonus?: number;
    defenseBonus?: number;
    hpBonus?: number;
    manaBonus?: number;
    critBonus?: number;
    dodgeBonus?: number;
    lifestealBonus?: number;
    // Special effects
    fireDamage?: number;
    iceDamage?: number;
    poisonChance?: number;
    stunChance?: number;
    thornsDamage?: number;
    manaOnHit?: number;
    xpBonus?: number;
    goldBonus?: number;
}

// All possible runes
export const RUNE_POOL: RuneEffect[] = [
    { id: 'fire', name: 'Flame', description: '+3 Fire Damage', fireDamage: 3 },
    { id: 'frost', name: 'Frost', description: '+3 Ice Damage', iceDamage: 3 },
    { id: 'vampiric', name: 'Vampiric', description: '+5% Lifesteal', lifestealBonus: 0.05 },
    { id: 'sharp', name: 'Sharp', description: '+2 Attack', attackBonus: 2 },
    { id: 'sturdy', name: 'Sturdy', description: '+2 Defense', defenseBonus: 2 },
    { id: 'vital', name: 'Vital', description: '+15 Max HP', hpBonus: 15 },
    { id: 'arcane', name: 'Arcane', description: '+10 Max Mana', manaBonus: 10 },
    { id: 'lucky', name: 'Lucky', description: '+5% Crit Chance', critBonus: 0.05 },
    { id: 'nimble', name: 'Nimble', description: '+5% Dodge Chance', dodgeBonus: 0.05 },
    { id: 'thorns', name: 'Thorns', description: 'Reflect 3 damage when hit', thornsDamage: 3 },
    { id: 'siphon', name: 'Siphon', description: '+2 Mana on hit', manaOnHit: 2 },
    { id: 'wisdom', name: 'Wisdom', description: '+15% XP gained', xpBonus: 0.15 },
    { id: 'greed', name: 'Greed', description: '+25% Gold found', goldBonus: 0.25 },
    { id: 'venom', name: 'Venom', description: '10% Poison chance', poisonChance: 0.10 },
    { id: 'stunning', name: 'Stunning', description: '8% Stun chance', stunChance: 0.08 },
];

export interface Equipment {
    id: string;
    name: string;
    slot: EquipSlot;
    rarity: Rarity;
    baseAttack: number;
    baseDefense: number;
    runes: RuneEffect[];
    description: string;
}

// Base equipment templates
const WEAPON_BASES = [
    { name: 'Dagger', attack: 2, defense: 0 },
    { name: 'Sword', attack: 4, defense: 0 },
    { name: 'Axe', attack: 6, defense: 0 },
    { name: 'Mace', attack: 5, defense: 1 },
    { name: 'Spear', attack: 4, defense: 1 },
    { name: 'Greatsword', attack: 8, defense: 0 },
    { name: 'Staff', attack: 3, defense: 0 },
];

const ARMOR_BASES = [
    { name: 'Cloth Robe', attack: 0, defense: 1 },
    { name: 'Leather Armor', attack: 0, defense: 2 },
    { name: 'Chainmail', attack: 0, defense: 4 },
    { name: 'Plate Armor', attack: 0, defense: 6 },
    { name: 'Battle Armor', attack: 1, defense: 5 },
];

const HELMET_BASES = [
    { name: 'Cap', attack: 0, defense: 1 },
    { name: 'Helm', attack: 0, defense: 2 },
    { name: 'Great Helm', attack: 0, defense: 3 },
    { name: 'Crown', attack: 1, defense: 1 },
];

const BOOTS_BASES = [
    { name: 'Sandals', attack: 0, defense: 0 },
    { name: 'Boots', attack: 0, defense: 1 },
    { name: 'Greaves', attack: 0, defense: 2 },
    { name: 'Sabatons', attack: 0, defense: 3 },
];

const ACCESSORY_BASES = [
    { name: 'Ring', attack: 1, defense: 0 },
    { name: 'Amulet', attack: 0, defense: 1 },
    { name: 'Charm', attack: 1, defense: 1 },
    { name: 'Talisman', attack: 0, defense: 0 },
];

const RARITY_PREFIXES: Record<Rarity, string[]> = {
    [Rarity.Common]: ['Old', 'Worn', 'Simple'],
    [Rarity.Uncommon]: ['Fine', 'Quality', 'Sturdy'],
    [Rarity.Rare]: ['Superior', 'Exquisite', 'Masterwork'],
    [Rarity.Epic]: ['Heroic', 'Legendary', 'Mythic'],
    [Rarity.Legendary]: ['Divine', 'Godly', 'Celestial']
};

let equipmentIdCounter = 0;

export function generateEquipment(slot: EquipSlot, floor: number): Equipment {
    // Determine rarity based on floor
    let rarity: Rarity = Rarity.Common;
    const roll = Math.random();
    if (roll < 0.01 + floor * 0.005) rarity = Rarity.Legendary;
    else if (roll < 0.05 + floor * 0.01) rarity = Rarity.Epic;
    else if (roll < 0.15 + floor * 0.02) rarity = Rarity.Rare;
    else if (roll < 0.35 + floor * 0.03) rarity = Rarity.Uncommon;

    // Get base item
    let bases: { name: string; attack: number; defense: number }[];
    switch (slot) {
        case EquipSlot.Weapon: bases = WEAPON_BASES; break;
        case EquipSlot.Armor: bases = ARMOR_BASES; break;
        case EquipSlot.Helmet: bases = HELMET_BASES; break;
        case EquipSlot.Boots: bases = BOOTS_BASES; break;
        case EquipSlot.Accessory: bases = ACCESSORY_BASES; break;
        default: bases = WEAPON_BASES;
    }

    const base = bases[getRandomInt(0, bases.length)];
    const prefix = RARITY_PREFIXES[rarity][getRandomInt(0, RARITY_PREFIXES[rarity].length)];

    // Scale stats with rarity and floor
    const rarityMult = 1 + rarity * 0.3;
    const floorMult = 1 + floor * 0.1;
    const baseAttack = Math.floor(base.attack * rarityMult * floorMult);
    const baseDefense = Math.floor(base.defense * rarityMult * floorMult);

    // Add runes based on rarity
    const runeCount = rarity;
    const runes: RuneEffect[] = [];
    const availableRunes = [...RUNE_POOL];

    for (let i = 0; i < runeCount && availableRunes.length > 0; i++) {
        const idx = getRandomInt(0, availableRunes.length);
        runes.push(availableRunes[idx]);
        availableRunes.splice(idx, 1);
    }

    // Build description
    let description = `${RARITY_NAMES[rarity]} ${slot}`;
    if (baseAttack > 0) description += ` | +${baseAttack} ATK`;
    if (baseDefense > 0) description += ` | +${baseDefense} DEF`;
    runes.forEach(r => {
        description += ` | ${r.description}`;
    });

    return {
        id: `equip_${++equipmentIdCounter}`,
        name: `${prefix} ${base.name}`,
        slot,
        rarity,
        baseAttack,
        baseDefense,
        runes,
        description
    };
}

export function generateRandomEquipment(floor: number): Equipment {
    const slots = [EquipSlot.Weapon, EquipSlot.Armor, EquipSlot.Helmet, EquipSlot.Boots, EquipSlot.Accessory];
    return generateEquipment(slots[getRandomInt(0, slots.length)], floor);
}

// Material types for crafting
export const MaterialType = {
    IronOre: 'iron_ore',
    GoldOre: 'gold_ore',
    Crystal: 'crystal',
    Leather: 'leather',
    Cloth: 'cloth',
    RuneStone: 'rune_stone',
    DragonScale: 'dragon_scale',
    DemonHeart: 'demon_heart'
} as const;

export type MaterialType = typeof MaterialType[keyof typeof MaterialType];

export interface Material {
    type: MaterialType;
    name: string;
    color: string;
    rarity: Rarity;
}

export const MATERIALS: Record<MaterialType, Material> = {
    [MaterialType.IronOre]: { type: MaterialType.IronOre, name: 'Iron Ore', color: '#777', rarity: Rarity.Common },
    [MaterialType.GoldOre]: { type: MaterialType.GoldOre, name: 'Gold Ore', color: '#fd0', rarity: Rarity.Uncommon },
    [MaterialType.Crystal]: { type: MaterialType.Crystal, name: 'Crystal', color: '#aef', rarity: Rarity.Rare },
    [MaterialType.Leather]: { type: MaterialType.Leather, name: 'Leather', color: '#842', rarity: Rarity.Common },
    [MaterialType.Cloth]: { type: MaterialType.Cloth, name: 'Cloth', color: '#eee', rarity: Rarity.Common },
    [MaterialType.RuneStone]: { type: MaterialType.RuneStone, name: 'Rune Stone', color: '#a0f', rarity: Rarity.Epic },
    [MaterialType.DragonScale]: { type: MaterialType.DragonScale, name: 'Dragon Scale', color: '#f44', rarity: Rarity.Epic },
    [MaterialType.DemonHeart]: { type: MaterialType.DemonHeart, name: 'Demon Heart', color: '#800', rarity: Rarity.Legendary },
};

// Crafting recipes
export interface CraftingRecipe {
    id: string;
    name: string;
    materials: { type: MaterialType; count: number }[];
    resultSlot: EquipSlot;
    resultRarity: Rarity;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
    {
        id: 'iron_sword',
        name: 'Iron Sword',
        materials: [{ type: MaterialType.IronOre, count: 3 }],
        resultSlot: EquipSlot.Weapon,
        resultRarity: Rarity.Common
    },
    {
        id: 'leather_armor',
        name: 'Leather Armor',
        materials: [{ type: MaterialType.Leather, count: 4 }],
        resultSlot: EquipSlot.Armor,
        resultRarity: Rarity.Common
    },
    {
        id: 'gold_ring',
        name: 'Gold Ring',
        materials: [{ type: MaterialType.GoldOre, count: 2 }],
        resultSlot: EquipSlot.Accessory,
        resultRarity: Rarity.Uncommon
    },
    {
        id: 'crystal_staff',
        name: 'Crystal Staff',
        materials: [{ type: MaterialType.Crystal, count: 2 }, { type: MaterialType.IronOre, count: 1 }],
        resultSlot: EquipSlot.Weapon,
        resultRarity: Rarity.Rare
    },
    {
        id: 'runic_blade',
        name: 'Runic Blade',
        materials: [{ type: MaterialType.RuneStone, count: 1 }, { type: MaterialType.IronOre, count: 3 }],
        resultSlot: EquipSlot.Weapon,
        resultRarity: Rarity.Epic
    },
    {
        id: 'dragon_armor',
        name: 'Dragon Armor',
        materials: [{ type: MaterialType.DragonScale, count: 3 }, { type: MaterialType.Leather, count: 2 }],
        resultSlot: EquipSlot.Armor,
        resultRarity: Rarity.Epic
    },
    {
        id: 'demon_blade',
        name: 'Demon Blade',
        materials: [{ type: MaterialType.DemonHeart, count: 1 }, { type: MaterialType.RuneStone, count: 2 }],
        resultSlot: EquipSlot.Weapon,
        resultRarity: Rarity.Legendary
    },
];

// Chest class for dungeon loot
export class Chest {
    x: number;
    y: number;
    opened: boolean = false;
    contents: { equipment?: Equipment; materials: { type: MaterialType; count: number }[]; gold: number };

    constructor(x: number, y: number, floor: number) {
        this.x = x;
        this.y = y;

        // Generate contents
        const hasEquipment = Math.random() < 0.4;
        const materialCount = getRandomInt(1, 4);
        const gold = getRandomInt(10, 30) * floor;

        const materials: { type: MaterialType; count: number }[] = [];
        const matTypes = Object.values(MaterialType);
        for (let i = 0; i < materialCount; i++) {
            // Weight toward common materials
            let matType: MaterialType;
            const roll = Math.random();
            if (roll < 0.5) {
                matType = [MaterialType.IronOre, MaterialType.Leather, MaterialType.Cloth][getRandomInt(0, 3)];
            } else if (roll < 0.8) {
                matType = [MaterialType.GoldOre, MaterialType.Crystal][getRandomInt(0, 2)];
            } else if (roll < 0.95) {
                matType = [MaterialType.RuneStone, MaterialType.DragonScale][getRandomInt(0, 2)];
            } else {
                matType = MaterialType.DemonHeart;
            }

            const existing = materials.find(m => m.type === matType);
            if (existing) {
                existing.count++;
            } else {
                materials.push({ type: matType, count: 1 });
            }
        }

        this.contents = {
            equipment: hasEquipment ? generateRandomEquipment(floor) : undefined,
            materials,
            gold
        };
    }
}

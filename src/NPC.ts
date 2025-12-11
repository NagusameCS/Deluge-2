// ============================================
// NPC SYSTEM - Traders and NPCs
// ============================================

import type { Player } from './Entity';
import { MaterialType, MATERIALS } from './Equipment';

// NPC Types
export type NPCType = 'trader' | 'soul_trader' | 'healer' | 'sage' | 'blacksmith';

export interface TraderItem {
    type: 'material' | 'heal' | 'mana' | 'stat_boost';
    materialType?: MaterialType;
    value: number;
    cost: number;
    name: string;
    description: string;
}

export interface NPC {
    x: number;
    y: number;
    type: NPCType;
    name: string;
    char: string;
    color: string;
    dialogue: string[];
    inventory: TraderItem[];
    interacted: boolean;
}

// NPC Dialogues
const TRADER_DIALOGUES = [
    "Welcome, adventurer! I've got rare materials for sale.",
    "Looking for crafting supplies? You've come to the right place!",
    "My wares are the finest in the dungeon!",
    "Buy something, or move along...",
];

const SOUL_TRADER_DIALOGUES = [
    "I deal in souls and skills... For a price.",
    "Wish to reallocate your power? It'll cost you.",
    "Your potential is... malleable. Let me reshape it.",
    "Gold for growth. A fair trade, wouldn't you say?",
];

const HEALER_DIALOGUES = [
    "You look weary. Let me restore your vitality.",
    "The light shall mend your wounds.",
    "Rest here a moment, brave one.",
];

const SAGE_DIALOGUES = [
    "Knowledge is power, young one.",
    "I sense great potential within you.",
    "The deeper you go, the stronger they become...",
    "Each floor has its own challenges. Prepare wisely.",
];

const BLACKSMITH_DIALOGUES = [
    "Need something sharpened? Or perhaps repaired?",
    "I can enhance your gear... for a price.",
    "Quality craftsmanship takes quality materials!",
];

// Generate trader inventory based on floor
export function generateTraderInventory(floor: number): TraderItem[] {
    const items: TraderItem[] = [];
    const baseCost = 50 + floor * 25;

    // Always offer some healing
    items.push({
        type: 'heal',
        value: 30 + floor * 5,
        cost: baseCost,
        name: 'Health Potion',
        description: `Restores ${30 + floor * 5} HP`
    });

    items.push({
        type: 'mana',
        value: 20 + floor * 3,
        cost: Math.floor(baseCost * 0.8),
        name: 'Mana Potion',
        description: `Restores ${20 + floor * 3} Mana`
    });

    // Materials based on floor
    const materialPool: MaterialType[] = [];
    if (floor >= 1) materialPool.push(MaterialType.IronOre, MaterialType.Leather, MaterialType.Cloth);
    if (floor >= 2) materialPool.push(MaterialType.GoldOre, MaterialType.Crystal);
    if (floor >= 3) materialPool.push(MaterialType.RuneStone, MaterialType.DragonScale);
    if (floor >= 4) materialPool.push(MaterialType.DemonHeart);

    // Add 2-4 random materials
    const numMaterials = 2 + Math.floor(Math.random() * 3);
    const shuffled = materialPool.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numMaterials, shuffled.length); i++) {
        const matType = shuffled[i];
        const mat = MATERIALS[matType];
        items.push({
            type: 'material',
            materialType: matType,
            value: 1,
            cost: mat.rarity * 30 + floor * 10,
            name: mat.name,
            description: `Crafting material`
        });
    }

    return items;
}

// Soul Trader - allows skill reallocation
export interface SkillReallocation {
    from: 'hp' | 'mana' | 'attack' | 'defense';
    to: 'hp' | 'mana' | 'attack' | 'defense';
    cost: number;
    fromAmount: number;
    toAmount: number;
}

export function getSoulTraderOptions(floor: number): SkillReallocation[] {
    const baseCost = 100 + floor * 50;
    return [
        { from: 'hp', to: 'attack', cost: baseCost, fromAmount: 10, toAmount: 2 },
        { from: 'hp', to: 'defense', cost: baseCost, fromAmount: 10, toAmount: 1 },
        { from: 'mana', to: 'attack', cost: baseCost, fromAmount: 10, toAmount: 2 },
        { from: 'mana', to: 'defense', cost: baseCost, fromAmount: 10, toAmount: 1 },
        { from: 'attack', to: 'hp', cost: baseCost, fromAmount: 2, toAmount: 10 },
        { from: 'attack', to: 'mana', cost: baseCost, fromAmount: 2, toAmount: 10 },
        { from: 'defense', to: 'hp', cost: baseCost, fromAmount: 1, toAmount: 10 },
        { from: 'defense', to: 'mana', cost: baseCost, fromAmount: 1, toAmount: 10 },
    ];
}

export function applySkillReallocation(player: Player, option: SkillReallocation): boolean {
    if (player.inventory.gold < option.cost) return false;

    // Check if player has enough of the 'from' stat
    switch (option.from) {
        case 'hp':
            if (player.baseStats.maxHp < option.fromAmount + 20) return false; // Keep minimum 20
            player.baseStats.maxHp -= option.fromAmount;
            break;
        case 'mana':
            if (player.baseStats.maxMana < option.fromAmount + 10) return false;
            player.baseStats.maxMana -= option.fromAmount;
            break;
        case 'attack':
            if (player.baseStats.attack < option.fromAmount + 3) return false;
            player.baseStats.attack -= option.fromAmount;
            break;
        case 'defense':
            if (player.baseStats.defense < option.fromAmount + 1) return false;
            player.baseStats.defense -= option.fromAmount;
            break;
    }

    // Apply the 'to' stat
    switch (option.to) {
        case 'hp':
            player.baseStats.maxHp += option.toAmount;
            break;
        case 'mana':
            player.baseStats.maxMana += option.toAmount;
            break;
        case 'attack':
            player.baseStats.attack += option.toAmount;
            break;
        case 'defense':
            player.baseStats.defense += option.toAmount;
            break;
    }

    player.inventory.gold -= option.cost;
    player.recalculateStats();
    return true;
}

// Create NPC for a floor
export function createNPC(x: number, y: number, type: NPCType, floor: number): NPC {
    let name: string;
    let char: string;
    let color: string;
    let dialogue: string[];
    let inventory: TraderItem[] = [];

    switch (type) {
        case 'trader':
            name = ['Merchant Marco', 'Trader Tess', 'Vendor Vic', 'Peddler Pete'][Math.floor(Math.random() * 4)];
            char = '$';
            color = '#ffa500';
            dialogue = TRADER_DIALOGUES;
            inventory = generateTraderInventory(floor);
            break;
        case 'soul_trader':
            name = ['Soul Weaver', 'The Exchanger', 'Spirit Broker', 'Essence Dealer'][Math.floor(Math.random() * 4)];
            char = '§';
            color = '#9932cc';
            dialogue = SOUL_TRADER_DIALOGUES;
            break;
        case 'healer':
            name = ['Sister Clara', 'Brother Aldric', 'The Medic', 'Priestess Luna'][Math.floor(Math.random() * 4)];
            char = '+';
            color = '#98fb98';
            dialogue = HEALER_DIALOGUES;
            inventory = [{
                type: 'heal',
                value: Math.floor(50 + floor * 10),
                cost: 0, // Free healing!
                name: 'Blessing',
                description: 'Free restoration once per floor'
            }];
            break;
        case 'sage':
            name = ['Elder Theron', 'Wise Morwen', 'The Oracle', 'Seer Zara'][Math.floor(Math.random() * 4)];
            char = '?';
            color = '#87ceeb';
            dialogue = SAGE_DIALOGUES;
            break;
        case 'blacksmith':
            name = ['Smith Gorran', 'Forgemaster Hilda', 'The Artificer'][Math.floor(Math.random() * 3)];
            char = '&';
            color = '#cd853f';
            dialogue = BLACKSMITH_DIALOGUES;
            inventory = generateTraderInventory(floor);
            break;
    }

    return {
        x, y, type, name, char, color, dialogue, inventory, interacted: false
    };
}

// Generate NPCs for a floor (one trader type + maybe others)
export function generateFloorNPCs(floor: number, rooms: { center: () => { x: number, y: number } }[]): NPC[] {
    const npcs: NPC[] = [];

    if (rooms.length < 3) return npcs;

    // Always spawn a trader in a middle room
    const traderRoomIndex = Math.floor(rooms.length / 3) + Math.floor(Math.random() * Math.floor(rooms.length / 3));
    const traderRoom = rooms[Math.min(traderRoomIndex, rooms.length - 2)];
    const traderPos = traderRoom.center();
    npcs.push(createNPC(traderPos.x + 1, traderPos.y, 'trader', floor));

    // Always spawn a soul trader in a different room
    const soulRoomIndex = Math.floor(rooms.length * 2 / 3) + Math.floor(Math.random() * Math.floor(rooms.length / 4));
    const soulRoom = rooms[Math.min(soulRoomIndex, rooms.length - 2)];
    const soulPos = soulRoom.center();
    npcs.push(createNPC(soulPos.x - 1, soulPos.y, 'soul_trader', floor));

    // Chance for additional NPCs
    if (Math.random() < 0.5 && rooms.length > 5) {
        const extraTypes: NPCType[] = ['healer', 'sage', 'blacksmith'];
        const extraType = extraTypes[Math.floor(Math.random() * extraTypes.length)];
        const extraRoomIndex = 1 + Math.floor(Math.random() * (rooms.length - 3));
        const extraRoom = rooms[extraRoomIndex];
        const extraPos = extraRoom.center();
        npcs.push(createNPC(extraPos.x, extraPos.y + 1, extraType, floor));
    }

    return npcs;
}

// Get dialogue line
export function getNPCDialogue(npc: NPC): string {
    return npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
}

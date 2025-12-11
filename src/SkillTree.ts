// ============================================
// SKILL TREE SYSTEM - Class-based progression
// ============================================

export interface SkillNode {
    id: string;
    name: string;
    description: string;
    icon: string; // Single character icon
    tier: number; // 1-5
    cost: number; // Skill points required
    maxRanks: number;
    currentRanks: number;
    requires: string[]; // Prerequisite skill IDs
    effect: SkillEffect;
}

export interface SkillEffect {
    type: 'stat_boost' | 'ability_unlock' | 'passive' | 'combat_modifier';
    stat?: string;
    value?: number;
    valuePerRank?: number;
    abilityId?: string;
    passiveId?: string;
}

export interface SkillTree {
    classId: string;
    name: string;
    color: string;
    nodes: SkillNode[];
}

// ============================================
// WARRIOR SKILL TREE
// ============================================
export const WARRIOR_SKILL_TREE: SkillTree = {
    classId: 'warrior',
    name: 'Warrior',
    color: '#a00',
    nodes: [
        // Tier 1
        { id: 'w_vitality1', name: 'Vitality I', description: '+15 Max HP', icon: '♥', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'maxHp', valuePerRank: 15 } },
        { id: 'w_strength1', name: 'Strength I', description: '+2 Attack', icon: '⚔', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'attack', valuePerRank: 2 } },
        { id: 'w_armor1', name: 'Armor I', description: '+1 Defense', icon: '🛡', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'defense', valuePerRank: 1 } },
        // Tier 2
        { id: 'w_berserk', name: 'Berserker', description: '+5% damage when below 50% HP', icon: '💢', tier: 2, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['w_strength1'], effect: { type: 'passive', passiveId: 'berserk' } },
        { id: 'w_ironwall', name: 'Iron Wall', description: 'Guard blocks 50% more damage', icon: '🧱', tier: 2, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['w_armor1'], effect: { type: 'combat_modifier', passiveId: 'iron_wall' } },
        { id: 'w_vitality2', name: 'Vitality II', description: '+25 Max HP', icon: '♥', tier: 2, cost: 2, maxRanks: 2, currentRanks: 0, requires: ['w_vitality1'], effect: { type: 'stat_boost', stat: 'maxHp', valuePerRank: 25 } },
        // Tier 3
        { id: 'w_cleave', name: 'Whirlwind', description: 'Unlock AoE attack', icon: '🌀', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['w_berserk'], effect: { type: 'ability_unlock', abilityId: 'whirlwind' } },
        { id: 'w_taunt', name: 'Taunt', description: 'Force enemy to attack you', icon: '📣', tier: 3, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['w_ironwall'], effect: { type: 'ability_unlock', abilityId: 'taunt' } },
        { id: 'w_regen', name: 'Battle Recovery', description: 'Heal 2 HP per turn in combat', icon: '💚', tier: 3, cost: 3, maxRanks: 2, currentRanks: 0, requires: ['w_vitality2'], effect: { type: 'passive', passiveId: 'combat_regen', valuePerRank: 2 } },
        // Tier 4
        { id: 'w_execute', name: 'Executioner', description: '+50% damage to enemies below 25% HP', icon: '⚰', tier: 4, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['w_cleave'], effect: { type: 'passive', passiveId: 'execute' } },
        { id: 'w_fortress', name: 'Fortress', description: 'Immune to stun', icon: '🏰', tier: 4, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['w_taunt', 'w_regen'], effect: { type: 'passive', passiveId: 'stun_immune' } },
        // Tier 5 (Ultimate)
        { id: 'w_warlord', name: 'Warlord', description: '+20% all damage, +50 HP', icon: '👑', tier: 5, cost: 5, maxRanks: 1, currentRanks: 0, requires: ['w_execute', 'w_fortress'], effect: { type: 'stat_boost', stat: 'warlord', value: 1 } },
    ]
};

// ============================================
// MAGE SKILL TREE
// ============================================
export const MAGE_SKILL_TREE: SkillTree = {
    classId: 'mage',
    name: 'Mage',
    color: '#a0f',
    nodes: [
        // Tier 1
        { id: 'm_intellect1', name: 'Intellect I', description: '+10 Max Mana', icon: '🔮', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'maxMana', valuePerRank: 10 } },
        { id: 'm_spellpower1', name: 'Spell Power I', description: '+10% spell damage', icon: '✨', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'spellPower', valuePerRank: 10 } },
        { id: 'm_focus1', name: 'Focus I', description: '+3% crit chance', icon: '🎯', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'critChance', valuePerRank: 0.03 } },
        // Tier 2
        { id: 'm_pyroblast', name: 'Pyroblast', description: 'Unlock powerful fire spell', icon: '🔥', tier: 2, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['m_spellpower1'], effect: { type: 'ability_unlock', abilityId: 'pyroblast' } },
        { id: 'm_frostbolt', name: 'Frost Nova', description: 'Freeze all enemies 1 turn', icon: '❄', tier: 2, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['m_intellect1'], effect: { type: 'ability_unlock', abilityId: 'frost_nova' } },
        { id: 'm_manaregen', name: 'Mana Flow', description: '+2 mana regen per turn', icon: '💧', tier: 2, cost: 2, maxRanks: 2, currentRanks: 0, requires: ['m_intellect1'], effect: { type: 'passive', passiveId: 'mana_regen', valuePerRank: 2 } },
        // Tier 3
        { id: 'm_chain', name: 'Chain Lightning', description: 'Lightning bounces to nearby enemies', icon: '⚡', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['m_pyroblast'], effect: { type: 'ability_unlock', abilityId: 'chain_lightning' } },
        { id: 'm_iceblock', name: 'Ice Block', description: 'Become invulnerable 1 turn', icon: '🧊', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['m_frostbolt'], effect: { type: 'ability_unlock', abilityId: 'ice_block' } },
        { id: 'm_arcane', name: 'Arcane Mastery', description: 'Spells cost 20% less mana', icon: '📘', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['m_manaregen'], effect: { type: 'passive', passiveId: 'mana_efficiency' } },
        // Tier 4
        { id: 'm_meteor', name: 'Meteor Strike', description: 'Devastating AoE fire attack', icon: '☄', tier: 4, cost: 4, maxRanks: 1, currentRanks: 0, requires: ['m_chain'], effect: { type: 'ability_unlock', abilityId: 'meteor' } },
        { id: 'm_barrier', name: 'Mana Barrier', description: 'Damage absorbed by mana first', icon: '🛡', tier: 4, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['m_iceblock', 'm_arcane'], effect: { type: 'passive', passiveId: 'mana_barrier' } },
        // Tier 5 (Ultimate)
        { id: 'm_archmage', name: 'Archmage', description: 'All spells +50% damage, +30 mana', icon: '🧙', tier: 5, cost: 5, maxRanks: 1, currentRanks: 0, requires: ['m_meteor', 'm_barrier'], effect: { type: 'stat_boost', stat: 'archmage', value: 1 } },
    ]
};

// ============================================
// ROGUE SKILL TREE
// ============================================
export const ROGUE_SKILL_TREE: SkillTree = {
    classId: 'rogue',
    name: 'Rogue',
    color: '#333',
    nodes: [
        // Tier 1
        { id: 'r_agility1', name: 'Agility I', description: '+5% dodge chance', icon: '💨', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'dodgeChance', valuePerRank: 0.05 } },
        { id: 'r_precision1', name: 'Precision I', description: '+5% crit chance', icon: '🎯', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'critChance', valuePerRank: 0.05 } },
        { id: 'r_cunning1', name: 'Cunning I', description: '+3 Attack', icon: '🗡', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'attack', valuePerRank: 3 } },
        // Tier 2
        { id: 'r_shadowstep', name: 'Shadow Step', description: 'Teleport behind enemy', icon: '👤', tier: 2, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['r_agility1'], effect: { type: 'ability_unlock', abilityId: 'shadowstep' } },
        { id: 'r_cripple', name: 'Crippling Blow', description: 'Slow enemy by 50%', icon: '🦵', tier: 2, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['r_cunning1'], effect: { type: 'ability_unlock', abilityId: 'cripple' } },
        { id: 'r_critdmg', name: 'Lethality', description: '+25% crit damage', icon: '💀', tier: 2, cost: 2, maxRanks: 2, currentRanks: 0, requires: ['r_precision1'], effect: { type: 'stat_boost', stat: 'critDamage', valuePerRank: 0.25 } },
        // Tier 3
        { id: 'r_vanish', name: 'Vanish', description: 'Become invisible, next attack crits', icon: '🌑', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['r_shadowstep'], effect: { type: 'ability_unlock', abilityId: 'vanish' } },
        { id: 'r_venomous', name: 'Venomous Blades', description: 'All attacks apply poison', icon: '🐍', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['r_cripple'], effect: { type: 'passive', passiveId: 'venomous' } },
        { id: 'r_evasion', name: 'Evasion', description: '100% dodge for 2 turns (once per combat)', icon: '💫', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['r_critdmg'], effect: { type: 'ability_unlock', abilityId: 'evasion' } },
        // Tier 4
        { id: 'r_deathmark', name: 'Death Mark', description: 'Mark enemy, +100% damage for 3 turns', icon: '☠', tier: 4, cost: 4, maxRanks: 1, currentRanks: 0, requires: ['r_vanish', 'r_venomous'], effect: { type: 'ability_unlock', abilityId: 'death_mark' } },
        { id: 'r_reflexes', name: 'Lightning Reflexes', description: 'Auto-dodge first attack each combat', icon: '⚡', tier: 4, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['r_evasion'], effect: { type: 'passive', passiveId: 'auto_dodge' } },
        // Tier 5 (Ultimate)
        { id: 'r_shadowlord', name: 'Shadow Lord', description: '+30% crit, +30% dodge, +50% crit damage', icon: '🌑', tier: 5, cost: 5, maxRanks: 1, currentRanks: 0, requires: ['r_deathmark', 'r_reflexes'], effect: { type: 'stat_boost', stat: 'shadowlord', value: 1 } },
    ]
};

// ============================================
// ADVENTURER (DEFAULT) SKILL TREE
// ============================================
export const ADVENTURER_SKILL_TREE: SkillTree = {
    classId: 'default_player',
    name: 'Adventurer',
    color: '#4af',
    nodes: [
        // Tier 1 - Jack of all trades
        { id: 'a_hardy1', name: 'Hardy', description: '+10 Max HP', icon: '♥', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'maxHp', valuePerRank: 10 } },
        { id: 'a_quick1', name: 'Quick', description: '+3% dodge', icon: '💨', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'dodgeChance', valuePerRank: 0.03 } },
        { id: 'a_strong1', name: 'Strong', description: '+2 Attack', icon: '💪', tier: 1, cost: 1, maxRanks: 3, currentRanks: 0, requires: [], effect: { type: 'stat_boost', stat: 'attack', valuePerRank: 2 } },
        // Tier 2
        { id: 'a_survivor', name: 'Survivor', description: 'Heal 5 HP when entering a room', icon: '🏃', tier: 2, cost: 2, maxRanks: 2, currentRanks: 0, requires: ['a_hardy1'], effect: { type: 'passive', passiveId: 'room_heal', valuePerRank: 5 } },
        { id: 'a_lucky', name: 'Lucky', description: '+10% gold and XP', icon: '🍀', tier: 2, cost: 2, maxRanks: 2, currentRanks: 0, requires: ['a_quick1'], effect: { type: 'stat_boost', stat: 'xpBonus', valuePerRank: 0.1 } },
        { id: 'a_fighter', name: 'Fighter', description: '+3% crit chance', icon: '⚔', tier: 2, cost: 2, maxRanks: 2, currentRanks: 0, requires: ['a_strong1'], effect: { type: 'stat_boost', stat: 'critChance', valuePerRank: 0.03 } },
        // Tier 3
        { id: 'a_secondwind', name: 'Second Wind', description: 'Survive fatal blow once per floor', icon: '💗', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['a_survivor'], effect: { type: 'passive', passiveId: 'second_wind' } },
        { id: 'a_treasure', name: 'Treasure Hunter', description: 'Find more items', icon: '💰', tier: 3, cost: 2, maxRanks: 1, currentRanks: 0, requires: ['a_lucky'], effect: { type: 'passive', passiveId: 'more_loot' } },
        { id: 'a_combo', name: 'Combo Master', description: '+1 combo point per attack', icon: '🔄', tier: 3, cost: 3, maxRanks: 1, currentRanks: 0, requires: ['a_fighter'], effect: { type: 'passive', passiveId: 'combo_master' } },
        // Tier 4
        { id: 'a_adapt', name: 'Adapt', description: '+10% all stats', icon: '🔄', tier: 4, cost: 4, maxRanks: 1, currentRanks: 0, requires: ['a_secondwind', 'a_treasure', 'a_combo'], effect: { type: 'stat_boost', stat: 'all_stats', value: 0.1 } },
        // Tier 5
        { id: 'a_hero', name: 'Hero', description: 'All stats +20%, unlock all basic abilities', icon: '⭐', tier: 5, cost: 5, maxRanks: 1, currentRanks: 0, requires: ['a_adapt'], effect: { type: 'stat_boost', stat: 'hero', value: 1 } },
    ]
};

// Map of all skill trees by class ID
export const SKILL_TREES: Map<string, SkillTree> = new Map([
    ['warrior', WARRIOR_SKILL_TREE],
    ['mage', MAGE_SKILL_TREE],
    ['rogue', ROGUE_SKILL_TREE],
    ['default_player', ADVENTURER_SKILL_TREE],
]);

// ============================================
// MULTICLASS SYSTEM
// ============================================
export interface MulticlassData {
    primaryClass: string;
    secondaryClass: string | null;
    primarySkills: Map<string, number>; // skillId -> ranks
    secondarySkills: Map<string, number>;
    multiclassLevel: number; // Level at which multiclassing occurred
}

export function canMulticlass(level: number, currentMulticlass: MulticlassData | null): boolean {
    // Can multiclass at level 25 if not already multiclassed
    return level >= 25 && (!currentMulticlass || currentMulticlass.secondaryClass === null);
}

export function getAvailableMulticlasses(currentClass: string): string[] {
    const allClasses = ['warrior', 'mage', 'rogue', 'default_player'];
    return allClasses.filter(c => c !== currentClass);
}

export function calculateSkillBonuses(multiclass: MulticlassData): Map<string, number> {
    const bonuses = new Map<string, number>();

    // Process primary class skills
    const primaryTree = SKILL_TREES.get(multiclass.primaryClass);
    if (primaryTree) {
        for (const [skillId, ranks] of multiclass.primarySkills) {
            const node = primaryTree.nodes.find(n => n.id === skillId);
            if (node && node.effect.stat) {
                const value = (node.effect.valuePerRank || node.effect.value || 0) * ranks;
                bonuses.set(node.effect.stat, (bonuses.get(node.effect.stat) || 0) + value);
            }
        }
    }

    // Process secondary class skills (if multiclassed)
    if (multiclass.secondaryClass) {
        const secondaryTree = SKILL_TREES.get(multiclass.secondaryClass);
        if (secondaryTree) {
            for (const [skillId, ranks] of multiclass.secondarySkills) {
                const node = secondaryTree.nodes.find(n => n.id === skillId);
                if (node && node.effect.stat) {
                    // Secondary class skills are 75% effective
                    const value = (node.effect.valuePerRank || node.effect.value || 0) * ranks * 0.75;
                    bonuses.set(node.effect.stat, (bonuses.get(node.effect.stat) || 0) + value);
                }
            }
        }
    }

    return bonuses;
}

export function getUnlockedAbilities(multiclass: MulticlassData): string[] {
    const abilities: string[] = [];

    const processTree = (tree: SkillTree, skills: Map<string, number>) => {
        for (const [skillId, ranks] of skills) {
            if (ranks > 0) {
                const node = tree.nodes.find(n => n.id === skillId);
                if (node && node.effect.type === 'ability_unlock' && node.effect.abilityId) {
                    abilities.push(node.effect.abilityId);
                }
            }
        }
    };

    const primaryTree = SKILL_TREES.get(multiclass.primaryClass);
    if (primaryTree) processTree(primaryTree, multiclass.primarySkills);

    if (multiclass.secondaryClass) {
        const secondaryTree = SKILL_TREES.get(multiclass.secondaryClass);
        if (secondaryTree) processTree(secondaryTree, multiclass.secondarySkills);
    }

    return abilities;
}

export function getActivePassives(multiclass: MulticlassData): string[] {
    const passives: string[] = [];

    const processTree = (tree: SkillTree, skills: Map<string, number>) => {
        for (const [skillId, ranks] of skills) {
            if (ranks > 0) {
                const node = tree.nodes.find(n => n.id === skillId);
                if (node && node.effect.type === 'passive' && node.effect.passiveId) {
                    passives.push(node.effect.passiveId);
                }
            }
        }
    };

    const primaryTree = SKILL_TREES.get(multiclass.primaryClass);
    if (primaryTree) processTree(primaryTree, multiclass.primarySkills);

    if (multiclass.secondaryClass) {
        const secondaryTree = SKILL_TREES.get(multiclass.secondaryClass);
        if (secondaryTree) processTree(secondaryTree, multiclass.secondarySkills);
    }

    return passives;
}

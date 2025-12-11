// ============================================
// BIOME THEMES - Visual themes for different floor ranges
// ============================================

export interface BiomeTheme {
    name: string;
    wallColor: string;
    wallShadow: string;
    floorColor: string;
    floorAccent: string;
    fogColor: string;
    ambientLight: number; // 0-1, affects explored but not visible tiles
    particleColor: string;
    combatBgColor: string;
    combatAccent: string;
}

export const BIOMES: Record<string, BiomeTheme> = {
    dungeon: {
        name: 'Stone Dungeon',
        wallColor: '#888',
        wallShadow: 'rgba(0,0,0,0.2)',
        floorColor: '#222',
        floorAccent: '#333',
        fogColor: '#111',
        ambientLight: 0.5,
        particleColor: '#666',
        combatBgColor: 'rgba(15, 15, 25, 0.95)',
        combatAccent: '#4af'
    },
    cave: {
        name: 'Crystal Caves',
        wallColor: '#5a4a6a',
        wallShadow: 'rgba(100,50,150,0.3)',
        floorColor: '#1a1520',
        floorAccent: '#2a2535',
        fogColor: '#0a0510',
        ambientLight: 0.4,
        particleColor: '#a0f',
        combatBgColor: 'rgba(20, 10, 30, 0.95)',
        combatAccent: '#a0f'
    },
    forest: {
        name: 'Overgrown Ruins',
        wallColor: '#3a5a3a',
        wallShadow: 'rgba(0,50,0,0.3)',
        floorColor: '#1a2a1a',
        floorAccent: '#2a3a2a',
        fogColor: '#0a150a',
        ambientLight: 0.6,
        particleColor: '#4f8',
        combatBgColor: 'rgba(10, 25, 15, 0.95)',
        combatAccent: '#4f8'
    },
    ice: {
        name: 'Frozen Depths',
        wallColor: '#8ab4c4',
        wallShadow: 'rgba(100,150,200,0.3)',
        floorColor: '#1a2530',
        floorAccent: '#2a3540',
        fogColor: '#0a1520',
        ambientLight: 0.7,
        particleColor: '#aef',
        combatBgColor: 'rgba(15, 25, 35, 0.95)',
        combatAccent: '#aef'
    },
    fire: {
        name: 'Volcanic Pit',
        wallColor: '#6a3a2a',
        wallShadow: 'rgba(200,50,0,0.3)',
        floorColor: '#2a1510',
        floorAccent: '#3a2520',
        fogColor: '#150a05',
        ambientLight: 0.5,
        particleColor: '#f84',
        combatBgColor: 'rgba(30, 15, 10, 0.95)',
        combatAccent: '#f84'
    },
    void: {
        name: 'The Void',
        wallColor: '#2a2a3a',
        wallShadow: 'rgba(50,50,100,0.4)',
        floorColor: '#0a0a15',
        floorAccent: '#15152a',
        fogColor: '#000005',
        ambientLight: 0.3,
        particleColor: '#55f',
        combatBgColor: 'rgba(5, 5, 20, 0.95)',
        combatAccent: '#55f'
    },
    blood: {
        name: 'Crimson Halls',
        wallColor: '#5a2a2a',
        wallShadow: 'rgba(150,0,0,0.3)',
        floorColor: '#1a0a0a',
        floorAccent: '#2a1515',
        fogColor: '#100505',
        ambientLight: 0.45,
        particleColor: '#f44',
        combatBgColor: 'rgba(25, 10, 10, 0.95)',
        combatAccent: '#f44'
    }
};

// Get biome for a given floor
export function getBiomeForFloor(floor: number): BiomeTheme {
    if (floor <= 3) return BIOMES.dungeon;
    if (floor <= 6) return BIOMES.cave;
    if (floor <= 9) return BIOMES.forest;
    if (floor <= 12) return BIOMES.ice;
    if (floor <= 15) return BIOMES.fire;
    if (floor <= 18) return BIOMES.blood;
    return BIOMES.void;
}

// Get biome name for floor
export function getBiomeName(floor: number): string {
    return getBiomeForFloor(floor).name;
}

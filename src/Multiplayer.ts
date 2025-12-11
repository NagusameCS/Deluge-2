// ============================================
// MULTIPLAYER SYSTEM - Room-based multiplayer
// ============================================

import { getRandomInt } from './utils';

// ============================================
// ROOM SYSTEM
// ============================================

export type MultiplayerMode = 'duel' | 'coop';
export type RoomState = 'waiting' | 'setup' | 'playing' | 'finished';

export interface RoomPlayer {
    id: string;
    name: string;
    ready: boolean;
    stats: DuelStats | null;
    isHost: boolean;
}

export interface DuelStats {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    mana: number;
    maxMana: number;
    speed: number;
    // 50 total points to allocate
    pointsRemaining: number;
}

export interface GameRoom {
    code: string;
    mode: MultiplayerMode;
    state: RoomState;
    players: RoomPlayer[];
    hostId: string;
    maxPlayers: number;
    settings: RoomSettings;
}

export interface RoomSettings {
    duelLevel: number; // For duel mode
    coopFloor: number; // Starting floor for coop
    allowSpectators: boolean;
}

// ============================================
// DUEL COMBAT SYSTEM
// ============================================

export const DuelPhase = {
    StatAllocation: 0,
    Waiting: 1,
    SelectAction: 2,
    Resolution: 3,
    Result: 4,
    Victory: 5
} as const;

export type DuelPhase = typeof DuelPhase[keyof typeof DuelPhase];

export const DuelAction = {
    Strike: 1,
    Guard: 2,
    Feint: 3,
    HeavyStrike: 4,
    Heal: 5,
    Fireball: 6
} as const;

export type DuelAction = typeof DuelAction[keyof typeof DuelAction];

export interface DuelState {
    phase: DuelPhase;
    turn: number;
    player1Stats: DuelStats;
    player2Stats: DuelStats;
    player1Stamina: number;
    player2Stamina: number;
    player1Action: DuelAction | null;
    player2Action: DuelAction | null;
    lastResult: string;
    winnerId: string | null;
}

// ============================================
// MULTIPLAYER MANAGER (Client-side state)
// ============================================

export class MultiplayerManager {
    private ws: WebSocket | null = null;
    private _roomCode: string | null = null;
    private playerId: string;
    private playerName: string;

    // State
    room: GameRoom | null = null;
    duelState: DuelState | null = null;
    connected: boolean = false;
    error: string | null = null;

    // Callbacks
    onRoomUpdate: ((room: GameRoom) => void) | null = null;
    onDuelUpdate: ((state: DuelState) => void) | null = null;
    onError: ((error: string) => void) | null = null;
    onConnect: (() => void) | null = null;
    onDisconnect: (() => void) | null = null;

    constructor() {
        this.playerId = this.generateId();
        this.playerName = `Player${Math.floor(Math.random() * 9999)}`;
    }

    get roomCode(): string | null {
        return this._roomCode;
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    // Connect to multiplayer server
    connect(serverUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);

                this.ws.onopen = () => {
                    this.connected = true;
                    this.onConnect?.();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onclose = () => {
                    this.connected = false;
                    this.onDisconnect?.();
                };

                this.ws.onerror = () => {
                    this.error = 'Connection error';
                    this.onError?.('Connection error');
                    reject(new Error('Connection error'));
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    // For local/offline play simulation
    simulateLocalRoom(mode: MultiplayerMode): GameRoom {
        const code = this.generateRoomCode();
        this.room = {
            code,
            mode,
            state: 'waiting',
            players: [{
                id: this.playerId,
                name: this.playerName,
                ready: false,
                stats: null,
                isHost: true
            }],
            hostId: this.playerId,
            maxPlayers: mode === 'duel' ? 2 : 4,
            settings: {
                duelLevel: 50,
                coopFloor: 1,
                allowSpectators: false
            }
        };
        this._roomCode = code;
        return this.room;
    }

    // Add AI opponent for local duel
    addAIOpponent(): void {
        if (!this.room || this.room.mode !== 'duel') return;

        const aiPlayer: RoomPlayer = {
            id: 'AI_' + this.generateId(),
            name: 'AI Opponent',
            ready: true,
            stats: this.generateAIStats(),
            isHost: false
        };

        this.room.players.push(aiPlayer);
        this.onRoomUpdate?.(this.room);
    }

    private generateAIStats(): DuelStats {
        // AI allocates 50 points with some randomness
        const baseStats: DuelStats = {
            hp: 100,
            maxHp: 100,
            attack: 10,
            defense: 10,
            mana: 50,
            maxMana: 50,
            speed: 10,
            pointsRemaining: 50
        };

        // Distribute points
        const distributions = [
            { hp: 20, attack: 15, defense: 5, mana: 5, speed: 5 },   // Tank
            { hp: 5, attack: 25, defense: 5, mana: 5, speed: 10 },   // Glass cannon
            { hp: 10, attack: 10, defense: 10, mana: 15, speed: 5 }, // Mage
            { hp: 10, attack: 10, defense: 10, mana: 10, speed: 10 } // Balanced
        ];

        const dist = distributions[getRandomInt(0, distributions.length)];
        baseStats.maxHp += dist.hp * 5;
        baseStats.hp = baseStats.maxHp;
        baseStats.attack += dist.attack;
        baseStats.defense += dist.defense;
        baseStats.maxMana += dist.mana * 2;
        baseStats.mana = baseStats.maxMana;
        baseStats.speed += dist.speed;
        baseStats.pointsRemaining = 0;

        return baseStats;
    }

    // Create default duel stats for allocation
    createDefaultDuelStats(): DuelStats {
        return {
            hp: 100,
            maxHp: 100,
            attack: 10,
            defense: 10,
            mana: 50,
            maxMana: 50,
            speed: 10,
            pointsRemaining: 50
        };
    }

    // Allocate a stat point
    allocateStat(stat: 'hp' | 'attack' | 'defense' | 'mana' | 'speed', stats: DuelStats): DuelStats {
        if (stats.pointsRemaining <= 0) return stats;

        const newStats = { ...stats };
        switch (stat) {
            case 'hp':
                newStats.maxHp += 5;
                newStats.hp = newStats.maxHp;
                break;
            case 'attack':
                newStats.attack += 1;
                break;
            case 'defense':
                newStats.defense += 1;
                break;
            case 'mana':
                newStats.maxMana += 2;
                newStats.mana = newStats.maxMana;
                break;
            case 'speed':
                newStats.speed += 1;
                break;
        }
        newStats.pointsRemaining--;
        return newStats;
    }

    // Deallocate a stat point
    deallocateStat(stat: 'hp' | 'attack' | 'defense' | 'mana' | 'speed', stats: DuelStats): DuelStats {
        const base = this.createDefaultDuelStats();
        const newStats = { ...stats };

        let canDeallocate = false;
        switch (stat) {
            case 'hp':
                if (newStats.maxHp > base.maxHp) {
                    newStats.maxHp -= 5;
                    newStats.hp = newStats.maxHp;
                    canDeallocate = true;
                }
                break;
            case 'attack':
                if (newStats.attack > base.attack) {
                    newStats.attack -= 1;
                    canDeallocate = true;
                }
                break;
            case 'defense':
                if (newStats.defense > base.defense) {
                    newStats.defense -= 1;
                    canDeallocate = true;
                }
                break;
            case 'mana':
                if (newStats.maxMana > base.maxMana) {
                    newStats.maxMana -= 2;
                    newStats.mana = newStats.maxMana;
                    canDeallocate = true;
                }
                break;
            case 'speed':
                if (newStats.speed > base.speed) {
                    newStats.speed -= 1;
                    canDeallocate = true;
                }
                break;
        }

        if (canDeallocate) {
            newStats.pointsRemaining++;
        }
        return newStats;
    }

    // Initialize duel state
    initDuelState(player1Stats: DuelStats, player2Stats: DuelStats): DuelState {
        return {
            phase: DuelPhase.SelectAction,
            turn: 1,
            player1Stats: { ...player1Stats },
            player2Stats: { ...player2Stats },
            player1Stamina: 100,
            player2Stamina: 100,
            player1Action: null,
            player2Action: null,
            lastResult: 'Turn 1 - Select your action!',
            winnerId: null
        };
    }

    // Resolve duel actions
    resolveDuelTurn(state: DuelState, p1Action: DuelAction, p2Action: DuelAction): DuelState {
        const newState = { ...state };
        newState.player1Action = p1Action;
        newState.player2Action = p2Action;
        newState.phase = DuelPhase.Resolution;

        const p1 = newState.player1Stats;
        const p2 = newState.player2Stats;

        let p1Damage = 0;
        let p2Damage = 0;
        let message = '';

        // Resolve based on action matchups
        const matchup = this.resolveMatchup(p1Action, p2Action, p1, p2, newState);
        p1Damage = matchup.p1Damage;
        p2Damage = matchup.p2Damage;
        message = matchup.message;

        // Apply damage
        p1.hp = Math.max(0, p1.hp - p1Damage);
        p2.hp = Math.max(0, p2.hp - p2Damage);

        // Regenerate stamina
        newState.player1Stamina = Math.min(100, newState.player1Stamina + 15);
        newState.player2Stamina = Math.min(100, newState.player2Stamina + 15);

        newState.lastResult = message;
        newState.turn++;

        // Check victory
        if (p2.hp <= 0 && p1.hp <= 0) {
            newState.phase = DuelPhase.Victory;
            newState.lastResult = 'DRAW! Both players fell!';
        } else if (p2.hp <= 0) {
            newState.phase = DuelPhase.Victory;
            newState.winnerId = 'player1';
            newState.lastResult = 'VICTORY! Player 1 wins!';
        } else if (p1.hp <= 0) {
            newState.phase = DuelPhase.Victory;
            newState.winnerId = 'player2';
            newState.lastResult = 'DEFEAT! Player 2 wins!';
        } else {
            newState.phase = DuelPhase.Result;
        }

        return newState;
    }

    private resolveMatchup(
        p1Action: DuelAction,
        p2Action: DuelAction,
        p1: DuelStats,
        p2: DuelStats,
        _state: DuelState
    ): { p1Damage: number, p2Damage: number, message: string } {
        let p1Damage = 0;
        let p2Damage = 0;
        let message = '';

        const p1BaseDmg = Math.floor(p1.attack * 1.5);
        const p2BaseDmg = Math.floor(p2.attack * 1.5);

        // Strike vs Strike - both hit
        if (p1Action === DuelAction.Strike && p2Action === DuelAction.Strike) {
            p1Damage = Math.max(1, p2BaseDmg - Math.floor(p1.defense * 0.5));
            p2Damage = Math.max(1, p1BaseDmg - Math.floor(p2.defense * 0.5));
            message = `Clash! Both strike for ${p2Damage} and ${p1Damage} damage!`;
        }
        // Strike vs Guard - guard wins
        else if (p1Action === DuelAction.Strike && p2Action === DuelAction.Guard) {
            p2Damage = Math.floor(p1BaseDmg * 0.2);
            message = `P2 blocks! Only ${p2Damage} chip damage.`;
        }
        else if (p2Action === DuelAction.Strike && p1Action === DuelAction.Guard) {
            p1Damage = Math.floor(p2BaseDmg * 0.2);
            message = `P1 blocks! Only ${p1Damage} chip damage.`;
        }
        // Strike vs Feint - strike wins
        else if (p1Action === DuelAction.Strike && p2Action === DuelAction.Feint) {
            p2Damage = Math.floor(p1BaseDmg * 1.2);
            message = `P1 catches P2's feint! ${p2Damage} damage!`;
        }
        else if (p2Action === DuelAction.Strike && p1Action === DuelAction.Feint) {
            p1Damage = Math.floor(p2BaseDmg * 1.2);
            message = `P2 catches P1's feint! ${p1Damage} damage!`;
        }
        // Guard vs Feint - feint wins
        else if (p1Action === DuelAction.Guard && p2Action === DuelAction.Feint) {
            p1Damage = Math.floor(p2BaseDmg * 0.8);
            message = `P2's feint breaks P1's guard! ${p1Damage} damage!`;
        }
        else if (p2Action === DuelAction.Guard && p1Action === DuelAction.Feint) {
            p2Damage = Math.floor(p1BaseDmg * 0.8);
            message = `P1's feint breaks P2's guard! ${p2Damage} damage!`;
        }
        // Heavy attacks
        else if (p1Action === DuelAction.HeavyStrike) {
            if (p2Action === DuelAction.Guard) {
                p2Damage = Math.floor(p1BaseDmg * 0.5);
                message = `Heavy blocked but chips through! ${p2Damage} damage!`;
            } else {
                p2Damage = Math.floor(p1BaseDmg * 2);
                message = `P1 HEAVY STRIKE! ${p2Damage} massive damage!`;
            }
        }
        else if (p2Action === DuelAction.HeavyStrike) {
            if (p1Action === DuelAction.Guard) {
                p1Damage = Math.floor(p2BaseDmg * 0.5);
                message = `Heavy blocked but chips through! ${p1Damage} damage!`;
            } else {
                p1Damage = Math.floor(p2BaseDmg * 2);
                message = `P2 HEAVY STRIKE! ${p1Damage} massive damage!`;
            }
        }
        // Heal
        else if (p1Action === DuelAction.Heal) {
            const heal = 20 + Math.floor(p1.mana * 0.2);
            p1.hp = Math.min(p1.maxHp, p1.hp + heal);
            p1.mana = Math.max(0, p1.mana - 15);
            message = `P1 heals for ${heal}!`;
            const p2a = p2Action as number;
            if (p2a === DuelAction.Strike || p2a === DuelAction.HeavyStrike) {
                const bonus = p2a === DuelAction.HeavyStrike ? 2 : 1.3;
                p1Damage = Math.floor(p2BaseDmg * bonus);
                message += ` But takes ${p1Damage} damage while casting!`;
            }
        }
        else if (p2Action === DuelAction.Heal) {
            const heal = 20 + Math.floor(p2.mana * 0.2);
            p2.hp = Math.min(p2.maxHp, p2.hp + heal);
            p2.mana = Math.max(0, p2.mana - 15);
            message = `P2 heals for ${heal}!`;
            const p1a = p1Action as number;
            if (p1a === DuelAction.Strike || p1a === DuelAction.HeavyStrike) {
                const bonus = p1a === DuelAction.HeavyStrike ? 2 : 1.3;
                p2Damage = Math.floor(p1BaseDmg * bonus);
                message += ` But takes ${p2Damage} damage while casting!`;
            }
        }
        // Fireball
        else if (p1Action === DuelAction.Fireball) {
            p2Damage = Math.floor(p1BaseDmg * 1.5);
            p1.mana = Math.max(0, p1.mana - 15);
            if (p2Action === DuelAction.Guard) {
                p2Damage = Math.floor(p2Damage * 0.6); // Magic partially ignores guard
            }
            message = `P1 FIREBALL! ${p2Damage} magical damage!`;
        }
        else if (p2Action === DuelAction.Fireball) {
            p1Damage = Math.floor(p2BaseDmg * 1.5);
            p2.mana = Math.max(0, p2.mana - 15);
            if (p1Action === DuelAction.Guard) {
                p1Damage = Math.floor(p1Damage * 0.6);
            }
            message = `P2 FIREBALL! ${p1Damage} magical damage!`;
        }
        // Both guard
        else if (p1Action === DuelAction.Guard && p2Action === DuelAction.Guard) {
            message = 'Both players guard... tension builds!';
        }
        // Both feint
        else if (p1Action === DuelAction.Feint && p2Action === DuelAction.Feint) {
            message = 'Both feint! A careful standoff...';
        }

        return { p1Damage, p2Damage, message };
    }

    // AI selects action
    getAIAction(state: DuelState): DuelAction {
        const aiStats = state.player2Stats;
        const playerStats = state.player1Stats;
        const aiStamina = state.player2Stamina;

        // Low HP - heal if possible
        if (aiStats.hp < aiStats.maxHp * 0.3 && aiStats.mana >= 15) {
            return DuelAction.Heal;
        }

        // Low stamina - guard
        if (aiStamina < 20) {
            return DuelAction.Guard;
        }

        // Player low HP - be aggressive
        if (playerStats.hp < playerStats.maxHp * 0.3) {
            return Math.random() < 0.6 ? DuelAction.HeavyStrike : DuelAction.Strike;
        }

        // Random strategy with weights
        const roll = Math.random();
        if (roll < 0.3) return DuelAction.Strike;
        if (roll < 0.5) return DuelAction.Guard;
        if (roll < 0.65) return DuelAction.Feint;
        if (roll < 0.8) return DuelAction.HeavyStrike;
        if (roll < 0.9 && aiStats.mana >= 15) return DuelAction.Fireball;
        return DuelAction.Strike;
    }

    // Handle messages from server
    private handleMessage(data: unknown) {
        const msg = data as { type: string; payload: unknown };

        switch (msg.type) {
            case 'room_update':
                this.room = msg.payload as GameRoom;
                this.onRoomUpdate?.(this.room);
                break;
            case 'duel_update':
                this.duelState = msg.payload as DuelState;
                this.onDuelUpdate?.(this.duelState);
                break;
            case 'error':
                this.error = msg.payload as string;
                this.onError?.(this.error);
                break;
        }
    }

    // Send message to server
    private send(type: string, payload: unknown) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }

    // Create room
    createRoom(mode: MultiplayerMode) {
        this.send('create_room', { mode, playerId: this.playerId, playerName: this.playerName });
    }

    // Join room
    joinRoom(code: string) {
        this.send('join_room', { code, playerId: this.playerId, playerName: this.playerName });
    }

    // Leave room
    leaveRoom() {
        this.send('leave_room', { playerId: this.playerId });
        this.room = null;
        this._roomCode = null;
    }

    // Set ready state
    setReady(ready: boolean, stats?: DuelStats) {
        this.send('set_ready', { playerId: this.playerId, ready, stats });
    }

    // Submit duel action
    submitDuelAction(action: DuelAction) {
        this.send('duel_action', { playerId: this.playerId, action });
    }

    disconnect() {
        this.ws?.close();
        this.ws = null;
        this.connected = false;
    }

    get isHost(): boolean {
        return this.room?.hostId === this.playerId;
    }

    get currentPlayer(): RoomPlayer | undefined {
        return this.room?.players.find(p => p.id === this.playerId);
    }
}

// Singleton instance
export const multiplayer = new MultiplayerManager();

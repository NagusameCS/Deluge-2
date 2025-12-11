import { Player, Enemy } from './Entity';
import { getRandomInt } from './utils';

// ============================================
// COMBAT SYSTEM - Stance-Based Tactical Combat
// ============================================

export const CombatPhase = {
    SelectAction: 0,    // Player chooses action
    ShowPremonition: 1, // If premonition used, show enemy intent
    Resolution: 2,      // Actions resolve with animation
    Result: 3,          // Show result, wait for next turn
    Victory: 4,
    Defeat: 5
} as const;

export type CombatPhase = typeof CombatPhase[keyof typeof CombatPhase];

export const CombatAction = {
    None: 0,
    Strike: 1,      // Basic attack
    Guard: 2,       // Defensive stance, reduces damage
    Feint: 3,       // Dodge/counter setup
    HeavyStrike: 4, // Strong but slow attack
    Heal: 5,        // Restore HP (uses mana)
    Fireball: 6,    // Magic damage (uses mana)
    Premonition: 7, // See enemy's next move (uses mana)
    Execute: 8      // Combo finisher (requires combo points)
} as const;

export type CombatAction = typeof CombatAction[keyof typeof CombatAction];

export interface CombatActionDef {
    id: CombatAction;
    name: string;
    description: string;
    staminaCost: number;
    manaCost: number;
    baseDamage: number;
    speed: number; // Higher = faster, determines who hits first on clashes
    key: string;   // Keyboard shortcut
}

// Action definitions
export const ACTIONS: Record<CombatAction, CombatActionDef> = {
    [CombatAction.None]: {
        id: CombatAction.None, name: 'Wait', description: 'Do nothing',
        staminaCost: 0, manaCost: 0, baseDamage: 0, speed: 0, key: ''
    },
    [CombatAction.Strike]: {
        id: CombatAction.Strike, name: 'Strike', description: 'Quick attack. Beats Feint, loses to Guard.',
        staminaCost: 15, manaCost: 0, baseDamage: 1.0, speed: 5, key: '1'
    },
    [CombatAction.Guard]: {
        id: CombatAction.Guard, name: 'Guard', description: 'Block attacks. Beats Strike, loses to Feint.',
        staminaCost: 10, manaCost: 0, baseDamage: 0, speed: 3, key: '2'
    },
    [CombatAction.Feint]: {
        id: CombatAction.Feint, name: 'Feint', description: 'Dodge & counter. Beats Guard, loses to Strike.',
        staminaCost: 20, manaCost: 0, baseDamage: 0.5, speed: 7, key: '3'
    },
    [CombatAction.HeavyStrike]: {
        id: CombatAction.HeavyStrike, name: 'Heavy Strike', description: 'Powerful but slow. High risk, high reward.',
        staminaCost: 30, manaCost: 0, baseDamage: 2.0, speed: 2, key: '4'
    },
    [CombatAction.Heal]: {
        id: CombatAction.Heal, name: 'Heal', description: 'Restore 15 HP. Vulnerable while casting.',
        staminaCost: 0, manaCost: 12, baseDamage: 0, speed: 1, key: 'Q'
    },
    [CombatAction.Fireball]: {
        id: CombatAction.Fireball, name: 'Fireball', description: 'Magic attack. Ignores Guard partially.',
        staminaCost: 10, manaCost: 15, baseDamage: 1.8, speed: 4, key: 'W'
    },
    [CombatAction.Premonition]: {
        id: CombatAction.Premonition, name: 'Premonition', description: 'See enemy\'s next move before choosing.',
        staminaCost: 0, manaCost: 8, baseDamage: 0, speed: 10, key: 'E'
    },
    [CombatAction.Execute]: {
        id: CombatAction.Execute, name: 'Execute', description: 'Combo finisher! Requires 3 combo points.',
        staminaCost: 25, manaCost: 0, baseDamage: 3.5, speed: 6, key: 'R'
    }
};

// Result of a combat exchange
export interface CombatResult {
    playerAction: CombatAction;
    enemyAction: CombatAction;
    playerDamage: number;
    enemyDamage: number;
    playerHealed: number;
    outcome: 'player_wins' | 'enemy_wins' | 'clash' | 'neutral';
    message: string;
    criticalHit: boolean;
    comboGained: number;
}

export class CombatSystem {
    player: Player;
    enemy: Enemy;

    phase: CombatPhase = CombatPhase.SelectAction;
    turn: number = 1;

    // Combat resources
    playerStamina: number = 100;
    maxPlayerStamina: number = 100;
    enemyStamina: number = 100;
    maxEnemyStamina: number = 100;

    // Combo system
    comboPoints: number = 0;
    maxComboPoints: number = 3;
    lastPlayerAction: CombatAction = CombatAction.None;

    // Premonition
    premonitionActive: boolean = false;
    enemyIntendedAction: CombatAction = CombatAction.None;

    // Current turn state
    selectedAction: CombatAction | null = null;
    pendingEnemyAction: CombatAction = CombatAction.None;
    lastResult: CombatResult | null = null;

    // Animation/timing
    phaseTimer: number = 0;
    animationProgress: number = 0;

    // Combat log
    log: string[] = [];

    // Visual effects
    effects: CombatEffect[] = [];

    // Enemy AI patterns
    enemyPattern: number[] = [];
    enemyPatternIndex: number = 0;

    constructor(player: Player, enemy: Enemy) {
        this.player = player;
        this.enemy = enemy;

        // Set enemy stamina based on level
        this.maxEnemyStamina = 80 + enemy.stats.level * 10;
        this.enemyStamina = this.maxEnemyStamina;

        // Generate enemy AI pattern (semi-predictable for skilled players)
        this.generateEnemyPattern();

        this.log.push(`⚔️ Combat with ${enemy.name} begins!`);
        this.log.push(`Tip: Use [E] Premonition to see enemy's next move`);
    }

    generateEnemyPattern() {
        // Enemies have tendencies based on their "personality"
        const patterns = [
            [CombatAction.Strike, CombatAction.Strike, CombatAction.Guard], // Aggressive
            [CombatAction.Guard, CombatAction.Feint, CombatAction.Strike],  // Defensive
            [CombatAction.Feint, CombatAction.Strike, CombatAction.Feint],  // Tricky
            [CombatAction.Strike, CombatAction.Guard, CombatAction.HeavyStrike], // Balanced
        ];

        // Pick pattern based on enemy stats
        const patternIndex = this.enemy.stats.level % patterns.length;
        this.enemyPattern = patterns[patternIndex];
    }

    getEnemyAction(): CombatAction {
        // AI decision making with some predictability
        const hp_ratio = this.enemy.stats.hp / this.enemy.stats.maxHp;
        const stamina_ratio = this.enemyStamina / this.maxEnemyStamina;

        // Low stamina = must guard to recover
        if (stamina_ratio < 0.2) {
            return CombatAction.Guard;
        }

        // Low HP = more defensive or desperate heavy strikes
        if (hp_ratio < 0.3) {
            return Math.random() < 0.5 ? CombatAction.HeavyStrike : CombatAction.Guard;
        }

        // Follow pattern with some randomness
        let action: CombatAction = this.enemyPattern[this.enemyPatternIndex % this.enemyPattern.length] as CombatAction;
        this.enemyPatternIndex++;

        // 20% chance to deviate from pattern (keeps it interesting)
        if (Math.random() < 0.2) {
            const options: CombatAction[] = [CombatAction.Strike, CombatAction.Guard, CombatAction.Feint];
            action = options[getRandomInt(0, options.length)];
        }

        // Check if enemy can afford the action
        const actionDef = ACTIONS[action];
        if (actionDef.staminaCost > this.enemyStamina) {
            return CombatAction.Guard; // Default to guard if can't afford
        }

        return action;
    }

    canUseAction(action: CombatAction): boolean {
        const def = ACTIONS[action];

        if (def.staminaCost > this.playerStamina) return false;
        if (def.manaCost > this.player.stats.mana) return false;
        if (action === CombatAction.Execute && this.comboPoints < this.maxComboPoints) return false;

        return true;
    }

    handleInput(key: string) {
        if (this.phase === CombatPhase.Victory || this.phase === CombatPhase.Defeat) {
            return;
        }

        // During result phase, any key advances
        if (this.phase === CombatPhase.Result) {
            this.advanceToNextTurn();
            return;
        }

        // During resolution, can't input
        if (this.phase === CombatPhase.Resolution) {
            return;
        }

        // Handle premonition display phase
        if (this.phase === CombatPhase.ShowPremonition) {
            // Any key continues to action selection with knowledge
            this.phase = CombatPhase.SelectAction;
            return;
        }

        // Selection phase
        if (this.phase === CombatPhase.SelectAction) {
            const upperKey = key.toUpperCase();

            // Find action by key
            for (const actionId of Object.keys(ACTIONS)) {
                const action = ACTIONS[Number(actionId) as CombatAction];
                if (action.key === upperKey || action.key === key) {
                    if (action.id === CombatAction.None) continue;

                    // Special case: Premonition
                    if (action.id === CombatAction.Premonition) {
                        if (this.canUseAction(CombatAction.Premonition)) {
                            this.usePremonition();
                        } else {
                            this.log.push("Not enough mana for Premonition!");
                        }
                        return;
                    }

                    // Try to use the action
                    if (this.canUseAction(action.id)) {
                        this.selectAction(action.id);
                    } else {
                        if (action.staminaCost > this.playerStamina) {
                            this.log.push(`Not enough stamina for ${action.name}!`);
                        } else if (action.manaCost > this.player.stats.mana) {
                            this.log.push(`Not enough mana for ${action.name}!`);
                        } else if (action.id === CombatAction.Execute) {
                            this.log.push(`Need ${this.maxComboPoints} combo points for Execute!`);
                        }
                    }
                    return;
                }
            }
        }
    }

    usePremonition() {
        this.player.stats.mana -= ACTIONS[CombatAction.Premonition].manaCost;
        this.premonitionActive = true;

        // Determine what enemy will do
        this.enemyIntendedAction = this.getEnemyAction();
        // Reset pattern index since we peeked
        this.enemyPatternIndex--;

        this.log.push(`🔮 Premonition: Enemy intends to use ${ACTIONS[this.enemyIntendedAction].name}!`);
        this.phase = CombatPhase.ShowPremonition;

        this.addEffect('premonition', 400, 240, '#a0f');
    }

    selectAction(action: CombatAction) {
        this.selectedAction = action;

        // Determine enemy action (use premonition result if active)
        if (this.premonitionActive) {
            this.pendingEnemyAction = this.enemyIntendedAction;
            this.premonitionActive = false;
        } else {
            this.pendingEnemyAction = this.getEnemyAction();
        }

        // Pay costs
        const actionDef = ACTIONS[action];
        this.playerStamina -= actionDef.staminaCost;
        this.player.stats.mana -= actionDef.manaCost;

        // Enemy pays costs
        const enemyActionDef = ACTIONS[this.pendingEnemyAction];
        this.enemyStamina -= enemyActionDef.staminaCost;

        // Move to resolution
        this.phase = CombatPhase.Resolution;
        this.phaseTimer = 60; // ~1 second at 60fps
        this.animationProgress = 0;
    }

    resolveActions(): CombatResult {
        const playerAction = this.selectedAction!;
        const enemyAction = this.pendingEnemyAction;

        const playerDef = ACTIONS[playerAction];
        const enemyDef = ACTIONS[enemyAction];

        let playerDamage = 0;
        let enemyDamage = 0;
        let playerHealed = 0;
        let outcome: CombatResult['outcome'] = 'neutral';
        let message = '';
        let criticalHit = false;
        let comboGained = 0;

        // Calculate base damages
        const playerBaseDmg = playerDef.baseDamage * this.player.stats.attack;
        const enemyBaseDmg = enemyDef.baseDamage * this.enemy.stats.attack;

        // ========== RESOLUTION MATRIX ==========

        // Handle special actions first
        if (playerAction === CombatAction.Heal) {
            playerHealed = 15 + Math.floor(this.player.stats.level * 2);
            this.player.heal(playerHealed);
            message = `You heal for ${playerHealed} HP!`;
            // Vulnerable while healing - take extra damage
            if (enemyDef.baseDamage > 0) {
                enemyDamage = Math.floor(enemyBaseDmg * 1.5);
                message += ` But take ${enemyDamage} damage while vulnerable!`;
                outcome = 'enemy_wins';
            } else {
                outcome = 'neutral';
            }
            this.addEffect('heal', 200, 300, '#0f0');
        }
        else if (playerAction === CombatAction.Execute) {
            // Combo finisher - massive damage
            enemyDamage = Math.floor(playerBaseDmg * (1 + this.comboPoints * 0.5));
            criticalHit = true;
            this.comboPoints = 0;
            message = `💥 EXECUTE! Devastating blow for ${enemyDamage} damage!`;
            outcome = 'player_wins';
            this.addEffect('execute', 600, 200, '#f00');
        }
        else if (playerAction === CombatAction.Fireball) {
            // Magic damage - partially ignores guard
            const guardReduction = enemyAction === CombatAction.Guard ? 0.5 : 1.0;
            enemyDamage = Math.floor(playerBaseDmg * guardReduction);
            message = `🔥 Fireball hits for ${enemyDamage} damage!`;
            if (guardReduction < 1) message += ' (Partially blocked)';
            outcome = 'player_wins';
            comboGained = 1;
            this.addEffect('fireball', 600, 200, '#f80');
        }
        // Core combat triangle
        else if (playerAction === CombatAction.Strike || playerAction === CombatAction.HeavyStrike) {
            const isHeavy = playerAction === CombatAction.HeavyStrike;

            if (enemyAction === CombatAction.Guard) {
                // Strike vs Guard - blocked
                enemyDamage = Math.floor(playerBaseDmg * 0.2);
                message = isHeavy
                    ? `Heavy strike blocked! Chip damage: ${enemyDamage}`
                    : `Strike blocked! Chip damage: ${enemyDamage}`;
                outcome = 'enemy_wins';
                this.addEffect('block', 600, 200, '#888');
            }
            else if (enemyAction === CombatAction.Feint) {
                // Strike vs Feint - strike wins!
                enemyDamage = Math.floor(playerBaseDmg * 1.2);
                message = `You catch them mid-feint! ${enemyDamage} damage!`;
                outcome = 'player_wins';
                comboGained = isHeavy ? 2 : 1;
                this.addEffect('hit', 600, 200, '#ff0');
            }
            else if (enemyAction === CombatAction.Strike || enemyAction === CombatAction.HeavyStrike) {
                // Clash! Speed determines winner
                if (playerDef.speed >= enemyDef.speed) {
                    enemyDamage = Math.floor(playerBaseDmg);
                    playerDamage = Math.floor(enemyBaseDmg * 0.5);
                    message = `Clash! You're faster - ${enemyDamage} dmg dealt, ${playerDamage} taken!`;
                    outcome = 'player_wins';
                    comboGained = 1;
                } else {
                    enemyDamage = Math.floor(playerBaseDmg * 0.5);
                    playerDamage = Math.floor(enemyBaseDmg);
                    message = `Clash! Enemy faster - ${playerDamage} dmg taken, ${enemyDamage} dealt!`;
                    outcome = 'enemy_wins';
                }
                this.addEffect('clash', 400, 240, '#fff');
            }
            else {
                // Enemy doing something else (heal etc) - free hit
                enemyDamage = Math.floor(playerBaseDmg);
                message = `Clean hit! ${enemyDamage} damage!`;
                outcome = 'player_wins';
                comboGained = isHeavy ? 2 : 1;
                this.addEffect('hit', 600, 200, '#ff0');
            }
        }
        else if (playerAction === CombatAction.Guard) {
            if (enemyAction === CombatAction.Strike || enemyAction === CombatAction.HeavyStrike) {
                // Guard vs Strike - blocked!
                playerDamage = Math.floor(enemyBaseDmg * 0.2);
                message = `Perfect block! Only ${playerDamage} chip damage!`;
                outcome = 'player_wins';
                this.addEffect('block', 200, 300, '#0af');
            }
            else if (enemyAction === CombatAction.Feint) {
                // Guard vs Feint - guard broken!
                message = `Guard broken by feint! Vulnerable next turn!`;
                outcome = 'enemy_wins';
                // Could add debuff here
                this.addEffect('break', 200, 300, '#f00');
            }
            else if (enemyAction === CombatAction.Guard) {
                // Both guard - stamina recovery
                message = `Both guarding... Catching breath.`;
                outcome = 'neutral';
                this.playerStamina = Math.min(this.maxPlayerStamina, this.playerStamina + 20);
                this.enemyStamina = Math.min(this.maxEnemyStamina, this.enemyStamina + 20);
            }
            else {
                message = `You guard, enemy uses ${ACTIONS[enemyAction].name}.`;
                outcome = 'neutral';
            }
        }
        else if (playerAction === CombatAction.Feint) {
            if (enemyAction === CombatAction.Guard) {
                // Feint vs Guard - break their guard, counter!
                enemyDamage = Math.floor(this.player.stats.attack * 0.8);
                message = `Feint breaks guard! Counter for ${enemyDamage}!`;
                outcome = 'player_wins';
                comboGained = 1;
                this.addEffect('counter', 600, 200, '#0ff');
            }
            else if (enemyAction === CombatAction.Strike || enemyAction === CombatAction.HeavyStrike) {
                // Feint vs Strike - caught!
                playerDamage = Math.floor(enemyBaseDmg * 1.3);
                message = `Caught mid-feint! ${playerDamage} damage!`;
                outcome = 'enemy_wins';
                this.comboPoints = Math.max(0, this.comboPoints - 1);
                this.addEffect('hit', 200, 300, '#f00');
            }
            else if (enemyAction === CombatAction.Feint) {
                // Both feint - nothing happens
                message = `Both feint... An awkward dance.`;
                outcome = 'neutral';
            }
            else {
                message = `You feint, repositioning...`;
                outcome = 'neutral';
                comboGained = 1;
            }
        }

        // Apply combo gain
        this.comboPoints = Math.min(this.maxComboPoints, this.comboPoints + comboGained);

        // Apply damage
        if (playerDamage > 0) {
            // Check for crit
            if (Math.random() < this.player.stats.critChance) {
                playerDamage = Math.floor(playerDamage * 0.5); // Crit reduction for defense
            }
            playerDamage = Math.max(1, playerDamage - this.player.stats.defense);
            this.player.stats.hp -= playerDamage;
        }

        if (enemyDamage > 0) {
            // Check for player crit
            if (Math.random() < this.player.stats.critChance) {
                enemyDamage = Math.floor(enemyDamage * 1.5);
                criticalHit = true;
                message += ' CRITICAL!';
            }
            enemyDamage = Math.max(1, enemyDamage - this.enemy.stats.defense);
            this.enemy.stats.hp -= enemyDamage;

            // Lifesteal
            if (this.player.stats.lifesteal > 0) {
                const healed = Math.floor(enemyDamage * this.player.stats.lifesteal);
                this.player.heal(healed);
            }
        }

        // Check for death
        if (this.player.stats.hp <= 0) {
            this.player.stats.hp = 0;
            this.player.isDead = true;
        }
        if (this.enemy.stats.hp <= 0) {
            this.enemy.stats.hp = 0;
            this.enemy.isDead = true;
        }

        this.lastPlayerAction = playerAction;

        return {
            playerAction,
            enemyAction,
            playerDamage,
            enemyDamage,
            playerHealed,
            outcome,
            message,
            criticalHit,
            comboGained
        };
    }

    advanceToNextTurn() {
        // Check for combat end
        if (this.enemy.isDead) {
            this.phase = CombatPhase.Victory;
            this.log.push(`🏆 Victory! ${this.enemy.name} defeated!`);
            return;
        }
        if (this.player.isDead) {
            this.phase = CombatPhase.Defeat;
            this.log.push(`💀 Defeat! You have fallen...`);
            return;
        }

        // Stamina regeneration
        this.playerStamina = Math.min(this.maxPlayerStamina, this.playerStamina + 15);
        this.enemyStamina = Math.min(this.maxEnemyStamina, this.enemyStamina + 15);

        // Mana regeneration (small)
        this.player.stats.mana = Math.min(this.player.stats.maxMana, this.player.stats.mana + 2);

        // Reset turn state
        this.selectedAction = null;
        this.lastResult = null;
        this.turn++;
        this.phase = CombatPhase.SelectAction;
    }

    update() {
        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life--;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // Handle resolution phase timing
        if (this.phase === CombatPhase.Resolution) {
            this.animationProgress++;
            this.phaseTimer--;

            if (this.phaseTimer <= 0) {
                // Resolve the actions
                this.lastResult = this.resolveActions();
                this.log.push(this.lastResult.message);
                this.phase = CombatPhase.Result;
                this.phaseTimer = 90; // Show result for 1.5 seconds
            }
        }

        // Auto-advance from result after delay (or on keypress)
        if (this.phase === CombatPhase.Result) {
            this.phaseTimer--;
            if (this.phaseTimer <= 0) {
                this.advanceToNextTurn();
            }
        }
    }

    addEffect(type: string, x: number, y: number, color: string) {
        this.effects.push({
            type,
            x,
            y,
            color,
            life: 30,
            maxLife: 30
        });
    }

    endCombat() {
        // Clean up
    }

    // Get available actions for UI
    getAvailableActions(): CombatActionDef[] {
        return [
            ACTIONS[CombatAction.Strike],
            ACTIONS[CombatAction.Guard],
            ACTIONS[CombatAction.Feint],
            ACTIONS[CombatAction.HeavyStrike],
            ACTIONS[CombatAction.Heal],
            ACTIONS[CombatAction.Fireball],
            ACTIONS[CombatAction.Premonition],
            ACTIONS[CombatAction.Execute]
        ];
    }
}

export interface CombatEffect {
    type: string;
    x: number;
    y: number;
    color: string;
    life: number;
    maxLife: number;
}

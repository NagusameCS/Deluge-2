import { Player, Enemy } from './Entity';
import { getRandomInt } from './utils';

export const CombatAction = {
    Attack: 0,
    Defend: 1,
    Dodge: 2,
    Skill: 3,
    None: 4
} as const;

export type CombatAction = typeof CombatAction[keyof typeof CombatAction];

export const BodyPart = {
    Head: 0,
    Torso: 1,
    LeftArm: 2,
    RightArm: 3,
    Legs: 4
} as const;

export type BodyPart = typeof BodyPart[keyof typeof BodyPart];

export interface CombatMove {
    name: string;
    action: CombatAction;
    target?: BodyPart;
    damageMultiplier: number;
    speed: number; // Higher is faster
}

export class CombatSystem {
    player: Player;
    enemy: Enemy;
    isActive: boolean = false;

    // 9x9 Grid
    gridSize: number = 9;
    playerPos: { x: number, y: number } = { x: 4, y: 6 };
    enemyPos: { x: number, y: number } = { x: 4, y: 2 };

    turnTimer: number = 0;
    playerAction: CombatMove | null = null;
    enemyAction: CombatMove | null = null;

    log: string[] = [];

    // Visual effects
    slashes: { x: number, y: number, life: number, angle: number }[] = [];

    constructor(player: Player, enemy: Enemy) {
        this.player = player;
        this.enemy = enemy;
        this.isActive = true;
        this.log.push(`Combat started with ${enemy.name}!`);
    }

    handleInput(action: CombatAction, skillIndex?: number) {
        let move: CombatMove | null = null;
        if (action === CombatAction.Attack) {
            move = { name: 'Slash', action: CombatAction.Attack, damageMultiplier: 1, speed: 1 };
        } else if (action === CombatAction.Defend) {
            move = { name: 'Block', action: CombatAction.Defend, damageMultiplier: 0, speed: 2 };
        } else if (action === CombatAction.Dodge) {
            move = { name: 'Dodge', action: CombatAction.Dodge, damageMultiplier: 0, speed: 2 };
        } else if (action === CombatAction.Skill && skillIndex !== undefined) {
            const skill = this.player.skills[skillIndex];
            if (skill && skill.currentCooldown <= 0 && this.player.stats.mana >= skill.cost) {
                move = { name: skill.name, action: CombatAction.Skill, damageMultiplier: 1.5, speed: 1 }; // Skills are strong
                this.player.stats.mana -= skill.cost;
                skill.currentCooldown = skill.cooldown;
            } else {
                this.log.push("Cannot use skill (Cooldown or Mana)");
                return;
            }
        }

        if (move) {
            this.performAction(move);
        }
    }
    endCombat() {
        this.isActive = false;
    }

    update() {
        if (!this.isActive) return;

        // Simple AI for enemy movement in grid
        if (Math.random() < 0.05) {
            const dx = getRandomInt(-1, 2);
            const dy = getRandomInt(-1, 2);
            this.enemyPos.x = Math.max(0, Math.min(this.gridSize - 1, this.enemyPos.x + dx));
            this.enemyPos.y = Math.max(0, Math.min(this.gridSize - 1, this.enemyPos.y + dy));
        }

        // Update slashes
        for (let i = this.slashes.length - 1; i >= 0; i--) {
            this.slashes[i].life--;
            if (this.slashes[i].life <= 0) {
                this.slashes.splice(i, 1);
            }
        }
    }

    performAction(action: CombatMove) {
        this.playerAction = action;

        // Generate enemy action
        const enemyActions = [
            { name: 'Slash', action: CombatAction.Attack, damageMultiplier: 1, speed: 1 },
            { name: 'Block', action: CombatAction.Defend, damageMultiplier: 0, speed: 2 },
            { name: 'Sidestep', action: CombatAction.Dodge, damageMultiplier: 0, speed: 2 }
        ];
        this.enemyAction = enemyActions[getRandomInt(0, enemyActions.length)];

        this.resolveTurn();
    }

    resolveTurn() {
        if (!this.playerAction || !this.enemyAction) return;

        this.log.push(`Player uses ${this.playerAction.name}, Enemy uses ${this.enemyAction.name}`);

        // Rock Paper Scissors Logic
        // Attack beats Dodge (if fast enough? or maybe Dodge beats Attack?)
        // Let's go with: Attack > Dodge (caught off guard), Dodge > Defend (outmaneuver), Defend > Attack (block)
        // Actually standard is: Attack > Throw > Block > Attack. 
        // Let's use: Attack > Dodge (if targeted correctly), Defend > Attack, Dodge > Defend (useless but safe)

        // Simplified for this request:
        // Attack vs Attack: Both take damage
        // Attack vs Defend: Defender takes reduced/0 damage
        // Attack vs Dodge: Attacker misses (0 damage)

        let playerDamage = 0;
        let enemyDamage = 0;

        // Player attacking
        if (this.playerAction.action === CombatAction.Attack || this.playerAction.action === CombatAction.Skill) {
            if (this.enemyAction.action === CombatAction.Defend) {
                this.log.push("Enemy blocked your attack!");
                enemyDamage = this.player.stats.attack * 0.2;
            } else if (this.enemyAction.action === CombatAction.Dodge) {
                this.log.push("Enemy dodged your attack!");
                enemyDamage = 0;
            } else {
                let dmg = this.player.stats.attack * this.playerAction.damageMultiplier;
                if (this.playerAction.name === 'Fireball') dmg += this.player.stats.fireDamage;
                enemyDamage = dmg;
                this.addSlash(this.enemyPos.x, this.enemyPos.y);
            }
        }

        // Enemy attacking
        if (this.enemyAction.action === CombatAction.Attack) {
            if (this.playerAction.action === CombatAction.Defend) {
                this.log.push("You blocked the enemy attack!");
                playerDamage = this.enemy.stats.attack * 0.2;
            } else if (this.playerAction.action === CombatAction.Dodge) {
                this.log.push("You dodged the enemy attack!");
                playerDamage = 0;
            } else {
                playerDamage = this.enemy.stats.attack * this.enemyAction.damageMultiplier;
                this.addSlash(this.playerPos.x, this.playerPos.y);
            }
        }

        if (playerDamage > 0) {
            this.player.takeDamage(playerDamage);
            this.log.push(`You took ${playerDamage} damage.`);
        }
        if (enemyDamage > 0) {
            this.enemy.takeDamage(enemyDamage);
            this.log.push(`Enemy took ${enemyDamage} damage.`);
        }

        if (this.player.isDead || this.enemy.isDead) {
            this.isActive = false;
        }
    }

    addSlash(x: number, y: number) {
        this.slashes.push({
            x: x,
            y: y,
            life: 20,
            angle: Math.random() * Math.PI
        });
    }
}

import { GameMap } from './Map';
import { Entity, Item, Trap, Player } from './Entity';
import { TILE_SIZE, TileType, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './utils';
import { CombatSystem, CombatPhase, ACTIONS } from './Combat';

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;

    constructor(canvasId: string, width: number, height: number) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.width = width;
        this.height = height;

        // Set internal resolution
        this.canvas.width = width * TILE_SIZE;
        this.canvas.height = height * TILE_SIZE;

        // Scale canvas to fit screen while maintaining aspect ratio
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.ctx.font = '12px monospace';
    }

    resizeCanvas() {
        const scale = Math.min(
            window.innerWidth / this.canvas.width,
            window.innerHeight / this.canvas.height
        );

        this.canvas.style.width = `${this.canvas.width * scale}px`;
        this.canvas.style.height = `${this.canvas.height * scale}px`;
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMap(map: GameMap, playerX: number, playerY: number) {
        // Calculate camera offset
        const camX = Math.max(0, Math.min(map.width - VIEWPORT_WIDTH, playerX - Math.floor(VIEWPORT_WIDTH / 2)));
        const camY = Math.max(0, Math.min(map.height - VIEWPORT_HEIGHT, playerY - Math.floor(VIEWPORT_HEIGHT / 2)));

        for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
            for (let x = 0; x < VIEWPORT_WIDTH; x++) {
                const mapX = camX + x;
                const mapY = camY + y;

                if (mapX >= map.width || mapY >= map.height) continue;

                const tile = map.tiles[mapY][mapX];
                const visible = map.visible[mapY][mapX];
                const explored = map.explored[mapY][mapX];

                if (visible) {
                    if (tile === TileType.Wall) {
                        this.ctx.fillStyle = '#888'; // Lit wall
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        // Add depth/shadow
                        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE - 4, TILE_SIZE, 4);
                    } else if (tile === TileType.Floor) {
                        this.ctx.fillStyle = '#222'; // Darker floor for contrast
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        // Floor texture dot
                        this.ctx.fillStyle = '#333';
                        this.ctx.fillRect(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2, 2);
                    } else {
                        this.ctx.fillStyle = '#000';
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                } else if (explored) {
                    if (tile === TileType.Wall) {
                        this.ctx.fillStyle = '#444'; // Dark wall
                    } else if (tile === TileType.Floor) {
                        this.ctx.fillStyle = '#111'; // Dark floor
                    } else {
                        this.ctx.fillStyle = '#000';
                    }
                    this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else {
                    this.ctx.fillStyle = '#000'; // Unexplored
                    this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        return { camX, camY };
    }

    drawEntity(entity: Entity, map: GameMap, camX: number, camY: number) {
        if (!map.visible[entity.y][entity.x]) return;

        const screenX = entity.x - camX;
        const screenY = entity.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        this.ctx.fillStyle = entity.color;
        this.ctx.fillRect(screenX * TILE_SIZE, screenY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Draw HP bar
        const hpPercent = entity.stats.hp / entity.stats.maxHp;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(screenX * TILE_SIZE, screenY * TILE_SIZE - 4, TILE_SIZE, 3);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(screenX * TILE_SIZE, screenY * TILE_SIZE - 4, TILE_SIZE * hpPercent, 3);
    }

    drawItem(item: Item, map: GameMap, camX: number, camY: number) {
        if (!map.visible[item.y][item.x]) return;

        const screenX = item.x - camX;
        const screenY = item.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        this.ctx.fillStyle = item.color;
        const cx = screenX * TILE_SIZE + TILE_SIZE / 2;
        const cy = screenY * TILE_SIZE + TILE_SIZE / 2;

        this.ctx.beginPath();
        if (item.type === ItemType.Potion) {
            this.ctx.arc(cx, cy, TILE_SIZE / 4, 0, Math.PI * 2);
        } else if (item.type === ItemType.Weapon) {
            this.ctx.moveTo(cx, cy - 5);
            this.ctx.lineTo(cx + 5, cy + 5);
            this.ctx.lineTo(cx - 5, cy + 5);
        } else {
            this.ctx.rect(cx - 4, cy - 4, 8, 8);
        }
        this.ctx.fill();
    }

    drawTrap(trap: Trap, camX: number, camY: number) {
        const screenX = trap.x - camX;
        const screenY = trap.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        this.ctx.fillStyle = '#555'; // Grey for trap
        if (trap.triggered) this.ctx.fillStyle = '#f00'; // Red if triggered

        const cx = screenX * TILE_SIZE + TILE_SIZE / 2;
        const cy = screenY * TILE_SIZE + TILE_SIZE / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - 8);
        this.ctx.lineTo(cx + 8, cy + 8);
        this.ctx.lineTo(cx - 8, cy + 8);
        this.ctx.fill();
    }

    drawMinimap(map: GameMap, player: Entity) {
        const scale = 2;
        const mmWidth = map.width * scale;
        const mmHeight = map.height * scale;
        const mmX = this.canvas.width - mmWidth - 10;
        const mmY = 10;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(mmX, mmY, mmWidth, mmHeight);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(mmX, mmY, mmWidth, mmHeight);

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.explored[y][x]) {
                    if (map.tiles[y][x] === TileType.Wall) {
                        this.ctx.fillStyle = '#444';
                    } else {
                        this.ctx.fillStyle = '#888';
                    }
                    this.ctx.fillRect(mmX + x * scale, mmY + y * scale, scale, scale);
                }
            }
        }

        // Player on minimap
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(mmX + player.x * scale, mmY + player.y * scale, scale, scale);
    }

    drawCombat(combat: CombatSystem) {
        // Draw dark overlay
        this.ctx.fillStyle = 'rgba(10, 5, 15, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        // ========== TITLE BAR ==========
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`⚔️ COMBAT - Turn ${combat.turn}`, centerX, 35);

        // ========== COMBATANT DISPLAY ==========
        const playerBoxX = 80;
        const enemyBoxX = this.canvas.width - 280;
        const boxY = 60;
        const boxW = 200;
        const boxH = 120;

        // Player box
        this.ctx.fillStyle = 'rgba(0, 50, 100, 0.8)';
        this.ctx.fillRect(playerBoxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#0af';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(playerBoxX, boxY, boxW, boxH);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('YOU', playerBoxX + 10, boxY + 25);

        // Player HP bar
        this.drawBar(playerBoxX + 10, boxY + 35, boxW - 20, 18,
            combat.player.stats.hp, combat.player.stats.maxHp, '#0f0', '#300', 'HP');

        // Player Mana bar
        this.drawBar(playerBoxX + 10, boxY + 58, boxW - 20, 14,
            combat.player.stats.mana, combat.player.stats.maxMana, '#00f', '#003', 'MP');

        // Player Stamina bar
        this.drawBar(playerBoxX + 10, boxY + 77, boxW - 20, 14,
            combat.playerStamina, combat.maxPlayerStamina, '#ff0', '#330', 'ST');

        // Combo points
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Combo: `, playerBoxX + 10, boxY + 108);
        for (let i = 0; i < combat.maxComboPoints; i++) {
            this.ctx.fillStyle = i < combat.comboPoints ? '#f80' : '#444';
            this.ctx.fillRect(playerBoxX + 60 + i * 20, boxY + 98, 15, 15);
        }

        // Enemy box
        this.ctx.fillStyle = 'rgba(100, 20, 20, 0.8)';
        this.ctx.fillRect(enemyBoxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#f44';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(enemyBoxX, boxY, boxW, boxH);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(combat.enemy.name.toUpperCase(), enemyBoxX + 10, boxY + 25);

        // Enemy HP bar
        this.drawBar(enemyBoxX + 10, boxY + 35, boxW - 20, 18,
            combat.enemy.stats.hp, combat.enemy.stats.maxHp, '#f00', '#300', 'HP');

        // Enemy Stamina bar
        this.drawBar(enemyBoxX + 10, boxY + 58, boxW - 20, 14,
            combat.enemyStamina, combat.maxEnemyStamina, '#ff0', '#330', 'ST');

        // ========== CENTER ARENA ==========
        const arenaY = 200;

        // Draw animated sprites
        const playerSpriteX = centerX - 150;
        const enemySpriteX = centerX + 100;
        const spriteY = arenaY + 30;

        // Animation based on phase
        let playerOffset = 0;
        let enemyOffset = 0;

        if (combat.phase === CombatPhase.Resolution) {
            const progress = combat.animationProgress / 60;
            if (combat.selectedAction === 1 || combat.selectedAction === 4) { // Strike/Heavy
                playerOffset = Math.sin(progress * Math.PI) * 50;
            }
            if (combat.pendingEnemyAction === 1 || combat.pendingEnemyAction === 4) {
                enemyOffset = -Math.sin(progress * Math.PI) * 50;
            }
        }

        // Player sprite
        this.ctx.fillStyle = '#4af';
        this.ctx.fillRect(playerSpriteX + playerOffset, spriteY, 50, 80);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '30px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('@', playerSpriteX + 25 + playerOffset, spriteY + 55);

        // Enemy sprite
        this.ctx.fillStyle = '#f44';
        this.ctx.fillRect(enemySpriteX + enemyOffset, spriteY, 50, 80);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('E', enemySpriteX + 25 + enemyOffset, spriteY + 55);

        // Draw effects
        for (const effect of combat.effects) {
            const alpha = effect.life / effect.maxLife;
            this.ctx.fillStyle = effect.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.font = 'bold 40px monospace';
            this.ctx.textAlign = 'center';

            if (effect.type === 'hit' || effect.type === 'execute') {
                this.ctx.fillText('💥', effect.x + enemyOffset, effect.y);
            } else if (effect.type === 'block') {
                this.ctx.fillText('🛡️', effect.x, effect.y);
            } else if (effect.type === 'heal') {
                this.ctx.fillText('💚', effect.x, effect.y);
            } else if (effect.type === 'fireball') {
                this.ctx.fillText('🔥', effect.x, effect.y);
            } else if (effect.type === 'premonition') {
                this.ctx.fillText('🔮', effect.x, effect.y);
            } else if (effect.type === 'clash') {
                this.ctx.fillText('⚡', effect.x, effect.y);
            }
        }

        // ========== ACTION MENU ==========
        const menuY = 360;

        this.ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
        this.ctx.fillRect(20, menuY, this.canvas.width - 40, 100);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(20, menuY, this.canvas.width - 40, 100);

        if (combat.phase === CombatPhase.SelectAction) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⟨ SELECT YOUR ACTION ⟩', centerX, menuY + 20);

            // Draw action buttons
            const actions = [
                { key: '1', name: 'Strike', cost: '15 ST', color: '#f80' },
                { key: '2', name: 'Guard', cost: '10 ST', color: '#0af' },
                { key: '3', name: 'Feint', cost: '20 ST', color: '#0f8' },
                { key: '4', name: 'Heavy', cost: '30 ST', color: '#f44' },
                { key: 'Q', name: 'Heal', cost: '12 MP', color: '#0f0' },
                { key: 'W', name: 'Fireball', cost: '15 MP', color: '#f80' },
                { key: 'E', name: 'Premonition', cost: '8 MP', color: '#a0f' },
                { key: 'R', name: 'Execute', cost: '3 Combo', color: '#ff0' },
            ];

            const btnW = 85;
            const btnH = 50;
            const startX = 35;

            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                const x = startX + (i % 8) * (btnW + 5);
                const y = menuY + 35;

                // Check if can use
                let canUse = true;
                if (action.key === 'R' && combat.comboPoints < combat.maxComboPoints) canUse = false;
                if (action.cost.includes('ST') && parseInt(action.cost) > combat.playerStamina) canUse = false;
                if (action.cost.includes('MP') && parseInt(action.cost) > combat.player.stats.mana) canUse = false;

                this.ctx.fillStyle = canUse ? 'rgba(60, 60, 80, 0.9)' : 'rgba(30, 30, 40, 0.5)';
                this.ctx.fillRect(x, y, btnW, btnH);
                this.ctx.strokeStyle = canUse ? action.color : '#333';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, btnW, btnH);

                this.ctx.fillStyle = canUse ? '#fff' : '#555';
                this.ctx.font = 'bold 11px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`[${action.key}] ${action.name}`, x + btnW / 2, y + 20);
                this.ctx.font = '10px monospace';
                this.ctx.fillStyle = canUse ? action.color : '#444';
                this.ctx.fillText(action.cost, x + btnW / 2, y + 38);
            }
        } else if (combat.phase === CombatPhase.ShowPremonition) {
            this.ctx.fillStyle = '#a0f';
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🔮 PREMONITION 🔮', centerX, menuY + 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            const enemyActionName = ACTIONS[combat.enemyIntendedAction]?.name || 'Unknown';
            this.ctx.fillText(`Enemy will use: ${enemyActionName}`, centerX, menuY + 55);
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Press any key to choose your counter...', centerX, menuY + 80);
        } else if (combat.phase === CombatPhase.Resolution) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⚔️ CLASH! ⚔️', centerX, menuY + 50);
        } else if (combat.phase === CombatPhase.Result && combat.lastResult) {
            const result = combat.lastResult;
            const outcomeColor = result.outcome === 'player_wins' ? '#0f0' :
                result.outcome === 'enemy_wins' ? '#f44' : '#ff0';
            this.ctx.fillStyle = outcomeColor;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(result.message, centerX, menuY + 40);

            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Press any key to continue...', centerX, menuY + 70);
        } else if (combat.phase === CombatPhase.Victory) {
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆 VICTORY! 🏆', centerX, menuY + 50);
        } else if (combat.phase === CombatPhase.Defeat) {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('💀 DEFEAT 💀', centerX, menuY + 50);
        }

        // ========== COMBAT LOG ==========
        this.ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        this.ctx.fillRect(20, this.canvas.height - 80, this.canvas.width - 40, 70);

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'left';
        let logY = this.canvas.height - 65;
        for (let i = combat.log.length - 1; i >= Math.max(0, combat.log.length - 4); i--) {
            this.ctx.fillText(combat.log[i], 30, logY);
            logY += 15;
        }

        // Reset text align
        this.ctx.textAlign = 'left';
    }

    drawBar(x: number, y: number, w: number, h: number, current: number, max: number, fgColor: string, bgColor: string, label: string) {
        // Background
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x, y, w, h);

        // Foreground
        const percent = Math.max(0, Math.min(1, current / max));
        this.ctx.fillStyle = fgColor;
        this.ctx.fillRect(x, y, w * percent, h);

        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);

        // Label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `${h - 4}px monospace`;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${label}: ${Math.floor(current)}/${max}`, x + 4, y + h - 3);
    }

    drawUI(player: Entity, logs: string[], floor: number) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`Floor: ${floor}  HP: ${player.stats.hp}/${player.stats.maxHp}  Mana: ${player.stats.mana}/${player.stats.maxMana}  Lvl: ${player.stats.level}  XP: ${player.stats.xp}`, 10, 20);

        // Draw Skills
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Skills: [1] Heal (10 MP)  [2] Fireball (15 MP)`, 10, 40);

        // Draw logs
        this.ctx.font = '14px monospace';
        let y = this.canvas.height - 10;
        for (let i = logs.length - 1; i >= Math.max(0, logs.length - 5); i--) {
            this.ctx.fillText(logs[i], 10, y);
            y -= 20;
        }
    }

    drawLevelUp(player: Player) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("LEVEL UP!", this.canvas.width / 2, 100);

        this.ctx.font = '20px monospace';
        this.ctx.fillText(`Points Remaining: ${player.stats.skillPoints}`, this.canvas.width / 2, 140);

        this.ctx.textAlign = 'left';
        const x = this.canvas.width / 2 - 150;
        let y = 200;

        this.ctx.fillText(`[1] Max HP (+10)   : ${player.stats.maxHp}`, x, y); y += 40;
        this.ctx.fillText(`[2] Max Mana (+10) : ${player.stats.maxMana}`, x, y); y += 40;
        this.ctx.fillText(`[3] Attack (+2)    : ${player.stats.attack}`, x, y); y += 40;
        this.ctx.fillText(`[4] Defense (+1)   : ${player.stats.defense}`, x, y); y += 40;
    }
}

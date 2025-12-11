import { GameMap } from './Map';
import { Entity, Item, Trap, Player, DungeonCore } from './Entity';
import { TILE_SIZE, TileType, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './utils';
import { CombatSystem, CombatPhase, ACTIONS } from './Combat';
import { Chest, RARITY_COLORS, RARITY_NAMES, CRAFTING_RECIPES, MATERIALS } from './Equipment';
import { AssetManager, drawAsset } from './GameAssets';

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

        const px = screenX * TILE_SIZE;
        const py = screenY * TILE_SIZE;

        // Check if this is a DungeonCore and try to draw with asset
        if (entity instanceof DungeonCore) {
            const core = entity as DungeonCore;
            const assetId = core.puzzleSolved ? 'dungeon_core_vulnerable' : 'dungeon_core';
            const asset = AssetManager.getAsset(assetId);
            
            if (asset && drawAsset(this.ctx, asset, px, py, TILE_SIZE)) {
                // Draw HP bar for core
                const hpPercent = entity.stats.hp / entity.stats.maxHp;
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(px, py - 4, TILE_SIZE, 3);
                this.ctx.fillStyle = 'green';
                this.ctx.fillRect(px, py - 4, TILE_SIZE * hpPercent, 3);
                return;
            }
        }

        // Default entity drawing
        this.ctx.fillStyle = entity.color;
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Draw HP bar
        const hpPercent = entity.stats.hp / entity.stats.maxHp;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(px, py - 4, TILE_SIZE, 3);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(px, py - 4, TILE_SIZE * hpPercent, 3);
    }

    drawItem(item: Item, map: GameMap, camX: number, camY: number) {
        if (!map.visible[item.y][item.x]) return;

        const screenX = item.x - camX;
        const screenY = item.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        const px = screenX * TILE_SIZE;
        const py = screenY * TILE_SIZE;

        // Try to draw using asset system first
        let assetId: string | null = null;
        
        if (item.type === ItemType.Potion) {
            // Determine potion type by color
            if (item.color === '#f44' || item.color === '#ff4444') {
                assetId = 'health_potion';
            } else if (item.color === '#44f' || item.color === '#4444ff') {
                assetId = 'mana_potion';
            }
        } else if (item.type === ItemType.Coin) {
            assetId = 'gold_coin';
        }

        // Try to draw asset
        if (assetId) {
            const asset = AssetManager.getAsset(assetId);
            if (asset && drawAsset(this.ctx, asset, px, py, TILE_SIZE)) {
                return; // Successfully drew asset
            }
        }

        // Fallback to old drawing method
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

        const px = screenX * TILE_SIZE;
        const py = screenY * TILE_SIZE;

        // Try to draw using asset system
        const assetId = 'spike_trap';
        const asset = AssetManager.getAsset(assetId);
        
        if (asset && drawAsset(this.ctx, asset, px, py, TILE_SIZE)) {
            // If triggered, add a red tint overlay
            if (trap.triggered) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
            return;
        }

        // Fallback drawing
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
        this.ctx.fillText(`-- COMBAT - Turn ${combat.turn} --`, centerX, 35);

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
        this.ctx.fillStyle = combat.enemy.color;
        this.ctx.fillRect(enemySpriteX + enemyOffset, spriteY, 50, 80);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(combat.enemy.char, enemySpriteX + 25 + enemyOffset, spriteY + 55);

        // Draw effects
        for (const effect of combat.effects) {
            const alpha = effect.life / effect.maxLife;
            this.ctx.fillStyle = effect.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.font = 'bold 40px monospace';
            this.ctx.textAlign = 'center';

            if (effect.type === 'hit' || effect.type === 'execute') {
                this.ctx.fillText('*HIT*', effect.x + enemyOffset, effect.y);
            } else if (effect.type === 'block') {
                this.ctx.fillText('[O]', effect.x, effect.y);
            } else if (effect.type === 'heal') {
                this.ctx.fillText('+HP', effect.x, effect.y);
            } else if (effect.type === 'fireball') {
                this.ctx.fillText('~*~', effect.x, effect.y);
            } else if (effect.type === 'premonition') {
                this.ctx.fillText('(o)', effect.x, effect.y);
            } else if (effect.type === 'clash') {
                this.ctx.fillText('><', effect.x, effect.y);
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
            this.ctx.fillText('[ SELECT YOUR ACTION ]', centerX, menuY + 20);

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
            this.ctx.fillText('** PREMONITION **', centerX, menuY + 30);
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
            this.ctx.fillText('** CLASH! **', centerX, menuY + 50);
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
            this.ctx.fillText('** VICTORY! **', centerX, menuY + 50);
        } else if (combat.phase === CombatPhase.Defeat) {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('** DEFEAT **', centerX, menuY + 50);
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
        // Top bar background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, 50);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';

        // Left side: Floor and level
        this.ctx.fillText(`Floor: ${floor}  Lvl: ${player.stats.level}`, 10, 18);

        // XP bar with progress (if player has getXpForNextLevel)
        const p = player as Player;
        if (p.getXpForNextLevel) {
            const xpNeeded = p.getXpForNextLevel();
            const xpPercent = player.stats.xp / xpNeeded;
            this.ctx.fillText(`XP: ${player.stats.xp}/${xpNeeded}`, 10, 38);
            // Mini XP bar
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(130, 28, 100, 12);
            this.ctx.fillStyle = '#0af';
            this.ctx.fillRect(130, 28, 100 * xpPercent, 12);
            this.ctx.strokeStyle = '#666';
            this.ctx.strokeRect(130, 28, 100, 12);
        }

        // Center: HP and Mana bars
        const barX = 260;
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('HP:', barX, 18);
        this.drawBar(barX + 30, 6, 100, 14, player.stats.hp, player.stats.maxHp, '#0f0', '#300', '');
        this.ctx.fillText('MP:', barX, 38);
        this.drawBar(barX + 30, 26, 100, 14, player.stats.mana, player.stats.maxMana, '#00f', '#003', '');

        // Right side: Stats
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`ATK: ${player.stats.attack}  DEF: ${player.stats.defense}`, 420, 18);

        // Controls hint
        this.ctx.fillStyle = '#666';
        this.ctx.font = '11px monospace';
        this.ctx.fillText('[TAB] Stats  [I] Equip  [C] Craft', 420, 38);

        // Draw Skills
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`[1] Heal  [2] Fireball`, 600, 18);

        // Draw logs at bottom
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);

        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '12px monospace';
        let y = this.canvas.height - 65;
        for (let i = logs.length - 1; i >= Math.max(0, logs.length - 4); i--) {
            this.ctx.fillText(logs[i], 10, y);
            y += 16;
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

    drawChest(chest: Chest, map: GameMap, camX: number, camY: number) {
        if (!map.visible[chest.y][chest.x]) return;

        const screenX = chest.x - camX;
        const screenY = chest.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        const px = screenX * TILE_SIZE;
        const py = screenY * TILE_SIZE;

        // Try to draw using asset system
        const assetId = chest.opened ? 'chest_open' : 'chest_closed';
        const asset = AssetManager.getAsset(assetId);
        
        if (asset && drawAsset(this.ctx, asset, px, py, TILE_SIZE)) {
            return; // Successfully drew asset
        }

        // Fallback to old drawing method
        const cx = screenX * TILE_SIZE + TILE_SIZE / 2;
        const cy = screenY * TILE_SIZE + TILE_SIZE / 2;

        if (chest.opened) {
            this.ctx.fillStyle = '#654';
        } else {
            this.ctx.fillStyle = '#da0';
        }

        // Chest shape (rectangle)
        this.ctx.fillRect(cx - 10, cy - 6, 20, 12);
        this.ctx.strokeStyle = '#420';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(cx - 10, cy - 6, 20, 12);

        // Latch
        if (!chest.opened) {
            this.ctx.fillStyle = '#888';
            this.ctx.fillRect(cx - 2, cy - 2, 4, 4);
        }
    }

    drawStats(player: Player, floor: number) {
        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('-- CHARACTER STATS --', this.canvas.width / 2, 40);

        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        const x = 50;
        let y = 80;
        const lineHeight = 22;

        // Basic info
        this.ctx.fillStyle = '#4af';
        this.ctx.fillText(`Level: ${player.stats.level}`, x, y); y += lineHeight;

        // XP bar with progress
        const xpNeeded = player.getXpForNextLevel();
        const xpPercent = player.stats.xp / xpNeeded;
        this.ctx.fillText(`XP: ${player.stats.xp} / ${xpNeeded}`, x, y);
        // Draw XP bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x + 180, y - 12, 200, 14);
        this.ctx.fillStyle = '#0af';
        this.ctx.fillRect(x + 180, y - 12, 200 * xpPercent, 14);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(x + 180, y - 12, 200, 14);
        y += lineHeight;

        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Floor: ${floor}`, x, y); y += lineHeight;
        this.ctx.fillText(`Gold: ${player.inventory.gold}`, x, y); y += lineHeight * 1.5;

        // Combat stats
        this.ctx.fillStyle = '#f88';
        this.ctx.fillText('-- COMBAT --', x, y); y += lineHeight;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`HP: ${player.stats.hp} / ${player.stats.maxHp}`, x, y); y += lineHeight;
        this.ctx.fillText(`Mana: ${player.stats.mana} / ${player.stats.maxMana}`, x, y); y += lineHeight;
        this.ctx.fillText(`Attack: ${player.stats.attack}`, x, y); y += lineHeight;
        this.ctx.fillText(`Defense: ${player.stats.defense}`, x, y); y += lineHeight;
        this.ctx.fillText(`Crit Chance: ${Math.floor(player.stats.critChance * 100)}%`, x, y); y += lineHeight;
        this.ctx.fillText(`Dodge Chance: ${Math.floor(player.stats.dodgeChance * 100)}%`, x, y); y += lineHeight * 1.5;

        // Special stats (from runes)
        const x2 = 400;
        y = 80;
        this.ctx.fillStyle = '#f80';
        this.ctx.fillText('-- BONUSES --', x2, y); y += lineHeight;
        this.ctx.fillStyle = '#fff';
        if (player.stats.fireDamage > 0) { this.ctx.fillText(`Fire Damage: +${player.stats.fireDamage}`, x2, y); y += lineHeight; }
        if (player.stats.iceDamage > 0) { this.ctx.fillText(`Ice Damage: +${player.stats.iceDamage}`, x2, y); y += lineHeight; }
        if (player.stats.lifesteal > 0) { this.ctx.fillText(`Lifesteal: ${Math.floor(player.stats.lifesteal * 100)}%`, x2, y); y += lineHeight; }
        if (player.stats.thornsDamage > 0) { this.ctx.fillText(`Thorns: ${player.stats.thornsDamage}`, x2, y); y += lineHeight; }
        if (player.stats.manaOnHit > 0) { this.ctx.fillText(`Mana on Hit: +${player.stats.manaOnHit}`, x2, y); y += lineHeight; }
        if (player.stats.xpBonus > 0) { this.ctx.fillText(`XP Bonus: +${Math.floor(player.stats.xpBonus * 100)}%`, x2, y); y += lineHeight; }
        if (player.stats.goldBonus > 0) { this.ctx.fillText(`Gold Bonus: +${Math.floor(player.stats.goldBonus * 100)}%`, x2, y); y += lineHeight; }
        if (player.stats.poisonChance > 0) { this.ctx.fillText(`Poison Chance: ${Math.floor(player.stats.poisonChance * 100)}%`, x2, y); y += lineHeight; }
        if (player.stats.stunChance > 0) { this.ctx.fillText(`Stun Chance: ${Math.floor(player.stats.stunChance * 100)}%`, x2, y); y += lineHeight; }

        // Materials
        y = 260;
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillText('-- MATERIALS --', x2, y); y += lineHeight;
        this.ctx.fillStyle = '#fff';
        for (const [matType, count] of player.inventory.materials) {
            if (count > 0) {
                const mat = MATERIALS[matType];
                this.ctx.fillStyle = mat.color;
                this.ctx.fillText(`${mat.name}: ${count}`, x2, y);
                y += lineHeight;
            }
        }

        // Controls hint
        this.ctx.fillStyle = '#888';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press [TAB] or [ESC] to close | [I] Equipment | [C] Crafting', this.canvas.width / 2, this.canvas.height - 20);
    }

    drawEquipment(player: Player, selectedIndex: number, slotCursor: number) {
        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('-- EQUIPMENT --', this.canvas.width / 2, 40);

        // Equipped items (left side)
        const eqX = 40;
        let eqY = 80;
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';

        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText('EQUIPPED:', eqX, eqY); eqY += 25;

        const slots: { key: keyof typeof player.equipped; label: string }[] = [
            { key: 'weapon', label: 'Weapon' },
            { key: 'armor', label: 'Armor' },
            { key: 'helmet', label: 'Helmet' },
            { key: 'boots', label: 'Boots' },
            { key: 'accessory', label: 'Accessory' }
        ];

        slots.forEach((slot, i) => {
            const item = player.equipped[slot.key];
            const selected = slotCursor === i;

            this.ctx.fillStyle = selected ? '#ff0' : '#888';
            this.ctx.fillText(`${selected ? '>' : ' '} ${slot.label}:`, eqX, eqY);

            if (item) {
                this.ctx.fillStyle = RARITY_COLORS[item.rarity];
                this.ctx.fillText(item.name, eqX + 100, eqY);
            } else {
                this.ctx.fillStyle = '#444';
                this.ctx.fillText('(empty)', eqX + 100, eqY);
            }
            eqY += 22;
        });

        this.ctx.fillStyle = '#888';
        this.ctx.fillText('[U] Unequip selected slot', eqX, eqY + 20);

        // Inventory (right side)
        const invX = 350;
        let invY = 80;

        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText(`INVENTORY (${player.inventory.equipment.length}/${player.inventory.maxSize}):`, invX, invY);
        invY += 25;

        if (player.inventory.equipment.length === 0) {
            this.ctx.fillStyle = '#444';
            this.ctx.fillText('(empty)', invX, invY);
        } else {
            player.inventory.equipment.forEach((item, i) => {
                const selected = selectedIndex === i;
                this.ctx.fillStyle = selected ? '#ff0' : '#888';
                this.ctx.fillText(selected ? '>' : ' ', invX, invY);

                this.ctx.fillStyle = RARITY_COLORS[item.rarity];
                this.ctx.fillText(item.name, invX + 20, invY);

                // Show slot type
                this.ctx.fillStyle = '#666';
                this.ctx.fillText(`(${item.slot})`, invX + 200, invY);

                invY += 18;
                if (invY > this.canvas.height - 100) return; // Prevent overflow
            });
        }

        // Selected item details
        if (player.inventory.equipment[selectedIndex]) {
            const item = player.inventory.equipment[selectedIndex];
            const detY = this.canvas.height - 80;

            this.ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
            this.ctx.fillRect(30, detY - 10, this.canvas.width - 60, 60);

            this.ctx.fillStyle = RARITY_COLORS[item.rarity];
            this.ctx.font = 'bold 14px monospace';
            this.ctx.fillText(`${RARITY_NAMES[item.rarity]} ${item.name}`, 50, detY + 10);

            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(item.description, 50, detY + 30);
        }

        // Controls hint
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('[Arrows] Navigate | [Enter/E] Equip | [U] Unequip | [ESC/I] Close', this.canvas.width / 2, this.canvas.height - 15);
    }

    drawCrafting(player: Player, selectedIndex: number) {
        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('-- CRAFTING --', this.canvas.width / 2, 40);

        // Recipes list
        const recX = 40;
        let recY = 80;
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';

        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText('RECIPES:', recX, recY); recY += 25;

        CRAFTING_RECIPES.forEach((recipe, i) => {
            const selected = selectedIndex === i;

            // Check if can craft
            let canCraft = true;
            for (const mat of recipe.materials) {
                if (player.getMaterialCount(mat.type) < mat.count) {
                    canCraft = false;
                    break;
                }
            }

            this.ctx.fillStyle = selected ? '#ff0' : (canCraft ? '#0f0' : '#666');
            this.ctx.fillText(selected ? '>' : ' ', recX, recY);
            this.ctx.fillText(recipe.name, recX + 20, recY);

            recY += 20;
        });

        // Selected recipe details
        if (CRAFTING_RECIPES[selectedIndex]) {
            const recipe = CRAFTING_RECIPES[selectedIndex];
            const detX = 350;
            let detY = 80;

            this.ctx.fillStyle = '#ff0';
            this.ctx.fillText('REQUIRED MATERIALS:', detX, detY); detY += 25;

            for (const mat of recipe.materials) {
                const matInfo = MATERIALS[mat.type];
                const have = player.getMaterialCount(mat.type);
                const enough = have >= mat.count;

                this.ctx.fillStyle = enough ? '#0f0' : '#f00';
                this.ctx.fillText(`${matInfo.name}: ${have}/${mat.count}`, detX, detY);
                detY += 20;
            }

            detY += 20;
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText(`Creates: ${RARITY_NAMES[recipe.resultRarity]} ${recipe.resultSlot}`, detX, detY);
        }

        // Player materials
        const matX = 350;
        let matY = 250;
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillText('YOUR MATERIALS:', matX, matY); matY += 25;

        for (const [matType, count] of player.inventory.materials) {
            if (count > 0) {
                const mat = MATERIALS[matType];
                this.ctx.fillStyle = mat.color;
                this.ctx.fillText(`${mat.name}: ${count}`, matX, matY);
                matY += 18;
            }
        }

        // Controls hint
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('[Up/Down] Select | [Enter/C] Craft | [ESC] Close', this.canvas.width / 2, this.canvas.height - 15);
    }

    drawPuzzle(core: DungeonCore) {
        this.ctx.fillStyle = 'rgba(10, 5, 20, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        this.ctx.fillStyle = '#0ff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('-- DUNGEON CORE PUZZLE --', centerX, 40);

        // Draw lamps showing puzzle progress
        const lampY = 60;
        const lampSize = 20;
        const lampSpacing = 50;
        const lampsStartX = centerX - (core.puzzlesRequired * lampSpacing) / 2 + lampSpacing / 2;
        
        for (let i = 0; i < core.puzzlesRequired; i++) {
            const lampX = lampsStartX + i * lampSpacing;
            const isLit = core.lampStates[i];
            
            // Lamp base
            this.ctx.fillStyle = '#444';
            this.ctx.fillRect(lampX - 5, lampY + lampSize, 10, 8);
            
            // Lamp glow effect
            if (isLit) {
                this.ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(lampX, lampY + lampSize / 2, lampSize * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Lamp bulb
            this.ctx.fillStyle = isLit ? '#ffc832' : '#333';
            this.ctx.beginPath();
            this.ctx.arc(lampX, lampY + lampSize / 2, lampSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Lamp outline
            this.ctx.strokeStyle = isLit ? '#ffdd66' : '#666';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(lampX, lampY + lampSize / 2, lampSize / 2, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.lineWidth = 1;
        }
        
        // Progress text
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Puzzles: ${core.puzzlesCompleted}/${core.puzzlesRequired}`, centerX, lampY + lampSize + 25);

        const puzzle = core.puzzleData;

        if (core.puzzleType === 'sequence') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';

            if (puzzle.showingSequence) {
                this.ctx.fillText('Memorize the sequence:', centerX, 100);

                // Show the sequence with highlighting
                const seqY = 150;
                for (let i = 0; i < puzzle.sequence.length; i++) {
                    const x = centerX - (puzzle.sequence.length * 40) / 2 + i * 40;
                    const isCurrentShow = i <= puzzle.showIndex;

                    this.ctx.fillStyle = isCurrentShow ? ['#f00', '#0f0', '#00f', '#ff0'][puzzle.sequence[i] - 1] : '#333';
                    this.ctx.fillRect(x, seqY, 30, 30);

                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '20px monospace';
                    this.ctx.fillText(String(puzzle.sequence[i]), x + 15, seqY + 22);
                }

                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Press any key when ready to input...', centerX, 220);
            } else {
                this.ctx.fillText('Enter the sequence:', centerX, 100);
                this.ctx.fillText(`Progress: ${puzzle.currentIndex} / ${puzzle.sequence.length}`, centerX, 130);

                // Input buttons
                const btnY = 180;
                const colors = ['#f00', '#0f0', '#00f', '#ff0'];
                for (let i = 1; i <= 4; i++) {
                    const x = centerX - 100 + (i - 1) * 60;
                    this.ctx.fillStyle = colors[i - 1];
                    this.ctx.fillRect(x, btnY, 50, 50);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 24px monospace';
                    this.ctx.fillText(String(i), x + 25, btnY + 35);
                }

                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Press [1-4] to input sequence', centerX, 280);
            }
        } else if (core.puzzleType === 'match') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText('Match the pairs:', centerX, 100);
            this.ctx.fillText(`Matches: ${puzzle.matchesMade} / ${puzzle.matchesNeeded}`, centerX, 130);

            // Draw cards in 2x4 grid
            const cardW = 60;
            const cardH = 80;
            const startX = centerX - cardW * 2;
            const startY = 160;

            for (let i = 0; i < 8; i++) {
                const card = puzzle.cards[i];
                const col = i % 4;
                const row = Math.floor(i / 4);
                const x = startX + col * (cardW + 10);
                const y = startY + row * (cardH + 10);

                if (card.matched) {
                    this.ctx.fillStyle = '#040';
                } else if (card.revealed) {
                    this.ctx.fillStyle = '#448';
                } else {
                    this.ctx.fillStyle = '#224';
                }
                this.ctx.fillRect(x, y, cardW, cardH);
                this.ctx.strokeStyle = '#fff';
                this.ctx.strokeRect(x, y, cardW, cardH);

                // Card number
                this.ctx.fillStyle = '#888';
                this.ctx.font = '12px monospace';
                this.ctx.fillText(String(i + 1), x + 5, y + 15);

                // Card symbol
                if (card.revealed || card.matched) {
                    this.ctx.fillStyle = card.matched ? '#0f0' : '#ff0';
                    this.ctx.font = 'bold 30px monospace';
                    this.ctx.fillText(card.symbol, x + cardW / 2, y + cardH / 2 + 10);
                }
            }

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Press [1-8] to reveal cards', centerX, 380);
        } else if (core.puzzleType === 'memory') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';

            if (puzzle.showingPattern) {
                this.ctx.fillText('Memorize the pattern:', centerX, 100);
                this.ctx.fillText(`Time: ${Math.ceil(puzzle.showTimer / 60)}s`, centerX, 130);
            } else {
                this.ctx.fillText('Recreate the pattern:', centerX, 100);
            }

            // Draw 3x3 grid
            const cellSize = 60;
            const gridStartX = centerX - cellSize * 1.5;
            const gridStartY = 160;

            for (let gy = 0; gy < 3; gy++) {
                for (let gx = 0; gx < 3; gx++) {
                    const x = gridStartX + gx * cellSize;
                    const y = gridStartY + gy * cellSize;
                    const idx = gy * 3 + gx + 1;

                    let filled = false;
                    if (puzzle.showingPattern) {
                        filled = puzzle.pattern[gy][gx];
                    } else {
                        filled = puzzle.playerPattern[gy][gx];
                    }

                    this.ctx.fillStyle = filled ? '#0af' : '#223';
                    this.ctx.fillRect(x, y, cellSize - 4, cellSize - 4);
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.strokeRect(x, y, cellSize - 4, cellSize - 4);

                    // Number
                    this.ctx.fillStyle = '#666';
                    this.ctx.font = '12px monospace';
                    this.ctx.fillText(String(idx), x + 5, y + 15);
                }
            }

            if (!puzzle.showingPattern) {
                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Press [1-9] to toggle cells, [Enter] to submit', centerX, 360);
            }
        }

        // Escape hint
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('[ESC] to leave puzzle', centerX, this.canvas.height - 20);
    }

    drawClassSelection(classes: any[], selectedIndex: number) {
        // Dark background
        this.ctx.fillStyle = '#0a0a15';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        // Title
        this.ctx.fillStyle = '#4af';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SELECT YOUR CLASS', centerX, 60);

        // Subtitle
        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('Use [W/S] or arrows to navigate, [Enter] to select', centerX, 90);

        // Draw class options
        const startY = 130;
        const boxHeight = 80;
        const boxWidth = 500;
        const boxX = centerX - boxWidth / 2;

        classes.forEach((cls, index) => {
            const y = startY + index * (boxHeight + 15);
            const isSelected = index === selectedIndex;

            // Box background
            this.ctx.fillStyle = isSelected ? 'rgba(68, 170, 255, 0.3)' : 'rgba(30, 30, 50, 0.8)';
            this.ctx.fillRect(boxX, y, boxWidth, boxHeight);

            // Border
            this.ctx.strokeStyle = isSelected ? '#4af' : '#444';
            this.ctx.lineWidth = isSelected ? 3 : 1;
            this.ctx.strokeRect(boxX, y, boxWidth, boxHeight);

            // Draw sprite preview (8x8 scaled to 48x48)
            if (cls.pixels) {
                const spriteX = boxX + 20;
                const spriteY = y + 16;
                const pixelSize = 6;
                for (let py = 0; py < 8; py++) {
                    for (let px = 0; px < 8; px++) {
                        const color = cls.pixels[py]?.[px];
                        if (color && color !== 'transparent') {
                            this.ctx.fillStyle = color;
                            this.ctx.fillRect(spriteX + px * pixelSize, spriteY + py * pixelSize, pixelSize, pixelSize);
                        }
                    }
                }
            } else {
                // Fallback: draw char
                this.ctx.fillStyle = cls.color || '#fff';
                this.ctx.font = 'bold 40px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(cls.char || '@', boxX + 44, y + 52);
            }

            // Class name
            this.ctx.fillStyle = cls.color || '#fff';
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(cls.name, boxX + 90, y + 25);

            // Description
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px monospace';
            const desc = cls.metadata?.description || cls.description || 'No description';
            this.ctx.fillText(desc.substring(0, 50), boxX + 90, y + 45);

            // Stats
            this.ctx.fillStyle = '#888';
            this.ctx.font = '11px monospace';
            const stats = cls.stats;
            if (stats) {
                const statLine = `HP:${stats.baseHp} MP:${stats.baseMana} ATK:${stats.baseAttack} DEF:${stats.baseDefense}`;
                this.ctx.fillText(statLine, boxX + 90, y + 65);
            }

            // Selection indicator
            if (isSelected) {
                this.ctx.fillStyle = '#4af';
                this.ctx.font = 'bold 20px monospace';
                this.ctx.textAlign = 'right';
                this.ctx.fillText('>', boxX - 10, y + boxHeight / 2 + 8);
            }
        });

        // Footer
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Create custom classes at /editor', centerX, this.canvas.height - 20);
    }

    drawNotifications(notifications: Array<{ message: string; timestamp: number; duration: number }>) {
        if (notifications.length === 0) return;

        const now = Date.now();
        const centerX = this.canvas.width / 2;
        let y = 120; // Start from top

        this.ctx.textAlign = 'center';

        for (const notif of notifications) {
            const elapsed = now - notif.timestamp;
            const remaining = notif.duration - elapsed;

            // Calculate alpha for fade out (fade during last 500ms)
            let alpha = 1;
            if (remaining < 500) {
                alpha = remaining / 500;
            }

            // Background
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
            const textWidth = this.ctx.measureText(notif.message).width;
            this.ctx.fillRect(centerX - textWidth / 2 - 20, y - 20, textWidth + 40, 35);

            // Border
            this.ctx.strokeStyle = `rgba(68, 170, 255, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - textWidth / 2 - 20, y - 20, textWidth + 40, 35);

            // Text
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(notif.message, centerX, y);

            y += 45;
        }
    }
}

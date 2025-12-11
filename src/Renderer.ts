import { GameMap } from './Map';
import { Entity, Item, Trap, Player, DungeonCore } from './Entity';
import { TILE_SIZE, TileType, ItemType, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './utils';
import { CombatSystem, CombatPhase, ACTIONS, MultiCombatSystem, MultiCombatPhase } from './Combat';
import { Chest, RARITY_COLORS, RARITY_NAMES, CRAFTING_RECIPES, MATERIALS } from './Equipment';
import { AssetManager, drawAsset } from './GameAssets';
import { getBiomeForFloor, type BiomeTheme } from './Biomes';
import { type DuelState, DuelPhase, DuelAction, type DuelStats, type GameRoom } from './Multiplayer';

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    currentBiome: BiomeTheme;
    width: number;
    height: number;

    constructor(canvasId: string, width: number, height: number) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.width = width;
        this.height = height;
        this.currentBiome = getBiomeForFloor(1);

        // Set internal resolution
        this.canvas.width = width * TILE_SIZE;
        this.canvas.height = height * TILE_SIZE;

        // Scale canvas to fit screen while maintaining aspect ratio
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.ctx.font = '12px monospace';
    }

    setBiome(floor: number) {
        this.currentBiome = getBiomeForFloor(floor);
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

        const biome = this.currentBiome;

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
                        this.ctx.fillStyle = biome.wallColor;
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        // Add depth/shadow
                        this.ctx.fillStyle = biome.wallShadow;
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE - 4, TILE_SIZE, 4);
                    } else if (tile === TileType.Floor) {
                        this.ctx.fillStyle = biome.floorColor;
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        // Floor texture dot
                        this.ctx.fillStyle = biome.floorAccent;
                        this.ctx.fillRect(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2, 2);
                    } else {
                        this.ctx.fillStyle = '#000';
                        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                } else if (explored) {
                    if (tile === TileType.Wall) {
                        // Darken wall color for explored but not visible
                        this.ctx.fillStyle = this.darkenColor(biome.wallColor, biome.ambientLight);
                    } else if (tile === TileType.Floor) {
                        this.ctx.fillStyle = biome.fogColor;
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

    // Helper to darken a hex color
    private darkenColor(hex: string, factor: number): string {
        const c = hex.replace('#', '');
        const r = Math.floor(parseInt(c.substring(0, 2), 16) * factor);
        const g = Math.floor(parseInt(c.substring(2, 4), 16) * factor);
        const b = Math.floor(parseInt(c.substring(4, 6), 16) * factor);
        return `rgb(${r}, ${g}, ${b})`;
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

    drawNPC(npc: { x: number; y: number; char: string; color: string; name: string; type: string }, map: GameMap, camX: number, camY: number) {
        if (!map.visible[npc.y][npc.x]) return;

        const screenX = npc.x - camX;
        const screenY = npc.y - camY;

        if (screenX < 0 || screenX >= VIEWPORT_WIDTH || screenY < 0 || screenY >= VIEWPORT_HEIGHT) return;

        const px = screenX * TILE_SIZE;
        const py = screenY * TILE_SIZE;

        // Draw NPC background based on type
        let bgColor = '#333';
        switch (npc.type) {
            case 'trader': bgColor = '#442'; break;
            case 'soul_trader': bgColor = '#224'; break;
            case 'healer': bgColor = '#242'; break;
            case 'sage': bgColor = '#234'; break;
            case 'blacksmith': bgColor = '#432'; break;
        }

        // Background circle
        this.ctx.fillStyle = bgColor;
        this.ctx.beginPath();
        this.ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Character
        this.ctx.fillStyle = npc.color;
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(npc.char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);

        // Name above (small)
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '8px monospace';
        this.ctx.fillText(npc.name.split(' ')[0], px + TILE_SIZE / 2, py - 4);
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
        // Draw dark overlay with biome color
        this.ctx.fillStyle = this.currentBiome.combatBgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        // ========== INTRO ANIMATION ==========
        if (combat.phase === CombatPhase.Intro) {
            this.drawCombatIntro(combat);
            return;
        }

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

        // Draw effects with ink-style animations
        for (const effect of combat.effects) {
            const alpha = effect.life / effect.maxLife;
            const progress = 1 - alpha; // 0 at start, 1 at end
            this.ctx.save();

            if (effect.type === 'hit' || effect.type === 'execute') {
                // Ink-style slash: wider in middle, tapered at ends
                this.drawInkSlash(
                    effect.x + enemyOffset, effect.y,
                    effect.angle ?? -Math.PI / 4,
                    effect.scale ?? 60,
                    effect.color, alpha, progress
                );
            } else if (effect.type === 'block') {
                // Shield effect: hexagonal barrier
                this.drawShieldEffect(effect.x, effect.y, effect.color, alpha, progress);
            } else if (effect.type === 'heal') {
                // Heal: Rising sparkles and glow
                this.drawHealEffect(effect.x, effect.y, effect.color, alpha, progress);
            } else if (effect.type === 'fireball') {
                // Fireball: Flame burst with trailing particles
                this.drawFireballEffect(
                    effect.x + enemyOffset, effect.y,
                    effect.color, effect.secondary ?? '#ff4400',
                    alpha, progress
                );
            } else if (effect.type === 'premonition') {
                // Eye/vision effect
                this.drawPremonitionEffect(effect.x, effect.y, effect.color, alpha);
            } else if (effect.type === 'clash') {
                // Impact burst for heavy attacks
                this.drawImpactEffect(effect.x + enemyOffset, effect.y, effect.color, alpha, progress);
            }

            this.ctx.restore();
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

    // Pokemon-style combat intro animation
    private drawCombatIntro(combat: CombatSystem) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const progress = combat.introProgress / 100; // 0 to 1

        // Background flash effect
        if (progress < 0.2) {
            const flashAlpha = (1 - progress / 0.2) * 0.8;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Diagonal wipe lines (classic pokemon transition)
        if (progress < 0.3) {
            const wipeProgress = progress / 0.3;
            this.ctx.fillStyle = this.currentBiome.combatAccent;
            for (let i = 0; i < 10; i++) {
                const offset = (i * 100) - (wipeProgress * 1200);
                this.ctx.beginPath();
                this.ctx.moveTo(offset, 0);
                this.ctx.lineTo(offset + 80, 0);
                this.ctx.lineTo(offset + 80 + this.canvas.height, this.canvas.height);
                this.ctx.lineTo(offset + this.canvas.height, this.canvas.height);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }

        // "VS" text that scales in
        if (progress > 0.2 && progress < 0.7) {
            const textProgress = (progress - 0.2) / 0.3;
            const scale = Math.min(1, textProgress * 1.5);
            const alpha = progress < 0.5 ? 1 : Math.max(0, 1 - (progress - 0.5) / 0.2);

            this.ctx.save();
            this.ctx.translate(centerX, centerY - 30);
            this.ctx.scale(scale, scale);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 60px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('VS', 0, 0);
            this.ctx.restore();
        }

        // Player slides in from left
        const playerSlideProgress = Math.min(1, progress * 2);
        const playerX = -100 + (playerSlideProgress * (centerX - 100));
        const playerY = centerY + 50;

        // Player sprite
        this.ctx.fillStyle = '#4af';
        this.ctx.fillRect(playerX - 30, playerY - 50, 60, 100);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 40px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('@', playerX, playerY + 10);

        // Enemy slides in from right
        const enemySlideProgress = Math.min(1, Math.max(0, progress - 0.1) * 2);
        const enemyX = this.canvas.width + 100 - (enemySlideProgress * (centerX));
        const enemyY = centerY + 50;

        // Enemy sprite
        this.ctx.fillStyle = combat.enemy.color;
        this.ctx.fillRect(enemyX - 30, enemyY - 50, 60, 100);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(combat.enemy.char, enemyX, enemyY + 10);

        // Enemy name reveal
        if (progress > 0.5) {
            const nameAlpha = Math.min(1, (progress - 0.5) * 4);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${nameAlpha})`;
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`A wild ${combat.enemy.name} appears!`, centerX, 60);

            // Level indicator
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`Level ${combat.enemy.stats.level}`, centerX, 90);
        }

        // "FIGHT!" text at the end
        if (progress > 0.8) {
            const fightAlpha = (progress - 0.8) / 0.2;
            const fightScale = 1 + Math.sin(fightAlpha * Math.PI * 2) * 0.1;

            this.ctx.save();
            this.ctx.translate(centerX, this.canvas.height - 80);
            this.ctx.scale(fightScale, fightScale);
            this.ctx.fillStyle = `rgba(255, 200, 0, ${fightAlpha})`;
            this.ctx.font = 'bold 36px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FIGHT!', 0, 0);
            this.ctx.restore();
        }
    }

    drawMultiCombat(combat: MultiCombatSystem) {
        // Draw dark overlay with biome color
        this.ctx.fillStyle = this.currentBiome.combatBgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const aliveEnemies = combat.getAliveEnemies();

        // ========== TITLE ==========
        this.ctx.fillStyle = '#f80';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`-- SWARM BATTLE - Turn ${combat.turn} --`, centerX, 35);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`${aliveEnemies.length} enemies remaining`, centerX, 55);

        // ========== PLAYER BOX ==========
        const playerBoxX = 30;
        const boxY = 70;
        const boxW = 180;
        const boxH = 110;

        this.ctx.fillStyle = 'rgba(0, 50, 100, 0.8)';
        this.ctx.fillRect(playerBoxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#0af';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(playerBoxX, boxY, boxW, boxH);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('YOU', playerBoxX + 10, boxY + 20);

        this.drawBar(playerBoxX + 10, boxY + 28, boxW - 20, 16,
            combat.player.stats.hp, combat.player.stats.maxHp, '#0f0', '#300', 'HP');
        this.drawBar(playerBoxX + 10, boxY + 48, boxW - 20, 12,
            combat.player.stats.mana, combat.player.stats.maxMana, '#00f', '#003', 'MP');
        this.drawBar(playerBoxX + 10, boxY + 64, boxW - 20, 12,
            combat.playerStamina, combat.maxPlayerStamina, '#ff0', '#330', 'ST');

        // Combo points
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '11px monospace';
        this.ctx.fillText(`Combo: `, playerBoxX + 10, boxY + 95);
        for (let i = 0; i < combat.maxComboPoints; i++) {
            this.ctx.fillStyle = i < combat.comboPoints ? '#f80' : '#444';
            this.ctx.fillRect(playerBoxX + 55 + i * 18, boxY + 84, 14, 14);
        }

        // ========== ENEMY LIST ==========
        const enemyListX = 230;
        const enemyListW = this.canvas.width - enemyListX - 20;
        const enemyListH = Math.min(140, 30 + aliveEnemies.length * 35);

        this.ctx.fillStyle = 'rgba(60, 20, 20, 0.8)';
        this.ctx.fillRect(enemyListX, boxY, enemyListW, enemyListH);
        this.ctx.strokeStyle = '#f44';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(enemyListX, boxY, enemyListW, enemyListH);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('ENEMIES (UP/DOWN to select, ENTER to confirm)', enemyListX + 10, boxY + 18);

        // List enemies
        const isSelectingTarget = combat.phase === MultiCombatPhase.SelectTarget;
        for (let i = 0; i < aliveEnemies.length; i++) {
            const state = aliveEnemies[i];
            const y = boxY + 30 + i * 30;

            // Highlight selected
            const isSelected = i === combat.selectedTargetIndex;
            if (isSelected && isSelectingTarget) {
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                this.ctx.fillRect(enemyListX + 5, y - 8, enemyListW - 10, 28);
            }

            // Enemy name and HP
            this.ctx.fillStyle = isSelected ? '#ff0' : '#fff';
            this.ctx.font = '12px monospace';
            const prefix = isSelected ? '>' : ' ';
            this.ctx.fillText(`${prefix} ${state.enemy.name} (Lv${state.enemy.stats.level})`, enemyListX + 10, y + 5);

            // Mini HP bar
            const hpBarX = enemyListX + 200;
            const hpBarW = 120;
            this.ctx.fillStyle = '#300';
            this.ctx.fillRect(hpBarX, y - 3, hpBarW, 12);
            const hpPct = state.enemy.stats.hp / state.enemy.stats.maxHp;
            this.ctx.fillStyle = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
            this.ctx.fillRect(hpBarX, y - 3, hpBarW * hpPct, 12);
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(hpBarX, y - 3, hpBarW, 12);

            // HP text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(`${state.enemy.stats.hp}/${state.enemy.stats.maxHp}`, hpBarX + 2, y + 6);

            // Show pending action if premonition active
            if (combat.premonitionActive && state.pendingAction) {
                this.ctx.fillStyle = '#a0f';
                this.ctx.fillText(`→ ${ACTIONS[state.pendingAction].name}`, hpBarX + 130, y + 5);
            }

            // Show damage taken this turn
            if (state.lastDamage > 0) {
                this.ctx.fillStyle = '#f44';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText(`-${state.lastDamage}`, hpBarX + hpBarW + 10, y + 5);
            }
        }

        // ========== ACTION MENU ==========
        const menuY = 230;

        this.ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
        this.ctx.fillRect(20, menuY, this.canvas.width - 40, 100);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(20, menuY, this.canvas.width - 40, 100);

        if (combat.phase === MultiCombatPhase.SelectTarget) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('[ SELECT TARGET - Press ENTER to confirm ]', centerX, menuY + 30);
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Use UP/DOWN arrows to choose which enemy to attack', centerX, menuY + 55);
            this.ctx.fillText('Fireball will hit ALL enemies!', centerX, menuY + 75);
        } else if (combat.phase === MultiCombatPhase.SelectAction) {
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            const targetName = aliveEnemies[combat.selectedTargetIndex]?.enemy.name || 'Enemy';
            this.ctx.fillText(`Target: ${targetName} - SELECT ACTION (TAB to change target)`, centerX, menuY + 20);

            // Draw action buttons
            const actions = [
                { key: '1', name: 'Strike', cost: '15 ST', color: '#f80' },
                { key: '2', name: 'Guard', cost: '10 ST', color: '#0af' },
                { key: '3', name: 'Feint', cost: '20 ST', color: '#0f8' },
                { key: '4', name: 'Heavy', cost: '30 ST', color: '#f44' },
                { key: 'Q', name: 'Heal', cost: '12 MP', color: '#0f0' },
                { key: 'W', name: 'Fire (AOE)', cost: '15 MP', color: '#f80' },
                { key: 'E', name: 'Premonition', cost: '8 MP', color: '#a0f' },
                { key: 'R', name: 'Execute', cost: '3 Combo', color: '#ff0' },
            ];

            const btnW = 85;
            const btnH = 45;
            const startX = 35;

            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                const x = startX + (i % 8) * (btnW + 5);
                const y = menuY + 35;

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
                this.ctx.font = 'bold 10px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`[${action.key}] ${action.name}`, x + btnW / 2, y + 18);
                this.ctx.font = '9px monospace';
                this.ctx.fillStyle = canUse ? action.color : '#444';
                this.ctx.fillText(action.cost, x + btnW / 2, y + 34);
            }
        } else if (combat.phase === MultiCombatPhase.ShowPremonition) {
            this.ctx.fillStyle = '#a0f';
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('** PREMONITION - Enemy Intents Revealed **', centerX, menuY + 40);
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Press any key to choose your action...', centerX, menuY + 70);
        } else if (combat.phase === MultiCombatPhase.Resolution) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('** COMBAT! **', centerX, menuY + 50);
        } else if (combat.phase === MultiCombatPhase.Result && combat.lastResult) {
            const result = combat.lastResult;
            const outcomeColor = result.outcome === 'player_wins' ? '#0f0' :
                result.outcome === 'enemy_wins' ? '#f44' : '#ff0';
            this.ctx.fillStyle = outcomeColor;
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(result.message, centerX, menuY + 40);
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Press any key to continue...', centerX, menuY + 70);
        } else if (combat.phase === MultiCombatPhase.Victory) {
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('** SWARM DEFEATED! **', centerX, menuY + 50);
        } else if (combat.phase === MultiCombatPhase.Defeat) {
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('** OVERWHELMED **', centerX, menuY + 50);
        }

        // ========== COMBAT LOG ==========
        this.ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        this.ctx.fillRect(20, 340, this.canvas.width - 40, 100);

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'left';
        let logY = 355;
        for (let i = combat.log.length - 1; i >= Math.max(0, combat.log.length - 6); i--) {
            this.ctx.fillText(combat.log[i], 30, logY);
            logY += 14;
        }

        // Draw effects with ink-style animations
        for (const effect of combat.effects) {
            const alpha = effect.life / effect.maxLife;
            const progress = 1 - alpha;
            this.ctx.save();

            if (effect.type === 'hit' || effect.type === 'execute') {
                this.drawInkSlash(
                    effect.x, effect.y,
                    effect.angle ?? -Math.PI / 4,
                    effect.scale ?? 50,
                    effect.color, alpha, progress
                );
            } else if (effect.type === 'fireball') {
                this.drawFireballEffect(
                    effect.x, effect.y,
                    effect.color, effect.secondary ?? '#ff4400',
                    alpha, progress
                );
            } else if (effect.type === 'heal') {
                this.drawHealEffect(effect.x, effect.y, effect.color, alpha, progress);
            } else if (effect.type === 'premonition') {
                this.drawPremonitionEffect(effect.x, effect.y, effect.color, alpha);
            } else if (effect.type === 'block') {
                this.drawShieldEffect(effect.x, effect.y, effect.color, alpha, progress);
            } else if (effect.type === 'clash') {
                this.drawImpactEffect(effect.x, effect.y, effect.color, alpha, progress);
            }

            this.ctx.restore();
        }

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

        // Controls hint (moved to not overlap with skills)
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px monospace';
        this.ctx.fillText('[TAB] Stats [I] Equip [C] Craft [N] Notif', 420, 38);

        // Draw Skills (moved further right to avoid overlap)
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '11px monospace';
        this.ctx.fillText(`[1]Heal [2]Fire`, 700, 18);
        this.ctx.fillText(`[T]Skills [M]Multi`, 700, 38);

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

    drawReaperWarning(moveCount: number, threshold: number, reaperSpawned: boolean) {
        // Draw reaper warning/timer at top-right
        const movesRemaining = threshold - moveCount;
        const percent = moveCount / threshold;

        this.ctx.save();
        this.ctx.textAlign = 'right';
        this.ctx.font = '12px monospace';

        if (reaperSpawned) {
            // Reaper is active - flash warning
            const flash = Math.floor(Date.now() / 300) % 2 === 0;
            this.ctx.fillStyle = flash ? '#ff0000' : '#880088';
            this.ctx.fillText('☠ REAPER HUNTING ☠', this.canvas.width - 10, 18);
        } else if (percent >= 0.75) {
            // Critical warning
            const flash = Math.floor(Date.now() / 500) % 2 === 0;
            this.ctx.fillStyle = flash ? '#ff0000' : '#ff8800';
            this.ctx.fillText(`⚠ REAPER: ${movesRemaining} moves ⚠`, this.canvas.width - 10, 18);
        } else if (percent >= 0.5) {
            // Warning
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillText(`Reaper: ${movesRemaining} moves`, this.canvas.width - 10, 18);
        } else {
            // Normal display
            this.ctx.fillStyle = '#888888';
            this.ctx.fillText(`Moves: ${movesRemaining}`, this.canvas.width - 10, 18);
        }

        this.ctx.restore();
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

        // Title with puzzle type
        this.ctx.fillStyle = '#0ff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        const puzzleNames: Record<string, string> = {
            'sequence': 'SEQUENCE',
            'match': 'MATCH PAIRS',
            'memory': 'MEMORY GRID',
            'math': 'ARITHMETIC',
            'logic': 'LOGIC',
            'cipher': 'CIPHER',
            'slider': 'SLIDER',
            'wire': 'WIRING'
        };
        this.ctx.fillText(`-- ${puzzleNames[core.puzzleType] || 'PUZZLE'} --`, centerX, 35);

        // Draw lamps showing puzzle progress
        const lampY = 50;
        const lampSize = 16;
        const lampSpacing = 40;
        const lampsStartX = centerX - (core.puzzlesRequired * lampSpacing) / 2 + lampSpacing / 2;

        for (let i = 0; i < core.puzzlesRequired; i++) {
            const lampX = lampsStartX + i * lampSpacing;
            const isLit = core.lampStates[i];
            const isCurrent = i === core.puzzlesCompleted;

            // Lamp glow effect
            if (isLit) {
                this.ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(lampX, lampY + lampSize / 2, lampSize, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Lamp bulb
            this.ctx.fillStyle = isLit ? '#ffc832' : (isCurrent ? '#666' : '#333');
            this.ctx.beginPath();
            this.ctx.arc(lampX, lampY + lampSize / 2, lampSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Lamp outline
            this.ctx.strokeStyle = isLit ? '#ffdd66' : (isCurrent ? '#0ff' : '#444');
            this.ctx.lineWidth = isCurrent ? 2 : 1;
            this.ctx.beginPath();
            this.ctx.arc(lampX, lampY + lampSize / 2, lampSize / 2, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.lineWidth = 1;

        const puzzle = core.puzzleData;
        const contentY = 90; // Start of puzzle content

        if (core.puzzleType === 'sequence') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';

            if (puzzle.showingSequence) {
                this.ctx.fillText('Memorize the sequence:', centerX, contentY);

                // Show the sequence with highlighting
                const seqY = contentY + 50;
                const colors = ['#f00', '#0f0', '#00f', '#ff0'];
                for (let i = 0; i < puzzle.sequence.length; i++) {
                    const x = centerX - (puzzle.sequence.length * 45) / 2 + i * 45;
                    const isCurrentShow = i === puzzle.showIndex;
                    const isPast = i < puzzle.showIndex;

                    this.ctx.fillStyle = isCurrentShow ? colors[puzzle.sequence[i] - 1] :
                        (isPast ? colors[puzzle.sequence[i] - 1] + '66' : '#222');
                    this.ctx.fillRect(x, seqY, 38, 38);
                    this.ctx.strokeStyle = isCurrentShow ? '#fff' : '#444';
                    this.ctx.lineWidth = isCurrentShow ? 3 : 1;
                    this.ctx.strokeRect(x, seqY, 38, 38);

                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 20px monospace';
                    this.ctx.fillText(String(puzzle.sequence[i]), x + 19, seqY + 27);
                }
                this.ctx.lineWidth = 1;

                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Watch carefully...', centerX, contentY + 120);
            } else {
                this.ctx.fillText('Enter the sequence:', centerX, contentY);

                // Progress bar
                const barW = 200;
                const barH = 20;
                this.ctx.fillStyle = '#222';
                this.ctx.fillRect(centerX - barW / 2, contentY + 20, barW, barH);
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(centerX - barW / 2, contentY + 20, barW * (puzzle.currentIndex / puzzle.sequence.length), barH);
                this.ctx.strokeStyle = '#fff';
                this.ctx.strokeRect(centerX - barW / 2, contentY + 20, barW, barH);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px monospace';
                this.ctx.fillText(`${puzzle.currentIndex} / ${puzzle.sequence.length}`, centerX, contentY + 35);

                // Input buttons
                const btnY = contentY + 80;
                const colors = ['#f00', '#0f0', '#00f', '#ff0'];
                for (let i = 1; i <= 4; i++) {
                    const x = centerX - 130 + (i - 1) * 70;
                    this.ctx.fillStyle = colors[i - 1];
                    this.ctx.fillRect(x, btnY, 60, 60);
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.strokeRect(x, btnY, 60, 60);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 28px monospace';
                    this.ctx.fillText(String(i), x + 30, btnY + 42);
                }

                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Press [1-4] to input', centerX, contentY + 180);
            }
        } else if (core.puzzleType === 'match') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`Match pairs: ${puzzle.matchesMade}/${puzzle.matchesNeeded}`, centerX, contentY);

            // Draw cards in 2x4 grid
            const cardW = 55;
            const cardH = 70;
            const startX = centerX - (cardW + 10) * 2 + 5;
            const startY = contentY + 30;

            for (let i = 0; i < 8; i++) {
                const card = puzzle.cards[i];
                const col = i % 4;
                const row = Math.floor(i / 4);
                const x = startX + col * (cardW + 10);
                const y = startY + row * (cardH + 10);

                if (card.matched) {
                    this.ctx.fillStyle = '#040';
                } else if (card.revealed) {
                    this.ctx.fillStyle = '#336';
                } else {
                    this.ctx.fillStyle = '#223';
                }
                this.ctx.fillRect(x, y, cardW, cardH);

                this.ctx.strokeStyle = card.revealed ? '#ff0' : (card.matched ? '#0f0' : '#555');
                this.ctx.lineWidth = card.revealed ? 2 : 1;
                this.ctx.strokeRect(x, y, cardW, cardH);

                // Card number
                this.ctx.fillStyle = '#888';
                this.ctx.font = '11px monospace';
                this.ctx.fillText(String(i + 1), x + 5, y + 14);

                // Card symbol
                if (card.revealed || card.matched) {
                    this.ctx.fillStyle = card.matched ? '#0f0' : '#ff0';
                    this.ctx.font = 'bold 28px monospace';
                    this.ctx.fillText(card.symbol, x + cardW / 2, y + cardH / 2 + 8);
                }
            }
            this.ctx.lineWidth = 1;

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Press [1-8] to reveal cards', centerX, startY + 200);
        } else if (core.puzzleType === 'memory') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';

            if (puzzle.showingPattern) {
                this.ctx.fillText('Memorize the pattern!', centerX, contentY);
                // Timer bar
                const barW = 150;
                const maxTime = 120 + core.puzzlesCompleted * 20;
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(centerX - barW / 2, contentY + 15, barW, 10);
                this.ctx.fillStyle = puzzle.showTimer > 60 ? '#0f0' : (puzzle.showTimer > 30 ? '#ff0' : '#f00');
                this.ctx.fillRect(centerX - barW / 2, contentY + 15, barW * (puzzle.showTimer / maxTime), 10);
            } else {
                this.ctx.fillText('Recreate the pattern:', centerX, contentY);
            }

            // Draw 3x3 grid
            const cellSize = 55;
            const gridStartX = centerX - cellSize * 1.5;
            const gridStartY = contentY + 45;

            for (let gy = 0; gy < 3; gy++) {
                for (let gx = 0; gx < 3; gx++) {
                    const x = gridStartX + gx * cellSize;
                    const y = gridStartY + gy * cellSize;
                    const idx = gy * 3 + gx + 1;

                    let filled = puzzle.showingPattern ? puzzle.pattern[gy][gx] : puzzle.playerPattern[gy][gx];

                    this.ctx.fillStyle = filled ? '#0af' : '#223';
                    this.ctx.fillRect(x, y, cellSize - 4, cellSize - 4);
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.strokeRect(x, y, cellSize - 4, cellSize - 4);

                    // Number
                    this.ctx.fillStyle = '#666';
                    this.ctx.font = '11px monospace';
                    this.ctx.fillText(String(idx), x + 4, y + 13);
                }
            }

            if (!puzzle.showingPattern) {
                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('[1-9] toggle, [Enter] submit', centerX, gridStartY + 185);
            }
        } else if (core.puzzleType === 'math') {
            // Timer bar
            const barW = 200;
            const pct = puzzle.timer / puzzle.timeLimit;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(centerX - barW / 2, contentY, barW, 15);
            this.ctx.fillStyle = pct > 0.5 ? '#0f0' : (pct > 0.25 ? '#ff0' : '#f00');
            this.ctx.fillRect(centerX - barW / 2, contentY, barW * pct, 15);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(`${Math.ceil(puzzle.timer / 60)}s`, centerX, contentY + 11);

            // Expression
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 36px monospace';
            this.ctx.fillText(puzzle.expression, centerX, contentY + 70);

            // Options
            const optY = contentY + 110;
            const optW = 80;
            for (let i = 0; i < puzzle.options.length; i++) {
                const x = centerX - (puzzle.options.length * (optW + 10)) / 2 + i * (optW + 10);

                this.ctx.fillStyle = '#334';
                this.ctx.fillRect(x, optY, optW, 50);
                this.ctx.strokeStyle = '#0af';
                this.ctx.strokeRect(x, optY, optW, 50);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 20px monospace';
                this.ctx.fillText(String(puzzle.options[i]), x + optW / 2, optY + 33);

                this.ctx.fillStyle = '#888';
                this.ctx.font = '12px monospace';
                this.ctx.fillText(`[${i + 1}]`, x + optW / 2, optY + 48);
            }

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Press [1-4] to select answer', centerX, optY + 80);
        } else if (core.puzzleType === 'logic') {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText('SOLVE THE LOGIC:', centerX, contentY);

            // Draw the clue with word wrap
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px monospace';
            const lines = puzzle.clue.split('\n');
            let lineY = contentY + 35;
            for (const line of lines) {
                this.ctx.fillText(line, centerX, lineY);
                lineY += 22;
            }

            // Options
            const optY = lineY + 20;
            const optW = 100;
            const optH = 40;
            const totalW = puzzle.options.length * (optW + 10) - 10;

            for (let i = 0; i < puzzle.options.length; i++) {
                const x = centerX - totalW / 2 + i * (optW + 10);

                this.ctx.fillStyle = '#334';
                this.ctx.fillRect(x, optY, optW, optH);
                this.ctx.strokeStyle = '#0af';
                this.ctx.strokeRect(x, optY, optW, optH);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 16px monospace';
                this.ctx.fillText(puzzle.options[i], x + optW / 2, optY + 26);

                this.ctx.fillStyle = '#888';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(`[${i + 1}]`, x + optW / 2, optY + 38);
            }

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Press number to select answer', centerX, optY + 65);
        } else if (core.puzzleType === 'cipher') {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText('DECODE THE CIPHER:', centerX, contentY);

            // Encoded text
            this.ctx.fillStyle = '#f80';
            this.ctx.font = 'bold 32px monospace';
            this.ctx.fillText(puzzle.encoded, centerX, contentY + 55);

            // Hint
            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Hint: ${puzzle.hint}`, centerX, contentY + 85);

            // Input box
            const inputY = contentY + 120;
            const inputW = 200;
            this.ctx.fillStyle = '#223';
            this.ctx.fillRect(centerX - inputW / 2, inputY, inputW, 40);
            this.ctx.strokeStyle = '#0af';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - inputW / 2, inputY, inputW, 40);
            this.ctx.lineWidth = 1;

            // Player input
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = 'bold 24px monospace';
            const displayInput = puzzle.playerInput + '_'.repeat(Math.max(0, puzzle.maxLength - puzzle.playerInput.length));
            this.ctx.fillText(displayInput, centerX, inputY + 28);

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Type letters, [Backspace] to delete, [Enter] to submit', centerX, inputY + 70);
        } else if (core.puzzleType === 'slider') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`Arrange 1-2-3 in order (Moves: ${puzzle.moves})`, centerX, contentY);

            // Draw 2x2 grid
            const tileSize = 70;
            const gridStartX = centerX - tileSize;
            const gridStartY = contentY + 40;

            for (let i = 0; i < 4; i++) {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = gridStartX + col * tileSize;
                const y = gridStartY + row * tileSize;
                const val = puzzle.tiles[i];

                if (val === 0) {
                    this.ctx.fillStyle = '#111';
                } else {
                    this.ctx.fillStyle = '#336';
                }
                this.ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
                this.ctx.strokeStyle = val === 0 ? '#333' : '#0af';
                this.ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

                if (val !== 0) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 32px monospace';
                    this.ctx.fillText(String(val), x + tileSize / 2, y + tileSize / 2 + 10);
                }
            }

            // Goal display
            this.ctx.fillStyle = '#888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Goal: [1][2]', centerX, gridStartY + 160);
            this.ctx.fillText('      [3][ ]', centerX, gridStartY + 175);

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('Use Arrow keys or WASD to slide tiles', centerX, gridStartY + 210);
        } else if (core.puzzleType === 'wire') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText('Connect matching colors:', centerX, contentY);

            const wireY = contentY + 40;
            const leftX = centerX - 150;
            const rightX = centerX + 100;
            const wireSpacing = 45;

            // Draw left side connectors
            for (let i = 0; i < 4; i++) {
                const y = wireY + i * wireSpacing;
                const color = puzzle.leftColors[i];
                const isSelected = puzzle.selectedLeft === i;

                // Connector circle
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(leftX, y + 15, 15, 0, Math.PI * 2);
                this.ctx.fill();

                if (isSelected) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(leftX, y + 15, 18, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.lineWidth = 1;
                }

                // Number label
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '14px monospace';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`[${i + 1}]`, leftX - 25, y + 20);
            }

            // Draw right side connectors
            this.ctx.textAlign = 'left';
            for (let i = 0; i < 4; i++) {
                const y = wireY + i * wireSpacing;
                const color = puzzle.rightColors[i];

                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(rightX, y + 15, 15, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#fff';
                this.ctx.font = '14px monospace';
                this.ctx.fillText(`[${i + 1}]`, rightX + 25, y + 20);
            }

            // Draw connections
            this.ctx.lineWidth = 4;
            for (let i = 0; i < 4; i++) {
                const conn = puzzle.connections[i];
                if (conn !== -1) {
                    const y1 = wireY + i * wireSpacing + 15;
                    const y2 = wireY + conn * wireSpacing + 15;
                    const color = puzzle.leftColors[i];

                    this.ctx.strokeStyle = color;
                    this.ctx.beginPath();
                    this.ctx.moveTo(leftX + 15, y1);
                    this.ctx.bezierCurveTo(centerX - 30, y1, centerX + 30, y2, rightX - 15, y2);
                    this.ctx.stroke();
                }
            }
            this.ctx.lineWidth = 1;
            this.ctx.textAlign = 'center';

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            if (puzzle.selectedLeft === -1) {
                this.ctx.fillText('[1-4] Select left wire', centerX, wireY + 200);
            } else {
                this.ctx.fillText('[1-4] Connect to right, [0] Cancel', centerX, wireY + 200);
            }
        }

        // Escape hint
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('[ESC] to leave puzzle', centerX, this.canvas.height - 15);
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

    drawSkillTree(
        tree: { classId: string; name: string; color: string; nodes: Array<{ id: string; name: string; description: string; icon: string; tier: number; cost: number; maxRanks: number; requires: string[]; effect: any }> },
        playerSkills: Map<string, number>,
        selectedIndex: number,
        skillPoints: number,
        isSecondary: boolean,
        hasSecondaryClass: boolean
    ) {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Title
        this.ctx.fillStyle = tree.color;
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`-- ${tree.name.toUpperCase()} SKILL TREE --`, this.canvas.width / 2, 35);

        // Skill points
        this.ctx.fillStyle = '#ff0';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Skill Points: ${skillPoints}`, this.canvas.width / 2, 55);

        // Show secondary toggle hint
        if (hasSecondaryClass) {
            this.ctx.fillStyle = '#888';
            this.ctx.fillText(`[Q] Switch to ${isSecondary ? 'Primary' : 'Secondary'} Tree`, this.canvas.width / 2, 70);
        }

        // Organize nodes by tier
        const tiers: Map<number, typeof tree.nodes> = new Map();
        for (const node of tree.nodes) {
            if (!tiers.has(node.tier)) tiers.set(node.tier, []);
            tiers.get(node.tier)!.push(node);
        }

        const tierWidth = 150;
        const startX = 50;
        const startY = 90;
        const nodeHeight = 60;

        let nodeIdx = 0;
        for (let tier = 1; tier <= 5; tier++) {
            const tierNodes = tiers.get(tier) || [];
            const tierX = startX + (tier - 1) * tierWidth;

            // Tier header
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Tier ${tier}`, tierX + 60, startY - 5);

            tierNodes.forEach((node, i) => {
                const nodeY = startY + i * nodeHeight;
                const isSelected = nodeIdx === selectedIndex;
                const currentRanks = playerSkills.get(node.id) || 0;
                const isMaxed = currentRanks >= node.maxRanks;

                // Check if requirements are met
                let reqMet = true;
                for (const reqId of node.requires) {
                    if (!playerSkills.get(reqId)) {
                        reqMet = false;
                        break;
                    }
                }

                // Draw connection lines to requirements
                this.ctx.strokeStyle = reqMet ? '#444' : '#222';
                this.ctx.lineWidth = 2;
                for (const reqId of node.requires) {
                    const reqNode = tree.nodes.find(n => n.id === reqId);
                    if (reqNode) {
                        const reqTierNodes = tiers.get(reqNode.tier) || [];
                        const reqNodeIdx = reqTierNodes.indexOf(reqNode);
                        const reqX = startX + (reqNode.tier - 1) * tierWidth + 60;
                        const reqY = startY + reqNodeIdx * nodeHeight + 25;
                        this.ctx.beginPath();
                        this.ctx.moveTo(tierX, nodeY + 25);
                        this.ctx.lineTo(reqX + 60, reqY);
                        this.ctx.stroke();
                    }
                }

                // Node background
                const boxWidth = 120;
                const boxHeight = 50;
                this.ctx.fillStyle = isSelected ? 'rgba(68, 170, 255, 0.3)' : 'rgba(40, 40, 60, 0.8)';
                if (isMaxed) this.ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
                if (!reqMet) this.ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
                this.ctx.fillRect(tierX, nodeY, boxWidth, boxHeight);

                // Border
                this.ctx.strokeStyle = isSelected ? '#4af' : (isMaxed ? '#0f0' : (reqMet ? tree.color : '#333'));
                this.ctx.lineWidth = isSelected ? 2 : 1;
                this.ctx.strokeRect(tierX, nodeY, boxWidth, boxHeight);

                // Icon
                this.ctx.fillStyle = reqMet ? '#fff' : '#666';
                this.ctx.font = '16px monospace';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(node.icon, tierX + 5, nodeY + 20);

                // Name
                this.ctx.fillStyle = reqMet ? '#fff' : '#666';
                this.ctx.font = '12px monospace';
                this.ctx.fillText(node.name.substring(0, 12), tierX + 25, nodeY + 18);

                // Ranks
                this.ctx.fillStyle = isMaxed ? '#0f0' : '#888';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(`${currentRanks}/${node.maxRanks}`, tierX + 25, nodeY + 32);

                // Cost
                this.ctx.fillStyle = skillPoints >= node.cost ? '#ff0' : '#f00';
                this.ctx.fillText(`Cost: ${node.cost}`, tierX + 70, nodeY + 32);

                // Description (only for selected)
                if (isSelected) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '12px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(node.description, this.canvas.width / 2, this.canvas.height - 60);

                    // Requirements
                    if (node.requires.length > 0) {
                        const reqNames = node.requires.map(r => tree.nodes.find(n => n.id === r)?.name || r).join(', ');
                        this.ctx.fillStyle = reqMet ? '#0f0' : '#f00';
                        this.ctx.fillText(`Requires: ${reqNames}`, this.canvas.width / 2, this.canvas.height - 45);
                    }
                }

                nodeIdx++;
            });
        }

        // Footer
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('[↑↓] Navigate | [ENTER] Learn | [ESC] Close', this.canvas.width / 2, this.canvas.height - 15);
    }

    drawMulticlassMenu(options: string[], selectedIndex: number, currentClass: string) {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Title
        this.ctx.fillStyle = '#ff0';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('-- MULTICLASS --', this.canvas.width / 2, 50);

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`Current Class: ${currentClass}`, this.canvas.width / 2, 80);
        this.ctx.fillText('Choose your secondary class:', this.canvas.width / 2, 110);

        // Class options
        const startY = 150;
        options.forEach((option, i) => {
            const isSelected = i === selectedIndex;
            const y = startY + i * 50;

            this.ctx.fillStyle = isSelected ? 'rgba(68, 170, 255, 0.3)' : 'rgba(40, 40, 60, 0.8)';
            this.ctx.fillRect(this.canvas.width / 2 - 100, y - 15, 200, 40);

            this.ctx.strokeStyle = isSelected ? '#4af' : '#666';
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(this.canvas.width / 2 - 100, y - 15, 200, 40);

            this.ctx.fillStyle = isSelected ? '#fff' : '#aaa';
            this.ctx.font = isSelected ? 'bold 18px monospace' : '16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' '), this.canvas.width / 2, y + 8);
        });

        // Info
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Secondary class skills are 75% effective', this.canvas.width / 2, this.canvas.height - 60);
        this.ctx.fillText('[↑↓] Select | [ENTER] Confirm | [ESC] Cancel', this.canvas.width / 2, this.canvas.height - 30);
    }

    drawNotifications(notifications: Array<{ message: string; timestamp: number; duration: number }>, enabled: boolean = true, combatMode: boolean = false) {
        if (notifications.length === 0) return;

        // Show toggle hint
        if (!enabled) {
            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('[N] Notifications OFF', this.canvas.width - 10, 20);
            return;
        }

        const now = Date.now();
        // Position notifications at bottom-right during combat to not obstruct the arena
        const baseX = combatMode ? this.canvas.width - 150 : this.canvas.width / 2;
        let y = combatMode ? this.canvas.height - 100 : 120;

        this.ctx.textAlign = 'center';

        this.ctx.textAlign = combatMode ? 'right' : 'center';

        for (const notif of notifications) {
            const elapsed = now - notif.timestamp;
            const remaining = notif.duration - elapsed;

            // Calculate alpha for fade out (fade during last 500ms)
            let alpha = 1;
            if (remaining < 500) {
                alpha = remaining / 500;
            }

            // Measure text
            this.ctx.font = combatMode ? 'bold 12px monospace' : 'bold 16px monospace';
            const textWidth = this.ctx.measureText(notif.message).width;
            const boxWidth = textWidth + (combatMode ? 16 : 40);
            const boxHeight = combatMode ? 24 : 35;
            const boxX = combatMode ? baseX - boxWidth + textWidth / 2 : baseX - boxWidth / 2;

            // Background
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`;
            this.ctx.fillRect(boxX, y - boxHeight / 2 - 5, boxWidth, boxHeight);

            // Border
            this.ctx.strokeStyle = `rgba(68, 170, 255, ${alpha})`;
            this.ctx.lineWidth = combatMode ? 1 : 2;
            this.ctx.strokeRect(boxX, y - boxHeight / 2 - 5, boxWidth, boxHeight);

            // Text
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fillText(notif.message, baseX, y);

            y += combatMode ? -30 : 45; // Stack upward in combat mode
        }
        this.ctx.textAlign = 'left';
    }

    // ========== INK-STYLE COMBAT EFFECT HELPERS ==========

    private drawInkSlash(x: number, y: number, angle: number, length: number, color: string, alpha: number, progress: number) {
        // Ink-style slash: bezier curve with variable thickness (thick middle, tapered ends)
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Animate the slash drawing over time
        const slashProgress = Math.min(progress * 3, 1); // Slash completes in first third
        const fadeOut = progress > 0.6 ? (1 - progress) / 0.4 : 1;

        const drawnLength = length * slashProgress;
        const halfLen = drawnLength / 2;

        // Create tapered slash path
        this.ctx.beginPath();

        // Top edge of slash (curves up in middle)
        this.ctx.moveTo(-halfLen, 0);
        this.ctx.quadraticCurveTo(-halfLen * 0.3, -12 * fadeOut, 0, -15 * fadeOut); // Thick middle
        this.ctx.quadraticCurveTo(halfLen * 0.3, -12 * fadeOut, halfLen, 0); // Taper to end

        // Bottom edge of slash (curves down in middle)  
        this.ctx.quadraticCurveTo(halfLen * 0.3, 12 * fadeOut, 0, 15 * fadeOut);
        this.ctx.quadraticCurveTo(-halfLen * 0.3, 12 * fadeOut, -halfLen, 0);

        this.ctx.closePath();

        // Fill with gradient
        const gradient = this.ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
        const baseColor = color || '#ffffff';
        gradient.addColorStop(0, this.hexToRgba(baseColor, alpha * fadeOut * 0.3));
        gradient.addColorStop(0.3, this.hexToRgba(baseColor, alpha * fadeOut * 0.9));
        gradient.addColorStop(0.5, this.hexToRgba(baseColor, alpha * fadeOut));
        gradient.addColorStop(0.7, this.hexToRgba(baseColor, alpha * fadeOut * 0.9));
        gradient.addColorStop(1, this.hexToRgba(baseColor, alpha * fadeOut * 0.3));

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Add ink splatter dots
        if (slashProgress > 0.5) {
            this.ctx.fillStyle = this.hexToRgba(baseColor, alpha * fadeOut * 0.6);
            for (let i = 0; i < 5; i++) {
                const dotX = (Math.random() - 0.5) * drawnLength;
                const dotY = (Math.random() - 0.5) * 20;
                const dotSize = Math.random() * 3 + 1;
                this.ctx.beginPath();
                this.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.restore();
    }

    private drawShieldEffect(x: number, y: number, color: string, alpha: number, progress: number) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const scale = 0.8 + progress * 0.4; // Grows slightly
        const pulseAlpha = alpha * (0.7 + Math.sin(progress * Math.PI * 4) * 0.3);

        // Hexagonal shield shape
        this.ctx.beginPath();
        const sides = 6;
        const radius = 35 * scale;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius * 0.7; // Slightly flattened
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();

        // Glowing fill
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        const baseColor = color || '#00aaff';
        gradient.addColorStop(0, this.hexToRgba(baseColor, pulseAlpha * 0.1));
        gradient.addColorStop(0.6, this.hexToRgba(baseColor, pulseAlpha * 0.3));
        gradient.addColorStop(1, this.hexToRgba(baseColor, pulseAlpha * 0.5));

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Border glow
        this.ctx.strokeStyle = this.hexToRgba(baseColor, pulseAlpha);
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Inner pattern
        this.ctx.strokeStyle = this.hexToRgba(baseColor, pulseAlpha * 0.5);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -radius * 0.5);
        this.ctx.lineTo(0, radius * 0.5);
        this.ctx.moveTo(-radius * 0.4, 0);
        this.ctx.lineTo(radius * 0.4, 0);
        this.ctx.stroke();

        this.ctx.restore();
    }

    private drawHealEffect(x: number, y: number, color: string, alpha: number, progress: number) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const baseColor = color || '#00ff88';
        const particleCount = 8;

        // Rising particles
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const spiralOffset = progress * Math.PI * 2;
            const radius = 20 + Math.sin(angle * 3 + spiralOffset) * 10;
            const rise = progress * 60;
            const px = Math.cos(angle + spiralOffset) * radius * (1 - progress * 0.5);
            const py = -rise + Math.sin(angle * 2) * 10;

            const particleAlpha = alpha * (1 - progress * 0.7);
            const size = 4 * (1 - progress * 0.5);

            // Glow
            const glow = this.ctx.createRadialGradient(px, py, 0, px, py, size * 3);
            glow.addColorStop(0, this.hexToRgba(baseColor, particleAlpha));
            glow.addColorStop(1, this.hexToRgba(baseColor, 0));
            this.ctx.fillStyle = glow;
            this.ctx.fillRect(px - size * 3, py - size * 3, size * 6, size * 6);

            // Core
            this.ctx.fillStyle = this.hexToRgba('#ffffff', particleAlpha);
            this.ctx.beginPath();
            this.ctx.arc(px, py, size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Central plus symbol
        if (progress < 0.7) {
            const plusAlpha = alpha * (1 - progress / 0.7);
            this.ctx.strokeStyle = this.hexToRgba(baseColor, plusAlpha);
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -15);
            this.ctx.lineTo(0, 15);
            this.ctx.moveTo(-15, 0);
            this.ctx.lineTo(15, 0);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    private drawFireballEffect(x: number, y: number, color: string, secondary: string, alpha: number, progress: number) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const coreColor = color || '#ffaa00';
        const outerColor = secondary || '#ff4400';

        // Explosion burst
        const burstRadius = 20 + progress * 40;
        const burstAlpha = alpha * (1 - progress * 0.8);

        // Outer flame ring
        const outerGlow = this.ctx.createRadialGradient(0, 0, burstRadius * 0.3, 0, 0, burstRadius);
        outerGlow.addColorStop(0, this.hexToRgba(coreColor, burstAlpha * 0.8));
        outerGlow.addColorStop(0.4, this.hexToRgba(outerColor, burstAlpha * 0.6));
        outerGlow.addColorStop(0.7, this.hexToRgba('#ff0000', burstAlpha * 0.3));
        outerGlow.addColorStop(1, this.hexToRgba('#ff0000', 0));

        this.ctx.fillStyle = outerGlow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, burstRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Flame tongues
        const flameCount = 8;
        for (let i = 0; i < flameCount; i++) {
            const angle = (i / flameCount) * Math.PI * 2 + progress * Math.PI;
            const flameLen = burstRadius * (0.5 + Math.random() * 0.5);

            this.ctx.save();
            this.ctx.rotate(angle);
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(flameLen * 0.3, -8, flameLen, 0);
            this.ctx.quadraticCurveTo(flameLen * 0.3, 8, 0, 0);
            this.ctx.fillStyle = this.hexToRgba(coreColor, burstAlpha * 0.7);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Hot core
        if (progress < 0.5) {
            const coreAlpha = alpha * (1 - progress * 2);
            this.ctx.fillStyle = this.hexToRgba('#ffffff', coreAlpha);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    private drawPremonitionEffect(x: number, y: number, color: string, alpha: number) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const baseColor = color || '#aa88ff';

        // Eye shape
        this.ctx.strokeStyle = this.hexToRgba(baseColor, alpha);
        this.ctx.lineWidth = 2;

        // Outer eye
        this.ctx.beginPath();
        this.ctx.moveTo(-25, 0);
        this.ctx.quadraticCurveTo(0, -18, 25, 0);
        this.ctx.quadraticCurveTo(0, 18, -25, 0);
        this.ctx.stroke();

        // Iris
        this.ctx.fillStyle = this.hexToRgba(baseColor, alpha * 0.5);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Pupil
        this.ctx.fillStyle = this.hexToRgba('#000000', alpha);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Glow
        const glow = this.ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
        glow.addColorStop(0, this.hexToRgba(baseColor, alpha * 0.3));
        glow.addColorStop(1, this.hexToRgba(baseColor, 0));
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(-35, -35, 70, 70);

        this.ctx.restore();
    }

    private drawImpactEffect(x: number, y: number, color: string, alpha: number, progress: number) {
        this.ctx.save();
        this.ctx.translate(x, y);

        const baseColor = color || '#ffcc00';

        // Shockwave rings
        for (let ring = 0; ring < 3; ring++) {
            const ringProgress = Math.max(0, progress - ring * 0.15);
            if (ringProgress <= 0) continue;

            const radius = 15 + ringProgress * 50 + ring * 10;
            const ringAlpha = alpha * (1 - ringProgress) * (1 - ring * 0.3);

            this.ctx.strokeStyle = this.hexToRgba(baseColor, ringAlpha);
            this.ctx.lineWidth = 4 - ring;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Impact spikes
        const spikeCount = 12;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            const spikeLen = 30 + progress * 30;
            const spikeAlpha = alpha * (1 - progress * 0.8);

            this.ctx.save();
            this.ctx.rotate(angle);

            // Ink-style spike (thick at base, pointed)
            this.ctx.beginPath();
            this.ctx.moveTo(8, -4);
            this.ctx.lineTo(spikeLen, 0);
            this.ctx.lineTo(8, 4);
            this.ctx.closePath();

            this.ctx.fillStyle = this.hexToRgba(baseColor, spikeAlpha);
            this.ctx.fill();

            this.ctx.restore();
        }

        // Central flash
        if (progress < 0.3) {
            const flashAlpha = alpha * (1 - progress / 0.3);
            const flashGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
            flashGlow.addColorStop(0, this.hexToRgba('#ffffff', flashAlpha));
            flashGlow.addColorStop(0.3, this.hexToRgba(baseColor, flashAlpha * 0.8));
            flashGlow.addColorStop(1, this.hexToRgba(baseColor, 0));
            this.ctx.fillStyle = flashGlow;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    private hexToRgba(hex: string, alpha: number): string {
        // Handle rgba format
        if (hex.startsWith('rgba')) return hex;
        if (hex.startsWith('rgb')) {
            const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
            }
        }

        // Handle hex
        let c = hex.replace('#', '');
        if (c.length === 3) {
            c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        }
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // ============================================
    // MULTIPLAYER RENDERING
    // ============================================

    drawMultiplayerLobby(room: GameRoom | null, selectedOption: number, isCreating: boolean, roomCode: string) {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.98)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 32px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MULTIPLAYER', centerX, 50);

        if (!room) {
            // Main menu
            this.ctx.font = '18px monospace';
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText('Select game mode:', centerX, 100);

            const options = [
                { label: 'Create Duel Room (vs AI)', desc: 'Fight with a level 50 character' },
                { label: 'Create Duel Room (vs Player)', desc: 'Challenge another player' },
                { label: 'Join Room', desc: 'Enter room code' },
                { label: 'Co-op Dungeon', desc: 'Explore together (Coming Soon)' },
                { label: 'Back to Game', desc: 'Return to main game' }
            ];

            for (let i = 0; i < options.length; i++) {
                const y = 160 + i * 60;
                const isSelected = i === selectedOption;

                this.ctx.fillStyle = isSelected ? 'rgba(100, 150, 255, 0.3)' : 'rgba(50, 50, 80, 0.5)';
                this.ctx.fillRect(centerX - 200, y - 20, 400, 50);
                this.ctx.strokeStyle = isSelected ? '#4af' : '#444';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(centerX - 200, y - 20, 400, 50);

                this.ctx.fillStyle = isSelected ? '#fff' : '#888';
                this.ctx.font = 'bold 16px monospace';
                this.ctx.fillText(options[i].label, centerX, y + 5);
                this.ctx.font = '12px monospace';
                this.ctx.fillStyle = isSelected ? '#aaa' : '#555';
                this.ctx.fillText(options[i].desc, centerX, y + 22);
            }

            // Room code input if joining
            if (isCreating && selectedOption === 2) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ctx.fillRect(centerX - 150, 380, 300, 60);
                this.ctx.strokeStyle = '#4af';
                this.ctx.strokeRect(centerX - 150, 380, 300, 60);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Enter Room Code:', centerX, 400);
                this.ctx.font = 'bold 24px monospace';
                this.ctx.fillStyle = '#4af';
                this.ctx.fillText(roomCode || '______', centerX, 430);
            }

            this.ctx.fillStyle = '#666';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('[↑↓] Navigate | [ENTER] Select | [ESC] Back', centerX, this.canvas.height - 20);
        } else {
            // In a room
            this.ctx.font = '20px monospace';
            this.ctx.fillStyle = '#4af';
            this.ctx.fillText(`Room: ${room.code}`, centerX, 90);
            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Mode: ${room.mode === 'duel' ? 'Duel' : 'Co-op'} | ${room.players.length}/${room.maxPlayers} players`, centerX, 115);

            // Player list
            this.ctx.fillStyle = 'rgba(30, 30, 60, 0.8)';
            this.ctx.fillRect(centerX - 200, 140, 400, 150);
            this.ctx.strokeStyle = '#444';
            this.ctx.strokeRect(centerX - 200, 140, 400, 150);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Players:', centerX - 180, 165);

            for (let i = 0; i < room.players.length; i++) {
                const player = room.players[i];
                const y = 190 + i * 30;

                this.ctx.fillStyle = player.ready ? '#0f0' : '#f80';
                this.ctx.fillText(player.ready ? '✓' : '○', centerX - 180, y);
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(`${player.name}${player.isHost ? ' (Host)' : ''}`, centerX - 150, y);
                this.ctx.fillStyle = '#888';
                this.ctx.fillText(player.ready ? 'Ready' : 'Not Ready', centerX + 100, y);
            }

            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#666';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('[ENTER] Ready/Start | [ESC] Leave Room', centerX, this.canvas.height - 20);
        }
    }

    drawDuelStatAllocation(stats: DuelStats, selectedStat: number) {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.98)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        this.ctx.fillStyle = '#ff0';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ALLOCATE YOUR STATS', centerX, 50);

        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('You are Level 50 - Distribute 50 stat points', centerX, 80);

        // Points remaining
        this.ctx.fillStyle = stats.pointsRemaining > 0 ? '#4af' : '#0f0';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.fillText(`Points Remaining: ${stats.pointsRemaining}`, centerX, 120);

        // Stat list
        const statList: { key: string; label: string; value: number; desc: string }[] = [
            { key: 'hp', label: 'HP', value: stats.maxHp, desc: '+5 HP per point' },
            { key: 'attack', label: 'Attack', value: stats.attack, desc: '+1 ATK per point' },
            { key: 'defense', label: 'Defense', value: stats.defense, desc: '+1 DEF per point' },
            { key: 'mana', label: 'Mana', value: stats.maxMana, desc: '+2 MP per point' },
            { key: 'speed', label: 'Speed', value: stats.speed, desc: '+1 SPD per point' }
        ];

        for (let i = 0; i < statList.length; i++) {
            const stat = statList[i];
            const y = 170 + i * 55;
            const isSelected = i === selectedStat;

            // Background
            this.ctx.fillStyle = isSelected ? 'rgba(100, 150, 255, 0.2)' : 'rgba(40, 40, 60, 0.5)';
            this.ctx.fillRect(centerX - 250, y - 10, 500, 45);
            this.ctx.strokeStyle = isSelected ? '#4af' : '#333';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - 250, y - 10, 500, 45);

            // Label
            this.ctx.fillStyle = isSelected ? '#fff' : '#aaa';
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(stat.label, centerX - 230, y + 10);

            // Value bar
            const barWidth = 200;
            const barX = centerX - 50;
            const maxVal = stat.key === 'hp' ? 350 : stat.key === 'mana' ? 150 : 60;
            const pct = stat.value / maxVal;

            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(barX, y - 2, barWidth, 20);
            this.ctx.fillStyle = this.getStatColor(stat.key);
            this.ctx.fillRect(barX, y - 2, barWidth * pct, 20);
            this.ctx.strokeStyle = '#666';
            this.ctx.strokeRect(barX, y - 2, barWidth, 20);

            // Value text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(stat.value.toString(), barX + barWidth / 2, y + 12);

            // Description
            this.ctx.fillStyle = '#666';
            this.ctx.font = '11px monospace';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(stat.desc, centerX + 230, y + 10);

            // +/- buttons
            if (isSelected) {
                this.ctx.fillStyle = '#4af';
                this.ctx.font = 'bold 24px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('◄', barX - 25, y + 14);
                this.ctx.fillText('►', barX + barWidth + 25, y + 14);
            }
        }

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('[↑↓] Select Stat | [←→] Adjust | [ENTER] Confirm | [ESC] Cancel', centerX, this.canvas.height - 20);
    }

    private getStatColor(stat: string): string {
        switch (stat) {
            case 'hp': return '#0f0';
            case 'attack': return '#f44';
            case 'defense': return '#48f';
            case 'mana': return '#a0f';
            case 'speed': return '#ff0';
            default: return '#888';
        }
    }

    drawDuel(duel: DuelState, isPlayer1: boolean) {
        this.ctx.fillStyle = 'rgba(20, 10, 30, 0.98)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;

        // Title
        this.ctx.fillStyle = '#f80';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`⚔ DUEL - Turn ${duel.turn} ⚔`, centerX, 40);

        // Player boxes
        const p1 = duel.player1Stats;
        const p2 = duel.player2Stats;

        // Player 1 (left)
        this.drawDuelPlayerBox(80, 70, p1, duel.player1Stamina, isPlayer1 ? 'YOU' : 'P1', isPlayer1);

        // Player 2 (right)
        this.drawDuelPlayerBox(this.canvas.width - 280, 70, p2, duel.player2Stamina, !isPlayer1 ? 'YOU' : 'P2/AI', !isPlayer1);

        // VS in center
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 40px monospace';
        this.ctx.fillText('VS', centerX, 140);

        // Action selection or result
        if (duel.phase === DuelPhase.SelectAction) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 18px monospace';
            this.ctx.fillText('SELECT YOUR ACTION', centerX, 220);

            // Action buttons
            const actions = [
                { key: '1', action: DuelAction.Strike, name: 'Strike', cost: '15 ST', color: '#f80' },
                { key: '2', action: DuelAction.Guard, name: 'Guard', cost: '10 ST', color: '#0af' },
                { key: '3', action: DuelAction.Feint, name: 'Feint', cost: '20 ST', color: '#0f8' },
                { key: '4', action: DuelAction.HeavyStrike, name: 'Heavy', cost: '30 ST', color: '#f44' },
                { key: 'Q', action: DuelAction.Heal, name: 'Heal', cost: '15 MP', color: '#0f0' },
                { key: 'W', action: DuelAction.Fireball, name: 'Fireball', cost: '15 MP', color: '#f80' }
            ];

            const btnW = 110;
            const btnH = 60;
            const startX = centerX - (actions.length * (btnW + 10)) / 2;

            for (let i = 0; i < actions.length; i++) {
                const a = actions[i];
                const x = startX + i * (btnW + 10);
                const y = 250;

                this.ctx.fillStyle = 'rgba(50, 50, 70, 0.9)';
                this.ctx.fillRect(x, y, btnW, btnH);
                this.ctx.strokeStyle = a.color;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, btnW, btnH);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 12px monospace';
                this.ctx.fillText(`[${a.key}] ${a.name}`, x + btnW / 2, y + 25);
                this.ctx.font = '10px monospace';
                this.ctx.fillStyle = a.color;
                this.ctx.fillText(a.cost, x + btnW / 2, y + 45);
            }
        } else if (duel.phase === DuelPhase.Result || duel.phase === DuelPhase.Resolution) {
            // Show result
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(duel.lastResult, centerX, 260);

            if (duel.phase === DuelPhase.Result) {
                this.ctx.fillStyle = '#888';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Press any key to continue...', centerX, 300);
            }
        } else if (duel.phase === DuelPhase.Victory) {
            const winColor = duel.winnerId === 'player1' ? (isPlayer1 ? '#0f0' : '#f00') : (!isPlayer1 ? '#0f0' : '#f00');
            this.ctx.fillStyle = winColor;
            this.ctx.font = 'bold 36px monospace';
            this.ctx.fillText(duel.lastResult, centerX, 280);

            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('[ESC] Return to Lobby', centerX, 330);
        }

        // Combat log
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(20, 350, this.canvas.width - 40, 100);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Combat Log:', 30, 370);
        this.ctx.fillText(duel.lastResult, 30, 395);
    }

    private drawDuelPlayerBox(x: number, y: number, stats: DuelStats, stamina: number, label: string, highlight: boolean) {
        const boxW = 200;
        const boxH = 120;

        this.ctx.fillStyle = highlight ? 'rgba(0, 100, 150, 0.6)' : 'rgba(80, 40, 40, 0.6)';
        this.ctx.fillRect(x, y, boxW, boxH);
        this.ctx.strokeStyle = highlight ? '#0af' : '#f44';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, boxW, boxH);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(label, x + 10, y + 22);

        // HP
        this.drawBar(x + 10, y + 32, boxW - 20, 16, stats.hp, stats.maxHp, '#0f0', '#300', 'HP');
        // Mana
        this.drawBar(x + 10, y + 52, boxW - 20, 12, stats.mana, stats.maxMana, '#00f', '#003', 'MP');
        // Stamina
        this.drawBar(x + 10, y + 68, boxW - 20, 12, stamina, 100, '#ff0', '#330', 'ST');

        // Stats
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`ATK:${stats.attack} DEF:${stats.defense} SPD:${stats.speed}`, x + 10, y + 100);
    }

    // NPC Trading screens
    drawTrading(npc: { name: string; dialogue: string[]; inventory: { name: string; description: string; cost: number }[] }, 
                selectedIndex: number, playerGold: number) {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // NPC name and dialogue
        this.ctx.fillStyle = '#ffa500';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(npc.name, this.canvas.width / 2, 40);

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '14px monospace';
        const dialogue = npc.dialogue[Math.floor(Date.now() / 5000) % npc.dialogue.length];
        this.ctx.fillText(`"${dialogue}"`, this.canvas.width / 2, 70);

        // Player gold
        this.ctx.fillStyle = '#fd0';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Gold: ${playerGold}`, this.canvas.width - 30, 40);

        // Items for sale
        this.ctx.textAlign = 'left';
        this.ctx.font = '14px monospace';
        let y = 110;

        for (let i = 0; i < npc.inventory.length; i++) {
            const item = npc.inventory[i];
            const isSelected = i === selectedIndex;
            const canAfford = playerGold >= item.cost;

            this.ctx.fillStyle = isSelected ? (canAfford ? '#0f0' : '#f00') : '#fff';
            if (isSelected) {
                this.ctx.fillRect(30, y - 14, this.canvas.width - 60, 22);
                this.ctx.fillStyle = '#000';
            }

            this.ctx.fillText(`${item.name}`, 40, y);
            this.ctx.fillStyle = isSelected ? '#000' : (canAfford ? '#fd0' : '#800');
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${item.cost} gold`, this.canvas.width - 40, y);
            this.ctx.textAlign = 'left';

            // Description on next line
            this.ctx.fillStyle = isSelected ? '#333' : '#888';
            this.ctx.font = '11px monospace';
            this.ctx.fillText(item.description, 50, y + 14);
            this.ctx.font = '14px monospace';

            y += 40;
        }

        // Controls
        this.ctx.fillStyle = '#888';
        this.ctx.textAlign = 'center';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('[↑/↓] Select  [ENTER] Buy  [ESC] Leave', this.canvas.width / 2, this.canvas.height - 20);
    }

    drawSoulTrading(npc: { name: string; dialogue: string[] }, 
                    options: { from: string; to: string; fromAmount: number; toAmount: number; cost: number }[],
                    selectedIndex: number, playerGold: number, playerStats: { maxHp: number; maxMana: number; attack: number; defense: number }) {
        this.ctx.fillStyle = 'rgba(30, 10, 40, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // NPC name and dialogue
        this.ctx.fillStyle = '#9932cc';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(npc.name, this.canvas.width / 2, 40);

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '14px monospace';
        const dialogue = npc.dialogue[Math.floor(Date.now() / 5000) % npc.dialogue.length];
        this.ctx.fillText(`"${dialogue}"`, this.canvas.width / 2, 70);

        // Current stats
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Current: HP:${playerStats.maxHp} MP:${playerStats.maxMana} ATK:${playerStats.attack} DEF:${playerStats.defense}`, 30, 100);

        // Player gold
        this.ctx.fillStyle = '#fd0';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Gold: ${playerGold}`, this.canvas.width - 30, 40);

        // Reallocation options
        this.ctx.textAlign = 'left';
        this.ctx.font = '13px monospace';
        let y = 140;

        const statNames: Record<string, string> = { hp: 'HP', mana: 'Mana', attack: 'Attack', defense: 'Defense' };

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const isSelected = i === selectedIndex;
            const canAfford = playerGold >= opt.cost;

            this.ctx.fillStyle = isSelected ? (canAfford ? '#a0f' : '#f00') : '#fff';
            if (isSelected) {
                this.ctx.fillRect(30, y - 14, this.canvas.width - 60, 22);
                this.ctx.fillStyle = '#000';
            }

            const fromName = statNames[opt.from] || opt.from;
            const toName = statNames[opt.to] || opt.to;
            this.ctx.fillText(`-${opt.fromAmount} ${fromName} → +${opt.toAmount} ${toName}`, 40, y);
            
            this.ctx.fillStyle = isSelected ? '#333' : (canAfford ? '#fd0' : '#800');
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${opt.cost} gold`, this.canvas.width - 40, y);
            this.ctx.textAlign = 'left';

            y += 30;
        }

        // Controls
        this.ctx.fillStyle = '#888';
        this.ctx.textAlign = 'center';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('[↑/↓] Select  [ENTER] Exchange  [ESC] Leave', this.canvas.width / 2, this.canvas.height - 20);
    }
}

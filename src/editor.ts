/**
 * Deluge-2 Sprite Editor
 * Create and edit .sprite files for custom player classes and enemies
 */

import { SpriteManager, type SpriteData, DEFAULT_PLAYER_SPRITE } from './Sprite';
import { AssetManager, BUILTIN_ASSETS, type GameAsset } from './GameAssets';

// Default color palette
const DEFAULT_PALETTE = [
    '', // Transparent
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff',
    '#00ffff', '#ff8800', '#8800ff', '#00ff88', '#ff0088', '#88ff00', '#0088ff',
    '#884400', '#444444', '#888888', '#cccccc', '#4af', '#f44', '#4f4', '#ff0'
];

// Editor state
let currentTool: 'draw' | 'erase' | 'fill' | 'pick' = 'draw';
let currentColor = '#4af';
let pixelData: string[][] = Array(8).fill(null).map(() => Array(8).fill(''));
let sprites: SpriteData[] = [];
let currentSpriteIndex = -1;
let moveset: SpriteData['moveset'] = [];
let selectedMoveIndex = -1;

// Asset editor state
let assets: GameAsset[] = [];
let selectedAssetId: string | null = null;
let currentAssetCategory: string = 'all';

// Canvas references
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let preview1x: HTMLCanvasElement;
let preview4x: HTMLCanvasElement;
let previewGame: HTMLCanvasElement;

const PIXEL_SIZE = 32; // Size of each pixel in the editor canvas

// Initialize editor
function init() {
    canvas = document.getElementById('spriteCanvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    preview1x = document.getElementById('previewCanvas1x') as HTMLCanvasElement;
    preview4x = document.getElementById('previewCanvas4x') as HTMLCanvasElement;
    previewGame = document.getElementById('previewCanvasGame') as HTMLCanvasElement;

    // Initialize asset manager
    AssetManager.init();

    // Load saved sprites
    loadSprites();

    // Load assets
    loadAssets();

    // Setup color palette
    setupColorPalette();

    // Setup event listeners
    setupCanvasEvents();
    setupUIEvents();
    setupDropZone();
    setupTabs();
    setupAssetEvents();

    // Initial render
    renderCanvas();
    renderSpriteList();
    renderMovesetList();
    renderAssetList();

    // Create a new sprite by default if none exist
    if (sprites.length === 0) {
        createNewSprite();
    } else {
        selectSprite(0);
    }
}

function loadSprites() {
    sprites = SpriteManager.getAllSprites();
}

function setupColorPalette() {
    const palette = document.getElementById('colorPalette')!;
    palette.innerHTML = '';

    DEFAULT_PALETTE.forEach((color) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (color === '' ? ' transparent' : '') + (color === currentColor ? ' selected' : '');
        if (color) {
            swatch.style.backgroundColor = color;
        }
        swatch.onclick = () => selectColor(color);
        palette.appendChild(swatch);
    });
}

function selectColor(color: string) {
    currentColor = color;
    (document.getElementById('customColor') as HTMLInputElement).value = color || '#000000';

    // Update selection UI
    document.querySelectorAll('.color-swatch').forEach((swatch, i) => {
        swatch.classList.toggle('selected', DEFAULT_PALETTE[i] === color);
    });
}

function setupCanvasEvents() {
    let isDrawing = false;

    const getPixelCoords = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
        const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);
        return { x: Math.min(7, Math.max(0, x)), y: Math.min(7, Math.max(0, y)) };
    };

    const handleDraw = (e: MouseEvent) => {
        const { x, y } = getPixelCoords(e);

        switch (currentTool) {
            case 'draw':
                pixelData[y][x] = currentColor;
                break;
            case 'erase':
                pixelData[y][x] = '';
                break;
            case 'fill':
                floodFill(x, y, pixelData[y][x], currentColor);
                break;
            case 'pick':
                if (pixelData[y][x]) {
                    selectColor(pixelData[y][x]);
                }
                break;
        }

        renderCanvas();
        updatePreviews();
    };

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        handleDraw(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing && currentTool !== 'fill' && currentTool !== 'pick') {
            handleDraw(e);
        }
    });

    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseleave', () => isDrawing = false);
}

function floodFill(x: number, y: number, targetColor: string, fillColor: string) {
    if (targetColor === fillColor) return;
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    if (pixelData[y][x] !== targetColor) return;

    pixelData[y][x] = fillColor;

    floodFill(x + 1, y, targetColor, fillColor);
    floodFill(x - 1, y, targetColor, fillColor);
    floodFill(x, y + 1, targetColor, fillColor);
    floodFill(x, y - 1, targetColor, fillColor);
}

function renderCanvas() {
    ctx.fillStyle = '#1a1a25';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * PIXEL_SIZE, 0);
        ctx.lineTo(i * PIXEL_SIZE, 256);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * PIXEL_SIZE);
        ctx.lineTo(256, i * PIXEL_SIZE);
        ctx.stroke();
    }

    // Draw pixels
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (pixelData[y][x]) {
                ctx.fillStyle = pixelData[y][x];
                ctx.fillRect(x * PIXEL_SIZE + 1, y * PIXEL_SIZE + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2);
            } else {
                // Transparent checkerboard
                ctx.fillStyle = '#222';
                ctx.fillRect(x * PIXEL_SIZE + 1, y * PIXEL_SIZE + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2);
                ctx.fillStyle = '#2a2a35';
                if ((x + y) % 2 === 0) {
                    ctx.fillRect(x * PIXEL_SIZE + 1, y * PIXEL_SIZE + 1, (PIXEL_SIZE - 2) / 2, (PIXEL_SIZE - 2) / 2);
                    ctx.fillRect(x * PIXEL_SIZE + 1 + (PIXEL_SIZE - 2) / 2, y * PIXEL_SIZE + 1 + (PIXEL_SIZE - 2) / 2, (PIXEL_SIZE - 2) / 2, (PIXEL_SIZE - 2) / 2);
                }
            }
        }
    }
}

function updatePreviews() {
    // 1x preview
    const ctx1 = preview1x.getContext('2d')!;
    ctx1.fillStyle = '#000';
    ctx1.fillRect(0, 0, 8, 8);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (pixelData[y][x]) {
                ctx1.fillStyle = pixelData[y][x];
                ctx1.fillRect(x, y, 1, 1);
            }
        }
    }

    // 4x preview
    const ctx4 = preview4x.getContext('2d')!;
    ctx4.imageSmoothingEnabled = false;
    ctx4.fillStyle = '#000';
    ctx4.fillRect(0, 0, 32, 32);
    ctx4.drawImage(preview1x, 0, 0, 32, 32);

    // Game size preview (with slight glow effect)
    const ctxGame = previewGame.getContext('2d')!;
    ctxGame.imageSmoothingEnabled = false;
    ctxGame.fillStyle = '#1a1a25';
    ctxGame.fillRect(0, 0, 32, 32);
    ctxGame.drawImage(preview1x, 0, 0, 32, 32);
}

function setupUIEvents() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = (btn as HTMLElement).dataset.tool as any;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Custom color picker
    document.getElementById('customColor')!.addEventListener('input', (e) => {
        currentColor = (e.target as HTMLInputElement).value;
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    });

    // Clear button
    document.getElementById('clearBtn')!.addEventListener('click', () => {
        pixelData = Array(8).fill(null).map(() => Array(8).fill(''));
        renderCanvas();
        updatePreviews();
    });

    // Mirror button
    document.getElementById('mirrorBtn')!.addEventListener('click', () => {
        for (let y = 0; y < 8; y++) {
            const row = [...pixelData[y]];
            pixelData[y] = row.reverse();
        }
        renderCanvas();
        updatePreviews();
    });

    // Rotate button
    document.getElementById('rotateBtn')!.addEventListener('click', () => {
        const newData = Array(8).fill(null).map(() => Array(8).fill(''));
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                newData[x][7 - y] = pixelData[y][x];
            }
        }
        pixelData = newData;
        renderCanvas();
        updatePreviews();
    });

    // New sprite button
    document.getElementById('newSpriteBtn')!.addEventListener('click', createNewSprite);

    // Save sprite button
    document.getElementById('saveBtn')!.addEventListener('click', saveCurrentSprite);

    // Export button
    document.getElementById('exportBtn')!.addEventListener('click', exportCurrentSprite);

    // Delete button
    document.getElementById('deleteBtn')!.addEventListener('click', deleteCurrentSprite);

    // Add move button
    document.getElementById('addMoveBtn')!.addEventListener('click', addNewMove);

    // Remove move button
    document.getElementById('removeMoveBtn')!.addEventListener('click', removeSelectedMove);

    // Save move button
    document.getElementById('saveMoveBtn')!.addEventListener('click', saveCurrentMove);
}

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.tab!;

            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`tab-${tabName}`)!.classList.add('active');
        });
    });
}

function setupDropZone() {
    const dropZone = document.getElementById('dropZone')!;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        const files = e.dataTransfer?.files;
        if (files) {
            handleFiles(files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files) {
            handleFiles(fileInput.files);
        }
    });
}

async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
        if (file.name.endsWith('.sprite') || file.name.endsWith('.json')) {
            const text = await file.text();
            try {
                const sprite = SpriteManager.importSprite(text);
                if (sprite) {
                    // Check if sprite with this ID already exists
                    const existingIndex = sprites.findIndex(s => s.id === sprite.id);
                    if (existingIndex >= 0) {
                        sprites[existingIndex] = sprite;
                    } else {
                        sprites.push(sprite);
                    }
                    SpriteManager.saveSprite(sprite);
                    renderSpriteList();
                    selectSprite(sprites.length - 1);
                }
            } catch (err) {
                alert(`Failed to import ${file.name}: ${err}`);
            }
        }
    }
}

function createNewSprite() {
    const newSprite: SpriteData = {
        ...DEFAULT_PLAYER_SPRITE,
        id: `sprite_${Date.now()}`,
        name: 'New Sprite',
        metadata: {
            ...DEFAULT_PLAYER_SPRITE.metadata,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }
    };

    sprites.push(newSprite);
    SpriteManager.saveSprite(newSprite);
    renderSpriteList();
    selectSprite(sprites.length - 1);
}

function selectSprite(index: number) {
    if (index < 0 || index >= sprites.length) return;

    currentSpriteIndex = index;
    const sprite = sprites[index];

    // Load pixel data
    pixelData = sprite.pixels.map(row => [...row]);

    // Load metadata
    (document.getElementById('spriteId') as HTMLInputElement).value = sprite.id;
    (document.getElementById('spriteName') as HTMLInputElement).value = sprite.name;
    (document.getElementById('spriteType') as HTMLSelectElement).value = sprite.type;
    (document.getElementById('spriteDesc') as HTMLTextAreaElement).value = sprite.metadata.description || '';
    (document.getElementById('spriteChar') as HTMLInputElement).value = sprite.char;
    (document.getElementById('spriteColor') as HTMLInputElement).value = sprite.color;
    (document.getElementById('spriteAuthor') as HTMLInputElement).value = sprite.metadata.author || '';

    // Load stats
    (document.getElementById('statHp') as HTMLInputElement).value = String(sprite.stats.baseHp);
    (document.getElementById('statMana') as HTMLInputElement).value = String(sprite.stats.baseMana);
    (document.getElementById('statAttack') as HTMLInputElement).value = String(sprite.stats.baseAttack);
    (document.getElementById('statDefense') as HTMLInputElement).value = String(sprite.stats.baseDefense);
    (document.getElementById('statCrit') as HTMLInputElement).value = String(sprite.stats.critChance);
    (document.getElementById('statDodge') as HTMLInputElement).value = String(sprite.stats.dodgeChance);
    (document.getElementById('statSpeed') as HTMLInputElement).value = String(sprite.stats.speed);

    // Load behavior
    (document.getElementById('behaviorPattern') as HTMLSelectElement).value = sprite.behavior?.pattern || 'balanced';
    (document.getElementById('behaviorAggro') as HTMLInputElement).value = String(sprite.behavior?.aggroRange || 8);
    (document.getElementById('behaviorMinFloor') as HTMLInputElement).value = String(sprite.behavior?.minFloor || 1);
    (document.getElementById('isBoss') as HTMLInputElement).checked = sprite.behavior?.isBoss || false;
    (document.getElementById('isGolden') as HTMLInputElement).checked = sprite.behavior?.isGolden || false;

    // Load moveset
    moveset = sprite.moveset ? [...sprite.moveset] : [];
    selectedMoveIndex = -1;
    renderMovesetList();

    // Update canvas
    renderCanvas();
    updatePreviews();
    renderSpriteList();
}

function saveCurrentSprite() {
    if (currentSpriteIndex < 0) return;

    const sprite = sprites[currentSpriteIndex];

    // Save pixel data
    sprite.pixels = pixelData.map(row => [...row]);

    // Save metadata
    sprite.id = (document.getElementById('spriteId') as HTMLInputElement).value || sprite.id;
    sprite.name = (document.getElementById('spriteName') as HTMLInputElement).value || 'Unnamed';
    sprite.type = (document.getElementById('spriteType') as HTMLSelectElement).value as any;
    sprite.metadata.description = (document.getElementById('spriteDesc') as HTMLTextAreaElement).value;
    sprite.char = (document.getElementById('spriteChar') as HTMLInputElement).value || '@';
    sprite.color = (document.getElementById('spriteColor') as HTMLInputElement).value || '#fff';
    sprite.metadata.author = (document.getElementById('spriteAuthor') as HTMLInputElement).value;
    sprite.metadata.modified = new Date().toISOString();

    // Save stats
    sprite.stats = {
        baseHp: parseInt((document.getElementById('statHp') as HTMLInputElement).value) || 50,
        baseMana: parseInt((document.getElementById('statMana') as HTMLInputElement).value) || 30,
        baseAttack: parseInt((document.getElementById('statAttack') as HTMLInputElement).value) || 5,
        baseDefense: parseInt((document.getElementById('statDefense') as HTMLInputElement).value) || 1,
        critChance: parseInt((document.getElementById('statCrit') as HTMLInputElement).value) || 5,
        dodgeChance: parseInt((document.getElementById('statDodge') as HTMLInputElement).value) || 5,
        speed: parseInt((document.getElementById('statSpeed') as HTMLInputElement).value) || 5
    };

    // Save behavior
    sprite.behavior = {
        pattern: (document.getElementById('behaviorPattern') as HTMLSelectElement).value as any,
        aggroRange: parseInt((document.getElementById('behaviorAggro') as HTMLInputElement).value) || 8,
        minFloor: parseInt((document.getElementById('behaviorMinFloor') as HTMLInputElement).value) || 1,
        isBoss: (document.getElementById('isBoss') as HTMLInputElement).checked,
        isGolden: (document.getElementById('isGolden') as HTMLInputElement).checked
    };

    // Save moveset
    sprite.moveset = [...moveset];

    SpriteManager.saveSprite(sprite);
    renderSpriteList();

    // Show feedback
    showNotification('Sprite saved!');
}

function exportCurrentSprite() {
    if (currentSpriteIndex < 0) return;

    saveCurrentSprite(); // Make sure we have latest data

    const sprite = sprites[currentSpriteIndex];
    const json = SpriteManager.exportSprite(sprite);

    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite.id}.sprite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Sprite exported!');
}

function deleteCurrentSprite() {
    if (currentSpriteIndex < 0) return;

    if (!confirm(`Delete "${sprites[currentSpriteIndex].name}"?`)) return;

    SpriteManager.deleteSprite(sprites[currentSpriteIndex].id);
    sprites.splice(currentSpriteIndex, 1);

    if (sprites.length === 0) {
        createNewSprite();
    } else {
        selectSprite(Math.min(currentSpriteIndex, sprites.length - 1));
    }

    renderSpriteList();
}

function renderSpriteList() {
    const list = document.getElementById('spriteList')!;
    list.innerHTML = '';

    sprites.forEach((sprite, index) => {
        const item = document.createElement('div');
        item.className = 'sprite-item' + (index === currentSpriteIndex ? ' selected' : '');

        // Create mini preview canvas
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 24;
        miniCanvas.height = 24;
        const miniCtx = miniCanvas.getContext('2d')!;
        miniCtx.imageSmoothingEnabled = false;

        // Draw sprite preview
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (sprite.pixels[y] && sprite.pixels[y][x]) {
                    miniCtx.fillStyle = sprite.pixels[y][x];
                    miniCtx.fillRect(x * 3, y * 3, 3, 3);
                }
            }
        }

        item.innerHTML = `
            <div class="info">
                <div class="name">${sprite.name}</div>
                <div class="type">${sprite.type} - ${sprite.id}</div>
            </div>
        `;
        item.prepend(miniCanvas);
        item.onclick = () => selectSprite(index);

        list.appendChild(item);
    });
}

function renderMovesetList() {
    const list = document.getElementById('movesetList')!;
    list.innerHTML = '';

    moveset.forEach((move, index) => {
        const item = document.createElement('div');
        item.className = 'moveset-item' + (index === selectedMoveIndex ? ' selected' : '');
        item.innerHTML = `
            <div class="name">[${move.key}] ${move.name}</div>
            <div class="cost">Stamina: ${move.staminaCost} | Mana: ${move.manaCost} | Damage: ${move.baseDamage}x</div>
        `;
        item.onclick = () => selectMove(index);
        list.appendChild(item);
    });

    // Hide/show move editor
    document.getElementById('moveEditor')!.style.display = selectedMoveIndex >= 0 ? 'block' : 'none';
}

function selectMove(index: number) {
    selectedMoveIndex = index;
    renderMovesetList();

    if (index >= 0 && index < moveset.length) {
        const move = moveset[index];
        (document.getElementById('moveName') as HTMLInputElement).value = move.name;
        (document.getElementById('moveDesc') as HTMLInputElement).value = move.description;
        (document.getElementById('moveStamina') as HTMLInputElement).value = String(move.staminaCost);
        (document.getElementById('moveMana') as HTMLInputElement).value = String(move.manaCost);
        (document.getElementById('moveDamage') as HTMLInputElement).value = String(move.baseDamage);
        (document.getElementById('moveSpeed') as HTMLInputElement).value = String(move.speed);
        (document.getElementById('moveKey') as HTMLInputElement).value = move.key;
        (document.getElementById('moveSpecial') as HTMLSelectElement).value = move.special || '';
    }
}

function addNewMove() {
    const newMove: SpriteData['moveset'][0] = {
        id: `move_${Date.now()}`,
        name: 'New Move',
        description: 'A combat move',
        staminaCost: 15,
        manaCost: 0,
        baseDamage: 1.0,
        speed: 5,
        key: String(moveset.length + 1)
    };
    moveset.push(newMove);
    selectMove(moveset.length - 1);
}

function removeSelectedMove() {
    if (selectedMoveIndex < 0) return;
    moveset.splice(selectedMoveIndex, 1);
    selectedMoveIndex = -1;
    renderMovesetList();
}

function saveCurrentMove() {
    if (selectedMoveIndex < 0) return;

    const move = moveset[selectedMoveIndex];
    move.name = (document.getElementById('moveName') as HTMLInputElement).value || 'Move';
    move.description = (document.getElementById('moveDesc') as HTMLInputElement).value || '';
    move.staminaCost = parseInt((document.getElementById('moveStamina') as HTMLInputElement).value) || 0;
    move.manaCost = parseInt((document.getElementById('moveMana') as HTMLInputElement).value) || 0;
    move.baseDamage = parseFloat((document.getElementById('moveDamage') as HTMLInputElement).value) || 1.0;
    move.speed = parseInt((document.getElementById('moveSpeed') as HTMLInputElement).value) || 5;
    move.key = (document.getElementById('moveKey') as HTMLInputElement).value || '1';
    move.special = (document.getElementById('moveSpecial') as HTMLSelectElement).value || undefined;

    renderMovesetList();
    showNotification('Move saved!');
}

function showNotification(message: string) {
    // Simple notification
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4af;
        color: #000;
        padding: 10px 20px;
        border-radius: 4px;
        font-weight: bold;
        z-index: 10000;
        animation: fadeIn 0.2s;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        setTimeout(() => div.remove(), 300);
    }, 1500);
}

// ============================================
// Asset Management Functions
// ============================================

function loadAssets() {
    // Load all assets - both built-in and custom
    assets = [];

    // Add built-in assets
    for (const asset of BUILTIN_ASSETS) {
        // Check if there's a custom version
        const customAsset = AssetManager.getAsset(asset.id);
        if (customAsset) {
            assets.push(customAsset);
        } else {
            assets.push(asset);
        }
    }
}

function setupAssetEvents() {
    // Category filter
    const categorySelect = document.getElementById('assetCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            currentAssetCategory = (e.target as HTMLSelectElement).value;
            renderAssetList();
        });
    }

    // Load asset to canvas button
    const loadBtn = document.getElementById('loadAssetBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadAssetToCanvas);
    }

    // Save asset button
    const saveBtn = document.getElementById('saveAssetBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentAsset);
    }

    // Reset asset button
    const resetBtn = document.getElementById('resetAssetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSelectedAsset);
    }
}

function renderAssetList() {
    const list = document.getElementById('assetList');
    if (!list) return;

    list.innerHTML = '';

    // Filter assets by category
    const filteredAssets = currentAssetCategory === 'all'
        ? assets
        : assets.filter(a => a.category === currentAssetCategory);

    filteredAssets.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'asset-item' + (asset.id === selectedAssetId ? ' selected' : '');

        // Create a preview canvas for the asset
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 24;
        previewCanvas.height = 24;
        const previewCtx = previewCanvas.getContext('2d')!;
        previewCtx.imageSmoothingEnabled = false;

        // Draw the asset at 3x scale
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const color = asset.pixels[y]?.[x];
                if (color) {
                    previewCtx.fillStyle = color;
                    previewCtx.fillRect(x * 3, y * 3, 3, 3);
                }
            }
        }

        // Check if this asset has been modified
        const builtinAsset = BUILTIN_ASSETS.find(b => b.id === asset.id);
        const isModified = builtinAsset && JSON.stringify(builtinAsset.pixels) !== JSON.stringify(asset.pixels);

        item.innerHTML = `
            <div class="info">
                <div class="name">${asset.name}</div>
                <div class="category">${asset.category}</div>
                ${isModified ? '<div class="modified">✓ Modified</div>' : ''}
            </div>
        `;
        item.insertBefore(previewCanvas, item.firstChild);

        item.onclick = () => selectAsset(asset.id);
        list.appendChild(item);
    });

    // Show/hide asset info panel
    const assetInfo = document.getElementById('assetInfo');
    if (assetInfo) {
        assetInfo.style.display = selectedAssetId ? 'block' : 'none';
    }
}

function selectAsset(assetId: string) {
    selectedAssetId = assetId;
    renderAssetList();

    const asset = assets.find(a => a.id === assetId);
    if (asset) {
        // Update info panel
        (document.getElementById('assetId') as HTMLInputElement).value = asset.id;
        (document.getElementById('assetName') as HTMLInputElement).value = asset.name;
        (document.getElementById('assetDesc') as HTMLTextAreaElement).value = asset.description || '';
        (document.getElementById('assetColor') as HTMLInputElement).value = asset.color;
    }
}

function loadAssetToCanvas() {
    if (!selectedAssetId) {
        showNotification('Select an asset first!');
        return;
    }

    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    // Load asset pixels to the editor canvas
    pixelData = asset.pixels.map(row => [...row]);

    // Clear sprite selection to indicate we're editing an asset
    currentSpriteIndex = -1;
    document.querySelectorAll('.sprite-item').forEach(item => item.classList.remove('selected'));

    renderCanvas();
    updatePreviews();
    showNotification(`Loaded ${asset.name} to canvas`);
}

function saveCurrentAsset() {
    if (!selectedAssetId) {
        showNotification('Select an asset first!');
        return;
    }

    const assetIndex = assets.findIndex(a => a.id === selectedAssetId);
    if (assetIndex < 0) return;

    // Update asset with current canvas data
    const updatedAsset: GameAsset = {
        ...assets[assetIndex],
        pixels: pixelData.map(row => [...row]),
        name: (document.getElementById('assetName') as HTMLInputElement).value || assets[assetIndex].name,
        description: (document.getElementById('assetDesc') as HTMLTextAreaElement).value || '',
        color: (document.getElementById('assetColor') as HTMLInputElement).value || '#ffffff'
    };

    // Save to storage
    AssetManager.saveAsset(updatedAsset);

    // Update local array
    assets[assetIndex] = updatedAsset;

    renderAssetList();
    showNotification(`Saved ${updatedAsset.name}!`);
}

function resetSelectedAsset() {
    if (!selectedAssetId) {
        showNotification('Select an asset first!');
        return;
    }

    // Find the built-in version
    const builtinAsset = BUILTIN_ASSETS.find(a => a.id === selectedAssetId);
    if (!builtinAsset) {
        showNotification('No default version found!');
        return;
    }

    // Delete custom version
    AssetManager.deleteAsset(selectedAssetId);

    // Reload assets
    loadAssets();
    renderAssetList();

    // Load default to canvas
    pixelData = builtinAsset.pixels.map(row => [...row]);
    renderCanvas();
    updatePreviews();

    showNotification(`Reset ${builtinAsset.name} to default`);
}

// Start the editor
init();

/**
 * Deluge-2 Pixel Art Editor
 * Full-featured pixel art editor with alpha support, undo/redo, and multiple tools
 */

import { SpriteManager, type SpriteData, DEFAULT_PLAYER_SPRITE } from './Sprite';
import { AssetManager, BUILTIN_ASSETS, type GameAsset } from './GameAssets';

// ============================================
// Types & Constants
// ============================================

type Tool = 'draw' | 'erase' | 'fill' | 'pick' | 'line' | 'rect';

interface HistoryState {
    pixels: string[][];
    gridSize: number;
}

const DEFAULT_PALETTE = [
    '', // Transparent
    '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999',
    '#b3b3b3', '#cccccc', '#e6e6e6', '#ffffff', '#ff0000', '#ff4400', '#ff8800',
    '#ffcc00', '#ffff00', '#ccff00', '#88ff00', '#44ff00', '#00ff00', '#00ff44',
    '#00ff88', '#00ffcc', '#00ffff', '#00ccff', '#0088ff', '#0044ff', '#0000ff',
    '#4400ff', '#8800ff', '#cc00ff', '#ff00ff', '#ff00cc', '#ff0088', '#ff0044',
    '#8b4513', '#a0522d', '#cd853f', '#deb887', '#f4a460', '#d2691e', '#b8860b',
    '#ffd700', '#f0e68c', '#bdb76b', '#556b2f', '#228b22', '#006400', '#2e8b57'
];

// ============================================
// Editor State
// ============================================

let gridSize = 8;
let pixelSize = 32; // Size of each pixel on canvas
let currentTool: Tool = 'draw';
let currentColor = '#44aaff';
let currentAlpha = 100;
let pixelData: string[][] = createEmptyGrid(gridSize);
let sprites: SpriteData[] = [];
let currentSpriteIndex = -1;
let assets: GameAsset[] = [];
let selectedAssetId: string | null = null;

// History for undo/redo
let history: HistoryState[] = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// Canvas references
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let preview1x: HTMLCanvasElement;
let preview2x: HTMLCanvasElement;
let preview4x: HTMLCanvasElement;

// Drawing state
let isDrawing = false;
let lineStartX = -1;
let lineStartY = -1;

// ============================================
// Utility Functions
// ============================================

function createEmptyGrid(size: number): string[][] {
    return Array(size).fill(null).map(() => Array(size).fill(''));
}

function cloneGrid(grid: string[][]): string[][] {
    return grid.map(row => [...row]);
}

function hexToRgba(hex: string, alpha: number = 100): string {
    if (!hex || hex === '') return '';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha / 100})`;
}

function rgbaToHex(rgba: string): { hex: string; alpha: number } {
    if (!rgba || rgba === '') return { hex: '', alpha: 100 };
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        const a = match[4] ? Math.round(parseFloat(match[4]) * 100) : 100;
        return { hex: `#${r}${g}${b}`, alpha: a };
    }
    if (rgba.startsWith('#')) {
        return { hex: rgba, alpha: 100 };
    }
    return { hex: '', alpha: 100 };
}

// ============================================
// History Management
// ============================================

function saveToHistory() {
    // Remove any redo states
    history = history.slice(0, historyIndex + 1);

    // Add current state
    history.push({
        pixels: cloneGrid(pixelData),
        gridSize: gridSize
    });

    // Limit history size
    if (history.length > MAX_HISTORY) {
        history.shift();
    } else {
        historyIndex++;
    }

    updateHistoryInfo();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = history[historyIndex];
        gridSize = state.gridSize;
        pixelData = cloneGrid(state.pixels);
        updateCanvasSize();
        renderCanvas();
        updatePreviews();
        updateHistoryInfo();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const state = history[historyIndex];
        gridSize = state.gridSize;
        pixelData = cloneGrid(state.pixels);
        updateCanvasSize();
        renderCanvas();
        updatePreviews();
        updateHistoryInfo();
    }
}

function updateHistoryInfo() {
    const info = document.getElementById('historyInfo');
    if (info) {
        info.textContent = `History: ${historyIndex + 1}/${history.length}`;
    }
}

// ============================================
// Canvas Rendering
// ============================================

function updateCanvasSize() {
    const canvasSize = gridSize * pixelSize;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Update preview canvas sizes
    preview1x.width = gridSize;
    preview1x.height = gridSize;
    preview2x.width = gridSize * 2;
    preview2x.height = gridSize * 2;
    preview4x.width = gridSize * 4;
    preview4x.height = gridSize * 4;
}

function renderCanvas() {
    const canvasSize = gridSize * pixelSize;

    // Clear canvas
    ctx.fillStyle = '#1a1a25';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw pixels
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const px = x * pixelSize;
            const py = y * pixelSize;

            // Draw checkerboard for transparent pixels
            if (!pixelData[y][x] || pixelData[y][x] === '') {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#222' : '#2a2a35';
                ctx.fillRect(px, py, pixelSize, pixelSize);
            } else {
                // Draw transparent background first for alpha
                ctx.fillStyle = (x + y) % 2 === 0 ? '#222' : '#2a2a35';
                ctx.fillRect(px, py, pixelSize, pixelSize);
                // Then draw the pixel color
                ctx.fillStyle = pixelData[y][x];
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }
        }
    }

    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pixelSize, 0);
        ctx.lineTo(i * pixelSize, canvasSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * pixelSize);
        ctx.lineTo(canvasSize, i * pixelSize);
        ctx.stroke();
    }
}

function updatePreviews() {
    // 1x preview
    const ctx1 = preview1x.getContext('2d')!;
    ctx1.clearRect(0, 0, gridSize, gridSize);
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (pixelData[y]?.[x]) {
                ctx1.fillStyle = pixelData[y][x];
                ctx1.fillRect(x, y, 1, 1);
            }
        }
    }

    // 2x preview
    const ctx2 = preview2x.getContext('2d')!;
    ctx2.imageSmoothingEnabled = false;
    ctx2.clearRect(0, 0, gridSize * 2, gridSize * 2);
    ctx2.drawImage(preview1x, 0, 0, gridSize * 2, gridSize * 2);

    // 4x preview
    const ctx4 = preview4x.getContext('2d')!;
    ctx4.imageSmoothingEnabled = false;
    ctx4.clearRect(0, 0, gridSize * 4, gridSize * 4);
    ctx4.drawImage(preview1x, 0, 0, gridSize * 4, gridSize * 4);
}

// ============================================
// Color Management
// ============================================

function updateColorPreview() {
    const preview = document.getElementById('colorPreview') as HTMLElement;
    if (currentColor === '' || currentAlpha === 0) {
        preview.className = 'color-preview-large transparent';
        preview.style.backgroundColor = '';
    } else {
        preview.className = 'color-preview-large';
        preview.style.backgroundColor = hexToRgba(currentColor, currentAlpha);
    }
}

function selectColor(color: string, alpha: number = 100) {
    if (color === '') {
        currentColor = '';
        currentAlpha = 0;
    } else {
        const parsed = rgbaToHex(color);
        currentColor = parsed.hex || color;
        currentAlpha = parsed.alpha !== 100 ? parsed.alpha : alpha;
    }

    // Update UI
    (document.getElementById('colorHex') as HTMLInputElement).value = currentColor;
    (document.getElementById('colorPicker') as HTMLInputElement).value = currentColor || '#000000';
    (document.getElementById('alphaSlider') as HTMLInputElement).value = String(currentAlpha);
    (document.getElementById('alphaValue') as HTMLInputElement).value = String(currentAlpha);

    updateColorPreview();
    updatePaletteSelection();
}

function getCurrentColorValue(): string {
    if (currentColor === '' || currentAlpha === 0) return '';
    if (currentAlpha === 100) return currentColor;
    return hexToRgba(currentColor, currentAlpha);
}

function updatePaletteSelection() {
    document.querySelectorAll('.color-swatch').forEach((swatch, i) => {
        const isSelected = (i === 0 && currentColor === '') ||
            (DEFAULT_PALETTE[i] === currentColor && currentAlpha === 100);
        swatch.classList.toggle('selected', isSelected);
    });
}

function setupColorPalette() {
    const palette = document.getElementById('colorPalette')!;
    palette.innerHTML = '';

    DEFAULT_PALETTE.forEach((color) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (color === '' ? ' transparent' : '');
        if (color) {
            swatch.style.backgroundColor = color;
        }
        swatch.onclick = () => selectColor(color, 100);
        palette.appendChild(swatch);
    });

    updatePaletteSelection();
}

// ============================================
// Drawing Tools
// ============================================

function getPixelCoords(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / pixelSize);
    const y = Math.floor((e.clientY - rect.top) * scaleY / pixelSize);
    return {
        x: Math.min(gridSize - 1, Math.max(0, x)),
        y: Math.min(gridSize - 1, Math.max(0, y))
    };
}

function setPixel(x: number, y: number, color: string) {
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        pixelData[y][x] = color;
    }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, color: string) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        setPixel(x0, y0, color);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

function drawRect(x0: number, y0: number, x1: number, y1: number, color: string) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let x = minX; x <= maxX; x++) {
        setPixel(x, minY, color);
        setPixel(x, maxY, color);
    }
    for (let y = minY; y <= maxY; y++) {
        setPixel(minX, y, color);
        setPixel(maxX, y, color);
    }
}

function floodFill(startX: number, startY: number, targetColor: string, fillColor: string) {
    if (targetColor === fillColor) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
        if (pixelData[y][x] !== targetColor) continue;

        visited.add(key);
        pixelData[y][x] = fillColor;

        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
}

function handleDraw(e: MouseEvent) {
    const { x, y } = getPixelCoords(e);
    const color = getCurrentColorValue();

    switch (currentTool) {
        case 'draw':
            setPixel(x, y, color);
            break;
        case 'erase':
            setPixel(x, y, '');
            break;
        case 'fill':
            floodFill(x, y, pixelData[y][x], color);
            break;
        case 'pick':
            if (pixelData[y][x]) {
                selectColor(pixelData[y][x]);
            } else {
                selectColor('', 0);
            }
            return; // Don't save to history for pick
        case 'line':
        case 'rect':
            return; // Handled separately
    }

    renderCanvas();
    updatePreviews();
}

// ============================================
// Canvas Events
// ============================================

function setupCanvasEvents() {
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const { x, y } = getPixelCoords(e);

        if (currentTool === 'line' || currentTool === 'rect') {
            lineStartX = x;
            lineStartY = y;
            saveToHistory();
        } else {
            saveToHistory();
            handleDraw(e);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const { x, y } = getPixelCoords(e);

        // Update coordinates display
        const coords = document.getElementById('canvasCoords');
        if (coords) coords.textContent = `${x}, ${y}`;

        if (!isDrawing) return;

        if (currentTool === 'line' || currentTool === 'rect') {
            // Preview line/rect
            const state = history[historyIndex];
            pixelData = cloneGrid(state.pixels);

            const color = getCurrentColorValue();
            if (currentTool === 'line') {
                drawLine(lineStartX, lineStartY, x, y, color);
            } else {
                drawRect(lineStartX, lineStartY, x, y, color);
            }
            renderCanvas();
            updatePreviews();
        } else if (currentTool !== 'fill' && currentTool !== 'pick') {
            handleDraw(e);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        lineStartX = -1;
        lineStartY = -1;
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });
}

// ============================================
// UI Events
// ============================================

function setupUIEvents() {
    // Tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = (btn as HTMLElement).dataset.tool as Tool;
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Color inputs
    document.getElementById('colorHex')!.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (/^#[0-9a-fA-F]{6}$/.test(value)) {
            currentColor = value;
            (document.getElementById('colorPicker') as HTMLInputElement).value = value;
            updateColorPreview();
            updatePaletteSelection();
        }
    });

    document.getElementById('colorPicker')!.addEventListener('input', (e) => {
        currentColor = (e.target as HTMLInputElement).value;
        (document.getElementById('colorHex') as HTMLInputElement).value = currentColor;
        updateColorPreview();
        updatePaletteSelection();
    });

    document.getElementById('alphaSlider')!.addEventListener('input', (e) => {
        currentAlpha = parseInt((e.target as HTMLInputElement).value);
        (document.getElementById('alphaValue') as HTMLInputElement).value = String(currentAlpha);
        updateColorPreview();
    });

    document.getElementById('alphaValue')!.addEventListener('input', (e) => {
        currentAlpha = Math.max(0, Math.min(100, parseInt((e.target as HTMLInputElement).value) || 0));
        (document.getElementById('alphaSlider') as HTMLInputElement).value = String(currentAlpha);
        updateColorPreview();
    });

    // Canvas action buttons
    document.getElementById('undoBtn')!.addEventListener('click', undo);
    document.getElementById('redoBtn')!.addEventListener('click', redo);

    document.getElementById('clearBtn')!.addEventListener('click', () => {
        saveToHistory();
        pixelData = createEmptyGrid(gridSize);
        renderCanvas();
        updatePreviews();
    });

    document.getElementById('mirrorHBtn')!.addEventListener('click', () => {
        saveToHistory();
        pixelData = pixelData.map(row => [...row].reverse());
        renderCanvas();
        updatePreviews();
    });

    document.getElementById('mirrorVBtn')!.addEventListener('click', () => {
        saveToHistory();
        pixelData = [...pixelData].reverse();
        renderCanvas();
        updatePreviews();
    });

    document.getElementById('rotateBtn')!.addEventListener('click', () => {
        saveToHistory();
        const newData = createEmptyGrid(gridSize);
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                newData[x][gridSize - 1 - y] = pixelData[y][x];
            }
        }
        pixelData = newData;
        renderCanvas();
        updatePreviews();
    });

    // Zoom controls
    document.getElementById('zoomInBtn')!.addEventListener('click', () => {
        if (pixelSize < 64) {
            pixelSize += 8;
            updateCanvasSize();
            renderCanvas();
            document.getElementById('zoomLevel')!.textContent = `${Math.round(pixelSize / 32 * 100)}%`;
        }
    });

    document.getElementById('zoomOutBtn')!.addEventListener('click', () => {
        if (pixelSize > 8) {
            pixelSize -= 8;
            updateCanvasSize();
            renderCanvas();
            document.getElementById('zoomLevel')!.textContent = `${Math.round(pixelSize / 32 * 100)}%`;
        }
    });

    // Grid size buttons
    document.querySelectorAll('.grid-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newSize = parseInt((btn as HTMLElement).dataset.size!);
            if (newSize !== gridSize) {
                // Resize pixel data
                const newData = createEmptyGrid(newSize);
                const minSize = Math.min(gridSize, newSize);
                for (let y = 0; y < minSize; y++) {
                    for (let x = 0; x < minSize; x++) {
                        newData[y][x] = pixelData[y]?.[x] || '';
                    }
                }
                gridSize = newSize;
                pixelData = newData;

                saveToHistory();
                updateCanvasSize();
                renderCanvas();
                updatePreviews();

                document.querySelectorAll('.grid-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Sprite management
    document.getElementById('newSpriteBtn')!.addEventListener('click', createNewSprite);
    document.getElementById('duplicateBtn')!.addEventListener('click', duplicateSprite);
    document.getElementById('saveBtn')!.addEventListener('click', saveCurrentSprite);
    document.getElementById('exportBtn')!.addEventListener('click', exportCurrentSprite);
    document.getElementById('deleteBtn')!.addEventListener('click', deleteCurrentSprite);

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.tab!;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tabName}`)!.classList.add('active');
        });
    });

    // Asset management
    document.getElementById('assetCategory')!.addEventListener('change', renderAssetList);
    document.getElementById('loadAssetBtn')!.addEventListener('click', loadAssetToCanvas);
    document.getElementById('saveAssetBtn')!.addEventListener('click', saveCurrentAsset);
    document.getElementById('resetAssetBtn')!.addEventListener('click', resetSelectedAsset);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in input
        if ((e.target as HTMLElement).tagName === 'INPUT' ||
            (e.target as HTMLElement).tagName === 'TEXTAREA') return;

        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) redo();
                    else undo();
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 's':
                    e.preventDefault();
                    saveCurrentSprite();
                    break;
            }
        } else {
            switch (e.key.toLowerCase()) {
                case 'd': selectTool('draw'); break;
                case 'e': selectTool('erase'); break;
                case 'f': selectTool('fill'); break;
                case 'i': selectTool('pick'); break;
                case 'l': selectTool('line'); break;
                case 'r': selectTool('rect'); break;
            }
        }
    });
}

function selectTool(tool: Tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.tool === tool);
    });
}

// ============================================
// Drop Zone
// ============================================

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
        if (e.dataTransfer?.files) {
            handleFiles(e.dataTransfer.files);
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
                    const existingIndex = sprites.findIndex(s => s.id === sprite.id);
                    if (existingIndex >= 0) {
                        sprites[existingIndex] = sprite;
                    } else {
                        sprites.push(sprite);
                    }
                    SpriteManager.saveSprite(sprite);
                    renderSpriteList();
                    selectSprite(sprites.length - 1);
                    showNotification('Sprite imported!');
                }
            } catch (err) {
                showNotification(`Failed to import: ${err}`);
            }
        }
    }
}

// ============================================
// Sprite Management
// ============================================

function loadSprites() {
    sprites = SpriteManager.getAllSprites();
}

function createNewSprite() {
    const newSprite: SpriteData = {
        ...DEFAULT_PLAYER_SPRITE,
        id: `sprite_${Date.now()}`,
        name: 'New Sprite',
        pixels: createEmptyGrid(8),
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
    showNotification('New sprite created!');
}

function duplicateSprite() {
    if (currentSpriteIndex < 0) return;

    const source = sprites[currentSpriteIndex];
    const newSprite: SpriteData = {
        ...source,
        id: `sprite_${Date.now()}`,
        name: `${source.name} Copy`,
        pixels: cloneGrid(source.pixels),
        metadata: {
            ...source.metadata,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }
    };

    sprites.push(newSprite);
    SpriteManager.saveSprite(newSprite);
    renderSpriteList();
    selectSprite(sprites.length - 1);
    showNotification('Sprite duplicated!');
}

function selectSprite(index: number) {
    if (index < 0 || index >= sprites.length) return;

    currentSpriteIndex = index;
    const sprite = sprites[index];

    // Determine grid size from sprite
    const spriteSize = sprite.pixels?.length || 8;
    if (spriteSize !== gridSize) {
        gridSize = spriteSize;
        updateCanvasSize();
        document.querySelectorAll('.grid-size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt((btn as HTMLElement).dataset.size!) === gridSize);
        });
    }

    // Load pixel data
    pixelData = sprite.pixels ? cloneGrid(sprite.pixels) : createEmptyGrid(gridSize);

    // Reset history
    history = [{ pixels: cloneGrid(pixelData), gridSize }];
    historyIndex = 0;

    // Load form data
    (document.getElementById('spriteName') as HTMLInputElement).value = sprite.name;
    (document.getElementById('spriteType') as HTMLSelectElement).value = sprite.type;
    (document.getElementById('spriteDesc') as HTMLTextAreaElement).value = sprite.metadata?.description || '';
    (document.getElementById('spriteChar') as HTMLInputElement).value = sprite.char || '@';

    // Load stats
    (document.getElementById('statHp') as HTMLInputElement).value = String(sprite.stats?.baseHp || 50);
    (document.getElementById('statMana') as HTMLInputElement).value = String(sprite.stats?.baseMana || 30);
    (document.getElementById('statAttack') as HTMLInputElement).value = String(sprite.stats?.baseAttack || 5);
    (document.getElementById('statDefense') as HTMLInputElement).value = String(sprite.stats?.baseDefense || 1);
    (document.getElementById('statCrit') as HTMLInputElement).value = String(sprite.stats?.critChance || 5);
    (document.getElementById('statDodge') as HTMLInputElement).value = String(sprite.stats?.dodgeChance || 5);
    (document.getElementById('behaviorPattern') as HTMLSelectElement).value = sprite.behavior?.pattern || 'balanced';

    renderCanvas();
    updatePreviews();
    renderSpriteList();
    updateHistoryInfo();
}

function saveCurrentSprite() {
    if (currentSpriteIndex < 0) return;

    const sprite = sprites[currentSpriteIndex];

    // Save pixel data
    sprite.pixels = cloneGrid(pixelData);

    // Save metadata
    sprite.name = (document.getElementById('spriteName') as HTMLInputElement).value || 'Unnamed';
    sprite.type = (document.getElementById('spriteType') as HTMLSelectElement).value as any;
    sprite.metadata.description = (document.getElementById('spriteDesc') as HTMLTextAreaElement).value;
    sprite.char = (document.getElementById('spriteChar') as HTMLInputElement).value || '@';
    sprite.metadata.modified = new Date().toISOString();

    // Save stats
    sprite.stats = {
        baseHp: parseInt((document.getElementById('statHp') as HTMLInputElement).value) || 50,
        baseMana: parseInt((document.getElementById('statMana') as HTMLInputElement).value) || 30,
        baseAttack: parseInt((document.getElementById('statAttack') as HTMLInputElement).value) || 5,
        baseDefense: parseInt((document.getElementById('statDefense') as HTMLInputElement).value) || 1,
        critChance: parseInt((document.getElementById('statCrit') as HTMLInputElement).value) || 5,
        dodgeChance: parseInt((document.getElementById('statDodge') as HTMLInputElement).value) || 5,
        speed: 5
    };

    // Save behavior
    sprite.behavior = {
        pattern: (document.getElementById('behaviorPattern') as HTMLSelectElement).value as any,
        aggroRange: sprite.behavior?.aggroRange || 5,
        fleeThreshold: sprite.behavior?.fleeThreshold || 0.2,
        preferredActions: sprite.behavior?.preferredActions || [],
        minFloor: sprite.behavior?.minFloor || 1,
        isBoss: sprite.behavior?.isBoss || false,
        isGolden: sprite.behavior?.isGolden || false
    };

    SpriteManager.saveSprite(sprite);
    renderSpriteList();
    showNotification('Sprite saved!');
}

function exportCurrentSprite() {
    if (currentSpriteIndex < 0) return;

    saveCurrentSprite();

    const sprite = sprites[currentSpriteIndex];
    const json = SpriteManager.exportSprite(sprite);

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
    showNotification('Sprite deleted');
}

function renderSpriteList() {
    const list = document.getElementById('spriteList')!;
    list.innerHTML = '';

    sprites.forEach((sprite, index) => {
        const item = document.createElement('div');
        item.className = 'sprite-item' + (index === currentSpriteIndex ? ' selected' : '');

        // Create mini preview
        const miniCanvas = document.createElement('canvas');
        const size = sprite.pixels?.length || 8;
        miniCanvas.width = 24;
        miniCanvas.height = 24;
        const miniCtx = miniCanvas.getContext('2d')!;
        miniCtx.imageSmoothingEnabled = false;

        const pixelScale = 24 / size;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (sprite.pixels?.[y]?.[x]) {
                    miniCtx.fillStyle = sprite.pixels[y][x];
                    miniCtx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
                }
            }
        }

        item.innerHTML = `
            <div class="info">
                <div class="name">${sprite.name}</div>
                <div class="type">${sprite.type}</div>
            </div>
        `;
        item.prepend(miniCanvas);
        item.onclick = () => selectSprite(index);

        list.appendChild(item);
    });
}

// ============================================
// Asset Management
// ============================================

function loadAssets() {
    AssetManager.init();
    assets = [];

    for (const asset of BUILTIN_ASSETS) {
        const customAsset = AssetManager.getAsset(asset.id);
        assets.push(customAsset || asset);
    }
}

function renderAssetList() {
    const list = document.getElementById('assetList')!;
    const category = (document.getElementById('assetCategory') as HTMLSelectElement).value;

    list.innerHTML = '';

    const filtered = category === 'all'
        ? assets
        : assets.filter(a => a.category === category);

    filtered.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'list-item' + (asset.id === selectedAssetId ? ' selected' : '');

        // Create mini preview
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 24;
        miniCanvas.height = 24;
        const miniCtx = miniCanvas.getContext('2d')!;
        miniCtx.imageSmoothingEnabled = false;

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (asset.pixels?.[y]?.[x]) {
                    miniCtx.fillStyle = asset.pixels[y][x];
                    miniCtx.fillRect(x * 3, y * 3, 3, 3);
                }
            }
        }

        item.innerHTML = `
            <div class="info">
                <div class="name">${asset.name}</div>
                <div class="desc">${asset.category}</div>
            </div>
        `;
        item.prepend(miniCanvas);
        item.onclick = () => {
            selectedAssetId = asset.id;
            renderAssetList();
        };

        list.appendChild(item);
    });
}

function loadAssetToCanvas() {
    if (!selectedAssetId) {
        showNotification('Select an asset first');
        return;
    }

    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    // Set grid to 8x8 for assets
    gridSize = 8;
    updateCanvasSize();
    document.querySelectorAll('.grid-size-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt((btn as HTMLElement).dataset.size!) === 8);
    });

    pixelData = asset.pixels ? cloneGrid(asset.pixels) : createEmptyGrid(8);
    saveToHistory();
    renderCanvas();
    updatePreviews();

    showNotification(`Loaded ${asset.name}`);
}

function saveCurrentAsset() {
    if (!selectedAssetId) {
        showNotification('Select an asset first');
        return;
    }

    const assetIndex = assets.findIndex(a => a.id === selectedAssetId);
    if (assetIndex < 0) return;

    const updatedAsset: GameAsset = {
        ...assets[assetIndex],
        pixels: cloneGrid(pixelData)
    };

    AssetManager.saveAsset(updatedAsset);
    assets[assetIndex] = updatedAsset;
    renderAssetList();

    showNotification(`Saved ${updatedAsset.name}`);
}

function resetSelectedAsset() {
    if (!selectedAssetId) {
        showNotification('Select an asset first');
        return;
    }

    const builtinAsset = BUILTIN_ASSETS.find(a => a.id === selectedAssetId);
    if (!builtinAsset) {
        showNotification('No default found');
        return;
    }

    AssetManager.deleteAsset(selectedAssetId);
    loadAssets();
    renderAssetList();

    pixelData = cloneGrid(builtinAsset.pixels);
    saveToHistory();
    renderCanvas();
    updatePreviews();

    showNotification(`Reset ${builtinAsset.name}`);
}

// ============================================
// Notifications
// ============================================

function showNotification(message: string) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        setTimeout(() => div.remove(), 300);
    }, 2000);
}

// ============================================
// Initialization
// ============================================

function init() {
    canvas = document.getElementById('spriteCanvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    preview1x = document.getElementById('preview1x') as HTMLCanvasElement;
    preview2x = document.getElementById('preview2x') as HTMLCanvasElement;
    preview4x = document.getElementById('preview4x') as HTMLCanvasElement;

    // Initialize
    updateCanvasSize();
    loadSprites();
    loadAssets();
    setupColorPalette();
    setupCanvasEvents();
    setupUIEvents();
    setupDropZone();

    // Initial state
    saveToHistory();
    renderCanvas();
    updatePreviews();
    renderSpriteList();
    renderAssetList();
    updateColorPreview();

    // Select first sprite or create new
    if (sprites.length === 0) {
        createNewSprite();
    } else {
        selectSprite(0);
    }
}

// Start
init();

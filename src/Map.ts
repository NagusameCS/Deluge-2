import { TileType, getRandomInt } from './utils';
import { Trap } from './Entity';
import { selectRoomType } from './RoomTypes';
import type { RoomData } from './RoomTypes';

export class GameMap {
    width: number;
    height: number;
    tiles: TileType[][];
    rooms: Rect[] = [];
    roomData: RoomData[] = []; // Room type and state data
    explored: boolean[][];
    visible: boolean[][];
    traps: Trap[] = [];
    floor: number = 1; // Current floor for room type selection

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.explored = [];
        this.visible = [];
        this.initialize();
    }

    initialize() {
        // Fill with walls
        this.tiles = [];
        this.explored = [];
        this.visible = [];
        this.traps = [];
        this.roomData = [];
        for (let y = 0; y < this.height; y++) {
            const row: TileType[] = [];
            const exploredRow: boolean[] = [];
            const visibleRow: boolean[] = [];
            for (let x = 0; x < this.width; x++) {
                row.push(TileType.Wall);
                exploredRow.push(false);
                visibleRow.push(false);
            }
            this.tiles.push(row);
            this.explored.push(exploredRow);
            this.visible.push(visibleRow);
        }
    }

    computeFOV(px: number, py: number, radius: number) {
        // Reset visible
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.visible[y][x] = false;
            }
        }

        // Simple Raycasting for FOV
        for (let i = 0; i < 360; i += 0.5) {
            const rad = i * (Math.PI / 180);
            let x = px + 0.5;
            let y = py + 0.5;
            const dx = Math.cos(rad);
            const dy = Math.sin(rad);

            for (let j = 0; j < radius; j++) {
                x += dx;
                y += dy;
                const mapX = Math.floor(x);
                const mapY = Math.floor(y);

                if (mapX < 0 || mapX >= this.width || mapY < 0 || mapY >= this.height) break;

                this.visible[mapY][mapX] = true;
                this.explored[mapY][mapX] = true;

                if (this.tiles[mapY][mapX] === TileType.Wall) {
                    break;
                }
            }
        }
    }

    generate() {
        this.initialize();
        this.rooms = [];
        this.roomData = [];
        const MAX_ROOMS = 35;
        const MIN_SIZE = 7;
        const MAX_SIZE = 14;

        for (let i = 0; i < MAX_ROOMS * 3; i++) {
            if (this.rooms.length >= MAX_ROOMS) break;

            const w = getRandomInt(MIN_SIZE, MAX_SIZE);
            const h = getRandomInt(MIN_SIZE, MAX_SIZE);
            const x = getRandomInt(2, this.width - w - 2);
            const y = getRandomInt(2, this.height - h - 2);

            const newRoom = new Rect(x, y, w, h);

            let failed = false;
            for (const otherRoom of this.rooms) {
                // Add padding to prevent rooms from touching directly
                const paddedRoom = new Rect(newRoom.x - 2, newRoom.y - 2, newRoom.w + 4, newRoom.h + 4);
                if (paddedRoom.intersects(otherRoom)) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                // Create room with random shape variation
                this.createStyledRoom(newRoom);

                if (this.rooms.length > 0) {
                    // Connect to nearest room using improved corridor routing
                    const nearestRoom = this.findNearestRoom(newRoom);
                    const newCenter = newRoom.center();
                    const nearCenter = nearestRoom.center();

                    this.createSmartCorridor(nearCenter.x, nearCenter.y, newCenter.x, newCenter.y);

                    // Sometimes add extra connections for more interesting layouts
                    if (this.rooms.length > 3 && Math.random() < 0.3) {
                        const randomRoom = this.rooms[getRandomInt(0, Math.max(0, this.rooms.length - 3))];
                        if (randomRoom !== nearestRoom) {
                            const randCenter = randomRoom.center();
                            this.createSmartCorridor(randCenter.x, randCenter.y, newCenter.x, newCenter.y);
                        }
                    }
                }

                // Assign room type
                const isFirst = this.rooms.length === 0;
                const isLast = this.rooms.length === MAX_ROOMS - 1;
                const roomType = selectRoomType(this.floor, isFirst, isLast);

                this.roomData.push({
                    type: roomType,
                    roomIndex: this.rooms.length,
                    cleared: false,
                    specialData: null
                });

                this.rooms.push(newRoom);
            }
        }

        // Add decorative pillars in some rooms
        this.addPillars();

        // Place traps
        for (let i = 0; i < 12 + this.floor * 2; i++) {
            if (this.rooms.length === 0) break;
            const room = this.rooms[getRandomInt(1, this.rooms.length)]; // Skip first room
            const x = getRandomInt(room.x + 2, room.x + room.w - 2);
            const y = getRandomInt(room.y + 2, room.y + room.h - 2);
            if (this.tiles[y][x] === TileType.Floor && !this.hasTrapAt(x, y)) {
                const trapType = Math.random() < 0.7 ? 'spike' : 'poison';
                this.traps.push(new Trap(x, y, trapType, this.floor));
            }
        }
    }

    // Find the nearest room to connect to
    private findNearestRoom(newRoom: Rect): Rect {
        let nearest = this.rooms[this.rooms.length - 1];
        let minDist = Infinity;
        const newCenter = newRoom.center();

        for (const room of this.rooms) {
            const center = room.center();
            const dist = Math.abs(center.x - newCenter.x) + Math.abs(center.y - newCenter.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = room;
            }
        }
        return nearest;
    }

    // Create room with shape variations
    private createStyledRoom(room: Rect) {
        const style = getRandomInt(0, 10);

        if (style < 5) {
            // Standard rectangular room
            this.createRoom(room);
        } else if (style < 7) {
            // Cross-shaped room
            this.createRoom(room);
            // Carve out corners
            const cornerSize = Math.min(2, Math.floor(room.w / 4), Math.floor(room.h / 4));
            if (cornerSize > 0) {
                for (let dy = 0; dy < cornerSize; dy++) {
                    for (let dx = 0; dx < cornerSize; dx++) {
                        this.tiles[room.y + dy][room.x + dx] = TileType.Wall;
                        this.tiles[room.y + dy][room.x + room.w - 1 - dx] = TileType.Wall;
                        this.tiles[room.y + room.h - 1 - dy][room.x + dx] = TileType.Wall;
                        this.tiles[room.y + room.h - 1 - dy][room.x + room.w - 1 - dx] = TileType.Wall;
                    }
                }
            }
        } else if (style < 9) {
            // Diamond/octagonal room
            this.createRoom(room);
            const cutSize = Math.min(3, Math.floor(room.w / 3), Math.floor(room.h / 3));
            if (cutSize > 1) {
                // Cut diagonal corners
                for (let i = 0; i < cutSize; i++) {
                    for (let j = 0; j < cutSize - i; j++) {
                        this.tiles[room.y + i][room.x + j] = TileType.Wall;
                        this.tiles[room.y + i][room.x + room.w - 1 - j] = TileType.Wall;
                        this.tiles[room.y + room.h - 1 - i][room.x + j] = TileType.Wall;
                        this.tiles[room.y + room.h - 1 - i][room.x + room.w - 1 - j] = TileType.Wall;
                    }
                }
            }
        } else {
            // L-shaped room
            this.createRoom(room);
            const cutW = Math.floor(room.w / 2);
            const cutH = Math.floor(room.h / 2);
            const corner = getRandomInt(0, 4);
            for (let dy = 0; dy < cutH; dy++) {
                for (let dx = 0; dx < cutW; dx++) {
                    let ty: number, tx: number;
                    if (corner === 0) { ty = room.y + dy; tx = room.x + dx; }
                    else if (corner === 1) { ty = room.y + dy; tx = room.x + room.w - 1 - dx; }
                    else if (corner === 2) { ty = room.y + room.h - 1 - dy; tx = room.x + dx; }
                    else { ty = room.y + room.h - 1 - dy; tx = room.x + room.w - 1 - dx; }
                    this.tiles[ty][tx] = TileType.Wall;
                }
            }
        }
    }

    // Smarter corridor that avoids cutting through rooms
    private createSmartCorridor(x1: number, y1: number, x2: number, y2: number) {
        // Use a mix of horizontal-then-vertical and curved paths
        const midX = Math.floor((x1 + x2) / 2);
        const midY = Math.floor((y1 + y2) / 2);

        const pathStyle = getRandomInt(0, 4);

        if (pathStyle === 0) {
            // L-shaped: horizontal then vertical
            this.createHCorridor(x1, x2, y1);
            this.createVCorridor(y1, y2, x2);
        } else if (pathStyle === 1) {
            // L-shaped: vertical then horizontal
            this.createVCorridor(y1, y2, x1);
            this.createHCorridor(x1, x2, y2);
        } else if (pathStyle === 2) {
            // S-shaped with horizontal ends
            this.createHCorridor(x1, midX, y1);
            this.createVCorridor(y1, y2, midX);
            this.createHCorridor(midX, x2, y2);
        } else {
            // S-shaped with vertical ends
            this.createVCorridor(y1, midY, x1);
            this.createHCorridor(x1, x2, midY);
            this.createVCorridor(midY, y2, x2);
        }

        // Widen corridors occasionally for more interesting paths
        if (Math.random() < 0.3) {
            this.widenCorridor(x1, y1, x2, y2);
        }
    }

    // Widen part of a corridor
    private widenCorridor(x1: number, y1: number, x2: number, y2: number) {
        const midX = Math.floor((x1 + x2) / 2);
        const midY = Math.floor((y1 + y2) / 2);

        // Create a small alcove/widening at the midpoint
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tx = midX + dx;
                const ty = midY + dy;
                if (tx > 0 && tx < this.width - 1 && ty > 0 && ty < this.height - 1) {
                    this.tiles[ty][tx] = TileType.Floor;
                }
            }
        }
    }

    // Add decorative pillars
    private addPillars() {
        for (let i = 0; i < this.rooms.length; i++) {
            if (Math.random() < 0.35 && i > 0) { // 35% chance, skip first room
                const room = this.rooms[i];
                if (room.w >= 9 && room.h >= 9) {
                    // Place pillars in corners
                    const pillarDist = 2;
                    const positions = [
                        { x: room.x + pillarDist, y: room.y + pillarDist },
                        { x: room.x + room.w - 1 - pillarDist, y: room.y + pillarDist },
                        { x: room.x + pillarDist, y: room.y + room.h - 1 - pillarDist },
                        { x: room.x + room.w - 1 - pillarDist, y: room.y + room.h - 1 - pillarDist }
                    ];

                    for (const pos of positions) {
                        if (this.tiles[pos.y][pos.x] === TileType.Floor) {
                            this.tiles[pos.y][pos.x] = TileType.Wall;
                        }
                    }
                }
            }
        }
    }

    // Check if there's already a trap at position
    private hasTrapAt(x: number, y: number): boolean {
        return this.traps.some(t => t.x === x && t.y === y);
    }

    createRoom(room: Rect) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.tiles[y][x] = TileType.Floor;
            }
        }
    }

    createHCorridor(x1: number, x2: number, y: number) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            this.tiles[y][x] = TileType.Floor;
        }
    }

    createVCorridor(y1: number, y2: number, x: number) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            this.tiles[y][x] = TileType.Floor;
        }
    }

    isBlocked(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        return this.tiles[y][x] === TileType.Wall;
    }

    // Get the room index at a position (-1 if not in a room)
    getRoomIndexAt(x: number, y: number): number {
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            if (x >= room.x && x < room.x + room.w &&
                y >= room.y && y < room.y + room.h) {
                return i;
            }
        }
        return -1;
    }

    // Get room data at a position
    getRoomDataAt(x: number, y: number): RoomData | null {
        const idx = this.getRoomIndexAt(x, y);
        if (idx === -1) return null;
        return this.roomData[idx] || null;
    }

    // Mark a room as cleared
    clearRoom(roomIndex: number) {
        if (roomIndex >= 0 && roomIndex < this.roomData.length) {
            this.roomData[roomIndex].cleared = true;
        }
    }
}

export class Rect {
    x: number;
    y: number;
    w: number;
    h: number;

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    center(): { x: number, y: number } {
        return {
            x: Math.floor(this.x + this.w / 2),
            y: Math.floor(this.y + this.h / 2)
        };
    }

    intersects(other: Rect): boolean {
        return (
            this.x <= other.x + other.w &&
            this.x + this.w >= other.x &&
            this.y <= other.y + other.h &&
            this.y + this.h >= other.y
        );
    }

    // Check if a point is inside this room
    contains(x: number, y: number): boolean {
        return x >= this.x && x < this.x + this.w &&
            y >= this.y && y < this.y + this.h;
    }
}

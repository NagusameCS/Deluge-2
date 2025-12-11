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
        const MAX_ROOMS = 30; // Increased from 15
        const MIN_SIZE = 8;   // Increased from 6
        const MAX_SIZE = 15;  // Increased from 12

        for (let i = 0; i < MAX_ROOMS * 2; i++) { // Try more times to place rooms
            if (this.rooms.length >= MAX_ROOMS) break;

            const w = getRandomInt(MIN_SIZE, MAX_SIZE);
            const h = getRandomInt(MIN_SIZE, MAX_SIZE);
            const x = getRandomInt(1, this.width - w - 1);
            const y = getRandomInt(1, this.height - h - 1);

            const newRoom = new Rect(x, y, w, h);

            let failed = false;
            for (const otherRoom of this.rooms) {
                // Add padding to prevent rooms from touching directly
                const paddedRoom = new Rect(newRoom.x - 1, newRoom.y - 1, newRoom.w + 2, newRoom.h + 2);
                if (paddedRoom.intersects(otherRoom)) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.createRoom(newRoom);

                if (this.rooms.length > 0) {
                    // Connect to the nearest room instead of just the previous one to reduce long hallways
                    // Or just keep it simple for now but ensure connectivity
                    const prevRoom = this.rooms[this.rooms.length - 1];
                    const newCenter = newRoom.center();
                    const prevCenter = prevRoom.center();

                    if (Math.random() > 0.5) {
                        this.createHCorridor(prevCenter.x, newCenter.x, prevCenter.y);
                        this.createVCorridor(prevCenter.y, newCenter.y, newCenter.x);
                    } else {
                        this.createVCorridor(prevCenter.y, newCenter.y, prevCenter.x);
                        this.createHCorridor(prevCenter.x, newCenter.x, newCenter.y);
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

        // Place traps
        for (let i = 0; i < 10; i++) {
            if (this.rooms.length === 0) break;
            const room = this.rooms[getRandomInt(0, this.rooms.length)];
            const x = getRandomInt(room.x + 1, room.x + room.w - 1);
            const y = getRandomInt(room.y + 1, room.y + room.h - 1);
            if (this.tiles[y][x] === TileType.Floor) {
                this.traps.push(new Trap(x, y, 'spike', this.floor));
            }
        }
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

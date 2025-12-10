
export class Entity {
    x: number;
    y: number;
    color: string;
    symbol: string; // For potential ASCII mode or just debug

    constructor(x: number, y: number, color: string, symbol: string) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.symbol = symbol;
    }

    move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }
}

export class Player extends Entity {
    constructor(x: number, y: number) {
        super(x, y, '#00f', '@');
    }
}

export class Enemy extends Entity {
    constructor(x: number, y: number) {
        super(x, y, '#f00', 'E');
    }
}

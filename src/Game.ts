import { GameMap } from './Map';
import { Player, Enemy } from './Entity';
import { Renderer } from './Renderer';
import { InputHandler } from './Input';
import { MAP_WIDTH, MAP_HEIGHT } from './utils';

export class Game {
    map: GameMap;
    player: Player;
    enemies: Enemy[];
    renderer: Renderer;
    inputHandler: InputHandler;

    constructor() {
        this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
        this.map.generate();

        // Place player in the first room
        const startRoom = this.map.rooms[0];
        const startCenter = startRoom.center();
        this.player = new Player(startCenter.x, startCenter.y);

        this.enemies = [];
        // Place some enemies
        for (let i = 1; i < this.map.rooms.length; i++) {
            const room = this.map.rooms[i];
            const center = room.center();
            this.enemies.push(new Enemy(center.x, center.y));
        }

        this.renderer = new Renderer('gameCanvas', MAP_WIDTH, MAP_HEIGHT);
        this.inputHandler = new InputHandler(this.handleInput.bind(this));

        this.loop();
    }

    handleInput(key: string) {
        let dx = 0;
        let dy = 0;

        if (key === 'ArrowUp' || key === 'w') dy = -1;
        if (key === 'ArrowDown' || key === 's') dy = 1;
        if (key === 'ArrowLeft' || key === 'a') dx = -1;
        if (key === 'ArrowRight' || key === 'd') dx = 1;

        if (dx !== 0 || dy !== 0) {
            if (!this.map.isBlocked(this.player.x + dx, this.player.y + dy)) {
                this.player.move(dx, dy);
                this.updateEnemies();
            }
        }
    }

    updateEnemies() {
        // Simple AI: Move towards player
        for (const enemy of this.enemies) {
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;

            let moveX = 0;
            let moveY = 0;

            if (Math.abs(dx) > Math.abs(dy)) {
                moveX = dx > 0 ? 1 : -1;
            } else {
                moveY = dy > 0 ? 1 : -1;
            }

            if (!this.map.isBlocked(enemy.x + moveX, enemy.y + moveY)) {
                // Don't move into other entities (simple check)
                let blocked = false;
                if (enemy.x + moveX === this.player.x && enemy.y + moveY === this.player.y) blocked = true;

                if (!blocked) {
                    enemy.move(moveX, moveY);
                }
            }
        }
    }

    loop() {
        this.renderer.clear();
        this.renderer.drawMap(this.map);
        this.renderer.drawEntity(this.player);
        for (const enemy of this.enemies) {
            this.renderer.drawEntity(enemy);
        }
        requestAnimationFrame(this.loop.bind(this));
    }
}

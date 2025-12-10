export class InputHandler {
    keys: { [key: string]: boolean } = {};
    onKeyDown: (key: string) => void;

    constructor(onKeyDown: (key: string) => void) {
        this.onKeyDown = onKeyDown;
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.onKeyDown(e.key);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }
}

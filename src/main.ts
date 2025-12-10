import './style.css'
import { Game } from './Game'

console.log('Starting Game...');
try {
    new Game();
    console.log('Game started successfully.');
} catch (e) {
    console.error('Failed to start game:', e);
}


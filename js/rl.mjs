import * as readline from 'readline';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({ input, output });

export function question(query) {
    return new Promise( resolve => {
        rl.question(query, resolve);
    });
}

export function close() {
    rl.close();
}
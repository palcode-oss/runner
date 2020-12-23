import type { Server } from "ws";
import { initPinging, initPonging } from './ping';
import { parseMessage } from './parse';
import { handleStart } from './handlers/start';
import { handleStop } from './handlers/stop';
import { handleStdin } from './handlers/stdin';

export const initListeners = (ws: Server) => {
    const pingInterval = initPinging(ws);

    ws.on('connection', socket => {
        initPonging(socket);

        socket.on('message', data => {
            const parsedMessage = parseMessage(data);
            if (!parsedMessage) return;

            switch (parsedMessage.instruction) {
                case 'start':
                    return handleStart(parsedMessage, socket);
                case 'stdin':
                    return handleStdin(parsedMessage, socket);
                case 'stop':
                    return handleStop(parsedMessage, socket);
            }
        });
    });

    ws.on('close', () => {
        clearInterval(pingInterval);
    });
}

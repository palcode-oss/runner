import type { Server } from "ws";
import { initPinging, initPonging } from './ping';
import { handleStart } from './handlers/start';
import { handleStop } from './handlers/stop';
import { handleStdin } from './handlers/stdin';
import { decode, isClientMessage } from 'palcode-sockets';

export const initListeners = (ws: Server) => {
    const pingInterval = initPinging(ws);

    ws.on('connection', socket => {
        initPonging(socket);

        socket.on('message', data => {
            const parsedMessage = decode(data as string);
            if (!parsedMessage || !isClientMessage(parsedMessage)) return;

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

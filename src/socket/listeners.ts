import type { Server } from "ws";
import { initPinging, initPonging } from './ping';
import { handleStart } from './handlers/start';
import { handleStop } from './handlers/stop';
import { handleStdin } from './handlers/stdin';
import { decode, isClientMessage, decodeLspInit } from 'palcode-sockets';
import { startLsp } from '../containers/lsp';
import type WebSocket from 'ws';

export const initStdListeners = (ws: Server) => {
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

export const safelyClose = (socket: WebSocket) => {
    try {
        socket.close();
    } catch (e) {}
}

export const initLspListeners = (ws: Server) => {
    const pingInterval = initPinging(ws);

    ws.on('connection', async socket => {
        initPonging(socket);

        let containerReady = false;
        let incomingListener: ((data: any) => Promise<void>) | undefined;
        socket.on('message', async (data: string) => {
            if (data.startsWith('init/') && !containerReady) {
                const decodedData = decodeLspInit(data);
                if (!decodedData) {
                    safelyClose(socket);
                    return;
                }

                try {
                    incomingListener = await startLsp(decodedData, socket, () => {
                        socket.send('ready');
                        containerReady = true;
                    });
                } catch (e) {
                    safelyClose(socket);
                    return;
                }

                if (!incomingListener) {
                    safelyClose(socket);
                }

                return;
            }

            if (incomingListener && containerReady) {
                try {
                    await incomingListener(data);
                } catch (e) {
                    containerReady = false;
                    safelyClose(socket);
                }
            } else {
                safelyClose(socket);
            }
        });
    });

    ws.on('close', () => {
        clearInterval(pingInterval);
    });
}

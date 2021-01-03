import type { Server } from "ws";
import { initPinging, initPonging } from './ping';
import { handleStart } from './handlers/start';
import { handleStop } from './handlers/stop';
import { handleStdin } from './handlers/stdin';
import { decode, isClientMessage, decodeLspInit } from 'palcode-sockets';
import { startLsp } from '../containers/lsp';

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

export const initLspListeners = (ws: Server) => {
    const pingInterval = initPinging(ws);

    ws.on('connection', async socket => {
        initPonging(socket);

        let containerRunning = false;
        let incomingListener: ((data: any) => Promise<void>) | undefined;
        socket.on('message', async (data: string) => {
            if (data.startsWith('init/') && !containerRunning) {
                const decodedData = decodeLspInit(data);
                if (!decodedData) {
                    socket.close();
                    return;
                }

                try {
                    incomingListener = await startLsp(decodedData, socket);
                } catch (e) {
                    socket.close();
                    return;
                }

                if (!incomingListener) {
                    socket.close();
                }

                containerRunning = true;
                return;
            }

            if (incomingListener && containerRunning) {
                try {
                    await incomingListener(data);
                } catch (e) {
                    containerRunning = false;
                    socket.close();
                    return;
                }
            } else {
                socket.close();
                return;
            }
        });
    });

    ws.on('close', () => {
        clearInterval(pingInterval);
    });
}

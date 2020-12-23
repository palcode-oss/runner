import WebSocket, { Server } from 'ws';

interface LiveWebSocket extends WebSocket {
    isAlive?: boolean;
}

const isSocketAlive = (socket: WebSocket): boolean => {
    const potentiallyAugmentedWebSocket = socket as LiveWebSocket;
    return !!potentiallyAugmentedWebSocket.isAlive;
}

const setSocketAlive = (socket: WebSocket, isAlive: boolean) => {
    const augmentedWebSocket = socket as LiveWebSocket;
    augmentedWebSocket.isAlive = isAlive;
}

export const initPinging = (ws: Server): NodeJS.Timeout => {
    return setInterval(() => {
        ws.clients.forEach(socket => {
            if (!isSocketAlive(socket)) return socket.terminate();

            setSocketAlive(socket, false);
            socket.ping();
        });
    }, 15000);
}

export const initPonging = (socket: WebSocket) => {
    setSocketAlive(socket, true);

    socket.on('pong', () => {
        setSocketAlive(socket, true);
    });
}

import type WebSocket from 'ws';
import { encode, ServerMessage } from 'palcode-sockets';

export const sendSerializedMessage = (socket: WebSocket, message: ServerMessage): void => {
    try {
        const serializedMessage = encode(message);
        socket.send(serializedMessage);
    } catch (e) {}
}

import { ResponseMessage } from '../types';
import type WebSocket from 'ws';

export const serializeMessage = (message: ResponseMessage): string => {
    const stringJSON = JSON.stringify(message);
    return Buffer.from(stringJSON, 'utf8').toString('base64');
}

export const sendSerializedMessage = (socket: WebSocket, message: ResponseMessage): void => {
    try {
        socket.send(serializeMessage(message));
    } catch (e) {}
}

import type WebSocket from 'ws';
import { sendSerializedMessage } from '../serialize';
import { stdin } from '../../containers/stdin';
import { StdinMessage } from 'palcode-sockets';

export const handleStdin = async (
    message: StdinMessage,
    socket: WebSocket
) => {
    if (!message.projectId || !message.stdin) {
        sendSerializedMessage(socket, {
            status: 400,
        });
        return;
    }

    await stdin(message.projectId, message.stdin);
}

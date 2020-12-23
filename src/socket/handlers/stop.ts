import { StopMessage } from '../../types';
import type WebSocket from 'ws';
import { sendSerializedMessage } from '../serialize';
import { stopContainer } from '../../containers/stop';

export const handleStop = async (
    message: StopMessage,
    socket: WebSocket
) => {
    if (!message.projectId) {
        sendSerializedMessage(socket, {
            status: 400,
        });
    }

    await stopContainer(message.projectId);
}

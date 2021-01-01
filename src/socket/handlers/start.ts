import type WebSocket from 'ws';
import { sendSerializedMessage } from '../serialize';
import { cloneCode } from '../../storage/clone';
import { stopContainer } from '../../containers/stop';
import { startContainer } from '../../containers/start';
import { StartMessage } from 'palcode-sockets';
import { isValidLanguage } from 'palcode-types';

export const handleStart = async (
    message: StartMessage,
    socket: WebSocket
): Promise<void> => {
    if (!message.projectId || !isValidLanguage(message.language, 'code') || !message.schoolId) {
        sendSerializedMessage(socket, {
            status: 400
        });
        return;
    }

    sendSerializedMessage(socket, {
        status: 200,
        message: 'ack',
    });

    await stopContainer(message.projectId);

    try {
        await cloneCode(message.projectId, message.schoolId);
    } catch (e) {
        console.warn(e);
        sendSerializedMessage(socket, {
            status: 404,
        });
        return;
    }

    await startContainer(message, socket);
}

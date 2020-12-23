import type WebSocket from 'ws';
import { sendSerializedMessage } from '../socket/serialize';
import { stopContainer } from './stop';
import { StartMessage } from '../types';
import { uploadCode } from '../storage/upload';

export const initStdoutListeners = (
    socket: WebSocket,
    message: StartMessage,
    stream?: NodeJS.ReadWriteStream
) => {
    if (!stream) return;

    stream.on('data', (chunk: Buffer) => {
        const stdout = chunk.toString('utf8');
        sendSerializedMessage(socket, {
            status: 200,
            running: true,
            stdout,
        });
    });

    stream.on('end', async () => {
        sendSerializedMessage(socket, {
            status: 200,
            running: false,
        });

        // ensure we fully delete the container once it has stopped
        await stopContainer(message.projectId);
        await uploadCode(message.projectId, message.schoolId);
    });
}

import type WebSocket from 'ws';
import { getDockerodeSingleton, getStorageRoot } from '../helpers';
import { ClientLspInitMessage } from 'palcode-sockets';
import path from 'path';
import sanitize from 'sanitize-filename';
import { cloneCode } from '../storage/clone';

export const startLsp = async (
    data: ClientLspInitMessage,
    socket: WebSocket,
): Promise<((data: any) => Promise<void>) | undefined> => {
    try {
        await cloneCode(data.projectId, data.schoolId);
    } catch (e) {
        return;
    }

    const docker = getDockerodeSingleton();
    const container = await docker.createContainer({
        Image: 'palcode/lsp',
        WorkingDir: '/opt/lsp',
        Entrypoint: [
            "yarn", "run", "start", data.language,
        ],
        Tty: true,
        OpenStdin: true,
        HostConfig: {
            Binds: [
                path.resolve(getStorageRoot(), sanitize(data.projectId)) + ':/usr/src/app:rw',
            ],
            Memory: 100 * 1048576,
            // @ts-ignore
            NanoCPUs: 0.2 * Math.pow(10, 9),
        },
    });

    const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        hijack: true,
    });

    if (!stream) return;
    stream.on('data', (chunk: Buffer) => {
        const stdout = chunk.toString('utf8');
        socket.send(stdout);
    });

    return async (incomingData: any) => {
        if (!stream || !container) return;
        stream.write(incomingData);
        await container.wait();
    }
}

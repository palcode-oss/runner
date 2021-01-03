import type WebSocket from 'ws';
import { getDockerodeSingleton, getStorageRoot } from '../helpers';
import { ClientLspInitMessage } from 'palcode-sockets';
import path from 'path';
import sanitize from 'sanitize-filename';
import { cloneCode } from '../storage/clone';

type Write = (data: any) => Promise<void>;

export const startLsp = async (
    data: ClientLspInitMessage,
    socket: WebSocket,
    readyCallback: () => void,
): Promise<Write | undefined> => {
    try {
        await cloneCode(data.projectId, data.schoolId);
    } catch (e) {
        return;
    }

    const docker = getDockerodeSingleton();
    const container = await docker.createContainer({
        Image: 'palcode/lsp:latest',
        WorkingDir: '/opt/lsp',
        Entrypoint: [
            "node", "dist/index.js", data.language,
        ],
        Tty: true,
        OpenStdin: true,
        HostConfig: {
            Binds: [
                path.resolve(getStorageRoot(), sanitize(data.projectId)) + ':/usr/src/app:rw',
            ],
            Memory: 500 * 1048576,
            // @ts-ignore
            NanoCPUs: 0.4 * Math.pow(10, 9),
        },
    });

    const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        hijack: true,
    });

    await container.start();

    if (!stream) return;
    let isReady = false;
    stream.on('data', (chunk: Buffer) => {
        const stdout = chunk.toString('utf8');

        if (!isReady) {
            if (stdout.startsWith('ready')) {
                isReady = true;
                readyCallback();
            }

            return;
        }

        try {
            JSON.parse(stdout);
            socket.send(stdout);
        } catch (e) {}
    });

    stream.on('end', () => {
        socket.close();
    });

    return async (incomingData: string) => {
        if (!stream || !container) return;
        stream.write(incomingData + '\n');
        await container.wait();
    }
}

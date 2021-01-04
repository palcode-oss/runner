import type WebSocket from 'ws';
import { getDockerodeSingleton, getStorageRoot } from '../helpers';
import { ClientLspInitMessage } from 'palcode-sockets';
import path from 'path';
import sanitize from 'sanitize-filename';
import { cloneCode } from '../storage/clone';
import { getResources, ResourceLimits } from './resources';

type Write = (data: any) => Promise<void>;

export const startLsp = async (
    data: ClientLspInitMessage,
    socket: WebSocket,
    readyCallback: () => void,
): Promise<Write | undefined> => {
    let resources: ResourceLimits;
    try {
        resources = await getResources(data.schoolId);
    } catch (e) {
        return;
    }
    if(!resources) return;

    try {
        await cloneCode(data.projectId, data.schoolId);
    } catch (e) {
        return;
    }

    const docker = getDockerodeSingleton();
    const containerName = `lsp-${data.projectId}`;
    let container = docker.getContainer(containerName);
    await container.remove({
        force: true,
    });

    container = await docker.createContainer({
        name: containerName,
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
            Memory: resources.RAM,
            // @ts-ignore
            NanoCPUs: resources.NanoCPUs,
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
                try {
                    readyCallback();
                } catch (e) {}
            } else {
                console.warn(stdout);
            }

            return;
        }

        try {
            JSON.parse(stdout);
            socket.send(stdout);
        } catch (e) {}
    });

    stream.on('end', async () => {
        try {
            socket.close();
            await container.remove();
        } catch (e) {}
    });

    socket.on('close', async () => {
        try {
            await container.remove({
                force: true,
            });
        } catch (e) {}
    });

    return async (incomingData: string) => {
        try {
            if (!stream || !container) return;
            stream.write(incomingData + '\n');
            await container.wait();
        } catch (e) {}
    }
}

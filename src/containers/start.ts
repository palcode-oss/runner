import { StartMessage } from '../types';
import type WebSocket from 'ws';
import { sendSerializedMessage } from '../socket/serialize';
import { getDockerodeSingleton, getNumericEnv, getStorageRoot, getTag } from '../helpers';
import path from 'path';
import sanitize from 'sanitize-filename';
import { getMaxCPUs } from './resources';
import { initStdoutListeners } from './stdout';
import type { Container } from 'dockerode';

export const startContainer = async (
    message: StartMessage,
    socket: WebSocket
): Promise<void> => {
    const docker = getDockerodeSingleton();

    sendSerializedMessage(socket, {
        status: 200,
        message: 'start',
    });

    let container: Container;
    try {
        container = await docker.createContainer({
            name: message.projectId,
            Image: getTag(message.language),
            WorkingDir: '/opt/runner',
            Entrypoint: [
                // Maximum run time for Python script (ensures infinite loops aren't left running)
                // written in minutes as a string
                // see https://linux.die.net/man/1/timeout
                "./run.sh", getNumericEnv('PAL_TIMEOUT', 10) + "m",
            ],
            OpenStdin: true,
            Tty: true,
            HostConfig: {
                Binds: [
                    path.resolve(getStorageRoot(), sanitize(message.projectId)) + ':/usr/src/app:rw',
                ],
                // Maximum concurrent process IDs (PIDs) allowed within container
                // essential to preventing forkbomb/DDoS attacks
                // https://github.com/aaronryank/fork-bomb/blob/master/fork-bomb.py
                PidsLimit: getNumericEnv('PAL_PID_LIMIT', 25),
                // Maximum RAM consumption of container in bytes
                // written as megabytes * 1048576
                Memory: getNumericEnv('PAL_MEMORY_QUOTA', 100 * 1048576),
                // Maximum disk size of container in bytes
                // written as megabytes * 1048576
                DiskQuota: getNumericEnv('PAL_DISK_QUOTA', 50 * 1048576),
                // @ts-ignore grr
                NanoCPUs: getMaxCPUs(),
            },
        });
    } catch (e) {
        console.error(e);
        sendSerializedMessage(socket, {
            status: 500,
            running: false,
            message: 'run_fail',
        });
        return;
    }

    if (!container) return;

    sendSerializedMessage(socket, {
        status: 200,
        running: true,
        message: 'run_success',
    });

    container.attach({
        stream: true,
        stdout: true,
        stderr: true,
    }, async (err, stream) => {
        initStdoutListeners(socket, message, stream);
        // only start the container once we've attached
        await container.start();
    });
}

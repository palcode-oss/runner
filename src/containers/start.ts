import type WebSocket from 'ws';
import { sendSerializedMessage } from '../socket/serialize';
import { getDockerodeSingleton, getNumericEnv, getStorageRoot, getTag } from '../helpers';
import path from 'path';
import sanitize from 'sanitize-filename';
import { initStdoutListeners } from './stdout';
import type { Container } from 'dockerode';
import { StartMessage } from 'palcode-sockets';
import { getResources, ResourceLimits } from './resources';

export const startRunner = async (
    message: StartMessage,
    socket: WebSocket
): Promise<void> => {
    const docker = getDockerodeSingleton();

    let resources: ResourceLimits | undefined;
    try {
        resources = await getResources(message.schoolId);
    } catch (e) {
        sendSerializedMessage(socket, {
            status: 404,
            running: false,
            message: 'missing_resource_allocations',
        });
        return;
    }

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
                // Maximum run time for script (ensures infinite loops aren't left running)
                // written in minutes as a string
                // see https://linux.die.net/man/1/timeout
                "./run", getNumericEnv('PAL_TIMEOUT', 10) + "m", message.language
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
                // Maximum disk size of container in bytes
                // written as megabytes * 1048576
                DiskQuota: getNumericEnv('PAL_DISK_QUOTA', 50 * 1048576),

                Memory: resources.RAM,
                // @ts-ignore grr
                NanoCPUs: resources.NanoCPUs,
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

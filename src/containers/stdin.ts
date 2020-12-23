import { getDockerodeSingleton } from '../helpers';

export const stdin = async (projectId: string, stdin: string) => {
    const docker = getDockerodeSingleton();

    const container = docker.getContainer(projectId);
    if (!container) return;
    container.attach({
        stream: true,
        stdin: true,
        hijack: true,
    }, (err, stream) => {
        if (stream) {
            stream.write(stdin, () => {
                stream.end();
            });
        }

        return container.wait();
    });
}

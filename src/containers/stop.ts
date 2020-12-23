import { getDockerodeSingleton } from '../helpers';

export const stopContainer = async (projectId: string) => {
    const docker = getDockerodeSingleton();

    let container;
    // run kill and remove separately; kill may fail if the container isn't already running
    try {
        container = docker.getContainer(projectId);
        await container.kill({
            signal: process.env.PAL_STOP_SIGNAL || 'SIGKILL',
        });
    } catch (e) {}

    if (!container) return;

    try {
        await container.remove({
            force: true,
        });
    } catch (e) {}
}

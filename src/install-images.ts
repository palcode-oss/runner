import { getDockerodeSingleton, getTags } from './helpers';

function pullWithPromise(tag: string) {
    const docker = getDockerodeSingleton();

    return new Promise<void>((resolve, reject) => {
        docker.pull(tag, {}, function (err: any, stream: any) {
            if (err) {
                reject(err);
                return;
            }

            docker.modem.followProgress(
                stream,
                () => resolve(),
                (): void => undefined,
            );
        });
    });
}

export const installImages = async () => {
    const tags = [
        'palcode/lsp:' + process.env.PAL_LSP_VERSION,
        ...getTags(),
    ];

    for (const tag of tags) {
        try {
            await pullWithPromise(tag);
            console.log(`Installed ${tag}.`);
        } catch (e) {
            console.error(`Pulling ${tag} failed!`, e);
            throw new Error(e);
        }
    }
}

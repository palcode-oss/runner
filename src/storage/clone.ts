import sanitize from 'sanitize-filename';
import { getBucket, getNewAsyncQueue, getStorageRoot } from '../helpers';
import path from 'path';
import { getLocalChecksum } from './checksum';
import * as fs from 'fs-extra';
import { setDownloadTime } from './timing';

export const cloneCode = async (projectId: string, schoolId: string) => {
    const sanitizedProjectId = sanitize(projectId || '');
    if (!sanitizedProjectId) throw new Error("No project ID provided!");

    const [files] = await getBucket(schoolId)
        .getFiles({
            prefix: path.join(sanitizedProjectId),
        });

    if (files.length === 0) throw new Error("Project not found!");

    // use parallel execution here because each request has a TCP handshake overhead
    const promises = [];
    const queue = getNewAsyncQueue();
    for (const file of files) {
        const promise = async () => {
            // file.name should already include the prefix (i.e. the projectId) as well as any subdirectories
            const filePath = path.resolve(getStorageRoot(), file.name);
            const cloudMD5 = file.metadata.md5Hash;
            const localMD5 = await getLocalChecksum(filePath);

            if (localMD5 === cloudMD5) {
                return;
            }

            const [fileBuffer] = await file.download();
            await fs.outputFile(
                filePath,
                fileBuffer.toString('utf8'),
            );
        };

        promises.push(promise);
    }

    await queue.addAll(promises);
    await setDownloadTime(sanitizedProjectId);
}

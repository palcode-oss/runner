import sanitize from 'sanitize-filename';
import readdirp from 'readdirp';
import path from 'path';
import { getBucket, getStorageRoot } from '../helpers';
import { getDownloadTime, getFileModificationTime } from './timing';
import * as fs from 'fs-extra';

const uploadIgnoredFiles = [
    '.palcode.lock',
    // we prefer caching packages locally
    // session affinity means that a user will stay connected to the same server for their whole browser session
    // the server will only delete locally cached project data when it is preempted
    'env/',
    'node_modules/',
];

export const uploadCode = async (projectId: string, schoolId: string) => {
    const sanitizedProjectId = sanitize(projectId || '');
    if (!sanitizedProjectId) throw new Error("No project ID provided!");

    const paths = readdirp(
        path.resolve(getStorageRoot(), sanitizedProjectId),
    );

    const lastDownloadTime = await getDownloadTime(sanitizedProjectId);

    const bucket = getBucket(schoolId);
    const promises = [];
    const activeCloudStorageFiles: string[] = [];
    for await (const file of paths) {
        const promise = async () => {
            // don't upload ignored files
            if (!uploadIgnoredFiles.some(e => e.startsWith(file.path))) {
                return;
            }

            // add this after the previous 'if', because we want to delete previously-uploaded ignored files
            const cloudStorageFileName = path.join(sanitizedProjectId, file.path);
            activeCloudStorageFiles.push(cloudStorageFileName);

            // detect if this file has been modified locally since the last download event
            const mtimeMs = await getFileModificationTime(
                path.resolve(file.fullPath),
            );

            if (mtimeMs) {
                // if the last time of modification is before the last download time, it won't have changed during the run
                const fileLastModified = new Date(mtimeMs);
                if (fileLastModified <= lastDownloadTime) {
                    return;
                }
            } else {
                // in this case, we're unable to access the file so we should skip the file
                return;
            }

            const contents = (await fs.readFile(
                path.resolve(file.fullPath),
            )).toString('utf8');

            await bucket.file(cloudStorageFileName)
                .save(contents);
        };

        promises.push(promise());
    }

    console.log(await Promise.allSettled(promises));

    // delete any cloud files that are now obsolete — especially important for deleted node_modules or venv
    const [cloudFiles] = await bucket.getFiles({
        prefix: path.join(sanitizedProjectId)
    });
    for (const cloudFile of cloudFiles) {
        if (!activeCloudStorageFiles.includes(cloudFile.name)) {
            await cloudFile.delete();
        }
    }
}

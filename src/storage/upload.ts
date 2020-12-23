import sanitize from 'sanitize-filename';
import recursiveReadDir from 'recursive-readdir';
import path from 'path';
import { getBucket, getStorageRoot } from '../helpers';
import { getDownloadTime, getFileModificationTime } from './timing';
import * as fs from 'fs-extra';

const uploadIgnoredFiles = [
    '.palcode.lock',
];

export const uploadCode = async (projectId: string, schoolId: string) => {
    const sanitizedProjectId = sanitize(projectId || '');
    if (!sanitizedProjectId) throw new Error("No project ID provided!");

    const paths = await recursiveReadDir(
        path.resolve(getStorageRoot(), sanitizedProjectId),
    );

    if (paths.length === 0) return;

    const lastDownloadTime = await getDownloadTime(sanitizedProjectId);

    const bucket = getBucket(schoolId);
    // this string should appear at the start of all file names; we need to strip it
    const charactersToStrip = path.join(getStorageRoot(), sanitizedProjectId).length;
    const promises = [];
    const activeCloudStorageFiles: string[] = [];
    for (const file of paths) {
        const promise = async () => {
            const strippedFileName = file.substring(charactersToStrip);

            // don't upload ignored files
            // strip another + 1 for the / at the start of the file name
            if (uploadIgnoredFiles.includes(strippedFileName.substring(1))) {
                return;
            }

            // add this after the previous 'if', because we want to delete previously-uploaded ignored files
            const cloudStorageFileName = path.join(sanitizedProjectId, strippedFileName);
            activeCloudStorageFiles.push(cloudStorageFileName);

            // detect if this file has been modified locally since the last download event
            const mtimeMs = await getFileModificationTime(
                path.resolve(file),
            );

            if (mtimeMs) {
                // if the last time of modification is before the last download time, it won't have changed during the run
                const fileLastModified = new Date(mtimeMs);
                if (fileLastModified <= lastDownloadTime) {
                    return;
                }
            }

            const contents = (await fs.readFile(
                // 'file' should already be a full path
                path.resolve(file),
            )).toString('utf8');

            await bucket.file(cloudStorageFileName)
                .save(contents);
        };

        promises.push(promise());
    }

    await Promise.allSettled(promises);

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

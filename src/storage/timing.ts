import * as fs from 'fs-extra';
import path from 'path';
import { getStorageRoot } from '../helpers';

export const getFileModificationTime = async (path: string) => {
    let mtimeMs;

    try {
        const stat = await fs.stat(path);
        mtimeMs = stat.mtimeMs;
    } catch (e) {}

    return mtimeMs;
}

export const setDownloadTime = async (sanitizedProjectId: string) => {
    try {
        fs.writeFileSync(
            path.resolve(getStorageRoot(), sanitizedProjectId, '.palcode.lock'),
            Date.now().toString(),
        );
    } catch (e) {}
}

export const getDownloadTime = async (sanitizedProjectId: string) => {
    let fileContents;
    try {
        fileContents = fs.readFileSync(
            path.resolve(getStorageRoot(), sanitizedProjectId, '.palcode.lock'),
        ).toString('utf8');
    } catch (e) {
        return new Date();
    }

    const parsedTime = new Date(parseInt(fileContents));
    if (!isNaN(parsedTime.getMilliseconds())) {
        return parsedTime;
    } else {
        return new Date();
    }
}

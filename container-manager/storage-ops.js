const path = require("path");
const fs = require("fs-extra");
const sanitize = require("sanitize-filename");
const recursiveReadDir = require("recursive-readdir");
const {getBucket, getStorageRoot} = require("../helpers");

const uploadIgnoredFiles = [
    '.palcode.lock',
];

const getFileModificationTime = (path) => {
    let mtimeMs;

    try {
        const stat = fs.statSync(path);
        mtimeMs = stat.mtimeMs;
    } catch (e) {}

    return mtimeMs;
}

const setDownloadTime = async (sanitizedProjectId) => {
    try {
        fs.writeFileSync(
            path.resolve(getStorageRoot(), sanitizedProjectId, '.palcode.lock'),
            Date.now().toString(),
        );
    } catch (e) {}
}

const getDownloadTime = async (sanitizedProjectId) => {
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

const cloneCode = async (projectId, schoolId) => {
    const sanitizedProjectId = sanitize(projectId || '');
    if (!sanitizedProjectId) throw new Error("No project ID provided!");

    const [files] = await getBucket(schoolId)
        .getFiles({
            prefix: path.join(sanitizedProjectId),
        });

    if (files.length === 0) throw new Error("Project not found!");

    for (const file of files) {
        try {
            // file.name should already include the prefix (i.e. the projectId) as well as any subdirectories
            const filePath = path.resolve(getStorageRoot(), file.name);
            const mtimeMs = getFileModificationTime(filePath);

            if (mtimeMs) {
                const cloudLastUpdated = new Date(file.metadata.updated);
                const localLastUpdated = new Date(mtimeMs);
                if (localLastUpdated >= cloudLastUpdated) {
                    continue;
                }
            }

            const [fileBuffer] = await file.download();
            fs.outputFileSync(
                filePath,
                fileBuffer.toString('utf8'),
            );
        } catch (e) {
            console.error('Failed to download/write file!', e);
        }
    }

    await setDownloadTime(sanitizedProjectId);
}

const saveChanges = async (projectId, schoolId) => {
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
    for (const file of paths) {
        const strippedFileName = file.substring(charactersToStrip);
        if (uploadIgnoredFiles.includes(strippedFileName)) {
            continue;
        }

        const mtimeMs = getFileModificationTime(
            path.resolve(file),
        );

        if (mtimeMs) {
            const fileLastModified = new Date(mtimeMs);
            if (fileLastModified <= lastDownloadTime) {
                continue;
            }
        }

        const contents = fs.readFileSync(
            // 'file' should already be a full path
            path.resolve(file),
        ).toString('utf8');

        try {
            await bucket.file(
                path.join(sanitizedProjectId, strippedFileName),
            )
                .save(contents);
        } catch (e) {
            console.error('Failed to read/upload file!', e);
        }
    }
}

module.exports = {
    cloneCode,
    saveChanges,
}

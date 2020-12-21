const path = require("path");
const fs = require("fs-extra");
const sanitize = require("sanitize-filename");
const md5File = require("md5-file");
const recursiveReadDir = require("recursive-readdir");
const {getBucket, getStorageRoot} = require("../helpers");

const uploadIgnoredFiles = [
    '.palcode.lock',
];

const getFileModificationTime = async (path) => {
    let mtimeMs;

    try {
        const stat = await fs.stat(path);
        mtimeMs = stat.mtimeMs;
    } catch (e) {}

    return mtimeMs;
}

const getLocalChecksum = async (path) => {
    let md5;

    try {
        const stringMD5 = await md5File(path);
        md5 = Buffer.from(stringMD5, 'hex').toString('base64');
    } catch (e) {}

    return md5;
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

    // use parallel execution here because each request has a TCP handshake overhead
    const promises = [];
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

        promises.push(promise());
    }

    await Promise.allSettled(promises);
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
    const promises = [];
    const activeCloudStorageFiles = [];
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

module.exports = {
    cloneCode,
    saveChanges,
}

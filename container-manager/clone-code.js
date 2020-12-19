const path = require("path");
const fs = require("fs");
const sanitize = require("sanitize-filename");
const {getBucket, getStorageRoot} = require("../helpers");

module.exports = async (projectId, schoolId) => {
    const sanitizedProjectId = sanitize(projectId || '');
    if (!sanitizedProjectId) throw new Error("No project ID provided!");

    const [files] = await getBucket(schoolId)
        .getFiles({
            prefix: path.join(sanitizedProjectId),
        });

    if (files.length === 0) throw new Error("Project not found!");

    try {
        fs.mkdirSync(
            path.resolve(getStorageRoot(), sanitizedProjectId),
        );
    } catch (e) {}

    for (const file of files) {
        try {
            const [fileBuffer] = await file.download();
            fs.writeFileSync(
                // file.name should already include the prefix (i.e. the projectId)
                path.resolve(getStorageRoot(), file.name),
                fileBuffer.toString('utf8'),
            );
        } catch (e) {
            console.error('Failed to download/write file!', e);
        }
    }
}

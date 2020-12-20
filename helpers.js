const {Storage} = require("@google-cloud/storage");
const storage = new Storage();

const images = {
    'python': 'palcode/python:' + (process.env.PAL_PYTHON_VERSION),
    'nodejs': 'palcode/node:' + (process.env.PAL_NODEJS_VERSION),
    'bash': 'palcode/bash:' + (process.env.PAL_BASH_VERSION),
    'java': 'palcode/java:' + (process.env.PAL_JAVA_VERSION),
    'prolog': 'palcode/prolog:' + (process.env.PAL_PROLOG_VERSION),
};

module.exports = {
    getTag(language) {
        return images[language];
    },
    getTags() {
        return Object.values(images);
    },
    isValidLanguage(language) {
        return ['python', 'nodejs', 'bash', 'java', 'prolog'].includes(language);
    },
    getStorageRoot() {
        return process.env.PAL_STORAGE_ROOT;
    },
    getBucket(schoolId) {
        if (!schoolId || typeof schoolId !== 'string') throw new Error("No School ID provided!");
        return storage.bucket('palcode-school-' + schoolId.toLowerCase());
    }
}

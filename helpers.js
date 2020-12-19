const {Storage} = require("@google-cloud/storage");
const storage = new Storage();

const images = {
    'python': 'palcode/python:' + (process.env.PAL_PYTHON_VERSION || '3.9.1'),
    'nodejs': 'palcode/node:' + (process.env.PAL_NODEJS_VERSION || '14.15.1'),
    'bash': 'palcode/bash:' + (process.env.PAL_BASH_VERSION || '1.0.0'),
    'java': 'palcode/java:' + (process.env.PAL_JAVA_VERSION || '16'),
    'prolog': 'swipl:' + (process.env.PAL_PROLOG_VERSION || '8.3.13'),
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

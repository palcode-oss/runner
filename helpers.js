module.exports = {
    getTag(language) {
        switch(language) {
            case 'python':
                return 'palcode/python:' + (process.env.PAL_PYTHON_VERSION || '3.9.1');
            case 'nodejs':
                return 'palcode/node:' + (process.env.PAL_NODEJS_VERSION || '14.15.1');
            case 'bash':
                return 'palcode/bash:' + (process.env.PAL_BASH_VERSION || '1.0.0');
            case 'java':
                return 'palcode/java:' + (process.env.PAL_JAVA_VERSION || '16');
            case 'prolog':
                return 'swipl:' + (process.env.PAL_PROLOG_VERSION || '8.3.13');
        }
    },
    isValidLanguage(language) {
        return ['python', 'nodejs', 'bash', 'java', 'prolog'].includes(language);
    },
    getStorageRoot() {
        return process.env.PAL_STORAGE_ROOT;
    },
}

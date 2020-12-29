import {Storage} from '@google-cloud/storage';
import Dockerode from 'dockerode';
import firebaseAdmin from 'firebase-admin';

const storage = new Storage();
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
});

const docker = new Dockerode();

const images : {
    [language: string]: string;
} = {
    'python': 'palcode/python:' + (process.env.PAL_PYTHON_VERSION),
    'nodejs': 'palcode/node:' + (process.env.PAL_NODEJS_VERSION),
    'bash': 'palcode/bash:' + (process.env.PAL_BASH_VERSION),
    'java': 'palcode/java:' + (process.env.PAL_JAVA_VERSION),
    'prolog': 'palcode/prolog:' + (process.env.PAL_PROLOG_VERSION),
    'go': 'palcode/go:' + (process.env.PAL_GO_VERSION),
};

export const getTag = (language: string) => {
    return images[language];
}

export const getTags = () => {
    return Object.values(images);
}

export const isValidLanguage = (language: any) => {
    return ['python', 'nodejs', 'bash', 'java', 'prolog', 'go'].includes(language);
}

export const getStorageRoot = (): string => {
    const storageRoot = process.env.PAL_STORAGE_ROOT;
    if (!storageRoot) {
        throw new Error("Storage root env variable not set!");
    }

    return storageRoot;
}

export const getBucket = (schoolId: any) => {
    if (!schoolId || typeof schoolId !== 'string') throw new Error("No School ID provided!");
    return storage.bucket('palcode-school-' + schoolId.toLowerCase());
}

export const getFirebase = () => {
    return firebaseAdmin;
}

export const getDockerodeSingleton = () => {
    return docker;
}

export const getNumericEnv = (name: string, fallback: number): number => {
    const stringValue = process.env[name];

    if (stringValue) {
        return parseInt(stringValue);
    } else {
        return fallback;
    }
}

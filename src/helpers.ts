import {Storage} from '@google-cloud/storage';
import Dockerode from 'dockerode';
import firebaseAdmin from 'firebase-admin';
import { languageData, SupportedLanguage } from 'palcode-types';
import PQueue from 'p-queue';

const storage = new Storage();
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
});

const docker = new Dockerode();

export const getTag = (languageName: SupportedLanguage) => {
    const language = languageData.find(e => e.names.code === languageName);
    if (!language) {
        throw new Error("Tag not found!");
    }

    const imageName = language.names.image;
    const imageVersion = process.env[`PAL_${imageName.toUpperCase()}_VERSION`];
    return `palcode/${imageName}:${imageVersion}`;
}

export const getTags = () => {
    return languageData
        .map(language => getTag(language.names.code));
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

export const getNewAsyncQueue = () => {
    return new PQueue({
        concurrency: getNumericEnv('PAL_MAX_CONCURRENCY', 4),
    });
}

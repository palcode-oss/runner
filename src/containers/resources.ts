import { getFirebase } from '../helpers';
import os from 'os';

export interface ResourceLimits {
    NanoCPUs: number;
    RAM: number;
}

export interface School {
    id: string;
    resources: {
        subscriptionId: string;
        CPUs: number;
        RAM: number;
    }
}

export const getResources = async (schoolId: string): Promise<ResourceLimits> => {
    const admin = getFirebase();

    const schoolResponse = await admin.firestore()
        .collection('schools')
        .doc(schoolId)
        .get();

    const school = schoolResponse.data() as Partial<School> | undefined;
    if (!school) {
        throw new Error("School not found!");
    }

    let NanoCPUs = 0;
    let RAM = 0;

    if (school.resources?.CPUs) {
        NanoCPUs = Math.min(school.resources.CPUs, os.cpus().length) * Math.pow(10, 9);
    } else {
        throw new Error("No CPUs allocated for school");
    }

    if (school.resources?.RAM) {
        RAM = Math.min(school.resources.RAM * 1048576, os.totalmem());
    } else {
        throw new Error("No RAM allocated for school");
    }

    return {
        NanoCPUs,
        RAM,
    }
}

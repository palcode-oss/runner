import type { Data } from 'ws';
import { Message } from '../types';

const checkMessageIntegrity = (data: any): data is Message => {
    return data['instruction'] && ['start', 'stdin', 'stop'].includes(data['instruction']);
}

export const parseMessage = (data: Data): Message | undefined => {
    if (typeof data !== 'string') {
        return;
    }

    let json: Object;
    try {
        const jsonString = Buffer.from(data, 'base64').toString('utf8');
        json = JSON.parse(jsonString);
    } catch (e) {
        return;
    }

    if (!json || !checkMessageIntegrity(json)) {
        return;
    }

    return json;
}

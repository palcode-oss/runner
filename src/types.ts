interface BaseMessage {
    projectId: string;
}

export interface StartMessage extends BaseMessage {
    schoolId: string;
    instruction: 'start';
    language: 'python' | 'nodejs' | 'bash' | 'java' | 'prolog';
}

export interface StopMessage extends BaseMessage {
    instruction: 'stop';
}

export interface StdinMessage extends BaseMessage {
    stdin: string;
    instruction: 'stdin';
}

export type Message = StartMessage | StopMessage | StdinMessage;

export interface ResponseMessage {
    status: 200 | 400 | 404 | 500;
    message?: string;
    running?: boolean;
    stdout?: string;
}

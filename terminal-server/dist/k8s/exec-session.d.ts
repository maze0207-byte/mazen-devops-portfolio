export interface ExecSessionOptions {
    namespace: string;
    pod: string;
    container?: string;
    command?: string[];
    onOutput: (data: string) => void;
    onExit: (code: number) => void;
    onError: (message: string) => void;
}
export declare class K8sExecSession {
    readonly namespace: string;
    readonly pod: string;
    readonly sessionId: string;
    private _container;
    get container(): string;
    private readonly stdin;
    private readonly exec;
    private readonly command;
    private readonly onOutput;
    private readonly onExit;
    private readonly onError;
    private active;
    private closed;
    private cols;
    private rows;
    constructor(options: ExecSessionOptions);
    start(): Promise<void>;
    writeInput(data: string): void;
    resize(cols: number, rows: number): void;
    close(): void;
}
export declare function createExecSession(options: ExecSessionOptions): Promise<K8sExecSession>;

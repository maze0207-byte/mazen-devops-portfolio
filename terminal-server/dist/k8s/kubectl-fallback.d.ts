export interface KubectlSessionOptions {
    namespace: string;
    pod: string;
    container: string;
    command: string[];
    onOutput: (data: string) => void;
    onExit: (code: number) => void;
    onError: (message: string) => void;
}
/** Local dev fallback only — production must use in-cluster client-node. */
export declare class KubectlExecSession {
    private readonly options;
    readonly namespace: string;
    readonly pod: string;
    readonly container: string;
    readonly sessionId: string;
    private proc;
    private closed;
    constructor(options: KubectlSessionOptions);
    start(): Promise<void>;
    writeInput(data: string): void;
    resize(_cols: number, _rows: number): void;
    close(): void;
}

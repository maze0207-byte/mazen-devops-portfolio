import type { WebSocket } from "ws";
export interface ConnectParams {
    pod: string;
    namespace: string;
    container?: string;
    command?: string[];
}
export declare class SessionManager {
    private readonly sessions;
    get size(): number;
    has(ws: WebSocket): boolean;
    connect(ws: WebSocket, params: ConnectParams, remoteIp: string): Promise<void>;
    writeInput(ws: WebSocket, data: string): void;
    resize(ws: WebSocket, cols: number, rows: number): void;
    disconnect(ws: WebSocket): void;
    disconnectAll(): void;
    private resetIdleTimer;
    private onIdleTimeout;
}
export declare function formatConnectError(err: unknown): string;

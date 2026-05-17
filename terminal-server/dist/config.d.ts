export declare const config: {
    readonly host: string;
    readonly port: number;
    readonly maxSessions: number;
    readonly sessionTimeoutMinutes: number;
    readonly heartbeatIntervalMs: number;
    readonly allowedNamespaces: string[];
    readonly defaultNamespace: string;
    readonly defaultContainer: string;
    readonly defaultCommand: string[];
    readonly allowedOrigins: string[];
    readonly rateLimitPerMinute: number;
    readonly allowLocalFallback: boolean;
    readonly inCluster: boolean;
};

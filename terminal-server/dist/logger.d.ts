type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
export declare function log(level: LogLevel, event: string, meta?: Record<string, unknown>): void;
export {};

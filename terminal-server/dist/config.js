"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
function parseList(value, fallback) {
    if (!value?.trim())
        return fallback;
    return value.split(",").map((s) => s.trim()).filter(Boolean);
}
exports.config = {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 30500),
    maxSessions: Number(process.env.MAX_SESSIONS ?? 10),
    sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES ?? 15),
    heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS ?? 30000),
    allowedNamespaces: parseList(process.env.ALLOWED_NAMESPACES, ["portfolio", "default"]),
    defaultNamespace: process.env.DEFAULT_NAMESPACE ?? "portfolio",
    defaultContainer: process.env.DEFAULT_CONTAINER ?? "",
    defaultCommand: parseList(process.env.DEFAULT_SHELL_COMMAND, ["/bin/sh", "-c", "exec bash 2>/dev/null || exec sh"]),
    allowedOrigins: parseList(process.env.ALLOWED_ORIGINS, []),
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10),
    allowLocalFallback: process.env.ALLOW_LOCAL_FALLBACK === "true",
    inCluster: Boolean(process.env.KUBERNETES_SERVICE_HOST),
};

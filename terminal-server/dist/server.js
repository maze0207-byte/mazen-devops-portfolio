"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const node_os_1 = __importDefault(require("node:os"));
const ws_1 = require("ws");
const config_1 = require("./config");
const client_1 = require("./k8s/client");
const logger_1 = require("./logger");
const manager_1 = require("./session/manager");
const handler_1 = require("./ws/handler");
const sessionManager = new manager_1.SessionManager();
function applyCors(req, res) {
    const origin = req.headers.origin;
    if (origin && config_1.config.allowedOrigins.some((o) => origin.startsWith(o))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    else if (config_1.config.allowedOrigins.length === 0) {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
const httpServer = node_http_1.default.createServer((req, res) => {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    if (req.url === "/health" || req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            activeSessions: sessionManager.size,
            maxSessions: config_1.config.maxSessions,
            inCluster: (0, client_1.isInCluster)(),
            uptime: process.uptime(),
            hostname: node_os_1.default.hostname(),
            port: config_1.config.port,
            allowedNamespaces: config_1.config.allowedNamespaces,
            timestamp: new Date().toISOString(),
        }));
        return;
    }
    if (req.url === "/diagnostics") {
        const checks = {
            kubernetes: (0, client_1.isInCluster)() ? "✔ Kubernetes detected (in-cluster)" : "✖ Not in cluster",
            auth: (0, client_1.isInCluster)() ? "✔ loadFromCluster()" : "⚠ Local fallback only if enabled",
            websocket: "✔ WebSocket gateway active",
            exec: "✔ pods/exec via @kubernetes/client-node",
            sessions: `${sessionManager.size}/${config_1.config.maxSessions} active`,
            namespaces: config_1.config.allowedNamespaces.join(", "),
            nodePort: `✔ Listening on ${config_1.config.host}:${config_1.config.port}`,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(checks, null, 2));
        return;
    }
    res.writeHead(404);
    res.end("Not Found");
});
const wss = new ws_1.WebSocketServer({ server: httpServer });
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const sock = ws;
        if (sock.__isAlive === false) {
            (0, logger_1.log)("WARN", "heartbeat_timeout", {});
            ws.terminate();
            sessionManager.disconnect(ws);
            return;
        }
        sock.__isAlive = false;
        ws.ping();
    });
}, config_1.config.heartbeatIntervalMs);
wss.on("connection", (ws, req) => {
    (0, handler_1.attachWebSocketHandlers)(ws, req, sessionManager);
});
wss.on("close", () => clearInterval(heartbeatInterval));
httpServer.listen(config_1.config.port, config_1.config.host, () => {
    (0, logger_1.log)("INFO", "server_started", {
        host: config_1.config.host,
        port: config_1.config.port,
        inCluster: (0, client_1.isInCluster)(),
        maxSessions: config_1.config.maxSessions,
        allowedNamespaces: config_1.config.allowedNamespaces,
        pid: process.pid,
    });
});
function shutdown() {
    (0, logger_1.log)("INFO", "server_shutting_down", { activeSessions: sessionManager.size });
    clearInterval(heartbeatInterval);
    sessionManager.disconnectAll();
    wss.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

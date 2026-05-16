"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
const node_http_1 = __importDefault(require("node:http"));
const node_os_1 = __importDefault(require("node:os"));
const pty = __importStar(require("node-pty"));
const ws_1 = require("ws");
// ────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 5);
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES ?? 10);
const HEARTBEAT_INTERVAL_MS = 30000;
const SHELL_PATH = process.env.SHELL_PATH ?? "/scripts/restricted-shell.sh";
const SHELL_FALLBACK = "/bin/bash";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
// ────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────
const activeSessions = new Map();
const rateLimitByIp = new Map();
// ────────────────────────────────────────────────────────────
// Logging helpers
// ────────────────────────────────────────────────────────────
function log(level, event, meta) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        event,
        ...meta,
    };
    if (level === "ERROR") {
        console.error(JSON.stringify(entry));
    }
    else {
        console.log(JSON.stringify(entry));
    }
}
// ────────────────────────────────────────────────────────────
// Rate limiting (3 connections per IP per minute)
// ────────────────────────────────────────────────────────────
function isRateLimited(ip) {
    const now = Date.now();
    const attempts = rateLimitByIp.get(ip) ?? [];
    const recent = attempts.filter((t) => t > now - 60000);
    recent.push(now);
    rateLimitByIp.set(ip, recent);
    return recent.length > 3;
}
// ────────────────────────────────────────────────────────────
// Origin validation
// ────────────────────────────────────────────────────────────
function isOriginAllowed(origin) {
    // If no origins configured, allow all (development mode)
    if (ALLOWED_ORIGINS.length === 0)
        return true;
    if (!origin)
        return false;
    return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
}
// ────────────────────────────────────────────────────────────
// Detect available shell
// ────────────────────────────────────────────────────────────
function detectShell() {
    try {
        const fs = require("node:fs");
        if (fs.existsSync(SHELL_PATH)) {
            log("INFO", "shell_detected", { shell: SHELL_PATH });
            return SHELL_PATH;
        }
    }
    catch {
        // ignore
    }
    log("WARN", "shell_fallback", { shell: SHELL_FALLBACK, reason: `${SHELL_PATH} not found` });
    return SHELL_FALLBACK;
}
const resolvedShell = detectShell();
// ────────────────────────────────────────────────────────────
// HTTP server (health check + WebSocket upgrade)
// ────────────────────────────────────────────────────────────
const httpServer = node_http_1.default.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/healthz") {
        const diagnostics = {
            status: "ok",
            activeSessions: activeSessions.size,
            maxSessions: MAX_SESSIONS,
            shell: resolvedShell,
            uptime: process.uptime(),
            platform: node_os_1.default.platform(),
            hostname: node_os_1.default.hostname(),
            kubernetesDetected: !!process.env.KUBERNETES_SERVICE_HOST,
            ptyAvailable: true,
            timestamp: new Date().toISOString(),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(diagnostics));
        return;
    }
    // Diagnostics endpoint
    if (req.url === "/diagnostics") {
        const checks = {
            kubernetes: !!process.env.KUBERNETES_SERVICE_HOST ? "✔ Kubernetes detected" : "✖ Not running in Kubernetes",
            shell: resolvedShell === SHELL_PATH ? "✔ Restricted shell available" : "⚠ Using fallback shell",
            pty: "✔ PTY available",
            sessions: `${activeSessions.size}/${MAX_SESSIONS} active sessions`,
            uptime: `${Math.floor(process.uptime())}s`,
            nodePort: `✔ Listening on ${HOST}:${PORT}`,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(checks, null, 2));
        return;
    }
    res.writeHead(404);
    res.end("Not Found");
});
// ────────────────────────────────────────────────────────────
// WebSocket server
// ────────────────────────────────────────────────────────────
const wss = new ws_1.WebSocketServer({ server: httpServer });
exports.wss = wss;
// ────────────────────────────────────────────────────────────
// Idle timer management
// ────────────────────────────────────────────────────────────
function resetIdleTimer(ws) {
    const session = activeSessions.get(ws);
    if (!session)
        return;
    clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => {
        log("INFO", "session_idle_timeout", { ip: session.remoteIp });
        sendJson(ws, { type: "system", data: "\r\n\x1b[33mSession timed out after inactivity. Closing...\x1b[0m\r\n" });
        setTimeout(() => {
            ws.close();
            cleanupSession(ws);
        }, 1000);
    }, SESSION_TIMEOUT_MINUTES * 60 * 1000);
}
// ────────────────────────────────────────────────────────────
// Session cleanup
// ────────────────────────────────────────────────────────────
function cleanupSession(ws) {
    const session = activeSessions.get(ws);
    if (!session)
        return;
    log("INFO", "session_cleanup", { ip: session.remoteIp });
    activeSessions.delete(ws);
    clearTimeout(session.idleTimer);
    try {
        session.pty.kill();
    }
    catch {
        // PTY may already be dead
    }
}
// ────────────────────────────────────────────────────────────
// JSON message helpers
// ────────────────────────────────────────────────────────────
function sendJson(ws, msg) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}
function parseMessage(raw) {
    const str = typeof raw === "string" ? raw : raw.toString("utf8");
    // Try JSON first
    try {
        const parsed = JSON.parse(str);
        if (parsed && typeof parsed.type === "string") {
            return parsed;
        }
    }
    catch {
        // Not JSON — treat as raw input (backward compatibility)
    }
    // Raw string = terminal input
    return { type: "input", data: str };
}
// ────────────────────────────────────────────────────────────
// Heartbeat (server pings clients every 30s)
// ────────────────────────────────────────────────────────────
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.__isAlive === false) {
            log("WARN", "heartbeat_timeout", { reason: "client did not respond to ping" });
            ws.terminate();
            cleanupSession(ws);
            return;
        }
        ws.__isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL_MS);
wss.on("close", () => {
    clearInterval(heartbeatInterval);
});
// ────────────────────────────────────────────────────────────
// Connection handler
// ────────────────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
    const remoteIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        ?? req.socket.remoteAddress
        ?? "unknown";
    const origin = req.headers.origin;
    log("INFO", "websocket_connected", { ip: remoteIp, origin });
    ws.__isAlive = true;
    ws.on("pong", () => {
        ws.__isAlive = true;
    });
    // Origin check
    if (!isOriginAllowed(origin)) {
        log("WARN", "origin_rejected", { ip: remoteIp, origin });
        sendJson(ws, { type: "error", data: "Origin not allowed." });
        ws.close();
        return;
    }
    // Session limit
    if (activeSessions.size >= MAX_SESSIONS) {
        log("WARN", "max_sessions_reached", { ip: remoteIp, count: activeSessions.size });
        sendJson(ws, { type: "error", data: "Too many active terminal sessions. Please try again later." });
        ws.close();
        return;
    }
    // Rate limit
    if (isRateLimited(remoteIp)) {
        log("WARN", "rate_limited", { ip: remoteIp });
        sendJson(ws, { type: "error", data: "Rate limit exceeded. Try again in a minute." });
        ws.close();
        return;
    }
    // ── Spawn PTY ──────────────────────────────────────────
    try {
        log("INFO", "pty_spawning", { shell: resolvedShell, ip: remoteIp });
        const env = {
            TERM: "xterm-256color",
            HOME: process.env.HOME ?? "/home/visitor",
            USER: process.env.USER ?? "visitor",
            SHELL: resolvedShell,
            LANG: "en_US.UTF-8",
            PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        };
        // Pass through kubeconfig if available
        if (process.env.KUBECONFIG) {
            env.KUBECONFIG = process.env.KUBECONFIG;
        }
        const shell = pty.spawn(resolvedShell, [], {
            name: "xterm-256color",
            cols: 100,
            rows: 30,
            cwd: env.HOME,
            env,
        });
        log("INFO", "pty_spawned", { pid: shell.pid, shell: resolvedShell, ip: remoteIp });
        // Create session
        const idleTimer = setTimeout(() => { }, 0); // placeholder, reset below
        const session = {
            pty: shell,
            idleTimer,
            createdAt: new Date(),
            remoteIp,
        };
        activeSessions.set(ws, session);
        resetIdleTimer(ws);
        // Send welcome
        sendJson(ws, { type: "system", data: "Connected to sandbox terminal.\r\n" });
        log("INFO", "session_ready", { ip: remoteIp, activeSessions: activeSessions.size });
        // ── PTY → WebSocket ──────────────────────────────────
        shell.onData((data) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                sendJson(ws, { type: "output", data });
            }
        });
        shell.onExit(({ exitCode, signal }) => {
            log("INFO", "pty_exited", { exitCode, signal, ip: remoteIp });
            sendJson(ws, { type: "system", data: `\r\n\x1b[33mShell exited (code ${exitCode}). Connection closing.\x1b[0m\r\n` });
            setTimeout(() => {
                if (ws.readyState === ws_1.WebSocket.OPEN)
                    ws.close();
                cleanupSession(ws);
            }, 500);
        });
        // ── WebSocket → PTY ──────────────────────────────────
        ws.on("message", (raw) => {
            const msg = parseMessage(raw);
            if (!msg)
                return;
            switch (msg.type) {
                case "input":
                    if (msg.data) {
                        // Audit log (first 200 chars, skip control sequences)
                        const printable = msg.data.replace(/[\x00-\x1f]/g, "");
                        if (printable.length > 0) {
                            log("DEBUG", "user_input", { ip: remoteIp, chars: printable.slice(0, 200) });
                        }
                        shell.write(msg.data);
                        resetIdleTimer(ws);
                    }
                    break;
                case "resize":
                    if (msg.cols && msg.rows && msg.cols > 0 && msg.rows > 0) {
                        shell.resize(Math.min(msg.cols, 500), Math.min(msg.rows, 200));
                        log("DEBUG", "terminal_resized", { cols: msg.cols, rows: msg.rows, ip: remoteIp });
                    }
                    break;
                case "ping":
                    sendJson(ws, { type: "pong" });
                    break;
                default:
                    log("WARN", "unknown_message_type", { type: msg.type, ip: remoteIp });
            }
        });
        // ── WebSocket close/error ────────────────────────────
        ws.on("close", () => {
            log("INFO", "websocket_disconnected", { ip: remoteIp });
            cleanupSession(ws);
        });
        ws.on("error", (err) => {
            log("ERROR", "websocket_error", { ip: remoteIp, error: err.message });
            cleanupSession(ws);
        });
    }
    catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        log("ERROR", "session_creation_failed", { ip: remoteIp, error: errMsg });
        sendJson(ws, { type: "error", data: "Unable to start terminal session. Please try again." });
        ws.close();
    }
});
// ────────────────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────────────────
httpServer.listen(PORT, HOST, () => {
    log("INFO", "server_started", {
        host: HOST,
        port: PORT,
        shell: resolvedShell,
        maxSessions: MAX_SESSIONS,
        timeoutMinutes: SESSION_TIMEOUT_MINUTES,
        kubernetes: !!process.env.KUBERNETES_SERVICE_HOST,
        pid: process.pid,
    });
});
// ────────────────────────────────────────────────────────────
// Graceful shutdown
// ────────────────────────────────────────────────────────────
function shutdown() {
    log("INFO", "server_shutting_down", { activeSessions: activeSessions.size });
    clearInterval(heartbeatInterval);
    wss.close();
    for (const ws of Array.from(activeSessions.keys())) {
        cleanupSession(ws);
    }
    httpServer.close(() => {
        log("INFO", "server_stopped");
        process.exit(0);
    });
    // Force exit after 5s
    setTimeout(() => process.exit(1), 5000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachWebSocketHandlers = attachWebSocketHandlers;
const config_1 = require("../config");
const logger_1 = require("../logger");
const manager_1 = require("../session/manager");
const protocol_1 = require("./protocol");
const rateLimitByIp = new Map();
function getClientIp(req) {
    return (req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
        req.socket.remoteAddress ??
        "unknown");
}
function isOriginAllowed(origin) {
    if (config_1.config.allowedOrigins.length === 0)
        return true;
    if (!origin)
        return false;
    return config_1.config.allowedOrigins.some((allowed) => origin.startsWith(allowed));
}
function isRateLimited(ip) {
    const now = Date.now();
    const attempts = rateLimitByIp.get(ip) ?? [];
    const recent = attempts.filter((t) => t > now - 60000);
    recent.push(now);
    rateLimitByIp.set(ip, recent);
    return recent.length > config_1.config.rateLimitPerMinute;
}
function attachWebSocketHandlers(ws, req, sessionManager) {
    const remoteIp = getClientIp(req);
    const origin = req.headers.origin;
    (0, logger_1.log)("INFO", "WebSocket Connected", { event: "websocket_connected", ip: remoteIp, origin });
    ws.__isAlive = true;
    ws.on("pong", () => {
        ;
        ws.__isAlive = true;
    });
    if (!isOriginAllowed(origin)) {
        (0, logger_1.log)("WARN", "origin_rejected", { ip: remoteIp, origin });
        (0, protocol_1.sendJson)(ws, { type: "error", data: "Origin not allowed." });
        ws.close();
        return;
    }
    if (isRateLimited(remoteIp)) {
        (0, logger_1.log)("WARN", "rate_limited", { ip: remoteIp });
        (0, protocol_1.sendJson)(ws, { type: "error", data: "Rate limit exceeded. Try again in a minute." });
        ws.close();
        return;
    }
    (0, protocol_1.sendJson)(ws, {
        type: "system",
        data: "Connected to Kubernetes terminal gateway.\r\n" +
            'Send {"type":"connect","pod":"<name>","namespace":"<ns>"} to attach.\r\n',
    });
    ws.on("message", async (raw) => {
        const msg = (0, protocol_1.parseClientMessage)(raw);
        if (!msg)
            return;
        try {
            switch (msg.type) {
                case "connect": {
                    if (!msg.pod?.trim()) {
                        (0, protocol_1.sendJson)(ws, { type: "error", data: "Missing required field: pod" });
                        return;
                    }
                    const namespace = msg.namespace?.trim() || config_1.config.defaultNamespace;
                    (0, logger_1.log)("INFO", "terminal_connect_request", {
                        ip: remoteIp,
                        pod: msg.pod,
                        namespace,
                        container: msg.container,
                    });
                    await sessionManager.connect(ws, {
                        pod: msg.pod.trim(),
                        namespace,
                        container: msg.container?.trim(),
                        command: msg.command,
                    }, remoteIp);
                    break;
                }
                case "input": {
                    if (!sessionManager.has(ws)) {
                        (0, protocol_1.sendJson)(ws, { type: "error", data: "Not connected to a pod. Send a connect message first." });
                        return;
                    }
                    if (msg.data)
                        sessionManager.writeInput(ws, msg.data);
                    break;
                }
                case "resize": {
                    if (msg.cols && msg.rows)
                        sessionManager.resize(ws, msg.cols, msg.rows);
                    break;
                }
                case "ping":
                    (0, protocol_1.sendJson)(ws, { type: "pong" });
                    break;
                default:
                    (0, logger_1.log)("WARN", "unknown_message_type", { type: msg.type });
            }
        }
        catch (err) {
            const message = (0, manager_1.formatConnectError)(err);
            (0, logger_1.log)("ERROR", "session_creation_failed", { ip: remoteIp, error: message });
            (0, protocol_1.sendJson)(ws, { type: "error", data: message });
        }
    });
    ws.on("close", () => {
        (0, logger_1.log)("INFO", "WebSocket Disconnected", { event: "websocket_disconnected", ip: remoteIp });
        sessionManager.disconnect(ws);
    });
    ws.on("error", (err) => {
        (0, logger_1.log)("ERROR", "websocket_error", { ip: remoteIp, error: err.message });
        sessionManager.disconnect(ws);
    });
}

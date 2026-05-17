"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
exports.formatConnectError = formatConnectError;
const config_1 = require("../config");
const exec_session_1 = require("../k8s/exec-session");
const kubectl_fallback_1 = require("../k8s/kubectl-fallback");
const client_1 = require("../k8s/client");
const pod_validator_1 = require("../k8s/pod-validator");
const logger_1 = require("../logger");
const protocol_1 = require("../ws/protocol");
class SessionManager {
    constructor() {
        this.sessions = new Map();
    }
    get size() {
        return this.sessions.size;
    }
    has(ws) {
        return this.sessions.has(ws);
    }
    async connect(ws, params, remoteIp) {
        if (this.sessions.has(ws)) {
            this.disconnect(ws);
        }
        if (this.sessions.size >= config_1.config.maxSessions) {
            throw new Error("Too many active terminal sessions. Please try again later.");
        }
        const shellCommand = params.command ?? config_1.config.defaultCommand;
        const handlers = {
            onOutput: (data) => {
                this.resetIdleTimer(ws);
                (0, protocol_1.sendJson)(ws, { type: "output", data });
            },
            onExit: (code) => {
                (0, protocol_1.sendJson)(ws, {
                    type: "system",
                    data: `\r\n\x1b[33mShell exited (code ${code}).\x1b[0m\r\n`,
                });
                this.disconnect(ws);
            },
            onError: (message) => {
                (0, protocol_1.sendJson)(ws, { type: "error", data: message });
            },
        };
        let exec;
        if ((0, client_1.isInCluster)()) {
            exec = await (0, exec_session_1.createExecSession)({
                namespace: params.namespace,
                pod: params.pod,
                container: params.container,
                command: shellCommand,
                ...handlers,
            });
        }
        else if (config_1.config.allowLocalFallback) {
            const kubectl = new kubectl_fallback_1.KubectlExecSession({
                namespace: params.namespace,
                pod: params.pod,
                container: params.container ?? "main",
                command: shellCommand,
                ...handlers,
            });
            await kubectl.start();
            exec = kubectl;
        }
        else {
            throw new Error("Kubernetes in-cluster config is required.");
        }
        const idleTimer = setTimeout(() => this.onIdleTimeout(ws), config_1.config.sessionTimeoutMinutes * 60000);
        this.sessions.set(ws, {
            exec,
            idleTimer,
            remoteIp,
            connectedAt: new Date(),
        });
        (0, logger_1.log)("INFO", "Session Ready", {
            event: "session_ready",
            ip: remoteIp,
            pod: params.pod,
            namespace: params.namespace,
            activeSessions: this.sessions.size,
        });
        (0, protocol_1.sendJson)(ws, {
            type: "connected",
            pod: params.pod,
            namespace: params.namespace,
            container: exec.container,
        });
    }
    writeInput(ws, data) {
        const session = this.sessions.get(ws);
        if (!session)
            return;
        session.exec.writeInput(data);
        this.resetIdleTimer(ws);
    }
    resize(ws, cols, rows) {
        const session = this.sessions.get(ws);
        if (!session)
            return;
        session.exec.resize(cols, rows);
        this.resetIdleTimer(ws);
    }
    disconnect(ws) {
        const session = this.sessions.get(ws);
        if (!session)
            return;
        clearTimeout(session.idleTimer);
        session.exec.close();
        this.sessions.delete(ws);
        (0, logger_1.log)("INFO", "session_cleanup", {
            ip: session.remoteIp,
            activeSessions: this.sessions.size,
        });
    }
    disconnectAll() {
        for (const ws of Array.from(this.sessions.keys())) {
            this.disconnect(ws);
        }
    }
    resetIdleTimer(ws) {
        const session = this.sessions.get(ws);
        if (!session)
            return;
        clearTimeout(session.idleTimer);
        session.idleTimer = setTimeout(() => this.onIdleTimeout(ws), config_1.config.sessionTimeoutMinutes * 60000);
    }
    onIdleTimeout(ws) {
        (0, logger_1.log)("INFO", "session_idle_timeout", {});
        (0, protocol_1.sendJson)(ws, {
            type: "system",
            data: "\r\n\x1b[33mSession timed out after inactivity.\x1b[0m\r\n",
        });
        setTimeout(() => {
            if (ws.readyState === ws.OPEN)
                ws.close();
            this.disconnect(ws);
        }, 500);
    }
}
exports.SessionManager = SessionManager;
function formatConnectError(err) {
    if (err instanceof pod_validator_1.PodValidationError)
        return err.message;
    if (err instanceof Error)
        return err.message;
    return "Unable to start terminal session.";
}

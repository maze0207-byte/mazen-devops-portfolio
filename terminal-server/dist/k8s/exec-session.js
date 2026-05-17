"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.K8sExecSession = void 0;
exports.createExecSession = createExecSession;
const node_stream_1 = require("node:stream");
const logger_1 = require("../logger");
const client_1 = require("./client");
const pod_validator_1 = require("./pod-validator");
class K8sExecSession {
    get container() {
        return this._container;
    }
    constructor(options) {
        this._container = "";
        this.stdin = new node_stream_1.PassThrough();
        this.active = false;
        this.closed = false;
        this.cols = 80;
        this.rows = 24;
        this.namespace = options.namespace;
        this.pod = options.pod;
        this._container = options.container ?? "";
        this.command = options.command ?? ["/bin/sh"];
        this.onOutput = options.onOutput;
        this.onExit = options.onExit;
        this.onError = options.onError;
        this.exec = (0, client_1.createExec)();
        this.sessionId = `${options.namespace}/${options.pod}/${Date.now()}`;
    }
    async start() {
        if (this.active || this.closed)
            return;
        const api = (0, client_1.getCoreApi)();
        const container = await (0, pod_validator_1.resolveTargetContainer)(api, this.namespace, this.pod, this._container || undefined);
        this._container = container;
        const stdout = new node_stream_1.Writable({
            write: (chunk, _enc, cb) => {
                this.onOutput(chunk.toString());
                cb();
            },
        });
        const stderr = new node_stream_1.Writable({
            write: (chunk, _enc, cb) => {
                this.onOutput(`\x1b[31m${chunk.toString()}\x1b[0m`);
                cb();
            },
        });
        (0, logger_1.log)("INFO", "k8s_exec_starting", {
            sessionId: this.sessionId,
            namespace: this.namespace,
            pod: this.pod,
            container,
        });
        this.active = true;
        await this.exec.exec(this.namespace, this.pod, container, this.command, stdout, stderr, this.stdin, true, (status) => {
            this.active = false;
            const code = status.status === "Success" ? 0 : 1;
            (0, logger_1.log)("INFO", "k8s_exec_exited", { sessionId: this.sessionId, status: status.status, code });
            this.onExit(code);
        });
        (0, logger_1.log)("INFO", "k8s_exec_attached", { sessionId: this.sessionId });
    }
    writeInput(data) {
        if (!this.active || this.closed)
            return;
        this.stdin.write(data);
    }
    resize(cols, rows) {
        if (cols <= 0 || rows <= 0)
            return;
        this.cols = cols;
        this.rows = rows;
        // client-node Exec does not expose resize on the public API; best-effort SIGWINCH via stty if shell supports it
        if (this.active) {
            this.stdin.write(`stty cols ${cols} rows ${rows}\n`);
        }
    }
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.active = false;
        try {
            this.stdin.end();
        }
        catch {
            // ignore
        }
        (0, logger_1.log)("INFO", "k8s_exec_closed", { sessionId: this.sessionId });
    }
}
exports.K8sExecSession = K8sExecSession;
async function createExecSession(options) {
    try {
        const session = new K8sExecSession(options);
        await session.start();
        return session;
    }
    catch (err) {
        if (err instanceof pod_validator_1.PodValidationError)
            throw err;
        const message = err instanceof Error ? err.message : String(err);
        (0, logger_1.log)("ERROR", "k8s_exec_failed", { error: message, pod: options.pod, namespace: options.namespace });
        options.onError(message);
        throw err;
    }
}

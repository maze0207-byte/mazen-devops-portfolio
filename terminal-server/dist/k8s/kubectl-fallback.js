"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubectlExecSession = void 0;
const node_child_process_1 = require("node:child_process");
const logger_1 = require("../logger");
/** Local dev fallback only — production must use in-cluster client-node. */
class KubectlExecSession {
    constructor(options) {
        this.options = options;
        this.proc = null;
        this.closed = false;
        this.namespace = options.namespace;
        this.pod = options.pod;
        this.container = options.container;
        this.sessionId = `kubectl/${options.namespace}/${options.pod}/${Date.now()}`;
    }
    async start() {
        const args = [
            "exec",
            "-i",
            "-t",
            "-n",
            this.namespace,
            this.pod,
            "-c",
            this.container,
            "--",
            ...this.options.command,
        ];
        (0, logger_1.log)("WARN", "kubectl_fallback_start", { sessionId: this.sessionId, args: args.join(" ") });
        this.proc = (0, node_child_process_1.spawn)("kubectl", args, { stdio: "pipe" });
        this.proc.stdout.on("data", (chunk) => this.options.onOutput(chunk.toString()));
        this.proc.stderr.on("data", (chunk) => this.options.onOutput(`\x1b[31m${chunk.toString()}\x1b[0m`));
        this.proc.on("exit", (code) => {
            this.options.onExit(code ?? 1);
        });
        this.proc.on("error", (err) => {
            this.options.onError(err.message);
        });
    }
    writeInput(data) {
        this.proc?.stdin.write(data);
    }
    resize(_cols, _rows) {
        // kubectl TTY resize not supported in fallback mode
    }
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.proc?.kill();
        this.proc = null;
    }
}
exports.KubectlExecSession = KubectlExecSession;

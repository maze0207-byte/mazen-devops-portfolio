import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { log } from "../logger"

export interface KubectlSessionOptions {
  namespace: string
  pod: string
  container: string
  command: string[]
  onOutput: (data: string) => void
  onExit: (code: number) => void
  onError: (message: string) => void
}

/** Local dev fallback only — production must use in-cluster client-node. */
export class KubectlExecSession {
  readonly namespace: string
  readonly pod: string
  readonly container: string
  readonly sessionId: string

  private proc: ChildProcessWithoutNullStreams | null = null
  private closed = false

  constructor(private readonly options: KubectlSessionOptions) {
    this.namespace = options.namespace
    this.pod = options.pod
    this.container = options.container
    this.sessionId = `kubectl/${options.namespace}/${options.pod}/${Date.now()}`
  }

  async start(): Promise<void> {
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
    ]

    log("WARN", "kubectl_fallback_start", { sessionId: this.sessionId, args: args.join(" ") })

    this.proc = spawn("kubectl", args, { stdio: "pipe" })

    this.proc.stdout.on("data", (chunk: Buffer) => this.options.onOutput(chunk.toString()))
    this.proc.stderr.on("data", (chunk: Buffer) =>
      this.options.onOutput(`\x1b[31m${chunk.toString()}\x1b[0m`),
    )

    this.proc.on("exit", (code) => {
      this.options.onExit(code ?? 1)
    })

    this.proc.on("error", (err) => {
      this.options.onError(err.message)
    })
  }

  writeInput(data: string): void {
    this.proc?.stdin.write(data)
  }

  resize(_cols: number, _rows: number): void {
    // kubectl TTY resize not supported in fallback mode
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.proc?.kill()
    this.proc = null
  }
}

import { PassThrough, Writable } from "node:stream"
import type { Exec } from "@kubernetes/client-node"
import { log } from "../logger"
import { createExec, getCoreApi } from "./client"
import { PodValidationError, resolveTargetContainer } from "./pod-validator"

export interface ExecSessionOptions {
  namespace: string
  pod: string
  container?: string
  command?: string[]
  onOutput: (data: string) => void
  onExit: (code: number) => void
  onError: (message: string) => void
}

export class K8sExecSession {
  readonly namespace: string
  readonly pod: string
  readonly sessionId: string

  private _container = ""

  get container(): string {
    return this._container
  }

  private readonly stdin = new PassThrough()
  private readonly exec: Exec
  private readonly command: string[]
  private readonly onOutput: (data: string) => void
  private readonly onExit: (code: number) => void
  private readonly onError: (message: string) => void

  private active = false
  private closed = false
  private cols = 80
  private rows = 24

  constructor(options: ExecSessionOptions) {
    this.namespace = options.namespace
    this.pod = options.pod
    this._container = options.container ?? ""
    this.command = options.command ?? ["/bin/sh"]
    this.onOutput = options.onOutput
    this.onExit = options.onExit
    this.onError = options.onError
    this.exec = createExec()
    this.sessionId = `${options.namespace}/${options.pod}/${Date.now()}`
  }

  async start(): Promise<void> {
    if (this.active || this.closed) return

    const api = getCoreApi()
    const container = await resolveTargetContainer(
      api,
      this.namespace,
      this.pod,
      this._container || undefined,
    )
    this._container = container

    const stdout = new Writable({
      write: (chunk, _enc, cb) => {
        this.onOutput(chunk.toString())
        cb()
      },
    })

    const stderr = new Writable({
      write: (chunk, _enc, cb) => {
        this.onOutput(`\x1b[31m${chunk.toString()}\x1b[0m`)
        cb()
      },
    })

    log("INFO", "k8s_exec_starting", {
      sessionId: this.sessionId,
      namespace: this.namespace,
      pod: this.pod,
      container,
    })

    this.active = true

    await this.exec.exec(
      this.namespace,
      this.pod,
      container,
      this.command,
      stdout,
      stderr,
      this.stdin,
      true,
      (status) => {
        this.active = false
        const code = status.status === "Success" ? 0 : 1
        log("INFO", "k8s_exec_exited", { sessionId: this.sessionId, status: status.status, code })
        this.onExit(code)
      },
    )

    log("INFO", "k8s_exec_attached", { sessionId: this.sessionId })
  }

  writeInput(data: string): void {
    if (!this.active || this.closed) return
    this.stdin.write(data)
  }

  resize(cols: number, rows: number): void {
    if (cols <= 0 || rows <= 0) return
    this.cols = cols
    this.rows = rows
    // client-node Exec does not expose resize on the public API; best-effort SIGWINCH via stty if shell supports it
    if (this.active) {
      this.stdin.write(`stty cols ${cols} rows ${rows}\n`)
    }
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.active = false
    try {
      this.stdin.end()
    } catch {
      // ignore
    }
    log("INFO", "k8s_exec_closed", { sessionId: this.sessionId })
  }
}

export async function createExecSession(options: ExecSessionOptions): Promise<K8sExecSession> {
  try {
    const session = new K8sExecSession(options)
    await session.start()
    return session
  } catch (err) {
    if (err instanceof PodValidationError) throw err
    const message = err instanceof Error ? err.message : String(err)
    log("ERROR", "k8s_exec_failed", { error: message, pod: options.pod, namespace: options.namespace })
    options.onError(message)
    throw err
  }
}

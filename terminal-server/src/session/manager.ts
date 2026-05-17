import type { WebSocket } from "ws"
import { config } from "../config"
import { createExecSession, K8sExecSession } from "../k8s/exec-session"
import { KubectlExecSession } from "../k8s/kubectl-fallback"
import { isInCluster } from "../k8s/client"
import { PodValidationError } from "../k8s/pod-validator"
import { log } from "../logger"
import { sendJson } from "../ws/protocol"

export interface ConnectParams {
  pod: string
  namespace: string
  container?: string
  command?: string[]
}

type ActiveSession = K8sExecSession | KubectlExecSession

interface ManagedSession {
  exec: ActiveSession
  idleTimer: NodeJS.Timeout
  remoteIp: string
  connectedAt: Date
}

export class SessionManager {
  private readonly sessions = new Map<WebSocket, ManagedSession>()

  get size(): number {
    return this.sessions.size
  }

  has(ws: WebSocket): boolean {
    return this.sessions.has(ws)
  }

  async connect(ws: WebSocket, params: ConnectParams, remoteIp: string): Promise<void> {
    if (this.sessions.has(ws)) {
      this.disconnect(ws)
    }

    if (this.sessions.size >= config.maxSessions) {
      throw new Error("Too many active terminal sessions. Please try again later.")
    }

    const shellCommand = params.command ?? config.defaultCommand
    const handlers = {
      onOutput: (data: string) => {
        this.resetIdleTimer(ws)
        sendJson(ws, { type: "output", data })
      },
      onExit: (code: number) => {
        sendJson(ws, {
          type: "system",
          data: `\r\n\x1b[33mShell exited (code ${code}).\x1b[0m\r\n`,
        })
        this.disconnect(ws)
      },
      onError: (message: string) => {
        sendJson(ws, { type: "error", data: message })
      },
    }

    let exec: ActiveSession

    if (isInCluster()) {
      exec = await createExecSession({
        namespace: params.namespace,
        pod: params.pod,
        container: params.container,
        command: shellCommand,
        ...handlers,
      })
    } else if (config.allowLocalFallback) {
      const kubectl = new KubectlExecSession({
        namespace: params.namespace,
        pod: params.pod,
        container: params.container ?? "main",
        command: shellCommand,
        ...handlers,
      })
      await kubectl.start()
      exec = kubectl
    } else {
      throw new Error("Kubernetes in-cluster config is required.")
    }

    const idleTimer = setTimeout(() => this.onIdleTimeout(ws), config.sessionTimeoutMinutes * 60_000)

    this.sessions.set(ws, {
      exec,
      idleTimer,
      remoteIp,
      connectedAt: new Date(),
    })

    log("INFO", "Session Ready", {
      event: "session_ready",
      ip: remoteIp,
      pod: params.pod,
      namespace: params.namespace,
      activeSessions: this.sessions.size,
    })

    sendJson(ws, {
      type: "connected",
      pod: params.pod,
      namespace: params.namespace,
      container: exec.container,
    })
  }

  writeInput(ws: WebSocket, data: string): void {
    const session = this.sessions.get(ws)
    if (!session) return
    session.exec.writeInput(data)
    this.resetIdleTimer(ws)
  }

  resize(ws: WebSocket, cols: number, rows: number): void {
    const session = this.sessions.get(ws)
    if (!session) return
    session.exec.resize(cols, rows)
    this.resetIdleTimer(ws)
  }

  disconnect(ws: WebSocket): void {
    const session = this.sessions.get(ws)
    if (!session) return

    clearTimeout(session.idleTimer)
    session.exec.close()
    this.sessions.delete(ws)

    log("INFO", "session_cleanup", {
      ip: session.remoteIp,
      activeSessions: this.sessions.size,
    })
  }

  disconnectAll(): void {
    for (const ws of Array.from(this.sessions.keys())) {
      this.disconnect(ws)
    }
  }

  private resetIdleTimer(ws: WebSocket): void {
    const session = this.sessions.get(ws)
    if (!session) return
    clearTimeout(session.idleTimer)
    session.idleTimer = setTimeout(
      () => this.onIdleTimeout(ws),
      config.sessionTimeoutMinutes * 60_000,
    )
  }

  private onIdleTimeout(ws: WebSocket): void {
    log("INFO", "session_idle_timeout", {})
    sendJson(ws, {
      type: "system",
      data: "\r\n\x1b[33mSession timed out after inactivity.\x1b[0m\r\n",
    })
    setTimeout(() => {
      if (ws.readyState === ws.OPEN) ws.close()
      this.disconnect(ws)
    }, 500)
  }
}

export function formatConnectError(err: unknown): string {
  if (err instanceof PodValidationError) return err.message
  if (err instanceof Error) return err.message
  return "Unable to start terminal session."
}

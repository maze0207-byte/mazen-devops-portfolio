import fs from "node:fs/promises"
import { once } from "node:events"
import Docker from "dockerode"
import { WebSocketServer, WebSocket } from "ws"

const PORT = 4000
const IMAGE_NAME = "mazen-terminal-sandbox:latest"
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 5)
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES ?? 10)
const KUBECONFIG_PATH = process.env.KUBECONFIG_PATH ?? "/kubeconfig"

const docker = new Docker({ socketPath: "/var/run/docker.sock" })
const activeSessions = new Map<WebSocket, { container: Docker.Container; stream: any; timer: NodeJS.Timeout }>()
const sessionTimestampsByIp = new Map<string, number[]>()

const wss = new WebSocketServer({ port: PORT })

function cleanupSession(ws: WebSocket) {
  const session = activeSessions.get(ws)
  if (!session) return

  activeSessions.delete(ws)
  clearTimeout(session.timer)

  try {
    session.stream.destroy()
  } catch {
    // ignore
  }

  session.container.kill().catch(() => {
    return
  })
}

function resetIdleTimer(ws: WebSocket) {
  const session = activeSessions.get(ws)
  if (!session) return

  clearTimeout(session.timer)
  session.timer = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("Session timed out after inactivity. Closing sandbox.")
      ws.close()
    }
    cleanupSession(ws)
  }, SESSION_TIMEOUT_MINUTES * 60 * 1000)
}

function isRateLimited(ip: string) {
  const now = Date.now()
  const attempts = sessionTimestampsByIp.get(ip) ?? []
  const windowStart = now - 60_000
  const recent = attempts.filter((timestamp) => timestamp > windowStart)
  recent.push(now)
  sessionTimestampsByIp.set(ip, recent)
  return recent.length > 3
}

async function copyKubeconfig(container: Docker.Container) {
  const content = await fs.readFile(KUBECONFIG_PATH, "utf8")
  const execCopy = await container.exec({
    Cmd: ["/bin/sh", "-lc", "cat > /tmp/visitor-kubeconfig.yaml"],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
  })
  const stream = await execCopy.start({ hijack: true, stdin: true })
  stream.write(content)
  stream.end()
  await once(stream, "close")
}

async function createSandboxSession() {
  const container = await docker.createContainer({
    Image: IMAGE_NAME,
    OpenStdin: true,
    Tty: true,
    StdinOnce: false,
    WorkingDir: "/home/visitor",
    Env: [],
    HostConfig: {
      AutoRemove: true,
      Memory: 64 * 1024 * 1024,
      NanoCpus: 100_000_000,
      NetworkMode: "none",
      ReadonlyRootfs: true,
      Tmpfs: {
        "/tmp": "rw,noexec,nosuid,size=65536k",
      },
    },
    User: "1001",
    Cmd: ["sleep", "infinity"],
  })

  await container.start()
  await copyKubeconfig(container)

  const shellExec = await container.exec({
    Cmd: ["/scripts/restricted-shell.sh"],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    Env: [`KUBECONFIG=/tmp/visitor-kubeconfig.yaml`],
  })

  const shellStream = await shellExec.start({ hijack: true, stdin: true, Tty: true })
  return { container, stream: shellStream }
}

wss.on("connection", async (ws, req) => {
  const remoteIp = req.socket.remoteAddress ?? "unknown"

  if (activeSessions.size >= MAX_SESSIONS) {
    ws.send("Too many active terminal sessions. Please try again later.")
    ws.close()
    return
  }

  if (isRateLimited(remoteIp)) {
    ws.send("Rate limit exceeded. Try again in a minute.")
    ws.close()
    return
  }

  try {
    const { container, stream } = await createSandboxSession()

    ws.send("Connected to sandbox terminal. Type help to begin.\n")

    const timer = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("Session timed out after inactivity. Closing sandbox.")
        ws.close()
      }
      cleanupSession(ws)
    }, SESSION_TIMEOUT_MINUTES * 60 * 1000)

    activeSessions.set(ws, { container, stream, timer })

    stream.on("data", (chunk: Buffer | string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk)
      }
    })

    stream.on("close", () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
      cleanupSession(ws)
    })

    ws.on("message", (message) => {
      const payload = typeof message === "string" ? message : message.toString("utf8")
      stream.write(payload)
      resetIdleTimer(ws)
    })

    ws.on("close", () => {
      cleanupSession(ws)
    })

    ws.on("error", () => {
      cleanupSession(ws)
    })
  } catch (error) {
    ws.send("Unable to start sandbox terminal. Please check the server configuration.")
    ws.close()
    console.error("Terminal session failed:", error)
  }
})

wss.on("listening", () => {
  console.log(`Terminal WebSocket server listening on ws://localhost:${PORT}`)
})

wss.on("error", (error) => {
  console.error("WebSocket server error:", error)
})

const shutdown = async () => {
  console.log("Shutting down terminal server...")
  wss.close()
  for (const ws of Array.from(activeSessions.keys())) {
    cleanupSession(ws)
  }
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

export { wss }

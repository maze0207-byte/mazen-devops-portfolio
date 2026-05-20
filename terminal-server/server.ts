import fs from "node:fs/promises"
import path from "node:path"
import { once } from "node:events"
import Docker from "dockerode"
import { WebSocketServer, WebSocket } from "ws"
import http from "node:http"

const PORT = 4000
const IMAGE_NAME = "mazen-terminal-sandbox:latest"
const SANDBOX_DIR = path.resolve(__dirname, "..", "terminal-sandbox")
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 5)
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES ?? 10)
const KUBECONFIG_PATH = process.env.KUBECONFIG_PATH ?? "/kubeconfig"

const docker = new Docker({ socketPath: "/var/run/docker.sock" })
const activeSessions = new Map<WebSocket, { container: Docker.Container; stream: any; timer: NodeJS.Timeout }>()
const sessionTimestampsByIp = new Map<string, number[]>()

let imageBuildPromise: Promise<void> | null = null

async function buildSandboxImage() {
  console.log(`Building sandbox image ${IMAGE_NAME} from ${SANDBOX_DIR}`)

  const buildStream = await docker.buildImage(SANDBOX_DIR, { t: IMAGE_NAME })

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      buildStream,
      (err: Error | null) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      },
      (event: any) => {
        if (event && event.stream) {
          process.stdout.write(event.stream)
        }
      }
    )
  })

  console.log(`Sandbox image ${IMAGE_NAME} built successfully.`)
}

async function ensureSandboxImage() {
  if (imageBuildPromise) {
    return imageBuildPromise
  }

  imageBuildPromise = buildSandboxImage()

  try {
    await imageBuildPromise
  } finally {
    imageBuildPromise = null
  }
}

const wss = new WebSocketServer({ port: PORT })

// Health check endpoint
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  
  if (req.method === "OPTIONS") {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }))
    return
  }

  if (req.url === "/diagnostics") {
    const diagnostics = {
      status: "ok",
      timestamp: new Date().toISOString(),
      port: PORT,
      activeSessions: activeSessions.size,
      maxSessions: MAX_SESSIONS,
      sessionTimeout: SESSION_TIMEOUT_MINUTES,
      uptime: process.uptime(),
    }
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(diagnostics))
    return
  }

  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not found" }))
})

server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP server listening on http://0.0.0.0:${PORT}`)
})

const ws = new WebSocketServer({ server })

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
    await ensureSandboxImage()
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
  console.log(`Terminal WebSocket server listening on ws://0.0.0.0:${PORT}`)
})

wss.on("error", (error) => {
  console.error("WebSocket server error:", error)
})

const shutdown = async () => {
  console.log("Shutting down terminal server...")
  wss.close()
  server.close()
  for (const ws of Array.from(activeSessions.keys())) {
    cleanupSession(ws)
  }
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

export { wss }

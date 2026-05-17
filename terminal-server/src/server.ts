import http from "node:http"
import os from "node:os"
import { WebSocketServer } from "ws"
import { config } from "./config"
import { isInCluster } from "./k8s/client"
import { log } from "./logger"
import { SessionManager } from "./session/manager"
import { attachWebSocketHandlers } from "./ws/handler"

const sessionManager = new SessionManager()

function applyCors(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin
  if (origin && config.allowedOrigins.some((o) => origin.startsWith(o))) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  } else if (config.allowedOrigins.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*")
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

const httpServer = http.createServer((req, res) => {
  applyCors(req, res)

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === "/health" || req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        status: "ok",
        activeSessions: sessionManager.size,
        maxSessions: config.maxSessions,
        inCluster: isInCluster(),
        uptime: process.uptime(),
        hostname: os.hostname(),
        port: config.port,
        allowedNamespaces: config.allowedNamespaces,
        timestamp: new Date().toISOString(),
      }),
    )
    return
  }

  if (req.url === "/diagnostics") {
    const checks = {
      kubernetes: isInCluster() ? "✔ Kubernetes detected (in-cluster)" : "✖ Not in cluster",
      auth: isInCluster() ? "✔ loadFromCluster()" : "⚠ Local fallback only if enabled",
      websocket: "✔ WebSocket gateway active",
      exec: "✔ pods/exec via @kubernetes/client-node",
      sessions: `${sessionManager.size}/${config.maxSessions} active`,
      namespaces: config.allowedNamespaces.join(", "),
      nodePort: `✔ Listening on ${config.host}:${config.port}`,
    }
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(checks, null, 2))
    return
  }

  res.writeHead(404)
  res.end("Not Found")
})

const wss = new WebSocketServer({ server: httpServer })

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const sock = ws as typeof ws & { __isAlive?: boolean }
    if (sock.__isAlive === false) {
      log("WARN", "heartbeat_timeout", {})
      ws.terminate()
      sessionManager.disconnect(ws)
      return
    }
    sock.__isAlive = false
    ws.ping()
  })
}, config.heartbeatIntervalMs)

wss.on("connection", (ws, req) => {
  attachWebSocketHandlers(ws, req, sessionManager)
})

wss.on("close", () => clearInterval(heartbeatInterval))

httpServer.listen(config.port, config.host, () => {
  log("INFO", "server_started", {
    host: config.host,
    port: config.port,
    inCluster: isInCluster(),
    maxSessions: config.maxSessions,
    allowedNamespaces: config.allowedNamespaces,
    pid: process.pid,
  })
})

function shutdown() {
  log("INFO", "server_shutting_down", { activeSessions: sessionManager.size })
  clearInterval(heartbeatInterval)
  sessionManager.disconnectAll()
  wss.close()
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

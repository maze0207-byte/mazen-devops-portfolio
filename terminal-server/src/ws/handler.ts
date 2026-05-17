import type { IncomingMessage } from "node:http"
import type { WebSocket } from "ws"
import { config } from "../config"
import { log } from "../logger"
import { SessionManager, formatConnectError } from "../session/manager"
import { parseClientMessage, sendJson } from "./protocol"

const rateLimitByIp = new Map<string, number[]>()

function getClientIp(req: IncomingMessage): string {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  )
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (config.allowedOrigins.length === 0) return true
  if (!origin) return false
  return config.allowedOrigins.some((allowed) => origin.startsWith(allowed))
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const attempts = rateLimitByIp.get(ip) ?? []
  const recent = attempts.filter((t) => t > now - 60_000)
  recent.push(now)
  rateLimitByIp.set(ip, recent)
  return recent.length > config.rateLimitPerMinute
}

export function attachWebSocketHandlers(
  ws: WebSocket,
  req: IncomingMessage,
  sessionManager: SessionManager,
): void {
  const remoteIp = getClientIp(req)
  const origin = req.headers.origin

  log("INFO", "WebSocket Connected", { event: "websocket_connected", ip: remoteIp, origin })
  ;(ws as WebSocket & { __isAlive?: boolean }).__isAlive = true

  ws.on("pong", () => {
    ;(ws as WebSocket & { __isAlive?: boolean }).__isAlive = true
  })

  if (!isOriginAllowed(origin)) {
    log("WARN", "origin_rejected", { ip: remoteIp, origin })
    sendJson(ws, { type: "error", data: "Origin not allowed." })
    ws.close()
    return
  }

  if (isRateLimited(remoteIp)) {
    log("WARN", "rate_limited", { ip: remoteIp })
    sendJson(ws, { type: "error", data: "Rate limit exceeded. Try again in a minute." })
    ws.close()
    return
  }

  sendJson(ws, {
    type: "system",
    data:
      "Connected to Kubernetes terminal gateway.\r\n" +
      'Send {"type":"connect","pod":"<name>","namespace":"<ns>"} to attach.\r\n',
  })

  ws.on("message", async (raw) => {
    const msg = parseClientMessage(raw as string | Buffer)
    if (!msg) return

    try {
      switch (msg.type) {
        case "connect": {
          if (!msg.pod?.trim()) {
            sendJson(ws, { type: "error", data: "Missing required field: pod" })
            return
          }
          const namespace = msg.namespace?.trim() || config.defaultNamespace
          log("INFO", "terminal_connect_request", {
            ip: remoteIp,
            pod: msg.pod,
            namespace,
            container: msg.container,
          })
          await sessionManager.connect(
            ws,
            {
              pod: msg.pod.trim(),
              namespace,
              container: msg.container?.trim(),
              command: msg.command,
            },
            remoteIp,
          )
          break
        }
        case "input": {
          if (!sessionManager.has(ws)) {
            sendJson(ws, { type: "error", data: "Not connected to a pod. Send a connect message first." })
            return
          }
          if (msg.data) sessionManager.writeInput(ws, msg.data)
          break
        }
        case "resize": {
          if (msg.cols && msg.rows) sessionManager.resize(ws, msg.cols, msg.rows)
          break
        }
        case "ping":
          sendJson(ws, { type: "pong" })
          break
        default:
          log("WARN", "unknown_message_type", { type: (msg as { type: string }).type })
      }
    } catch (err) {
      const message = formatConnectError(err)
      log("ERROR", "session_creation_failed", { ip: remoteIp, error: message })
      sendJson(ws, { type: "error", data: message })
    }
  })

  ws.on("close", () => {
    log("INFO", "WebSocket Disconnected", { event: "websocket_disconnected", ip: remoteIp })
    sessionManager.disconnect(ws)
  })

  ws.on("error", (err) => {
    log("ERROR", "websocket_error", { ip: remoteIp, error: err.message })
    sessionManager.disconnect(ws)
  })
}

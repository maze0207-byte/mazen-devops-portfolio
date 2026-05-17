export type ClientMessageType = "connect" | "input" | "resize" | "ping"

export interface ClientConnectMessage {
  type: "connect"
  pod: string
  namespace?: string
  container?: string
  command?: string[]
}

export interface ClientInputMessage {
  type: "input"
  data: string
}

export interface ClientResizeMessage {
  type: "resize"
  cols: number
  rows: number
}

export interface ClientPingMessage {
  type: "ping"
}

export type ClientMessage =
  | ClientConnectMessage
  | ClientInputMessage
  | ClientResizeMessage
  | ClientPingMessage

export interface ServerOutputMessage {
  type: "output"
  data: string
}

export interface ServerSystemMessage {
  type: "system"
  data: string
}

export interface ServerErrorMessage {
  type: "error"
  data: string
}

export interface ServerConnectedMessage {
  type: "connected"
  pod: string
  namespace: string
  container: string
}

export interface ServerPongMessage {
  type: "pong"
}

export type ServerMessage =
  | ServerOutputMessage
  | ServerSystemMessage
  | ServerErrorMessage
  | ServerConnectedMessage
  | ServerPongMessage

export function parseClientMessage(raw: string | Buffer): ClientMessage | null {
  const str = typeof raw === "string" ? raw : raw.toString("utf8")
  try {
    const parsed = JSON.parse(str) as ClientMessage
    if (parsed && typeof parsed.type === "string") return parsed
  } catch {
    // backward compat: raw keystrokes
    if (str.length > 0) return { type: "input", data: str }
  }
  return null
}

export function sendJson(ws: { send: (data: string) => void; readyState: number }, msg: ServerMessage) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

export interface TerminalDiagnostics {
  kubernetes: string
  shell: string
  pty: string
  sessions: string
  uptime: string
  nodePort: string
  websocket?: string
  podReady?: string
}

export interface HealthResponse {
  status: string
  activeSessions: number
  maxSessions: number
  inCluster?: boolean
  kubernetesDetected?: boolean
  allowedNamespaces?: string[]
  port?: number
}

export async function fetchTerminalHealth(baseUrl: string): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as HealthResponse
  } catch {
    return null
  }
}

export async function fetchTerminalDiagnostics(baseUrl: string): Promise<TerminalDiagnostics | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/diagnostics`, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as TerminalDiagnostics
  } catch {
    return null
  }
}

/** HTTP base URL matching the WebSocket endpoint (for /health, /diagnostics). */
export function terminalHttpBaseFromWsUrl(wsUrl: string): string {
  try {
    const parsed = new URL(wsUrl)
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:"
    return parsed.origin
  } catch {
    return "http://localhost:4000"
  }
}

/**
 * Terminal utility functions and types
 */

export type TerminalStatus = "connecting" | "connected" | "disconnected"

export interface TerminalDiagnostics {
  connected: boolean
  lastHeartbeat: number
  reconnectAttempts: number
  uptime: number
}

/**
 * Resolve WebSocket URL from a base URL
 */
export function resolveTerminalWsUrl(baseUrl: string): string {
  if (!baseUrl) {
    return process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000"
  }

  // Convert http(s) to ws(s) if needed
  const url = new URL(baseUrl)
  const protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${url.host}${url.pathname}`
}

/**
 * Resolve terminal connection config
 */
export interface TerminalConnectConfig {
  url: string
  timeout: number
  reconnect: boolean
}

export function resolveTerminalConnectConfig(
  wsUrl: string,
): TerminalConnectConfig {
  return {
    url: wsUrl,
    timeout: 5000,
    reconnect: true,
  }
}

/**
 * Convert WebSocket URL to HTTP base URL
 */
export function terminalHttpBaseFromWsUrl(wsUrl: string): string {
  const url = new URL(wsUrl)
  const protocol = url.protocol === "wss:" ? "https:" : "http:"
  return `${protocol}//${url.host}`
}

/**
 * Fetch terminal health status
 */
export async function fetchTerminalHealth(
  baseUrl: string,
): Promise<{ healthy: boolean }> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    return { healthy: response.ok }
  } catch {
    return { healthy: false }
  }
}

/**
 * Fetch terminal diagnostics
 */
export async function fetchTerminalDiagnostics(
  baseUrl: string,
): Promise<TerminalDiagnostics> {
  try {
    const response = await fetch(`${baseUrl}/diagnostics`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    if (response.ok) {
      return await response.json()
    }
  } catch {
    // ignore
  }

  return {
    connected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    uptime: 0,
  }
}

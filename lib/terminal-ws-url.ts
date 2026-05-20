/**
 * Resolves the Kubernetes terminal backend WebSocket URL.
 *
 * Default NodePort: 30500 (does not conflict with frontend 30000).
 */

const LOCAL_PLACEHOLDER_HOSTS = ["localhost", "127.0.0.1"]
const DEFAULT_WS_URL = "ws://localhost:4000"

function isLocalPlaceholder(url: string): boolean {
  try {
    const parsed = new URL(url)
    return LOCAL_PLACEHOLDER_HOSTS.includes(parsed.hostname)
  } catch {
    return false
  }
}

export function resolveTerminalWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim()
  const wsPath = process.env.NEXT_PUBLIC_WS_PATH?.trim()
  const nodePort = process.env.NEXT_PUBLIC_TERMINAL_WS_PORT?.trim()

  if (typeof window === "undefined") {
    if (configured) return configured
    return DEFAULT_WS_URL
  }

  if (configured) {
    return configured
  }

  if (wsPath) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const path = wsPath.startsWith("/") ? wsPath : `/${wsPath}`
    return `${protocol}//${window.location.host}${path}`
  }

  if (nodePort) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    return `${protocol}//${window.location.hostname}:${nodePort}`
  }

  return DEFAULT_WS_URL
}

export function resolveTerminalConnectConfig(): {
  pod: string
  namespace?: string
  container?: string
} | undefined {
  const pod = process.env.NEXT_PUBLIC_TERMINAL_POD?.trim()
  if (!pod) return undefined
  return {
    pod,
    namespace: process.env.NEXT_PUBLIC_TERMINAL_NAMESPACE?.trim() || undefined,
    container: process.env.NEXT_PUBLIC_TERMINAL_CONTAINER?.trim() || undefined,
  }
}

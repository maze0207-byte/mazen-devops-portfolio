/**
 * Resolves the terminal WebSocket URL at runtime (browser) or build time (SSR).
 *
 * Priority:
 * 1. NEXT_PUBLIC_WS_URL — full URL when set and not a localhost build placeholder
 * 2. NEXT_PUBLIC_WS_PATH — same host/path (ingress, e.g. /ws/terminal)
 * 3. NEXT_PUBLIC_TERMINAL_WS_PORT — NodePort on current hostname (default 30400)
 * 4. ws://localhost:4000 — local development fallback
 */

const LOCAL_PLACEHOLDER_HOSTS = ["localhost", "127.0.0.1"]

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
  const nodePort = process.env.NEXT_PUBLIC_TERMINAL_WS_PORT?.trim() ?? "30400"

  if (typeof window === "undefined") {
    return configured && !isLocalPlaceholder(configured)
      ? configured
      : configured ?? "ws://localhost:4000"
  }

  if (configured && !isLocalPlaceholder(configured)) {
    return configured
  }

  if (wsPath) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const path = wsPath.startsWith("/") ? wsPath : `/${wsPath}`
    return `${protocol}//${window.location.host}${path}`
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${window.location.hostname}:${nodePort}`
}

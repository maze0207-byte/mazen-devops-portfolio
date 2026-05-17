/**
 * Example: connect xterm.js to the Kubernetes terminal backend (NodePort 30500).
 *
 * Env (Next.js):
 *   NEXT_PUBLIC_TERMINAL_WS_PORT=30500
 *   NEXT_PUBLIC_TERMINAL_POD=terminal-demo
 *   NEXT_PUBLIC_TERMINAL_NAMESPACE=portfolio
 */

"use client"

import { useCallback, useEffect, useRef } from "react"
import { useTerminalSocket } from "@/hooks/useTerminalSocket"
import { resolveTerminalConnectConfig, resolveTerminalWsUrl } from "@/lib/terminal-ws-url"

export function K8sTerminalExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<import("xterm").Terminal | null>(null)

  const wsUrl = resolveTerminalWsUrl()
  const connect = resolveTerminalConnectConfig()

  const onMessage = useCallback((data: string) => {
    termRef.current?.write(data)
  }, [])

  const { send, sendResize, status, isAttached } = useTerminalSocket(wsUrl, onMessage, {
    connect,
    onAttached: (info) => console.log("Exec session:", info),
  })

  useEffect(() => {
    let disposed = false
    let cleanupResize: (() => void) | undefined

    ;(async () => {
      const { Terminal } = await import("xterm")
      const { FitAddon } = await import("xterm-addon-fit")
      if (!containerRef.current || disposed) return

      const term = new Terminal({ cursorBlink: true, fontSize: 13 })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(containerRef.current)
      fit.fit()
      term.onData(send)
      termRef.current = term

      const ro = new ResizeObserver(() => {
        fit.fit()
        const d = fit.proposeDimensions()
        if (d) sendResize(d.cols, d.rows)
      })
      ro.observe(containerRef.current)
      cleanupResize = () => ro.disconnect()
    })()

    return () => {
      disposed = true
      cleanupResize?.()
      termRef.current?.dispose()
    }
  }, [send, sendResize])

  return (
    <div>
      <p>
        Status: {status}
        {isAttached ? " (pod attached)" : ""}
      </p>
      <div ref={containerRef} style={{ height: 400, background: "#0d1117" }} />
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTerminalSocket } from "@/hooks/useTerminalSocket"
import {
  fetchTerminalDiagnostics,
  fetchTerminalHealth,
  terminalHttpBaseFromWsUrl,
  TerminalDiagnostics,
} from "@/lib/terminal-diagnostics"
import { resolveTerminalConnectConfig, resolveTerminalWsUrl } from "@/lib/terminal-ws-url"
import type { Terminal as XTermTerminal } from "@xterm/xterm"
import type { FitAddon } from "@xterm/addon-fit"

const INITIAL_ROWS = 30
const INITIAL_COLS = 100

export function TerminalWindow({ className }: { className?: string }) {
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const xtermRef = useRef<XTermTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const mountedRef = useRef(false)
  const shellAttachedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [diagnostics, setDiagnostics] = useState<TerminalDiagnostics | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [attachInfo, setAttachInfo] = useState<string | null>(null)

  const wsUrl = useMemo(() => resolveTerminalWsUrl(), [])
  const connectConfig = useMemo(() => resolveTerminalConnectConfig(), [])
  const httpBase = useMemo(() => terminalHttpBaseFromWsUrl(wsUrl), [wsUrl])

  const onMessage = useCallback((data: string) => {
    xtermRef.current?.write(data)
    if (!shellAttachedRef.current && (data.includes("$") || data.includes("#"))) {
      shellAttachedRef.current = true
    }
  }, [])

  const { send, sendResize, status } = useTerminalSocket(wsUrl, onMessage, {
    connect: connectConfig,
    onAttached: (info) => {
      shellAttachedRef.current = true
      setAttachInfo(`${info.namespace}/${info.pod}:${info.container}`)
    },
  })

  const resizeTerminal = useCallback(() => {
    const fitAddon = fitAddonRef.current
    if (!fitAddon) return

    fitAddon.fit()
    const dims = fitAddon.proposeDimensions?.()
    if (dims) {
      sendResize(dims.cols, dims.rows)
    }
  }, [sendResize])

  useEffect(() => {
    let active = true

    const refreshDiagnostics = async () => {
      try {
        const [health, diag] = await Promise.all([
          fetchTerminalHealth(httpBase),
          fetchTerminalDiagnostics(httpBase),
        ])

        if (!active) return

        if (!diag) {
          setBackendError("Terminal backend unreachable.")
          setDiagnostics(null)
          return
        }

        setBackendError(null)
        setDiagnostics({
          ...diag,
          websocket:
            status === "connected" || status === "attached"
              ? "✔ WebSocket connected"
              : "✖ WebSocket not connected",
          podReady:
            health?.status === "ok"
              ? "✔ Pod ready"
              : "✖ Backend unreachable",
        })
      } catch {
        if (!active) return
        setBackendError("Failed to fetch terminal diagnostics.")
        setDiagnostics(null)
      }
    }

    refreshDiagnostics()

    return () => {
      active = false
    }
  }, [httpBase, status])

  useEffect(() => {
    mountedRef.current = true
    let cancel = false
    let resizeObserver: ResizeObserver | null = null
    let terminalElement: HTMLDivElement | null = null

    const initializeTerminal = async () => {
      terminalElement = terminalRef.current
      if (!terminalElement || cancel) return

      const [{ Terminal }, { FitAddon }, webLinksModule] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ])

      if (cancel || !terminalElement) return

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        cols: INITIAL_COLS,
        rows: INITIAL_ROWS,
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#00ff88",
          green: "#3fb950",
          cyan: "#79c0ff",
          yellow: "#e3b341",
          red: "#ff7b72",
        },
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      if (webLinksModule?.WebLinksAddon) {
        try {
          term.loadAddon(new webLinksModule.WebLinksAddon())
        } catch (error) {
          console.warn("Unable to load xterm web links addon", error)
        }
      }

      term.open(terminalElement)
      term.writeln("\x1b[32mMazen DevOps — live cluster terminal\x1b[0m")
      term.writeln(`\x1b[90mEndpoint: ${wsUrl}\x1b[0m`)
      term.writeln("Connecting to sandbox...\r\n")
      fitAddon.fit()

      term.onData((data: string) => send(data))

      xtermRef.current = term
      fitAddonRef.current = fitAddon
      setReady(true)

      resizeObserver = new ResizeObserver(() => {
        resizeTerminal()
      })

      resizeObserver.observe(terminalElement)
      window.addEventListener("resize", resizeTerminal)
    }

    initializeTerminal()

    return () => {
      cancel = true
      mountedRef.current = false
      window.removeEventListener("resize", resizeTerminal)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      xtermRef.current?.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [resizeTerminal, send, wsUrl])

  useEffect(() => {
    if ((status === "connected" || status === "attached") && ready) {
      resizeTerminal()
    }
  }, [ready, resizeTerminal, status])

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#05070b]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
          <span className="inline-flex items-center gap-2">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                status === "connected" || status === "attached"
                  ? "bg-emerald-400"
                  : status === "connecting" || status === "reconnecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
              }`}
            />
            {status}
          </span>
          <span className="hidden sm:inline text-zinc-600 truncate max-w-[200px]" title={wsUrl}>
            {wsUrl.replace(/^wss?:\/\//, "")}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1 bg-white/5 text-emerald-300">
            {attachInfo ?? "K8s Exec"}
          </span>
        </div>
      </div>
      <div className="h-[420px] bg-[#0d1117] text-sm" ref={terminalRef} />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0d1117]/90 text-sm text-zinc-400">
          Initializing terminal...
        </div>
      )}
      {backendError && (
        <div className="border-t border-white/5 bg-[#3b0d0d]/90 px-4 py-2 text-sm text-rose-300">
          {backendError}
        </div>
      )}
      {diagnostics && status !== "connecting" && (
        <div className="border-t border-white/5 bg-[#04060a]/90 px-4 py-2 font-mono text-[10px] text-zinc-500 space-y-0.5">
          {Object.values(diagnostics)
            .filter((value): value is string => typeof value === "string")
            .map((line) => (
              <div key={line}>{line}</div>
            ))}
        </div>
      )}
    </div>
  )
}

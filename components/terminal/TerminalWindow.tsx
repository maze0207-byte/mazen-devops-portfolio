"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTerminalSocket } from "@/hooks/useTerminalSocket"

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000"

export function TerminalWindow({ className }: { className?: string }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting",
  )

  const onMessage = useCallback((data: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(data)
    }
  }, [])

  const { send, status: socketStatus } = useTerminalSocket(DEFAULT_WS_URL, onMessage)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(socketStatus)
  }, [socketStatus])

  useEffect(() => {
    let fitObserver: ResizeObserver | null = null
    let resizeHandler: () => void
    let isMounted = true
    const terminalElement = terminalRef.current

    const initializeTerminal = async () => {
      if (!terminalElement || !isMounted) return

      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
        import("xterm-addon-web-links"),
      ])

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        theme: {
          background: "#0d1117",
          foreground: "#c9d1d9",
          cursor: "#00ff88",
          green: "#3fb950",
          cyan: "#79c0ff",
          yellow: "#e3b341",
          red: "#ff7b72",
        },
        cols: 100,
        rows: 30,
      })

      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()
      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)
      term.open(terminalElement)
      term.writeln("\x1b[32mWelcome to the Mazen DevOps live cluster terminal.\x1b[0m")
      term.writeln("Type \x1b[36mhelp\x1b[0m for available commands or use the shell prompt directly.")
      term.writeln("")
      term.writeln("Connecting to sandbox...\r\n")
      fitAddon.fit()

      term.onData((data: string) => {
        send(data)
      })

      xtermRef.current = term
      fitAddonRef.current = fitAddon
      setReady(true)

      resizeHandler = () => {
        fitAddon.fit()
      }

      if (typeof window.ResizeObserver !== "undefined") {
        fitObserver = new ResizeObserver(() => {
          fitAddon.fit()
        })
        fitObserver.observe(terminalElement)
      }

      window.addEventListener("resize", resizeHandler)
    }

    initializeTerminal()

    return () => {
      isMounted = false
      if (fitObserver && terminalElement) {
        fitObserver.unobserve(terminalElement)
      }
      window.removeEventListener("resize", resizeHandler)
      if (xtermRef.current) {
        xtermRef.current.dispose()
        xtermRef.current = null
      }
    }
  }, [send])

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#05070b]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
          <span className="inline-flex items-center gap-2">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                status === "connected"
                  ? "bg-emerald-400"
                  : status === "connecting"
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            />
            {status}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1 bg-white/5 text-emerald-300">
            Live Cluster
          </span>
        </div>
      </div>
      <div className="h-[420px] bg-[#0d1117] text-sm" ref={terminalRef} />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0d1117]/90 text-sm text-zinc-400">
          Initializing terminal...
        </div>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type TerminalStatus = "connecting" | "connected" | "disconnected" | "reconnecting"

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY_MS = 1000
const HEARTBEAT_INTERVAL_MS = 30_000

export interface UseTerminalSocketOptions {
  onConnected?: () => void
  onDisconnected?: () => void
}

export function useTerminalSocket(
  url: string,
  onMessage: (message: string) => void,
  options?: UseTerminalSocketOptions,
) {
  const [status, setStatus] = useState<TerminalStatus>(() =>
    url ? "connecting" : "disconnected",
  )
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)
  const urlRef = useRef(url)
  const onMessageRef = useRef(onMessage)
  const optionsRef = useRef(options)
  const pendingResizeRef = useRef<{ cols: number; rows: number } | null>(null)

  useEffect(() => {
    urlRef.current = url
    onMessageRef.current = onMessage
    optionsRef.current = options
  }, [url, onMessage, options])

  const flushPendingResize = useCallback(() => {
    const pending = pendingResizeRef.current
    if (!pending || socketRef.current?.readyState !== WebSocket.OPEN) return
    socketRef.current.send(
      JSON.stringify({ type: "resize", cols: pending.cols, rows: pending.rows }),
    )
    console.log("[Terminal] Resize sent (flushed)", pending)
    pendingResizeRef.current = null
  }, [])

  const send = useCallback((payload: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "input", data: payload }))
    } else {
      console.debug("[Terminal] Input dropped — WebSocket not open")
    }
  }, [])

  const sendResize = useCallback((cols: number, rows: number) => {
    pendingResizeRef.current = { cols, rows }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "resize", cols, rows }))
      pendingResizeRef.current = null
      console.log("[Terminal] Resize sent", { cols, rows })
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    function clearTimers() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }

    function startHeartbeat(ws: WebSocket) {
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }))
        }
      }, HEARTBEAT_INTERVAL_MS)
    }

    function connect() {
      if (!urlRef.current || !isMountedRef.current) return

      const wsUrl = urlRef.current
      console.log(
        `[Terminal] WebSocket connect — url=${wsUrl} attempt=${reconnectAttemptRef.current + 1}`,
      )
      setStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting")

      const ws = new WebSocket(wsUrl)
      ws.binaryType = "arraybuffer"
      socketRef.current = ws

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close()
          return
        }
        console.log("[Terminal] WebSocket Connected")
        setStatus("connected")
        reconnectAttemptRef.current = 0
        startHeartbeat(ws)
        flushPendingResize()
        optionsRef.current?.onConnected?.()
      }

      ws.onmessage = (event) => {
        let raw = ""
        if (typeof event.data === "string") {
          raw = event.data
        } else if (event.data instanceof ArrayBuffer) {
          raw = new TextDecoder().decode(event.data)
        } else if (event.data instanceof Blob) {
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === "string") {
              handleParsedMessage(reader.result)
            }
          }
          reader.readAsText(event.data)
          return
        }
        handleParsedMessage(raw)
      }

      ws.onclose = (ev) => {
        console.log(`[Terminal] WebSocket disconnected (code=${ev.code}, reason=${ev.reason})`)
        clearTimers()
        if (!isMountedRef.current) return
        setStatus("disconnected")
        optionsRef.current?.onDisconnected?.()
        attemptReconnect()
      }

      ws.onerror = () => {
        console.error("[Terminal] WebSocket error")
      }
    }

    function handleParsedMessage(raw: string) {
      try {
        const msg = JSON.parse(raw)
        if (msg && typeof msg.type === "string") {
          switch (msg.type) {
            case "output":
            case "system":
              if (msg.data) onMessageRef.current(msg.data)
              return
            case "error":
              if (msg.data) onMessageRef.current(`\x1b[31m${msg.data}\x1b[0m\r\n`)
              return
            case "pong":
              return
          }
        }
      } catch {
        // Not JSON
      }
      onMessageRef.current(raw)
    }

    function attemptReconnect() {
      if (!isMountedRef.current) return
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.log("[Terminal] Max reconnect attempts reached")
        setStatus("disconnected")
        return
      }

      const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptRef.current)
      console.log(
        `[Terminal] Reconnecting in ${delay}ms (${reconnectAttemptRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`,
      )
      setStatus("reconnecting")

      reconnectTimerRef.current = setTimeout(() => {
        reconnectAttemptRef.current += 1
        connect()
      }, delay)
    }

    connect()

    return () => {
      isMountedRef.current = false
      clearTimers()
      if (socketRef.current) {
        socketRef.current.onclose = null
        if (
          socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING
        ) {
          socketRef.current.close()
        }
        socketRef.current = null
      }
    }
  }, [url, flushPendingResize])

  return {
    status,
    send,
    sendResize,
    isConnected: status === "connected",
  }
}

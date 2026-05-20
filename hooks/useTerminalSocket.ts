"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type TerminalStatus = "connecting" | "connected" | "attached" | "disconnected" | "reconnecting"

export interface TerminalConnectConfig {
  pod: string
  namespace?: string
  container?: string
  command?: string[]
}

export interface ExecAttachInfo {
  pod: string
  namespace: string
  container: string
}

export interface UseTerminalSocketOptions {
  connect?: TerminalConnectConfig
  onAttached?: (info: ExecAttachInfo) => void
}

type ServerMessage =
  | { type: "output"; data: string }
  | { type: "system"; data: string }
  | { type: "error"; data: string }
  | { type: "connected"; pod: string; namespace: string; container: string }
  | { type: "pong"; data?: string }
  | { type: string; [key: string]: unknown }

const MAX_RECONNECT_DELAY_MS = 30000
const INITIAL_RECONNECT_DELAY_MS = 1000

export function useTerminalSocket(
  url: string,
  onMessage: (message: string) => void,
  options?: UseTerminalSocketOptions,
) {
  const [status, setStatus] = useState<TerminalStatus>(() =>
    url ? "connecting" : "disconnected",
  )
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const connectConfig = options?.connect
  const onAttached = options?.onAttached
  const connectRef = useRef<(url: string) => void>(() => {})
  const scheduleReconnectRef = useRef<(url: string) => void>(() => {})

  const send = useCallback((payload: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(payload)
    }
  }, [])

  const sendResize = useCallback((cols: number, rows: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "resize", cols, rows }))
    }
  }, [])

  const handleParsedMessage = useCallback(
    (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as ServerMessage
        if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
          onMessage(raw)
          return
        }

        switch (parsed.type) {
          case "output":
          case "system":
            if (typeof parsed.data === "string") {
              onMessage(parsed.data)
            }
            break
          case "error":
            onMessage(`ERROR: ${String(parsed.data)}`)
            break
          case "connected":
            setStatus("attached")
            if (
              onAttached &&
              typeof parsed.pod === "string" &&
              typeof parsed.namespace === "string" &&
              typeof parsed.container === "string"
            ) {
              onAttached({
                pod: parsed.pod,
                namespace: parsed.namespace,
                container: parsed.container,
              })
            }
            break
          default:
            onMessage(raw)
        }
      } catch {
        onMessage(raw)
      }
    },
    [onAttached, onMessage],
  )

  const cleanupSocket = useCallback((disconnect = false) => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.onopen = null
      socketRef.current.onmessage = null
      socketRef.current.onclose = null
      socketRef.current.onerror = null
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, "Client disconnect")
      }
      socketRef.current = null
    }

    if (disconnect) {
      setStatus("disconnected")
    }
  }, [])

  const connect = useCallback(
    (currentUrl: string) => {
      cleanupSocket()
      if (!currentUrl) {
        cleanupSocket(true)
        return
      }

      const ws = new WebSocket(currentUrl)
      ws.binaryType = "arraybuffer"
      socketRef.current = ws
      setStatus("connecting")

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
        setStatus("connected")
        if (connectConfig?.pod) {
          ws.send(JSON.stringify({ type: "connect", ...connectConfig }))
        }
      }

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          handleParsedMessage(event.data)
          return
        }

        if (event.data instanceof ArrayBuffer) {
          handleParsedMessage(new TextDecoder().decode(event.data))
          return
        }

        if (event.data instanceof Blob) {
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === "string") {
              handleParsedMessage(reader.result)
            }
          }
          reader.readAsText(event.data)
        }
      }

      ws.onclose = (event) => {
        if (!shouldReconnectRef.current) {
          cleanupSocket(true)
          return
        }

        if (event.code === 1000) {
          cleanupSocket(true)
          return
        }

        scheduleReconnectRef.current(currentUrl)
      }

      ws.onerror = () => {
        setStatus("disconnected")
      }
    },
    [cleanupSocket, connectConfig, handleParsedMessage],
  )

  const scheduleReconnect = useCallback((urlToConnect: string) => {
    if (!shouldReconnectRef.current) return

    const attempt = reconnectAttemptsRef.current + 1
    reconnectAttemptsRef.current = attempt
    const delay = Math.min(INITIAL_RECONNECT_DELAY_MS * 2 ** (attempt - 1), MAX_RECONNECT_DELAY_MS)

    setStatus("reconnecting")
    reconnectTimerRef.current = window.setTimeout(() => {
      if (shouldReconnectRef.current) {
        connectRef.current(urlToConnect)
      }
    }, delay)
  }, [])

  useEffect(() => {
    connectRef.current = connect
    scheduleReconnectRef.current = scheduleReconnect
  }, [connect, scheduleReconnect])

  useEffect(() => {
    shouldReconnectRef.current = true
    reconnectAttemptsRef.current = 0

    if (url) {
      connect(url)
    } else {
      cleanupSocket(true)
    }

    return () => {
      shouldReconnectRef.current = false
      cleanupSocket()
    }
  }, [cleanupSocket, connect, url])

  return {
    status,
    send,
    sendResize,
    isConnected: status === "connected" || status === "attached",
    isAttached: status === "attached",
  }
}

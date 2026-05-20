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

export function useTerminalSocket(
  url: string,
  onMessage: (message: string) => void,
  options?: UseTerminalSocketOptions,
) {
  const [status, setStatus] = useState<TerminalStatus>(() =>
    url ? "connecting" : "disconnected",
  )
  const socketRef = useRef<WebSocket | null>(null)
  const connectConfig = options?.connect
  const onAttached = options?.onAttached

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

  useEffect(() => {
    if (!url) {
      return
    }

    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    socketRef.current = ws

    ws.onopen = () => {
      setStatus("connected")
      if (connectConfig?.pod) {
        ws.send(JSON.stringify({ type: "connect", ...connectConfig }))
      }
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
          if (typeof reader.result === "string") handleParsedMessage(reader.result)
        }
        reader.readAsText(event.data)
        return
      }
      handleParsedMessage(raw)
    }

    ws.onclose = () => {
      setStatus("disconnected")
    }

    ws.onerror = () => {
      setStatus("disconnected")
    }

    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close()
      }
      socketRef.current = null
    }
  }, [connectConfig, handleParsedMessage, url])

  return {
    status,
    send,
    sendResize,
    isConnected: status === "connected" || status === "attached",
    isAttached: status === "attached",
  }
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type TerminalStatus = "connecting" | "connected" | "disconnected"

export function useTerminalSocket(
  url: string,
  onMessage: (message: string) => void,
  options?: UseTerminalSocketOptions,
) {
  const [status, setStatus] = useState<TerminalStatus>(() =>
    url ? "connecting" : "disconnected",
  )
  const socketRef = useRef<WebSocket | null>(null)

  const send = useCallback((payload: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(payload)
    }
  }, [])

  useEffect(() => {
    if (!url) {
      return
    }

    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    socketRef.current = ws

    ws.onopen = () => {
      setStatus("connected")
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
  }, [url, onMessage])

  return {
    status,
    send,
    sendResize,
    isConnected: status === "connected" || status === "attached",
    isAttached: status === "attached",
  }
}

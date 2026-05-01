"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type TerminalStatus = "connecting" | "connected" | "disconnected"

export function useTerminalSocket(
  url: string,
  onMessage: (message: string) => void,
) {
  const [status, setStatus] = useState<TerminalStatus>("connecting")
  const socketRef = useRef<WebSocket | null>(null)

  const send = useCallback((payload: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(payload)
    }
  }, [])

  useEffect(() => {
    if (!url) {
      setStatus("disconnected")
      return
    }

    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    socketRef.current = ws
    setStatus("connecting")

    ws.onopen = () => {
      setStatus("connected")
    }

    ws.onmessage = (event) => {
      let data = ""
      if (typeof event.data === "string") {
        data = event.data
      } else if (event.data instanceof ArrayBuffer) {
        data = new TextDecoder().decode(event.data)
      } else if (event.data instanceof Blob) {
        const reader = new FileReader()
        reader.onload = () => {
          const text = reader.result
          if (typeof text === "string") {
            onMessage(text)
          }
        }
        reader.readAsText(event.data)
        return
      }
      onMessage(data)
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
    isConnected: status === "connected",
  }
}

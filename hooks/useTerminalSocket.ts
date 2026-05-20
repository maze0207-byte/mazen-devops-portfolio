"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type TerminalStatus = "connecting" | "connected" | "disconnected" | "error"

export function useTerminalSocket(
  url: string,
  onMessage: (message: string) => void,
) {
  const [status, setStatus] = useState<TerminalStatus>(() =>
    url ? "connecting" : "disconnected",
  )
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000 // 1 second

  const connect = useCallback(() => {
    if (!url) {
      setStatus("disconnected")
      return
    }

    console.log(`[v0] Connecting to WebSocket: ${url}`)
    setStatus("connecting")

    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    socketRef.current = ws

    ws.onopen = () => {
      console.log("[v0] WebSocket connected successfully")
      setStatus("connected")
      reconnectAttemptsRef.current = 0
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

    ws.onclose = (event) => {
      console.log(`[v0] WebSocket closed: code=${event.code}, reason=${event.reason}`)
      setStatus("disconnected")

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
        console.log(`[v0] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)
        reconnectAttemptsRef.current += 1
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      } else {
        console.error("[v0] Max reconnection attempts reached")
        setStatus("error")
      }
    }

    ws.onerror = (event) => {
      console.error("[v0] WebSocket error:", event)
      setStatus("error")
    }
  }, [url, onMessage])

  const send = useCallback((payload: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(payload)
    } else {
      console.warn(`[v0] Cannot send message, WebSocket is ${socketRef.current?.readyState}`)
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close()
      }
      socketRef.current = null
    }
  }, [connect])

  return {
    status,
    send,
    isConnected: status === "connected",
  }
}

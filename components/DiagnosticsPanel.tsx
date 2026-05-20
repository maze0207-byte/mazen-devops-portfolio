"use client"

import { useEffect, useState } from "react"

interface HealthStatus {
  status: string
  timestamp: string
}

interface DiagnosticsData {
  status: string
  timestamp: string
  port: number
  activeSessions: number
  maxSessions: number
  sessionTimeout: number
  uptime: number
}

export function DiagnosticsPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendUrl, setBackendUrl] = useState<string>("")

  useEffect(() => {
    // Determine backend URL
    const url = typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "http://localhost:4000"
    
    setBackendUrl(url)

    const checkConnectivity = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check health
        const healthRes = await fetch(`${url}/health`)
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setHealth(healthData)
        }

        // Check diagnostics
        const diagnosticsRes = await fetch(`${url}/diagnostics`)
        if (diagnosticsRes.ok) {
          const diagnosticsData = await diagnosticsRes.json()
          setDiagnostics(diagnosticsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    checkConnectivity()
    
    // Poll every 5 seconds
    const interval = setInterval(checkConnectivity, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Terminal Server Diagnostics</h2>
        
        <div className="space-y-3">
          {/* Backend URL */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Backend URL:</span>
            <code className="bg-gray-800 px-3 py-1 rounded text-green-400 text-sm">{backendUrl}</code>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Connection Status:</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                health ? "bg-green-500" : error ? "bg-red-500" : "bg-yellow-500"
              }`} />
              <span className={
                health ? "text-green-400" : error ? "text-red-400" : "text-yellow-400"
              }>
                {health ? "Connected" : error ? "Error" : "Connecting..."}
              </span>
            </div>
          </div>

          {/* Health Status */}
          {health && (
            <>
              <hr className="border-gray-700" />
              <div className="text-sm">
                <div className="text-gray-400 mb-2">Health Status:</div>
                <div className="bg-gray-800 rounded p-3 space-y-1 text-gray-300">
                  <div>Status: <span className="text-green-400">{health.status}</span></div>
                  <div>Timestamp: <span className="text-gray-400">{new Date(health.timestamp).toLocaleString()}</span></div>
                </div>
              </div>
            </>
          )}

          {/* Diagnostics */}
          {diagnostics && (
            <>
              <hr className="border-gray-700" />
              <div className="text-sm">
                <div className="text-gray-400 mb-2">Server Diagnostics:</div>
                <div className="bg-gray-800 rounded p-3 space-y-1 text-gray-300">
                  <div>Active Sessions: <span className="text-blue-400">{diagnostics.activeSessions}/{diagnostics.maxSessions}</span></div>
                  <div>Session Timeout: <span className="text-blue-400">{diagnostics.sessionTimeout} minutes</span></div>
                  <div>Server Uptime: <span className="text-blue-400">{Math.floor(diagnostics.uptime)}s</span></div>
                  <div>Last Update: <span className="text-gray-400">{new Date(diagnostics.timestamp).toLocaleTimeString()}</span></div>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <>
              <hr className="border-gray-700" />
              <div className="bg-red-900/20 border border-red-700 rounded p-3">
                <div className="text-red-400 text-sm">
                  <div className="font-semibold mb-1">Connection Error:</div>
                  <div>{error}</div>
                </div>
              </div>
            </>
          )}

          {/* Loading */}
          {loading && !health && !error && (
            <div className="text-gray-400 text-sm">Checking connectivity...</div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Troubleshooting</h3>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• If connection fails, verify NodePort 30500 is accessible</li>
          <li>• Check pod status: <code className="bg-gray-800 px-1">kubectl get pods -l app=terminal-server</code></li>
          <li>• View logs: <code className="bg-gray-800 px-1">kubectl logs -f deployment/terminal-server</code></li>
          <li>• Test locally: <code className="bg-gray-800 px-1">kubectl port-forward svc/terminal-server 4000:4000</code></li>
        </ul>
      </div>
    </div>
  )
}

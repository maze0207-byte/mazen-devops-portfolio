"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Terminal as TerminalIcon,
  Server,
  Database,
  Cloud,
  ArrowLeft,
  Circle,
  Wifi,
  WifiOff,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Trash2,
} from "lucide-react"

interface TerminalLine {
  id: number
  type: "input" | "output" | "error" | "system"
  content: string
  timestamp?: string
}

interface ConnectionStatus {
  status: string
  clusterConnected: boolean
  mode: "live" | "demo"
  timestamp: string
}

export default function TestInfrastructurePage() {
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { id: 1, type: "system", content: "DevOps Terminal v2.0 - Infrastructure Testing Environment", timestamp: new Date().toISOString() },
    { id: 2, type: "system", content: "Type 'help' for available commands", timestamp: new Date().toISOString() },
    { id: 3, type: "system", content: "─".repeat(60), timestamp: new Date().toISOString() },
  ])
  const [currentInput, setCurrentInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lineIdRef = useRef(3)

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/terminal")
      const data = await response.json()
      setConnectionStatus(data)
    } catch {
      setConnectionStatus({
        status: "error",
        clusterConnected: false,
        mode: "demo",
        timestamp: new Date().toISOString(),
      })
    }
  }, [])

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [checkConnectionStatus])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  // Focus input on click
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus()
    const terminal = terminalRef.current
    terminal?.addEventListener("click", handleClick)
    return () => terminal?.removeEventListener("click", handleClick)
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch("/api/terminal")
      const data = await response.json()
      setConnectionStatus(data)
    } catch {
      setConnectionStatus({
        status: "error",
        clusterConnected: false,
        mode: "demo",
        timestamp: new Date().toISOString(),
      })
    }
  }

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    lineIdRef.current += 1
    setLines(prev => [...prev, {
      id: lineIdRef.current,
      type,
      content,
      timestamp: new Date().toISOString(),
    }])
  }, [])

  const executeCommand = async (command: string) => {
    if (!command.trim()) return

    // Add command to display
    addLine("input", command)
    
    // Add to history
    setCommandHistory(prev => [...prev, command])
    setHistoryIndex(-1)

    // Handle local commands
    if (command.trim().toLowerCase() === "clear") {
      setLines([])
      addLine("system", "Terminal cleared")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      })

      const data = await response.json()
      
      if (data.output === "__CLEAR__") {
        setLines([])
        addLine("system", "Terminal cleared")
      } else if (data.exitCode === 0) {
        addLine("output", data.output)
      } else {
        addLine("error", data.output)
      }
    } catch {
      addLine("error", "Failed to execute command. Check your connection.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isProcessing) {
      executeCommand(currentInput)
      setCurrentInput("")
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistory.length - 1 
          : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setCurrentInput(commandHistory[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setCurrentInput("")
        } else {
          setHistoryIndex(newIndex)
          setCurrentInput(commandHistory[newIndex])
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault()
      // Basic tab completion
      const suggestions = ["kubectl", "docker", "terraform", "help", "clear"]
      const match = suggestions.find(s => s.startsWith(currentInput))
      if (match) setCurrentInput(match + " ")
    }
  }

  const copyToClipboard = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const quickCommands = [
    { label: "Get Pods", cmd: "kubectl get pods", icon: Server },
    { label: "Get Nodes", cmd: "kubectl get nodes", icon: Cloud },
    { label: "Docker PS", cmd: "docker ps", icon: Database },
    { label: "TF State", cmd: "terraform state list", icon: TerminalIcon },
  ]

  return (
    <div className={`min-h-screen bg-[#0a0a0f] text-white ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">Back to Portfolio</span>
              </Link>
              <div className="h-6 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <TerminalIcon size={16} className="text-white" />
                </div>
                <span className="font-semibold">Test Infrastructure</span>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700">
                {connectionStatus?.clusterConnected ? (
                  <>
                    <Wifi size={14} className="text-green-400" />
                    <span className="text-xs text-green-400">Live Cluster</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={14} className="text-yellow-400" />
                    <span className="text-xs text-yellow-400">Demo Mode</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Info Banner */}
        {!connectionStatus?.clusterConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
          >
            <p className="text-sm text-yellow-200">
              <strong>Demo Mode:</strong> Running with simulated cluster responses. 
              To connect to a real cluster, configure the environment variables (CLUSTER_API_URL, CLUSTER_TOKEN).
            </p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Quick Commands */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Quick Commands</h3>
              <div className="space-y-2">
                {quickCommands.map((item) => (
                  <button
                    key={item.cmd}
                    onClick={() => {
                      executeCommand(item.cmd)
                    }}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all text-left group disabled:opacity-50"
                  >
                    <item.icon size={16} className="text-cyan-400" />
                    <span className="text-sm text-zinc-300 group-hover:text-white">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Command Categories</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-blue-400">
                  <Circle size={8} className="fill-current" />
                  <span>kubectl</span>
                  <span className="text-zinc-500 text-xs">Kubernetes</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-400">
                  <Circle size={8} className="fill-current" />
                  <span>docker</span>
                  <span className="text-zinc-500 text-xs">Containers</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Circle size={8} className="fill-current" />
                  <span>terraform</span>
                  <span className="text-zinc-500 text-xs">IaC</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Previous command</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">↑</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Next command</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">↓</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Tab completion</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">Tab</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Execute</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">Enter</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="lg:col-span-3">
            <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0d12]">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    devops@k8s-cluster:~
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setLines([])
                      addLine("system", "Terminal cleared")
                    }}
                    className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Clear terminal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Terminal Body */}
              <div
                ref={terminalRef}
                className="h-[500px] overflow-y-auto p-4 font-mono text-sm"
              >
                <AnimatePresence>
                  {lines.map((line) => (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group relative"
                    >
                      {line.type === "input" ? (
                        <div className="flex items-start gap-2 py-1">
                          <span className="text-green-400 select-none">
                            <ChevronRight size={14} className="inline" />
                          </span>
                          <span className="text-cyan-300">{line.content}</span>
                        </div>
                      ) : line.type === "output" ? (
                        <div className="py-1 pl-5 text-zinc-300 whitespace-pre-wrap relative">
                          {line.content}
                          <button
                            onClick={() => copyToClipboard(line.content, line.id)}
                            className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-zinc-300"
                          >
                            {copiedId === line.id ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      ) : line.type === "error" ? (
                        <div className="py-1 pl-5 text-red-400 whitespace-pre-wrap">
                          {line.content}
                        </div>
                      ) : (
                        <div className="py-1 text-zinc-500 italic whitespace-pre-wrap">
                          {line.content}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Input Line */}
                <div className="flex items-center gap-2 py-1">
                  <span className="text-green-400 select-none">
                    {isProcessing ? (
                      <Loader2 size={14} className="inline animate-spin" />
                    ) : (
                      <ChevronRight size={14} className="inline" />
                    )}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isProcessing}
                    className="flex-1 bg-transparent outline-none text-cyan-300 caret-cyan-400 disabled:opacity-50"
                    placeholder={isProcessing ? "Executing..." : "Type a command..."}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Command History */}
            {commandHistory.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800">
                <h4 className="text-xs font-semibold text-zinc-500 mb-2">Recent Commands</h4>
                <div className="flex flex-wrap gap-2">
                  {commandHistory.slice(-8).map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => executeCommand(cmd)}
                      disabled={isProcessing}
                      className="px-2 py-1 text-xs font-mono bg-zinc-800/50 hover:bg-zinc-700/50 rounded border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"

type TerminalLine = {
  type: "prompt" | "output" | "error" | "success" | "info"
  content: string
}

const LOCAL_COMMANDS: Record<string, string> = {
  help: `
Available Commands:
────────────────────────────────────────────────────
  whoami              Current user
  about               About Mazen Ahmed
  skills              List DevOps skills
  contact             Contact information
  projects            View projects list
  stack               View tech stack
  clear               Clear the terminal
────────────────────────────────────────────────────`,
  about: `
Mazen Ahmed — Mid DevOps Engineer
────────────────────────────────────────
Location   : Cairo, Egypt
Experience : 1-2 years Cloud & DevOps
Stack      : AWS · Terraform · Docker · Kubernetes
GitHub     : github.com/maze0207
Focus      : IaC, CI/CD, Monitoring, K8s
Status     : Open to opportunities`,
  whoami: "mazen",
  skills: `
DevOps & Cloud Skills:
────────────────────────────────────────
▸ AWS (EC2, EKS, RDS, S3, VPC, IAM)
▸ Terraform (IaC, Modules, Workspaces)
▸ Docker & Docker Compose
▸ Kubernetes (EKS, Helm)
▸ CI/CD (GitHub Actions, Jenkins, ArgoCD)
▸ Monitoring (Prometheus, Grafana, ELK)
▸ Linux Administration (Ubuntu, RHEL)
▸ Bash & Python Scripting`,
  contact: `
Contact Information:
────────────────────────────────────────
Email    : mazenahmed02071@gmail.com
GitHub   : github.com/maze0207
Location : Cairo, Egypt
Status   : Open to work`,
  projects: `
Featured Projects:
────────────────────────────────────────
▸ Multi-Region EKS Infrastructure
▸ Zero-Downtime CI/CD Pipeline
▸ Full Observability Stack
▸ Reusable Terraform Module Library
▸ Local Dev Environment Automation
▸ GitOps Cluster Management

View all: github.com/maze0207`,
  stack: `
Tech Stack:
────────────────────────────────────────
Cloud      : AWS
IaC        : Terraform, CloudFormation
Containers : Docker, Kubernetes
CI/CD      : GitHub Actions, Jenkins, ArgoCD
Monitoring : Prometheus, Grafana, ELK
OS         : Linux (Ubuntu, RHEL)
Scripting  : Bash, Python`,
}

export function Terminal() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "info", content: "DevOps Infrastructure Terminal v1.0" },
    { type: "output", content: 'Welcome! Type "help" to see available commands.' },
    { type: "output", content: "" },
  ])
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [lines])

  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase()
    
    // Add to history
    if (trimmedCmd) {
      setHistory((prev) => [trimmedCmd, ...prev])
      setHistoryIndex(-1)
    }

    // Add prompt line
    setLines((prev) => [
      ...prev,
      { type: "prompt", content: cmd },
    ])

    if (!trimmedCmd) return

    if (trimmedCmd === "clear") {
      setLines([
        { type: "info", content: "DevOps Infrastructure Terminal v1.0" },
        { type: "output", content: 'Type "help" to see available commands.' },
        { type: "output", content: "" },
      ])
      return
    }

    const output = LOCAL_COMMANDS[trimmedCmd]
    if (output) {
      output.split("\n").forEach((line) => {
        setLines((prev) => [...prev, { type: "output", content: line }])
      })
    } else {
      setLines((prev) => [
        ...prev,
        { type: "error", content: `bash: ${trimmedCmd}: command not found` },
        { type: "output", content: 'Type "help" for available commands.' },
      ])
    }
    setLines((prev) => [...prev, { type: "output", content: "" }])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(input)
      setInput("")
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      } else {
        setHistoryIndex(-1)
        setInput("")
      }
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <section className="relative py-24 bg-zinc-900/30">
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-wider">04 / INFRA LAB</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white">
            Interactive Terminal
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl">
            Try the commands: <code className="px-2 py-1 rounded bg-zinc-800 text-cyan-400 text-sm">help</code>, 
            <code className="px-2 py-1 ml-2 rounded bg-zinc-800 text-cyan-400 text-sm">about</code>, 
            <code className="px-2 py-1 ml-2 rounded bg-zinc-800 text-cyan-400 text-sm">skills</code>, 
            <code className="px-2 py-1 ml-2 rounded bg-zinc-800 text-cyan-400 text-sm">projects</code>
          </p>
        </motion.div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0d12]"
          onClick={() => inputRef.current?.focus()}
        >
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="ml-auto font-mono text-xs text-zinc-500">
              mazen@devops-lab:~ <span className="text-green-500">● LIVE</span>
            </span>
          </div>

          {/* Terminal Output */}
          <div
            ref={outputRef}
            className="p-4 h-80 overflow-y-auto font-mono text-sm"
          >
            {lines.map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line.type === "prompt" ? (
                  <div>
                    <span className="text-cyan-400">mazen@devops-lab:~$ </span>
                    <span className="text-zinc-300">{line.content}</span>
                  </div>
                ) : line.type === "error" ? (
                  <div className="text-red-400">{line.content}</div>
                ) : line.type === "success" ? (
                  <div className="text-green-400">{line.content}</div>
                ) : line.type === "info" ? (
                  <div className="text-blue-400">{line.content}</div>
                ) : (
                  <div className="text-zinc-400 whitespace-pre-wrap">{line.content}</div>
                )}
              </div>
            ))}

            {/* Input Line */}
            <div className="flex items-center">
              <span className="text-cyan-400">mazen@devops-lab:~$ </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-zinc-300 caret-cyan-400 ml-1"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Hint */}
          <div className="px-4 py-2 border-t border-zinc-800/50 font-mono text-xs text-zinc-600">
            ↑↓ history • Ctrl+L clear
          </div>
        </motion.div>
      </div>
    </section>
  )
}

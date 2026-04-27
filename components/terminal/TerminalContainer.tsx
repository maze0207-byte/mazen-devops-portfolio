"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { TerminalWindow } from "@/components/terminal/TerminalWindow"

export default function TerminalContainer() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#090b12] shadow-2xl shadow-cyan-500/5 overflow-hidden">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between bg-[#04060a]/80 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-zinc-400 font-medium uppercase tracking-[0.3em]">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_0_8px_rgba(52,211,153,0.05)]" />
            Live Cluster
          </span>
          <span className="font-mono text-xs text-zinc-500">visitor@mazen-cluster:~$</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          {isOpen ? "Minimize" : "Open Terminal"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="terminal-open"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-4">
              <TerminalWindow className="rounded-[1.5rem] border border-white/5 bg-[#0d1117]" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="terminal-closed"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="px-5 py-6"
          >
            <p className="text-sm text-zinc-400">
              Click the button above to connect to the live Kubernetes sandbox. The session is read-only and safe.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

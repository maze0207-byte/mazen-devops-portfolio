"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import TerminalContainer from "@/components/terminal/TerminalContainer"

export function Terminal() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-120px" })

  return (
    <section ref={ref} className="relative py-24 bg-[#080a0f]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-10"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-[0.3em] uppercase">
            testlab
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white">
            Try the live cluster
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400 leading-relaxed">
            Connect to a real K8s cluster. Read-only. Safe. Run <code className="rounded bg-white/5 px-2 py-1 text-cyan-300">help</code> to see available commands.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.15 }}
        >
          <TerminalContainer />
        </motion.div>
      </div>
    </section>
  )
}

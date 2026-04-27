"use client"

import dynamic from "next/dynamic"

const Terminal = dynamic(() => import("@/components/portfolio/terminal"), {
  ssr: false,
})

export function TerminalWrapper() {
  return <Terminal />
}

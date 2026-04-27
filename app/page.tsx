import dynamic from "next/dynamic"
import { Navigation } from "@/components/portfolio/navigation"
import { Hero } from "@/components/portfolio/hero"
import { About } from "@/components/portfolio/about"
import { Skills } from "@/components/portfolio/skills"
import { Projects } from "@/components/portfolio/projects"
import { Contact } from "@/components/portfolio/contact"
import { Footer } from "@/components/portfolio/footer"

const Terminal = dynamic(() => import("@/components/portfolio/terminal"), {
  ssr: false,
})

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <Navigation />
      <Hero />
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <About />
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <Skills />
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <Projects />
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <Terminal />
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      <Contact />
      <Footer />
    </main>
  )
}

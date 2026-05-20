"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Mail, Github, Linkedin, MapPin, ArrowUpRight } from "lucide-react"

const contactLinks = [
  {
    icon: Mail,
    label: "Email",
    value: "mazenahmed0205@gmail.com",
    href: "mailto:mazenahmed0205@gmail.com",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Github,
    label: "GitHub",
    value: "github.com/maze0207-byte",
    href: "https://github.com/maze0207-byte",
    color: "from-zinc-500 to-zinc-600",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "linkedin.com/in/mazen-ahmed-b591b5376",
    href: "https://www.linkedin.com/in/mazen-ahmed-b591b5376",
    color: "from-blue-600 to-blue-700",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Cairo, Egypt",
    href: null,
    color: "from-emerald-500 to-emerald-600",
  },
]

export function Contact() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="contact" className="relative py-24 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-wider">05 / CONTACT</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white">
            Let&apos;s work together
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl">
            Open to DevOps roles, freelance infrastructure projects, and collaborations. 
            Reach out via any channel below.
          </p>
        </motion.div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {contactLinks.map((link, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
            >
              {link.href ? (
                <a
                  href={link.href}
                  target={link.href.startsWith("mailto") ? undefined : "_blank"}
                  rel={link.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                  className="group flex items-center gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all"
                >
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color}`}>
                    <link.icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider mb-1">
                      {link.label}
                    </div>
                    <div className="text-cyan-400 group-hover:text-cyan-300 transition-colors">
                      {link.value}
                    </div>
                  </div>
                  <ArrowUpRight size={18} className="text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                </a>
              ) : (
                <div className="flex items-center gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color}`}>
                    <link.icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider mb-1">
                      {link.label}
                    </div>
                    <div className="text-zinc-300">{link.value}</div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-zinc-500 mb-6">Ready to build something great?</p>
          <a
            href="mailto:mazenahmed0205@gmail.com"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <Mail size={18} />
            Send me an email
          </a>
        </motion.div>
      </div>
    </section>
  )
}

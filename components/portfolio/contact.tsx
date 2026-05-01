"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef, useState } from "react"
import { Mail, Github, Linkedin, MapPin, ArrowUpRight, Send, User, MessageSquare, CheckCircle2, Loader2 } from "lucide-react"

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
  const [formData, setFormData] = useState({ name: "", email: "", topic: "portfolio", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate API call to send message
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setFormData({ name: "", email: "", topic: "portfolio", message: "" })
      setTimeout(() => setIsSubmitted(false), 5000)
    }, 1500)
  }

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

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
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
                      className="group flex items-center gap-4 p-5 rounded-xl bg-[#0f1016] border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all"
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
                    <div className="flex items-center gap-4 p-5 rounded-xl bg-[#0f1016] border border-white/5">
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
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-cyan-500/20 text-center"
            >
              <p className="text-zinc-400 mb-4 text-sm">Prefer direct email?</p>
              <a
                href="mailto:mazenahmed0205@gmail.com"
                className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                <Mail size={18} />
                Send an email
              </a>
            </motion.div>
          </div>

          {/* Right Column: Message Box Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-3 bg-[#0f1016] border border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -z-10" />

            <h3 className="text-2xl font-bold text-white mb-2">Send a Message</h3>
            <p className="text-zinc-400 mb-8 text-sm">
              Have feedback on my portfolio or the Kubernetes test lab? Let me know!
            </p>

            {isSubmitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h4 className="text-xl font-medium text-white mb-2">Message Sent!</h4>
                <p className="text-zinc-400">Thanks for your feedback. I&apos;ll get back to you soon.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <User size={14} /> Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <Mail size={14} /> Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Topic Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <MessageSquare size={14} /> Topic
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, topic: "portfolio" })}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.topic === "portfolio"
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                          : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/10"
                      }`}
                    >
                      Portfolio Feedback
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, topic: "cluster" })}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.topic === "cluster"
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/10"
                      }`}
                    >
                      K8s Cluster / Lab
                    </button>
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <MessageSquare size={14} /> Message
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write your message here..."
                    rows={4}
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative group overflow-hidden rounded-xl bg-zinc-800 disabled:opacity-70 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="relative px-6 py-4 flex items-center justify-center gap-2 text-white font-medium">
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Message
                      </>
                    )}
                  </div>
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

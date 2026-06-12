"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

interface FormState {
  name: string
  email: string
  message: string
}

interface ResponseState {
  type: "success" | "error" | null
  message: string
}

// Configure this to match your backend server URL
const BACKEND_URL = process.env.NEXT_PUBLIC_CONTACT_SERVER_URL || "http://localhost:3001"

export function LetsTalk() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    message: "",
  })
  
  const [response, setResponse] = useState<ResponseState>({
    type: null,
    message: "",
  })
  
  const [loading, setLoading] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleReset = () => {
    setForm({ name: "", email: "", message: "" })
    setResponse({ type: null, message: "" })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResponse({ type: null, message: "" })

    try {
      const res = await fetch(`${BACKEND_URL}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok) {
        setResponse({
          type: "success",
          message: "Message sent successfully! I'll get back to you soon.",
        })
        handleReset()
      } else {
        setResponse({
          type: "error",
          message: data.error || "Failed to send message. Please try again.",
        })
      }
    } catch (error) {
      setResponse({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="lets-talk" className="relative py-24 bg-[#0a0a0f]">
      <div className="max-w-2xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-wider">
            LET&apos;S TALK
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white">
            Send me a message
          </h2>
          <p className="mt-4 text-zinc-400">
            Have a project in mind or want to discuss DevOps strategies? Drop me a line below!
          </p>
        </motion.div>

        {/* Contact Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-5"
        >
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-mono text-zinc-300 mb-2">
              Your Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-mono text-zinc-300 mb-2">
              Your Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleInputChange}
              placeholder="john@example.com"
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Message Field */}
          <div>
            <label htmlFor="message" className="block text-sm font-mono text-zinc-300 mb-2">
              Your Message *
            </label>
            <textarea
              id="message"
              name="message"
              required
              value={form.message}
              onChange={handleInputChange}
              placeholder="Tell me about your project or idea..."
              rows={5}
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
            />
          </div>

          {/* Response Message */}
          {response.type && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                response.type === "success"
                  ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-300"
                  : "bg-red-900/20 border-red-500/30 text-red-300"
              }`}
            >
              {response.message}
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-zinc-600 disabled:to-zinc-600 disabled:cursor-not-allowed text-white font-mono font-semibold rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-950 disabled:cursor-not-allowed border border-zinc-700 hover:border-zinc-600 disabled:border-zinc-800 text-zinc-300 hover:text-white disabled:text-zinc-600 font-mono font-semibold rounded-lg transition-all"
            >
              Reset
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  )
}

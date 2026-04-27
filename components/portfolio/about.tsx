"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { MapPin, Briefcase, Github, Mail, CheckCircle2 } from "lucide-react"

const highlights = [
  { icon: "☁️", title: "AWS", desc: "Primary Cloud" },
  { icon: "⎈", title: "K8s", desc: "Container Orchestration" },
  { icon: "🏗️", title: "IaC", desc: "Terraform / GitOps" },
  { icon: "🔄", title: "CI/CD", desc: "Pipeline Automation" },
]

const details = [
  { icon: MapPin, label: "Location", value: "Cairo, Egypt" },
  { icon: Briefcase, label: "Experience", value: "1-2 Years DevOps & Cloud" },
  { icon: Github, label: "GitHub", value: "github.com/maze0207", href: "https://github.com/maze0207" },
  { icon: Mail, label: "Email", value: "mazenahmed02071@gmail.com", href: "mailto:mazenahmed02071@gmail.com" },
]

export function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="about" className="relative py-24 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-wider">01 / ABOUT ME</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white text-balance">
            Building the backbone
            <br />
            of modern software
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 space-y-6"
          >
            <p className="text-zinc-400 leading-relaxed">
              I&apos;m <span className="text-white font-medium">Mazen Ahmed</span>, a passionate DevOps Engineer 
              based in Cairo, Egypt with 1-2 years of hands-on experience designing and automating 
              cloud infrastructure. I specialize in bridging the gap between development and operations — 
              making deployments faster, more reliable, and fully automated.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              My core stack revolves around <span className="text-blue-400">AWS</span> for cloud infrastructure, 
              <span className="text-cyan-400"> Terraform</span> for infrastructure as code, 
              <span className="text-blue-400"> Docker</span> for containerization, and 
              <span className="text-cyan-400"> Kubernetes</span> for orchestration. I&apos;m deeply passionate 
              about CI/CD pipelines, GitOps practices, and full observability.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              I believe in infrastructure that documents itself, pipelines that deploy themselves, 
              and systems that heal themselves. Currently working toward AWS Solutions Architect 
              and CKA certifications to deepen my cloud-native expertise.
            </p>

            {/* Details List */}
            <div className="pt-6 space-y-4">
              {details.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4 py-3 border-b border-zinc-800/50"
                >
                  <item.icon size={16} className="text-zinc-600" />
                  <span className="text-sm text-zinc-500 w-24">{item.label}</span>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-zinc-300">{item.value}</span>
                  )}
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="flex items-center gap-4 py-3"
              >
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-sm text-zinc-500 w-24">Status</span>
                <span className="text-emerald-400">Open to work</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-2 gap-4">
              {highlights.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                  className="group p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <div className="font-mono text-xl font-bold text-white">{item.title}</div>
                  <div className="mt-1 text-sm text-zinc-500">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

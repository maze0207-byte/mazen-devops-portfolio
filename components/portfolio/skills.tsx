"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

const skillCategories = [
  {
    title: "Cloud Platforms",
    icon: "☁️",
    color: "from-blue-500 to-blue-600",
    skills: [
      { name: "AWS (EC2, EKS, RDS, S3)", level: 80 },
      { name: "VPC / IAM / Route53", level: 75 },
      { name: "CloudWatch / CloudTrail", level: 68 },
    ],
  },
  {
    title: "Infrastructure as Code",
    icon: "🏗️",
    color: "from-cyan-500 to-cyan-600",
    skills: [
      { name: "Terraform", level: 82 },
      { name: "Terraform Modules", level: 74 },
      { name: "Remote State / Workspaces", level: 66 },
    ],
  },
  {
    title: "Containers & Orchestration",
    icon: "🐳",
    color: "from-blue-400 to-cyan-500",
    skills: [
      { name: "Docker / Compose", level: 85 },
      { name: "Kubernetes (EKS)", level: 75 },
      { name: "Helm Charts", level: 60 },
    ],
  },
  {
    title: "CI/CD & Automation",
    icon: "🔄",
    color: "from-emerald-500 to-emerald-600",
    skills: [
      { name: "GitHub Actions", level: 82 },
      { name: "Jenkins", level: 65 },
      { name: "ArgoCD / GitOps", level: 56 },
    ],
  },
  {
    title: "Monitoring & Observability",
    icon: "📊",
    color: "from-orange-500 to-orange-600",
    skills: [
      { name: "Prometheus", level: 72 },
      { name: "Grafana", level: 74 },
      { name: "ELK Stack", level: 58 },
    ],
  },
  {
    title: "OS & Scripting",
    icon: "🐧",
    color: "from-zinc-500 to-zinc-600",
    skills: [
      { name: "Linux (Ubuntu / RHEL)", level: 86 },
      { name: "Bash Scripting", level: 78 },
      { name: "Python (Automation)", level: 58 },
    ],
  },
]

const certifications = [
  "AWS Solutions Architect – Associate (pursuing)",
  "Certified Kubernetes Administrator – CKA (pursuing)",
  "HashiCorp Terraform Associate (pursuing)",
]

export function Skills() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="skills" className="relative py-24 bg-zinc-900/30">
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-wider">02 / SKILLS & TOOLS</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white">
            Tech stack & expertise
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl">
            Tools and platforms I use daily to build, deploy, and monitor production-grade cloud infrastructure.
          </p>
        </motion.div>

        {/* Skills Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillCategories.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + categoryIndex * 0.1 }}
              className="group p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">{category.icon}</span>
                <h3 className="font-mono text-sm text-zinc-400 uppercase tracking-wider">
                  {category.title}
                </h3>
              </div>
              <div className="space-y-4">
                {category.skills.map((skill, skillIndex) => (
                  <div key={skillIndex}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-zinc-300">{skill.name}</span>
                      <span className="font-mono text-xs text-zinc-500">{skill.level}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${skill.level}%` } : {}}
                        transition={{ duration: 1, delay: 0.5 + skillIndex * 0.1 }}
                        className={`h-full rounded-full bg-gradient-to-r ${category.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12"
        >
          <h3 className="font-mono text-sm text-zinc-500 uppercase tracking-wider mb-4">
            Certifications in Progress
          </h3>
          <div className="flex flex-wrap gap-3">
            {certifications.map((cert, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-mono"
              >
                <span className="text-blue-400">▸</span>
                {cert}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

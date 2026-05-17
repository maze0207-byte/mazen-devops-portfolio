"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { ExternalLink, Github } from "lucide-react"

const projects = [
  {
    icon: "🏗️",
    title: "Multi-Region EKS Infrastructure",
    description: "Production-grade AWS EKS cluster with Terraform modules. Includes VPC, private subnets, IAM roles, managed node groups with auto-scaling, and multi-AZ failover strategy.",
    tags: ["Terraform", "AWS EKS", "VPC", "IAM", "Auto-scaling"],
    github: "https://github.com/maze0207/aws-eks-terraform",
  },
  {
    icon: "🚀",
    title: "Zero-Downtime CI/CD Pipeline",
    description: "End-to-end GitHub Actions pipeline: build Docker images → push to ECR → test → deploy to EKS with rolling updates and automatic rollback on failure. GitOps-driven with ArgoCD.",
    tags: ["GitHub Actions", "Docker", "ECR", "ArgoCD", "EKS"],
    github: "https://github.com/maze0207/cicd-pipeline-k8s",
  },
  {
    icon: "📊",
    title: "Full Observability Stack",
    description: "Prometheus + Grafana + Alertmanager on Kubernetes via Helm. Custom dashboards for system metrics, SLO tracking, and PagerDuty/Slack alert routing.",
    tags: ["Prometheus", "Grafana","loki", "Alertmanager", "Slack"],
    github: "https://github.com/maze0207/observability-stack",
  },
  {
    icon: "🔐",
    title: "Reusable Terraform Module Library",
    description: "Library of Terraform modules for common AWS patterns: VPC, ECS clusters, RDS with encryption, S3 lifecycle policies, WAF, and secrets via SSM Parameter Store.",
    tags: ["Terraform", "AWS RDS", "S3", "WAF", "ECS"],
    github: "https://github.com/maze0207/terraform-modules",
  },
  {
    icon: "📦",
    title: "Local Dev Environment Automation",
    description: "Docker Compose stacks mirroring production: PostgreSQL, Redis, Nginx, and mock AWS services via LocalStack. One command to spin up the full dev environment.",
    tags: ["Docker Compose", "LocalStack", "Nginx", "Redis", "PostgreSQL"],
    github: "https://github.com/maze0207/docker-compose-stacks",
  },
  {
    icon: "🔄",
    title: "GitOps Cluster Management",
    description: "App-of-apps GitOps pattern with ArgoCD: automated cluster sync, image updater, RBAC policies, and real-time Slack notifications on every deployment event.",
    tags: ["ArgoCD", "GitOps", "Kubernetes", "RBAC", "Slack"],
    github: "https://github.com/maze0207/k8s-gitops",
  },
]

export function Projects() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="projects" className="relative py-24 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-6" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="font-mono text-sm text-cyan-400 tracking-wider">03 / PROJECTS</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white">
            What I&apos;ve built
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl">
            Infrastructure and automation projects showcasing real-world DevOps practices on AWS.
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              className="group relative flex flex-col p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-blue-500/30 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{project.icon}</span>
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs font-mono hover:text-cyan-400 hover:bg-zinc-800 transition-all"
                >
                  <Github size={14} />
                  <span>Code</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-blue-400 transition-colors">
                {project.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed flex-grow mb-4">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-auto">
                {project.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* View More */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 text-center"
        >
          <a
            href="https://github.com/maze0207"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <Github size={18} />
            <span>View more on GitHub</span>
            <ExternalLink size={14} />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

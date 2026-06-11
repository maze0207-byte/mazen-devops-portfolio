<img width="1536" height="1024" alt="ChatGPT Image Jun 11, 2026, 08_38_57 PM" src="https://github.com/user-attachments/assets/b039e80f-b623-4c67-af4d-7ddd6249c6dc" /># Kubernetes GitOps Platform

A production-style Kubernetes GitOps platform built on Rocky Linux, demonstrating automated CI/CD, GitOps deployment, and full observability stack.

---

## Architecture Overview

This platform is built around a GitOps-driven workflow where all changes are version-controlled and automatically deployed to Kubernetes using ArgoCD.

Key components:

- GitHub → Source control for application and Kubernetes manifests
- GitHub Actions → CI pipeline (build & validate)
- ArgoCD → GitOps continuous deployment
- Kubernetes → Container orchestration layer
- NGINX Ingress Controller → Traffic routing & SSL termination
- Cloudflare → DNS, CDN, and security layer
- Prometheus → Metrics collection
- Grafana → Monitoring dashboards
- Loki → Centralized logging

---

## GitOps Workflow

1. Developer pushes code to GitHub
2. GitHub Actions builds and validates the application
3. Kubernetes manifests are updated in the repository
4. ArgoCD detects changes automatically
5. Cluster is synchronized to desired state
6. Application is deployed to Kubernetes
7. Prometheus collects metrics
8. Grafana visualizes system performance
9. Loki centralizes logs

---

## Tech Stack

- Kubernetes
- Rocky Linux
- Docker
- GitHub Actions
- ArgoCD
- NGINX Ingress Controller
- Prometheus
- Grafana
- Loki
- Cloudflare

---

## Project Structure

```bash
.
├── manifests/              # Kubernetes YAML files
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
│
├── monitoring/             # Observability stack
│   ├── prometheus/
│   ├── grafana/
│   └── loki/
│
├── .github/workflows/     # CI/CD pipelines
│
└── README.md<img width="1536" height="1024" alt="ChatGPT Image Jun 11, 2026, 08_38_57 PM" src="https://github.com/user-attachments/assets/4899654e-9e5a-4409-a99a-28434baf71a1" />

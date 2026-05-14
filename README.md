# Mazen's DevOps Portfolio

A modern, interactive DevOps portfolio website built with Next.js, featuring a live terminal sandbox for demonstrating DevOps skills and tools.

## 🚀 Features

- **Interactive Portfolio**: Clean, dark-themed portfolio showcasing DevOps expertise
- **Live Terminal Sandbox**: Real-time terminal sessions in Docker containers for safe command execution
- **Responsive Design**: Mobile-first design using Tailwind CSS and Radix UI components
- **Modern Tech Stack**: Built with Next.js 16, TypeScript, and cutting-edge React patterns
- **Containerized Deployment**: Full Docker and Kubernetes support for production deployment
- **Feedback System**: Integrated feedback collection for user interactions

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations and transitions
- **Lucide React** - Beautiful icons

### Backend & Infrastructure
- **Node.js** - Runtime for terminal server
- **Docker** - Containerization for sandbox environments
- **WebSocket** - Real-time terminal communication
- **Kubernetes** - Orchestration for production deployment

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **pnpm** - Fast package manager

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── feedback/      # Feedback submission endpoint
│   │   └── terminal/      # Terminal WebSocket proxy
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main portfolio page
├── components/            # React components
│   ├── portfolio/         # Portfolio-specific components
│   ├── terminal/          # Terminal UI components
│   └── ui/                # Reusable UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── public/                # Static assets
├── styles/                # Additional stylesheets
├── terminal-server/       # WebSocket terminal server
│   ├── Dockerfile         # Terminal server container
│   └── server.ts          # Node.js WebSocket server
├── terminal-sandbox/      # Docker sandbox environment
│   ├── Dockerfile         # Sandbox container
│   ├── files/             # Sample files for sandbox
│   └── scripts/           # Shell scripts
├── k8s/                   # Kubernetes manifests
└── docker-compose.yml     # Local development setup
```

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker
- Docker Compose

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mazen-devops-portfolio
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development environment**
   ```bash
   docker-compose up -d
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Terminal Sandbox Setup

The terminal sandbox requires Docker to be running. The terminal server:

- Builds a custom Ubuntu-based sandbox image
- Manages containerized terminal sessions
- Provides WebSocket-based real-time terminal access
- Implements session limits and timeouts for security

## 🚢 Deployment

### Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build -d
```

### Kubernetes Deployment

Apply the Kubernetes manifests:

```bash
kubectl apply -f k8s/
```

The deployment includes:
- RBAC configuration for terminal access
- Service accounts for container management
- Network policies for security

## 🎯 Key Components

### Portfolio Sections

- **Hero**: Eye-catching introduction with call-to-action
- **About**: Personal background and DevOps philosophy
- **Skills**: Technical competencies and certifications
- **Projects**: Showcase of DevOps projects and achievements
- **Terminal**: Interactive command-line demonstrations
- **Contact**: Contact form and social links

### Terminal Feature

The terminal sandbox allows visitors to:
- Execute Linux commands in isolated containers
- Demonstrate DevOps tools and workflows
- Learn through interactive examples
- Test commands safely without affecting the host

Security features:
- Container isolation
- Session timeouts
- Command restrictions
- Resource limits

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
# Terminal Server Configuration
MAX_SESSIONS=5
SESSION_TIMEOUT_MINUTES=10
KUBECONFIG_PATH=/kubeconfig

# Next.js Configuration
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### Customization

- **Styling**: Modify `app/globals.css` and Tailwind config
- **Content**: Update components in `components/portfolio/`
- **Terminal Scripts**: Add files to `terminal-sandbox/files/`
- **API Endpoints**: Modify routes in `app/api/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Terminal implementation inspired by modern DevOps practices

## 📞 Contact

Mazen - [Your Contact Information]

Project Link: [Repository URL]


# DevOps Terminal Sandbox Architecture Guide

## 1. Project Overview

This project is a DevOps portfolio system that simulates a real-world cloud-native environment. It provides an interactive web-based terminal that executes commands inside isolated environments (Docker containers or Kubernetes Pods).

The system demonstrates:

* Web application development (Next.js frontend)
* Real-time communication (WebSocket terminal)
* Containerization (Docker sandbox environments)
* Kubernetes orchestration (dynamic pod creation)
* DevOps security and isolation principles

---

## 2. High-Level Architecture

The system is built in layered architecture:

```
User Browser
   ↓
Next.js Frontend (UI + Terminal)
   ↓
WebSocket Connection
   ↓
Terminal Server (Node.js)
   ↓
Container Runtime Layer
   ├── Docker (local sandbox)
   └── Kubernetes API (cluster mode)
```

---

## 3. Core Components

### 3.1 Frontend (Next.js)

Responsibilities:

* Render portfolio UI
* Host terminal UI (xterm.js)
* Open WebSocket connection
* Stream terminal input/output

Tech:

* Next.js
* TypeScript
* xterm.js

---

### 3.2 Terminal Server (Core Engine)

This is the brain of the system.

Responsibilities:

* Manage WebSocket connections
* Create and destroy sessions
* Execute shell commands
* Interface with Docker or Kubernetes

Tech:

* Node.js
* ws (WebSocket library)
* node-pty
* Kubernetes client

---

## 4. Execution Flow (Step-by-Step)

### Step 1: User Opens Terminal

* Browser connects via WebSocket
* Session ID is created

### Step 2: Session Initialization

Terminal server:

* Creates sandbox environment
* Either:

  * Docker container
  * Kubernetes Pod

---

### Step 3: Environment Creation

#### Option A: Docker Sandbox

```
docker run -dit ubuntu-devops-sandbox
```

#### Option B: Kubernetes Sandbox

```
Create Pod using Kubernetes API
```

---

### Step 4: Shell Attachment

Terminal server attaches to environment:

* Docker: `docker exec`
* Kubernetes: `kubectl exec`

---

### Step 5: Real-time Streaming

Flow:

```
User input → WebSocket → Terminal Server → Shell → Output → WebSocket → Browser
```

---

### Step 6: Session Cleanup

When session ends:

* Kill shell
* Remove container/pod
* Free resources

---

## 5. Docker-Based Architecture (Initial Version)

### docker-compose structure

```
services:
  app
  terminal-server
```

### Key Idea:

* Sandbox containers are NOT static
* They are created dynamically per session

### Wrong approach:

* One permanent sandbox container

### Correct approach:

* One container per session

---

## 6. Kubernetes-Based Architecture (Advanced Version)

### Core concept:

Each terminal session = Kubernetes Pod

### Flow:

```
User request
  ↓
Terminal Server
  ↓
Kubernetes API
  ↓
Create Pod (from sandbox image)
  ↓
Attach shell
```

---

### Example Pod Creation

* Namespace: sandbox
* Image: devops-sandbox
* Resources: limited CPU/Memory

---

### Example lifecycle:

* Create Pod
* Wait Running state
* Exec into Pod
* Stream terminal
* Delete Pod

---

## 7. Security Model

### Critical restrictions:

* No privileged containers
* No docker.sock exposure
* No host filesystem mounts
* CPU and memory limits enforced

### Kubernetes security:

* RBAC (restricted permissions)
* Namespaces per environment
* Network policies

---

## 8. Kubernetes Access Mechanism

Terminal server communicates with cluster using:

### Option 1: kubeconfig file

Mounted inside container:

```
/kubeconfig
```

### Option 2: Service Account (recommended)

* Secure cluster authentication
* Limited permissions

---

## 9. Key Technologies Used

Frontend:

* Next.js
* xterm.js

Backend:

* Node.js
* WebSocket (ws)

Containerization:

* Docker

Orchestration:

* Kubernetes

DevOps Tools:

* kubectl
* Helm (optional extension)

---

## 10. Architecture Evolution Path

### Phase 1 (Current - Local Dev)

* Docker-based sandbox
* Simple WebSocket terminal

### Phase 2 (Intermediate)

* Session-based containers
* Better isolation

### Phase 3 (Advanced)

* Kubernetes dynamic pods
* RBAC security
* Multi-user scaling

### Phase 4 (Production-like)

* Monitoring (Prometheus/Grafana)
* CI/CD integration
* GitOps (ArgoCD)

---

## 11. Common Mistakes to Avoid

* Keeping sandbox container always running
* Giving terminal-server docker.sock access
* No session cleanup
* No resource limits
* Direct host system access

---

## 12. Final Concept Summary

This project is essentially:

> A cloud-native interactive terminal platform that dynamically provisions isolated execution environments per user session using Docker or Kubernetes.

---

## 13. Value of the Project

This project demonstrates:

* Real DevOps engineering skills
* Cloud architecture understanding
* Kubernetes operational knowledge
* Security awareness
* Real-time system design

---

## 14. Recommended Improvement Path

* Replace static sandbox with dynamic pods
* Remove docker.sock dependency
* Add authentication layer
* Add monitoring stack
* Add CI/CD pipeline
* Implement session scaling

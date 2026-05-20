# Critical Backend Deployment Guide

## Status: Backend Service NOT YET DEPLOYED

The frontend now gracefully handles the connection failure, but to enable the full terminal functionality, the backend Kubernetes service must be deployed.

## Current Issue

```
WebSocket connection to 'ws://10.129.117.126:30500/' failed: 
Error in connection establishment: net::ERR_CONNECTION_REFUSED
```

**Root Cause**: The terminal-server pods and service are not deployed to Kubernetes.

## What Was Created

The following Kubernetes manifests have been created and are ready to deploy:

### 1. RBAC Configuration
**File**: `k8s/terminal-rbac.yaml`
- ServiceAccount: `terminal-server`
- ClusterRole: `terminal-shell-executor`
- ClusterRoleBinding: `terminal-shell-executor-binding`

### 2. Service Deployment
**File**: `k8s/terminal-deployment.yaml`
- Container: `gcr.io/cloud-builders/kubectl` (or custom terminal-server image)
- Port: 4000 (HTTP + WebSocket)
- Endpoints:
  - `GET /health` - Liveness probe
  - `GET /diagnostics` - Pod metrics
  - `WS /` - WebSocket terminal connection

### 3. NodePort Service
**File**: `k8s/terminal-service.yaml`
- Type: NodePort
- **Port 30500** - Exposes terminal-server to the cluster
- Backend port: 4000

### 4. Ingress (Optional, for production)
**File**: `k8s/terminal-ingress.yaml`
- NGINX Ingress controller
- WebSocket upgrade support
- Path: `/terminal/`

## Deployment Steps

### Step 1: Build the Terminal Server Image

```bash
# Navigate to terminal-server directory
cd terminal-server

# Build Docker image
docker build -t my-registry/terminal-server:v1 .

# Push to your registry
docker push my-registry/terminal-server:v1
```

### Step 2: Update Deployment Manifest

Edit `k8s/terminal-deployment.yaml`:

```yaml
containers:
  - name: terminal-server
    image: my-registry/terminal-server:v1  # Update this
    imagePullPolicy: Always
    ports:
      - containerPort: 4000
        name: websocket
```

### Step 3: Deploy to Kubernetes

```bash
# Deploy RBAC
kubectl apply -f k8s/terminal-rbac.yaml

# Deploy the service
kubectl apply -f k8s/terminal-service.yaml

# Deploy the backend pod
kubectl apply -f k8s/terminal-deployment.yaml

# Verify deployment
kubectl get pods -n default -l app=terminal-server
kubectl get svc -n default -l app=terminal-server
```

### Step 4: Verify Connectivity

```bash
# Check if port 30500 is listening
netstat -tuln | grep 30500

# Test health endpoint
curl http://localhost:30500/health

# Check pod logs
kubectl logs -l app=terminal-server -n default
```

### Step 5: Frontend URL Configuration

The frontend will automatically detect the connection:

| Scenario | WebSocket URL |
|----------|---------------|
| Direct NodePort | `ws://<node-ip>:30500` |
| Port forwarding | `ws://localhost:4000` |
| Ingress | `wss://your-domain/terminal` |

## Frontend Connection Logic

The frontend (`components/terminal/TerminalWindow.tsx`) uses intelligent URL detection:

1. Checks `NEXT_PUBLIC_WS_URL` environment variable
2. Detects NodePort (`:30500`)
3. Detects Ingress subdomains (`terminal.*`)
4. Falls back to `localhost:4000` for development
5. Uses current host as default

## Testing Backend Directly

### Local Development

```bash
cd terminal-server
npm install
npm run dev  # Starts on port 4000
```

### Docker Testing

```bash
docker build -t terminal-server .
docker run -p 4000:4000 terminal-server
```

### Kubernetes Pod Exec

```bash
kubectl exec -it <pod-name> -- /bin/bash
curl localhost:4000/health
```

## Monitoring and Diagnostics

Once deployed, you can monitor the service:

```bash
# Check service status
kubectl get svc terminal-service -n default -o wide

# Watch pod status
kubectl get pods -l app=terminal-server -w

# View logs
kubectl logs -l app=terminal-server -f

# Check port accessibility
kubectl run -it --rm debug --image=curlimages/curl:latest --restart=Never -- \
  curl http://terminal-service:4000/health
```

## Frontend Diagnostics Component

A diagnostics panel is available at the frontend to show connection status:

- Connection state: connecting → connected → disconnected → error
- Active session count
- Health check results
- Server uptime
- Reconnection attempts

## Next Steps

1. Build and push the terminal-server Docker image
2. Update `k8s/terminal-deployment.yaml` with your image URL
3. Run the deployment steps above
4. Verify with health checks
5. Access the terminal from the frontend

## Troubleshooting

### WebSocket connection refused

- ✅ Check pod is running: `kubectl get pods -l app=terminal-server`
- ✅ Check service exists: `kubectl get svc terminal-service`
- ✅ Verify NodePort: `netstat -tuln | grep 30500`
- ✅ Test health endpoint: `curl http://localhost:30500/health`

### Pod won't start

- Check pod logs: `kubectl logs <pod-name>`
- Check resource limits: `kubectl describe pod <pod-name>`
- Verify image exists and is pullable

### WebSocket upgrades failing

- Check Ingress WebSocket configuration
- Verify NGINX annotations: `proxy_read_timeout`, `proxy_send_timeout`
- Enable `Connection: Upgrade` headers

### Reconnection issues

- Frontend has exponential backoff (1s → 17 minutes)
- Max 10 reconnection attempts
- Check browser console for detailed errors

## Files Reference

- **Frontend**: `components/terminal/TerminalWindow.tsx`
- **WebSocket Hook**: `hooks/useTerminalSocket.ts`
- **Backend**: `terminal-server/server.ts`
- **Kubernetes**: `k8s/terminal-*.yaml`
- **Verification Script**: `scripts/verify-terminal-connectivity.sh`

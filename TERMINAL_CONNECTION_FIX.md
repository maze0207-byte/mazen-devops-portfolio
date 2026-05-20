# Terminal Server Kubernetes Connection Fix

This document outlines the critical networking fixes applied to resolve the `ERR_CONNECTION_REFUSED` error and enable proper terminal server connectivity through Kubernetes.

## Problem Statement

The frontend was attempting to connect to `ws://10.129.117.126:30500` but receiving `ERR_CONNECTION_REFUSED` errors. The root cause was that **Kubernetes Service and Deployment manifests were completely missing**, so the NodePort 30500 was never exposed.

### Symptoms
- WebSocket connection failures: `ERR_CONNECTION_REFUSED`
- Health check unreachable: `/health → connection refused`
- Diagnostics unreachable: `/diagnostics → connection refused`
- Persistent reconnection loops in the frontend

## Solution Overview

### 1. Backend Enhancements

**File**: `terminal-server/server.ts`

Added:
- HTTP server on port 4000 alongside WebSocket
- `/health` endpoint for Kubernetes liveness probes
- `/diagnostics` endpoint for cluster health monitoring
- Proper shutdown handling for both HTTP and WebSocket servers
- CORS headers for cross-origin requests

```bash
# Health check
curl http://<node-ip>:30500/health

# Diagnostics  
curl http://<node-ip>:30500/diagnostics
```

### 2. Kubernetes Manifests (NEW)

Created three essential Kubernetes manifests:

#### a. `k8s/terminal-deployment.yaml`
- Deployment with 1 replica (configurable)
- Health checks (liveness and readiness probes)
- Resource limits (256Mi memory, 100m CPU)
- Volume mounts for kubeconfig and Docker socket
- ServiceAccount binding for RBAC

**Key Configuration**:
```yaml
ports:
  - name: http
    containerPort: 4000
livenessProbe:
  httpGet: /health
  periodSeconds: 10
readinessProbe:
  httpGet: /health
  periodSeconds: 5
```

#### b. `k8s/terminal-service.yaml`
- Type: NodePort (exposed on port 30500)
- Selector: `app: terminal-server`
- Port mapping: 4000 → 4000 (NodePort 30500)
- Session affinity for sticky sessions

**Critical Mapping**:
```yaml
spec:
  type: NodePort
  ports:
  - port: 4000
    targetPort: 4000
    nodePort: 30500  # THIS FIXES THE CONNECTION
```

#### c. `k8s/terminal-ingress.yaml` (Optional)
- NGINX Ingress with WebSocket support
- Proxy timeout configuration
- Host-based routing for `terminal.local`

### 3. Frontend Fixes

#### `components/terminal/TerminalWindow.tsx`
- Dynamic WebSocket URL detection
- Supports NodePort (`:30500`), Ingress subdomains, and localhost
- Automatic protocol detection (ws vs wss)

```typescript
// Determines correct WebSocket URL based on environment
- NodePort: ws://10.129.117.126:30500
- Ingress: ws://terminal.example.com
- Local: ws://localhost:4000
```

#### `hooks/useTerminalSocket.ts`
- Added automatic reconnection with exponential backoff
- Status tracking: connecting → connected → disconnected → error
- Max 10 reconnection attempts with increasing delays
- Improved error logging for debugging

### 4. Verification & Diagnostics

#### `components/DiagnosticsPanel.tsx`
- Real-time health and diagnostics display
- Auto-polling every 5 seconds
- Connection status indicator
- Server metrics (active sessions, uptime)

#### `scripts/verify-terminal-connectivity.sh`
- Comprehensive verification script
- Checks all components:
  - kubectl connectivity
  - Deployment status
  - Service configuration
  - Pod readiness
  - Backend health endpoints
  - Port accessibility

## Deployment Instructions

### Step 1: Build Terminal Server Docker Image

```bash
cd terminal-server
docker build -t mazen-terminal-server:latest .
```

### Step 2: Create Kubeconfig Secret

```bash
# If using existing kubeconfig
kubectl create secret generic terminal-visitor-kubeconfig \
  --from-file=kubeconfig.yaml=$HOME/.kube/config \
  -n default

# Or apply RBAC (which creates necessary permissions)
kubectl apply -f k8s/terminal-rbac.yaml
```

### Step 3: Deploy Manifests

```bash
# Deploy in order
kubectl apply -f k8s/terminal-rbac.yaml
kubectl apply -f k8s/terminal-deployment.yaml
kubectl apply -f k8s/terminal-service.yaml

# Optional: Install Ingress if needed
# kubectl apply -f k8s/terminal-ingress.yaml
```

### Step 4: Verify Deployment

```bash
# Run comprehensive verification
bash scripts/verify-terminal-connectivity.sh

# Or manually check
kubectl get deployment terminal-server
kubectl get svc terminal-server
kubectl get pods -l app=terminal-server

# View logs
kubectl logs -f deployment/terminal-server

# Test health endpoint
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
curl http://$NODE_IP:30500/health
```

### Step 5: Access Terminal

#### Local Testing (Port Forwarding)
```bash
kubectl port-forward svc/terminal-server 4000:4000
# Then access via browser at http://localhost:4000
```

#### Via NodePort
```bash
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
# Access via: http://$NODE_IP:30500
```

#### Via Ingress (if configured)
```bash
# Configure /etc/hosts or DNS
echo "<ingress-ip> terminal.local" >> /etc/hosts
# Access via: http://terminal.local
```

## Networking Validation Checklist

- [ ] Service exists and has correct selector `app: terminal-server`
- [ ] NodePort 30500 is configured in Service spec
- [ ] Deployment has matching labels `app: terminal-server`
- [ ] Pod is Running and Ready (check `kubectl get pods`)
- [ ] Health check responds: `curl http://<node-ip>:30500/health`
- [ ] Diagnostics respond: `curl http://<node-ip>:30500/diagnostics`
- [ ] Frontend shows "connected" status
- [ ] WebSocket upgrade succeeds (check browser DevTools)
- [ ] Terminal commands execute without errors

## Troubleshooting

### Connection Refused (ERR_CONNECTION_REFUSED)

**Problem**: Frontend cannot reach backend
**Solutions**:
1. Verify Service exists: `kubectl get svc terminal-server`
2. Verify NodePort is 30500: `kubectl describe svc terminal-server`
3. Check pod is running: `kubectl get pods -l app=terminal-server`
4. Test pod directly: `kubectl port-forward svc/terminal-server 4000:4000`
5. Check firewall isn't blocking port 30500

### Pod Not Ready

**Problem**: Pod shows `NotReady` or `CrashLoopBackOff`
**Solutions**:
1. View logs: `kubectl logs deployment/terminal-server`
2. Check resource limits aren't exceeded
3. Verify kubeconfig secret exists: `kubectl get secret terminal-visitor-kubeconfig`
4. Check RBAC permissions: `kubectl get clusterrole terminal-visitor-role`

### No Health Response

**Problem**: `/health` endpoint doesn't respond
**Solutions**:
1. Verify server is running: `kubectl logs deployment/terminal-server`
2. Check port 4000 is listening inside pod
3. Test inside pod: `kubectl exec -it <pod-name> -- curl localhost:4000/health`

### WebSocket Keeps Reconnecting

**Problem**: Status shows constant "connecting"
**Solutions**:
1. Check browser console for errors
2. Verify WebSocket URL is correct
3. Check CORS headers: `curl -I http://<node-ip>:30500/health`
4. Verify no proxy/firewall interference

## Environment Variables

Set these in your deployment or browser environment:

```bash
# Frontend WebSocket URL (optional, auto-detects if not set)
NEXT_PUBLIC_WS_URL=ws://10.129.117.126:30500

# Backend configuration
PORT=4000
MAX_SESSIONS=10
SESSION_TIMEOUT_MINUTES=15
KUBECONFIG_PATH=/kubeconfig/kubeconfig.yaml
```

## File Summary

| File | Purpose | Status |
|------|---------|--------|
| `terminal-server/server.ts` | Backend with health endpoints | Modified |
| `k8s/terminal-deployment.yaml` | Pod deployment configuration | Created |
| `k8s/terminal-service.yaml` | NodePort service (port 30500) | Created |
| `k8s/terminal-ingress.yaml` | Ingress configuration | Created |
| `components/terminal/TerminalWindow.tsx` | Dynamic WebSocket URL | Modified |
| `hooks/useTerminalSocket.ts` | Reconnection logic | Modified |
| `components/DiagnosticsPanel.tsx` | Health monitoring UI | Created |
| `scripts/verify-terminal-connectivity.sh` | Verification script | Created |

## Security Considerations

1. **RBAC**: Uses `terminal-visitor` ServiceAccount with read-only permissions
2. **Resource Limits**: Pod limited to 512MB memory, 500m CPU
3. **Security Context**: No privilege escalation, runs as non-root
4. **Kubeconfig**: Mounted as secret, not baked into image
5. **Docker Socket**: Mounted for container operations (consider security implications)

## Performance Notes

- **Connection Pool**: Supports up to 10 concurrent sessions (configurable)
- **Session Timeout**: 15 minutes of inactivity (configurable)
- **Rate Limiting**: Max 3 sessions per IP per minute
- **Reconnection Backoff**: Exponential from 1s to ~17 minutes

## Next Steps

1. Deploy all manifests and verify connectivity
2. Test terminal functionality in browser
3. Monitor logs for any connection issues
4. Configure DNS/Ingress for production access
5. Set up monitoring and alerting for `/health` endpoint

For detailed diagnostics, run:
```bash
bash scripts/verify-terminal-connectivity.sh
```

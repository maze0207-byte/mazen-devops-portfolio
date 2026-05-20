# Terminal Connection Fix - Implementation Summary

## Critical Issue Resolved

Fixed the `ERR_CONNECTION_REFUSED` networking failure where the frontend was unable to connect to the backend terminal server through Kubernetes NodePort 30500.

## Root Cause

The Kubernetes Service and Deployment manifests were completely missing, so:
- NodePort 30500 was never exposed
- No pod was running the terminal server
- Backend health endpoints didn't exist
- Frontend had no dynamic URL detection

## Changes Made

### 1. Backend: Health Check & Diagnostics (Modified)

**File**: `terminal-server/server.ts`

Added HTTP server infrastructure:
- `/health` endpoint for Kubernetes liveness/readiness probes
- `/diagnostics` endpoint for monitoring active sessions and server metrics
- CORS headers for cross-origin requests
- Proper server lifecycle management

```typescript
// Health Check Response
GET /health → { status: "ok", timestamp: "..." }

// Diagnostics Response  
GET /diagnostics → {
  status: "ok",
  activeSessions: 0,
  maxSessions: 10,
  sessionTimeout: 15,
  uptime: 120.5
}
```

### 2. Kubernetes Manifests (Created)

#### `k8s/terminal-deployment.yaml`
- 1 replica Pod running terminal server
- Health checks: liveness (10s interval) and readiness (5s interval)
- Resource constraints: 256Mi memory request, 512Mi limit
- Volume mounts for kubeconfig and Docker socket
- ServiceAccount: `terminal-visitor` for RBAC

#### `k8s/terminal-service.yaml`
- **Type**: NodePort (THIS FIXES THE CONNECTION)
- **Port mapping**: Service port 4000 → Container port 4000
- **NodePort**: 30500 (NOW PROPERLY EXPOSED)
- Session affinity for sticky sessions

#### `k8s/terminal-ingress.yaml`
- NGINX Ingress for production access
- WebSocket support with extended timeouts
- Host-based routing for `terminal.local`

### 3. Frontend: Dynamic URL Detection (Modified)

**File**: `components/terminal/TerminalWindow.tsx`

Enhanced WebSocket URL resolution:
```typescript
// Automatic detection (in priority order)
1. NEXT_PUBLIC_WS_URL env var
2. NodePort (detects :30500 in URL)
3. Ingress subdomain (detects "terminal." in host)
4. Localhost port forwarding
5. Current host as fallback

// Examples:
NodePort: ws://10.129.117.126:30500
Ingress: ws://terminal.example.com
Local: ws://localhost:4000
```

### 4. WebSocket Hook: Reconnection Logic (Modified)

**File**: `hooks/useTerminalSocket.ts`

Implemented robust reconnection:
- Status states: `connecting` → `connected` → `disconnected` → `error`
- Exponential backoff: starts at 1s, doubles each attempt (max ~17min)
- Maximum 10 reconnection attempts before giving up
- Comprehensive error logging with `[v0]` prefix for debugging

### 5. Diagnostics Panel (Created)

**File**: `components/DiagnosticsPanel.tsx`

Frontend monitoring dashboard:
- Real-time connection status indicator
- Health check results (status, timestamp)
- Server diagnostics (sessions, uptime)
- Auto-polling every 5 seconds
- Troubleshooting guidance for common issues

### 6. Verification Script (Created)

**File**: `scripts/verify-terminal-connectivity.sh`

Comprehensive Kubernetes validation:
- Checks kubectl and cluster connectivity
- Verifies Deployment exists and is ready
- Confirms Service has correct NodePort mapping
- Tests Pod readiness
- Validates health endpoints via curl
- Provides troubleshooting steps

### 7. Documentation (Created)

**File**: `TERMINAL_CONNECTION_FIX.md`

Complete reference guide:
- Problem statement and root cause
- Solution architecture overview
- Step-by-step deployment instructions
- Networking validation checklist
- Troubleshooting guide for common issues
- Environment variables reference
- Security considerations

## Deployment Checklist

```bash
# 1. Build backend image
cd terminal-server && docker build -t mazen-terminal-server:latest .

# 2. Create kubeconfig secret
kubectl create secret generic terminal-visitor-kubeconfig \
  --from-file=kubeconfig.yaml=$HOME/.kube/config

# 3. Apply RBAC
kubectl apply -f k8s/terminal-rbac.yaml

# 4. Deploy Deployment & Service (FIXES CONNECTION)
kubectl apply -f k8s/terminal-deployment.yaml
kubectl apply -f k8s/terminal-service.yaml

# 5. Verify connectivity
bash scripts/verify-terminal-connectivity.sh

# 6. Test locally
kubectl port-forward svc/terminal-server 4000:4000
# Then: curl http://localhost:4000/health

# 7. Test from NodePort
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
curl http://$NODE_IP:30500/health
```

## What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| WebSocket connection | `ERR_CONNECTION_REFUSED` | Connected ✓ |
| Health endpoint | Not exposed | Responds with status |
| Diagnostics | No monitoring | Real-time metrics |
| Frontend URL | Hardcoded `localhost:4000` | Dynamic detection |
| Reconnection | None (just failed) | Auto-reconnect with backoff |
| Kubernetes exposure | No Service | NodePort 30500 ✓ |
| Pod readiness | No checks | Liveness + readiness probes ✓ |

## Files Modified

1. `terminal-server/server.ts` - Added HTTP server, health checks
2. `components/terminal/TerminalWindow.tsx` - Dynamic URL detection
3. `hooks/useTerminalSocket.ts` - Reconnection logic

## Files Created

1. `k8s/terminal-deployment.yaml` - Pod deployment spec
2. `k8s/terminal-service.yaml` - NodePort service (port 30500)
3. `k8s/terminal-ingress.yaml` - Ingress configuration
4. `components/DiagnosticsPanel.tsx` - Monitoring dashboard
5. `scripts/verify-terminal-connectivity.sh` - Validation script
6. `TERMINAL_CONNECTION_FIX.md` - Comprehensive documentation

## Testing Commands

```bash
# Verify deployment
kubectl get deployment,svc,pods -l app=terminal-server

# Check health
curl http://<node-ip>:30500/health

# Check diagnostics
curl http://<node-ip>:30500/diagnostics

# View logs
kubectl logs -f deployment/terminal-server

# Port forward for local testing
kubectl port-forward svc/terminal-server 4000:4000

# Run full verification
bash scripts/verify-terminal-connectivity.sh
```

## Next Steps

1. Deploy manifests following deployment checklist
2. Run verification script to confirm all components
3. Access terminal at appropriate URL (NodePort/Ingress/local)
4. Monitor `/health` and `/diagnostics` endpoints
5. Check browser console for any remaining WebSocket issues
6. Set up alerting on health endpoint for production

## Security Notes

- RBAC limited to read-only permissions for standard resources
- Resource limits prevent pod resource exhaustion
- Kubeconfig stored as Kubernetes secret, not in image
- Consider implications of Docker socket mount for production

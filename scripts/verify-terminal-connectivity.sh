#!/bin/bash
# Terminal Server Connectivity Verification Script
# This script verifies all components of the terminal server setup

set -e

echo "=========================================="
echo "Terminal Server Connectivity Verification"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_HOST="${NODE_HOST:-localhost}"
NODE_PORT="${NODE_PORT:-30500}"
BACKEND_URL="http://${NODE_HOST}:${NODE_PORT}"

print_status() {
  local test_name=$1
  local status=$2
  local message=${3:-}
  
  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    [ -n "$message" ] && echo "  $message"
  elif [ "$status" = "FAIL" ]; then
    echo -e "${RED}✗${NC} $test_name"
    [ -n "$message" ] && echo "  $message"
  else
    echo -e "${YELLOW}⚠${NC} $test_name"
    [ -n "$message" ] && echo "  $message"
  fi
}

print_section() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if kubectl is available
print_section "Prerequisites"
if command -v kubectl &> /dev/null; then
  print_status "kubectl installed" "PASS" "$(kubectl version --client --short 2>/dev/null | head -1)"
else
  print_status "kubectl installed" "FAIL" "kubectl not found in PATH"
  exit 1
fi

# Check cluster connectivity
print_section "Kubernetes Cluster"
if kubectl cluster-info &> /dev/null; then
  print_status "Cluster accessible" "PASS"
else
  print_status "Cluster accessible" "FAIL" "Cannot reach Kubernetes cluster"
  exit 1
fi

# Check namespace
if kubectl get namespace default &> /dev/null; then
  print_status "Default namespace exists" "PASS"
else
  print_status "Default namespace exists" "FAIL"
  exit 1
fi

# Check Deployment
print_section "Terminal Server Deployment"
if kubectl get deployment terminal-server -n default &> /dev/null; then
  print_status "Deployment exists" "PASS"
  
  # Check deployment status
  replicas=$(kubectl get deployment terminal-server -n default -o jsonpath='{.status.replicas}')
  ready=$(kubectl get deployment terminal-server -n default -o jsonpath='{.status.readyReplicas}')
  
  if [ "$replicas" = "$ready" ] && [ -n "$ready" ]; then
    print_status "Deployment ready" "PASS" "$ready/$replicas pods ready"
  else
    print_status "Deployment ready" "FAIL" "Only $ready/$replicas pods ready"
  fi
else
  print_status "Deployment exists" "FAIL" "No terminal-server deployment found"
  echo "  Run: kubectl apply -f k8s/terminal-deployment.yaml"
fi

# Check Service
print_section "Kubernetes Service"
if kubectl get service terminal-server -n default &> /dev/null; then
  print_status "Service exists" "PASS"
  
  # Get service details
  cluster_ip=$(kubectl get service terminal-server -n default -o jsonpath='{.spec.clusterIP}')
  node_port=$(kubectl get service terminal-server -n default -o jsonpath='{.spec.ports[0].nodePort}')
  
  print_status "ClusterIP set" "PASS" "$cluster_ip"
  print_status "NodePort set" "PASS" "$node_port"
  
  if [ "$node_port" = "30500" ]; then
    print_status "NodePort 30500 configured" "PASS"
  else
    print_status "NodePort 30500 configured" "FAIL" "Port is $node_port, expected 30500"
  fi
else
  print_status "Service exists" "FAIL" "No terminal-server service found"
  echo "  Run: kubectl apply -f k8s/terminal-service.yaml"
fi

# Check Pod
print_section "Terminal Server Pod"
pod_name=$(kubectl get pod -n default -l app=terminal-server -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -n "$pod_name" ]; then
  print_status "Pod found" "PASS" "$pod_name"
  
  # Check pod status
  pod_status=$(kubectl get pod "$pod_name" -n default -o jsonpath='{.status.phase}')
  print_status "Pod status" "PASS" "$pod_status"
  
  # Check containers
  container_ready=$(kubectl get pod "$pod_name" -n default -o jsonpath='{.status.containerStatuses[0].ready}')
  if [ "$container_ready" = "true" ]; then
    print_status "Container ready" "PASS"
  else
    print_status "Container ready" "FAIL"
    echo "  Pod logs:"
    kubectl logs "$pod_name" -n default --tail=20 | sed 's/^/    /'
  fi
else
  print_status "Pod found" "FAIL" "No running pods for terminal-server"
fi

# Check connectivity to backend
print_section "Backend Connectivity"

# Health check via curl
if command -v curl &> /dev/null; then
  echo "Testing health endpoint: $BACKEND_URL/health"
  
  if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    health=$(curl -s "$BACKEND_URL/health" | jq -r '.status' 2>/dev/null || echo "OK")
    print_status "Health check (/health)" "PASS" "Status: $health"
  else
    print_status "Health check (/health)" "FAIL" "Connection refused to $BACKEND_URL"
  fi
  
  # Diagnostics check
  if curl -s -f "$BACKEND_URL/diagnostics" > /dev/null 2>&1; then
    diagnostics=$(curl -s "$BACKEND_URL/diagnostics")
    active_sessions=$(echo "$diagnostics" | jq -r '.activeSessions' 2>/dev/null || echo "?")
    print_status "Diagnostics check (/diagnostics)" "PASS" "Active sessions: $active_sessions"
  else
    print_status "Diagnostics check (/diagnostics)" "FAIL"
  fi
else
  print_status "curl available" "FAIL" "curl not found, skipping connectivity tests"
fi

# Port forwarding test
print_section "Port Forwarding"
if command -v kubectl &> /dev/null && [ -n "$pod_name" ]; then
  echo "To test locally with port forwarding, run:"
  echo "  kubectl port-forward pod/$pod_name 4000:4000"
  echo ""
  echo "Then connect via: ws://localhost:4000"
fi

print_section "Summary"
echo "Configuration:"
echo "  Backend URL: $BACKEND_URL"
echo "  Expected NodePort: 30500"
echo ""
echo "Next steps:"
echo "  1. If deployment failed: kubectl apply -f k8s/terminal-deployment.yaml"
echo "  2. If service failed: kubectl apply -f k8s/terminal-service.yaml"
echo "  3. Check logs: kubectl logs -f deployment/terminal-server"
echo "  4. Test connectivity: curl http://<node-ip>:30500/health"
echo ""

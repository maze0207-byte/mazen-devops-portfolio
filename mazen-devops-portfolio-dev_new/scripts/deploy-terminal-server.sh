#!/bin/bash
# Quick Deployment Script for Terminal Server Fix
# This script automates the deployment of all terminal server components

set -e

echo "=========================================="
echo "Terminal Server - Quick Deployment Script"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-default}"
IMAGE_NAME="${IMAGE_NAME:-mazen-terminal-server:latest}"
KUBECONFIG_SOURCE="${KUBECONFIG_SOURCE:-$HOME/.kube/config}"

print_section() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
}

print_status() {
  local message=$1
  local status=${2:-"INFO"}
  
  if [ "$status" = "OK" ]; then
    echo -e "${GREEN}✓${NC} $message"
  elif [ "$status" = "ERROR" ]; then
    echo -e "${RED}✗${NC} $message"
  else
    echo -e "${YELLOW}•${NC} $message"
  fi
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command -v kubectl &> /dev/null; then
  print_status "kubectl not found" "ERROR"
  exit 1
fi
print_status "kubectl found" "OK"

if ! command -v docker &> /dev/null; then
  print_status "docker not found (optional for image building)" "ERROR"
  BUILD_IMAGE=false
else
  print_status "docker found" "OK"
  BUILD_IMAGE=true
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
  print_status "Cannot connect to Kubernetes cluster" "ERROR"
  exit 1
fi
print_status "Connected to cluster" "OK"

# Confirm namespace
print_section "Configuration"
echo "Namespace: $NAMESPACE"
echo "Image: $IMAGE_NAME"
echo "Kubeconfig source: $KUBECONFIG_SOURCE"
echo ""

read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Build image (optional)
if [ "$BUILD_IMAGE" = "true" ]; then
  print_section "Building Terminal Server Image"
  
  if [ -d "./terminal-server" ]; then
    print_status "Building $IMAGE_NAME..."
    cd terminal-server
    docker build -t "$IMAGE_NAME" .
    cd ..
    print_status "Image built successfully" "OK"
  else
    print_status "terminal-server directory not found, skipping build" "INFO"
  fi
fi

# Create namespace if needed
print_section "Kubernetes Setup"
if kubectl get namespace "$NAMESPACE" &> /dev/null; then
  print_status "Namespace '$NAMESPACE' already exists" "OK"
else
  print_status "Creating namespace '$NAMESPACE'..."
  kubectl create namespace "$NAMESPACE"
  print_status "Namespace created" "OK"
fi

# Create kubeconfig secret
print_status "Creating kubeconfig secret..."
if [ -f "$KUBECONFIG_SOURCE" ]; then
  kubectl create secret generic terminal-visitor-kubeconfig \
    --from-file=kubeconfig.yaml="$KUBECONFIG_SOURCE" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -
  print_status "Kubeconfig secret created" "OK"
else
  print_status "Kubeconfig file not found at $KUBECONFIG_SOURCE" "ERROR"
  echo "Please set KUBECONFIG_SOURCE environment variable"
  exit 1
fi

# Apply manifests in order
print_section "Applying Kubernetes Manifests"

# RBAC
if [ -f "k8s/terminal-rbac.yaml" ]; then
  print_status "Applying RBAC..."
  kubectl apply -f k8s/terminal-rbac.yaml
  print_status "RBAC configured" "OK"
else
  print_status "terminal-rbac.yaml not found" "ERROR"
fi

# Deployment
if [ -f "k8s/terminal-deployment.yaml" ]; then
  print_status "Applying Deployment..."
  kubectl apply -f k8s/terminal-deployment.yaml --namespace="$NAMESPACE"
  print_status "Deployment applied" "OK"
else
  print_status "terminal-deployment.yaml not found" "ERROR"
fi

# Service
if [ -f "k8s/terminal-service.yaml" ]; then
  print_status "Applying Service..."
  kubectl apply -f k8s/terminal-service.yaml --namespace="$NAMESPACE"
  print_status "Service applied" "OK"
else
  print_status "terminal-service.yaml not found" "ERROR"
fi

# Ingress (optional)
if [ -f "k8s/terminal-ingress.yaml" ]; then
  read -p "Apply Ingress configuration? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Applying Ingress..."
    kubectl apply -f k8s/terminal-ingress.yaml --namespace="$NAMESPACE"
    print_status "Ingress applied" "OK"
  fi
fi

# Wait for deployment
print_section "Waiting for Deployment"
print_status "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod \
  -l app=terminal-server \
  -n "$NAMESPACE" \
  --timeout=120s 2>/dev/null || print_status "Timeout waiting for pod (may still be deploying)" "INFO"

# Verify deployment
print_section "Verification"

DEPLOYMENT=$(kubectl get deployment terminal-server -n "$NAMESPACE" 2>/dev/null || echo "")
if [ -n "$DEPLOYMENT" ]; then
  READY=$(kubectl get deployment terminal-server -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  DESIRED=$(kubectl get deployment terminal-server -n "$NAMESPACE" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
  print_status "Deployment status: $READY/$DESIRED pods ready"
fi

SERVICE=$(kubectl get svc terminal-server -n "$NAMESPACE" 2>/dev/null || echo "")
if [ -n "$SERVICE" ]; then
  NODEPORT=$(kubectl get svc terminal-server -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}')
  print_status "Service NodePort: $NODEPORT"
fi

# Summary and next steps
print_section "Next Steps"

echo "1. Verify connectivity:"
echo "   bash scripts/verify-terminal-connectivity.sh"
echo ""

echo "2. Test health endpoint:"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}' 2>/dev/null || echo "<node-ip>")
echo "   curl http://$NODE_IP:30500/health"
echo ""

echo "3. View logs:"
echo "   kubectl logs -f deployment/terminal-server -n $NAMESPACE"
echo ""

echo "4. Port forward for local testing:"
echo "   kubectl port-forward svc/terminal-server 4000:4000 -n $NAMESPACE"
echo ""

echo "5. Access diagnostics component to verify connection"
echo ""

print_status "Deployment complete!" "OK"

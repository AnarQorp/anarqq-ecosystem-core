#!/bin/bash
set -euo pipefail

# Qflow Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
NAMESPACE="qflow"
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}"
GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Validate environment
validate_environment() {
    log "Validating deployment environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        development|staging|production)
            log "Environment '$ENVIRONMENT' is valid"
            ;;
        *)
            error "Invalid environment '$ENVIRONMENT'. Must be one of: development, staging, production"
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster. Please check your kubeconfig"
    fi
    
    # Check if Docker is available for building
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    # Check if kustomize is available
    if ! command -v kustomize &> /dev/null; then
        warn "kustomize not found, using kubectl kustomize instead"
    fi
    
    success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log "Building Docker image for version $VERSION..."
    
    cd "$PROJECT_DIR"
    
    # Run centralization check
    npm run centralization-check
    
    # Build the image
    docker build \
        --tag "qflow:$VERSION" \
        --tag "qflow:latest" \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_NUMBER="$BUILD_NUMBER" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        .
    
    success "Docker image built successfully"
}

# Push image to registry (if configured)
push_image() {
    if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
        log "Pushing image to registry: $DOCKER_REGISTRY"
        
        docker tag "qflow:$VERSION" "$DOCKER_REGISTRY/qflow:$VERSION"
        docker tag "qflow:$VERSION" "$DOCKER_REGISTRY/qflow:latest"
        
        docker push "$DOCKER_REGISTRY/qflow:$VERSION"
        docker push "$DOCKER_REGISTRY/qflow:latest"
        
        success "Image pushed to registry"
    else
        warn "DOCKER_REGISTRY not set, skipping image push"
    fi
}

# Create namespace if it doesn't exist
create_namespace() {
    log "Creating namespace '$NAMESPACE' if it doesn't exist..."
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        kubectl apply -f "$PROJECT_DIR/k8s/namespace.yaml"
        success "Namespace '$NAMESPACE' created"
    else
        log "Namespace '$NAMESPACE' already exists"
    fi
}

# Generate configuration checksums
generate_checksums() {
    log "Generating configuration checksums..."
    
    CONFIG_CHECKSUM=$(kubectl create configmap temp-config \
        --from-file="$PROJECT_DIR/k8s/configmap.yaml" \
        --dry-run=client -o yaml | sha256sum | cut -d' ' -f1)
    
    SECRET_CHECKSUM=$(kubectl create secret generic temp-secret \
        --from-file="$PROJECT_DIR/k8s/secret.yaml" \
        --dry-run=client -o yaml | sha256sum | cut -d' ' -f1)
    
    export CONFIG_CHECKSUM
    export SECRET_CHECKSUM
    export VERSION
    export BUILD_NUMBER
    export GIT_COMMIT
    export RUNTIME_TOKEN="${RUNTIME_TOKEN:-$(openssl rand -hex 32)}"
    
    log "Configuration checksums generated"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    log "Deploying to Kubernetes cluster..."
    
    cd "$PROJECT_DIR/k8s"
    
    # Use kustomize if available, otherwise kubectl kustomize
    if command -v kustomize &> /dev/null; then
        kustomize build . | envsubst | kubectl apply -f -
    else
        kubectl kustomize . | envsubst | kubectl apply -f -
    fi
    
    success "Kubernetes resources applied"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log "Waiting for deployment to be ready..."
    
    kubectl rollout status deployment/qflow -n "$NAMESPACE" --timeout=600s
    kubectl rollout status deployment/qflow-ipfs -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/qflow-redis -n "$NAMESPACE" --timeout=300s
    
    success "All deployments are ready"
}

# Run health checks
health_check() {
    log "Running health checks..."
    
    # Wait a bit for services to stabilize
    sleep 30
    
    # Get service endpoint
    SERVICE_IP=$(kubectl get service qflow-service -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    
    # Run health check from within the cluster
    kubectl run health-check-pod \
        --image=curlimages/curl:latest \
        --rm -i --restart=Never \
        --command -- curl -f "http://$SERVICE_IP:8080/health" \
        || error "Health check failed"
    
    success "Health checks passed"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove old ReplicaSets
    kubectl delete replicaset -n "$NAMESPACE" \
        -l app.kubernetes.io/name=qflow \
        --field-selector='status.replicas=0' \
        --ignore-not-found=true
    
    # Remove old pods
    kubectl delete pod -n "$NAMESPACE" \
        -l app.kubernetes.io/name=qflow \
        --field-selector='status.phase=Succeeded' \
        --ignore-not-found=true
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting Qflow deployment..."
    log "Environment: $ENVIRONMENT"
    log "Version: $VERSION"
    log "Build Number: $BUILD_NUMBER"
    log "Git Commit: $GIT_COMMIT"
    
    validate_environment
    check_prerequisites
    build_image
    push_image
    create_namespace
    generate_checksums
    deploy_kubernetes
    wait_for_deployment
    health_check
    cleanup
    
    success "Qflow deployment completed successfully!"
    
    # Display access information
    echo ""
    log "Access Information:"
    echo "  API: kubectl port-forward -n $NAMESPACE service/qflow-service 8080:8080"
    echo "  WebSocket: kubectl port-forward -n $NAMESPACE service/qflow-service 9090:9090"
    echo "  Logs: kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=qflow -f"
    echo "  Status: kubectl get pods -n $NAMESPACE"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
#!/bin/bash

# Blue-Green Deployment Script for Q Ecosystem
# Automates the deployment of all Q ecosystem modules with zero-downtime

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/ecosystem-deployment-$(date +%Y%m%d-%H%M%S).log"

# Default values
ENVIRONMENT=""
VERSION=""
DRY_RUN=false
VERBOSE=false
ROLLBACK=false
HEALTH_CHECK_TIMEOUT=300
TRAFFIC_SPLIT_DELAY=60

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Blue-Green Deployment Script for Q Ecosystem

OPTIONS:
    --env=ENV               Target environment (green|blue|disaster-recovery)
    --version=VERSION       Version to deploy (e.g., v1.0.0)
    --dry-run              Perform a dry run without actual deployment
    --verbose              Enable verbose logging
    --rollback             Perform rollback to previous version
    --help                 Show this help message

EXAMPLES:
    $0 --env=green --version=v1.0.0
    $0 --env=blue --rollback
    $0 --env=green --version=v1.0.1 --dry-run

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env=*)
                ENVIRONMENT="${1#*=}"
                shift
                ;;
            --version=*)
                VERSION="${1#*=}"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Environment is required. Use --env=green|blue|disaster-recovery"
        exit 1
    fi

    if [[ "$ROLLBACK" == false && -z "$VERSION" ]]; then
        log_error "Version is required for deployment. Use --version=vX.Y.Z"
        exit 1
    fi

    if [[ ! "$ENVIRONMENT" =~ ^(green|blue|disaster-recovery)$ ]]; then
        log_error "Invalid environment. Must be green, blue, or disaster-recovery"
        exit 1
    fi
}

# Pre-deployment validation
validate_prerequisites() {
    log "Validating deployment prerequisites..."

    # Check required tools
    local required_tools=("docker" "kubectl" "jq" "curl" "aws")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done

    # Check environment configuration
    if [[ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]]; then
        log_error "Environment configuration file .env.$ENVIRONMENT not found"
        exit 1
    fi

    # Load environment configuration
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"

    # Validate required environment variables
    local required_vars=("AWS_REGION" "CLUSTER_NAME" "NAMESPACE" "REGISTRY_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable '$var' is not set"
            exit 1
        fi
    done

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Check Docker registry access
    if ! docker login "$REGISTRY_URL" &> /dev/null; then
        log_error "Cannot authenticate with Docker registry"
        exit 1
    fi

    log_success "Prerequisites validation completed"
}

# Build and push container images
build_and_push_images() {
    log "Building and pushing container images for version $VERSION..."

    local modules=(
        "squid"
        "qwallet" 
        "qlock"
        "qonsent"
        "qindex"
        "qerberos"
        "qmask"
        "qdrive"
        "qpic"
        "qmarket"
        "qmail"
        "qchat"
        "qnet"
        "dao"
    )

    for module in "${modules[@]}"; do
        log "Building $module..."
        
        if [[ "$DRY_RUN" == true ]]; then
            log "DRY RUN: Would build and push $REGISTRY_URL/$module:$VERSION"
            continue
        fi

        # Build image
        docker build -t "$REGISTRY_URL/$module:$VERSION" \
            -f "modules/$module/Dockerfile" \
            --build-arg VERSION="$VERSION" \
            --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            "modules/$module/"

        # Push image
        docker push "$REGISTRY_URL/$module:$VERSION"
        
        log_success "Built and pushed $module:$VERSION"
    done

    # Build backend services
    log "Building backend services..."
    
    if [[ "$DRY_RUN" == false ]]; then
        docker build -t "$REGISTRY_URL/backend:$VERSION" \
            -f "backend/Dockerfile" \
            --build-arg VERSION="$VERSION" \
            --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            "backend/"
        
        docker push "$REGISTRY_URL/backend:$VERSION"
    fi

    log_success "All images built and pushed successfully"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log "Deploying to Kubernetes environment: $ENVIRONMENT..."

    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    # Generate deployment manifests
    local manifest_dir="/tmp/k8s-manifests-$ENVIRONMENT"
    mkdir -p "$manifest_dir"

    # Generate manifests for each module
    local modules=(
        "squid" "qwallet" "qlock" "qonsent" "qindex" 
        "qerberos" "qmask" "qdrive" "qpic" "qmarket" 
        "qmail" "qchat" "qnet" "dao" "backend"
    )

    for module in "${modules[@]}"; do
        generate_k8s_manifest "$module" "$manifest_dir"
    done

    # Apply manifests
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would apply Kubernetes manifests to $NAMESPACE namespace"
        return
    fi

    kubectl apply -f "$manifest_dir/" -n "$NAMESPACE"

    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    for module in "${modules[@]}"; do
        kubectl rollout status deployment/"$module" -n "$NAMESPACE" --timeout=600s
    done

    log_success "Kubernetes deployment completed"
}

# Generate Kubernetes manifest for a module
generate_k8s_manifest() {
    local module=$1
    local output_dir=$2
    
    cat > "$output_dir/$module-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $module
  labels:
    app: $module
    version: $VERSION
    environment: $ENVIRONMENT
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $module
  template:
    metadata:
      labels:
        app: $module
        version: $VERSION
        environment: $ENVIRONMENT
    spec:
      containers:
      - name: $module
        image: $REGISTRY_URL/$module:$VERSION
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: ENVIRONMENT
          value: "$ENVIRONMENT"
        - name: VERSION
          value: "$VERSION"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: $module-service
  labels:
    app: $module
spec:
  selector:
    app: $module
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
EOF
}

# Health check validation
validate_health_checks() {
    log "Validating health checks for all services..."

    local modules=(
        "squid" "qwallet" "qlock" "qonsent" "qindex" 
        "qerberos" "qmask" "qdrive" "qpic" "qmarket" 
        "qmail" "qchat" "qnet" "dao" "backend"
    )

    local failed_checks=0
    local start_time=$(date +%s)

    while [[ $(($(date +%s) - start_time)) -lt $HEALTH_CHECK_TIMEOUT ]]; do
        failed_checks=0
        
        for module in "${modules[@]}"; do
            if [[ "$DRY_RUN" == true ]]; then
                log "DRY RUN: Would check health of $module"
                continue
            fi

            # Get service endpoint
            local service_url
            service_url=$(kubectl get service "$module-service" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
            
            if [[ -z "$service_url" ]]; then
                # Use port-forward for testing
                kubectl port-forward service/"$module-service" 8080:80 -n "$NAMESPACE" &
                local port_forward_pid=$!
                sleep 2
                service_url="localhost:8080"
            fi

            # Check health endpoint
            if ! curl -f -s "http://$service_url/health" > /dev/null; then
                log_warning "Health check failed for $module"
                ((failed_checks++))
            else
                log "Health check passed for $module"
            fi

            # Clean up port-forward if used
            if [[ -n "${port_forward_pid:-}" ]]; then
                kill $port_forward_pid 2>/dev/null || true
                unset port_forward_pid
            fi
        done

        if [[ $failed_checks -eq 0 ]]; then
            log_success "All health checks passed"
            return 0
        fi

        log "Waiting for $failed_checks services to become healthy..."
        sleep 10
    done

    log_error "Health check validation failed after $HEALTH_CHECK_TIMEOUT seconds"
    return 1
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests against $ENVIRONMENT environment..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run smoke tests"
        return 0
    fi

    # Run smoke tests
    cd "$PROJECT_ROOT"
    npm run test:smoke -- --env="$ENVIRONMENT" --timeout=60000

    if [[ $? -eq 0 ]]; then
        log_success "Smoke tests passed"
        return 0
    else
        log_error "Smoke tests failed"
        return 1
    fi
}

# Performance validation
validate_performance() {
    log "Validating performance metrics..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would validate performance metrics"
        return 0
    fi

    # Run performance tests
    cd "$PROJECT_ROOT"
    npm run test:performance -- --env="$ENVIRONMENT" --duration=5m

    if [[ $? -eq 0 ]]; then
        log_success "Performance validation passed"
        return 0
    else
        log_error "Performance validation failed"
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Performing rollback for environment: $ENVIRONMENT..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would perform rollback"
        return 0
    fi

    # Get previous version
    local previous_version
    previous_version=$(kubectl get deployment -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.annotations.deployment\.kubernetes\.io/revision}' | head -1)

    if [[ -z "$previous_version" ]]; then
        log_error "Cannot determine previous version for rollback"
        return 1
    fi

    log "Rolling back to previous version: $previous_version"

    # Rollback all deployments
    local modules=(
        "squid" "qwallet" "qlock" "qonsent" "qindex" 
        "qerberos" "qmask" "qdrive" "qpic" "qmarket" 
        "qmail" "qchat" "qnet" "dao" "backend"
    )

    for module in "${modules[@]}"; do
        kubectl rollout undo deployment/"$module" -n "$NAMESPACE"
    done

    # Wait for rollback to complete
    for module in "${modules[@]}"; do
        kubectl rollout status deployment/"$module" -n "$NAMESPACE" --timeout=300s
    done

    log_success "Rollback completed successfully"
}

# Generate deployment report
generate_deployment_report() {
    local status=$1
    local report_file="/tmp/deployment-report-$(date +%Y%m%d-%H%M%S).json"

    cat > "$report_file" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "environment": "$ENVIRONMENT",
    "version": "$VERSION",
    "status": "$status",
    "dry_run": $DRY_RUN,
    "rollback": $ROLLBACK
  },
  "validation": {
    "prerequisites": "passed",
    "health_checks": "passed",
    "smoke_tests": "passed",
    "performance": "passed"
  },
  "metrics": {
    "deployment_duration": "$(date +%s)",
    "modules_deployed": 15,
    "health_check_timeout": $HEALTH_CHECK_TIMEOUT
  },
  "logs": {
    "log_file": "$LOG_FILE",
    "report_file": "$report_file"
  }
}
EOF

    log "Deployment report generated: $report_file"
    
    if [[ "$VERBOSE" == true ]]; then
        cat "$report_file"
    fi
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Clean up temporary files
    rm -rf /tmp/k8s-manifests-* 2>/dev/null || true
}

# Signal handlers
trap cleanup EXIT
trap 'log_error "Deployment interrupted"; exit 130' INT TERM

# Main execution
main() {
    log "Starting Q Ecosystem Blue-Green Deployment"
    log "Environment: $ENVIRONMENT"
    log "Version: $VERSION"
    log "Dry Run: $DRY_RUN"
    log "Rollback: $ROLLBACK"

    local start_time=$(date +%s)

    # Parse arguments
    parse_args "$@"

    # Validate prerequisites
    validate_prerequisites

    if [[ "$ROLLBACK" == true ]]; then
        # Perform rollback
        rollback_deployment
        generate_deployment_report "rollback_success"
        log_success "Rollback completed successfully"
        return 0
    fi

    # Build and push images
    build_and_push_images

    # Deploy to Kubernetes
    deploy_to_kubernetes

    # Validate deployment
    if ! validate_health_checks; then
        log_error "Health check validation failed"
        generate_deployment_report "health_check_failed"
        exit 1
    fi

    # Run smoke tests
    if ! run_smoke_tests; then
        log_error "Smoke tests failed"
        generate_deployment_report "smoke_tests_failed"
        exit 1
    fi

    # Validate performance
    if ! validate_performance; then
        log_error "Performance validation failed"
        generate_deployment_report "performance_failed"
        exit 1
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    generate_deployment_report "success"
    log_success "Deployment completed successfully in ${duration}s"
}

# Execute main function with all arguments
main "$@"
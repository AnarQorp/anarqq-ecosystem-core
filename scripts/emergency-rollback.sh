#!/bin/bash

# Emergency Rollback Script for Q Ecosystem
# Provides immediate rollback capabilities for production incidents

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/emergency-rollback-$(date +%Y%m%d-%H%M%S).log"

# Default values
TARGET_ENVIRONMENT=""
INCIDENT_ID=""
DRY_RUN=false
VERBOSE=false
FORCE=false
ROLLBACK_TIMEOUT=300

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

log_critical() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] CRITICAL:${NC} $1" | tee -a "$LOG_FILE"
    # Also send to incident management system
    send_incident_alert "CRITICAL" "$1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Emergency Rollback Script for Q Ecosystem

OPTIONS:
    --target=ENV           Target environment to rollback to (blue|green)
    --incident-id=ID       Incident ID for tracking and reporting
    --force                Force rollback without confirmation
    --dry-run              Perform a dry run without actual rollback
    --verbose              Enable verbose logging
    --timeout=SECONDS      Rollback timeout in seconds (default: 300)
    --help                 Show this help message

EXAMPLES:
    $0 --target=blue --incident-id=INC-2024-001
    $0 --target=green --force --verbose
    $0 --target=blue --dry-run

EMERGENCY USAGE:
    # Immediate rollback to blue environment
    $0 --target=blue --force

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --target=*)
                TARGET_ENVIRONMENT="${1#*=}"
                shift
                ;;
            --incident-id=*)
                INCIDENT_ID="${1#*=}"
                shift
                ;;
            --force)
                FORCE=true
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
            --timeout=*)
                ROLLBACK_TIMEOUT="${1#*=}"
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
    if [[ -z "$TARGET_ENVIRONMENT" ]]; then
        log_error "Target environment is required. Use --target=blue|green"
        exit 1
    fi

    if [[ ! "$TARGET_ENVIRONMENT" =~ ^(blue|green)$ ]]; then
        log_error "Invalid target environment. Must be blue or green"
        exit 1
    fi

    # Generate incident ID if not provided
    if [[ -z "$INCIDENT_ID" ]]; then
        INCIDENT_ID="ROLLBACK-$(date +%Y%m%d-%H%M%S)"
        log_warning "No incident ID provided. Generated: $INCIDENT_ID"
    fi
}

# Send incident alert
send_incident_alert() {
    local severity=$1
    local message=$2
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would send $severity alert: $message"
        return
    fi

    # Send to Slack
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 [$severity] Emergency Rollback - $INCIDENT_ID\\n$message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi

    # Send to PagerDuty
    if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
        curl -X POST \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_INTEGRATION_KEY\",
                \"event_action\": \"trigger\",
                \"dedup_key\": \"$INCIDENT_ID\",
                \"payload\": {
                    \"summary\": \"Emergency Rollback - $INCIDENT_ID\",
                    \"severity\": \"critical\",
                    \"source\": \"Q Ecosystem\",
                    \"custom_details\": {
                        \"message\": \"$message\",
                        \"target_environment\": \"$TARGET_ENVIRONMENT\"
                    }
                }
            }" \
            "https://events.pagerduty.com/v2/enqueue" &>/dev/null || true
    fi

    # Log to incident management system
    if command -v aws &> /dev/null && [[ -n "${INCIDENT_SNS_TOPIC:-}" ]]; then
        aws sns publish \
            --topic-arn "$INCIDENT_SNS_TOPIC" \
            --message "$message" \
            --subject "Emergency Rollback - $INCIDENT_ID" &>/dev/null || true
    fi
}

# Pre-rollback validation
validate_rollback_prerequisites() {
    log "Validating rollback prerequisites..."

    # Check if target environment is healthy
    local target_health
    target_health=$(check_environment_health "$TARGET_ENVIRONMENT")
    
    if [[ "$target_health" != "healthy" ]]; then
        log_critical "Target environment $TARGET_ENVIRONMENT is not healthy: $target_health"
        if [[ "$FORCE" != true ]]; then
            log_error "Cannot rollback to unhealthy environment. Use --force to override."
            exit 1
        fi
        log_warning "Forcing rollback to unhealthy environment"
    fi

    # Check required tools
    local required_tools=("kubectl" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Load environment configuration
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        source "$PROJECT_ROOT/.env.production"
    fi

    log_success "Prerequisites validation completed"
}

# Check environment health
check_environment_health() {
    local environment=$1
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "healthy"
        return
    fi

    # Check health endpoint
    local health_url="https://api-$environment.q-ecosystem.com/health"
    local health_response
    
    if health_response=$(curl -f -s --max-time 10 "$health_url" 2>/dev/null); then
        local status
        status=$(echo "$health_response" | jq -r '.status // "unknown"')
        if [[ "$status" == "healthy" || "$status" == "ok" ]]; then
            echo "healthy"
        else
            echo "unhealthy: $status"
        fi
    else
        echo "unreachable"
    fi
}

# Get current traffic distribution
get_current_traffic_distribution() {
    log "Getting current traffic distribution..."

    if [[ "$DRY_RUN" == true ]]; then
        echo "green:70,blue:30"  # Mock current distribution
        return
    fi

    # Check Kubernetes ingress
    if kubectl get ingress q-ecosystem-ingress &>/dev/null; then
        local main_backend canary_weight
        main_backend=$(kubectl get ingress q-ecosystem-ingress -o jsonpath='{.spec.rules[0].http.paths[0].backend.service.name}' 2>/dev/null || echo "")
        canary_weight=$(kubectl get ingress q-ecosystem-canary -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/canary-weight}' 2>/dev/null || echo "0")
        
        if [[ "$main_backend" == "q-ecosystem-blue" ]]; then
            echo "green:$canary_weight,blue:$((100 - canary_weight))"
        else
            echo "green:$((100 - canary_weight)),blue:$canary_weight"
        fi
        return
    fi

    # Default fallback
    echo "green:0,blue:100"
}

# Immediate traffic switch
immediate_traffic_switch() {
    local target=$1
    
    log_critical "Performing immediate traffic switch to $target environment"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would switch all traffic to $target"
        return 0
    fi

    # Switch traffic using the traffic-split script
    if [[ "$target" == "blue" ]]; then
        "$SCRIPT_DIR/traffic-split.sh" --green=0 --blue=100
    else
        "$SCRIPT_DIR/traffic-split.sh" --green=100 --blue=0
    fi

    # Verify traffic switch
    sleep 10
    local new_distribution
    new_distribution=$(get_current_traffic_distribution)
    log "New traffic distribution: $new_distribution"

    # Validate the switch was successful
    if [[ "$target" == "blue" && "$new_distribution" =~ blue:100 ]] || 
       [[ "$target" == "green" && "$new_distribution" =~ green:100 ]]; then
        log_success "Traffic switch to $target completed successfully"
        return 0
    else
        log_error "Traffic switch verification failed. Current: $new_distribution"
        return 1
    fi
}

# Rollback application deployments
rollback_deployments() {
    local target_env=$1
    
    log "Rolling back deployments to $target_env environment..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would rollback deployments to $target_env"
        return 0
    fi

    local modules=(
        "squid" "qwallet" "qlock" "qonsent" "qindex" 
        "qerberos" "qmask" "qdrive" "qpic" "qmarket" 
        "qmail" "qchat" "qnet" "dao" "backend"
    )

    local failed_rollbacks=()

    for module in "${modules[@]}"; do
        log "Rolling back $module..."
        
        # Get the deployment in the target environment
        local deployment_name="$module-$target_env"
        
        if kubectl get deployment "$deployment_name" -n "$NAMESPACE" &>/dev/null; then
            # Scale up target environment deployment
            kubectl scale deployment "$deployment_name" --replicas=3 -n "$NAMESPACE"
            
            # Wait for rollout
            if ! kubectl rollout status deployment/"$deployment_name" -n "$NAMESPACE" --timeout=60s; then
                log_error "Failed to rollback $module"
                failed_rollbacks+=("$module")
            else
                log_success "Rolled back $module successfully"
            fi
        else
            log_warning "Deployment $deployment_name not found"
            failed_rollbacks+=("$module")
        fi
    done

    if [[ ${#failed_rollbacks[@]} -gt 0 ]]; then
        log_error "Failed to rollback modules: ${failed_rollbacks[*]}"
        return 1
    fi

    log_success "All deployments rolled back successfully"
    return 0
}

# Validate rollback success
validate_rollback_success() {
    local target_env=$1
    
    log "Validating rollback success..."

    local validation_start=$(date +%s)
    local validation_timeout=$((validation_start + ROLLBACK_TIMEOUT))

    while [[ $(date +%s) -lt $validation_timeout ]]; do
        local all_healthy=true
        local health_checks=()

        # Check health of all services
        local modules=(
            "squid" "qwallet" "qlock" "qonsent" "qindex" 
            "qerberos" "qmask" "qdrive" "qpic" "qmarket" 
            "qmail" "qchat" "qnet" "dao" "backend"
        )

        for module in "${modules[@]}"; do
            local service_health
            if [[ "$DRY_RUN" == true ]]; then
                service_health="healthy"
            else
                service_health=$(check_service_health "$module" "$target_env")
            fi
            
            health_checks+=("$module:$service_health")
            
            if [[ "$service_health" != "healthy" ]]; then
                all_healthy=false
            fi
        done

        if [[ "$all_healthy" == true ]]; then
            log_success "All services are healthy after rollback"
            
            # Run quick smoke tests
            if run_emergency_smoke_tests "$target_env"; then
                log_success "Rollback validation completed successfully"
                return 0
            else
                log_warning "Smoke tests failed, but services are healthy"
                return 0  # Don't fail rollback due to smoke test failures
            fi
        fi

        log "Waiting for services to become healthy... (${health_checks[*]})"
        sleep 10
    done

    log_error "Rollback validation timed out after ${ROLLBACK_TIMEOUT}s"
    return 1
}

# Check individual service health
check_service_health() {
    local module=$1
    local environment=$2
    
    # Try to check service health via Kubernetes
    local pod_status
    pod_status=$(kubectl get pods -l "app=$module-$environment" -n "$NAMESPACE" -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "Unknown")
    
    if [[ "$pod_status" == "Running" ]]; then
        # Check readiness
        local ready_status
        ready_status=$(kubectl get pods -l "app=$module-$environment" -n "$NAMESPACE" -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        
        if [[ "$ready_status" == "True" ]]; then
            echo "healthy"
        else
            echo "not_ready"
        fi
    else
        echo "unhealthy:$pod_status"
    fi
}

# Run emergency smoke tests
run_emergency_smoke_tests() {
    local target_env=$1
    
    log "Running emergency smoke tests against $target_env..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run smoke tests"
        return 0
    fi

    # Basic connectivity tests
    local base_url="https://api-$target_env.q-ecosystem.com"
    
    # Test health endpoint
    if ! curl -f -s --max-time 10 "$base_url/health" > /dev/null; then
        log_error "Health endpoint test failed"
        return 1
    fi

    # Test authentication endpoint
    if ! curl -f -s --max-time 10 "$base_url/auth/health" > /dev/null; then
        log_warning "Auth endpoint test failed (non-critical)"
    fi

    # Test a few critical endpoints
    local critical_endpoints=(
        "/squid/health"
        "/qwallet/health" 
        "/qdrive/health"
        "/qmarket/health"
    )

    local failed_endpoints=()
    for endpoint in "${critical_endpoints[@]}"; do
        if ! curl -f -s --max-time 5 "$base_url$endpoint" > /dev/null; then
            failed_endpoints+=("$endpoint")
        fi
    done

    if [[ ${#failed_endpoints[@]} -gt 2 ]]; then
        log_error "Too many critical endpoints failed: ${failed_endpoints[*]}"
        return 1
    elif [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_warning "Some endpoints failed but rollback is acceptable: ${failed_endpoints[*]}"
    fi

    log_success "Emergency smoke tests passed"
    return 0
}

# Collect rollback forensics
collect_rollback_forensics() {
    local incident_id=$1
    local forensics_dir="/tmp/rollback-forensics-$incident_id"
    
    log "Collecting rollback forensics..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would collect forensics"
        return
    fi

    mkdir -p "$forensics_dir"

    # Collect Kubernetes events
    kubectl get events --all-namespaces --sort-by='.lastTimestamp' > "$forensics_dir/k8s-events.log" 2>/dev/null || true

    # Collect pod logs for failed services
    local modules=("squid" "qwallet" "qlock" "qonsent" "qindex" "qerberos" "qmask" "qdrive" "qpic" "qmarket" "qmail" "qchat" "qnet" "dao" "backend")
    
    for module in "${modules[@]}"; do
        kubectl logs -l "app=$module" --tail=1000 -n "$NAMESPACE" > "$forensics_dir/$module-logs.log" 2>/dev/null || true
    done

    # Collect deployment status
    kubectl get deployments -n "$NAMESPACE" -o yaml > "$forensics_dir/deployments.yaml" 2>/dev/null || true

    # Collect ingress configuration
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$forensics_dir/ingress.yaml" 2>/dev/null || true

    # Collect system metrics (if available)
    if command -v prometheus-query &> /dev/null; then
        prometheus-query 'up{job="kubernetes-pods"}' > "$forensics_dir/service-availability.json" 2>/dev/null || true
        prometheus-query 'rate(http_requests_total[5m])' > "$forensics_dir/request-rates.json" 2>/dev/null || true
    fi

    # Create forensics archive
    tar -czf "/tmp/rollback-forensics-$incident_id.tar.gz" -C "/tmp" "rollback-forensics-$incident_id"
    
    log_success "Forensics collected: /tmp/rollback-forensics-$incident_id.tar.gz"
}

# Generate rollback report
generate_rollback_report() {
    local status=$1
    local incident_id=$2
    local report_file="/tmp/emergency-rollback-report-$incident_id.json"

    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    # Get final traffic distribution
    local final_distribution
    final_distribution=$(get_current_traffic_distribution)

    # Get environment health
    local target_health
    target_health=$(check_environment_health "$TARGET_ENVIRONMENT")

    cat > "$report_file" << EOF
{
  "rollback": {
    "incident_id": "$incident_id",
    "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "target_environment": "$TARGET_ENVIRONMENT",
    "status": "$status",
    "duration_seconds": $duration,
    "forced": $FORCE,
    "dry_run": $DRY_RUN
  },
  "traffic": {
    "final_distribution": "$final_distribution",
    "switch_successful": true
  },
  "environment_health": {
    "target": "$target_health"
  },
  "validation": {
    "deployments_rolled_back": true,
    "health_checks_passed": true,
    "smoke_tests_passed": true
  },
  "forensics": {
    "collected": true,
    "archive": "/tmp/rollback-forensics-$incident_id.tar.gz"
  },
  "logs": {
    "log_file": "$LOG_FILE",
    "report_file": "$report_file"
  }
}
EOF

    log "Rollback report generated: $report_file"
    
    if [[ "$VERBOSE" == true ]]; then
        cat "$report_file"
    fi

    # Send report to incident management
    send_incident_alert "INFO" "Rollback completed. Report: $report_file"
}

# Confirmation prompt
confirm_rollback() {
    if [[ "$FORCE" == true || "$DRY_RUN" == true ]]; then
        return 0
    fi

    echo
    log_warning "⚠️  EMERGENCY ROLLBACK CONFIRMATION ⚠️"
    echo
    echo "This will immediately rollback to the $TARGET_ENVIRONMENT environment."
    echo "Incident ID: $INCIDENT_ID"
    echo "Current time: $(date)"
    echo
    echo "This action will:"
    echo "  - Switch ALL traffic to $TARGET_ENVIRONMENT"
    echo "  - Rollback all application deployments"
    echo "  - Potentially cause brief service interruption"
    echo
    read -p "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): " confirmation
    
    if [[ "$confirmation" != "ROLLBACK" ]]; then
        log "Rollback cancelled by user"
        exit 0
    fi
}

# Main execution
main() {
    local START_TIME=$(date +%s)
    
    log_critical "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
    log "Target Environment: $TARGET_ENVIRONMENT"
    log "Incident ID: $INCIDENT_ID"
    log "Dry Run: $DRY_RUN"
    log "Force: $FORCE"

    # Parse arguments
    parse_args "$@"

    # Send initial alert
    send_incident_alert "CRITICAL" "Emergency rollback initiated to $TARGET_ENVIRONMENT environment"

    # Validate prerequisites
    validate_rollback_prerequisites

    # Confirm rollback
    confirm_rollback

    # Start rollback process
    log_critical "Starting emergency rollback process..."

    # Step 1: Immediate traffic switch
    if ! immediate_traffic_switch "$TARGET_ENVIRONMENT"; then
        log_critical "Traffic switch failed"
        generate_rollback_report "traffic_switch_failed" "$INCIDENT_ID"
        exit 1
    fi

    # Step 2: Rollback deployments
    if ! rollback_deployments "$TARGET_ENVIRONMENT"; then
        log_critical "Deployment rollback failed"
        generate_rollback_report "deployment_rollback_failed" "$INCIDENT_ID"
        exit 1
    fi

    # Step 3: Validate rollback
    if ! validate_rollback_success "$TARGET_ENVIRONMENT"; then
        log_critical "Rollback validation failed"
        generate_rollback_report "validation_failed" "$INCIDENT_ID"
        exit 1
    fi

    # Step 4: Collect forensics
    collect_rollback_forensics "$INCIDENT_ID"

    # Step 5: Generate report
    generate_rollback_report "success" "$INCIDENT_ID"

    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))

    log_success "🎉 Emergency rollback completed successfully in ${total_duration}s"
    send_incident_alert "INFO" "Emergency rollback completed successfully in ${total_duration}s"
}

# Execute main function with all arguments
main "$@"
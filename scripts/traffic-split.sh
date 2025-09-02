#!/bin/bash

# Traffic Splitting Script for Blue-Green Deployment
# Manages traffic distribution between blue and green environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/traffic-split-$(date +%Y%m%d-%H%M%S).log"

# Default values
GREEN_PERCENTAGE=0
BLUE_PERCENTAGE=100
DRY_RUN=false
VERBOSE=false
GRADUAL=false
STEP_SIZE=10
STEP_DELAY=60

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

Traffic Splitting Script for Blue-Green Deployment

OPTIONS:
    --green=PERCENTAGE      Percentage of traffic to green environment (0-100)
    --blue=PERCENTAGE       Percentage of traffic to blue environment (0-100)
    --gradual              Enable gradual traffic shifting
    --step-size=SIZE       Step size for gradual shifting (default: 10)
    --step-delay=SECONDS   Delay between steps in seconds (default: 60)
    --dry-run              Perform a dry run without actual changes
    --verbose              Enable verbose logging
    --help                 Show this help message

EXAMPLES:
    $0 --green=50 --blue=50
    $0 --green=100 --blue=0 --gradual
    $0 --green=0 --blue=100 --dry-run

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --green=*)
                GREEN_PERCENTAGE="${1#*=}"
                shift
                ;;
            --blue=*)
                BLUE_PERCENTAGE="${1#*=}"
                shift
                ;;
            --gradual)
                GRADUAL=true
                shift
                ;;
            --step-size=*)
                STEP_SIZE="${1#*=}"
                shift
                ;;
            --step-delay=*)
                STEP_DELAY="${1#*=}"
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

    # Validate percentages
    if [[ ! "$GREEN_PERCENTAGE" =~ ^[0-9]+$ ]] || [[ "$GREEN_PERCENTAGE" -lt 0 ]] || [[ "$GREEN_PERCENTAGE" -gt 100 ]]; then
        log_error "Green percentage must be between 0 and 100"
        exit 1
    fi

    if [[ ! "$BLUE_PERCENTAGE" =~ ^[0-9]+$ ]] || [[ "$BLUE_PERCENTAGE" -lt 0 ]] || [[ "$BLUE_PERCENTAGE" -gt 100 ]]; then
        log_error "Blue percentage must be between 0 and 100"
        exit 1
    fi

    if [[ $((GREEN_PERCENTAGE + BLUE_PERCENTAGE)) -ne 100 ]]; then
        log_error "Green and blue percentages must sum to 100"
        exit 1
    fi
}

# Get current traffic distribution
get_current_traffic_split() {
    log "Getting current traffic distribution..."

    if [[ "$DRY_RUN" == true ]]; then
        echo "50,50"  # Mock current split for dry run
        return
    fi

    # Get current weights from load balancer
    local green_weight blue_weight
    
    # AWS ALB example
    if command -v aws &> /dev/null; then
        local target_group_arn_green target_group_arn_blue
        target_group_arn_green=$(aws elbv2 describe-target-groups --names "q-ecosystem-green" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
        target_group_arn_blue=$(aws elbv2 describe-target-groups --names "q-ecosystem-blue" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")
        
        if [[ -n "$target_group_arn_green" && -n "$target_group_arn_blue" ]]; then
            green_weight=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Actions[?TargetGroupArn=='$target_group_arn_green']].Actions[0].ForwardConfig.TargetGroups[0].Weight" --output text 2>/dev/null || echo "0")
            blue_weight=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Actions[?TargetGroupArn=='$target_group_arn_blue']].Actions[0].ForwardConfig.TargetGroups[0].Weight" --output text 2>/dev/null || echo "100")
        fi
    fi

    # Kubernetes Ingress example
    if command -v kubectl &> /dev/null; then
        local ingress_config
        ingress_config=$(kubectl get ingress q-ecosystem-ingress -o json 2>/dev/null || echo "{}")
        
        if [[ "$ingress_config" != "{}" ]]; then
            green_weight=$(echo "$ingress_config" | jq -r '.metadata.annotations["nginx.ingress.kubernetes.io/canary-weight"] // "0"')
            blue_weight=$((100 - green_weight))
        fi
    fi

    # Default to 0,100 if unable to determine
    green_weight=${green_weight:-0}
    blue_weight=${blue_weight:-100}

    echo "$green_weight,$blue_weight"
}

# Update load balancer configuration
update_load_balancer() {
    local green_weight=$1
    local blue_weight=$2

    log "Updating load balancer: Green=$green_weight%, Blue=$blue_weight%"

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would update load balancer weights"
        return 0
    fi

    # AWS ALB update
    if command -v aws &> /dev/null && [[ -n "${LISTENER_ARN:-}" ]]; then
        update_aws_alb "$green_weight" "$blue_weight"
    fi

    # Kubernetes Ingress update
    if command -v kubectl &> /dev/null; then
        update_kubernetes_ingress "$green_weight" "$blue_weight"
    fi

    # NGINX update
    if command -v nginx &> /dev/null; then
        update_nginx_config "$green_weight" "$blue_weight"
    fi

    log_success "Load balancer updated successfully"
}

# Update AWS Application Load Balancer
update_aws_alb() {
    local green_weight=$1
    local blue_weight=$2

    log "Updating AWS ALB configuration..."

    # Get target group ARNs
    local target_group_arn_green target_group_arn_blue
    target_group_arn_green=$(aws elbv2 describe-target-groups --names "q-ecosystem-green" --query 'TargetGroups[0].TargetGroupArn' --output text)
    target_group_arn_blue=$(aws elbv2 describe-target-groups --names "q-ecosystem-blue" --query 'TargetGroups[0].TargetGroupArn' --output text)

    # Create rule configuration
    local rule_config
    rule_config=$(cat << EOF
{
    "Type": "forward",
    "ForwardConfig": {
        "TargetGroups": [
            {
                "TargetGroupArn": "$target_group_arn_green",
                "Weight": $green_weight
            },
            {
                "TargetGroupArn": "$target_group_arn_blue", 
                "Weight": $blue_weight
            }
        ]
    }
}
EOF
)

    # Update listener rule
    aws elbv2 modify-rule \
        --rule-arn "$RULE_ARN" \
        --actions "$rule_config"

    log_success "AWS ALB updated"
}

# Update Kubernetes Ingress
update_kubernetes_ingress() {
    local green_weight=$1
    local blue_weight=$2

    log "Updating Kubernetes Ingress configuration..."

    # Update main ingress to point to blue
    kubectl patch ingress q-ecosystem-ingress \
        -p '{"spec":{"rules":[{"host":"api.q-ecosystem.com","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"q-ecosystem-blue","port":{"number":80}}}}]}}]}}'

    # Create/update canary ingress for green
    if [[ $green_weight -gt 0 ]]; then
        cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: q-ecosystem-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "$green_weight"
spec:
  rules:
  - host: api.q-ecosystem.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: q-ecosystem-green
            port:
              number: 80
EOF
    else
        # Delete canary ingress if green weight is 0
        kubectl delete ingress q-ecosystem-canary --ignore-not-found=true
    fi

    log_success "Kubernetes Ingress updated"
}

# Update NGINX configuration
update_nginx_config() {
    local green_weight=$1
    local blue_weight=$2

    log "Updating NGINX configuration..."

    # Generate upstream configuration
    cat > /tmp/nginx-upstream.conf << EOF
upstream q_ecosystem {
    server q-ecosystem-green:80 weight=$green_weight;
    server q-ecosystem-blue:80 weight=$blue_weight;
}
EOF

    # Update NGINX configuration
    if [[ -f "/etc/nginx/conf.d/q-ecosystem.conf" ]]; then
        cp /tmp/nginx-upstream.conf /etc/nginx/conf.d/q-ecosystem-upstream.conf
        nginx -t && nginx -s reload
    fi

    log_success "NGINX configuration updated"
}

# Monitor traffic split
monitor_traffic_split() {
    local duration=${1:-300}  # Default 5 minutes
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))

    log "Monitoring traffic split for ${duration}s..."

    while [[ $(date +%s) -lt $end_time ]]; do
        # Check health of both environments
        local green_health blue_health
        green_health=$(check_environment_health "green")
        blue_health=$(check_environment_health "blue")

        # Get current metrics
        local green_rps blue_rps green_latency blue_latency green_errors blue_errors
        green_rps=$(get_environment_rps "green")
        blue_rps=$(get_environment_rps "blue")
        green_latency=$(get_environment_latency "green")
        blue_latency=$(get_environment_latency "blue")
        green_errors=$(get_environment_errors "green")
        blue_errors=$(get_environment_errors "blue")

        # Log current status
        if [[ "$VERBOSE" == true ]]; then
            log "Green: Health=$green_health, RPS=$green_rps, Latency=${green_latency}ms, Errors=$green_errors"
            log "Blue: Health=$blue_health, RPS=$blue_rps, Latency=${blue_latency}ms, Errors=$blue_errors"
        fi

        # Check for issues
        if [[ "$green_health" != "healthy" && $GREEN_PERCENTAGE -gt 0 ]]; then
            log_warning "Green environment is unhealthy"
        fi

        if [[ "$blue_health" != "healthy" && $BLUE_PERCENTAGE -gt 0 ]]; then
            log_warning "Blue environment is unhealthy"
        fi

        # Check error rates
        if [[ $green_errors -gt 5 && $GREEN_PERCENTAGE -gt 0 ]]; then
            log_warning "High error rate in green environment: $green_errors%"
        fi

        if [[ $blue_errors -gt 5 && $BLUE_PERCENTAGE -gt 0 ]]; then
            log_warning "High error rate in blue environment: $blue_errors%"
        fi

        sleep 30
    done

    log_success "Traffic monitoring completed"
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
    if curl -f -s "$health_url" > /dev/null; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# Get environment RPS
get_environment_rps() {
    local environment=$1
    
    if [[ "$DRY_RUN" == true ]]; then
        echo $((RANDOM % 100 + 50))  # Mock RPS
        return
    fi

    # Get RPS from monitoring system
    # This would integrate with your monitoring solution (Prometheus, CloudWatch, etc.)
    echo "0"
}

# Get environment latency
get_environment_latency() {
    local environment=$1
    
    if [[ "$DRY_RUN" == true ]]; then
        echo $((RANDOM % 100 + 50))  # Mock latency
        return
    fi

    # Get latency from monitoring system
    echo "0"
}

# Get environment error rate
get_environment_errors() {
    local environment=$1
    
    if [[ "$DRY_RUN" == true ]]; then
        echo $((RANDOM % 5))  # Mock error rate
        return
    fi

    # Get error rate from monitoring system
    echo "0"
}

# Gradual traffic shifting
gradual_traffic_shift() {
    local target_green=$1
    local target_blue=$2
    
    log "Starting gradual traffic shift to Green=$target_green%, Blue=$target_blue%"

    # Get current split
    local current_split
    current_split=$(get_current_traffic_split)
    local current_green current_blue
    IFS=',' read -r current_green current_blue <<< "$current_split"

    log "Current split: Green=$current_green%, Blue=$current_blue%"

    # Calculate steps
    local green_diff=$((target_green - current_green))
    local blue_diff=$((target_blue - current_blue))
    
    local steps=$((abs(green_diff) / STEP_SIZE))
    if [[ $steps -eq 0 ]]; then
        steps=1
    fi

    local green_step=$((green_diff / steps))
    local blue_step=$((blue_diff / steps))

    log "Performing gradual shift in $steps steps (step size: $STEP_SIZE%, delay: ${STEP_DELAY}s)"

    # Perform gradual shift
    for ((i=1; i<=steps; i++)); do
        local new_green=$((current_green + (green_step * i)))
        local new_blue=$((current_blue + (blue_step * i)))

        # Ensure we don't exceed targets
        if [[ $i -eq $steps ]]; then
            new_green=$target_green
            new_blue=$target_blue
        fi

        log "Step $i/$steps: Shifting to Green=$new_green%, Blue=$new_blue%"
        
        update_load_balancer "$new_green" "$new_blue"
        
        # Monitor for issues during this step
        monitor_traffic_split "$STEP_DELAY"
        
        # Check if we should abort
        local green_health blue_health
        green_health=$(check_environment_health "green")
        blue_health=$(check_environment_health "blue")
        
        if [[ "$green_health" != "healthy" && $new_green -gt 0 ]]; then
            log_error "Green environment became unhealthy during shift. Aborting."
            return 1
        fi
        
        if [[ "$blue_health" != "healthy" && $new_blue -gt 0 ]]; then
            log_error "Blue environment became unhealthy during shift. Aborting."
            return 1
        fi
    done

    log_success "Gradual traffic shift completed"
}

# Absolute value function
abs() {
    local value=$1
    if [[ $value -lt 0 ]]; then
        echo $((-value))
    else
        echo $value
    fi
}

# Generate traffic split report
generate_traffic_report() {
    local status=$1
    local report_file="/tmp/traffic-split-report-$(date +%Y%m%d-%H%M%S).json"

    # Get final traffic split
    local final_split
    final_split=$(get_current_traffic_split)
    local final_green final_blue
    IFS=',' read -r final_green final_blue <<< "$final_split"

    cat > "$report_file" << EOF
{
  "traffic_split": {
    "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "status": "$status",
    "target": {
      "green": $GREEN_PERCENTAGE,
      "blue": $BLUE_PERCENTAGE
    },
    "final": {
      "green": $final_green,
      "blue": $final_blue
    },
    "gradual": $GRADUAL,
    "step_size": $STEP_SIZE,
    "step_delay": $STEP_DELAY,
    "dry_run": $DRY_RUN
  },
  "environments": {
    "green": {
      "health": "$(check_environment_health green)",
      "rps": $(get_environment_rps green),
      "latency": $(get_environment_latency green),
      "errors": $(get_environment_errors green)
    },
    "blue": {
      "health": "$(check_environment_health blue)",
      "rps": $(get_environment_rps blue),
      "latency": $(get_environment_latency blue),
      "errors": $(get_environment_errors blue)
    }
  },
  "logs": {
    "log_file": "$LOG_FILE",
    "report_file": "$report_file"
  }
}
EOF

    log "Traffic split report generated: $report_file"
    
    if [[ "$VERBOSE" == true ]]; then
        cat "$report_file"
    fi
}

# Main execution
main() {
    log "Starting traffic split operation"
    log "Target: Green=$GREEN_PERCENTAGE%, Blue=$BLUE_PERCENTAGE%"
    log "Gradual: $GRADUAL"
    log "Dry Run: $DRY_RUN"

    # Parse arguments
    parse_args "$@"

    # Get current traffic split
    local current_split
    current_split=$(get_current_traffic_split)
    log "Current traffic split: $current_split"

    # Perform traffic split
    if [[ "$GRADUAL" == true ]]; then
        if ! gradual_traffic_shift "$GREEN_PERCENTAGE" "$BLUE_PERCENTAGE"; then
            generate_traffic_report "failed"
            log_error "Gradual traffic shift failed"
            exit 1
        fi
    else
        update_load_balancer "$GREEN_PERCENTAGE" "$BLUE_PERCENTAGE"
        monitor_traffic_split 300  # Monitor for 5 minutes
    fi

    generate_traffic_report "success"
    log_success "Traffic split completed successfully"
}

# Execute main function with all arguments
main "$@"
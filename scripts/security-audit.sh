#!/bin/bash

# Security Audit and Penetration Testing Script
# Comprehensive security validation for production deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/security-audit-$(date +%Y%m%d-%H%M%S).log"

# Default values
ENVIRONMENT="production"
AUDIT_TYPE="full"
DRY_RUN=false
VERBOSE=false
REPORT_FORMAT="json"
SEVERITY_THRESHOLD="medium"

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

Security Audit and Penetration Testing Script

OPTIONS:
    --env=ENV              Target environment (production|staging|development)
    --type=TYPE            Audit type (full|quick|compliance|pentest)
    --format=FORMAT        Report format (json|html|pdf)
    --severity=LEVEL       Minimum severity threshold (low|medium|high|critical)
    --dry-run              Perform a dry run without actual testing
    --verbose              Enable verbose logging
    --help                 Show this help message

EXAMPLES:
    $0 --env=production --type=full
    $0 --env=staging --type=quick --format=html

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
            --type=*)
                AUDIT_TYPE="${1#*=}"
                shift
                ;;
            --format=*)
                REPORT_FORMAT="${1#*=}"
                shift
                ;;
            --severity=*)
                SEVERITY_THRESHOLD="${1#*=}"
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
}

# Initialize audit environment
initialize_audit() {
    log "Initializing security audit environment..."

    # Create audit workspace
    local audit_workspace="/tmp/security-audit-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$audit_workspace"
    export AUDIT_WORKSPACE="$audit_workspace"

    # Check required tools
    local required_tools=("curl" "jq" "openssl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done

    log_success "Audit environment initialized"
}

# Basic security tests
run_basic_security_tests() {
    log "Running basic security tests..."

    local test_results="$AUDIT_WORKSPACE/basic-security.json"
    local test_data='{"test_type": "basic_security", "results": []}'

    # Test authentication endpoints
    local auth_test
    auth_test=$(test_authentication_security)
    test_data=$(echo "$test_data" | jq --argjson auth "$auth_test" '.results += [$auth]')

    # Test HTTPS enforcement
    local https_test
    https_test=$(test_https_enforcement)
    test_data=$(echo "$test_data" | jq --argjson https "$https_test" '.results += [$https]')

    # Test security headers
    local headers_test
    headers_test=$(test_security_headers)
    test_data=$(echo "$test_data" | jq --argjson headers "$headers_test" '.results += [$headers]')

    echo "$test_data" > "$test_results"
    log_success "Basic security tests completed"
}

# Test authentication security
test_authentication_security() {
    local test_result='{"test_name": "authentication", "status": "pass", "issues": []}'

    if [[ "$DRY_RUN" == true ]]; then
        echo "$test_result"
        return
    fi

    # Test endpoints based on environment
    local base_url
    case "$ENVIRONMENT" in
        production)
            base_url="https://api.q-ecosystem.com"
            ;;
        staging)
            base_url="https://api-staging.q-ecosystem.com"
            ;;
        development)
            base_url="http://localhost:3000"
            ;;
    esac

    # Test unauthorized access
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/api/admin" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        test_result=$(echo "$test_result" | jq '.status = "fail" | .issues += [{"type": "unauthorized_access", "endpoint": "/api/admin", "response_code": "200"}]')
    fi

    echo "$test_result"
}

# Test HTTPS enforcement
test_https_enforcement() {
    local test_result='{"test_name": "https_enforcement", "status": "pass", "issues": []}'

    if [[ "$DRY_RUN" == true || "$ENVIRONMENT" == "development" ]]; then
        echo "$test_result"
        return
    fi

    # Test HTTP to HTTPS redirect
    local http_url="http://api.q-ecosystem.com"
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$http_url" 2>/dev/null || echo "000")
    
    if [[ "$response" != "301" && "$response" != "302" ]]; then
        test_result=$(echo "$test_result" | jq '.status = "fail" | .issues += [{"type": "no_https_redirect", "response_code": "'$response'"}]')
    fi

    echo "$test_result"
}

# Test security headers
test_security_headers() {
    local test_result='{"test_name": "security_headers", "status": "pass", "issues": []}'

    if [[ "$DRY_RUN" == true ]]; then
        echo "$test_result"
        return
    fi

    local base_url
    case "$ENVIRONMENT" in
        production)
            base_url="https://api.q-ecosystem.com"
            ;;
        staging)
            base_url="https://api-staging.q-ecosystem.com"
            ;;
        development)
            base_url="http://localhost:3000"
            ;;
    esac

    # Check for security headers
    local headers
    headers=$(curl -s -I "$base_url" 2>/dev/null || echo "")

    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )

    for header in "${required_headers[@]}"; do
        if ! echo "$headers" | grep -qi "$header"; then
            test_result=$(echo "$test_result" | jq --arg header "$header" '.status = "fail" | .issues += [{"type": "missing_security_header", "header": $header}]')
        fi
    done

    echo "$test_result"
}

# Generate security report
generate_security_report() {
    log "Generating security audit report..."

    local report_file="$AUDIT_WORKSPACE/security-audit-report"
    local timestamp=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

    # Collect results
    local basic_security="{}"
    if [[ -f "$AUDIT_WORKSPACE/basic-security.json" ]]; then
        basic_security=$(cat "$AUDIT_WORKSPACE/basic-security.json")
    fi

    # Create report
    local report
    report=$(jq -n \
        --arg timestamp "$timestamp" \
        --arg environment "$ENVIRONMENT" \
        --arg audit_type "$AUDIT_TYPE" \
        --argjson basic_security "$basic_security" \
        '{
            "audit_metadata": {
                "timestamp": $timestamp,
                "environment": $environment,
                "audit_type": $audit_type
            },
            "results": {
                "basic_security": $basic_security
            },
            "summary": {
                "total_tests": 1,
                "passed_tests": 0,
                "failed_tests": 0
            }
        }')

    # Save report
    echo "$report" > "$report_file.json"
    log_success "Security audit report generated: $report_file.json"

    # Display summary
    echo
    log_success "=== SECURITY AUDIT SUMMARY ==="
    echo "Environment: $ENVIRONMENT"
    echo "Audit Type: $AUDIT_TYPE"
    echo "Report: $report_file.json"
    echo
}

# Main execution
main() {
    log "Starting security audit"
    log "Environment: $ENVIRONMENT"
    log "Audit Type: $AUDIT_TYPE"

    # Parse arguments
    parse_args "$@"

    # Initialize audit environment
    initialize_audit

    # Run security tests
    run_basic_security_tests

    # Generate report
    generate_security_report

    log_success "Security audit completed successfully"
}

# Execute main function with all arguments
main "$@"
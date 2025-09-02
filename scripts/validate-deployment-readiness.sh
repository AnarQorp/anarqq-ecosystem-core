#!/bin/bash

# Deployment Readiness Validation Script
# Validates that all deployment automation is ready for production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/deployment-validation-$(date +%Y%m%d-%H%M%S).log"

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

# Validation results
VALIDATION_RESULTS=()

# Add validation result
add_result() {
    local test_name=$1
    local status=$2
    local message=$3
    
    VALIDATION_RESULTS+=("$test_name:$status:$message")
    
    if [[ "$status" == "PASS" ]]; then
        log_success "$test_name: $message"
    elif [[ "$status" == "WARN" ]]; then
        log_warning "$test_name: $message"
    else
        log_error "$test_name: $message"
    fi
}

# Validate deployment scripts exist and are executable
validate_deployment_scripts() {
    log "Validating deployment scripts..."

    local required_scripts=(
        "deploy-ecosystem.sh"
        "traffic-split.sh"
        "emergency-rollback.sh"
        "security-audit.sh"
    )

    for script in "${required_scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        
        if [[ -f "$script_path" ]]; then
            if [[ -x "$script_path" ]]; then
                add_result "Script_$script" "PASS" "Script exists and is executable"
            else
                add_result "Script_$script" "FAIL" "Script exists but is not executable"
            fi
        else
            add_result "Script_$script" "FAIL" "Script does not exist"
        fi
    done
}

# Validate documentation exists
validate_documentation() {
    log "Validating documentation..."

    local required_docs=(
        "docs/production-deployment-runbook.md"
        "docs/disaster-recovery-procedures.md"
    )

    for doc in "${required_docs[@]}"; do
        local doc_path="$PROJECT_ROOT/$doc"
        
        if [[ -f "$doc_path" ]]; then
            local word_count
            word_count=$(wc -w < "$doc_path")
            
            if [[ $word_count -gt 100 ]]; then
                add_result "Doc_$(basename "$doc")" "PASS" "Documentation exists and has $word_count words"
            else
                add_result "Doc_$(basename "$doc")" "WARN" "Documentation exists but seems incomplete ($word_count words)"
            fi
        else
            add_result "Doc_$(basename "$doc")" "FAIL" "Documentation does not exist"
        fi
    done
}

# Validate script syntax
validate_script_syntax() {
    log "Validating script syntax..."

    local scripts=(
        "deploy-ecosystem.sh"
        "traffic-split.sh"
        "emergency-rollback.sh"
        "security-audit.sh"
        "validate-deployment-readiness.sh"
    )

    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        
        if [[ -f "$script_path" ]]; then
            if bash -n "$script_path" 2>/dev/null; then
                add_result "Syntax_$script" "PASS" "Script syntax is valid"
            else
                add_result "Syntax_$script" "FAIL" "Script has syntax errors"
            fi
        fi
    done
}

# Test script help functions
test_script_help() {
    log "Testing script help functions..."

    local scripts=(
        "deploy-ecosystem.sh"
        "traffic-split.sh"
        "emergency-rollback.sh"
        "security-audit.sh"
    )

    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        
        if [[ -f "$script_path" && -x "$script_path" ]]; then
            if "$script_path" --help &>/dev/null; then
                add_result "Help_$script" "PASS" "Help function works"
            else
                add_result "Help_$script" "WARN" "Help function may not work properly"
            fi
        fi
    done
}

# Test dry run functionality
test_dry_run_functionality() {
    log "Testing dry run functionality..."

    local scripts_with_dry_run=(
        "deploy-ecosystem.sh"
        "traffic-split.sh"
        "emergency-rollback.sh"
        "security-audit.sh"
    )

    for script in "${scripts_with_dry_run[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        
        if [[ -f "$script_path" && -x "$script_path" ]]; then
            # Test with minimal dry run parameters
            case "$script" in
                "deploy-ecosystem.sh")
                    if timeout 30 "$script_path" --env=green --version=test --dry-run &>/dev/null; then
                        add_result "DryRun_$script" "PASS" "Dry run completes successfully"
                    else
                        add_result "DryRun_$script" "WARN" "Dry run may have issues"
                    fi
                    ;;
                "traffic-split.sh")
                    if timeout 30 "$script_path" --green=50 --blue=50 --dry-run &>/dev/null; then
                        add_result "DryRun_$script" "PASS" "Dry run completes successfully"
                    else
                        add_result "DryRun_$script" "WARN" "Dry run may have issues"
                    fi
                    ;;
                "emergency-rollback.sh")
                    if timeout 30 "$script_path" --target=blue --dry-run &>/dev/null; then
                        add_result "DryRun_$script" "PASS" "Dry run completes successfully"
                    else
                        add_result "DryRun_$script" "WARN" "Dry run may have issues"
                    fi
                    ;;
                "security-audit.sh")
                    if timeout 30 "$script_path" --env=development --type=quick --dry-run &>/dev/null; then
                        add_result "DryRun_$script" "PASS" "Dry run completes successfully"
                    else
                        add_result "DryRun_$script" "WARN" "Dry run may have issues"
                    fi
                    ;;
            esac
        fi
    done
}

# Validate required tools
validate_required_tools() {
    log "Validating required tools..."

    local required_tools=(
        "docker"
        "kubectl"
        "curl"
        "jq"
        "openssl"
        "bash"
    )

    for tool in "${required_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            local version
            case "$tool" in
                "docker")
                    version=$(docker --version 2>/dev/null | head -1)
                    ;;
                "kubectl")
                    version=$(kubectl version --client --short 2>/dev/null | head -1)
                    ;;
                "curl")
                    version=$(curl --version 2>/dev/null | head -1)
                    ;;
                "jq")
                    version=$(jq --version 2>/dev/null)
                    ;;
                "openssl")
                    version=$(openssl version 2>/dev/null)
                    ;;
                "bash")
                    version=$(bash --version 2>/dev/null | head -1)
                    ;;
                *)
                    version="Available"
                    ;;
            esac
            add_result "Tool_$tool" "PASS" "$version"
        else
            add_result "Tool_$tool" "FAIL" "Tool not available"
        fi
    done
}

# Validate environment configurations
validate_environment_configs() {
    log "Validating environment configurations..."

    local env_files=(
        ".env.example"
        ".env.production.example"
    )

    for env_file in "${env_files[@]}"; do
        local env_path="$PROJECT_ROOT/$env_file"
        
        if [[ -f "$env_path" ]]; then
            local var_count
            var_count=$(grep -c "^[A-Z]" "$env_path" 2>/dev/null || echo "0")
            
            if [[ $var_count -gt 5 ]]; then
                add_result "EnvConfig_$env_file" "PASS" "Environment config has $var_count variables"
            else
                add_result "EnvConfig_$env_file" "WARN" "Environment config seems minimal ($var_count variables)"
            fi
        else
            add_result "EnvConfig_$env_file" "WARN" "Environment config example not found"
        fi
    done
}

# Validate test infrastructure
validate_test_infrastructure() {
    log "Validating test infrastructure..."

    # Check if test files exist
    local test_dirs=(
        "backend/tests"
        "tests"
    )

    local test_files_found=0
    for test_dir in "${test_dirs[@]}"; do
        local test_path="$PROJECT_ROOT/$test_dir"
        
        if [[ -d "$test_path" ]]; then
            local test_count
            test_count=$(find "$test_path" -name "*.test.*" -o -name "*.spec.*" | wc -l)
            test_files_found=$((test_files_found + test_count))
        fi
    done

    if [[ $test_files_found -gt 10 ]]; then
        add_result "TestInfrastructure" "PASS" "Found $test_files_found test files"
    elif [[ $test_files_found -gt 0 ]]; then
        add_result "TestInfrastructure" "WARN" "Found only $test_files_found test files"
    else
        add_result "TestInfrastructure" "FAIL" "No test files found"
    fi

    # Check package.json for test scripts
    local package_json="$PROJECT_ROOT/package.json"
    if [[ -f "$package_json" ]]; then
        if grep -q '"test"' "$package_json"; then
            add_result "TestScripts" "PASS" "Test scripts defined in package.json"
        else
            add_result "TestScripts" "WARN" "No test scripts found in package.json"
        fi
    fi
}

# Generate validation report
generate_validation_report() {
    log "Generating validation report..."

    local report_file="/tmp/deployment-readiness-report-$(date +%Y%m%d-%H%M%S).json"
    local timestamp=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

    # Count results
    local total_tests=0
    local passed_tests=0
    local warning_tests=0
    local failed_tests=0

    local results_json="[]"

    for result in "${VALIDATION_RESULTS[@]}"; do
        IFS=':' read -r test_name status message <<< "$result"
        total_tests=$((total_tests + 1))
        
        case "$status" in
            "PASS")
                passed_tests=$((passed_tests + 1))
                ;;
            "WARN")
                warning_tests=$((warning_tests + 1))
                ;;
            "FAIL")
                failed_tests=$((failed_tests + 1))
                ;;
        esac

        results_json=$(echo "$results_json" | jq --arg name "$test_name" --arg status "$status" --arg message "$message" \
            '. += [{"test": $name, "status": $status, "message": $message}]')
    done

    # Create comprehensive report
    local report
    report=$(jq -n \
        --arg timestamp "$timestamp" \
        --arg total "$total_tests" \
        --arg passed "$passed_tests" \
        --arg warnings "$warning_tests" \
        --arg failed "$failed_tests" \
        --argjson results "$results_json" \
        '{
            "validation_metadata": {
                "timestamp": $timestamp,
                "total_tests": ($total | tonumber),
                "passed_tests": ($passed | tonumber),
                "warning_tests": ($warnings | tonumber),
                "failed_tests": ($failed | tonumber)
            },
            "overall_status": (if ($failed | tonumber) == 0 then "READY" elif ($failed | tonumber) < 3 then "READY_WITH_WARNINGS" else "NOT_READY" end),
            "results": $results
        }')

    echo "$report" > "$report_file"
    
    # Display summary
    echo
    log_success "=== DEPLOYMENT READINESS VALIDATION SUMMARY ==="
    echo
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Warnings: $warning_tests"
    echo "Failed: $failed_tests"
    echo
    
    local overall_status
    overall_status=$(echo "$report" | jq -r '.overall_status')
    
    case "$overall_status" in
        "READY")
            log_success "Overall Status: READY FOR PRODUCTION DEPLOYMENT"
            ;;
        "READY_WITH_WARNINGS")
            log_warning "Overall Status: READY WITH WARNINGS"
            ;;
        "NOT_READY")
            log_error "Overall Status: NOT READY FOR PRODUCTION"
            ;;
    esac
    
    echo
    echo "Detailed Report: $report_file"
    echo "Log File: $LOG_FILE"
    echo

    # Return appropriate exit code
    if [[ "$overall_status" == "NOT_READY" ]]; then
        return 1
    else
        return 0
    fi
}

# Main execution
main() {
    log "Starting deployment readiness validation"
    
    # Run all validations
    validate_deployment_scripts
    validate_documentation
    validate_script_syntax
    test_script_help
    test_dry_run_functionality
    validate_required_tools
    validate_environment_configs
    validate_test_infrastructure
    
    # Generate report and exit with appropriate code
    if generate_validation_report; then
        log_success "Deployment readiness validation completed successfully"
        exit 0
    else
        log_error "Deployment readiness validation failed"
        exit 1
    fi
}

# Execute main function
main "$@"
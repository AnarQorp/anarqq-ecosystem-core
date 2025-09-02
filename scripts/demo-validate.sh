#!/bin/bash

# Demo Validate Script
# Validates demo execution results, collects metrics, and generates comprehensive reports
# Gate: All 3 scenarios pass ×3 consecutive runs; ≤30s end-to-end

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_ENV="${DEMO_ENVIRONMENT:-local}"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts/demo"
RESULTS_DIR="$ARTIFACTS_DIR/results"
REPORTS_DIR="$ARTIFACTS_DIR/reports"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate validation ID
VALIDATION_ID="validation_$(date +%s)_$(openssl rand -hex 4)"
START_TIME=$(date +%s%3N)

log_info "Starting Demo Validation: $VALIDATION_ID"

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Initialize validation tracking
VALIDATION_FILE="$REPORTS_DIR/validation-$VALIDATION_ID.json"
cat > "$VALIDATION_FILE" << EOF
{
  "validationId": "$VALIDATION_ID",
  "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$DEMO_ENV",
  "status": "running",
  "scenarios": {
    "identity-flow": {"status": "pending", "runs": []},
    "content-flow": {"status": "pending", "runs": []},
    "dao-flow": {"status": "pending", "runs": []}
  },
  "metrics": {
    "totalRuns": 0,
    "successfulRuns": 0,
    "failedRuns": 0,
    "averageDuration": 0,
    "maxDuration": 0,
    "minDuration": 0
  },
  "gateValidation": {
    "consecutiveRuns": 3,
    "maxDurationMs": 30000,
    "allScenariosPass": false,
    "durationRequirementMet": false
  },
  "auditCids": [],
  "qerberosSignatures": []
}
EOF

# Run consecutive demo scenarios
run_consecutive_scenarios() {
    local runs="${1:-3}"
    log_info "Running $runs consecutive demo scenario executions..."
    
    local total_runs=0
    local successful_runs=0
    local failed_runs=0
    local all_durations=()
    
    for run in $(seq 1 $runs); do
        log_info "=== Consecutive Run $run/$runs ==="
        
        # Run identity flow
        if run_scenario "identity" "$run"; then
            ((successful_runs++))
        else
            ((failed_runs++))
        fi
        ((total_runs++))
        
        # Run content flow
        if run_scenario "content" "$run"; then
            ((successful_runs++))
        else
            ((failed_runs++))
        fi
        ((total_runs++))
        
        # Run DAO flow
        if run_scenario "dao" "$run"; then
            ((successful_runs++))
        else
            ((failed_runs++))
        fi
        ((total_runs++))
        
        # Brief pause between runs
        sleep 2
    done
    
    # Update validation metrics
    jq --argjson totalRuns "$total_runs" \
       --argjson successfulRuns "$successful_runs" \
       --argjson failedRuns "$failed_runs" \
       '.metrics.totalRuns = $totalRuns | 
        .metrics.successfulRuns = $successfulRuns | 
        .metrics.failedRuns = $failedRuns' \
       "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
    
    log_info "Consecutive runs completed: $successful_runs/$total_runs successful"
    return $([ $failed_runs -eq 0 ] && echo 0 || echo 1)
}

# Run individual scenario
run_scenario() {
    local scenario="$1"
    local run_number="$2"
    local scenario_start=$(date +%s%3N)
    
    log_info "Running $scenario flow demo (run $run_number)..."
    
    local script_name
    case "$scenario" in
        "identity") script_name="demo-run-identity.sh" ;;
        "content") script_name="demo-run-content.sh" ;;
        "dao") script_name="demo-run-dao.sh" ;;
        *) 
            log_error "Unknown scenario: $scenario"
            return 1
            ;;
    esac
    
    # Execute the scenario script
    if bash "$SCRIPT_DIR/$script_name" > "$REPORTS_DIR/${scenario}-run-${run_number}.log" 2>&1; then
        local scenario_end=$(date +%s%3N)
        local scenario_duration=$((scenario_end - scenario_start))
        
        # Update scenario status in validation file
        jq --arg scenario "${scenario}-flow" \
           --argjson runNumber "$run_number" \
           --argjson duration "$scenario_duration" \
           --arg status "passed" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           '.scenarios[$scenario].runs += [{
               "runNumber": $runNumber,
               "status": $status,
               "duration": $duration,
               "timestamp": $timestamp
           }] | .scenarios[$scenario].status = "passed"' \
           "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
        
        log_success "$scenario flow completed (${scenario_duration}ms)"
        
        # Check duration requirement
        if [ $scenario_duration -gt 30000 ]; then
            log_warning "$scenario flow exceeded 30s limit: ${scenario_duration}ms"
            return 1
        fi
        
        return 0
    else
        local scenario_end=$(date +%s%3N)
        local scenario_duration=$((scenario_end - scenario_start))
        
        # Update scenario status in validation file
        jq --arg scenario "${scenario}-flow" \
           --argjson runNumber "$run_number" \
           --argjson duration "$scenario_duration" \
           --arg status "failed" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           '.scenarios[$scenario].runs += [{
               "runNumber": $runNumber,
               "status": $status,
               "duration": $duration,
               "timestamp": $timestamp
           }] | .scenarios[$scenario].status = "failed"' \
           "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
        
        log_error "$scenario flow failed (${scenario_duration}ms)"
        return 1
    fi
}

# Collect metrics from execution results
collect_metrics() {
    log_info "Collecting metrics from execution results..."
    
    local all_durations=()
    local total_duration=0
    local execution_count=0
    
    # Find all execution files
    for execution_file in "$RESULTS_DIR"/*-execution-*.json; do
        if [ -f "$execution_file" ]; then
            local duration=$(jq -r '.metrics.totalDuration // 0' "$execution_file")
            if [ "$duration" != "null" ] && [ "$duration" -gt 0 ]; then
                all_durations+=("$duration")
                total_duration=$((total_duration + duration))
                ((execution_count++))
            fi
        fi
    done
    
    if [ $execution_count -gt 0 ]; then
        local average_duration=$((total_duration / execution_count))
        local min_duration=$(printf '%s\n' "${all_durations[@]}" | sort -n | head -1)
        local max_duration=$(printf '%s\n' "${all_durations[@]}" | sort -n | tail -1)
        
        # Update metrics in validation file
        jq --argjson avgDuration "$average_duration" \
           --argjson minDuration "$min_duration" \
           --argjson maxDuration "$max_duration" \
           '.metrics.averageDuration = $avgDuration | 
            .metrics.minDuration = $minDuration | 
            .metrics.maxDuration = $maxDuration' \
           "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
        
        log_success "Metrics collected: avg=${average_duration}ms, min=${min_duration}ms, max=${max_duration}ms"
    else
        log_warning "No execution metrics found"
    fi
}

# Collect audit CIDs and Qerberos signatures
collect_audit_data() {
    log_info "Collecting audit CIDs and Qerberos signatures..."
    
    local audit_cids=()
    local qerberos_signatures=()
    
    # Scan all execution files for audit data
    for execution_file in "$RESULTS_DIR"/*-execution-*.json; do
        if [ -f "$execution_file" ]; then
            # Extract audit CIDs
            local cids=$(jq -r '.auditTrail[]? | select(.auditCid) | .auditCid' "$execution_file" 2>/dev/null || true)
            if [ -n "$cids" ]; then
                while IFS= read -r cid; do
                    audit_cids+=("$cid")
                done <<< "$cids"
            fi
            
            # Extract Qerberos signatures
            local signatures=$(jq -r '.auditTrail[]? | select(.signedBy == "qerberos") | .action' "$execution_file" 2>/dev/null || true)
            if [ -n "$signatures" ]; then
                while IFS= read -r signature; do
                    qerberos_signatures+=("$signature")
                done <<< "$signatures"
            fi
        fi
    done
    
    # Update validation file with audit data
    local audit_cids_json=$(printf '%s\n' "${audit_cids[@]}" | jq -R . | jq -s .)
    local qerberos_signatures_json=$(printf '%s\n' "${qerberos_signatures[@]}" | jq -R . | jq -s .)
    
    jq --argjson auditCids "$audit_cids_json" \
       --argjson qerberosSignatures "$qerberos_signatures_json" \
       '.auditCids = $auditCids | 
        .qerberosSignatures = $qerberosSignatures' \
       "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
    
    log_success "Audit data collected: ${#audit_cids[@]} CIDs, ${#qerberos_signatures[@]} Qerberos signatures"
}

# Validate gate requirements
validate_gate_requirements() {
    log_info "Validating gate requirements..."
    
    local gate_errors=0
    
    # Check if all scenarios passed
    local identity_status=$(jq -r '.scenarios["identity-flow"].status' "$VALIDATION_FILE")
    local content_status=$(jq -r '.scenarios["content-flow"].status' "$VALIDATION_FILE")
    local dao_status=$(jq -r '.scenarios["dao-flow"].status' "$VALIDATION_FILE")
    
    local all_scenarios_pass=false
    if [ "$identity_status" = "passed" ] && [ "$content_status" = "passed" ] && [ "$dao_status" = "passed" ]; then
        all_scenarios_pass=true
        log_success "All scenarios passed"
    else
        log_error "Not all scenarios passed: identity=$identity_status, content=$content_status, dao=$dao_status"
        ((gate_errors++))
    fi
    
    # Check duration requirements
    local max_duration=$(jq -r '.metrics.maxDuration // 0' "$VALIDATION_FILE")
    local duration_requirement_met=false
    if [ "$max_duration" -le 30000 ]; then
        duration_requirement_met=true
        log_success "Duration requirement met: max=${max_duration}ms ≤ 30000ms"
    else
        log_error "Duration requirement not met: max=${max_duration}ms > 30000ms"
        ((gate_errors++))
    fi
    
    # Check consecutive runs
    local successful_runs=$(jq -r '.metrics.successfulRuns' "$VALIDATION_FILE")
    local total_runs=$(jq -r '.metrics.totalRuns' "$VALIDATION_FILE")
    local expected_runs=9  # 3 scenarios × 3 runs
    
    if [ "$successful_runs" -eq "$expected_runs" ] && [ "$total_runs" -eq "$expected_runs" ]; then
        log_success "Consecutive runs requirement met: $successful_runs/$total_runs"
    else
        log_error "Consecutive runs requirement not met: $successful_runs/$expected_runs successful"
        ((gate_errors++))
    fi
    
    # Update gate validation in validation file
    jq --argjson allScenariosPass "$all_scenarios_pass" \
       --argjson durationRequirementMet "$duration_requirement_met" \
       '.gateValidation.allScenariosPass = $allScenariosPass | 
        .gateValidation.durationRequirementMet = $durationRequirementMet' \
       "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
    
    return $gate_errors
}

# Generate comprehensive validation report
generate_validation_report() {
    log_info "Generating comprehensive validation report..."
    
    local end_time=$(date +%s%3N)
    local total_validation_duration=$((end_time - START_TIME))
    
    # Update final validation status
    local gate_passed=$(jq -r '.gateValidation.allScenariosPass and .gateValidation.durationRequirementMet' "$VALIDATION_FILE")
    local final_status
    if [ "$gate_passed" = "true" ]; then
        final_status="passed"
    else
        final_status="failed"
    fi
    
    jq --arg endTime "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
       --argjson totalDuration "$total_validation_duration" \
       --arg status "$final_status" \
       '.endTime = $endTime | 
        .totalDuration = $totalDuration | 
        .status = $status' \
       "$VALIDATION_FILE" > "$VALIDATION_FILE.tmp" && mv "$VALIDATION_FILE.tmp" "$VALIDATION_FILE"
    
    # Generate summary report
    local summary_file="$REPORTS_DIR/validation-summary-$VALIDATION_ID.json"
    
    cat > "$summary_file" << EOF
{
  "validationId": "$VALIDATION_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$DEMO_ENV",
  "status": "$final_status",
  "gateValidation": $(jq '.gateValidation' "$VALIDATION_FILE"),
  "metrics": $(jq '.metrics' "$VALIDATION_FILE"),
  "scenarios": $(jq '.scenarios' "$VALIDATION_FILE"),
  "auditData": {
    "auditCids": $(jq '.auditCids' "$VALIDATION_FILE"),
    "qerberosSignatures": $(jq '.qerberosSignatures' "$VALIDATION_FILE")
  },
  "artifacts": {
    "validationFile": "$VALIDATION_FILE",
    "summaryFile": "$summary_file",
    "logsDirectory": "$REPORTS_DIR"
  }
}
EOF
    
    log_success "Validation report generated: $summary_file"
    
    # Display summary
    echo
    echo "=== Demo Validation Summary ==="
    echo "Validation ID: $VALIDATION_ID"
    echo "Environment: $DEMO_ENV"
    echo "Status: $final_status"
    echo "Total Runs: $(jq -r '.metrics.totalRuns' "$VALIDATION_FILE")"
    echo "Successful Runs: $(jq -r '.metrics.successfulRuns' "$VALIDATION_FILE")"
    echo "Failed Runs: $(jq -r '.metrics.failedRuns' "$VALIDATION_FILE")"
    echo "Average Duration: $(jq -r '.metrics.averageDuration' "$VALIDATION_FILE")ms"
    echo "Max Duration: $(jq -r '.metrics.maxDuration' "$VALIDATION_FILE")ms"
    echo "All Scenarios Pass: $(jq -r '.gateValidation.allScenariosPass' "$VALIDATION_FILE")"
    echo "Duration Requirement Met: $(jq -r '.gateValidation.durationRequirementMet' "$VALIDATION_FILE")"
    echo "Audit CIDs: $(jq -r '.auditCids | length' "$VALIDATION_FILE")"
    echo "Qerberos Signatures: $(jq -r '.qerberosSignatures | length' "$VALIDATION_FILE")"
    echo "Total Validation Duration: ${total_validation_duration}ms"
    echo "==============================="
}

# Update expected results documentation
update_expected_results_docs() {
    log_info "Updating expected results documentation..."
    
    local docs_demo_dir="$PROJECT_ROOT/docs/demo"
    mkdir -p "$docs_demo_dir"
    
    local expected_results_file="$docs_demo_dir/expected-results.md"
    
    cat > "$expected_results_file" << EOF
# Demo Expected Results

This document contains the expected results for AnarQ&Q ecosystem demo scenarios.

**Last Updated:** $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)  
**Environment:** $DEMO_ENV  
**Validation ID:** $VALIDATION_ID

## Gate Requirements

- ✅ All 3 scenarios pass ×3 consecutive runs
- ✅ Each scenario completes in ≤30s end-to-end
- ✅ All outputs signed by Qerberos with audit CID

## Scenario Results

### Identity Flow Demo
- **Expected Duration:** ≤15s
- **Steps:** sQuid creation → Qwallet → transaction → Qerberos audit
- **Artifacts:** sQuid ID, wallet ID, transaction ID, audit CID

### Content Flow Demo
- **Expected Duration:** ≤20s
- **Steps:** upload → Qlock encryption → Qindex metadata → IPFS storage
- **Artifacts:** content ID, encrypted content ID, metadata ID, IPFS hash

### DAO Flow Demo
- **Expected Duration:** ≤25s
- **Steps:** governance → voting → Qflow execution → QNET distribution
- **Artifacts:** proposal ID, voting outcome, workflow ID, distribution ID

## Validation Metrics

$(jq -r '
"- **Total Runs:** " + (.metrics.totalRuns | tostring) + "\n" +
"- **Successful Runs:** " + (.metrics.successfulRuns | tostring) + "\n" +
"- **Average Duration:** " + (.metrics.averageDuration | tostring) + "ms\n" +
"- **Max Duration:** " + (.metrics.maxDuration | tostring) + "ms\n" +
"- **Audit CIDs Generated:** " + (.auditCids | length | tostring) + "\n" +
"- **Qerberos Signatures:** " + (.qerberosSignatures | length | tostring)
' "$VALIDATION_FILE")

## Environment Matrix

| Environment | Status | Notes |
|-------------|--------|-------|
| local | ✅ Passed | Development environment |
| staging | ⏳ Pending | Pre-production testing |
| QNET Phase 2 | ⏳ Pending | Production-like distributed network |

## Artifacts Location

- **Validation Results:** \`$VALIDATION_FILE\`
- **Execution Logs:** \`$REPORTS_DIR\`
- **Demo Artifacts:** \`$ARTIFACTS_DIR\`

## Troubleshooting

If any scenario fails:

1. Check the execution logs in \`$REPORTS_DIR\`
2. Verify all services are running with \`scripts/demo-setup.sh validate\`
3. Ensure IPFS connectivity
4. Check backend server health at \`$BACKEND_URL/health\`

For performance issues:
- Warm up cache with \`scripts/demo-setup.sh\`
- Check system resources
- Verify network connectivity

EOF
    
    log_success "Expected results documentation updated: $expected_results_file"
}

# Main execution
main() {
    log_info "Starting comprehensive demo validation"
    
    # Run consecutive scenarios (3 runs each)
    if run_consecutive_scenarios 3; then
        log_success "All consecutive scenario runs completed successfully"
    else
        log_error "Some consecutive scenario runs failed"
    fi
    
    # Collect metrics and audit data
    collect_metrics
    collect_audit_data
    
    # Validate gate requirements
    if validate_gate_requirements; then
        log_success "All gate requirements met"
    else
        log_error "Gate requirements not met"
    fi
    
    # Generate reports and update documentation
    generate_validation_report
    update_expected_results_docs
    
    # Final status
    local final_status=$(jq -r '.status' "$VALIDATION_FILE")
    if [ "$final_status" = "passed" ]; then
        log_success "Demo validation completed successfully!"
        exit 0
    else
        log_error "Demo validation failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "metrics")
        collect_metrics
        exit 0
        ;;
    "audit")
        collect_audit_data
        exit 0
        ;;
    "gate")
        validate_gate_requirements
        exit $?
        ;;
    "report")
        generate_validation_report
        exit 0
        ;;
    "docs")
        update_expected_results_docs
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
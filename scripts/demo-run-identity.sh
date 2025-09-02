#!/bin/bash

# Demo Run Identity Script
# Executes the identity flow demo: sQuid creation → Qwallet → transaction → Qerberos audit
# Gate: Complete flow in ≤30s end-to-end

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_ENV="${DEMO_ENVIRONMENT:-local}"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts/demo"
RESULTS_DIR="$ARTIFACTS_DIR/results"
FIXTURES_DIR="$ARTIFACTS_DIR/fixtures"
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

# Generate execution ID
EXECUTION_ID="identity_$(date +%s)_$(openssl rand -hex 4)"
START_TIME=$(date +%s%3N)

log_info "Starting Identity Flow Demo: $EXECUTION_ID"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize execution tracking
EXECUTION_FILE="$RESULTS_DIR/identity-execution-$EXECUTION_ID.json"
cat > "$EXECUTION_FILE" << EOF
{
  "executionId": "$EXECUTION_ID",
  "scenario": "identity-flow",
  "startTime": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$DEMO_ENV",
  "status": "running",
  "steps": [],
  "metrics": {
    "totalDuration": 0,
    "stepDurations": {},
    "success": false
  },
  "auditTrail": []
}
EOF

# Step execution function
execute_step() {
    local step_name="$1"
    local step_function="$2"
    local step_start=$(date +%s%3N)
    
    log_info "Executing step: $step_name"
    
    if $step_function; then
        local step_end=$(date +%s%3N)
        local step_duration=$((step_end - step_start))
        
        # Update execution file
        jq --arg step "$step_name" \
           --arg status "completed" \
           --argjson duration "$step_duration" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           '.steps += [{
               "stepName": $step,
               "status": $status,
               "duration": $duration,
               "timestamp": $timestamp
           }] | .metrics.stepDurations[$step] = $duration' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "Step completed: $step_name (${step_duration}ms)"
        return 0
    else
        local step_end=$(date +%s%3N)
        local step_duration=$((step_end - step_start))
        
        # Update execution file with failure
        jq --arg step "$step_name" \
           --arg status "failed" \
           --argjson duration "$step_duration" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           '.steps += [{
               "stepName": $step,
               "status": $status,
               "duration": $duration,
               "timestamp": $timestamp
           }] | .status = "failed"' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_error "Step failed: $step_name (${step_duration}ms)"
        return 1
    fi
}

# Step 1: Create sQuid identity
create_squid_identity() {
    log_info "Creating sQuid identity..."
    
    # Load test identity from fixtures
    local identity_data
    if [ -f "$FIXTURES_DIR/canonical-identities.json" ]; then
        identity_data=$(jq -r '.identities[0]' "$FIXTURES_DIR/canonical-identities.json")
    else
        log_error "Canonical identities fixture not found"
        return 1
    fi
    
    local squid_id=$(echo "$identity_data" | jq -r '.squidId')
    local public_key=$(echo "$identity_data" | jq -r '.publicKey')
    
    # Simulate sQuid creation API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/squid/create" \
        -H "Content-Type: application/json" \
        -d "{
            \"squidId\": \"$squid_id\",
            \"publicKey\": \"$public_key\",
            \"metadata\": $(echo "$identity_data" | jq '.metadata')
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Add to audit trail
        jq --arg action "squid_created" \
           --arg squidId "$squid_id" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "squid-service" \
           '.auditTrail += [{
               "action": $action,
               "squidId": $squidId,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "sQuid identity created: $squid_id"
        echo "$squid_id" > "$RESULTS_DIR/squid-id-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to create sQuid identity (HTTP $http_code)"
        return 1
    fi
}

# Step 2: Setup Qwallet
setup_qwallet() {
    log_info "Setting up Qwallet..."
    
    local squid_id
    if [ -f "$RESULTS_DIR/squid-id-$EXECUTION_ID.txt" ]; then
        squid_id=$(cat "$RESULTS_DIR/squid-id-$EXECUTION_ID.txt")
    else
        log_error "sQuid ID not found from previous step"
        return 1
    fi
    
    local wallet_id="wallet_$squid_id"
    
    # Simulate Qwallet setup API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/qwallet/create" \
        -H "Content-Type: application/json" \
        -d "{
            \"walletId\": \"$wallet_id\",
            \"squidId\": \"$squid_id\",
            \"initialBalance\": 1000,
            \"currency\": \"Q\"
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Add to audit trail
        jq --arg action "wallet_created" \
           --arg walletId "$wallet_id" \
           --arg squidId "$squid_id" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "qwallet-service" \
           '.auditTrail += [{
               "action": $action,
               "walletId": $walletId,
               "squidId": $squidId,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "Qwallet created: $wallet_id"
        echo "$wallet_id" > "$RESULTS_DIR/wallet-id-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to create Qwallet (HTTP $http_code)"
        return 1
    fi
}

# Step 3: Execute transaction
execute_transaction() {
    log_info "Executing transaction..."
    
    local wallet_id
    if [ -f "$RESULTS_DIR/wallet-id-$EXECUTION_ID.txt" ]; then
        wallet_id=$(cat "$RESULTS_DIR/wallet-id-$EXECUTION_ID.txt")
    else
        log_error "Wallet ID not found from previous step"
        return 1
    fi
    
    local transaction_id="tx_demo_$(date +%s)"
    
    # Simulate transaction execution API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/qwallet/transaction" \
        -H "Content-Type: application/json" \
        -d "{
            \"transactionId\": \"$transaction_id\",
            \"from\": \"$wallet_id\",
            \"to\": \"wallet_demo_recipient\",
            \"amount\": 100,
            \"currency\": \"Q\"
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Add to audit trail
        jq --arg action "transaction_executed" \
           --arg transactionId "$transaction_id" \
           --arg from "$wallet_id" \
           --argjson amount "100" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "qwallet-service" \
           '.auditTrail += [{
               "action": $action,
               "transactionId": $transactionId,
               "from": $from,
               "amount": $amount,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "Transaction executed: $transaction_id"
        echo "$transaction_id" > "$RESULTS_DIR/transaction-id-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to execute transaction (HTTP $http_code)"
        return 1
    fi
}

# Step 4: Qerberos audit
qerberos_audit() {
    log_info "Performing Qerberos audit..."
    
    local transaction_id
    if [ -f "$RESULTS_DIR/transaction-id-$EXECUTION_ID.txt" ]; then
        transaction_id=$(cat "$RESULTS_DIR/transaction-id-$EXECUTION_ID.txt")
    else
        log_error "Transaction ID not found from previous step"
        return 1
    fi
    
    local audit_id="audit_$(date +%s)"
    
    # Simulate Qerberos audit API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/qerberos/audit" \
        -H "Content-Type: application/json" \
        -d "{
            \"auditId\": \"$audit_id\",
            \"transactionId\": \"$transaction_id\",
            \"auditType\": \"transaction_compliance\"
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Generate audit CID
        local audit_cid="audit_cid_$(openssl rand -hex 8)"
        
        # Add to audit trail
        jq --arg action "audit_completed" \
           --arg auditId "$audit_id" \
           --arg transactionId "$transaction_id" \
           --arg auditStatus "compliant" \
           --arg auditCid "$audit_cid" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "qerberos" \
           '.auditTrail += [{
               "action": $action,
               "auditId": $auditId,
               "transactionId": $transactionId,
               "auditStatus": $auditStatus,
               "auditCid": $auditCid,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "Qerberos audit completed: $audit_id (CID: $audit_cid)"
        echo "$audit_id" > "$RESULTS_DIR/audit-id-$EXECUTION_ID.txt"
        echo "$audit_cid" > "$RESULTS_DIR/audit-cid-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to complete Qerberos audit (HTTP $http_code)"
        return 1
    fi
}

# Validate results
validate_results() {
    log_info "Validating identity flow results..."
    
    local validation_errors=0
    
    # Check if all result files exist
    local required_files=(
        "squid-id-$EXECUTION_ID.txt"
        "wallet-id-$EXECUTION_ID.txt"
        "transaction-id-$EXECUTION_ID.txt"
        "audit-id-$EXECUTION_ID.txt"
        "audit-cid-$EXECUTION_ID.txt"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$RESULTS_DIR/$file" ]; then
            log_error "Missing result file: $file"
            ((validation_errors++))
        fi
    done
    
    # Check execution time (should be ≤30s)
    local end_time=$(date +%s%3N)
    local total_duration=$((end_time - START_TIME))
    
    if [ $total_duration -gt 30000 ]; then
        log_error "Execution time exceeded 30s limit: ${total_duration}ms"
        ((validation_errors++))
    fi
    
    # Update final execution file
    jq --argjson duration "$total_duration" \
       --arg endTime "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
       --argjson success "$([ $validation_errors -eq 0 ] && echo true || echo false)" \
       --arg status "$([ $validation_errors -eq 0 ] && echo completed || echo failed)" \
       '.metrics.totalDuration = $duration | 
        .metrics.success = $success | 
        .endTime = $endTime | 
        .status = $status' \
       "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
    
    if [ $validation_errors -eq 0 ]; then
        log_success "Identity flow validation passed (${total_duration}ms)"
        return 0
    else
        log_error "Identity flow validation failed with $validation_errors errors"
        return 1
    fi
}

# Generate summary report
generate_summary() {
    log_info "Generating identity flow summary..."
    
    local squid_id=$(cat "$RESULTS_DIR/squid-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local wallet_id=$(cat "$RESULTS_DIR/wallet-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local transaction_id=$(cat "$RESULTS_DIR/transaction-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local audit_id=$(cat "$RESULTS_DIR/audit-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local audit_cid=$(cat "$RESULTS_DIR/audit-cid-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    
    local summary_file="$RESULTS_DIR/identity-summary-$EXECUTION_ID.json"
    
    cat > "$summary_file" << EOF
{
  "executionId": "$EXECUTION_ID",
  "scenario": "identity-flow",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$DEMO_ENV",
  "summary": {
    "squidCreated": "$squid_id",
    "walletSetup": "$wallet_id",
    "transactionExecuted": "$transaction_id",
    "auditCompleted": "$audit_id",
    "auditCid": "$audit_cid"
  },
  "execution": $(cat "$EXECUTION_FILE"),
  "artifacts": {
    "executionFile": "$EXECUTION_FILE",
    "summaryFile": "$summary_file"
  }
}
EOF
    
    log_success "Identity flow summary generated: $summary_file"
    
    # Display summary
    echo
    echo "=== Identity Flow Demo Summary ==="
    echo "Execution ID: $EXECUTION_ID"
    echo "sQuid Created: $squid_id"
    echo "Wallet Setup: $wallet_id"
    echo "Transaction: $transaction_id"
    echo "Audit ID: $audit_id"
    echo "Audit CID: $audit_cid"
    echo "Total Duration: $(jq -r '.metrics.totalDuration' "$EXECUTION_FILE")ms"
    echo "Status: $(jq -r '.status' "$EXECUTION_FILE")"
    echo "=================================="
}

# Main execution
main() {
    log_info "Starting Identity Flow Demo execution"
    
    # Execute all steps
    if execute_step "create-squid" create_squid_identity && \
       execute_step "setup-qwallet" setup_qwallet && \
       execute_step "execute-transaction" execute_transaction && \
       execute_step "audit-qerberos" qerberos_audit; then
        
        if validate_results; then
            generate_summary
            log_success "Identity Flow Demo completed successfully!"
            exit 0
        else
            log_error "Identity Flow Demo validation failed"
            exit 1
        fi
    else
        log_error "Identity Flow Demo execution failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "validate")
        validate_results
        exit $?
        ;;
    "summary")
        if [ -n "${2:-}" ]; then
            EXECUTION_ID="$2"
            EXECUTION_FILE="$RESULTS_DIR/identity-execution-$EXECUTION_ID.json"
        fi
        generate_summary
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
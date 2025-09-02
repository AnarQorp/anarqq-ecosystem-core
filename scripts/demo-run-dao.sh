#!/bin/bash

# Demo Run DAO Script
# Executes the DAO flow demo: governance → voting → Qflow execution → QNET distribution
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
EXECUTION_ID="dao_$(date +%s)_$(openssl rand -hex 4)"
START_TIME=$(date +%s%3N)

log_info "Starting DAO Flow Demo: $EXECUTION_ID"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize execution tracking
EXECUTION_FILE="$RESULTS_DIR/dao-execution-$EXECUTION_ID.json"
cat > "$EXECUTION_FILE" << EOF
{
  "executionId": "$EXECUTION_ID",
  "scenario": "dao-flow",
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

# Step 1: Create governance proposal
create_proposal() {
    log_info "Creating governance proposal..."
    
    # Load DAO scenario from fixtures
    local dao_data
    if [ -f "$FIXTURES_DIR/dao-governance-scenarios.json" ]; then
        dao_data=$(jq -r '.scenarios[0]' "$FIXTURES_DIR/dao-governance-scenarios.json")
    else
        log_error "DAO governance scenarios fixture not found"
        return 1
    fi
    
    local proposal_id=$(echo "$dao_data" | jq -r '.scenarioId')
    local proposal_title=$(echo "$dao_data" | jq -r '.proposal.title')
    local proposer=$(echo "$dao_data" | jq -r '.proposal.proposer')
    
    # Simulate governance proposal creation API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/dao/proposal" \
        -H "Content-Type: application/json" \
        -d "{
            \"proposalId\": \"$proposal_id\",
            \"title\": \"$proposal_title\",
            \"description\": $(echo "$dao_data" | jq '.proposal.description'),
            \"proposer\": \"$proposer\",
            \"votingPeriod\": $(echo "$dao_data" | jq '.proposal.votingPeriod'),
            \"quorum\": $(echo "$dao_data" | jq '.proposal.quorum'),
            \"options\": $(echo "$dao_data" | jq '.proposal.options')
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Add to audit trail
        jq --arg action "proposal_created" \
           --arg proposalId "$proposal_id" \
           --arg proposer "$proposer" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "dao-service" \
           '.auditTrail += [{
               "action": $action,
               "proposalId": $proposalId,
               "proposer": $proposer,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "Governance proposal created: $proposal_id"
        echo "$proposal_id" > "$RESULTS_DIR/proposal-id-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to create governance proposal (HTTP $http_code)"
        return 1
    fi
}

# Step 2: Collect votes
collect_votes() {
    log_info "Collecting votes..."
    
    local proposal_id
    if [ -f "$RESULTS_DIR/proposal-id-$EXECUTION_ID.txt" ]; then
        proposal_id=$(cat "$RESULTS_DIR/proposal-id-$EXECUTION_ID.txt")
    else
        log_error "Proposal ID not found from previous step"
        return 1
    fi
    
    # Load expected votes from fixtures
    local dao_data
    if [ -f "$FIXTURES_DIR/dao-governance-scenarios.json" ]; then
        dao_data=$(jq -r '.scenarios[0]' "$FIXTURES_DIR/dao-governance-scenarios.json")
    else
        log_error "DAO governance scenarios fixture not found"
        return 1
    fi
    
    local expected_votes=$(echo "$dao_data" | jq '.expectedVotes')
    local vote_count=0
    local approve_count=0
    local reject_count=0
    
    # Cast each vote
    echo "$expected_votes" | jq -c '.[]' | while read -r vote; do
        local voter=$(echo "$vote" | jq -r '.voter')
        local vote_choice=$(echo "$vote" | jq -r '.vote')
        
        # Simulate vote casting API call
        local response
        response=$(curl -s -w "%{http_code}" \
            -X POST "$BACKEND_URL/api/dao/vote" \
            -H "Content-Type: application/json" \
            -d "{
                \"proposalId\": \"$proposal_id\",
                \"voter\": \"$voter\",
                \"vote\": \"$vote_choice\"
            }" 2>/dev/null || echo "000")
        
        local http_code="${response: -3}"
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            log_success "Vote cast: $voter -> $vote_choice"
            
            # Count votes
            case "$vote_choice" in
                "approve") ((approve_count++)) ;;
                "reject") ((reject_count++)) ;;
            esac
            ((vote_count++))
        else
            log_error "Failed to cast vote for $voter (HTTP $http_code)"
        fi
    done
    
    # Determine outcome
    local outcome
    if [ $approve_count -gt $reject_count ]; then
        outcome="approved"
    else
        outcome="rejected"
    fi
    
    # Add voting completion to audit trail
    jq --arg action "voting_completed" \
       --arg proposalId "$proposal_id" \
       --arg outcome "$outcome" \
       --argjson totalVotes "$vote_count" \
       --argjson approveCount "$approve_count" \
       --argjson rejectCount "$reject_count" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
       --arg signedBy "dao-service" \
       '.auditTrail += [{
           "action": $action,
           "proposalId": $proposalId,
           "outcome": $outcome,
           "totalVotes": $totalVotes,
           "approveCount": $approveCount,
           "rejectCount": $rejectCount,
           "timestamp": $timestamp,
           "signedBy": $signedBy
       }]' \
       "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
    
    log_success "Voting completed: $outcome ($approve_count approve, $reject_count reject)"
    echo "$outcome" > "$RESULTS_DIR/voting-outcome-$EXECUTION_ID.txt"
    echo "$vote_count" > "$RESULTS_DIR/total-votes-$EXECUTION_ID.txt"
    return 0
}

# Step 3: Execute Qflow workflow
execute_qflow() {
    log_info "Executing Qflow workflow..."
    
    local proposal_id
    local outcome
    if [ -f "$RESULTS_DIR/proposal-id-$EXECUTION_ID.txt" ] && [ -f "$RESULTS_DIR/voting-outcome-$EXECUTION_ID.txt" ]; then
        proposal_id=$(cat "$RESULTS_DIR/proposal-id-$EXECUTION_ID.txt")
        outcome=$(cat "$RESULTS_DIR/voting-outcome-$EXECUTION_ID.txt")
    else
        log_error "Proposal ID or voting outcome not found from previous steps"
        return 1
    fi
    
    local workflow_id="workflow_$(date +%s)"
    local execution_id="exec_$(date +%s)"
    
    # Simulate Qflow workflow execution API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/qflow/execute" \
        -H "Content-Type: application/json" \
        -d "{
            \"workflowId\": \"$workflow_id\",
            \"executionId\": \"$execution_id\",
            \"proposalId\": \"$proposal_id\",
            \"outcome\": \"$outcome\",
            \"steps\": [
                {\"step\": \"validate_votes\", \"timeout\": 5000},
                {\"step\": \"execute_proposal\", \"timeout\": 10000},
                {\"step\": \"update_state\", \"timeout\": 5000}
            ]
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        # Add to audit trail
        jq --arg action "qflow_executed" \
           --arg proposalId "$proposal_id" \
           --arg workflowId "$workflow_id" \
           --arg executionId "$execution_id" \
           --arg outcome "$outcome" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "qflow" \
           '.auditTrail += [{
               "action": $action,
               "proposalId": $proposalId,
               "workflowId": $workflowId,
               "executionId": $executionId,
               "outcome": $outcome,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "Qflow workflow executed: $workflow_id"
        echo "$workflow_id" > "$RESULTS_DIR/workflow-id-$EXECUTION_ID.txt"
        echo "$execution_id" > "$RESULTS_DIR/qflow-execution-id-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to execute Qflow workflow (HTTP $http_code)"
        return 1
    fi
}

# Step 4: QNET distribution
distribute_qnet() {
    log_info "Distributing to QNET nodes..."
    
    local workflow_id
    if [ -f "$RESULTS_DIR/workflow-id-$EXECUTION_ID.txt" ]; then
        workflow_id=$(cat "$RESULTS_DIR/workflow-id-$EXECUTION_ID.txt")
    else
        log_error "Workflow ID not found from previous step"
        return 1
    fi
    
    local distribution_id="dist_$(date +%s)"
    
    # Define QNET nodes based on environment
    local qnet_nodes
    case "$DEMO_ENV" in
        "local")
            qnet_nodes='["qnet_node_1", "qnet_node_2", "qnet_node_3"]'
            ;;
        "staging")
            qnet_nodes='["staging_node_1", "staging_node_2", "staging_node_3"]'
            ;;
        "qnet-phase2")
            qnet_nodes='["qnet_phase2_1", "qnet_phase2_2", "qnet_phase2_3", "qnet_phase2_4", "qnet_phase2_5"]'
            ;;
        *)
            qnet_nodes='["qnet_node_1", "qnet_node_2", "qnet_node_3"]'
            ;;
    esac
    
    # Simulate QNET distribution API call
    local response
    response=$(curl -s -w "%{http_code}" \
        -X POST "$BACKEND_URL/api/qnet/distribute" \
        -H "Content-Type: application/json" \
        -d "{
            \"distributionId\": \"$distribution_id\",
            \"workflowId\": \"$workflow_id\",
            \"nodes\": $qnet_nodes,
            \"distributionType\": \"dao_execution_result\"
        }" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        local node_count=$(echo "$qnet_nodes" | jq '. | length')
        
        # Add to audit trail
        jq --arg action "qnet_distributed" \
           --arg workflowId "$workflow_id" \
           --arg distributionId "$distribution_id" \
           --argjson nodes "$node_count" \
           --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
           --arg signedBy "qnet" \
           '.auditTrail += [{
               "action": $action,
               "workflowId": $workflowId,
               "distributionId": $distributionId,
               "nodes": $nodes,
               "timestamp": $timestamp,
               "signedBy": $signedBy
           }]' \
           "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp" && mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
        
        log_success "QNET distribution completed: $distribution_id ($node_count nodes)"
        echo "$distribution_id" > "$RESULTS_DIR/distribution-id-$EXECUTION_ID.txt"
        echo "$node_count" > "$RESULTS_DIR/distributed-nodes-$EXECUTION_ID.txt"
        return 0
    else
        log_error "Failed to distribute to QNET (HTTP $http_code)"
        return 1
    fi
}

# Validate results
validate_results() {
    log_info "Validating DAO flow results..."
    
    local validation_errors=0
    
    # Check if all result files exist
    local required_files=(
        "proposal-id-$EXECUTION_ID.txt"
        "voting-outcome-$EXECUTION_ID.txt"
        "total-votes-$EXECUTION_ID.txt"
        "workflow-id-$EXECUTION_ID.txt"
        "distribution-id-$EXECUTION_ID.txt"
        "distributed-nodes-$EXECUTION_ID.txt"
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
    
    # Validate voting outcome
    if [ -f "$RESULTS_DIR/voting-outcome-$EXECUTION_ID.txt" ]; then
        local outcome=$(cat "$RESULTS_DIR/voting-outcome-$EXECUTION_ID.txt")
        if [[ ! "$outcome" =~ ^(approved|rejected)$ ]]; then
            log_error "Invalid voting outcome: $outcome"
            ((validation_errors++))
        fi
    fi
    
    # Validate node distribution count
    if [ -f "$RESULTS_DIR/distributed-nodes-$EXECUTION_ID.txt" ]; then
        local node_count=$(cat "$RESULTS_DIR/distributed-nodes-$EXECUTION_ID.txt")
        if [ "$node_count" -lt 3 ]; then
            log_error "Insufficient nodes for distribution: $node_count"
            ((validation_errors++))
        fi
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
        log_success "DAO flow validation passed (${total_duration}ms)"
        return 0
    else
        log_error "DAO flow validation failed with $validation_errors errors"
        return 1
    fi
}

# Generate summary report
generate_summary() {
    log_info "Generating DAO flow summary..."
    
    local proposal_id=$(cat "$RESULTS_DIR/proposal-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local voting_outcome=$(cat "$RESULTS_DIR/voting-outcome-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local total_votes=$(cat "$RESULTS_DIR/total-votes-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local workflow_id=$(cat "$RESULTS_DIR/workflow-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local distribution_id=$(cat "$RESULTS_DIR/distribution-id-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    local distributed_nodes=$(cat "$RESULTS_DIR/distributed-nodes-$EXECUTION_ID.txt" 2>/dev/null || echo "N/A")
    
    local summary_file="$RESULTS_DIR/dao-summary-$EXECUTION_ID.json"
    
    cat > "$summary_file" << EOF
{
  "executionId": "$EXECUTION_ID",
  "scenario": "dao-flow",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$DEMO_ENV",
  "summary": {
    "proposalCreated": "$proposal_id",
    "votesCollected": "$total_votes",
    "outcome": "$voting_outcome",
    "workflowExecuted": "$workflow_id",
    "distributionId": "$distribution_id",
    "nodesDistributed": "$distributed_nodes"
  },
  "execution": $(cat "$EXECUTION_FILE"),
  "artifacts": {
    "executionFile": "$EXECUTION_FILE",
    "summaryFile": "$summary_file"
  }
}
EOF
    
    log_success "DAO flow summary generated: $summary_file"
    
    # Display summary
    echo
    echo "=== DAO Flow Demo Summary ==="
    echo "Execution ID: $EXECUTION_ID"
    echo "Proposal Created: $proposal_id"
    echo "Votes Collected: $total_votes"
    echo "Voting Outcome: $voting_outcome"
    echo "Workflow Executed: $workflow_id"
    echo "Distribution ID: $distribution_id"
    echo "Nodes Distributed: $distributed_nodes"
    echo "Total Duration: $(jq -r '.metrics.totalDuration' "$EXECUTION_FILE")ms"
    echo "Status: $(jq -r '.status' "$EXECUTION_FILE")"
    echo "============================="
}

# Main execution
main() {
    log_info "Starting DAO Flow Demo execution"
    
    # Execute all steps
    if execute_step "create-proposal" create_proposal && \
       execute_step "collect-votes" collect_votes && \
       execute_step "execute-qflow" execute_qflow && \
       execute_step "distribute-qnet" distribute_qnet; then
        
        if validate_results; then
            generate_summary
            log_success "DAO Flow Demo completed successfully!"
            exit 0
        else
            log_error "DAO Flow Demo validation failed"
            exit 1
        fi
    else
        log_error "DAO Flow Demo execution failed"
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
            EXECUTION_FILE="$RESULTS_DIR/dao-execution-$EXECUTION_ID.json"
        fi
        generate_summary
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
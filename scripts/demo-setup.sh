#!/bin/bash

# Demo Setup Script
# Sets up QNET nodes, IPFS, and seed data bootstrap for AnarQ&Q ecosystem demos
# Environment Matrix: local / staging / QNET Phase 2

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_ENV="${DEMO_ENVIRONMENT:-local}"
ARTIFACTS_DIR="$PROJECT_ROOT/artifacts/demo"
LOGS_DIR="$ARTIFACTS_DIR/logs"
FIXTURES_DIR="$ARTIFACTS_DIR/fixtures"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites for demo setup..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check Docker (for IPFS)
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Setup directory structure
setup_directories() {
    log_info "Setting up directory structure..."
    
    mkdir -p "$ARTIFACTS_DIR"
    mkdir -p "$LOGS_DIR"
    mkdir -p "$FIXTURES_DIR"
    mkdir -p "$ARTIFACTS_DIR/scenarios"
    mkdir -p "$ARTIFACTS_DIR/results"
    mkdir -p "$ARTIFACTS_DIR/reports"
    
    log_success "Directory structure created"
}

# Setup IPFS node
setup_ipfs() {
    log_info "Setting up IPFS node for demo environment: $DEMO_ENV"
    
    case "$DEMO_ENV" in
        "local")
            setup_ipfs_local
            ;;
        "staging")
            setup_ipfs_staging
            ;;
        "qnet-phase2")
            setup_ipfs_qnet_phase2
            ;;
        *)
            log_error "Unknown demo environment: $DEMO_ENV"
            exit 1
            ;;
    esac
}

setup_ipfs_local() {
    log_info "Setting up local IPFS node..."
    
    # Check if IPFS container is already running
    if docker ps | grep -q "ipfs-demo"; then
        log_warning "IPFS demo container already running"
        return 0
    fi
    
    # Start IPFS container
    docker run -d \
        --name ipfs-demo \
        -p 4001:4001 \
        -p 5001:5001 \
        -p 8080:8080 \
        -v ipfs-demo-data:/data/ipfs \
        ipfs/kubo:latest > "$LOGS_DIR/ipfs-setup.log" 2>&1
    
    # Wait for IPFS to be ready
    log_info "Waiting for IPFS to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5001/api/v0/version > /dev/null 2>&1; then
            break
        fi
        sleep 2
    done
    
    if ! curl -s http://localhost:5001/api/v0/version > /dev/null 2>&1; then
        log_error "IPFS failed to start within timeout"
        exit 1
    fi
    
    log_success "Local IPFS node started"
}

setup_ipfs_staging() {
    log_info "Configuring IPFS for staging environment..."
    
    # For staging, we assume IPFS is already running
    # Just verify connectivity
    if ! curl -s "${IPFS_API_URL:-http://localhost:5001}/api/v0/version" > /dev/null 2>&1; then
        log_error "Cannot connect to staging IPFS node"
        exit 1
    fi
    
    log_success "Staging IPFS connectivity verified"
}

setup_ipfs_qnet_phase2() {
    log_info "Configuring IPFS for QNET Phase 2..."
    
    # For QNET Phase 2, connect to distributed IPFS network
    local qnet_bootstrap_nodes=(
        "/ip4/10.0.1.10/tcp/4001/p2p/QmBootstrap1"
        "/ip4/10.0.1.11/tcp/4001/p2p/QmBootstrap2"
        "/ip4/10.0.1.12/tcp/4001/p2p/QmBootstrap3"
    )
    
    # Configure bootstrap nodes
    for node in "${qnet_bootstrap_nodes[@]}"; do
        curl -X POST "http://localhost:5001/api/v0/bootstrap/add?arg=$node" > /dev/null 2>&1 || true
    done
    
    log_success "QNET Phase 2 IPFS configuration completed"
}

# Setup QNET nodes
setup_qnet_nodes() {
    log_info "Setting up QNET nodes for environment: $DEMO_ENV"
    
    case "$DEMO_ENV" in
        "local")
            setup_qnet_local
            ;;
        "staging")
            setup_qnet_staging
            ;;
        "qnet-phase2")
            setup_qnet_phase2
            ;;
    esac
}

setup_qnet_local() {
    log_info "Starting local QNET nodes..."
    
    # Start backend services
    cd "$PROJECT_ROOT/backend"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing backend dependencies..."
        npm install > "$LOGS_DIR/npm-install.log" 2>&1
    fi
    
    # Start the main server
    log_info "Starting backend server..."
    npm start > "$LOGS_DIR/backend-server.log" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$ARTIFACTS_DIR/backend.pid"
    
    # Wait for server to be ready
    log_info "Waiting for backend server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            break
        fi
        sleep 2
    done
    
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_error "Backend server failed to start within timeout"
        exit 1
    fi
    
    log_success "Local QNET nodes started"
}

setup_qnet_staging() {
    log_info "Configuring QNET for staging environment..."
    
    # For staging, verify connectivity to existing nodes
    local staging_nodes=(
        "${QNET_NODE_1:-http://staging-node-1:3000}"
        "${QNET_NODE_2:-http://staging-node-2:3000}"
        "${QNET_NODE_3:-http://staging-node-3:3000}"
    )
    
    local healthy_nodes=0
    for node in "${staging_nodes[@]}"; do
        if curl -s "$node/health" > /dev/null 2>&1; then
            ((healthy_nodes++))
            log_success "Node healthy: $node"
        else
            log_warning "Node unhealthy: $node"
        fi
    done
    
    if [ $healthy_nodes -lt 2 ]; then
        log_error "Insufficient healthy nodes for staging demo ($healthy_nodes/3)"
        exit 1
    fi
    
    log_success "Staging QNET nodes verified ($healthy_nodes/3 healthy)"
}

setup_qnet_phase2() {
    log_info "Configuring QNET Phase 2 distributed network..."
    
    # For QNET Phase 2, we connect to the actual distributed network
    local phase2_nodes=(
        "${QNET_PHASE2_NODE_1:-http://qnet-1.anarq.org:3000}"
        "${QNET_PHASE2_NODE_2:-http://qnet-2.anarq.org:3000}"
        "${QNET_PHASE2_NODE_3:-http://qnet-3.anarq.org:3000}"
        "${QNET_PHASE2_NODE_4:-http://qnet-4.anarq.org:3000}"
        "${QNET_PHASE2_NODE_5:-http://qnet-5.anarq.org:3000}"
    )
    
    local healthy_nodes=0
    for node in "${phase2_nodes[@]}"; do
        if curl -s "$node/health" > /dev/null 2>&1; then
            ((healthy_nodes++))
            log_success "Phase 2 node healthy: $node"
        else
            log_warning "Phase 2 node unhealthy: $node"
        fi
    done
    
    if [ $healthy_nodes -lt 3 ]; then
        log_error "Insufficient healthy nodes for QNET Phase 2 demo ($healthy_nodes/5)"
        exit 1
    fi
    
    log_success "QNET Phase 2 network verified ($healthy_nodes/5 healthy)"
}

# Generate seed data
generate_seed_data() {
    log_info "Generating canonical seed data..."
    
    # Generate deterministic test identities
    generate_test_identities
    
    # Generate test content samples
    generate_test_content
    
    # Generate DAO scenarios
    generate_dao_scenarios
    
    # Generate test transactions
    generate_test_transactions
    
    log_success "Seed data generation completed"
}

generate_test_identities() {
    log_info "Generating test identities (sQuid)..."
    
    cat > "$FIXTURES_DIR/canonical-identities.json" << 'EOF'
{
  "version": "1.0.0",
  "generated": "2025-01-30T00:00:00.000Z",
  "identities": [
    {
      "squidId": "squid_demo_1_seeded",
      "publicKey": "0x1234567890abcdef1234567890abcdef12345678",
      "metadata": {
        "name": "Demo User 1",
        "type": "demo_identity",
        "created": "2025-01-30T00:00:00.000Z",
        "seeded": true,
        "deterministic": true
      },
      "capabilities": ["identity.verify", "wallet.transact", "content.upload"],
      "demoScenarios": ["identity-flow", "content-flow"]
    },
    {
      "squidId": "squid_demo_2_seeded",
      "publicKey": "0xabcdef1234567890abcdef1234567890abcdef12",
      "metadata": {
        "name": "Demo User 2",
        "type": "demo_identity",
        "created": "2025-01-30T00:00:00.000Z",
        "seeded": true,
        "deterministic": true
      },
      "capabilities": ["identity.verify", "wallet.transact", "dao.vote"],
      "demoScenarios": ["identity-flow", "dao-flow"]
    },
    {
      "squidId": "squid_demo_3_seeded",
      "publicKey": "0x567890abcdef1234567890abcdef1234567890ab",
      "metadata": {
        "name": "Demo User 3",
        "type": "demo_identity",
        "created": "2025-01-30T00:00:00.000Z",
        "seeded": true,
        "deterministic": true
      },
      "capabilities": ["identity.verify", "dao.vote", "dao.propose"],
      "demoScenarios": ["dao-flow"]
    }
  ]
}
EOF
    
    log_success "Test identities generated"
}

generate_test_content() {
    log_info "Generating test content samples..."
    
    cat > "$FIXTURES_DIR/test-content-samples.json" << 'EOF'
{
  "version": "1.0.0",
  "generated": "2025-01-30T00:00:00.000Z",
  "content": [
    {
      "contentId": "content_demo_1_seeded",
      "type": "text",
      "data": "Demo content sample 1 - synthetic data for testing purposes only",
      "metadata": {
        "title": "Demo Content 1",
        "description": "Synthetic content for demo purposes",
        "tags": ["demo", "synthetic", "test"],
        "created": "2025-01-30T00:00:00.000Z"
      },
      "size": 1024,
      "checksum": "sha256:demo_content_1_checksum"
    },
    {
      "contentId": "content_demo_2_seeded",
      "type": "text",
      "data": "Demo content sample 2 - another synthetic data sample for testing",
      "metadata": {
        "title": "Demo Content 2",
        "description": "Another synthetic content for demo purposes",
        "tags": ["demo", "synthetic", "test", "sample"],
        "created": "2025-01-30T00:00:00.000Z"
      },
      "size": 1536,
      "checksum": "sha256:demo_content_2_checksum"
    }
  ]
}
EOF
    
    log_success "Test content samples generated"
}

generate_dao_scenarios() {
    log_info "Generating DAO governance scenarios..."
    
    cat > "$FIXTURES_DIR/dao-governance-scenarios.json" << 'EOF'
{
  "version": "1.0.0",
  "generated": "2025-01-30T00:00:00.000Z",
  "scenarios": [
    {
      "scenarioId": "dao_demo_1_seeded",
      "type": "governance_proposal",
      "proposal": {
        "title": "Demo Proposal 1",
        "description": "Synthetic governance proposal for demo purposes",
        "proposer": "squid_demo_1_seeded",
        "votingPeriod": 300000,
        "quorum": 3,
        "options": ["approve", "reject", "abstain"]
      },
      "expectedVotes": [
        { "voter": "squid_demo_1_seeded", "vote": "approve" },
        { "voter": "squid_demo_2_seeded", "vote": "approve" },
        { "voter": "squid_demo_3_seeded", "vote": "reject" }
      ],
      "expectedOutcome": "approved"
    },
    {
      "scenarioId": "dao_demo_2_seeded",
      "type": "governance_proposal",
      "proposal": {
        "title": "Demo Proposal 2",
        "description": "Another synthetic governance proposal for demo purposes",
        "proposer": "squid_demo_2_seeded",
        "votingPeriod": 300000,
        "quorum": 3,
        "options": ["approve", "reject", "abstain"]
      },
      "expectedVotes": [
        { "voter": "squid_demo_1_seeded", "vote": "reject" },
        { "voter": "squid_demo_2_seeded", "vote": "approve" },
        { "voter": "squid_demo_3_seeded", "vote": "reject" }
      ],
      "expectedOutcome": "rejected"
    }
  ]
}
EOF
    
    log_success "DAO governance scenarios generated"
}

generate_test_transactions() {
    log_info "Generating test transactions..."
    
    cat > "$FIXTURES_DIR/canonical-transactions.json" << 'EOF'
{
  "version": "1.0.0",
  "generated": "2025-01-30T00:00:00.000Z",
  "transactions": [
    {
      "transactionId": "tx_demo_1_seeded",
      "from": "squid_demo_1_seeded",
      "to": "squid_demo_2_seeded",
      "amount": 100,
      "currency": "Q",
      "type": "transfer",
      "metadata": {
        "description": "Demo transaction 1",
        "category": "demo",
        "created": "2025-01-30T00:00:00.000Z"
      }
    },
    {
      "transactionId": "tx_demo_2_seeded",
      "from": "squid_demo_2_seeded",
      "to": "squid_demo_3_seeded",
      "amount": 50,
      "currency": "Q",
      "type": "transfer",
      "metadata": {
        "description": "Demo transaction 2",
        "category": "demo",
        "created": "2025-01-30T00:00:00.000Z"
      }
    }
  ]
}
EOF
    
    log_success "Test transactions generated"
}

# Run PII scanner
run_pii_scanner() {
    log_info "Running PII scanner on generated data..."
    
    local pii_found=false
    
    # Scan all fixture files
    for file in "$FIXTURES_DIR"/*.json; do
        if [ -f "$file" ]; then
            log_info "Scanning file: $(basename "$file")"
            
            # Check for common PII patterns
            if grep -E '\b\d{3}-\d{2}-\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b' "$file" > /dev/null; then
                log_error "PII detected in file: $(basename "$file")"
                pii_found=true
            fi
        fi
    done
    
    if [ "$pii_found" = true ]; then
        log_error "PII scanner failed - personal information detected in test data"
        exit 1
    fi
    
    log_success "PII scanner passed - no personal information detected"
}

# Validate setup
validate_setup() {
    log_info "Validating demo setup..."
    
    local validation_errors=0
    
    # Check IPFS connectivity
    if ! curl -s http://localhost:5001/api/v0/version > /dev/null 2>&1; then
        log_error "IPFS not accessible"
        ((validation_errors++))
    fi
    
    # Check backend server
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_error "Backend server not accessible"
        ((validation_errors++))
    fi
    
    # Check fixture files
    local required_fixtures=(
        "canonical-identities.json"
        "test-content-samples.json"
        "dao-governance-scenarios.json"
        "canonical-transactions.json"
    )
    
    for fixture in "${required_fixtures[@]}"; do
        if [ ! -f "$FIXTURES_DIR/$fixture" ]; then
            log_error "Missing fixture file: $fixture"
            ((validation_errors++))
        fi
    done
    
    if [ $validation_errors -gt 0 ]; then
        log_error "Setup validation failed with $validation_errors errors"
        exit 1
    fi
    
    log_success "Demo setup validation passed"
}

# Generate setup report
generate_setup_report() {
    log_info "Generating setup report..."
    
    local report_file="$ARTIFACTS_DIR/setup-report.json"
    
    cat > "$report_file" << EOF
{
  "setupId": "setup_$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": "$DEMO_ENV",
  "status": "completed",
  "components": {
    "ipfs": {
      "status": "running",
      "endpoint": "http://localhost:5001"
    },
    "backend": {
      "status": "running",
      "endpoint": "http://localhost:3000"
    },
    "fixtures": {
      "status": "generated",
      "location": "$FIXTURES_DIR"
    }
  },
  "artifacts": {
    "logs": "$LOGS_DIR",
    "fixtures": "$FIXTURES_DIR",
    "results": "$ARTIFACTS_DIR/results"
  },
  "validation": {
    "piiScanPassed": true,
    "connectivityVerified": true,
    "fixturesGenerated": true
  }
}
EOF
    
    log_success "Setup report generated: $report_file"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up demo setup..."
    
    # Stop backend server if running
    if [ -f "$ARTIFACTS_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$ARTIFACTS_DIR/backend.pid")
        if kill -0 "$backend_pid" 2>/dev/null; then
            kill "$backend_pid"
            log_info "Backend server stopped"
        fi
        rm -f "$ARTIFACTS_DIR/backend.pid"
    fi
    
    # Stop IPFS container if running locally
    if [ "$DEMO_ENV" = "local" ] && docker ps | grep -q "ipfs-demo"; then
        docker stop ipfs-demo > /dev/null 2>&1
        docker rm ipfs-demo > /dev/null 2>&1
        log_info "IPFS container stopped"
    fi
}

# Main execution
main() {
    log_info "Starting AnarQ&Q Demo Setup for environment: $DEMO_ENV"
    
    # Set up signal handlers for cleanup
    trap cleanup EXIT INT TERM
    
    check_prerequisites
    setup_directories
    setup_ipfs
    setup_qnet_nodes
    generate_seed_data
    run_pii_scanner
    validate_setup
    generate_setup_report
    
    log_success "Demo setup completed successfully!"
    log_info "Environment: $DEMO_ENV"
    log_info "Artifacts directory: $ARTIFACTS_DIR"
    log_info "Ready to run demo scenarios"
}

# Handle command line arguments
case "${1:-}" in
    "cleanup")
        cleanup
        exit 0
        ;;
    "validate")
        validate_setup
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
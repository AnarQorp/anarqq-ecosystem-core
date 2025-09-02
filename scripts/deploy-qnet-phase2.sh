#!/bin/bash

# QNET Phase 2 Production Deployment Script
# 
# Deploys the AnarQ&Q ecosystem with integrity validation to QNET Phase 2
# Includes decentralization certification and production readiness checks

set -e

# Configuration
DEPLOYMENT_ENV="qnet-phase2"
DEPLOYMENT_ID="deploy-$(date +%s)"
DEPLOYMENT_LOG="./artifacts/deployment/deployment-${DEPLOYMENT_ID}.log"
ROLLBACK_DATA="./artifacts/deployment/rollback-${DEPLOYMENT_ID}.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Create deployment directories
mkdir -p ./artifacts/deployment
mkdir -p ./artifacts/attestation
mkdir -p ./artifacts/certification

log "🚀 Starting QNET Phase 2 Deployment"
log "Deployment ID: $DEPLOYMENT_ID"
log "Environment: $DEPLOYMENT_ENV"
log "Log file: $DEPLOYMENT_LOG"

# Pre-deployment checks
log "📋 Running pre-deployment checks..."

# Check required environment variables
check_env_vars() {
    local required_vars=(
        "QNET_PHASE2_ENDPOINT"
        "QNET_DEPLOYMENT_KEY"
        "IPFS_CLUSTER_ENDPOINT"
        "PI_MAINNET_API_KEY"
        "DATABASE_URL_PRODUCTION"
        "REDIS_URL_PRODUCTION"
        "ENCRYPTION_KEY_PRODUCTION"
        "JWT_SECRET_PRODUCTION"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    success "All required environment variables are set"
}

# Validate deployment configuration
validate_deployment_config() {
    log "Validating deployment configuration..."
    
    # Check if configuration files exist
    local config_files=(
        "./config/production.json"
        "./config/qnet-phase2.json"
        "./config/monitoring-config.json"
        "./config/alerting-config.json"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ ! -f "$config_file" ]; then
            error "Configuration file not found: $config_file"
            exit 1
        fi
    done
    
    # Validate configuration syntax
    for config_file in "${config_files[@]}"; do
        if ! jq empty "$config_file" 2>/dev/null; then
            error "Invalid JSON in configuration file: $config_file"
            exit 1
        fi
    done
    
    success "Deployment configuration validated"
}

# Run security checks
run_security_checks() {
    log "Running security checks..."
    
    # Check for secrets in code
    if grep -r "password\|secret\|key" --include="*.js" --include="*.mjs" --include="*.json" . | grep -v node_modules | grep -v ".git" | grep -v "example" | grep -v "test"; then
        error "Potential secrets found in code. Please review and remove."
        exit 1
    fi
    
    # Run PII scanner
    log "Running PII scanner..."
    if ! node scripts/security/pii-scanner.mjs --strict; then
        error "PII scanner detected issues. Please resolve before deployment."
        exit 1
    fi
    
    # Validate encryption keys
    if [ ${#ENCRYPTION_KEY_PRODUCTION} -lt 32 ]; then
        error "Production encryption key is too short (minimum 32 characters)"
        exit 1
    fi
    
    success "Security checks passed"
}

# Test QNET connectivity
test_qnet_connectivity() {
    log "Testing QNET Phase 2 connectivity..."
    
    # Test QNET endpoint
    if ! curl -s --max-time 10 "$QNET_PHASE2_ENDPOINT/health" > /dev/null; then
        error "Cannot connect to QNET Phase 2 endpoint: $QNET_PHASE2_ENDPOINT"
        exit 1
    fi
    
    # Test IPFS cluster
    if ! curl -s --max-time 10 "$IPFS_CLUSTER_ENDPOINT/api/v0/version" > /dev/null; then
        error "Cannot connect to IPFS cluster: $IPFS_CLUSTER_ENDPOINT"
        exit 1
    fi
    
    success "QNET connectivity verified"
}

# Run pre-deployment validation
run_predeployment_validation() {
    log "Running comprehensive pre-deployment validation..."
    
    # Run integrity validation tests
    log "Running integrity validation tests..."
    if ! npm run test:integrity -- --env=production; then
        error "Integrity validation tests failed"
        exit 1
    fi
    
    # Run Pi integration tests
    log "Running Pi integration tests..."
    if ! npm run test:pi-integration -- --env=mainnet; then
        error "Pi integration tests failed"
        exit 1
    fi
    
    # Run performance benchmarks
    log "Running performance benchmarks..."
    if ! npm run test:performance -- --threshold=production; then
        error "Performance benchmarks failed"
        exit 1
    fi
    
    success "Pre-deployment validation completed"
}

# Generate decentralization attestation
generate_decentralization_attestation() {
    log "Generating decentralization attestation..."
    
    # Run decentralization checks
    local attestation_result
    attestation_result=$(node -e "
        const { IntegrityValidator } = require('./backend/services/IntegrityValidator.mjs');
        
        async function generateAttestation() {
            try {
                const validator = new IntegrityValidator();
                const attestation = await validator.verifyDecentralizationAttestation();
                console.log(JSON.stringify(attestation));
            } catch (error) {
                console.error('Attestation generation failed:', error.message);
                process.exit(1);
            }
        }
        
        generateAttestation();
    ")
    
    if [ $? -ne 0 ]; then
        error "Decentralization attestation generation failed"
        exit 1
    fi
    
    # Parse attestation result
    local attestation_cid
    attestation_cid=$(echo "$attestation_result" | jq -r '.attestationCID')
    
    if [ "$attestation_cid" = "null" ] || [ -z "$attestation_cid" ]; then
        error "Failed to generate attestation CID"
        exit 1
    fi
    
    # Save attestation
    echo "$attestation_result" > "./artifacts/attestation/decentralization-attestation-${DEPLOYMENT_ID}.json"
    
    success "Decentralization attestation generated: $attestation_cid"
    echo "DECENTRALIZATION_ATTESTATION_CID=$attestation_cid" >> "$ROLLBACK_DATA"
}

# Generate integrity report
generate_integrity_report() {
    log "Generating integrity report..."
    
    local integrity_result
    integrity_result=$(node -e "
        const { IntegrityValidator } = require('./backend/services/IntegrityValidator.mjs');
        
        async function generateReport() {
            try {
                const validator = new IntegrityValidator();
                const report = await validator.generateIntegrityReport();
                console.log(JSON.stringify(report));
            } catch (error) {
                console.error('Integrity report generation failed:', error.message);
                process.exit(1);
            }
        }
        
        generateReport();
    ")
    
    if [ $? -ne 0 ]; then
        error "Integrity report generation failed"
        exit 1
    fi
    
    # Parse report result
    local report_cid
    report_cid=$(echo "$integrity_result" | jq -r '.reportCID')
    
    if [ "$report_cid" = "null" ] || [ -z "$report_cid" ]; then
        error "Failed to generate integrity report CID"
        exit 1
    fi
    
    # Save report
    echo "$integrity_result" > "./artifacts/certification/integrity-report-${DEPLOYMENT_ID}.json"
    
    success "Integrity report generated: $report_cid"
    echo "INTEGRITY_REPORT_CID=$report_cid" >> "$ROLLBACK_DATA"
}

# Deploy to QNET Phase 2
deploy_to_qnet() {
    log "Deploying to QNET Phase 2..."
    
    # Create deployment package
    log "Creating deployment package..."
    local deployment_package="./artifacts/deployment/anarq-ecosystem-${DEPLOYMENT_ID}.tar.gz"
    
    tar -czf "$deployment_package" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=artifacts/demo \
        --exclude=artifacts/test-results \
        --exclude="*.log" \
        .
    
    success "Deployment package created: $deployment_package"
    
    # Upload to QNET
    log "Uploading to QNET Phase 2..."
    
    local upload_result
    upload_result=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@$deployment_package" \
        "$QNET_PHASE2_ENDPOINT/deploy" | jq -r '.deploymentId')
    
    if [ "$upload_result" = "null" ] || [ -z "$upload_result" ]; then
        error "Failed to upload deployment package to QNET"
        exit 1
    fi
    
    success "Deployment uploaded to QNET: $upload_result"
    echo "QNET_DEPLOYMENT_ID=$upload_result" >> "$ROLLBACK_DATA"
    
    # Wait for deployment to complete
    log "Waiting for QNET deployment to complete..."
    local max_wait=1800 # 30 minutes
    local wait_time=0
    local deployment_status="pending"
    
    while [ "$deployment_status" != "completed" ] && [ $wait_time -lt $max_wait ]; do
        sleep 30
        wait_time=$((wait_time + 30))
        
        deployment_status=$(curl -s \
            -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
            "$QNET_PHASE2_ENDPOINT/deploy/$upload_result/status" | jq -r '.status')
        
        log "Deployment status: $deployment_status (${wait_time}s elapsed)"
        
        if [ "$deployment_status" = "failed" ]; then
            error "QNET deployment failed"
            exit 1
        fi
    done
    
    if [ "$deployment_status" != "completed" ]; then
        error "Deployment timeout after ${max_wait}s"
        exit 1
    fi
    
    success "QNET deployment completed successfully"
}

# Configure production environment
configure_production_environment() {
    log "Configuring production environment..."
    
    # Deploy configuration to QNET nodes
    local config_deployment
    config_deployment=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        -H "Content-Type: application/json" \
        -d @./config/qnet-phase2.json \
        "$QNET_PHASE2_ENDPOINT/config" | jq -r '.configId')
    
    if [ "$config_deployment" = "null" ] || [ -z "$config_deployment" ]; then
        error "Failed to deploy configuration to QNET"
        exit 1
    fi
    
    success "Production configuration deployed: $config_deployment"
    echo "CONFIG_DEPLOYMENT_ID=$config_deployment" >> "$ROLLBACK_DATA"
    
    # Initialize production databases
    log "Initializing production databases..."
    
    # Run database migrations
    if ! DATABASE_URL="$DATABASE_URL_PRODUCTION" npm run migrate:production; then
        error "Production database migration failed"
        exit 1
    fi
    
    # Initialize IPFS cluster
    log "Initializing IPFS cluster..."
    if ! curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/ipfs/init" > /dev/null; then
        error "IPFS cluster initialization failed"
        exit 1
    fi
    
    success "Production environment configured"
}

# Start services
start_production_services() {
    log "Starting production services..."
    
    # Start ecosystem services on QNET
    local service_start
    service_start=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/services/start" | jq -r '.success')
    
    if [ "$service_start" != "true" ]; then
        error "Failed to start production services"
        exit 1
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to become healthy..."
    local max_wait=600 # 10 minutes
    local wait_time=0
    local all_healthy=false
    
    while [ "$all_healthy" != "true" ] && [ $wait_time -lt $max_wait ]; do
        sleep 15
        wait_time=$((wait_time + 15))
        
        all_healthy=$(curl -s \
            -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
            "$QNET_PHASE2_ENDPOINT/health/all" | jq -r '.allHealthy')
        
        log "Services health check: $all_healthy (${wait_time}s elapsed)"
    done
    
    if [ "$all_healthy" != "true" ]; then
        error "Services failed to become healthy within ${max_wait}s"
        exit 1
    fi
    
    success "All production services are healthy"
}

# Run post-deployment validation
run_postdeployment_validation() {
    log "Running post-deployment validation..."
    
    # Test ecosystem health
    log "Testing ecosystem health..."
    local health_check
    health_check=$(curl -s \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/api/validation/health" | jq -r '.data.overall')
    
    if [ "$health_check" != "healthy" ]; then
        error "Post-deployment health check failed: $health_check"
        exit 1
    fi
    
    # Run integration tests
    log "Running integration tests..."
    if ! QNET_ENDPOINT="$QNET_PHASE2_ENDPOINT" npm run test:integration:production; then
        error "Post-deployment integration tests failed"
        exit 1
    fi
    
    # Validate decentralization
    log "Validating decentralization..."
    local decentralization_check
    decentralization_check=$(curl -s \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/api/validation/decentralization" | jq -r '.data.certified')
    
    if [ "$decentralization_check" != "true" ]; then
        error "Decentralization validation failed"
        exit 1
    fi
    
    success "Post-deployment validation completed"
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."
    
    local deployment_report="./artifacts/deployment/deployment-report-${DEPLOYMENT_ID}.json"
    
    cat > "$deployment_report" << EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "environment": "$DEPLOYMENT_ENV",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "status": "completed",
  "artifacts": {
    "decentralizationAttestationCID": "$(grep DECENTRALIZATION_ATTESTATION_CID "$ROLLBACK_DATA" | cut -d'=' -f2)",
    "integrityReportCID": "$(grep INTEGRITY_REPORT_CID "$ROLLBACK_DATA" | cut -d'=' -f2)",
    "qnetDeploymentId": "$(grep QNET_DEPLOYMENT_ID "$ROLLBACK_DATA" | cut -d'=' -f2)",
    "configDeploymentId": "$(grep CONFIG_DEPLOYMENT_ID "$ROLLBACK_DATA" | cut -d'=' -f2)"
  },
  "validation": {
    "preDeployment": "passed",
    "postDeployment": "passed",
    "decentralization": "certified",
    "integrity": "verified"
  },
  "endpoints": {
    "qnetPhase2": "$QNET_PHASE2_ENDPOINT",
    "ipfsCluster": "$IPFS_CLUSTER_ENDPOINT"
  },
  "rollbackData": "$ROLLBACK_DATA"
}
EOF
    
    success "Deployment report generated: $deployment_report"
}

# Create "Ready for Demo" certification
create_demo_certification() {
    log "Creating 'Ready for Demo' certification..."
    
    local certification_file="./artifacts/certification/ready-for-demo-${DEPLOYMENT_ID}.json"
    local decentralization_cid=$(grep DECENTRALIZATION_ATTESTATION_CID "$ROLLBACK_DATA" | cut -d'=' -f2)
    local integrity_cid=$(grep INTEGRITY_REPORT_CID "$ROLLBACK_DATA" | cut -d'=' -f2)
    
    cat > "$certification_file" << EOF
{
  "certification": "Ready for Demo",
  "deploymentId": "$DEPLOYMENT_ID",
  "environment": "$DEPLOYMENT_ENV",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "certifiedBy": "AnarQ&Q Deployment System",
  "validUntil": "$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "attestations": {
    "decentralizationCertificationCID": "$decentralization_cid",
    "integrityReportCID": "$integrity_cid"
  },
  "validationResults": {
    "performanceGates": "PASS",
    "decentralizationRequirements": "PASS",
    "qualityGates": "PASS",
    "securityRequirements": "PASS"
  },
  "demoEndpoints": {
    "healthDashboard": "$QNET_PHASE2_ENDPOINT/dashboard",
    "apiEndpoint": "$QNET_PHASE2_ENDPOINT/api",
    "ipfsGateway": "$IPFS_CLUSTER_ENDPOINT/ipfs"
  },
  "signature": "$(echo -n "$DEPLOYMENT_ID$decentralization_cid$integrity_cid" | sha256sum | cut -d' ' -f1)"
}
EOF
    
    # Publish certification to IPFS
    local certification_cid
    certification_cid=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        --data-binary "@$certification_file" \
        "$IPFS_CLUSTER_ENDPOINT/api/v0/add" | jq -r '.Hash')
    
    if [ "$certification_cid" = "null" ] || [ -z "$certification_cid" ]; then
        error "Failed to publish certification to IPFS"
        exit 1
    fi
    
    success "'Ready for Demo' certification created and published: $certification_cid"
    echo "DEMO_CERTIFICATION_CID=$certification_cid" >> "$ROLLBACK_DATA"
}

# Main deployment execution
main() {
    log "Starting deployment execution..."
    
    # Pre-deployment phase
    check_env_vars
    validate_deployment_config
    run_security_checks
    test_qnet_connectivity
    run_predeployment_validation
    
    # Certification phase
    generate_decentralization_attestation
    generate_integrity_report
    
    # Deployment phase
    deploy_to_qnet
    configure_production_environment
    start_production_services
    
    # Validation phase
    run_postdeployment_validation
    
    # Reporting phase
    generate_deployment_report
    create_demo_certification
    
    # Final success message
    success "🎉 QNET Phase 2 deployment completed successfully!"
    success "Deployment ID: $DEPLOYMENT_ID"
    success "Decentralization Certification CID: $(grep DECENTRALIZATION_ATTESTATION_CID "$ROLLBACK_DATA" | cut -d'=' -f2)"
    success "Integrity Report CID: $(grep INTEGRITY_REPORT_CID "$ROLLBACK_DATA" | cut -d'=' -f2)"
    success "Demo Certification CID: $(grep DEMO_CERTIFICATION_CID "$ROLLBACK_DATA" | cut -d'=' -f2)"
    
    log "Deployment artifacts saved in: ./artifacts/deployment/"
    log "Rollback data saved in: $ROLLBACK_DATA"
    log "Full deployment log: $DEPLOYMENT_LOG"
}

# Error handling
trap 'error "Deployment failed at line $LINENO. Check $DEPLOYMENT_LOG for details."; exit 1' ERR

# Execute main deployment
main "$@"
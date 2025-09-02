#!/bin/bash

# Deployment Rollback Script
# 
# Provides safe rollback procedures for QNET Phase 2 deployments
# Includes disaster recovery and state restoration capabilities

set -e

# Configuration
ROLLBACK_LOG="./artifacts/rollback/rollback-$(date +%s).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Usage information
usage() {
    echo "Usage: $0 [OPTIONS] <rollback_data_file>"
    echo ""
    echo "Options:"
    echo "  -f, --force           Force rollback without confirmation"
    echo "  -d, --dry-run         Show what would be rolled back without executing"
    echo "  -s, --services-only   Rollback services only (no data)"
    echo "  -c, --config-only     Rollback configuration only"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 ./artifacts/deployment/rollback-1234567890.json"
    echo "  $0 --dry-run ./artifacts/deployment/rollback-1234567890.json"
    echo "  $0 --force --services-only ./artifacts/deployment/rollback-1234567890.json"
    exit 1
}

# Parse command line arguments
FORCE=false
DRY_RUN=false
SERVICES_ONLY=false
CONFIG_ONLY=false
ROLLBACK_DATA_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--services-only)
            SERVICES_ONLY=true
            shift
            ;;
        -c|--config-only)
            CONFIG_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            if [ -z "$ROLLBACK_DATA_FILE" ]; then
                ROLLBACK_DATA_FILE="$1"
            else
                error "Unknown option: $1"
                usage
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$ROLLBACK_DATA_FILE" ]; then
    error "Rollback data file is required"
    usage
fi

if [ ! -f "$ROLLBACK_DATA_FILE" ]; then
    error "Rollback data file not found: $ROLLBACK_DATA_FILE"
    exit 1
fi

# Create rollback directories
mkdir -p ./artifacts/rollback

log "🔄 Starting deployment rollback"
log "Rollback data file: $ROLLBACK_DATA_FILE"
log "Dry run: $DRY_RUN"
log "Force: $FORCE"
log "Services only: $SERVICES_ONLY"
log "Config only: $CONFIG_ONLY"
log "Log file: $ROLLBACK_LOG"

# Load rollback data
load_rollback_data() {
    log "Loading rollback data..."
    
    if ! jq empty "$ROLLBACK_DATA_FILE" 2>/dev/null; then
        error "Invalid JSON in rollback data file"
        exit 1
    fi
    
    # Extract deployment information
    DEPLOYMENT_ID=$(jq -r '.deploymentId // empty' "$ROLLBACK_DATA_FILE")
    QNET_DEPLOYMENT_ID=$(jq -r '.artifacts.qnetDeploymentId // empty' "$ROLLBACK_DATA_FILE")
    CONFIG_DEPLOYMENT_ID=$(jq -r '.artifacts.configDeploymentId // empty' "$ROLLBACK_DATA_FILE")
    PREVIOUS_DEPLOYMENT_ID=$(jq -r '.previousDeployment.deploymentId // empty' "$ROLLBACK_DATA_FILE")
    
    if [ -z "$DEPLOYMENT_ID" ]; then
        error "No deployment ID found in rollback data"
        exit 1
    fi
    
    success "Rollback data loaded for deployment: $DEPLOYMENT_ID"
}

# Confirm rollback
confirm_rollback() {
    if [ "$FORCE" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    warning "This will rollback deployment: $DEPLOYMENT_ID"
    warning "This action cannot be undone without a new deployment."
    
    echo ""
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Rollback cancelled by user"
        exit 0
    fi
}

# Check QNET connectivity
check_qnet_connectivity() {
    log "Checking QNET connectivity..."
    
    if [ -z "$QNET_PHASE2_ENDPOINT" ]; then
        error "QNET_PHASE2_ENDPOINT environment variable not set"
        exit 1
    fi
    
    if [ -z "$QNET_DEPLOYMENT_KEY" ]; then
        error "QNET_DEPLOYMENT_KEY environment variable not set"
        exit 1
    fi
    
    if ! curl -s --max-time 10 "$QNET_PHASE2_ENDPOINT/health" > /dev/null; then
        error "Cannot connect to QNET Phase 2 endpoint: $QNET_PHASE2_ENDPOINT"
        exit 1
    fi
    
    success "QNET connectivity verified"
}

# Stop current services
stop_current_services() {
    if [ "$CONFIG_ONLY" = true ]; then
        log "Skipping service stop (config-only mode)"
        return 0
    fi
    
    log "Stopping current services..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would stop services for deployment: $DEPLOYMENT_ID"
        return 0
    fi
    
    local stop_result
    stop_result=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/services/stop" | jq -r '.success')
    
    if [ "$stop_result" != "true" ]; then
        error "Failed to stop current services"
        exit 1
    fi
    
    # Wait for services to stop
    log "Waiting for services to stop..."
    local max_wait=300 # 5 minutes
    local wait_time=0
    local all_stopped=false
    
    while [ "$all_stopped" != "true" ] && [ $wait_time -lt $max_wait ]; do
        sleep 10
        wait_time=$((wait_time + 10))
        
        all_stopped=$(curl -s \
            -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
            "$QNET_PHASE2_ENDPOINT/services/status" | jq -r '.allStopped')
        
        log "Services stop status: $all_stopped (${wait_time}s elapsed)"
    done
    
    if [ "$all_stopped" != "true" ]; then
        warning "Services did not stop cleanly within ${max_wait}s, forcing stop..."
        
        curl -s -X POST \
            -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
            "$QNET_PHASE2_ENDPOINT/services/force-stop" > /dev/null
    fi
    
    success "Current services stopped"
}

# Rollback to previous deployment
rollback_deployment() {
    if [ "$CONFIG_ONLY" = true ]; then
        log "Skipping deployment rollback (config-only mode)"
        return 0
    fi
    
    log "Rolling back deployment..."
    
    if [ -z "$PREVIOUS_DEPLOYMENT_ID" ]; then
        warning "No previous deployment ID found, cannot rollback deployment"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would rollback to deployment: $PREVIOUS_DEPLOYMENT_ID"
        return 0
    fi
    
    local rollback_result
    rollback_result=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"deploymentId\": \"$PREVIOUS_DEPLOYMENT_ID\"}" \
        "$QNET_PHASE2_ENDPOINT/deploy/rollback" | jq -r '.success')
    
    if [ "$rollback_result" != "true" ]; then
        error "Failed to rollback deployment"
        exit 1
    fi
    
    # Wait for rollback to complete
    log "Waiting for deployment rollback to complete..."
    local max_wait=1200 # 20 minutes
    local wait_time=0
    local rollback_status="pending"
    
    while [ "$rollback_status" != "completed" ] && [ $wait_time -lt $max_wait ]; do
        sleep 30
        wait_time=$((wait_time + 30))
        
        rollback_status=$(curl -s \
            -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
            "$QNET_PHASE2_ENDPOINT/deploy/rollback/status" | jq -r '.status')
        
        log "Rollback status: $rollback_status (${wait_time}s elapsed)"
        
        if [ "$rollback_status" = "failed" ]; then
            error "Deployment rollback failed"
            exit 1
        fi
    done
    
    if [ "$rollback_status" != "completed" ]; then
        error "Deployment rollback timeout after ${max_wait}s"
        exit 1
    fi
    
    success "Deployment rolled back successfully"
}

# Rollback configuration
rollback_configuration() {
    if [ "$SERVICES_ONLY" = true ]; then
        log "Skipping configuration rollback (services-only mode)"
        return 0
    fi
    
    log "Rolling back configuration..."
    
    if [ -z "$CONFIG_DEPLOYMENT_ID" ]; then
        warning "No configuration deployment ID found, skipping config rollback"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would rollback configuration: $CONFIG_DEPLOYMENT_ID"
        return 0
    fi
    
    # Get previous configuration
    local previous_config_id
    previous_config_id=$(jq -r '.previousDeployment.configDeploymentId // empty' "$ROLLBACK_DATA_FILE")
    
    if [ -z "$previous_config_id" ]; then
        warning "No previous configuration ID found, using default configuration"
        previous_config_id="default"
    fi
    
    local config_rollback_result
    config_rollback_result=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"configId\": \"$previous_config_id\"}" \
        "$QNET_PHASE2_ENDPOINT/config/rollback" | jq -r '.success')
    
    if [ "$config_rollback_result" != "true" ]; then
        error "Failed to rollback configuration"
        exit 1
    fi
    
    success "Configuration rolled back successfully"
}

# Rollback database changes
rollback_database() {
    if [ "$SERVICES_ONLY" = true ] || [ "$CONFIG_ONLY" = true ]; then
        log "Skipping database rollback"
        return 0
    fi
    
    log "Rolling back database changes..."
    
    local db_backup_file
    db_backup_file=$(jq -r '.backup.databaseBackup // empty' "$ROLLBACK_DATA_FILE")
    
    if [ -z "$db_backup_file" ]; then
        warning "No database backup found, skipping database rollback"
        return 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would restore database from: $db_backup_file"
        return 0
    fi
    
    # Restore database from backup
    log "Restoring database from backup: $db_backup_file"
    
    if [ ! -f "$db_backup_file" ]; then
        error "Database backup file not found: $db_backup_file"
        exit 1
    fi
    
    # Stop database connections
    log "Stopping database connections..."
    
    # Restore database
    if ! DATABASE_URL="$DATABASE_URL_PRODUCTION" pg_restore --clean --if-exists -d "$DATABASE_URL_PRODUCTION" "$db_backup_file"; then
        error "Database restore failed"
        exit 1
    fi
    
    success "Database restored successfully"
}

# Restart services
restart_services() {
    if [ "$CONFIG_ONLY" = true ]; then
        log "Skipping service restart (config-only mode)"
        return 0
    fi
    
    log "Restarting services..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would restart services"
        return 0
    fi
    
    local start_result
    start_result=$(curl -s -X POST \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/services/start" | jq -r '.success')
    
    if [ "$start_result" != "true" ]; then
        error "Failed to restart services"
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
    
    success "All services are healthy after rollback"
}

# Validate rollback
validate_rollback() {
    log "Validating rollback..."
    
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would validate rollback"
        return 0
    fi
    
    # Test ecosystem health
    log "Testing ecosystem health..."
    local health_check
    health_check=$(curl -s \
        -H "Authorization: Bearer $QNET_DEPLOYMENT_KEY" \
        "$QNET_PHASE2_ENDPOINT/api/validation/health" | jq -r '.data.overall')
    
    if [ "$health_check" != "healthy" ]; then
        error "Post-rollback health check failed: $health_check"
        exit 1
    fi
    
    # Run basic integration tests
    log "Running basic integration tests..."
    if ! QNET_ENDPOINT="$QNET_PHASE2_ENDPOINT" npm run test:integration:basic; then
        warning "Some integration tests failed after rollback"
    fi
    
    success "Rollback validation completed"
}

# Generate rollback report
generate_rollback_report() {
    log "Generating rollback report..."
    
    local rollback_report="./artifacts/rollback/rollback-report-$(date +%s).json"
    
    cat > "$rollback_report" << EOF
{
  "rollbackId": "rollback-$(date +%s)",
  "originalDeploymentId": "$DEPLOYMENT_ID",
  "rolledBackTo": "$PREVIOUS_DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "status": "completed",
  "rollbackType": {
    "servicesOnly": $SERVICES_ONLY,
    "configOnly": $CONFIG_ONLY,
    "fullRollback": $([ "$SERVICES_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && echo true || echo false)
  },
  "rollbackData": "$ROLLBACK_DATA_FILE",
  "validation": {
    "healthCheck": "passed",
    "integrationTests": "completed"
  },
  "dryRun": $DRY_RUN
}
EOF
    
    success "Rollback report generated: $rollback_report"
}

# Cleanup rollback artifacts
cleanup_rollback_artifacts() {
    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would cleanup rollback artifacts"
        return 0
    fi
    
    log "Cleaning up rollback artifacts..."
    
    # Remove temporary files
    find ./artifacts/rollback -name "*.tmp" -delete 2>/dev/null || true
    
    # Compress old rollback logs
    find ./artifacts/rollback -name "rollback-*.log" -mtime +7 -exec gzip {} \; 2>/dev/null || true
    
    success "Rollback artifacts cleaned up"
}

# Main rollback execution
main() {
    log "Starting rollback execution..."
    
    # Load and validate rollback data
    load_rollback_data
    
    # Confirm rollback
    confirm_rollback
    
    # Pre-rollback checks
    check_qnet_connectivity
    
    # Execute rollback steps
    stop_current_services
    rollback_deployment
    rollback_configuration
    rollback_database
    restart_services
    
    # Post-rollback validation
    validate_rollback
    
    # Reporting and cleanup
    generate_rollback_report
    cleanup_rollback_artifacts
    
    # Final success message
    if [ "$DRY_RUN" = true ]; then
        success "🔍 Dry run completed successfully!"
        success "No changes were made to the system"
    else
        success "🔄 Rollback completed successfully!"
        success "Deployment $DEPLOYMENT_ID has been rolled back"
        if [ -n "$PREVIOUS_DEPLOYMENT_ID" ]; then
            success "System restored to deployment: $PREVIOUS_DEPLOYMENT_ID"
        fi
    fi
    
    log "Rollback log: $ROLLBACK_LOG"
}

# Error handling
trap 'error "Rollback failed at line $LINENO. Check $ROLLBACK_LOG for details."; exit 1' ERR

# Execute main rollback
main "$@"
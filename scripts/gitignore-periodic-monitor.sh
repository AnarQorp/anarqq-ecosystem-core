#!/bin/bash

# ========================================
# AnarQ-Q Ecosystem Gitignore Periodic Monitor
# ========================================
# This script sets up periodic monitoring for gitignore effectiveness
# and provides automated alerts for issues that need attention.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-gitignore-effectiveness.sh"
ALERT_LOG="$PROJECT_ROOT/.git/gitignore-alerts.log"
CONFIG_FILE="$PROJECT_ROOT/.git/gitignore-monitor-config"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_CHECK_INTERVAL_HOURS=24
DEFAULT_ALERT_THRESHOLD_UNTRACKED=50
DEFAULT_ALERT_THRESHOLD_SIZE_INCREASE=20
DEFAULT_ENABLE_EMAIL_ALERTS=false
DEFAULT_EMAIL_RECIPIENT=""

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        # Create default configuration
        cat > "$CONFIG_FILE" << EOF
# AnarQ-Q Gitignore Monitor Configuration
CHECK_INTERVAL_HOURS=$DEFAULT_CHECK_INTERVAL_HOURS
ALERT_THRESHOLD_UNTRACKED=$DEFAULT_ALERT_THRESHOLD_UNTRACKED
ALERT_THRESHOLD_SIZE_INCREASE=$DEFAULT_ALERT_THRESHOLD_SIZE_INCREASE
ENABLE_EMAIL_ALERTS=$DEFAULT_ENABLE_EMAIL_ALERTS
EMAIL_RECIPIENT="$DEFAULT_EMAIL_RECIPIENT"
LAST_CHECK_TIMESTAMP=0
EOF
        source "$CONFIG_FILE"
    fi
}

# Save configuration
save_config() {
    cat > "$CONFIG_FILE" << EOF
# AnarQ-Q Gitignore Monitor Configuration
CHECK_INTERVAL_HOURS=$CHECK_INTERVAL_HOURS
ALERT_THRESHOLD_UNTRACKED=$ALERT_THRESHOLD_UNTRACKED
ALERT_THRESHOLD_SIZE_INCREASE=$ALERT_THRESHOLD_SIZE_INCREASE
ENABLE_EMAIL_ALERTS=$ENABLE_EMAIL_ALERTS
EMAIL_RECIPIENT="$EMAIL_RECIPIENT"
LAST_CHECK_TIMESTAMP=$LAST_CHECK_TIMESTAMP
EOF
}

# Log alert
log_alert() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$ALERT_LOG"
    
    case $level in
        "CRITICAL")
            echo -e "${RED}🚨 CRITICAL: $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING: $message${NC}"
            ;;
        "INFO")
            echo -e "${GREEN}ℹ️  INFO: $message${NC}"
            ;;
    esac
}

# Send email alert (if configured)
send_email_alert() {
    local subject="$1"
    local body="$2"
    
    if [ "$ENABLE_EMAIL_ALERTS" = "true" ] && [ -n "$EMAIL_RECIPIENT" ]; then
        if command -v mail >/dev/null 2>&1; then
            echo "$body" | mail -s "$subject" "$EMAIL_RECIPIENT"
            log_alert "INFO" "Email alert sent to $EMAIL_RECIPIENT"
        else
            log_alert "WARNING" "Email alerts enabled but 'mail' command not available"
        fi
    fi
}

# Check if monitoring is due
is_monitoring_due() {
    local current_timestamp=$(date +%s)
    local interval_seconds=$((CHECK_INTERVAL_HOURS * 3600))
    local next_check=$((LAST_CHECK_TIMESTAMP + interval_seconds))
    
    [ $current_timestamp -ge $next_check ]
}

# Run monitoring check
run_monitoring_check() {
    log_alert "INFO" "Starting periodic gitignore monitoring check"
    
    # Run the main monitoring script
    local temp_output=$(mktemp)
    local exit_code=0
    
    if ! "$MONITOR_SCRIPT" > "$temp_output" 2>&1; then
        exit_code=$?
    fi
    
    # Parse results and generate alerts
    local untracked_count=$(grep "Untracked files count:" "$temp_output" | awk '{print $4}' || echo "0")
    local large_files_count=$(grep "Large files.*count:" "$temp_output" | awk '{print $6}' || echo "0")
    local ignored_essential_count=$(grep "Potentially essential ignored files:" "$temp_output" | awk '{print $5}' || echo "0")
    
    # Check thresholds and generate alerts
    if [ $exit_code -eq 2 ]; then
        log_alert "CRITICAL" "Gitignore monitoring detected critical issues requiring immediate attention"
        send_email_alert "CRITICAL: AnarQ-Q Gitignore Issues" "$(cat "$temp_output")"
    elif [ $exit_code -eq 1 ]; then
        log_alert "WARNING" "Gitignore monitoring detected issues that need attention"
        
        if [ "$untracked_count" -gt "$ALERT_THRESHOLD_UNTRACKED" ]; then
            log_alert "WARNING" "High number of untracked files: $untracked_count (threshold: $ALERT_THRESHOLD_UNTRACKED)"
        fi
        
        if [ "$ignored_essential_count" -gt 0 ]; then
            log_alert "WARNING" "Potentially essential files being ignored: $ignored_essential_count"
        fi
        
        if [ "$large_files_count" -gt 10 ]; then
            log_alert "WARNING" "High number of large files detected: $large_files_count"
        fi
    else
        log_alert "INFO" "Gitignore monitoring completed successfully - no issues detected"
    fi
    
    # Update last check timestamp
    LAST_CHECK_TIMESTAMP=$(date +%s)
    save_config
    
    rm -f "$temp_output"
    return $exit_code
}

# Setup cron job for periodic monitoring
setup_cron() {
    local cron_schedule="$1"
    local script_path="$SCRIPT_DIR/gitignore-periodic-monitor.sh"
    
    # Remove existing cron job
    (crontab -l 2>/dev/null | grep -v "$script_path" || true) | crontab -
    
    # Add new cron job
    (crontab -l 2>/dev/null || true; echo "$cron_schedule $script_path --cron") | crontab -
    
    log_alert "INFO" "Cron job scheduled: $cron_schedule"
}

# Remove cron job
remove_cron() {
    local script_path="$SCRIPT_DIR/gitignore-periodic-monitor.sh"
    (crontab -l 2>/dev/null | grep -v "$script_path" || true) | crontab -
    log_alert "INFO" "Cron job removed"
}

# Show status
show_status() {
    load_config
    
    echo -e "${BLUE}AnarQ-Q Gitignore Monitor Status${NC}"
    echo "=================================="
    echo "Check interval: $CHECK_INTERVAL_HOURS hours"
    echo "Alert threshold (untracked): $ALERT_THRESHOLD_UNTRACKED files"
    echo "Alert threshold (size increase): $ALERT_THRESHOLD_SIZE_INCREASE%"
    echo "Email alerts: $ENABLE_EMAIL_ALERTS"
    if [ "$ENABLE_EMAIL_ALERTS" = "true" ]; then
        echo "Email recipient: $EMAIL_RECIPIENT"
    fi
    
    if [ $LAST_CHECK_TIMESTAMP -gt 0 ]; then
        local last_check_date=$(date -d "@$LAST_CHECK_TIMESTAMP" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $LAST_CHECK_TIMESTAMP '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown")
        echo "Last check: $last_check_date"
        
        local next_check=$((LAST_CHECK_TIMESTAMP + CHECK_INTERVAL_HOURS * 3600))
        local next_check_date=$(date -d "@$next_check" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $next_check '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown")
        echo "Next check: $next_check_date"
        
        if is_monitoring_due; then
            echo -e "Status: ${YELLOW}Check due${NC}"
        else
            echo -e "Status: ${GREEN}Up to date${NC}"
        fi
    else
        echo "Last check: Never"
        echo -e "Status: ${YELLOW}Initial check needed${NC}"
    fi
    
    # Show recent alerts
    if [ -f "$ALERT_LOG" ]; then
        echo ""
        echo "Recent alerts (last 10):"
        tail -10 "$ALERT_LOG" | while read line; do
            if echo "$line" | grep -q "CRITICAL"; then
                echo -e "${RED}$line${NC}"
            elif echo "$line" | grep -q "WARNING"; then
                echo -e "${YELLOW}$line${NC}"
            else
                echo "$line"
            fi
        done
    fi
    
    # Check if cron job is installed
    echo ""
    if crontab -l 2>/dev/null | grep -q "gitignore-periodic-monitor.sh"; then
        echo -e "Cron job: ${GREEN}Installed${NC}"
        crontab -l | grep "gitignore-periodic-monitor.sh"
    else
        echo -e "Cron job: ${YELLOW}Not installed${NC}"
    fi
}

# Configure monitoring
configure() {
    load_config
    
    echo -e "${BLUE}Configure Gitignore Monitoring${NC}"
    echo "=============================="
    
    read -p "Check interval in hours [$CHECK_INTERVAL_HOURS]: " new_interval
    if [ -n "$new_interval" ]; then
        CHECK_INTERVAL_HOURS="$new_interval"
    fi
    
    read -p "Alert threshold for untracked files [$ALERT_THRESHOLD_UNTRACKED]: " new_threshold
    if [ -n "$new_threshold" ]; then
        ALERT_THRESHOLD_UNTRACKED="$new_threshold"
    fi
    
    read -p "Alert threshold for size increase % [$ALERT_THRESHOLD_SIZE_INCREASE]: " new_size_threshold
    if [ -n "$new_size_threshold" ]; then
        ALERT_THRESHOLD_SIZE_INCREASE="$new_size_threshold"
    fi
    
    read -p "Enable email alerts? (true/false) [$ENABLE_EMAIL_ALERTS]: " new_email_enabled
    if [ -n "$new_email_enabled" ]; then
        ENABLE_EMAIL_ALERTS="$new_email_enabled"
    fi
    
    if [ "$ENABLE_EMAIL_ALERTS" = "true" ]; then
        read -p "Email recipient [$EMAIL_RECIPIENT]: " new_email
        if [ -n "$new_email" ]; then
            EMAIL_RECIPIENT="$new_email"
        fi
    fi
    
    save_config
    echo -e "${GREEN}Configuration saved${NC}"
    
    # Ask about cron setup
    echo ""
    read -p "Setup automatic monitoring with cron? (y/n): " setup_cron_answer
    if [ "$setup_cron_answer" = "y" ] || [ "$setup_cron_answer" = "Y" ]; then
        # Calculate cron schedule based on interval
        if [ $CHECK_INTERVAL_HOURS -eq 24 ]; then
            cron_schedule="0 9 * * *"  # Daily at 9 AM
        elif [ $CHECK_INTERVAL_HOURS -eq 12 ]; then
            cron_schedule="0 9,21 * * *"  # Twice daily
        elif [ $CHECK_INTERVAL_HOURS -eq 6 ]; then
            cron_schedule="0 */6 * * *"  # Every 6 hours
        else
            cron_schedule="0 */$CHECK_INTERVAL_HOURS * * *"  # Every N hours
        fi
        
        setup_cron "$cron_schedule"
        echo -e "${GREEN}Cron job setup complete${NC}"
    fi
}

# Show help
show_help() {
    cat << EOF
AnarQ-Q Gitignore Periodic Monitor

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    check           Run monitoring check now
    status          Show current monitoring status
    configure       Configure monitoring settings
    setup-cron      Setup automatic monitoring with cron
    remove-cron     Remove cron job
    alerts          Show recent alerts
    help            Show this help message

OPTIONS:
    --cron          Run in cron mode (used internally by cron job)
    --force         Force check even if not due

EXAMPLES:
    $0 check                    # Run monitoring check now
    $0 status                   # Show current status
    $0 configure                # Configure monitoring settings
    $0 setup-cron "0 9 * * *"   # Setup daily monitoring at 9 AM
    $0 alerts                   # Show recent alerts

CONFIGURATION:
    Configuration is stored in: $CONFIG_FILE
    Alert log is stored in: $ALERT_LOG

EOF
}

# Main script logic
main() {
    local command="${1:-status}"
    local force_check=false
    local cron_mode=false
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                force_check=true
                shift
                ;;
            --cron)
                cron_mode=true
                shift
                ;;
            *)
                command="$1"
                shift
                ;;
        esac
    done
    
    # Load configuration
    load_config
    
    case $command in
        "check")
            if $force_check || is_monitoring_due; then
                run_monitoring_check
            else
                echo -e "${YELLOW}Monitoring check not due yet. Use --force to run anyway.${NC}"
                echo "Next check due: $(date -d "@$((LAST_CHECK_TIMESTAMP + CHECK_INTERVAL_HOURS * 3600))" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown")"
            fi
            ;;
        "status")
            show_status
            ;;
        "configure")
            configure
            ;;
        "setup-cron")
            local schedule="${2:-0 9 * * *}"
            setup_cron "$schedule"
            ;;
        "remove-cron")
            remove_cron
            ;;
        "alerts")
            if [ -f "$ALERT_LOG" ]; then
                echo -e "${BLUE}Recent Gitignore Alerts${NC}"
                echo "======================="
                tail -20 "$ALERT_LOG" | while read line; do
                    if echo "$line" | grep -q "CRITICAL"; then
                        echo -e "${RED}$line${NC}"
                    elif echo "$line" | grep -q "WARNING"; then
                        echo -e "${YELLOW}$line${NC}"
                    else
                        echo "$line"
                    fi
                done
            else
                echo "No alerts logged yet."
            fi
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            if $cron_mode; then
                # Running from cron - check if monitoring is due
                if is_monitoring_due; then
                    run_monitoring_check
                fi
            else
                echo "Unknown command: $command"
                echo "Use '$0 help' for usage information."
                exit 1
            fi
            ;;
    esac
}

# Run main function with all arguments
main "$@"
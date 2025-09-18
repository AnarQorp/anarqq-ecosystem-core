#!/bin/bash

# AnarQ&Q Ecosystem Installer - Logging Configuration System
# Version: 1.0.0
# Author: AnarQorp
# License: MIT

# Logging configuration variables
declare -g LOG_LEVEL="INFO"  # DEBUG, INFO, WARN, ERROR
declare -g LOG_FORMAT="STANDARD"  # STANDARD, JSON, STRUCTURED
declare -g LOG_OUTPUT="BOTH"  # FILE, CONSOLE, BOTH
declare -g LOG_ROTATION_ENABLED=true
declare -g LOG_MAX_SIZE="10M"
declare -g LOG_MAX_FILES=5
declare -g LOG_COLORS_ENABLED=true

# Log level priorities (lower number = higher priority)
declare -A LOG_PRIORITIES=(
    ["DEBUG"]=0
    ["INFO"]=1
    ["WARN"]=2
    ["ERROR"]=3
)

# ANSI color codes for log levels
declare -A LOG_COLORS=(
    ["DEBUG"]='\033[0;36m'    # Cyan
    ["INFO"]='\033[0;34m'     # Blue
    ["WARN"]='\033[1;33m'     # Yellow
    ["ERROR"]='\033[0;31m'    # Red
    ["SUCCESS"]='\033[0;32m'  # Green
    ["RESET"]='\033[0m'       # Reset
)

# Configure logging system
configure_logging() {
    local config_file="${1:-}"
    
    # Load configuration from file if provided
    if [ -n "$config_file" ] && [ -f "$config_file" ]; then
        source "$config_file"
        log_info "LOGGING" "Loaded logging configuration from: $config_file"
    fi
    
    # Validate log level
    if [[ ! "${LOG_PRIORITIES[$LOG_LEVEL]+isset}" ]]; then
        LOG_LEVEL="INFO"
        log_warning "LOGGING" "Invalid log level specified, defaulting to INFO"
    fi
    
    # Disable colors if not supported or requested
    if [ "$LOG_COLORS_ENABLED" = false ] || [ ! -t 1 ]; then
        LOG_COLORS_ENABLED=false
    fi
    
    log_info "LOGGING" "Logging system configured - Level: $LOG_LEVEL, Format: $LOG_FORMAT, Output: $LOG_OUTPUT"
}

# Check if message should be logged based on level
should_log() {
    local message_level="$1"
    local current_priority=${LOG_PRIORITIES[$LOG_LEVEL]}
    local message_priority=${LOG_PRIORITIES[$message_level]}
    
    [ $message_priority -ge $current_priority ]
}

# Format log message based on configuration
format_log_message() {
    local level="$1"
    local category="$2"
    local message="$3"
    local context="$4"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local pid=$$
    
    case "$LOG_FORMAT" in
        "JSON")
            format_json_log "$timestamp" "$pid" "$level" "$category" "$message" "$context"
            ;;
        "STRUCTURED")
            format_structured_log "$timestamp" "$pid" "$level" "$category" "$message" "$context"
            ;;
        *)
            format_standard_log "$timestamp" "$pid" "$level" "$category" "$message" "$context"
            ;;
    esac
}

# Standard log format
format_standard_log() {
    local timestamp="$1"
    local pid="$2"
    local level="$3"
    local category="$4"
    local message="$5"
    local context="$6"
    
    local formatted="[$timestamp] [$pid] [$level] [$category]: $message"
    
    if [ -n "$context" ]; then
        formatted="$formatted | Context: $context"
    fi
    
    # Add current step and component if available
    if [ -n "$INSTALLER_CURRENT_STEP" ]; then
        formatted="$formatted | Step: $INSTALLER_CURRENT_STEP"
    fi
    
    if [ -n "$INSTALLER_CURRENT_COMPONENT" ]; then
        formatted="$formatted | Component: $INSTALLER_CURRENT_COMPONENT"
    fi
    
    echo "$formatted"
}

# JSON log format
format_json_log() {
    local timestamp="$1"
    local pid="$2"
    local level="$3"
    local category="$4"
    local message="$5"
    local context="$6"
    
    # Escape JSON special characters
    message=$(echo "$message" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\n/\\n/g; s/\r/\\r/g')
    context=$(echo "$context" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/\n/\\n/g; s/\r/\\r/g')
    
    local json_log="{"
    json_log+="\"timestamp\":\"$timestamp\","
    json_log+="\"pid\":$pid,"
    json_log+="\"level\":\"$level\","
    json_log+="\"category\":\"$category\","
    json_log+="\"message\":\"$message\""
    
    if [ -n "$context" ]; then
        json_log+=",\"context\":\"$context\""
    fi
    
    if [ -n "$INSTALLER_CURRENT_STEP" ]; then
        json_log+=",\"step\":\"$INSTALLER_CURRENT_STEP\""
    fi
    
    if [ -n "$INSTALLER_CURRENT_COMPONENT" ]; then
        json_log+=",\"component\":\"$INSTALLER_CURRENT_COMPONENT\""
    fi
    
    json_log+="}"
    
    echo "$json_log"
}

# Structured log format
format_structured_log() {
    local timestamp="$1"
    local pid="$2"
    local level="$3"
    local category="$4"
    local message="$5"
    local context="$6"
    
    local structured=""
    structured+="timestamp=$timestamp "
    structured+="pid=$pid "
    structured+="level=$level "
    structured+="category=$category "
    structured+="message=\"$message\" "
    
    if [ -n "$context" ]; then
        structured+="context=\"$context\" "
    fi
    
    if [ -n "$INSTALLER_CURRENT_STEP" ]; then
        structured+="step=\"$INSTALLER_CURRENT_STEP\" "
    fi
    
    if [ -n "$INSTALLER_CURRENT_COMPONENT" ]; then
        structured+="component=\"$INSTALLER_CURRENT_COMPONENT\" "
    fi
    
    echo "$structured"
}

# Output log message to console with colors
output_to_console() {
    local level="$1"
    local message="$2"
    local context="$3"
    
    if [ "$LOG_OUTPUT" = "FILE" ]; then
        return 0
    fi
    
    local color=""
    local reset=""
    
    if [ "$LOG_COLORS_ENABLED" = true ]; then
        color="${LOG_COLORS[$level]}"
        reset="${LOG_COLORS[RESET]}"
    fi
    
    case "$level" in
        "ERROR")
            echo -e "${color}❌ $message${reset}" >&2
            ;;
        "WARN")
            echo -e "${color}⚠️  $message${reset}" >&2
            ;;
        "INFO")
            echo -e "${color}ℹ️  $message${reset}"
            ;;
        "DEBUG")
            echo -e "${color}🔍 [DEBUG] $message${reset}"
            ;;
        "SUCCESS")
            echo -e "${color}✅ $message${reset}"
            ;;
        *)
            echo -e "${color}$message${reset}"
            ;;
    esac
    
    if [ -n "$context" ] && [ "$INSTALLER_VERBOSE_MODE" = true ]; then
        echo -e "   ${color}→ Context: $context${reset}"
    fi
}

# Output log message to file
output_to_file() {
    local formatted_message="$1"
    
    if [ "$LOG_OUTPUT" = "CONSOLE" ]; then
        return 0
    fi
    
    if [ -n "$INSTALLER_LOG_FILE" ]; then
        echo "$formatted_message" >> "$INSTALLER_LOG_FILE"
        
        # Check for log rotation if enabled
        if [ "$LOG_ROTATION_ENABLED" = true ]; then
            check_log_rotation
        fi
    fi
}

# Check and perform log rotation
check_log_rotation() {
    if [ ! -f "$INSTALLER_LOG_FILE" ]; then
        return 0
    fi
    
    local file_size=$(stat -f%z "$INSTALLER_LOG_FILE" 2>/dev/null || stat -c%s "$INSTALLER_LOG_FILE" 2>/dev/null || echo "0")
    local max_size_bytes
    
    # Convert LOG_MAX_SIZE to bytes
    case "${LOG_MAX_SIZE: -1}" in
        "K"|"k")
            max_size_bytes=$((${LOG_MAX_SIZE%?} * 1024))
            ;;
        "M"|"m")
            max_size_bytes=$((${LOG_MAX_SIZE%?} * 1024 * 1024))
            ;;
        "G"|"g")
            max_size_bytes=$((${LOG_MAX_SIZE%?} * 1024 * 1024 * 1024))
            ;;
        *)
            max_size_bytes=${LOG_MAX_SIZE}
            ;;
    esac
    
    if [ "$file_size" -gt "$max_size_bytes" ]; then
        rotate_log_file
    fi
}

# Rotate log file
rotate_log_file() {
    local base_name="${INSTALLER_LOG_FILE%.*}"
    local extension="${INSTALLER_LOG_FILE##*.}"
    
    # Shift existing rotated files
    for ((i=LOG_MAX_FILES-1; i>=1; i--)); do
        local old_file="${base_name}.${i}.${extension}"
        local new_file="${base_name}.$((i+1)).${extension}"
        
        if [ -f "$old_file" ]; then
            if [ $i -eq $((LOG_MAX_FILES-1)) ]; then
                rm -f "$old_file"  # Remove oldest file
            else
                mv "$old_file" "$new_file"
            fi
        fi
    done
    
    # Move current log to .1
    if [ -f "$INSTALLER_LOG_FILE" ]; then
        mv "$INSTALLER_LOG_FILE" "${base_name}.1.${extension}"
    fi
    
    # Create new log file
    touch "$INSTALLER_LOG_FILE"
    
    log_info "LOGGING" "Log file rotated due to size limit"
}

# Enhanced logging function with configuration support
enhanced_log_message() {
    local level="$1"
    local category="$2"
    local message="$3"
    local context="${4:-}"
    
    # Check if message should be logged
    if ! should_log "$level"; then
        return 0
    fi
    
    # Format the message
    local formatted_message=$(format_log_message "$level" "$category" "$message" "$context")
    
    # Output to file
    output_to_file "$formatted_message"
    
    # Output to console
    output_to_console "$level" "$message" "$context"
}

# Performance logging functions
log_performance_start() {
    local operation="$1"
    local start_time=$(date +%s.%N)
    
    # Store start time in a temporary file
    echo "$start_time" > "/tmp/perf_${operation}_$$"
    
    log_debug "PERFORMANCE" "Started operation: $operation"
}

log_performance_end() {
    local operation="$1"
    local end_time=$(date +%s.%N)
    local start_file="/tmp/perf_${operation}_$$"
    
    if [ -f "$start_file" ]; then
        local start_time=$(cat "$start_file")
        local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        
        log_info "PERFORMANCE" "Completed operation: $operation" "Duration: ${duration}s"
        
        rm -f "$start_file"
    else
        log_warning "PERFORMANCE" "No start time found for operation: $operation"
    fi
}

# Structured error logging with stack trace
log_error_with_trace() {
    local category="$1"
    local message="$2"
    local context="${3:-}"
    
    # Get call stack
    local stack_trace=""
    local frame=1
    
    while caller $frame >/dev/null 2>&1; do
        local line_info=$(caller $frame)
        stack_trace+="  Frame $frame: $line_info\n"
        ((frame++))
    done
    
    # Log error with stack trace
    enhanced_log_message "ERROR" "$category" "$message" "$context"
    
    if [ -n "$stack_trace" ]; then
        enhanced_log_message "DEBUG" "$category" "Stack trace:" "$stack_trace"
    fi
}

# Log system metrics
log_system_metrics() {
    local category="${1:-METRICS}"
    
    # Memory usage
    local memory_info=""
    if command -v free >/dev/null 2>&1; then
        memory_info=$(free -h | grep "Mem:" | awk '{print "Used: " $3 "/" $2 " (" $3/$2*100 "%)"}')
    elif command -v vm_stat >/dev/null 2>&1; then
        memory_info="macOS memory stats available via vm_stat"
    fi
    
    # Disk usage
    local disk_info=$(df -h . | tail -1 | awk '{print "Used: " $3 "/" $2 " (" $5 ")"}')
    
    # Load average
    local load_info=""
    if [ -f /proc/loadavg ]; then
        load_info=$(cat /proc/loadavg | awk '{print "Load: " $1 " " $2 " " $3}')
    elif command -v uptime >/dev/null 2>&1; then
        load_info=$(uptime | sed 's/.*load average: /Load: /')
    fi
    
    log_info "$category" "System metrics" "Memory: $memory_info | Disk: $disk_info | $load_info"
}

# Create logging configuration file
create_logging_config() {
    local config_file="$1"
    
    cat > "$config_file" << 'EOF'
# AnarQ&Q Installer Logging Configuration
# Modify these values to customize logging behavior

# Log level: DEBUG, INFO, WARN, ERROR
LOG_LEVEL="INFO"

# Log format: STANDARD, JSON, STRUCTURED
LOG_FORMAT="STANDARD"

# Log output: FILE, CONSOLE, BOTH
LOG_OUTPUT="BOTH"

# Enable log rotation
LOG_ROTATION_ENABLED=true

# Maximum log file size before rotation
LOG_MAX_SIZE="10M"

# Maximum number of rotated log files to keep
LOG_MAX_FILES=5

# Enable colored output (auto-disabled for non-terminals)
LOG_COLORS_ENABLED=true
EOF
    
    log_info "LOGGING" "Created logging configuration file: $config_file"
}

# Validate logging configuration
validate_logging_config() {
    log_info "LOGGING" "Validating logging configuration"
    
    # Test all log levels
    log_debug "TEST" "Debug level test message"
    log_info "TEST" "Info level test message"
    log_warning "TEST" "Warning level test message"
    log_error "TEST" "Error level test message"
    
    # Test performance logging
    log_performance_start "test_operation"
    sleep 0.1
    log_performance_end "test_operation"
    
    # Test system metrics
    log_system_metrics "TEST"
    
    log_info "LOGGING" "Logging configuration validation completed"
}

# Export functions for use in other scripts
export -f configure_logging
export -f enhanced_log_message
export -f log_performance_start
export -f log_performance_end
export -f log_error_with_trace
export -f log_system_metrics
export -f create_logging_config
export -f validate_logging_config
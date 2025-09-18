#!/bin/bash

# AnarQ&Q Ecosystem Installer - Verbose Mode and Debugging Support
# Version: 1.0.0
# Author: AnarQorp
# License: MIT

# Debug and verbose mode variables
declare -g DEBUG_ENABLED=false
declare -g VERBOSE_ENABLED=false
declare -g TRACE_ENABLED=false
declare -g DEBUG_LOG_FILE=""
declare -g DEBUG_BREAKPOINTS=()
declare -g DEBUG_WATCH_VARS=()
declare -g DEBUG_STEP_COUNTER=0

# Initialize debugging system
initialize_debug_system() {
    local debug_level="${1:-info}"  # debug, info, warn, error
    
    DEBUG_LOG_FILE="/tmp/anarqq-debug-$(date +%Y%m%d-%H%M%S).log"
    
    # Create debug log file
    cat > "$DEBUG_LOG_FILE" << EOF
# AnarQ&Q Installer Debug Log
# Started: $(date '+%Y-%m-%d %H:%M:%S')
# Debug Level: $debug_level
# Process ID: $$
# ========================================

EOF
    
    log_debug "DEBUG_SYSTEM" "Debug system initialized with level: $debug_level"
    log_debug "DEBUG_SYSTEM" "Debug log file: $DEBUG_LOG_FILE"
}

# Enable verbose mode
enable_verbose_mode() {
    VERBOSE_ENABLED=true
    INSTALLER_VERBOSE_MODE=true  # Set global variable
    
    log_info "VERBOSE" "Verbose mode enabled"
    print_info "🔍 Verbose mode enabled - detailed output will be shown"
}

# Enable debug mode
enable_debug_mode() {
    DEBUG_ENABLED=true
    VERBOSE_ENABLED=true
    INSTALLER_VERBOSE_MODE=true
    INSTALLER_DEBUG_MODE=true
    
    # Initialize debug system if not already done
    if [ -z "$DEBUG_LOG_FILE" ]; then
        initialize_debug_system "debug"
    fi
    
    log_info "DEBUG" "Debug mode enabled"
    print_info "🐛 Debug mode enabled - extensive debugging information will be shown"
}

# Enable trace mode (bash -x equivalent)
enable_trace_mode() {
    TRACE_ENABLED=true
    DEBUG_ENABLED=true
    VERBOSE_ENABLED=true
    
    set -x  # Enable bash tracing
    
    log_info "TRACE" "Trace mode enabled"
    print_info "📍 Trace mode enabled - all commands will be traced"
}

# Debug logging function
debug_log() {
    local level="$1"
    local category="$2"
    local message="$3"
    local context="${4:-}"
    
    if [ "$DEBUG_ENABLED" = false ] && [ "$level" != "ERROR" ]; then
        return 0
    fi
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S.%3N')
    local debug_entry="[$timestamp] [DEBUG] [$level] [$category]: $message"
    
    if [ -n "$context" ]; then
        debug_entry="$debug_entry | Context: $context"
    fi
    
    # Add function call stack
    local stack_info=$(get_call_stack 2)
    if [ -n "$stack_info" ]; then
        debug_entry="$debug_entry | Stack: $stack_info"
    fi
    
    # Write to debug log
    echo "$debug_entry" >> "$DEBUG_LOG_FILE"
    
    # Display based on level and mode
    case "$level" in
        "ERROR")
            print_error "[DEBUG] $message"
            ;;
        "WARN")
            if [ "$DEBUG_ENABLED" = true ]; then
                print_warning "[DEBUG] $message"
            fi
            ;;
        "INFO")
            if [ "$VERBOSE_ENABLED" = true ]; then
                print_info "[DEBUG] $message"
            fi
            ;;
        "TRACE")
            if [ "$TRACE_ENABLED" = true ]; then
                print_substep "[TRACE] $message"
            fi
            ;;
    esac
}

# Get function call stack
get_call_stack() {
    local skip_frames="${1:-1}"
    local stack=""
    local frame=$((skip_frames + 1))
    
    while caller $frame >/dev/null 2>&1; do
        local line_info=$(caller $frame)
        local line_num=$(echo "$line_info" | awk '{print $1}')
        local func_name=$(echo "$line_info" | awk '{print $2}')
        local file_name=$(echo "$line_info" | awk '{print $3}')
        
        if [ -n "$stack" ]; then
            stack="$stack -> "
        fi
        stack="${stack}${func_name}():${line_num}"
        
        ((frame++))
        
        # Limit stack depth
        if [ $frame -gt 10 ]; then
            stack="$stack -> ..."
            break
        fi
    done
    
    echo "$stack"
}

# Verbose step execution
verbose_step() {
    local step_name="$1"
    local step_description="$2"
    shift 2
    local command="$@"
    
    ((DEBUG_STEP_COUNTER++))
    
    if [ "$VERBOSE_ENABLED" = true ]; then
        echo ""
        print_step "[$DEBUG_STEP_COUNTER] $step_name"
        if [ -n "$step_description" ]; then
            print_substep "$step_description"
        fi
    fi
    
    debug_log "INFO" "STEP" "Starting step: $step_name" "Command: $command"
    
    local start_time=$(date +%s.%N)
    
    # Execute command with error handling
    local exit_code=0
    if [ -n "$command" ]; then
        if [ "$DEBUG_ENABLED" = true ]; then
            debug_log "TRACE" "STEP" "Executing: $command"
        fi
        
        eval "$command" || exit_code=$?
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    if [ $exit_code -eq 0 ]; then
        debug_log "INFO" "STEP" "Completed step: $step_name" "Duration: ${duration}s"
        if [ "$VERBOSE_ENABLED" = true ]; then
            print_success "Step completed in ${duration}s"
        fi
    else
        debug_log "ERROR" "STEP" "Failed step: $step_name" "Exit code: $exit_code, Duration: ${duration}s"
        if [ "$VERBOSE_ENABLED" = true ]; then
            print_error "Step failed with exit code $exit_code after ${duration}s"
        fi
    fi
    
    return $exit_code
}

# Debug variable watching
watch_variable() {
    local var_name="$1"
    local description="${2:-Variable: $var_name}"
    
    DEBUG_WATCH_VARS+=("$var_name:$description")
    debug_log "INFO" "WATCH" "Added variable to watch list: $var_name" "$description"
}

# Show watched variables
show_watched_variables() {
    if [ ${#DEBUG_WATCH_VARS[@]} -eq 0 ]; then
        return 0
    fi
    
    debug_log "INFO" "WATCH" "Showing watched variables"
    
    if [ "$DEBUG_ENABLED" = true ]; then
        echo ""
        print_info "🔍 Watched Variables:"
    fi
    
    for watch_entry in "${DEBUG_WATCH_VARS[@]}"; do
        local var_name="${watch_entry%%:*}"
        local description="${watch_entry#*:}"
        local var_value="${!var_name:-<unset>}"
        
        debug_log "INFO" "WATCH" "$description = $var_value"
        
        if [ "$DEBUG_ENABLED" = true ]; then
            echo "  • $description = $var_value"
        fi
    done
}

# Debug breakpoint system
set_breakpoint() {
    local breakpoint_name="$1"
    local condition="${2:-true}"
    
    DEBUG_BREAKPOINTS+=("$breakpoint_name:$condition")
    debug_log "INFO" "BREAKPOINT" "Set breakpoint: $breakpoint_name" "Condition: $condition"
}

# Check breakpoints
check_breakpoints() {
    local current_location="$1"
    
    for breakpoint_entry in "${DEBUG_BREAKPOINTS[@]}"; do
        local bp_name="${breakpoint_entry%%:*}"
        local bp_condition="${breakpoint_entry#*:}"
        
        if [ "$bp_name" = "$current_location" ]; then
            debug_log "INFO" "BREAKPOINT" "Checking breakpoint: $bp_name" "Condition: $bp_condition"
            
            if eval "$bp_condition"; then
                debug_log "INFO" "BREAKPOINT" "Breakpoint triggered: $bp_name"
                trigger_breakpoint "$bp_name"
            fi
        fi
    done
}

# Trigger breakpoint (interactive debug session)
trigger_breakpoint() {
    local breakpoint_name="$1"
    
    if [ "$DEBUG_ENABLED" = false ]; then
        return 0
    fi
    
    echo ""
    print_warning "🛑 Breakpoint triggered: $breakpoint_name"
    print_info "Debug session started. Available commands:"
    echo "  • 'c' or 'continue' - Continue execution"
    echo "  • 'v' or 'vars' - Show watched variables"
    echo "  • 's' or 'stack' - Show call stack"
    echo "  • 'e <command>' - Execute command"
    echo "  • 'q' or 'quit' - Quit installer"
    echo ""
    
    while true; do
        read -p "debug> " debug_command
        
        case "$debug_command" in
            "c"|"continue")
                debug_log "INFO" "BREAKPOINT" "Continuing from breakpoint: $breakpoint_name"
                break
                ;;
            "v"|"vars")
                show_watched_variables
                ;;
            "s"|"stack")
                local stack=$(get_call_stack 1)
                print_info "Call stack: $stack"
                ;;
            "e "*)
                local cmd="${debug_command#e }"
                debug_log "INFO" "BREAKPOINT" "Executing debug command: $cmd"
                eval "$cmd" || print_error "Command failed"
                ;;
            "q"|"quit")
                debug_log "INFO" "BREAKPOINT" "Quitting from breakpoint: $breakpoint_name"
                exit 1
                ;;
            "")
                continue
                ;;
            *)
                print_info "Unknown command: $debug_command"
                ;;
        esac
    done
}

# Performance profiling
start_profiling() {
    local profile_name="$1"
    local profile_file="/tmp/anarqq-profile-${profile_name}-$(date +%Y%m%d-%H%M%S).log"
    
    debug_log "INFO" "PROFILE" "Starting profiling: $profile_name" "File: $profile_file"
    
    # Store profile info
    echo "$profile_file" > "/tmp/profile_${profile_name}_$$"
    echo "$(date +%s.%N)" >> "/tmp/profile_${profile_name}_$$"
    
    # Start system monitoring
    if command_exists top; then
        top -b -n 1 -p $$ > "$profile_file" 2>/dev/null &
    fi
}

stop_profiling() {
    local profile_name="$1"
    local profile_info_file="/tmp/profile_${profile_name}_$$"
    
    if [ ! -f "$profile_info_file" ]; then
        debug_log "WARN" "PROFILE" "No profiling session found: $profile_name"
        return 1
    fi
    
    local profile_file=$(head -1 "$profile_info_file")
    local start_time=$(tail -1 "$profile_info_file")
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    debug_log "INFO" "PROFILE" "Stopped profiling: $profile_name" "Duration: ${duration}s, File: $profile_file"
    
    # Add duration to profile file
    echo "Profile Duration: ${duration}s" >> "$profile_file"
    
    # Cleanup
    rm -f "$profile_info_file"
    
    if [ "$DEBUG_ENABLED" = true ]; then
        print_info "Profile completed: $profile_name (${duration}s) -> $profile_file"
    fi
}

# Memory usage monitoring
monitor_memory_usage() {
    local operation_name="$1"
    
    if [ "$DEBUG_ENABLED" = false ]; then
        return 0
    fi
    
    local memory_info=""
    
    if command_exists free; then
        memory_info=$(free -h | grep "Mem:" | awk '{print "Used: " $3 "/" $2}')
    elif command_exists vm_stat; then
        # macOS memory stats
        local pages_free=$(vm_stat | grep "Pages free:" | awk '{print $3}' | sed 's/\.//')
        local pages_active=$(vm_stat | grep "Pages active:" | awk '{print $3}' | sed 's/\.//')
        local page_size=4096
        local free_mb=$(( (pages_free * page_size) / 1024 / 1024 ))
        local active_mb=$(( (pages_active * page_size) / 1024 / 1024 ))
        memory_info="Free: ${free_mb}MB, Active: ${active_mb}MB"
    fi
    
    debug_log "INFO" "MEMORY" "Memory usage during: $operation_name" "$memory_info"
}

# System resource monitoring
monitor_system_resources() {
    local operation_name="$1"
    
    if [ "$DEBUG_ENABLED" = false ]; then
        return 0
    fi
    
    # CPU usage
    local cpu_info=""
    if command_exists top; then
        cpu_info=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    elif [ -f /proc/loadavg ]; then
        cpu_info="Load: $(cat /proc/loadavg | awk '{print $1 " " $2 " " $3}')"
    fi
    
    # Disk usage
    local disk_info=$(df -h . | tail -1 | awk '{print "Used: " $3 "/" $2 " (" $5 ")"}')
    
    # Process info
    local process_info="PID: $$, PPID: $PPID"
    
    debug_log "INFO" "RESOURCES" "System resources during: $operation_name" "CPU: $cpu_info | Disk: $disk_info | Process: $process_info"
    
    # Memory monitoring
    monitor_memory_usage "$operation_name"
}

# Command execution with debugging
debug_execute() {
    local command="$1"
    local description="${2:-Executing command}"
    
    debug_log "TRACE" "EXECUTE" "$description" "Command: $command"
    
    if [ "$TRACE_ENABLED" = true ]; then
        print_substep "[TRACE] $description: $command"
    fi
    
    # Monitor resources before execution
    monitor_system_resources "before_$description"
    
    local start_time=$(date +%s.%N)
    local exit_code=0
    
    # Execute command
    eval "$command" || exit_code=$?
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    # Monitor resources after execution
    monitor_system_resources "after_$description"
    
    debug_log "INFO" "EXECUTE" "Command completed: $description" "Exit code: $exit_code, Duration: ${duration}s"
    
    if [ $exit_code -ne 0 ]; then
        debug_log "ERROR" "EXECUTE" "Command failed: $description" "Exit code: $exit_code, Command: $command"
    fi
    
    return $exit_code
}

# Generate debug report
generate_debug_report() {
    local report_file="/tmp/anarqq-debug-report-$(date +%Y%m%d-%H%M%S).txt"
    
    debug_log "INFO" "REPORT" "Generating debug report: $report_file"
    
    cat > "$report_file" << EOF
AnarQ&Q Installer Debug Report
==============================
Generated: $(date '+%Y-%m-%d %H:%M:%S')
Process ID: $$
User: $(whoami)
Working Directory: $(pwd)
Shell: $SHELL

Debug Configuration:
- Debug Enabled: $DEBUG_ENABLED
- Verbose Enabled: $VERBOSE_ENABLED
- Trace Enabled: $TRACE_ENABLED
- Debug Log File: $DEBUG_LOG_FILE
- Step Counter: $DEBUG_STEP_COUNTER

System Information:
$(uname -a)

Environment Variables:
$(env | grep -E "(NODE|NPM|PATH|HOME|DEBUG|VERBOSE)" | sort)

Watched Variables:
EOF
    
    # Add watched variables to report
    for watch_entry in "${DEBUG_WATCH_VARS[@]}"; do
        local var_name="${watch_entry%%:*}"
        local description="${watch_entry#*:}"
        local var_value="${!var_name:-<unset>}"
        echo "$description = $var_value" >> "$report_file"
    done
    
    # Add breakpoints to report
    echo "" >> "$report_file"
    echo "Breakpoints:" >> "$report_file"
    for bp_entry in "${DEBUG_BREAKPOINTS[@]}"; do
        echo "$bp_entry" >> "$report_file"
    done
    
    # Add recent debug log entries
    echo "" >> "$report_file"
    echo "Recent Debug Log Entries:" >> "$report_file"
    if [ -f "$DEBUG_LOG_FILE" ]; then
        tail -50 "$DEBUG_LOG_FILE" >> "$report_file"
    fi
    
    print_success "Debug report generated: $report_file"
    debug_log "INFO" "REPORT" "Debug report completed: $report_file"
    
    echo "$report_file"
}

# Cleanup debug resources
cleanup_debug_resources() {
    debug_log "INFO" "CLEANUP" "Cleaning up debug resources"
    
    # Remove temporary profile files
    rm -f /tmp/profile_*_$$ 2>/dev/null || true
    
    # Disable tracing if enabled
    if [ "$TRACE_ENABLED" = true ]; then
        set +x
    fi
    
    debug_log "INFO" "CLEANUP" "Debug cleanup completed"
}

# Export functions for use in other scripts
export -f initialize_debug_system
export -f enable_verbose_mode
export -f enable_debug_mode
export -f enable_trace_mode
export -f debug_log
export -f verbose_step
export -f watch_variable
export -f show_watched_variables
export -f set_breakpoint
export -f check_breakpoints
export -f start_profiling
export -f stop_profiling
export -f monitor_memory_usage
export -f monitor_system_resources
export -f debug_execute
export -f generate_debug_report
export -f cleanup_debug_resources
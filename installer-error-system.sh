#!/bin/bash

# AnarQ&Q Ecosystem Installer - Integrated Error Handling System
# Version: 1.0.0
# Author: AnarQorp
# License: MIT

# Source all error handling modules
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source error handling modules
source "$SCRIPT_DIR/installer-error-handler.sh" 2>/dev/null || {
    echo "Error: Could not load installer-error-handler.sh"
    exit 1
}

source "$SCRIPT_DIR/installer-logging-config.sh" 2>/dev/null || {
    echo "Error: Could not load installer-logging-config.sh"
    exit 1
}

source "$SCRIPT_DIR/installer-error-recovery.sh" 2>/dev/null || {
    echo "Error: Could not load installer-error-recovery.sh"
    exit 1
}

source "$SCRIPT_DIR/installer-verbose-debug.sh" 2>/dev/null || {
    echo "Error: Could not load installer-verbose-debug.sh"
    exit 1
}

# Global error handling configuration
declare -g ERROR_SYSTEM_INITIALIZED=false
declare -g ERROR_RECOVERY_ENABLED=true
declare -g AUTO_CLEANUP_ENABLED=true
declare -g SUPPORT_BUNDLE_ON_ERROR=false

# Initialize the complete error handling system
initialize_error_system() {
    local config_options="$1"  # Format: "verbose,debug,recovery,cleanup"
    
    if [ "$ERROR_SYSTEM_INITIALIZED" = true ]; then
        return 0
    fi
    
    # Parse configuration options
    if [[ "$config_options" =~ verbose ]]; then
        enable_verbose_mode
    fi
    
    if [[ "$config_options" =~ debug ]]; then
        enable_debug_mode
        initialize_debug_system
    fi
    
    if [[ "$config_options" =~ trace ]]; then
        enable_trace_mode
    fi
    
    if [[ "$config_options" =~ no-recovery ]]; then
        ERROR_RECOVERY_ENABLED=false
    fi
    
    if [[ "$config_options" =~ no-cleanup ]]; then
        AUTO_CLEANUP_ENABLED=false
    fi
    
    if [[ "$config_options" =~ support-bundle ]]; then
        SUPPORT_BUNDLE_ON_ERROR=true
    fi
    
    # Initialize core error handling
    initialize_error_handler "installer"
    
    # Configure logging
    configure_logging
    
    # Set up watched variables for debugging
    if [ "$DEBUG_ENABLED" = true ]; then
        watch_variable "INSTALL_DIR" "Installation Directory"
        watch_variable "DEMO_DIR" "Demo Directory"
        watch_variable "CORE_DIR" "Core Directory"
        watch_variable "ERROR_RECOVERY_ENABLED" "Error Recovery Status"
        watch_variable "AUTO_CLEANUP_ENABLED" "Auto Cleanup Status"
    fi
    
    ERROR_SYSTEM_INITIALIZED=true
    
    log_info "ERROR_SYSTEM" "Comprehensive error handling system initialized"
    log_info "ERROR_SYSTEM" "Configuration: $config_options"
    
    return 0
}

# Enhanced error handler with recovery attempts
enhanced_error_handler() {
    local exit_code=$1
    local line_number=$2
    local command="$3"
    
    # Disable error trapping temporarily
    set +eE
    
    log_error "ENHANCED_HANDLER" "Enhanced error handler triggered" "Exit code: $exit_code, Line: $line_number, Command: $command"
    
    # Show watched variables if debugging
    if [ "$DEBUG_ENABLED" = true ]; then
        show_watched_variables
    fi
    
    # Attempt automatic recovery if enabled
    if [ "$ERROR_RECOVERY_ENABLED" = true ]; then
        log_info "ENHANCED_HANDLER" "Attempting automatic error recovery"
        
        if attempt_error_recovery "$command" "Line: $line_number" 3; then
            log_info "ENHANCED_HANDLER" "Error recovery successful, continuing installation"
            
            # Re-enable error trapping
            set -eE
            return 0
        else
            log_warning "ENHANCED_HANDLER" "Error recovery failed"
        fi
    fi
    
    # Generate support bundle if requested
    if [ "$SUPPORT_BUNDLE_ON_ERROR" = true ]; then
        log_info "ENHANCED_HANDLER" "Generating support bundle"
        generate_support_bundle
    fi
    
    # Generate debug report if debugging
    if [ "$DEBUG_ENABLED" = true ]; then
        generate_debug_report
    fi
    
    # Show comprehensive error report
    show_error_report "$exit_code" "$line_number" "$command"
    
    # Perform cleanup if enabled
    if [ "$AUTO_CLEANUP_ENABLED" = true ]; then
        cleanup_on_error
    fi
    
    # Cleanup debug resources
    if [ "$DEBUG_ENABLED" = true ]; then
        cleanup_debug_resources
    fi
    
    exit $exit_code
}

# Enhanced step execution with error handling
execute_step() {
    local step_name="$1"
    local step_description="$2"
    shift 2
    local command="$@"
    
    # Set current step for error context
    set_current_step "$step_name" "$step_description"
    
    # Check breakpoints if debugging
    if [ "$DEBUG_ENABLED" = true ]; then
        check_breakpoints "$step_name"
    fi
    
    # Execute step with verbose/debug support
    if [ "$VERBOSE_ENABLED" = true ] || [ "$DEBUG_ENABLED" = true ]; then
        verbose_step "$step_name" "$step_description" "$command"
    else
        # Silent execution
        log_info "STEP" "Executing step: $step_name"
        eval "$command"
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_info "STEP" "Step completed successfully: $step_name"
    else
        log_error "STEP" "Step failed: $step_name" "Exit code: $exit_code"
    fi
    
    return $exit_code
}

# Safe command execution with error handling
safe_execute() {
    local command="$1"
    local description="${2:-Executing command}"
    local retry_count="${3:-1}"
    local recovery_enabled="${4:-$ERROR_RECOVERY_ENABLED}"
    
    log_debug "SAFE_EXECUTE" "Starting safe execution: $description" "Command: $command"
    
    local attempt=1
    while [ $attempt -le $retry_count ]; do
        log_debug "SAFE_EXECUTE" "Attempt $attempt/$retry_count: $description"
        
        # Execute with debugging support if enabled
        if [ "$DEBUG_ENABLED" = true ]; then
            debug_execute "$command" "$description"
        else
            eval "$command"
        fi
        
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            log_info "SAFE_EXECUTE" "Command successful: $description"
            return 0
        fi
        
        log_warning "SAFE_EXECUTE" "Command failed (attempt $attempt/$retry_count): $description" "Exit code: $exit_code"
        
        # Attempt recovery if enabled and not the last attempt
        if [ "$recovery_enabled" = true ] && [ $attempt -lt $retry_count ]; then
            log_info "SAFE_EXECUTE" "Attempting recovery before retry"
            
            if attempt_error_recovery "$command" "$description"; then
                log_info "SAFE_EXECUTE" "Recovery successful, retrying command"
            else
                log_warning "SAFE_EXECUTE" "Recovery failed"
            fi
        fi
        
        ((attempt++))
    done
    
    log_error "SAFE_EXECUTE" "Command failed after $retry_count attempts: $description" "Final exit code: $exit_code"
    return $exit_code
}

# Network operation with comprehensive error handling
safe_network_operation() {
    local operation_type="$1"  # download, clone, fetch
    local url="$2"
    local target="$3"
    local description="${4:-Network operation}"
    
    log_info "NETWORK" "Starting network operation: $operation_type" "URL: $url, Target: $target"
    
    # Test network connectivity first
    if ! test_network_connectivity; then
        log_error "NETWORK" "Network connectivity test failed"
        show_network_troubleshooting
        return 1
    fi
    
    # Perform operation based on type
    case "$operation_type" in
        "download")
            safe_execute "curl -L -f -o '$target' '$url'" "$description" 3 true
            ;;
        "clone")
            safe_execute "git clone '$url' '$target'" "$description" 3 true
            ;;
        "fetch")
            safe_execute "curl -L -f '$url'" "$description" 3 true
            ;;
        *)
            log_error "NETWORK" "Unknown network operation type: $operation_type"
            return 1
            ;;
    esac
}

# File operation with error handling
safe_file_operation() {
    local operation_type="$1"  # create, copy, move, delete, extract
    local source="$2"
    local target="${3:-}"
    local description="${4:-File operation}"
    
    log_info "FILE" "Starting file operation: $operation_type" "Source: $source, Target: $target"
    
    # Register files/directories for cleanup if needed
    case "$operation_type" in
        "create")
            register_temp_file "$source"
            safe_execute "mkdir -p '$source'" "$description"
            ;;
        "copy")
            safe_execute "cp -r '$source' '$target'" "$description"
            ;;
        "move")
            safe_execute "mv '$source' '$target'" "$description"
            ;;
        "delete")
            safe_execute "rm -rf '$source'" "$description"
            ;;
        "extract")
            safe_execute "unzip -q '$source' -d '$target'" "$description" 1 true
            ;;
        *)
            log_error "FILE" "Unknown file operation type: $operation_type"
            return 1
            ;;
    esac
}

# Dependency installation with error handling
safe_dependency_install() {
    local dependency="$1"
    local description="${2:-Installing dependency: $dependency}"
    local package_manager="${3:-auto}"
    
    log_info "DEPENDENCY" "Installing dependency: $dependency" "Package manager: $package_manager"
    
    # Auto-detect package manager if not specified
    if [ "$package_manager" = "auto" ]; then
        package_manager=$(detect_package_manager)
    fi
    
    case "$package_manager" in
        "apt")
            safe_execute "sudo apt-get update && sudo apt-get install -y '$dependency'" "$description" 2 true
            ;;
        "yum")
            safe_execute "sudo yum install -y '$dependency'" "$description" 2 true
            ;;
        "dnf")
            safe_execute "sudo dnf install -y '$dependency'" "$description" 2 true
            ;;
        "brew")
            safe_execute "brew install '$dependency'" "$description" 2 true
            ;;
        "pacman")
            safe_execute "sudo pacman -S --noconfirm '$dependency'" "$description" 2 true
            ;;
        *)
            log_error "DEPENDENCY" "Unsupported package manager: $package_manager"
            show_dependency_troubleshooting
            return 1
            ;;
    esac
}

# Node.js/npm operation with error handling
safe_npm_operation() {
    local operation="$1"  # install, build, start, test
    local directory="${2:-.}"
    local description="${3:-NPM operation: $operation}"
    
    log_info "NPM" "Starting npm operation: $operation" "Directory: $directory"
    
    # Change to target directory
    local original_dir=$(pwd)
    cd "$directory" || {
        log_error "NPM" "Could not change to directory: $directory"
        return 1
    }
    
    # Ensure package.json exists
    if [ ! -f "package.json" ]; then
        log_error "NPM" "No package.json found in directory: $directory"
        cd "$original_dir"
        return 1
    fi
    
    # Perform npm operation
    case "$operation" in
        "install")
            safe_execute "npm install" "$description" 2 true
            ;;
        "build")
            safe_execute "npm run build" "$description" 1 true
            ;;
        "start")
            safe_execute "npm start" "$description" 1 false
            ;;
        "test")
            safe_execute "npm test" "$description" 1 true
            ;;
        *)
            log_error "NPM" "Unknown npm operation: $operation"
            cd "$original_dir"
            return 1
            ;;
    esac
    
    local exit_code=$?
    cd "$original_dir"
    return $exit_code
}

# Validation with error handling
safe_validation() {
    local validation_type="$1"  # file, directory, command, network, service
    local target="$2"
    local description="${3:-Validating: $target}"
    
    log_info "VALIDATION" "Starting validation: $validation_type" "Target: $target"
    
    case "$validation_type" in
        "file")
            if [ -f "$target" ]; then
                log_info "VALIDATION" "File validation passed: $target"
                return 0
            else
                log_error "VALIDATION" "File validation failed: $target"
                return 1
            fi
            ;;
        "directory")
            if [ -d "$target" ]; then
                log_info "VALIDATION" "Directory validation passed: $target"
                return 0
            else
                log_error "VALIDATION" "Directory validation failed: $target"
                return 1
            fi
            ;;
        "command")
            if command_exists "$target"; then
                log_info "VALIDATION" "Command validation passed: $target"
                return 0
            else
                log_error "VALIDATION" "Command validation failed: $target"
                return 1
            fi
            ;;
        "network")
            if test_network_connectivity; then
                log_info "VALIDATION" "Network validation passed"
                return 0
            else
                log_error "VALIDATION" "Network validation failed"
                return 1
            fi
            ;;
        *)
            log_error "VALIDATION" "Unknown validation type: $validation_type"
            return 1
            ;;
    esac
}

# Show comprehensive system status
show_system_status() {
    echo ""
    print_info "🔍 System Status Report"
    echo "================================"
    
    # Error handling status
    echo "Error Handling:"
    echo "  • System Initialized: $ERROR_SYSTEM_INITIALIZED"
    echo "  • Recovery Enabled: $ERROR_RECOVERY_ENABLED"
    echo "  • Auto Cleanup: $AUTO_CLEANUP_ENABLED"
    echo "  • Verbose Mode: $VERBOSE_ENABLED"
    echo "  • Debug Mode: $DEBUG_ENABLED"
    echo "  • Trace Mode: $TRACE_ENABLED"
    echo ""
    
    # Log files
    echo "Log Files:"
    echo "  • Main Log: ${INSTALLER_LOG_FILE:-Not set}"
    echo "  • Debug Log: ${DEBUG_LOG_FILE:-Not set}"
    echo ""
    
    # System health
    echo "System Health:"
    test_basic_system_health
    echo ""
    
    # Watched variables
    if [ "$DEBUG_ENABLED" = true ] && [ ${#DEBUG_WATCH_VARS[@]} -gt 0 ]; then
        show_watched_variables
        echo ""
    fi
    
    # Error statistics
    echo "Error Statistics:"
    echo "  • Error Count: $INSTALLER_ERROR_COUNT"
    echo "  • Warning Count: $INSTALLER_WARNING_COUNT"
    echo "  • Step Counter: ${DEBUG_STEP_COUNTER:-0}"
    echo ""
}

# Parse command line arguments for error system
parse_error_system_args() {
    local args="$@"
    local config_options=""
    
    for arg in $args; do
        case "$arg" in
            "--verbose"|"-v")
                config_options="$config_options,verbose"
                ;;
            "--debug"|"-d")
                config_options="$config_options,debug"
                ;;
            "--trace"|"-t")
                config_options="$config_options,trace"
                ;;
            "--no-recovery")
                config_options="$config_options,no-recovery"
                ;;
            "--no-cleanup")
                config_options="$config_options,no-cleanup"
                ;;
            "--support-bundle")
                config_options="$config_options,support-bundle"
                ;;
        esac
    done
    
    # Remove leading comma
    config_options="${config_options#,}"
    
    echo "$config_options"
}

# Main error system setup function
setup_error_system() {
    local args="$@"
    
    # Parse arguments
    local config_options=$(parse_error_system_args "$args")
    
    # Initialize error system
    initialize_error_system "$config_options"
    
    # Override default error handler
    trap 'enhanced_error_handler $? $LINENO $BASH_COMMAND' ERR
    
    log_info "ERROR_SYSTEM" "Error system setup completed" "Options: $config_options"
}

# Export all functions for use in other scripts
export -f initialize_error_system
export -f enhanced_error_handler
export -f execute_step
export -f safe_execute
export -f safe_network_operation
export -f safe_file_operation
export -f safe_dependency_install
export -f safe_npm_operation
export -f safe_validation
export -f show_system_status
export -f parse_error_system_args
export -f setup_error_system
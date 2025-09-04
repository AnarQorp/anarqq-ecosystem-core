#!/bin/bash

# AnarQ&Q Ecosystem Robust Installer
# Production-grade installer with comprehensive error handling and logging
# Version: 2.0.0
# Author: AnarQorp
# License: MIT

# Strict error handling
set -euo pipefail
IFS=$'\n\t'

# Global configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_VERSION="2.0.0"
readonly LOG_DIR="/tmp"
readonly LOG_FILE="${LOG_DIR}/anarqq-installer-$(date +%Y%m%d-%H%M%S).log"

# Installation configuration
declare -A INSTALL_CONFIG=(
    ["mode"]="full"
    ["target_dir"]="$HOME/anarqq-ecosystem"
    ["components"]="demo,core,backend"
    ["skip_validation"]="false"
    ["verbose"]="false"
    ["offline"]="false"
    ["auto_install_deps"]="false"
)

# System capabilities detection
declare -A SYSTEM_CAPS=(
    ["os"]=""
    ["package_manager"]=""
    ["shell"]=""
    ["has_docker"]="false"
    ["has_git"]="false"
    ["has_node"]="false"
    ["node_version"]=""
)

# Error context for troubleshooting
declare -A ERROR_CONTEXT=(
    ["step"]=""
    ["component"]=""
    ["method"]=""
    ["attempt"]="0"
    ["last_error"]=""
)

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_GENERAL_ERROR=1
readonly EXIT_DEPENDENCY_ERROR=2
readonly EXIT_DOWNLOAD_ERROR=3
readonly EXIT_VALIDATION_ERROR=4
readonly EXIT_USER_CANCEL=5

#==============================================================================
# CORE UTILITY FUNCTIONS
#==============================================================================

# Check if a command exists
command_exists() {
    local cmd="$1"
    command -v "$cmd" >/dev/null 2>&1
}

# Validate function exists before calling
function_exists() {
    local func_name="$1"
    declare -f "$func_name" >/dev/null 2>&1
}

# Get current timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Initialize logging system
init_logging() {
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    
    # Create log file with header
    {
        echo "================================================================================"
        echo "AnarQ&Q Ecosystem Installer Log"
        echo "Version: $SCRIPT_VERSION"
        echo "Started: $(get_timestamp)"
        echo "Script: $SCRIPT_NAME"
        echo "User: $(whoami)"
        echo "Working Directory: $(pwd)"
        echo "================================================================================"
        echo ""
    } > "$LOG_FILE"
    
    # Set up log rotation if file gets too large (>10MB)
    if [[ -f "$LOG_FILE" ]] && [[ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        init_logging
    fi
}

#==============================================================================
# LOGGING FUNCTIONS
#==============================================================================

# Log message with level
log_message() {
    local level="$1"
    local message="$2"
    local context="${3:-}"
    local timestamp
    timestamp="$(get_timestamp)"
    
    # Write to log file
    {
        echo "[$timestamp] [$level] $message"
        if [[ -n "$context" ]]; then
            echo "[$timestamp] [CONTEXT] $context"
        fi
    } >> "$LOG_FILE"
    
    # Also output to console if verbose mode
    if [[ "${INSTALL_CONFIG[verbose]}" == "true" ]]; then
        echo "[$timestamp] [$level] $message" >&2
        if [[ -n "$context" ]]; then
            echo "[$timestamp] [CONTEXT] $context" >&2
        fi
    fi
}

# Log error with context
log_error() {
    local error_type="$1"
    local error_message="$2"
    local context="${3:-}"
    
    # Update error context
    ERROR_CONTEXT["last_error"]="$error_message"
    
    # Log the error
    log_message "ERROR" "[$error_type] $error_message" "$context"
    
    # Display error to user
    print_error "$error_message"
    if [[ -n "$context" ]]; then
        print_info "Context: $context"
    fi
    print_info "Detailed log: $LOG_FILE"
}

# Log info message
log_info() {
    log_message "INFO" "$1" "${2:-}"
}

# Log warning message
log_warning() {
    log_message "WARN" "$1" "${2:-}"
}

# Log debug message
log_debug() {
    if [[ "${INSTALL_CONFIG[verbose]}" == "true" ]]; then
        log_message "DEBUG" "$1" "${2:-}"
    fi
}

#==============================================================================
# OUTPUT FUNCTIONS
#==============================================================================

# Print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            AnarQ&Q Ecosystem Robust Installer                 ║"
    echo "║                                                               ║"
    echo "║                    Version $SCRIPT_VERSION                           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
    log_info "STEP: $1"
}

print_substep() {
    echo -e "   ${BLUE}→ $1${NC}"
    log_debug "SUBSTEP: $1"
}

# Show progress with percentage
show_progress() {
    local message="$1"
    local percentage="${2:-0}"
    local bar_length=50
    local filled_length=$((percentage * bar_length / 100))
    
    printf "\r${CYAN}🔄 %s [" "$message"
    printf "%*s" $filled_length | tr ' ' '='
    printf "%*s" $((bar_length - filled_length)) | tr ' ' '-'
    printf "] %d%%${NC}" "$percentage"
    
    if [[ $percentage -eq 100 ]]; then
        echo ""
    fi
}

#==============================================================================
# ERROR HANDLING AND CLEANUP
#==============================================================================

# Cleanup function
cleanup() {
    local exit_code="${1:-$EXIT_GENERAL_ERROR}"
    
    log_info "Starting cleanup process"
    
    # Remove temporary files
    if [[ -n "${TEMP_DIR:-}" ]] && [[ -d "$TEMP_DIR" ]]; then
        log_debug "Removing temporary directory: $TEMP_DIR"
        rm -rf "$TEMP_DIR" || true
    fi
    
    # Kill background processes if any
    if [[ -n "${BACKGROUND_PIDS:-}" ]]; then
        log_debug "Terminating background processes: $BACKGROUND_PIDS"
        # shellcheck disable=SC2086
        kill $BACKGROUND_PIDS 2>/dev/null || true
    fi
    
    # Log cleanup completion
    log_info "Cleanup completed with exit code: $exit_code"
    
    # Final log entry
    {
        echo ""
        echo "================================================================================"
        echo "Installation ended: $(get_timestamp)"
        echo "Exit code: $exit_code"
        echo "================================================================================"
    } >> "$LOG_FILE"
}

# Cleanup and exit function
cleanup_and_exit() {
    local exit_code="${1:-$EXIT_GENERAL_ERROR}"
    local message="${2:-Installation failed}"
    
    print_warning "$message"
    log_error "EXIT" "$message" "Exit code: $exit_code"
    
    cleanup "$exit_code"
    exit "$exit_code"
}

# Error trap handler
error_trap() {
    local exit_code=$?
    local line_number=$1
    local bash_lineno=$2
    local last_command="$3"
    local funcstack=("${FUNCNAME[@]}")
    
    # Build error context
    local error_context="Line: $line_number, Command: $last_command"
    if [[ ${#funcstack[@]} -gt 1 ]]; then
        error_context="$error_context, Function: ${funcstack[1]}"
    fi
    
    log_error "SCRIPT_ERROR" "Unexpected error occurred" "$error_context"
    
    # Show troubleshooting information
    show_troubleshooting_info
    
    cleanup_and_exit "$exit_code" "Installation failed due to unexpected error"
}

# Set up error trapping
setup_error_handling() {
    # Trap errors and cleanup
    trap 'error_trap $LINENO $BASH_LINENO "$BASH_COMMAND"' ERR
    trap 'cleanup_and_exit $EXIT_USER_CANCEL "Installation cancelled by user"' INT TERM
    
    # Ensure cleanup runs on exit
    trap 'cleanup $?' EXIT
}

# Show troubleshooting information
show_troubleshooting_info() {
    echo ""
    print_info "Troubleshooting Information:"
    echo "  • Log file: $LOG_FILE"
    echo "  • Current step: ${ERROR_CONTEXT[step]}"
    echo "  • Component: ${ERROR_CONTEXT[component]}"
    echo "  • Method: ${ERROR_CONTEXT[method]}"
    echo "  • Attempt: ${ERROR_CONTEXT[attempt]}"
    echo "  • Last error: ${ERROR_CONTEXT[last_error]}"
    echo ""
    print_info "For support, please include the log file and this information:"
    echo "  • OS: ${SYSTEM_CAPS[os]}"
    echo "  • Package Manager: ${SYSTEM_CAPS[package_manager]}"
    echo "  • Shell: ${SYSTEM_CAPS[shell]}"
    echo "  • Script Version: $SCRIPT_VERSION"
    echo ""
    print_info "Contact: anarqorp@proton.me"
}

#==============================================================================
# RETRY MECHANISM
#==============================================================================

# Retry function with exponential backoff
retry_with_backoff() {
    local max_attempts="$1"
    local initial_delay="$2"
    local command_to_run="$3"
    local context="${4:-}"
    
    local attempt=1
    local delay="$initial_delay"
    
    while [[ $attempt -le $max_attempts ]]; do
        ERROR_CONTEXT["attempt"]="$attempt"
        
        log_debug "Attempt $attempt/$max_attempts: $command_to_run" "$context"
        
        if eval "$command_to_run"; then
            log_info "Command succeeded on attempt $attempt" "$context"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            print_substep "Attempt $attempt failed, retrying in ${delay}s..."
            log_warning "Attempt $attempt failed, retrying in ${delay}s" "$context"
            sleep "$delay"
            delay=$((delay * 2))  # Exponential backoff
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_error "RETRY_FAILED" "All $max_attempts attempts failed" "$context"
    return 1
}

#==============================================================================
# VALIDATION FUNCTIONS
#==============================================================================

# Validate installation directory
validate_install_directory() {
    local target_dir="$1"
    
    # Check if directory is writable
    if [[ ! -w "$(dirname "$target_dir")" ]]; then
        log_error "PERMISSION" "Cannot write to parent directory: $(dirname "$target_dir")"
        return 1
    fi
    
    # Check available disk space (require at least 1GB)
    local available_space
    available_space=$(df "$(dirname "$target_dir")" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then  # 1GB in KB
        log_error "DISK_SPACE" "Insufficient disk space. Required: 1GB, Available: $((available_space / 1024))MB"
        return 1
    fi
    
    return 0
}

# Validate function definitions
validate_functions() {
    local required_functions=(
        "command_exists"
        "log_error"
        "log_info"
        "cleanup_and_exit"
        "retry_with_backoff"
    )
    
    for func in "${required_functions[@]}"; do
        if ! function_exists "$func"; then
            echo "CRITICAL ERROR: Required function '$func' is not defined" >&2
            exit $EXIT_GENERAL_ERROR
        fi
    done
    
    log_info "All required functions validated successfully"
}

#==============================================================================
# INITIALIZATION
#==============================================================================

# Initialize the installer
init_installer() {
    # Initialize logging first
    init_logging
    
    log_info "Initializing AnarQ&Q Ecosystem Installer v$SCRIPT_VERSION"
    
    # Set up error handling
    setup_error_handling
    
    # Validate function definitions
    validate_functions
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d -t anarqq-installer-XXXXXX)
    log_debug "Created temporary directory: $TEMP_DIR"
    
    # Initialize error context
    ERROR_CONTEXT["step"]="initialization"
    ERROR_CONTEXT["component"]="installer"
    ERROR_CONTEXT["method"]="init"
    
    log_info "Installer initialization completed successfully"
}

#==============================================================================
# MAIN EXECUTION
#==============================================================================

# Main function (placeholder for now)
main() {
    print_header
    
    print_info "AnarQ&Q Ecosystem Robust Installer v$SCRIPT_VERSION"
    print_info "This is the core framework implementation."
    print_info "Additional modules will be implemented in subsequent tasks."
    echo ""
    
    print_info "Framework features implemented:"
    echo "  ✅ Comprehensive error handling and logging"
    echo "  ✅ Utility functions (command_exists, function validation)"
    echo "  ✅ Shell script best practices with error trapping"
    echo "  ✅ Structured logging with timestamps"
    echo "  ✅ Cleanup mechanisms for failed installations"
    echo "  ✅ Retry logic with exponential backoff"
    echo "  ✅ Progress feedback system"
    echo "  ✅ Cross-platform compatibility preparation"
    echo ""
    
    print_success "Core installer framework ready for module implementation"
    print_info "Log file: $LOG_FILE"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    init_installer
    main "$@"
fi
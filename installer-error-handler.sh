#!/bin/bash

# AnarQ&Q Ecosystem Installer - Comprehensive Error Handling and Logging System
# Version: 1.0.0
# Author: AnarQorp
# License: MIT

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Basic print functions (fallback if not defined elsewhere)
if ! command -v print_info >/dev/null 2>&1; then
    print_info() {
        echo -e "${BLUE}ℹ️  $1${NC}"
    }
fi

if ! command -v print_success >/dev/null 2>&1; then
    print_success() {
        echo -e "${GREEN}✅ $1${NC}"
    }
fi

if ! command -v print_warning >/dev/null 2>&1; then
    print_warning() {
        echo -e "${YELLOW}⚠️  $1${NC}"
    }
fi

if ! command -v print_error >/dev/null 2>&1; then
    print_error() {
        echo -e "${RED}❌ $1${NC}"
    }
fi

if ! command -v print_step >/dev/null 2>&1; then
    print_step() {
        echo -e "${CYAN}🔄 $1${NC}"
    }
fi

if ! command -v print_substep >/dev/null 2>&1; then
    print_substep() {
        echo -e "   ${BLUE}→ $1${NC}"
    }
fi

# Global variables for error handling
declare -g INSTALLER_LOG_FILE=""
declare -g INSTALLER_VERBOSE_MODE=false
declare -g INSTALLER_DEBUG_MODE=false
declare -g INSTALLER_TEMP_FILES=()
declare -g INSTALLER_CLEANUP_DIRS=()
declare -g INSTALLER_ERROR_COUNT=0
declare -g INSTALLER_WARNING_COUNT=0
declare -g INSTALLER_START_TIME=""
declare -g INSTALLER_CURRENT_STEP=""
declare -g INSTALLER_CURRENT_COMPONENT=""

# Error categories
declare -A ERROR_CATEGORIES=(
    ["SYSTEM"]="System configuration or dependency error"
    ["NETWORK"]="Network connectivity or download error"
    ["CONFIG"]="Configuration or environment error"
    ["VALIDATION"]="Post-installation validation error"
    ["PERMISSION"]="File or directory permission error"
    ["DEPENDENCY"]="Missing or incompatible dependency"
    ["EXTRACTION"]="Archive extraction or file operation error"
    ["RUNTIME"]="Runtime or execution error"
)

# Initialize error handling system
initialize_error_handler() {
    local log_prefix="${1:-installer}"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    INSTALLER_LOG_FILE="/tmp/anarqq-${log_prefix}-${timestamp}.log"
    INSTALLER_START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create log file with header
    cat > "$INSTALLER_LOG_FILE" << EOF
# AnarQ&Q Ecosystem Installer Log
# Started: $INSTALLER_START_TIME
# Log File: $INSTALLER_LOG_FILE
# Process ID: $$
# User: $(whoami)
# Working Directory: $(pwd)
# System: $(uname -a)
# Shell: $SHELL
# ========================================

EOF
    
    # Set up error trapping
    set -eE  # Exit on error, inherit ERR trap
    trap 'handle_error $? $LINENO $BASH_COMMAND' ERR
    trap 'handle_exit' EXIT
    trap 'handle_interrupt' INT TERM
    
    log_info "ERROR_HANDLER" "Error handling system initialized"
    log_info "ERROR_HANDLER" "Log file: $INSTALLER_LOG_FILE"
}

# Enable verbose mode
enable_verbose_mode() {
    INSTALLER_VERBOSE_MODE=true
    log_info "ERROR_HANDLER" "Verbose mode enabled"
}

# Enable debug mode
enable_debug_mode() {
    INSTALLER_DEBUG_MODE=true
    INSTALLER_VERBOSE_MODE=true
    set -x  # Enable command tracing
    log_info "ERROR_HANDLER" "Debug mode enabled"
}

# Set current installation step
set_current_step() {
    local step="$1"
    local component="${2:-}"
    
    INSTALLER_CURRENT_STEP="$step"
    INSTALLER_CURRENT_COMPONENT="$component"
    
    log_info "STEP" "Starting step: $step" "$component"
    
    if [ "$INSTALLER_VERBOSE_MODE" = true ]; then
        print_step "[$step] $([ -n "$component" ] && echo "($component) ")Starting..."
    fi
}

# Structured logging function
log_message() {
    local level="$1"
    local category="$2"
    local message="$3"
    local context="${4:-}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local pid=$$
    
    # Format log entry
    local log_entry="[$timestamp] [$pid] [$level] [$category]: $message"
    
    if [ -n "$context" ]; then
        log_entry="$log_entry | Context: $context"
    fi
    
    # Add current step and component if available
    if [ -n "$INSTALLER_CURRENT_STEP" ]; then
        log_entry="$log_entry | Step: $INSTALLER_CURRENT_STEP"
    fi
    
    if [ -n "$INSTALLER_CURRENT_COMPONENT" ]; then
        log_entry="$log_entry | Component: $INSTALLER_CURRENT_COMPONENT"
    fi
    
    # Write to log file
    echo "$log_entry" >> "$INSTALLER_LOG_FILE"
    
    # Display based on level and verbose mode
    case "$level" in
        "ERROR")
            ((INSTALLER_ERROR_COUNT++))
            print_error "$message"
            if [ -n "$context" ] && [ "$INSTALLER_VERBOSE_MODE" = true ]; then
                print_info "Context: $context"
            fi
            ;;
        "WARN")
            ((INSTALLER_WARNING_COUNT++))
            print_warning "$message"
            if [ -n "$context" ] && [ "$INSTALLER_VERBOSE_MODE" = true ]; then
                print_info "Context: $context"
            fi
            ;;
        "INFO")
            if [ "$INSTALLER_VERBOSE_MODE" = true ]; then
                print_info "$message"
            fi
            ;;
        "DEBUG")
            if [ "$INSTALLER_DEBUG_MODE" = true ]; then
                print_substep "[DEBUG] $message"
            fi
            ;;
    esac
}

# Convenience logging functions
log_error() {
    log_message "ERROR" "$1" "$2" "$3"
}

log_warning() {
    log_message "WARN" "$1" "$2" "$3"
}

log_info() {
    log_message "INFO" "$1" "$2" "$3"
}

log_debug() {
    log_message "DEBUG" "$1" "$2" "$3"
}

# Enhanced error handler with context
handle_error() {
    local exit_code=$1
    local line_number=$2
    local command="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Disable error trapping temporarily to avoid recursive errors
    set +eE
    
    log_error "RUNTIME" "Command failed with exit code $exit_code" "Line: $line_number, Command: $command"
    
    # Generate error context
    local error_context=""
    error_context+="Exit Code: $exit_code\n"
    error_context+="Line Number: $line_number\n"
    error_context+="Failed Command: $command\n"
    error_context+="Current Step: ${INSTALLER_CURRENT_STEP:-Unknown}\n"
    error_context+="Current Component: ${INSTALLER_CURRENT_COMPONENT:-None}\n"
    error_context+="Working Directory: $(pwd)\n"
    error_context+="Timestamp: $timestamp\n"
    
    # Write detailed error context to log
    echo -e "\n=== ERROR CONTEXT ===" >> "$INSTALLER_LOG_FILE"
    echo -e "$error_context" >> "$INSTALLER_LOG_FILE"
    echo "===================" >> "$INSTALLER_LOG_FILE"
    
    # Show error report
    show_error_report "$exit_code" "$line_number" "$command"
    
    # Perform cleanup
    cleanup_on_error
    
    exit $exit_code
}

# Handle script interruption
handle_interrupt() {
    local signal=$1
    
    log_warning "INTERRUPT" "Installation interrupted by signal: $signal"
    print_warning "Installation interrupted by user"
    
    cleanup_on_error
    exit 130
}

# Handle script exit
handle_exit() {
    local exit_code=$?
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ $exit_code -eq 0 ]; then
        log_info "EXIT" "Installation completed successfully"
        show_success_summary
    else
        log_error "EXIT" "Installation failed with exit code: $exit_code"
    fi
    
    log_info "EXIT" "Installation ended at: $end_time"
    
    # Final cleanup
    cleanup_temp_files
}

# Register temporary file for cleanup
register_temp_file() {
    local file_path="$1"
    INSTALLER_TEMP_FILES+=("$file_path")
    log_debug "CLEANUP" "Registered temp file: $file_path"
}

# Register directory for cleanup
register_cleanup_dir() {
    local dir_path="$1"
    INSTALLER_CLEANUP_DIRS+=("$dir_path")
    log_debug "CLEANUP" "Registered cleanup directory: $dir_path"
}

# Cleanup temporary files
cleanup_temp_files() {
    if [ ${#INSTALLER_TEMP_FILES[@]} -gt 0 ]; then
        log_info "CLEANUP" "Cleaning up ${#INSTALLER_TEMP_FILES[@]} temporary files"
        
        for temp_file in "${INSTALLER_TEMP_FILES[@]}"; do
            if [ -f "$temp_file" ]; then
                rm -f "$temp_file" 2>/dev/null || true
                log_debug "CLEANUP" "Removed temp file: $temp_file"
            fi
        done
        
        INSTALLER_TEMP_FILES=()
    fi
}

# Cleanup on error
cleanup_on_error() {
    log_warning "CLEANUP" "Performing error cleanup"
    
    # Clean up temporary files
    cleanup_temp_files
    
    # Clean up partial installations
    if [ ${#INSTALLER_CLEANUP_DIRS[@]} -gt 0 ]; then
        log_warning "CLEANUP" "Removing ${#INSTALLER_CLEANUP_DIRS[@]} partial installation directories"
        
        for cleanup_dir in "${INSTALLER_CLEANUP_DIRS[@]}"; do
            if [ -d "$cleanup_dir" ]; then
                print_substep "Removing partial installation: $cleanup_dir"
                rm -rf "$cleanup_dir" 2>/dev/null || true
                log_debug "CLEANUP" "Removed directory: $cleanup_dir"
            fi
        done
        
        INSTALLER_CLEANUP_DIRS=()
    fi
    
    # Kill any background processes started by installer
    cleanup_background_processes
    
    log_info "CLEANUP" "Error cleanup completed"
}

# Cleanup background processes
cleanup_background_processes() {
    # Kill any npm processes started by this installer
    local npm_pids=$(pgrep -f "npm.*start\|npm.*dev" 2>/dev/null || true)
    if [ -n "$npm_pids" ]; then
        log_debug "CLEANUP" "Killing npm processes: $npm_pids"
        kill $npm_pids 2>/dev/null || true
    fi
    
    # Kill any node processes started by this installer
    local node_pids=$(pgrep -f "node.*server\|node.*app" 2>/dev/null || true)
    if [ -n "$node_pids" ]; then
        log_debug "CLEANUP" "Killing node processes: $node_pids"
        kill $node_pids 2>/dev/null || true
    fi
}

# Show detailed error report
show_error_report() {
    local exit_code="$1"
    local line_number="$2"
    local command="$3"
    
    echo ""
    print_error "═══════════════════════════════════════════════════════════════"
    print_error "                    INSTALLATION FAILED"
    print_error "═══════════════════════════════════════════════════════════════"
    echo ""
    
    print_info "Error Details:"
    echo "  • Exit Code: $exit_code"
    echo "  • Line Number: $line_number"
    echo "  • Failed Command: $command"
    echo "  • Current Step: ${INSTALLER_CURRENT_STEP:-Unknown}"
    echo "  • Current Component: ${INSTALLER_CURRENT_COMPONENT:-None}"
    echo ""
    
    # Show suggested solutions based on error context
    show_error_solutions "$exit_code" "$command"
    
    print_info "Diagnostic Information:"
    echo "  • Log File: $INSTALLER_LOG_FILE"
    echo "  • Error Count: $INSTALLER_ERROR_COUNT"
    echo "  • Warning Count: $INSTALLER_WARNING_COUNT"
    echo "  • System: $(uname -s) $(uname -r)"
    echo "  • Shell: $SHELL"
    echo ""
    
    print_info "Next Steps:"
    echo "  1. Review the detailed log file: $INSTALLER_LOG_FILE"
    echo "  2. Check the suggested solutions above"
    echo "  3. Fix the identified issues"
    echo "  4. Run the installer again"
    echo "  5. Contact support if the problem persists"
    echo ""
    
    print_info "Support:"
    echo "  • Email: anarqorp@proton.me"
    echo "  • Include the log file when reporting issues"
    echo ""
}

# Show context-specific error solutions
show_error_solutions() {
    local exit_code="$1"
    local command="$2"
    
    print_info "Suggested Solutions:"
    
    # Network-related errors
    if [[ "$command" =~ (curl|wget|git.*clone) ]]; then
        echo "  Network/Download Issues:"
        echo "    • Check internet connectivity: ping google.com"
        echo "    • Verify repository URLs are accessible"
        echo "    • Try using a VPN if behind corporate firewall"
        echo "    • Check if repositories are private and require authentication"
        echo "    • Retry the installation (temporary network issues)"
        echo ""
    fi
    
    # Permission-related errors
    if [[ $exit_code -eq 126 ]] || [[ "$command" =~ (chmod|mkdir|cp|mv) ]]; then
        echo "  Permission Issues:"
        echo "    • Ensure you have write permissions to the installation directory"
        echo "    • Try running with appropriate permissions (avoid sudo unless necessary)"
        echo "    • Check if the target directory is owned by another user"
        echo "    • Verify disk space is available: df -h"
        echo ""
    fi
    
    # Command not found errors
    if [[ $exit_code -eq 127 ]]; then
        echo "  Missing Command Issues:"
        echo "    • Install missing dependencies (git, node, npm, curl, unzip)"
        echo "    • Update your PATH environment variable"
        echo "    • Restart your terminal session"
        echo "    • Use package manager to install missing tools"
        echo ""
    fi
    
    # Node.js/npm related errors
    if [[ "$command" =~ (npm|node) ]]; then
        echo "  Node.js/npm Issues:"
        echo "    • Update Node.js to version 18 or higher"
        echo "    • Clear npm cache: npm cache clean --force"
        echo "    • Delete node_modules and package-lock.json, then retry"
        echo "    • Check for conflicting global packages"
        echo "    • Try using a different Node.js version manager (nvm)"
        echo ""
    fi
    
    # Git-related errors
    if [[ "$command" =~ git ]]; then
        echo "  Git Issues:"
        echo "    • Configure git credentials: git config --global user.name/user.email"
        echo "    • Set up SSH keys for private repositories"
        echo "    • Check repository access permissions"
        echo "    • Try HTTPS instead of SSH URLs"
        echo "    • Verify git is properly installed: git --version"
        echo ""
    fi
    
    # Archive extraction errors
    if [[ "$command" =~ (unzip|tar|extract) ]]; then
        echo "  Archive Extraction Issues:"
        echo "    • Install unzip utility: sudo apt install unzip (Linux) or brew install unzip (macOS)"
        echo "    • Check if the downloaded file is corrupted"
        echo "    • Verify sufficient disk space for extraction"
        echo "    • Try alternative extraction methods (Python, Node.js)"
        echo ""
    fi
    
    # Generic solutions
    echo "  General Troubleshooting:"
    echo "    • Run installer with verbose mode: bash installer.sh --verbose"
    echo "    • Check system requirements and dependencies"
    echo "    • Ensure stable internet connection"
    echo "    • Try installation in a clean environment"
    echo "    • Update your system packages"
    echo ""
}

# Show success summary
show_success_summary() {
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')
    local duration=""
    
    if [ -n "$INSTALLER_START_TIME" ]; then
        local start_epoch=$(date -d "$INSTALLER_START_TIME" +%s 2>/dev/null || echo "0")
        local end_epoch=$(date -d "$end_time" +%s 2>/dev/null || echo "0")
        local diff=$((end_epoch - start_epoch))
        
        if [ $diff -gt 0 ]; then
            local minutes=$((diff / 60))
            local seconds=$((diff % 60))
            duration=" (${minutes}m ${seconds}s)"
        fi
    fi
    
    echo ""
    print_success "═══════════════════════════════════════════════════════════════"
    print_success "                 INSTALLATION COMPLETED"
    print_success "═══════════════════════════════════════════════════════════════"
    echo ""
    
    print_info "Installation Summary:"
    echo "  • Started: $INSTALLER_START_TIME"
    echo "  • Completed: $end_time$duration"
    echo "  • Errors: $INSTALLER_ERROR_COUNT"
    echo "  • Warnings: $INSTALLER_WARNING_COUNT"
    echo "  • Log File: $INSTALLER_LOG_FILE"
    echo ""
    
    if [ $INSTALLER_WARNING_COUNT -gt 0 ]; then
        print_warning "Installation completed with $INSTALLER_WARNING_COUNT warnings"
        print_info "Review the log file for details: $INSTALLER_LOG_FILE"
        echo ""
    fi
}

# Generate support bundle
generate_support_bundle() {
    local bundle_file="/tmp/anarqq-support-bundle-$(date +%Y%m%d-%H%M%S).tar.gz"
    local temp_dir=$(mktemp -d)
    
    log_info "SUPPORT" "Generating support bundle: $bundle_file"
    
    # Copy log file
    cp "$INSTALLER_LOG_FILE" "$temp_dir/installer.log" 2>/dev/null || true
    
    # System information
    cat > "$temp_dir/system-info.txt" << EOF
System Information
==================
Date: $(date)
User: $(whoami)
Working Directory: $(pwd)
System: $(uname -a)
Shell: $SHELL
PATH: $PATH

Disk Space:
$(df -h)

Memory:
$(free -h 2>/dev/null || vm_stat 2>/dev/null || echo "Memory info not available")

Environment Variables:
$(env | grep -E "(NODE|NPM|PATH|HOME)" | sort)

Installed Tools:
Git: $(git --version 2>/dev/null || echo "Not installed")
Node.js: $(node --version 2>/dev/null || echo "Not installed")
npm: $(npm --version 2>/dev/null || echo "Not installed")
curl: $(curl --version 2>/dev/null | head -1 || echo "Not installed")
wget: $(wget --version 2>/dev/null | head -1 || echo "Not installed")
unzip: $(unzip -v 2>/dev/null | head -1 || echo "Not installed")
Docker: $(docker --version 2>/dev/null || echo "Not installed")
EOF
    
    # Package manager information
    cat > "$temp_dir/package-managers.txt" << EOF
Package Manager Information
===========================
EOF
    
    if command -v apt-get >/dev/null 2>&1; then
        echo "APT (Debian/Ubuntu):" >> "$temp_dir/package-managers.txt"
        apt list --installed 2>/dev/null | grep -E "(git|node|npm|curl|wget|unzip)" >> "$temp_dir/package-managers.txt" || true
        echo "" >> "$temp_dir/package-managers.txt"
    fi
    
    if command -v brew >/dev/null 2>&1; then
        echo "Homebrew (macOS):" >> "$temp_dir/package-managers.txt"
        brew list 2>/dev/null | grep -E "(git|node|npm|curl|wget|unzip)" >> "$temp_dir/package-managers.txt" || true
        echo "" >> "$temp_dir/package-managers.txt"
    fi
    
    # Network connectivity test
    cat > "$temp_dir/network-test.txt" << EOF
Network Connectivity Test
=========================
EOF
    
    for host in "google.com" "github.com" "npmjs.org"; do
        echo "Testing $host:" >> "$temp_dir/network-test.txt"
        ping -c 3 "$host" >> "$temp_dir/network-test.txt" 2>&1 || echo "Failed to ping $host" >> "$temp_dir/network-test.txt"
        echo "" >> "$temp_dir/network-test.txt"
    done
    
    # Create bundle
    tar -czf "$bundle_file" -C "$temp_dir" . 2>/dev/null || {
        log_error "SUPPORT" "Failed to create support bundle"
        rm -rf "$temp_dir"
        return 1
    }
    
    rm -rf "$temp_dir"
    
    print_success "Support bundle created: $bundle_file"
    print_info "Include this file when contacting support"
    
    return 0
}

# Validate error handler functionality
validate_error_handler() {
    log_info "VALIDATION" "Validating error handler functionality"
    
    # Test logging functions
    log_debug "TEST" "Debug message test"
    log_info "TEST" "Info message test"
    log_warning "TEST" "Warning message test" "Test context"
    
    # Test file registration
    local test_file=$(mktemp)
    register_temp_file "$test_file"
    
    local test_dir=$(mktemp -d)
    register_cleanup_dir "$test_dir"
    
    log_info "VALIDATION" "Error handler validation completed"
    
    # Clean up test files
    rm -f "$test_file" 2>/dev/null || true
    rm -rf "$test_dir" 2>/dev/null || true
}

# Export functions for use in other scripts
export -f initialize_error_handler
export -f enable_verbose_mode
export -f enable_debug_mode
export -f set_current_step
export -f log_error
export -f log_warning
export -f log_info
export -f log_debug
export -f register_temp_file
export -f register_cleanup_dir
export -f cleanup_on_error
export -f generate_support_bundle
export -f validate_error_handler
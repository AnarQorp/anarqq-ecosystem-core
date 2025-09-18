#!/bin/bash

# AnarQ&Q Ecosystem Installer - Error Recovery and Troubleshooting System
# Version: 1.0.0
# Author: AnarQorp
# License: MIT

# Recovery strategies and troubleshooting database
declare -A RECOVERY_STRATEGIES=(
    ["NETWORK_TIMEOUT"]="retry_with_exponential_backoff"
    ["NETWORK_DNS"]="try_alternative_dns"
    ["NETWORK_PROXY"]="configure_proxy_settings"
    ["PERMISSION_DENIED"]="fix_permissions"
    ["DISK_FULL"]="cleanup_disk_space"
    ["DEPENDENCY_MISSING"]="install_missing_dependencies"
    ["REPOSITORY_ACCESS"]="setup_repository_access"
    ["EXTRACTION_FAILED"]="try_alternative_extraction"
    ["NODE_VERSION"]="update_node_version"
    ["NPM_CACHE"]="clear_npm_cache"
)

declare -A ERROR_PATTERNS=(
    ["curl.*Connection timed out"]="NETWORK_TIMEOUT"
    ["wget.*Connection timed out"]="NETWORK_TIMEOUT"
    ["git.*Connection timed out"]="NETWORK_TIMEOUT"
    ["curl.*Could not resolve host"]="NETWORK_DNS"
    ["wget.*unable to resolve host"]="NETWORK_DNS"
    ["git.*Could not resolve hostname"]="NETWORK_DNS"
    ["Permission denied"]="PERMISSION_DENIED"
    ["No space left on device"]="DISK_FULL"
    ["command not found"]="DEPENDENCY_MISSING"
    ["Repository not found"]="REPOSITORY_ACCESS"
    ["fatal: repository.*does not exist"]="REPOSITORY_ACCESS"
    ["unzip.*cannot find"]="EXTRACTION_FAILED"
    ["node.*version.*not supported"]="NODE_VERSION"
    ["npm.*EACCES"]="NPM_CACHE"
    ["npm.*EPERM"]="NPM_CACHE"
)

# Automatic error recovery system
attempt_error_recovery() {
    local error_message="$1"
    local context="$2"
    local max_attempts="${3:-3}"
    
    log_info "RECOVERY" "Attempting automatic error recovery" "Error: $error_message"
    
    # Identify error pattern
    local error_type=$(identify_error_type "$error_message")
    
    if [ -n "$error_type" ]; then
        local recovery_strategy="${RECOVERY_STRATEGIES[$error_type]}"
        
        if [ -n "$recovery_strategy" ]; then
            log_info "RECOVERY" "Identified error type: $error_type, applying strategy: $recovery_strategy"
            
            # Execute recovery strategy
            if $recovery_strategy "$error_message" "$context"; then
                log_info "RECOVERY" "Recovery strategy successful"
                return 0
            else
                log_warning "RECOVERY" "Recovery strategy failed"
                return 1
            fi
        else
            log_warning "RECOVERY" "No recovery strategy available for error type: $error_type"
        fi
    else
        log_warning "RECOVERY" "Could not identify error pattern"
    fi
    
    # Fallback to generic recovery
    generic_error_recovery "$error_message" "$context"
}

# Identify error type from message
identify_error_type() {
    local error_message="$1"
    
    for pattern in "${!ERROR_PATTERNS[@]}"; do
        if [[ "$error_message" =~ $pattern ]]; then
            echo "${ERROR_PATTERNS[$pattern]}"
            return 0
        fi
    done
    
    return 1
}

# Network timeout recovery
retry_with_exponential_backoff() {
    local error_message="$1"
    local context="$2"
    local max_attempts=5
    local base_delay=2
    
    log_info "RECOVERY" "Applying network timeout recovery with exponential backoff"
    
    for ((attempt=1; attempt<=max_attempts; attempt++)); do
        local delay=$((base_delay * (2 ** (attempt - 1))))
        
        log_info "RECOVERY" "Retry attempt $attempt/$max_attempts after ${delay}s delay"
        sleep $delay
        
        # Test network connectivity
        if test_network_connectivity; then
            log_info "RECOVERY" "Network connectivity restored"
            return 0
        fi
    done
    
    log_error "RECOVERY" "Network timeout recovery failed after $max_attempts attempts"
    return 1
}

# DNS resolution recovery
try_alternative_dns() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Applying DNS resolution recovery"
    
    # Test current DNS
    if ! test_dns_resolution "github.com"; then
        log_warning "RECOVERY" "DNS resolution failing, suggesting alternative DNS servers"
        
        show_dns_troubleshooting
        return 1
    fi
    
    return 0
}

# Proxy configuration recovery
configure_proxy_settings() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Checking proxy configuration"
    
    if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ] || [ -n "$http_proxy" ] || [ -n "$https_proxy" ]; then
        log_info "RECOVERY" "Proxy settings detected, validating configuration"
        show_proxy_troubleshooting
    else
        log_info "RECOVERY" "No proxy settings detected"
        show_network_troubleshooting
    fi
    
    return 1  # Always return 1 to show troubleshooting
}

# Permission recovery
fix_permissions() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Attempting permission recovery"
    
    # Check if we're trying to write to a protected directory
    local target_dir=$(pwd)
    if [[ "$context" =~ mkdir.*([^[:space:]]+) ]]; then
        target_dir="${BASH_REMATCH[1]}"
    fi
    
    log_info "RECOVERY" "Checking permissions for: $target_dir"
    
    # Check if directory is writable
    if [ ! -w "$target_dir" ]; then
        log_warning "RECOVERY" "Directory is not writable: $target_dir"
        
        # Suggest solutions
        echo ""
        print_info "Permission Recovery Options:"
        echo "  1. Change to a writable directory:"
        echo "     cd \$HOME && mkdir -p anarqq-ecosystem && cd anarqq-ecosystem"
        echo ""
        echo "  2. Fix directory permissions (if you own it):"
        echo "     chmod u+w \"$target_dir\""
        echo ""
        echo "  3. Use a different installation directory:"
        echo "     export INSTALL_DIR=\"\$HOME/anarqq-ecosystem\""
        echo ""
        
        return 1
    fi
    
    return 0
}

# Disk space recovery
cleanup_disk_space() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Attempting disk space recovery"
    
    # Check available disk space
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local available_mb=$((available_space / 1024))
    
    log_info "RECOVERY" "Available disk space: ${available_mb}MB"
    
    if [ $available_mb -lt 100 ]; then
        log_error "RECOVERY" "Insufficient disk space (${available_mb}MB available, need at least 100MB)"
        
        show_disk_cleanup_suggestions
        return 1
    fi
    
    # Clean up temporary files
    cleanup_temp_files
    
    return 0
}

# Dependency installation recovery
install_missing_dependencies() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Attempting to install missing dependencies"
    
    # Extract command name from error
    local missing_command=""
    if [[ "$error_message" =~ ([a-zA-Z0-9_-]+):.*command\ not\ found ]]; then
        missing_command="${BASH_REMATCH[1]}"
    elif [[ "$error_message" =~ command\ not\ found:\ ([a-zA-Z0-9_-]+) ]]; then
        missing_command="${BASH_REMATCH[1]}"
    fi
    
    if [ -n "$missing_command" ]; then
        log_info "RECOVERY" "Attempting to install missing command: $missing_command"
        
        if install_missing_dependency "$missing_command" "Required system utility"; then
            log_info "RECOVERY" "Successfully installed: $missing_command"
            return 0
        else
            log_warning "RECOVERY" "Failed to install: $missing_command"
        fi
    fi
    
    show_dependency_troubleshooting
    return 1
}

# Repository access recovery
setup_repository_access() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Attempting repository access recovery"
    
    # Check if it's a private repository issue
    if [[ "$error_message" =~ (Repository\ not\ found|does\ not\ exist|Permission\ denied) ]]; then
        log_warning "RECOVERY" "Repository access issue detected"
        
        show_repository_access_troubleshooting
        return 1
    fi
    
    return 0
}

# Archive extraction recovery
try_alternative_extraction() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Attempting alternative extraction methods"
    
    # Try different extraction methods
    local extraction_methods=("unzip" "python3_zipfile" "node_admzip")
    
    for method in "${extraction_methods[@]}"; do
        log_info "RECOVERY" "Trying extraction method: $method"
        
        case "$method" in
            "unzip")
                if command_exists unzip; then
                    log_info "RECOVERY" "unzip is available"
                    return 0
                fi
                ;;
            "python3_zipfile")
                if command_exists python3; then
                    log_info "RECOVERY" "Python3 zipfile method available"
                    return 0
                fi
                ;;
            "node_admzip")
                if command_exists node; then
                    log_info "RECOVERY" "Node.js extraction method available"
                    return 0
                fi
                ;;
        esac
    done
    
    show_extraction_troubleshooting
    return 1
}

# Node.js version recovery
update_node_version() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Checking Node.js version compatibility"
    
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo "$node_version" | cut -d'.' -f1)
        
        log_info "RECOVERY" "Current Node.js version: $node_version"
        
        if [ "$major_version" -lt 18 ]; then
            log_warning "RECOVERY" "Node.js version $node_version is not supported (requires ≥18)"
            show_node_update_instructions
            return 1
        fi
    else
        log_error "RECOVERY" "Node.js is not installed"
        show_node_installation_instructions
        return 1
    fi
    
    return 0
}

# NPM cache recovery
clear_npm_cache() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Attempting NPM cache recovery"
    
    if command_exists npm; then
        log_info "RECOVERY" "Clearing NPM cache"
        
        if npm cache clean --force 2>/dev/null; then
            log_info "RECOVERY" "NPM cache cleared successfully"
            return 0
        else
            log_warning "RECOVERY" "Failed to clear NPM cache"
        fi
    fi
    
    show_npm_troubleshooting
    return 1
}

# Generic error recovery
generic_error_recovery() {
    local error_message="$1"
    local context="$2"
    
    log_info "RECOVERY" "Applying generic error recovery"
    
    # Basic system checks
    test_basic_system_health
    
    # Show generic troubleshooting
    show_generic_troubleshooting "$error_message" "$context"
    
    return 1
}

# Test network connectivity
test_network_connectivity() {
    local test_hosts=("google.com" "github.com" "npmjs.org")
    
    for host in "${test_hosts[@]}"; do
        if ping -c 1 -W 5 "$host" >/dev/null 2>&1; then
            log_debug "RECOVERY" "Network connectivity test passed for: $host"
            return 0
        fi
    done
    
    log_warning "RECOVERY" "Network connectivity test failed for all hosts"
    return 1
}

# Test DNS resolution
test_dns_resolution() {
    local host="$1"
    
    if nslookup "$host" >/dev/null 2>&1 || dig "$host" >/dev/null 2>&1; then
        log_debug "RECOVERY" "DNS resolution successful for: $host"
        return 0
    fi
    
    log_warning "RECOVERY" "DNS resolution failed for: $host"
    return 1
}

# Test basic system health
test_basic_system_health() {
    log_info "RECOVERY" "Running basic system health checks"
    
    # Check disk space
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local available_mb=$((available_space / 1024))
    
    if [ $available_mb -lt 100 ]; then
        log_warning "RECOVERY" "Low disk space: ${available_mb}MB available"
    else
        log_debug "RECOVERY" "Disk space OK: ${available_mb}MB available"
    fi
    
    # Check memory
    if command_exists free; then
        local available_mem=$(free -m | grep "Mem:" | awk '{print $7}')
        if [ "$available_mem" -lt 100 ]; then
            log_warning "RECOVERY" "Low memory: ${available_mem}MB available"
        else
            log_debug "RECOVERY" "Memory OK: ${available_mem}MB available"
        fi
    fi
    
    # Check load average
    if [ -f /proc/loadavg ]; then
        local load_avg=$(cat /proc/loadavg | awk '{print $1}')
        local load_int=$(echo "$load_avg" | cut -d'.' -f1)
        
        if [ "$load_int" -gt 5 ]; then
            log_warning "RECOVERY" "High system load: $load_avg"
        else
            log_debug "RECOVERY" "System load OK: $load_avg"
        fi
    fi
}

# Show troubleshooting guides
show_dns_troubleshooting() {
    echo ""
    print_info "DNS Resolution Troubleshooting:"
    echo "  1. Try alternative DNS servers:"
    echo "     • Google DNS: 8.8.8.8, 8.8.4.4"
    echo "     • Cloudflare DNS: 1.1.1.1, 1.0.0.1"
    echo "     • OpenDNS: 208.67.222.222, 208.67.220.220"
    echo ""
    echo "  2. Temporarily change DNS (Linux/macOS):"
    echo "     echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf"
    echo ""
    echo "  3. Flush DNS cache:"
    echo "     • Linux: sudo systemctl restart systemd-resolved"
    echo "     • macOS: sudo dscacheutil -flushcache"
    echo ""
}

show_proxy_troubleshooting() {
    echo ""
    print_info "Proxy Configuration Troubleshooting:"
    echo "  Current proxy settings:"
    echo "    HTTP_PROXY: ${HTTP_PROXY:-Not set}"
    echo "    HTTPS_PROXY: ${HTTPS_PROXY:-Not set}"
    echo "    NO_PROXY: ${NO_PROXY:-Not set}"
    echo ""
    echo "  1. If behind corporate firewall, configure proxy:"
    echo "     export HTTP_PROXY=http://proxy.company.com:8080"
    echo "     export HTTPS_PROXY=http://proxy.company.com:8080"
    echo ""
    echo "  2. If proxy requires authentication:"
    echo "     export HTTP_PROXY=http://username:password@proxy.company.com:8080"
    echo ""
    echo "  3. To bypass proxy for certain hosts:"
    echo "     export NO_PROXY=localhost,127.0.0.1,.company.com"
    echo ""
}

show_network_troubleshooting() {
    echo ""
    print_info "Network Troubleshooting:"
    echo "  1. Test basic connectivity:"
    echo "     ping google.com"
    echo ""
    echo "  2. Test HTTPS connectivity:"
    echo "     curl -I https://github.com"
    echo ""
    echo "  3. Check firewall settings"
    echo "  4. Try using mobile hotspot or different network"
    echo "  5. Contact network administrator if on corporate network"
    echo ""
}

show_disk_cleanup_suggestions() {
    echo ""
    print_info "Disk Space Cleanup Suggestions:"
    echo "  1. Clean package manager cache:"
    echo "     • Ubuntu/Debian: sudo apt clean"
    echo "     • macOS: brew cleanup"
    echo ""
    echo "  2. Clean temporary files:"
    echo "     rm -rf /tmp/* ~/.cache/*"
    echo ""
    echo "  3. Clean npm cache:"
    echo "     npm cache clean --force"
    echo ""
    echo "  4. Remove old log files:"
    echo "     sudo find /var/log -name '*.log' -mtime +30 -delete"
    echo ""
}

show_dependency_troubleshooting() {
    echo ""
    print_info "Dependency Installation Troubleshooting:"
    echo "  1. Update package manager:"
    echo "     • Ubuntu/Debian: sudo apt update"
    echo "     • CentOS/RHEL: sudo yum update"
    echo "     • macOS: brew update"
    echo ""
    echo "  2. Install build essentials:"
    echo "     • Ubuntu/Debian: sudo apt install build-essential"
    echo "     • CentOS/RHEL: sudo yum groupinstall 'Development Tools'"
    echo "     • macOS: xcode-select --install"
    echo ""
    echo "  3. Check available packages:"
    echo "     • Ubuntu/Debian: apt search <package>"
    echo "     • CentOS/RHEL: yum search <package>"
    echo "     • macOS: brew search <package>"
    echo ""
}

show_repository_access_troubleshooting() {
    echo ""
    print_info "Repository Access Troubleshooting:"
    echo "  1. For private repositories, set up SSH key:"
    echo "     ssh-keygen -t ed25519 -C 'your-email@example.com'"
    echo "     cat ~/.ssh/id_ed25519.pub"
    echo "     # Add the public key to GitHub: https://github.com/settings/keys"
    echo ""
    echo "  2. Test SSH connection:"
    echo "     ssh -T git@github.com"
    echo ""
    echo "  3. Try HTTPS with personal access token:"
    echo "     git config --global credential.helper store"
    echo "     # Use token as password when prompted"
    echo ""
    echo "  4. Contact repository owner for access"
    echo ""
}

show_extraction_troubleshooting() {
    echo ""
    print_info "Archive Extraction Troubleshooting:"
    echo "  1. Install unzip utility:"
    echo "     • Ubuntu/Debian: sudo apt install unzip"
    echo "     • CentOS/RHEL: sudo yum install unzip"
    echo "     • macOS: brew install unzip"
    echo ""
    echo "  2. Check file integrity:"
    echo "     file downloaded_file.zip"
    echo ""
    echo "  3. Try manual extraction:"
    echo "     unzip -l downloaded_file.zip  # List contents"
    echo "     unzip downloaded_file.zip     # Extract"
    echo ""
}

show_node_update_instructions() {
    echo ""
    print_info "Node.js Update Instructions:"
    echo "  1. Using Node Version Manager (recommended):"
    echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "     source ~/.bashrc"
    echo "     nvm install --lts"
    echo "     nvm use --lts"
    echo ""
    echo "  2. Download from official website:"
    echo "     https://nodejs.org/en/download/"
    echo ""
    echo "  3. Using package manager:"
    echo "     • Ubuntu: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "     • macOS: brew install node"
    echo ""
}

show_node_installation_instructions() {
    echo ""
    print_info "Node.js Installation Instructions:"
    echo "  1. Install Node.js LTS version:"
    echo "     https://nodejs.org/en/download/"
    echo ""
    echo "  2. Using package manager:"
    echo "     • Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install nodejs"
    echo "     • CentOS/RHEL: curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - && sudo yum install nodejs"
    echo "     • macOS: brew install node"
    echo ""
    echo "  3. Verify installation:"
    echo "     node --version && npm --version"
    echo ""
}

show_npm_troubleshooting() {
    echo ""
    print_info "NPM Troubleshooting:"
    echo "  1. Clear npm cache:"
    echo "     npm cache clean --force"
    echo ""
    echo "  2. Fix npm permissions:"
    echo "     mkdir ~/.npm-global"
    echo "     npm config set prefix '~/.npm-global'"
    echo "     echo 'export PATH=~/.npm-global/bin:\$PATH' >> ~/.bashrc"
    echo ""
    echo "  3. Reinstall npm:"
    echo "     curl -L https://www.npmjs.com/install.sh | sh"
    echo ""
    echo "  4. Use different registry:"
    echo "     npm config set registry https://registry.npmjs.org/"
    echo ""
}

show_generic_troubleshooting() {
    local error_message="$1"
    local context="$2"
    
    echo ""
    print_info "Generic Troubleshooting Steps:"
    echo "  1. Run installer with verbose mode:"
    echo "     bash installer.sh --verbose"
    echo ""
    echo "  2. Check system requirements:"
    echo "     • Node.js ≥18"
    echo "     • npm ≥8"
    echo "     • git ≥2.0"
    echo "     • curl or wget"
    echo "     • unzip"
    echo ""
    echo "  3. Update system packages:"
    echo "     • Ubuntu/Debian: sudo apt update && sudo apt upgrade"
    echo "     • CentOS/RHEL: sudo yum update"
    echo "     • macOS: brew update && brew upgrade"
    echo ""
    echo "  4. Try in clean environment:"
    echo "     • New terminal session"
    echo "     • Different user account"
    echo "     • Fresh system/container"
    echo ""
    echo "  5. Contact support with log file:"
    echo "     • Email: anarqorp@proton.me"
    echo "     • Include: $INSTALLER_LOG_FILE"
    echo ""
}

# Export functions for use in other scripts
export -f attempt_error_recovery
export -f identify_error_type
export -f test_network_connectivity
export -f test_dns_resolution
export -f test_basic_system_health
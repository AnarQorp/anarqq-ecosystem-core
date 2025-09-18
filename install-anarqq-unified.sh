#!/bin/bash

# AnarQ&Q Ecosystem Unified Installer System
# Sistema de instalación unificado para el ecosistema AnarQ&Q
# Versión: 4.0.0 - Unified Installation System
# Autor: AnarQorp
# Licencia: MIT

set -e

# ============================================================================
# CONFIGURATION AND CONSTANTS
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/anarqq-ecosystem"
LOG_FILE="./anarqq-unified-installer-$(date +%Y%m%d-%H%M%S).log"
INSTALLER_VERSION="4.0.0"
INSTALLER_NAME="AnarQ&Q Unified Installer"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration arrays
declare -A INSTALL_CONFIG=(
    ["mode"]=""
    ["components"]=""
    ["target_dir"]="$INSTALL_DIR"
    ["skip_validation"]="false"
    ["verbose"]="false"
    ["cleanup_on_error"]="true"
    ["interactive"]="true"
)

declare -A SYSTEM_CAPS=(
    ["os"]=""
    ["package_manager"]=""
    ["shell"]=""
    ["has_docker"]="false"
    ["has_git"]="false"
    ["has_node"]="false"
    ["node_version"]=""
)

declare -A ERROR_CONTEXT=(
    ["step"]=""
    ["component"]=""
    ["method"]=""
    ["attempt"]="0"
    ["last_error"]=""
)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_step() { echo -e "${PURPLE}🔄 $1${NC}"; }
print_substep() { echo -e "  ${CYAN}→ $1${NC}"; }

log_message() {
    local level="$1"
    local message="$2"
    local context="${3:-}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    if [ -n "$context" ]; then
        echo "[$timestamp] [CONTEXT] $context" >> "$LOG_FILE"
    fi
    
    case "$level" in
        "ERROR") print_error "$message" ;;
        "WARN") print_warning "$message" ;;
        "INFO") print_info "$message" ;;
        "DEBUG") [ "${INSTALL_CONFIG[verbose]}" = "true" ] && print_substep "$message" ;;
        "SUCCESS") print_success "$message" ;;
    esac
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

show_progress() {
    local message="$1"
    local percentage="${2:-0}"
    
    if [ "${INSTALL_CONFIG[interactive]}" = "true" ]; then
        printf "\r${CYAN}🔄 $message... ${percentage}%%${NC}"
        if [ "$percentage" -eq 100 ]; then
            echo ""
        fi
    else
        log_message "INFO" "$message ($percentage%)"
    fi
}

prompt_user() {
    local question="$1"
    local default="${2:-}"
    local options="${3:-y/N}"
    
    if [ "${INSTALL_CONFIG[interactive]}" = "false" ]; then
        echo "$default"
        return 0
    fi
    
    local prompt_text="$question"
    if [ -n "$default" ]; then
        prompt_text="$prompt_text [$options]"
    fi
    prompt_text="$prompt_text: "
    
    read -p "$prompt_text" -r response
    response=${response:-$default}
    echo "$response"
}

# ============================================================================
# SYSTEM DETECTION AND CAPABILITIES
# ============================================================================

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

detect_package_manager() {
    if command_exists apt-get; then
        echo "apt"
    elif command_exists yum; then
        echo "yum"
    elif command_exists dnf; then
        echo "dnf"
    elif command_exists brew; then
        echo "brew"
    elif command_exists pacman; then
        echo "pacman"
    else
        echo "manual"
    fi
}

detect_shell() {
    if [ -n "$BASH_VERSION" ]; then
        echo "bash"
    elif [ -n "$ZSH_VERSION" ]; then
        echo "zsh"
    else
        echo "$(basename "$SHELL")"
    fi
}

initialize_system_info() {
    log_message "INFO" "Detecting system capabilities..."
    
    SYSTEM_CAPS["os"]=$(detect_os)
    SYSTEM_CAPS["package_manager"]=$(detect_package_manager)
    SYSTEM_CAPS["shell"]=$(detect_shell)
    
    if command_exists docker; then
        SYSTEM_CAPS["has_docker"]="true"
    fi
    
    if command_exists git; then
        SYSTEM_CAPS["has_git"]="true"
    fi
    
    if command_exists node; then
        SYSTEM_CAPS["has_node"]="true"
        SYSTEM_CAPS["node_version"]=$(node --version 2>/dev/null || echo "unknown")
    fi
    
    log_message "DEBUG" "System OS: ${SYSTEM_CAPS[os]}"
    log_message "DEBUG" "Package Manager: ${SYSTEM_CAPS[package_manager]}"
    log_message "DEBUG" "Node.js: ${SYSTEM_CAPS[has_node]} (${SYSTEM_CAPS[node_version]})"
}

# ============================================================================
# DEPENDENCY MANAGEMENT
# ============================================================================

install_dependency() {
    local dependency="$1"
    local description="$2"
    local pkg_manager="${SYSTEM_CAPS[package_manager]}"
    
    log_message "INFO" "Installing dependency: $dependency ($description)"
    
    case "$pkg_manager" in
        "apt")
            sudo apt-get update -qq
            sudo apt-get install -y "$dependency"
            ;;
        "yum"|"dnf")
            sudo "$pkg_manager" install -y "$dependency"
            ;;
        "brew")
            brew install "$dependency"
            ;;
        "pacman")
            sudo pacman -S --noconfirm "$dependency"
            ;;
        *)
            log_message "WARN" "Cannot auto-install $dependency. Please install manually."
            return 1
            ;;
    esac
    
    return $?
}

check_dependencies() {
    log_message "INFO" "Checking system dependencies..."
    
    local missing_deps=()
    local critical_deps=("curl" "unzip")
    
    for dep in "${critical_deps[@]}"; do
        if ! command_exists "$dep"; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_message "WARN" "Missing critical dependencies: ${missing_deps[*]}"
        
        for dep in "${missing_deps[@]}"; do
            case "$dep" in
                "curl")
                    if ! install_dependency "curl" "HTTP client for downloads"; then
                        log_message "ERROR" "Failed to install curl"
                        return 1
                    fi
                    ;;
                "unzip")
                    if ! install_dependency "unzip" "Archive extraction utility"; then
                        log_message "ERROR" "Failed to install unzip"
                        return 1
                    fi
                    ;;
            esac
        done
    fi
    
    if ! command_exists node; then
        log_message "WARN" "Node.js not found. Attempting to install..."
        if ! install_nodejs; then
            log_message "ERROR" "Failed to install Node.js"
            return 1
        fi
    fi
    
    log_message "SUCCESS" "All dependencies satisfied"
    return 0
}

install_nodejs() {
    local pkg_manager="${SYSTEM_CAPS[package_manager]}"
    
    case "$pkg_manager" in
        "apt")
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "yum"|"dnf")
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo "$pkg_manager" install -y nodejs npm
            ;;
        "brew")
            brew install node
            ;;
        *)
            log_message "ERROR" "Cannot auto-install Node.js for package manager: $pkg_manager"
            print_info "Please install Node.js manually from: https://nodejs.org/"
            return 1
            ;;
    esac
    
    return $?
}

# ============================================================================
# DOWNLOAD ENGINE
# ============================================================================

retry_with_backoff() {
    local max_attempts="$1"
    local delay="$2"
    local command_to_run="$3"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        ERROR_CONTEXT["attempt"]="$attempt"
        
        if eval "$command_to_run"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_message "WARN" "Attempt $attempt failed, retrying in ${delay}s..."
            sleep $delay
            delay=$((delay * 2))
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

download_repository() {
    local repo_url="$1"
    local target_dir="$2"
    local repo_name="$3"
    
    ERROR_CONTEXT["step"]="download_repositories"
    ERROR_CONTEXT["component"]="$repo_name"
    
    log_message "INFO" "Downloading repository: $repo_name from $repo_url"
    
    # Method 1: Git clone (preferred)
    if [ "${SYSTEM_CAPS[has_git]}" = "true" ]; then
        ERROR_CONTEXT["method"]="git_clone"
        log_message "DEBUG" "Attempting git clone..."
        
        if retry_with_backoff 3 2 "git clone --depth 1 '$repo_url.git' '$target_dir'"; then
            log_message "SUCCESS" "Repository $repo_name cloned successfully with git"
            return 0
        else
            log_message "WARN" "Git clone failed, trying ZIP download..."
        fi
    fi
    
    # Method 2: ZIP download
    local zip_url="$repo_url/archive/refs/heads/main.zip"
    if download_and_extract_zip "$zip_url" "$target_dir" "$repo_name"; then
        log_message "SUCCESS" "Repository $repo_name downloaded as ZIP"
        return 0
    fi
    
    ERROR_CONTEXT["last_error"]="All download methods failed"
    log_message "ERROR" "Failed to download repository: $repo_name"
    return 1
}

download_and_extract_zip() {
    local zip_url="$1"
    local target_dir="$2"
    local repo_name="$3"
    
    local temp_dir=$(mktemp -d)
    local zip_file="$temp_dir/${repo_name}.zip"
    local extract_dir="$temp_dir/${repo_name}_extract"
    
    # Download with curl
    if command_exists curl; then
        ERROR_CONTEXT["method"]="curl_zip"
        log_message "DEBUG" "Downloading with curl..."
        
        if retry_with_backoff 3 2 "curl -L -f -s -o '$zip_file' '$zip_url'"; then
            # Extract with unzip
            if command_exists unzip; then
                mkdir -p "$extract_dir"
                if unzip -q "$zip_file" -d "$extract_dir" 2>/dev/null; then
                    if move_extracted_content "$extract_dir" "$target_dir"; then
                        rm -rf "$temp_dir"
                        return 0
                    fi
                fi
            fi
        fi
    fi
    
    rm -rf "$temp_dir"
    return 1
}

move_extracted_content() {
    local extract_dir="$1"
    local target_dir="$2"
    
    local extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d -name "*-main" | head -1)
    
    if [ -z "$extracted_dir" ]; then
        extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d ! -path "$extract_dir" | head -1)
    fi
    
    if [ -n "$extracted_dir" ] && [ -d "$extracted_dir" ]; then
        mkdir -p "$target_dir"
        cp -r "$extracted_dir"/* "$target_dir/" 2>/dev/null || true
        cp -r "$extracted_dir"/.[^.]* "$target_dir/" 2>/dev/null || true
        return 0
    fi
    
    return 1
}

# ============================================================================
# CONFIGURATION MANAGEMENT
# ============================================================================

load_configuration() {
    local config_file="$1"
    
    if [ -f "$config_file" ]; then
        log_message "INFO" "Loading configuration from: $config_file"
        source "$config_file"
        
        INSTALL_CONFIG["mode"]="${INSTALL_CONFIG_MODE:-}"
        INSTALL_CONFIG["components"]="${INSTALL_CONFIG_COMPONENTS:-}"
        INSTALL_CONFIG["target_dir"]="${INSTALL_CONFIG_TARGET_DIR:-$INSTALL_DIR}"
        INSTALL_CONFIG["verbose"]="${INSTALL_CONFIG_VERBOSE:-false}"
        
        log_message "SUCCESS" "Configuration loaded successfully"
        return 0
    else
        log_message "WARN" "Configuration file not found: $config_file"
        return 1
    fi
}

save_configuration() {
    local config_file="$1"
    
    log_message "INFO" "Saving configuration to: $config_file"
    
    cat > "$config_file" << EOF
# AnarQ&Q Installation Configuration
# Generated on $(date)

INSTALL_CONFIG_MODE="${INSTALL_CONFIG[mode]}"
INSTALL_CONFIG_COMPONENTS="${INSTALL_CONFIG[components]}"
INSTALL_CONFIG_TARGET_DIR="${INSTALL_CONFIG[target_dir]}"
INSTALL_CONFIG_VERBOSE="${INSTALL_CONFIG[verbose]}"
EOF
    
    log_message "SUCCESS" "Configuration saved successfully"
}

source_modules() {
    log_message "INFO" "Loading modular components..."
    
    if [ -f "$SCRIPT_DIR/install-dependency-manager.sh" ]; then
        source "$SCRIPT_DIR/install-dependency-manager.sh"
        log_message "DEBUG" "Loaded dependency manager"
    else
        log_message "WARN" "Dependency manager not found, using built-in functions"
    fi
    
    if [ -f "$SCRIPT_DIR/install-component-manager.sh" ]; then
        source "$SCRIPT_DIR/install-component-manager.sh"
        log_message "DEBUG" "Loaded component manager"
    else
        log_message "WARN" "Component manager not found, using built-in functions"
    fi
    
    log_message "SUCCESS" "Modular components loaded"
}

# ============================================================================
# INSTALLATION ORCHESTRATION
# ============================================================================

select_installation_mode() {
    if [ -n "${INSTALL_CONFIG[mode]}" ]; then
        log_message "INFO" "Using pre-configured mode: ${INSTALL_CONFIG[mode]}"
        return 0
    fi
    
    print_step "Installation Mode Selection"
    echo ""
    print_info "Available installation modes:"
    echo ""
    echo "  1) minimal    - Basic demo with essential components"
    echo "  2) full       - Complete ecosystem with all modules"
    echo "  3) development - Development environment with additional tools"
    echo ""
    
    local mode_choice=$(prompt_user "Select installation mode (1-3)" "1" "1-3")
    
    case "$mode_choice" in
        1|"minimal") INSTALL_CONFIG["mode"]="minimal" ;;
        2|"full") INSTALL_CONFIG["mode"]="full" ;;
        3|"development") INSTALL_CONFIG["mode"]="development" ;;
        *) 
            log_message "WARN" "Invalid selection, defaulting to minimal"
            INSTALL_CONFIG["mode"]="minimal"
            ;;
    esac
    
    log_message "INFO" "Selected installation mode: ${INSTALL_CONFIG[mode]}"
}

get_components_for_mode() {
    local mode="$1"
    
    case "$mode" in
        "minimal")
            echo "demo"
            ;;
        "full")
            echo "demo,core,backend,frontend"
            ;;
        "development")
            echo "demo,core,backend,frontend,dev-tools"
            ;;
        *)
            log_message "ERROR" "Unknown installation mode: $mode"
            echo "demo"
            ;;
    esac
}

create_install_directory() {
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    print_step "Creating installation directory..."
    
    if [ -d "$target_dir" ]; then
        log_message "WARN" "Directory already exists: $target_dir"
        
        local response=$(prompt_user "Directory exists. Continue and overwrite?" "n" "y/N")
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_message "INFO" "Installation cancelled by user"
            exit 0
        fi
        
        rm -rf "$target_dir"
    fi
    
    mkdir -p "$target_dir"
    
    # Mark as AnarQ&Q installation
    touch "$target_dir/.anarqq-installation"
    echo "$(date)" > "$target_dir/.anarqq-install-date"
    echo "$INSTALLER_VERSION" > "$target_dir/.anarqq-installer-version"
    
    log_message "SUCCESS" "Installation directory created: $target_dir"
}

install_repositories() {
    local components="${INSTALL_CONFIG[components]}"
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    print_step "Installing repositories..."
    
    declare -A REPO_URLS=(
        ["demo"]="https://github.com/AnarQorp/anarqq-ecosystem-demo"
        ["core"]="https://github.com/AnarQorp/anarqq-ecosystem-core"
    )
    
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    local total=${#COMP_ARRAY[@]}
    local current=0
    
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        current=$((current + 1))
        
        show_progress "Installing $component" $((current * 100 / total))
        
        # Skip non-repository components
        if [[ "$component" == "backend" || "$component" == "frontend" || "$component" == "dev-tools" ]]; then
            continue
        fi
        
        local repo_url="${REPO_URLS[$component]}"
        if [ -n "$repo_url" ]; then
            local component_dir="$target_dir/$component"
            
            if ! download_repository "$repo_url" "$component_dir" "$component"; then
                log_message "ERROR" "Failed to install repository: $component"
                return 1
            fi
        fi
    done
    
    show_progress "Repository installation complete" 100
    log_message "SUCCESS" "All repositories installed successfully"
}

install_dependencies() {
    local components="${INSTALL_CONFIG[components]}"
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    print_step "Installing component dependencies..."
    
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        local component_dir="$target_dir/$component"
        
        if [ -d "$component_dir" ] && [ -f "$component_dir/package.json" ]; then
            print_substep "Installing dependencies for $component..."
            
            cd "$component_dir"
            if [ "${INSTALL_CONFIG[verbose]}" = "true" ]; then
                npm install
            else
                npm install >/dev/null 2>&1
            fi
            
            log_message "SUCCESS" "Dependencies installed for $component"
        fi
    done
    
    log_message "SUCCESS" "All component dependencies installed"
}

setup_environment() {
    local components="${INSTALL_CONFIG[components]}"
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    print_step "Setting up environment..."
    
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        local component_dir="$target_dir/$component"
        
        if [ -d "$component_dir" ]; then
            # Copy environment files
            if [ -f "$component_dir/.env.example" ] && [ ! -f "$component_dir/.env" ]; then
                cp "$component_dir/.env.example" "$component_dir/.env"
                log_message "INFO" "Created .env for $component"
            fi
            
            # Setup backend environment
            if [ -d "$component_dir/backend" ]; then
                local backend_dir="$component_dir/backend"
                if [ -f "$backend_dir/.env.example" ] && [ ! -f "$backend_dir/.env" ]; then
                    cp "$backend_dir/.env.example" "$backend_dir/.env"
                    log_message "INFO" "Created backend .env for $component"
                fi
            fi
        fi
    done
    
    log_message "SUCCESS" "Environment setup completed"
}

# ============================================================================
# VALIDATION ENGINE
# ============================================================================

validate_installation() {
    if [ "${INSTALL_CONFIG[skip_validation]}" = "true" ]; then
        log_message "INFO" "Skipping validation as requested"
        return 0
    fi
    
    print_step "Validating installation..."
    
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    local components="${INSTALL_CONFIG[components]}"
    local validation_errors=0
    
    # Check installation marker
    if [ ! -f "$target_dir/.anarqq-installation" ]; then
        log_message "ERROR" "Installation marker not found"
        validation_errors=$((validation_errors + 1))
    fi
    
    # Validate each component
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        
        print_substep "Validating $component..."
        
        if ! validate_component_installation "$component" "$target_dir"; then
            log_message "ERROR" "Validation failed for component: $component"
            validation_errors=$((validation_errors + 1))
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        log_message "SUCCESS" "Installation validation passed"
        return 0
    else
        log_message "ERROR" "Installation validation failed with $validation_errors errors"
        return 1
    fi
}

validate_component_installation() {
    local component="$1"
    local target_dir="$2"
    local component_dir="$target_dir/$component"
    
    # Skip validation for non-directory components
    if [[ "$component" == "backend" || "$component" == "frontend" || "$component" == "dev-tools" ]]; then
        return 0
    fi
    
    # Check if component directory exists
    if [ ! -d "$component_dir" ]; then
        log_message "ERROR" "Component directory not found: $component_dir"
        return 1
    fi
    
    # Check for package.json if it's a Node.js component
    if [ -f "$component_dir/package.json" ]; then
        # Check if node_modules exists
        if [ ! -d "$component_dir/node_modules" ]; then
            log_message "ERROR" "Dependencies not installed for $component"
            return 1
        fi
    fi
    
    log_message "DEBUG" "Component $component validation passed"
    return 0
}

generate_health_report() {
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    local report_file="$target_dir/installation-health-report.json"
    
    log_message "INFO" "Generating installation health report..."
    
    cat > "$report_file" << EOF
{
  "installation": {
    "date": "$(date -Iseconds)",
    "version": "$INSTALLER_VERSION",
    "mode": "${INSTALL_CONFIG[mode]}",
    "components": "${INSTALL_CONFIG[components]}",
    "target_directory": "$target_dir"
  },
  "system": {
    "os": "${SYSTEM_CAPS[os]}",
    "package_manager": "${SYSTEM_CAPS[package_manager]}",
    "shell": "${SYSTEM_CAPS[shell]}",
    "has_docker": ${SYSTEM_CAPS[has_docker]},
    "has_git": ${SYSTEM_CAPS[has_git]},
    "has_node": ${SYSTEM_CAPS[has_node]},
    "node_version": "${SYSTEM_CAPS[node_version]}"
  },
  "validation": {
    "status": "completed",
    "timestamp": "$(date -Iseconds)"
  }
}
EOF
    
    log_message "SUCCESS" "Health report generated: $report_file"
}

# ============================================================================
# ERROR HANDLING AND CLEANUP
# ============================================================================

log_error() {
    local error_type="$1"
    local error_message="$2"
    local context="${3:-}"
    
    ERROR_CONTEXT["last_error"]="$error_message"
    
    log_message "ERROR" "[$error_type] $error_message" "$context"
    
    if [ -n "$context" ]; then
        log_message "ERROR" "Error Context: Step=${ERROR_CONTEXT[step]}, Component=${ERROR_CONTEXT[component]}, Method=${ERROR_CONTEXT[method]}, Attempt=${ERROR_CONTEXT[attempt]}"
    fi
}

cleanup_on_error() {
    local exit_code=${1:-1}
    
    if [ "${INSTALL_CONFIG[cleanup_on_error]}" = "true" ]; then
        log_message "WARN" "Cleaning up partial installation..."
        
        local target_dir="${INSTALL_CONFIG[target_dir]}"
        if [ -d "$target_dir" ] && [ -f "$target_dir/.anarqq-installation" ]; then
            rm -rf "$target_dir"
            log_message "INFO" "Partial installation cleaned up"
        fi
        
        # Clean temporary files
        rm -rf /tmp/anarqq-* 2>/dev/null || true
    fi
    
    log_message "ERROR" "Installation failed with exit code $exit_code"
    exit $exit_code
}

# ============================================================================
# USER INTERFACE AND PROGRESS
# ============================================================================

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            AnarQ&Q Ecosystem Unified Installer v4.0          ║"
    echo "║                                                               ║"
    echo "║           Sistema de Instalación Unificado                   ║"
    echo "║                     AnarQ&Q Avanzado                         ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

display_summary() {
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    echo ""
    print_success "🎉 Installation completed successfully!"
    echo ""
    print_info "📍 Installation Details:"
    print_info "   Location: $target_dir"
    print_info "   Mode: ${INSTALL_CONFIG[mode]}"
    print_info "   Components: ${INSTALL_CONFIG[components]}"
    print_info "   Log file: $LOG_FILE"
    echo ""
    print_info "🚀 Quick Start Options:"
    
    if [[ "${INSTALL_CONFIG[components]}" == *"demo"* ]]; then
        print_info "   Demo: cd $target_dir/demo && npm run dev"
    fi
    
    if [[ "${INSTALL_CONFIG[components]}" == *"backend"* ]]; then
        print_info "   Backend: cd $target_dir/core/backend && npm start"
    fi
    
    echo ""
    print_info "📚 Documentation: $target_dir/README.md"
    print_info "🔧 Health Report: $target_dir/installation-health-report.json"
}

show_next_steps() {
    echo ""
    print_step "Next Steps"
    echo ""
    print_info "1. Review the installation health report"
    print_info "2. Read the documentation in your installation directory"
    print_info "3. Start with the demo to explore the ecosystem"
    print_info "4. Join our community for support and updates"
    echo ""
    print_info "Support: anarqorp@proton.me"
    print_info "Documentation: https://github.com/AnarQorp/anarqq-ecosystem-demo"
}

# ============================================================================
# MAIN EXECUTION FLOW
# ============================================================================

main() {
    # Initialize logging
    log_message "INFO" "Starting $INSTALLER_NAME v$INSTALLER_VERSION"
    
    # Print header
    print_header
    
    # Show introduction
    print_info "This unified installer will:"
    echo "  • Detect your system capabilities automatically"
    echo "  • Install missing dependencies with multiple fallback methods"
    echo "  • Download repositories using robust download engine"
    echo "  • Configure components with proper environment setup"
    echo "  • Validate installation with comprehensive testing"
    echo "  • Provide detailed logging and error reporting"
    echo ""
    
    # Confirm installation
    local response=$(prompt_user "Continue with installation?" "y" "Y/n")
    if [[ "$response" =~ ^[Nn]$ ]]; then
        log_message "INFO" "Installation cancelled by user"
        exit 0
    fi
    
    echo ""
    
    # Step 1: Initialize system
    print_step "Step 1/8: Initializing system..."
    initialize_system_info
    source_modules
    
    # Step 2: Check dependencies
    print_step "Step 2/8: Checking dependencies..."
    if ! check_dependencies; then
        log_error "DEPENDENCY_CHECK" "Failed to satisfy system dependencies"
        cleanup_on_error 1
    fi
    
    # Step 3: Configure installation
    print_step "Step 3/8: Configuring installation..."
    
    # Try to load existing configuration
    if ! load_configuration "./anarqq-install-config.sh"; then
        # Interactive configuration
        select_installation_mode
        INSTALL_CONFIG["components"]=$(get_components_for_mode "${INSTALL_CONFIG[mode]}")
    fi
    
    # Step 4: Create installation directory
    print_step "Step 4/8: Creating installation directory..."
    create_install_directory
    
    # Step 5: Install repositories
    print_step "Step 5/8: Installing repositories..."
    if ! install_repositories; then
        log_error "REPOSITORY_INSTALL" "Failed to install repositories"
        cleanup_on_error 1
    fi
    
    # Step 6: Install dependencies
    print_step "Step 6/8: Installing component dependencies..."
    if ! install_dependencies; then
        log_error "DEPENDENCY_INSTALL" "Failed to install component dependencies"
        cleanup_on_error 1
    fi
    
    # Step 7: Setup environment
    print_step "Step 7/8: Setting up environment..."
    setup_environment
    
    # Step 8: Validate installation
    print_step "Step 8/8: Validating installation..."
    if ! validate_installation; then
        log_error "VALIDATION" "Installation validation failed"
        
        local response=$(prompt_user "Continue despite validation errors?" "n" "y/N")
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            cleanup_on_error 1
        fi
    fi
    
    # Generate health report
    generate_health_report
    
    # Save final configuration
    save_configuration "${INSTALL_CONFIG[target_dir]}/anarqq-install-config.sh"
    
    # Display summary
    display_summary
    show_next_steps
    
    log_message "SUCCESS" "Installation completed successfully"
}

# ============================================================================
# ERROR HANDLING AND CLEANUP SETUP
# ============================================================================

# Set up error handling
trap 'log_error "UNEXPECTED" "Unexpected error occurred"; cleanup_on_error 1' ERR
trap 'log_message "INFO" "Installation interrupted by user"; cleanup_on_error 130' INT TERM

# ============================================================================
# ENTRY POINT
# ============================================================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode=*)
            INSTALL_CONFIG["mode"]="${1#*=}"
            shift
            ;;
        --target-dir=*)
            INSTALL_CONFIG["target_dir"]="${1#*=}"
            shift
            ;;
        --verbose)
            INSTALL_CONFIG["verbose"]="true"
            shift
            ;;
        --non-interactive)
            INSTALL_CONFIG["interactive"]="false"
            shift
            ;;
        --skip-validation)
            INSTALL_CONFIG["skip_validation"]="true"
            shift
            ;;
        --no-cleanup)
            INSTALL_CONFIG["cleanup_on_error"]="false"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --mode=MODE              Installation mode (minimal|full|development)"
            echo "  --target-dir=DIR         Installation directory"
            echo "  --verbose                Enable verbose output"
            echo "  --non-interactive        Run without user prompts"
            echo "  --skip-validation        Skip post-installation validation"
            echo "  --no-cleanup             Don't cleanup on error"
            echo "  --help                   Show this help message"
            echo ""
            exit 0
            ;;
        *)
            log_message "WARN" "Unknown option: $1"
            shift
            ;;
    esac
done

# Execute main function
main "$@"
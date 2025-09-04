#!/bin/bash

# AnarQ&Q Ecosystem - Dependency Detection and Installation System
# Robust dependency management with cross-platform support
# Version: 1.0.0

set -e

# Color definitions for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global configuration
DEPENDENCY_LOG_FILE="./anarqq-dependency-$(date +%Y%m%d-%H%M%S).log"
VERBOSE_MODE=false
AUTO_INSTALL_MODE=false

# System information
OS_TYPE=""
PACKAGE_MANAGER=""
SHELL_TYPE=""
ARCH_TYPE=""

# Dependency definitions with metadata
declare -A DEPENDENCIES=(
    ["unzip"]="Archive extraction utility|critical|unzip|unzip|unzip|unzip"
    ["curl"]="HTTP client for downloads|critical|curl|curl|curl|curl"
    ["wget"]="Alternative HTTP client|optional|wget|wget|wget|wget"
    ["git"]="Version control system|critical|git|git|git|git"
    ["node"]="Node.js runtime|critical|nodejs|nodejs|node|node"
    ["npm"]="Node package manager|critical|npm|npm|npm|npm"
    ["docker"]="Container platform|optional|docker.io|docker|docker|docker"
    ["python3"]="Python interpreter|optional|python3|python3|python3|python3"
)

# Utility functions for output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    [ "$VERBOSE_MODE" = true ] && [ -n "$DEPENDENCY_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') INFO: $1" >> "$DEPENDENCY_LOG_FILE" 2>/dev/null || true
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    [ "$VERBOSE_MODE" = true ] && [ -n "$DEPENDENCY_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') SUCCESS: $1" >> "$DEPENDENCY_LOG_FILE" 2>/dev/null || true
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    [ -n "$DEPENDENCY_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') WARNING: $1" >> "$DEPENDENCY_LOG_FILE" 2>/dev/null || true
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    [ -n "$DEPENDENCY_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: $1" >> "$DEPENDENCY_LOG_FILE" 2>/dev/null || true
}

print_substep() {
    echo -e "   ${BLUE}→ $1${NC}"
    [ "$VERBOSE_MODE" = true ] && [ -n "$DEPENDENCY_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') SUBSTEP: $1" >> "$DEPENDENCY_LOG_FILE" 2>/dev/null || true
}

# Core utility function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# System detection functions
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            case $ID in
                ubuntu|debian)
                    echo "debian"
                    ;;
                centos|rhel|fedora)
                    echo "redhat"
                    ;;
                arch)
                    echo "arch"
                    ;;
                *)
                    echo "linux"
                    ;;
            esac
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

detect_package_manager() {
    local os_type="$1"
    
    case $os_type in
        debian)
            if command_exists apt-get; then
                echo "apt"
            elif command_exists apt; then
                echo "apt"
            else
                echo "manual"
            fi
            ;;
        redhat)
            if command_exists dnf; then
                echo "dnf"
            elif command_exists yum; then
                echo "yum"
            else
                echo "manual"
            fi
            ;;
        arch)
            if command_exists pacman; then
                echo "pacman"
            else
                echo "manual"
            fi
            ;;
        macos)
            if command_exists brew; then
                echo "brew"
            else
                echo "manual"
            fi
            ;;
        windows)
            if command_exists choco; then
                echo "choco"
            elif command_exists winget; then
                echo "winget"
            else
                echo "manual"
            fi
            ;;
        *)
            echo "manual"
            ;;
    esac
}

detect_shell() {
    if [ -n "$BASH_VERSION" ]; then
        echo "bash"
    elif [ -n "$ZSH_VERSION" ]; then
        echo "zsh"
    elif [ -n "$FISH_VERSION" ]; then
        echo "fish"
    else
        echo "unknown"
    fi
}

detect_architecture() {
    local arch=$(uname -m)
    case $arch in
        x86_64|amd64)
            echo "x64"
            ;;
        i386|i686)
            echo "x86"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        armv7l)
            echo "arm"
            ;;
        *)
            echo "$arch"
            ;;
    esac
}

# Initialize system detection
initialize_system_info() {
    print_info "Detecting system configuration..."
    
    OS_TYPE=$(detect_os)
    PACKAGE_MANAGER=$(detect_package_manager "$OS_TYPE")
    SHELL_TYPE=$(detect_shell)
    ARCH_TYPE=$(detect_architecture)
    
    print_substep "Operating System: $OS_TYPE"
    print_substep "Package Manager: $PACKAGE_MANAGER"
    print_substep "Shell: $SHELL_TYPE"
    print_substep "Architecture: $ARCH_TYPE"
    
    # Log system info (with error handling)
    if [ -n "$DEPENDENCY_LOG_FILE" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') SYSTEM_INFO: OS=$OS_TYPE PKG=$PACKAGE_MANAGER SHELL=$SHELL_TYPE ARCH=$ARCH_TYPE" >> "$DEPENDENCY_LOG_FILE" 2>/dev/null || true
    fi
}

# Check if a specific dependency is installed
check_dependency() {
    local dep_name="$1"
    local dep_info="${DEPENDENCIES[$dep_name]}"
    
    if [ -z "$dep_info" ]; then
        print_error "Unknown dependency: $dep_name"
        return 1
    fi
    
    IFS='|' read -r description priority apt_pkg yum_pkg brew_pkg choco_pkg <<< "$dep_info"
    
    if command_exists "$dep_name"; then
        # Get version information if available
        local version=""
        case $dep_name in
            git)
                version=$(git --version 2>/dev/null | head -1)
                ;;
            node)
                version=$(node --version 2>/dev/null)
                ;;
            npm)
                version=$(npm --version 2>/dev/null)
                ;;
            docker)
                version=$(docker --version 2>/dev/null | head -1)
                ;;
            python3)
                version=$(python3 --version 2>/dev/null)
                ;;
            *)
                version="installed"
                ;;
        esac
        
        print_substep "$dep_name is available: $version"
        return 0
    else
        print_warning "$dep_name is not installed"
        return 1
    fi
}

# Validate Node.js version requirements
validate_node_version() {
    if ! command_exists node; then
        return 1
    fi
    
    local node_version=$(node --version 2>/dev/null | sed 's/v//')
    local major_version=$(echo "$node_version" | cut -d'.' -f1)
    
    if [ "$major_version" -ge 18 ]; then
        print_substep "Node.js version $node_version is compatible (≥18)"
        return 0
    else
        print_error "Node.js version $node_version is not compatible (requires ≥18)"
        return 1
    fi
}

# Install dependency using appropriate package manager
install_dependency() {
    local dep_name="$1"
    local dep_info="${DEPENDENCIES[$dep_name]}"
    
    if [ -z "$dep_info" ]; then
        print_error "Unknown dependency: $dep_name"
        return 1
    fi
    
    IFS='|' read -r description priority apt_pkg yum_pkg brew_pkg choco_pkg <<< "$dep_info"
    
    print_substep "Installing $dep_name ($description)..."
    
    local install_cmd=""
    local pkg_name=""
    
    case $PACKAGE_MANAGER in
        apt)
            pkg_name="$apt_pkg"
            install_cmd="sudo apt-get update && sudo apt-get install -y $pkg_name"
            ;;
        yum)
            pkg_name="$yum_pkg"
            install_cmd="sudo yum install -y $pkg_name"
            ;;
        dnf)
            pkg_name="$yum_pkg"
            install_cmd="sudo dnf install -y $pkg_name"
            ;;
        brew)
            pkg_name="$brew_pkg"
            install_cmd="brew install $pkg_name"
            ;;
        pacman)
            pkg_name="$apt_pkg"  # Use apt package name as fallback
            install_cmd="sudo pacman -S --noconfirm $pkg_name"
            ;;
        choco)
            pkg_name="$choco_pkg"
            install_cmd="choco install -y $pkg_name"
            ;;
        winget)
            pkg_name="$choco_pkg"  # Use choco package name as fallback
            install_cmd="winget install $pkg_name"
            ;;
        *)
            print_error "No compatible package manager found for automatic installation"
            return 1
            ;;
    esac
    
    print_substep "Executing: $install_cmd"
    
    if eval "$install_cmd" >> "$DEPENDENCY_LOG_FILE" 2>&1; then
        print_success "$dep_name installed successfully"
        return 0
    else
        print_error "Failed to install $dep_name"
        return 1
    fi
}

# Provide manual installation instructions
provide_manual_instructions() {
    local dep_name="$1"
    local dep_info="${DEPENDENCIES[$dep_name]}"
    
    if [ -z "$dep_info" ]; then
        print_error "Unknown dependency: $dep_name"
        return 1
    fi
    
    IFS='|' read -r description priority apt_pkg yum_pkg brew_pkg choco_pkg <<< "$dep_info"
    
    print_info "Manual installation instructions for $dep_name:"
    
    case $OS_TYPE in
        debian)
            echo "  Ubuntu/Debian: sudo apt-get install $apt_pkg"
            ;;
        redhat)
            echo "  RHEL/CentOS/Fedora: sudo yum install $yum_pkg"
            echo "  Or with dnf: sudo dnf install $yum_pkg"
            ;;
        arch)
            echo "  Arch Linux: sudo pacman -S $apt_pkg"
            ;;
        macos)
            echo "  macOS with Homebrew: brew install $brew_pkg"
            echo "  Or download from official website"
            ;;
        windows)
            echo "  Windows with Chocolatey: choco install $choco_pkg"
            echo "  Windows with winget: winget install $choco_pkg"
            echo "  Or download from official website"
            ;;
        *)
            echo "  Please install $dep_name manually from the official website"
            ;;
    esac
    
    # Special instructions for specific dependencies
    case $dep_name in
        node)
            echo ""
            echo "  Alternative installation methods:"
            echo "  • Node Version Manager (nvm):"
            echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
            echo "    nvm install --lts"
            echo "  • Official website: https://nodejs.org/"
            ;;
        docker)
            echo ""
            echo "  Docker installation:"
            echo "  • Official installation guide: https://docs.docker.com/get-docker/"
            echo "  • Linux: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
            ;;
        git)
            echo ""
            echo "  Git installation:"
            echo "  • Official website: https://git-scm.com/downloads"
            ;;
    esac
}

# Check all dependencies and return status
check_all_dependencies() {
    print_info "Checking system dependencies..."
    
    local critical_missing=()
    local optional_missing=()
    local all_good=true
    
    for dep_name in "${!DEPENDENCIES[@]}"; do
        local dep_info="${DEPENDENCIES[$dep_name]}"
        IFS='|' read -r description priority apt_pkg yum_pkg brew_pkg choco_pkg <<< "$dep_info"
        
        if ! check_dependency "$dep_name"; then
            if [ "$priority" = "critical" ]; then
                critical_missing+=("$dep_name")
                all_good=false
            else
                optional_missing+=("$dep_name")
            fi
        fi
    done
    
    # Special validation for Node.js version
    if command_exists node && ! validate_node_version; then
        critical_missing+=("node")
        all_good=false
    fi
    
    # Report missing dependencies
    if [ ${#critical_missing[@]} -gt 0 ]; then
        print_error "Critical dependencies missing: ${critical_missing[*]}"
    fi
    
    if [ ${#optional_missing[@]} -gt 0 ]; then
        print_warning "Optional dependencies missing: ${optional_missing[*]}"
    fi
    
    if [ "$all_good" = true ]; then
        print_success "All critical dependencies are satisfied"
        return 0
    else
        return 1
    fi
}

# Install missing dependencies with user confirmation
install_missing_dependencies() {
    local auto_install="$1"
    
    print_info "Installing missing dependencies..."
    
    local critical_missing=()
    local optional_missing=()
    
    # Identify missing dependencies
    for dep_name in "${!DEPENDENCIES[@]}"; do
        local dep_info="${DEPENDENCIES[$dep_name]}"
        IFS='|' read -r description priority apt_pkg yum_pkg brew_pkg choco_pkg <<< "$dep_info"
        
        if ! check_dependency "$dep_name"; then
            if [ "$priority" = "critical" ]; then
                critical_missing+=("$dep_name")
            else
                optional_missing+=("$dep_name")
            fi
        fi
    done
    
    # Handle Node.js version validation
    if command_exists node && ! validate_node_version; then
        critical_missing+=("node")
    fi
    
    # Install critical dependencies
    local install_success=true
    for dep_name in "${critical_missing[@]}"; do
        if [ "$auto_install" = true ] || [ "$AUTO_INSTALL_MODE" = true ]; then
            if install_dependency "$dep_name"; then
                print_success "$dep_name installed successfully"
            else
                print_error "Failed to install $dep_name"
                provide_manual_instructions "$dep_name"
                install_success=false
            fi
        else
            print_info "Skipping automatic installation of $dep_name"
            provide_manual_instructions "$dep_name"
            install_success=false
        fi
    done
    
    # Handle optional dependencies
    if [ ${#optional_missing[@]} -gt 0 ]; then
        if [ "$auto_install" = true ] || [ "$AUTO_INSTALL_MODE" = true ]; then
            print_info "Installing optional dependencies..."
            for dep_name in "${optional_missing[@]}"; do
                if install_dependency "$dep_name"; then
                    print_success "Optional dependency $dep_name installed"
                else
                    print_warning "Failed to install optional dependency $dep_name"
                    provide_manual_instructions "$dep_name"
                fi
            done
        else
            print_info "Optional dependencies available for installation: ${optional_missing[*]}"
        fi
    fi
    
    return $([ "$install_success" = true ] && echo 0 || echo 1)
}

# Interactive dependency management
interactive_dependency_check() {
    print_info "Starting interactive dependency check..."
    
    # Ask user about automatic installation
    if [ "$AUTO_INSTALL_MODE" != true ]; then
        echo ""
        read -p "Enable automatic installation of missing dependencies? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            AUTO_INSTALL_MODE=true
            print_info "Automatic installation enabled"
        else
            print_info "Manual installation mode - will provide instructions only"
        fi
        echo ""
    fi
    
    # Check current status
    if check_all_dependencies; then
        print_success "All dependencies are satisfied!"
        return 0
    fi
    
    # Install missing dependencies
    if install_missing_dependencies "$AUTO_INSTALL_MODE"; then
        print_success "Dependency installation completed successfully"
        
        # Re-check after installation
        echo ""
        print_info "Re-checking dependencies after installation..."
        if check_all_dependencies; then
            print_success "All critical dependencies are now satisfied!"
            return 0
        else
            print_error "Some dependencies still missing after installation"
            return 1
        fi
    else
        print_error "Dependency installation failed"
        return 1
    fi
}

# Generate dependency report
generate_dependency_report() {
    local report_file="$1"
    
    if [ -z "$report_file" ]; then
        report_file="/tmp/anarqq-dependency-report-$(date +%Y%m%d-%H%M%S).json"
    fi
    
    print_info "Generating dependency report: $report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "system": {
    "os": "$OS_TYPE",
    "package_manager": "$PACKAGE_MANAGER",
    "shell": "$SHELL_TYPE",
    "architecture": "$ARCH_TYPE"
  },
  "dependencies": {
EOF
    
    local first=true
    for dep_name in "${!DEPENDENCIES[@]}"; do
        local dep_info="${DEPENDENCIES[$dep_name]}"
        IFS='|' read -r description priority apt_pkg yum_pkg brew_pkg choco_pkg <<< "$dep_info"
        
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        
        local status="missing"
        local version="null"
        
        if command_exists "$dep_name"; then
            status="installed"
            case $dep_name in
                git)
                    version="\"$(git --version 2>/dev/null | head -1 | sed 's/git version //')\""
                    ;;
                node)
                    version="\"$(node --version 2>/dev/null)\""
                    if ! validate_node_version; then
                        status="incompatible"
                    fi
                    ;;
                npm)
                    version="\"$(npm --version 2>/dev/null)\""
                    ;;
                docker)
                    version="\"$(docker --version 2>/dev/null | head -1 | sed 's/Docker version //' | cut -d',' -f1)\""
                    ;;
                python3)
                    version="\"$(python3 --version 2>/dev/null | sed 's/Python //')\""
                    ;;
                *)
                    version="\"available\""
                    ;;
            esac
        fi
        
        cat >> "$report_file" << EOF
    "$dep_name": {
      "description": "$description",
      "priority": "$priority",
      "status": "$status",
      "version": $version
    }
EOF
    done
    
    cat >> "$report_file" << EOF
  }
}
EOF
    
    print_success "Dependency report generated: $report_file"
}

# Main function for dependency management
main_dependency_check() {
    local mode="${1:-interactive}"
    local report_file="$2"
    
    # Initialize logging
    echo "$(date '+%Y-%m-%d %H:%M:%S') Starting dependency check - Mode: $mode" > "$DEPENDENCY_LOG_FILE"
    
    # Initialize system detection
    initialize_system_info
    
    case $mode in
        interactive)
            interactive_dependency_check
            ;;
        check)
            check_all_dependencies
            ;;
        install)
            AUTO_INSTALL_MODE=true
            install_missing_dependencies true
            ;;
        report)
            generate_dependency_report "$report_file"
            ;;
        *)
            print_error "Unknown mode: $mode"
            print_info "Available modes: interactive, check, install, report"
            return 1
            ;;
    esac
}

# Command line interface
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE_MODE=true
                shift
                ;;
            -a|--auto)
                AUTO_INSTALL_MODE=true
                shift
                ;;
            -m|--mode)
                MODE="$2"
                shift 2
                ;;
            -r|--report)
                REPORT_FILE="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -v, --verbose     Enable verbose logging"
                echo "  -a, --auto        Enable automatic installation"
                echo "  -m, --mode MODE   Set mode (interactive|check|install|report)"
                echo "  -r, --report FILE Generate report to file"
                echo "  -h, --help        Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run main function
    main_dependency_check "${MODE:-interactive}" "$REPORT_FILE"
fi
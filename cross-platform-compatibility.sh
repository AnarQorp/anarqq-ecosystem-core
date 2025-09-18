#!/bin/bash

# AnarQ&Q Ecosystem - Cross-Platform Compatibility Layer
# Provides unified interface for cross-platform operations
# Version: 1.0.0
# Requirements: 4.1, 4.2, 4.3, 4.4

# =============================================================================
# GLOBAL VARIABLES
# =============================================================================

# Platform detection results
PLATFORM_OS=""
PLATFORM_ARCH=""
PLATFORM_DISTRO=""
PLATFORM_VERSION=""
PLATFORM_SHELL=""
PLATFORM_PKG_MANAGER=""
PLATFORM_PATH_SEP="/"
PLATFORM_IS_WSL=false
PLATFORM_IS_CONTAINER=false

# Supported package managers with their commands
declare -A PKG_MANAGERS=(
    ["apt"]="apt-get"
    ["yum"]="yum"
    ["dnf"]="dnf"
    ["brew"]="brew"
    ["pacman"]="pacman"
    ["zypper"]="zypper"
    ["apk"]="apk"
    ["choco"]="choco"
    ["winget"]="winget"
    ["pkg"]="pkg"
    ["portage"]="emerge"
)

# Package name mappings across different package managers
declare -A PKG_MAPPINGS_CURL=(
    ["apt"]="curl"
    ["yum"]="curl"
    ["dnf"]="curl"
    ["brew"]="curl"
    ["pacman"]="curl"
    ["zypper"]="curl"
    ["apk"]="curl"
    ["choco"]="curl"
    ["winget"]="curl"
    ["pkg"]="curl"
    ["portage"]="net-misc/curl"
)

declare -A PKG_MAPPINGS_WGET=(
    ["apt"]="wget"
    ["yum"]="wget"
    ["dnf"]="wget"
    ["brew"]="wget"
    ["pacman"]="wget"
    ["zypper"]="wget"
    ["apk"]="wget"
    ["choco"]="wget"
    ["winget"]="wget"
    ["pkg"]="wget"
    ["portage"]="net-misc/wget"
)

declare -A PKG_MAPPINGS_GIT=(
    ["apt"]="git"
    ["yum"]="git"
    ["dnf"]="git"
    ["brew"]="git"
    ["pacman"]="git"
    ["zypper"]="git"
    ["apk"]="git"
    ["choco"]="git"
    ["winget"]="Git.Git"
    ["pkg"]="git"
    ["portage"]="dev-vcs/git"
)

declare -A PKG_MAPPINGS_UNZIP=(
    ["apt"]="unzip"
    ["yum"]="unzip"
    ["dnf"]="unzip"
    ["brew"]="unzip"
    ["pacman"]="unzip"
    ["zypper"]="unzip"
    ["apk"]="unzip"
    ["choco"]="unzip"
    ["winget"]="unzip"
    ["pkg"]="unzip"
    ["portage"]="app-arch/unzip"
)

declare -A PKG_MAPPINGS_NODE=(
    ["apt"]="nodejs"
    ["yum"]="nodejs npm"
    ["dnf"]="nodejs npm"
    ["brew"]="node"
    ["pacman"]="nodejs npm"
    ["zypper"]="nodejs18"
    ["apk"]="nodejs npm"
    ["choco"]="nodejs"
    ["winget"]="OpenJS.NodeJS"
    ["pkg"]="node"
    ["portage"]="net-libs/nodejs"
)

# =============================================================================
# CORE DETECTION FUNCTIONS
# =============================================================================

# Detect operating system with detailed information
# Requirements: 4.1 - Add operating system detection (Linux, macOS, Windows WSL)
detect_operating_system() {
    local os_name=""
    local os_version=""
    local distro=""
    local arch=""
    
    # Get architecture
    arch=$(uname -m 2>/dev/null || echo "unknown")
    
    # Detect WSL (Windows Subsystem for Linux)
    if [[ -n "${WSL_DISTRO_NAME:-}" ]] || [[ -n "${WSL_INTEROP:-}" ]] || [[ "$(uname -r)" == *microsoft* ]] || [[ "$(uname -r)" == *Microsoft* ]]; then
        PLATFORM_IS_WSL=true
        os_name="WSL"
        
        # Get WSL distribution info
        if [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
            distro="$WSL_DISTRO_NAME"
        elif [[ -f /etc/os-release ]]; then
            distro=$(grep '^NAME=' /etc/os-release | cut -d'"' -f2 | cut -d' ' -f1)
        fi
        
        # Get version from /etc/os-release if available
        if [[ -f /etc/os-release ]]; then
            os_version=$(grep '^VERSION_ID=' /etc/os-release | cut -d'"' -f2)
        fi
    else
        # Standard OS detection
        case "$(uname -s)" in
            Linux*)
                os_name="Linux"
                
                # Detect Linux distribution
                if [[ -f /etc/os-release ]]; then
                    distro=$(grep '^ID=' /etc/os-release | cut -d'=' -f2 | tr -d '"')
                    os_version=$(grep '^VERSION_ID=' /etc/os-release | cut -d'=' -f2 | tr -d '"')
                elif [[ -f /etc/redhat-release ]]; then
                    distro="rhel"
                    os_version=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+')
                elif [[ -f /etc/debian_version ]]; then
                    distro="debian"
                    os_version=$(cat /etc/debian_version)
                elif [[ -f /etc/arch-release ]]; then
                    distro="arch"
                    os_version="rolling"
                else
                    distro="unknown"
                fi
                ;;
            Darwin*)
                os_name="macOS"
                os_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
                distro="macos"
                ;;
            CYGWIN*|MINGW*|MSYS*)
                os_name="Windows"
                distro="windows"
                # Try to get Windows version
                if command -v cmd.exe >/dev/null 2>&1; then
                    os_version=$(cmd.exe /c ver 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
                fi
                ;;
            FreeBSD*)
                os_name="FreeBSD"
                distro="freebsd"
                os_version=$(uname -r | cut -d'-' -f1)
                ;;
            OpenBSD*)
                os_name="OpenBSD"
                distro="openbsd"
                os_version=$(uname -r)
                ;;
            NetBSD*)
                os_name="NetBSD"
                distro="netbsd"
                os_version=$(uname -r)
                ;;
            *)
                os_name="Unknown"
                distro="unknown"
                os_version="unknown"
                ;;
        esac
    fi
    
    # Check if running in container
    if [[ -f /.dockerenv ]] || [[ -n "${container:-}" ]] || grep -q 'docker\|lxc' /proc/1/cgroup 2>/dev/null; then
        PLATFORM_IS_CONTAINER=true
    fi
    
    # Set global variables
    PLATFORM_OS="$os_name"
    PLATFORM_ARCH="$arch"
    PLATFORM_DISTRO="$distro"
    PLATFORM_VERSION="$os_version"
    
    return 0
}

# Detect current shell with compatibility information
# Requirements: 4.4 - Ensure shell compatibility across bash, zsh, and other shells
detect_shell_environment() {
    local shell_name=""
    local shell_version=""
    local shell_path=""
    
    # Get shell from various sources
    if [[ -n "${BASH_VERSION:-}" ]]; then
        shell_name="bash"
        shell_version="$BASH_VERSION"
        shell_path="$BASH"
    elif [[ -n "${ZSH_VERSION:-}" ]]; then
        shell_name="zsh"
        shell_version="$ZSH_VERSION"
        shell_path="$SHELL"
    elif [[ -n "${KSH_VERSION:-}" ]]; then
        shell_name="ksh"
        shell_version="$KSH_VERSION"
        shell_path="$SHELL"
    elif [[ -n "${SHELL:-}" ]]; then
        shell_path="$SHELL"
        shell_name=$(basename "$SHELL")
        
        # Try to get version for known shells
        case "$shell_name" in
            bash)
                shell_version=$("$SHELL" --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
                ;;
            zsh)
                shell_version=$("$SHELL" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
                ;;
            *)
                shell_version="unknown"
                ;;
        esac
    else
        shell_name="unknown"
        shell_version="unknown"
        shell_path="/bin/sh"
    fi
    
    PLATFORM_SHELL="$shell_name"
    
    return 0
}

# Detect available package managers with priority ordering
# Requirements: 4.2 - Implement package manager detection and adaptation
detect_package_managers() {
    local detected_managers=()
    local primary_manager=""
    
    # Check each package manager in priority order
    local priority_order=()
    
    case "$PLATFORM_DISTRO" in
        ubuntu|debian|mint|elementary|pop)
            priority_order=("apt" "brew" "snap")
            ;;
        fedora|centos|rhel|rocky|alma)
            if command -v dnf >/dev/null 2>&1; then
                priority_order=("dnf" "yum" "brew")
            else
                priority_order=("yum" "dnf" "brew")
            fi
            ;;
        arch|manjaro|endeavour)
            priority_order=("pacman" "yay" "paru" "brew")
            ;;
        opensuse|suse)
            priority_order=("zypper" "brew")
            ;;
        alpine)
            priority_order=("apk" "brew")
            ;;
        gentoo)
            priority_order=("portage" "brew")
            ;;
        macos)
            priority_order=("brew" "port" "fink")
            ;;
        freebsd|openbsd|netbsd)
            priority_order=("pkg" "ports" "brew")
            ;;
        windows)
            priority_order=("choco" "winget" "scoop")
            ;;
        *)
            # Generic order for unknown distributions
            priority_order=("apt" "yum" "dnf" "pacman" "zypper" "apk" "brew" "pkg" "choco" "winget")
            ;;
    esac
    
    # Check availability of package managers in priority order
    for manager in "${priority_order[@]}"; do
        local cmd="${PKG_MANAGERS[$manager]:-$manager}"
        
        if command -v "$cmd" >/dev/null 2>&1; then
            detected_managers+=("$manager")
            if [[ -z "$primary_manager" ]]; then
                primary_manager="$manager"
            fi
        fi
    done
    
    # Set primary package manager
    PLATFORM_PKG_MANAGER="$primary_manager"
    
    return 0
}

# Initialize cross-platform compatibility layer
# This function must be called before using other compatibility functions
initialize_platform_compatibility() {
    # Detect operating system
    detect_operating_system
    
    # Detect shell environment
    detect_shell_environment
    
    # Detect package managers
    detect_package_managers
    
    # Set path separator based on OS
    case "$PLATFORM_OS" in
        Windows)
            PLATFORM_PATH_SEP="\\"
            ;;
        *)
            PLATFORM_PATH_SEP="/"
            ;;
    esac
    
    return 0
}

# =============================================================================
# PATH AND FILE SYSTEM FUNCTIONS
# =============================================================================

# Convert path to platform-specific format
# Requirements: 4.3 - Handle different path separators and permission models
normalize_path() {
    local input_path="$1"
    local normalized_path=""
    
    case "$PLATFORM_OS" in
        Windows)
            # Convert forward slashes to backslashes for Windows
            normalized_path=$(echo "$input_path" | sed 's|/|\\|g')
            ;;
        *)
            # Convert backslashes to forward slashes for Unix-like systems
            normalized_path=$(echo "$input_path" | sed 's|\\|/|g')
            ;;
    esac
    
    echo "$normalized_path"
}

# Join path components using platform-appropriate separator
join_path() {
    local result=""
    local first=true
    
    for component in "$@"; do
        if [[ "$first" == true ]]; then
            result="$component"
            first=false
        else
            result="${result}${PLATFORM_PATH_SEP}${component}"
        fi
    done
    
    normalize_path "$result"
}

# Get platform-appropriate temporary directory
get_temp_directory() {
    local temp_dir=""
    
    if [[ -n "${TMPDIR:-}" ]]; then
        temp_dir="$TMPDIR"
    elif [[ -n "${TMP:-}" ]]; then
        temp_dir="$TMP"
    elif [[ -n "${TEMP:-}" ]]; then
        temp_dir="$TEMP"
    elif [[ -d "/tmp" ]]; then
        temp_dir="/tmp"
    elif [[ -d "/var/tmp" ]]; then
        temp_dir="/var/tmp"
    else
        temp_dir="."
    fi
    
    normalize_path "$temp_dir"
}

# Create directory with platform-appropriate permissions
# Requirements: 4.3 - Handle different path separators and permission models
create_directory_safe() {
    local dir_path="$1"
    local permissions="${2:-755}"
    
    # Normalize path
    dir_path=$(normalize_path "$dir_path")
    
    # Create directory
    if ! mkdir -p "$dir_path" 2>/dev/null; then
        return 1
    fi
    
    # Set permissions (skip on Windows/WSL where it might not work properly)
    if [[ "$PLATFORM_OS" != "Windows" ]] && [[ "$PLATFORM_IS_WSL" != true ]]; then
        chmod "$permissions" "$dir_path" 2>/dev/null || true
    fi
    
    return 0
}

# Check if path is executable with platform-specific logic
is_executable() {
    local file_path="$1"
    
    # Normalize path
    file_path=$(normalize_path "$file_path")
    
    # Check if file exists and is executable
    if [[ -f "$file_path" ]]; then
        if [[ "$PLATFORM_OS" == "Windows" ]]; then
            # On Windows, check file extension
            case "${file_path##*.}" in
                exe|bat|cmd|ps1|com)
                    return 0
                    ;;
                *)
                    # Check if it has execute permission
                    [[ -x "$file_path" ]]
                    ;;
            esac
        else
            # Unix-like systems
            [[ -x "$file_path" ]]
        fi
    else
        return 1
    fi
}

# Make file executable with platform-appropriate method
make_executable() {
    local file_path="$1"
    
    # Normalize path
    file_path=$(normalize_path "$file_path")
    
    # Make executable (skip on Windows where it might not be necessary)
    if [[ "$PLATFORM_OS" != "Windows" ]]; then
        chmod +x "$file_path" 2>/dev/null || true
    fi
    
    return 0
}

# =============================================================================
# PACKAGE MANAGEMENT FUNCTIONS
# =============================================================================

# Get package name for current platform
# Requirements: 4.2 - Implement package manager detection and adaptation
get_package_name() {
    local generic_name="$1"
    local pkg_manager="${2:-$PLATFORM_PKG_MANAGER}"
    
    case "$generic_name" in
        curl)
            echo "${PKG_MAPPINGS_CURL[$pkg_manager]:-curl}"
            ;;
        wget)
            echo "${PKG_MAPPINGS_WGET[$pkg_manager]:-wget}"
            ;;
        git)
            echo "${PKG_MAPPINGS_GIT[$pkg_manager]:-git}"
            ;;
        unzip)
            echo "${PKG_MAPPINGS_UNZIP[$pkg_manager]:-unzip}"
            ;;
        node|nodejs)
            echo "${PKG_MAPPINGS_NODE[$pkg_manager]:-nodejs}"
            ;;
        *)
            echo "$generic_name"
            ;;
    esac
}

# Install package using platform-appropriate package manager
install_package() {
    local package_name="$1"
    local pkg_manager="${2:-$PLATFORM_PKG_MANAGER}"
    local sudo_required="${3:-auto}"
    
    if [[ -z "$pkg_manager" ]]; then
        echo "No package manager detected" >&2
        return 1
    fi
    
    # Get platform-specific package name
    local platform_package=$(get_package_name "$package_name" "$pkg_manager")
    local cmd="${PKG_MANAGERS[$pkg_manager]}"
    local install_cmd=""
    local needs_sudo=false
    
    # Determine if sudo is needed
    if [[ "$sudo_required" == "auto" ]]; then
        case "$pkg_manager" in
            brew|choco|winget|scoop)
                needs_sudo=false
                ;;
            *)
                if [[ "$PLATFORM_OS" != "Windows" ]] && [[ $(id -u) -ne 0 ]]; then
                    needs_sudo=true
                fi
                ;;
        esac
    elif [[ "$sudo_required" == "yes" ]]; then
        needs_sudo=true
    fi
    
    # Build install command
    case "$pkg_manager" in
        apt)
            install_cmd="$cmd update && $cmd install -y $platform_package"
            ;;
        yum|dnf)
            install_cmd="$cmd install -y $platform_package"
            ;;
        brew)
            install_cmd="$cmd install $platform_package"
            ;;
        pacman)
            install_cmd="$cmd -S --noconfirm $platform_package"
            ;;
        zypper)
            install_cmd="$cmd install -y $platform_package"
            ;;
        apk)
            install_cmd="$cmd add $platform_package"
            ;;
        choco)
            install_cmd="$cmd install -y $platform_package"
            ;;
        winget)
            install_cmd="$cmd install --id $platform_package --silent --accept-package-agreements --accept-source-agreements"
            ;;
        pkg)
            install_cmd="$cmd install -y $platform_package"
            ;;
        portage)
            install_cmd="emerge $platform_package"
            ;;
        *)
            echo "Unsupported package manager: $pkg_manager" >&2
            return 1
            ;;
    esac
    
    # Execute command
    if [[ "$needs_sudo" == true ]] && command -v sudo >/dev/null 2>&1; then
        eval "sudo $install_cmd"
    else
        eval "$install_cmd"
    fi
}

# Check if package is installed
is_package_installed() {
    local package_name="$1"
    local pkg_manager="${2:-$PLATFORM_PKG_MANAGER}"
    
    if [[ -z "$pkg_manager" ]]; then
        return 1
    fi
    
    local platform_package=$(get_package_name "$package_name" "$pkg_manager")
    local cmd="${PKG_MANAGERS[$pkg_manager]}"
    
    case "$pkg_manager" in
        apt)
            dpkg -l "$platform_package" >/dev/null 2>&1
            ;;
        yum|dnf)
            rpm -q "$platform_package" >/dev/null 2>&1
            ;;
        brew)
            brew list "$platform_package" >/dev/null 2>&1
            ;;
        pacman)
            pacman -Q "$platform_package" >/dev/null 2>&1
            ;;
        zypper)
            zypper search -i "$platform_package" | grep -q "^i"
            ;;
        apk)
            apk info -e "$platform_package" >/dev/null 2>&1
            ;;
        choco)
            choco list --local-only "$platform_package" | grep -q "$platform_package"
            ;;
        winget)
            winget list --id "$platform_package" >/dev/null 2>&1
            ;;
        pkg)
            pkg info "$platform_package" >/dev/null 2>&1
            ;;
        portage)
            equery list "$platform_package" >/dev/null 2>&1
            ;;
        *)
            return 1
            ;;
    esac
}

# =============================================================================
# SHELL COMPATIBILITY FUNCTIONS
# =============================================================================

# Execute command with shell compatibility
# Requirements: 4.4 - Ensure shell compatibility across bash, zsh, and other shells
execute_compatible() {
    local command_to_run="$1"
    local shell_override="${2:-}"
    
    if [[ -n "$shell_override" ]]; then
        "$shell_override" -c "$command_to_run"
    else
        case "$PLATFORM_SHELL" in
            bash)
                bash -c "$command_to_run"
                ;;
            zsh)
                zsh -c "$command_to_run"
                ;;
            *)
                # Fallback to sh for maximum compatibility
                sh -c "$command_to_run"
                ;;
        esac
    fi
}

# Source file with shell compatibility
source_compatible() {
    local file_path="$1"
    
    # Normalize path
    file_path=$(normalize_path "$file_path")
    
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi
    
    case "$PLATFORM_SHELL" in
        bash|zsh)
            source "$file_path"
            ;;
        *)
            # Use dot notation for POSIX compatibility
            . "$file_path"
            ;;
    esac
}

# Check if shell feature is supported
is_shell_feature_supported() {
    local feature="$1"
    
    case "$feature" in
        arrays)
            [[ "$PLATFORM_SHELL" == "bash" ]] || [[ "$PLATFORM_SHELL" == "zsh" ]]
            ;;
        associative_arrays)
            [[ "$PLATFORM_SHELL" == "bash" ]] && [[ "${BASH_VERSINFO[0]}" -ge 4 ]] || [[ "$PLATFORM_SHELL" == "zsh" ]]
            ;;
        process_substitution)
            [[ "$PLATFORM_SHELL" == "bash" ]] || [[ "$PLATFORM_SHELL" == "zsh" ]]
            ;;
        extended_globbing)
            [[ "$PLATFORM_SHELL" == "bash" ]] || [[ "$PLATFORM_SHELL" == "zsh" ]]
            ;;
        *)
            return 1
            ;;
    esac
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Get platform information summary
get_platform_info() {
    cat << EOF
Platform Information:
  OS: $PLATFORM_OS
  Architecture: $PLATFORM_ARCH
  Distribution: $PLATFORM_DISTRO
  Version: $PLATFORM_VERSION
  Shell: $PLATFORM_SHELL
  Package Manager: $PLATFORM_PKG_MANAGER
  Path Separator: $PLATFORM_PATH_SEP
  WSL: $PLATFORM_IS_WSL
  Container: $PLATFORM_IS_CONTAINER
EOF
}

# Check platform compatibility for installer
check_platform_compatibility() {
    local issues=()
    local warnings=()
    
    # Check OS support
    case "$PLATFORM_OS" in
        Linux|macOS|WSL)
            # Supported
            ;;
        Windows)
            if [[ "$PLATFORM_IS_WSL" != true ]]; then
                warnings+=("Native Windows support is limited. Consider using WSL.")
            fi
            ;;
        *)
            issues+=("Unsupported operating system: $PLATFORM_OS")
            ;;
    esac
    
    # Check shell compatibility
    case "$PLATFORM_SHELL" in
        bash|zsh)
            # Fully supported
            ;;
        sh|dash|ksh)
            warnings+=("Shell $PLATFORM_SHELL has limited feature support. Consider using bash or zsh.")
            ;;
        *)
            warnings+=("Unknown shell $PLATFORM_SHELL. Compatibility not guaranteed.")
            ;;
    esac
    
    # Check package manager availability
    if [[ -z "$PLATFORM_PKG_MANAGER" ]]; then
        issues+=("No supported package manager found")
    fi
    
    # Report issues and warnings
    if [[ ${#issues[@]} -gt 0 ]]; then
        echo "Platform compatibility issues:" >&2
        for issue in "${issues[@]}"; do
            echo "  ERROR: $issue" >&2
        done
        return 1
    fi
    
    if [[ ${#warnings[@]} -gt 0 ]]; then
        echo "Platform compatibility warnings:" >&2
        for warning in "${warnings[@]}"; do
            echo "  WARNING: $warning" >&2
        done
    fi
    
    return 0
}

# =============================================================================
# INITIALIZATION
# =============================================================================

# Auto-initialize if this script is sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]] || [[ -n "${ZSH_VERSION:-}" ]]; then
    # Script is being sourced, initialize automatically
    initialize_platform_compatibility
elif [[ "${0##*/}" == "cross-platform-compatibility.sh" ]]; then
    # Script is being executed directly, show platform info
    initialize_platform_compatibility
    get_platform_info
fi
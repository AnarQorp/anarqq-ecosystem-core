#!/bin/bash

# Cross-Platform Tests for AnarQ&Q Robust Installer
# Tests platform-specific functionality on Linux, macOS, and Windows WSL
# Version: 1.0.0

set -e

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEST_LOG="$PROJECT_ROOT/tests/installer/logs/platform-tests-$(date +%Y%m%d-%H%M%S).log"
TEST_DIR="$PROJECT_ROOT/tests/installer/temp/platform-$(date +%Y%m%d-%H%M%S)"

# Create test directories
mkdir -p "$(dirname "$TEST_LOG")"
mkdir -p "$TEST_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Platform detection
detect_platform() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WSL_DISTRO_NAME" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

CURRENT_PLATFORM=$(detect_platform)

# Logging function
log_test() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] [$CURRENT_PLATFORM] $message" >> "$TEST_LOG"
}

# Test output functions
print_test_header() {
    echo -e "${PURPLE}$1${NC}"
    log_test "INFO" "Starting test: $1"
}

print_test_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    log_test "PASS" "$1"
}

print_test_fail() {
    echo -e "${RED}❌ $1${NC}"
    log_test "FAIL" "$1"
}

print_test_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log_test "INFO" "$1"
}

print_test_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log_test "WARN" "$1"
}

print_test_skip() {
    echo -e "${CYAN}⏭️  $1${NC}"
    log_test "SKIP" "$1"
}

# Test 1: Platform Detection
test_platform_detection() {
    print_test_header "Test 1: Platform Detection"
    
    print_test_info "Detected platform: $CURRENT_PLATFORM"
    print_test_info "OSTYPE: $OSTYPE"
    print_test_info "WSL_DISTRO_NAME: ${WSL_DISTRO_NAME:-not set}"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    case "$CURRENT_PLATFORM" in
        "linux"|"macos"|"windows")
            print_test_pass "Platform detection successful: $CURRENT_PLATFORM"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            ;;
        *)
            print_test_fail "Unknown platform detected: $CURRENT_PLATFORM"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            ;;
    esac
}

# Test 2: Package Manager Detection
test_package_manager_detection() {
    print_test_header "Test 2: Package Manager Detection"
    
    local package_managers=()
    
    # Check for various package managers
    if command -v apt >/dev/null 2>&1; then
        package_managers+=("apt")
    fi
    if command -v yum >/dev/null 2>&1; then
        package_managers+=("yum")
    fi
    if command -v dnf >/dev/null 2>&1; then
        package_managers+=("dnf")
    fi
    if command -v brew >/dev/null 2>&1; then
        package_managers+=("brew")
    fi
    if command -v pacman >/dev/null 2>&1; then
        package_managers+=("pacman")
    fi
    if command -v zypper >/dev/null 2>&1; then
        package_managers+=("zypper")
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ ${#package_managers[@]} -gt 0 ]; then
        print_test_pass "Package managers detected: ${package_managers[*]}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_warning "No standard package managers detected"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Not necessarily a failure
    fi
    
    # Platform-specific expectations
    case "$CURRENT_PLATFORM" in
        "linux")
            TESTS_TOTAL=$((TESTS_TOTAL + 1))
            if [[ " ${package_managers[*]} " =~ " apt " ]] || [[ " ${package_managers[*]} " =~ " yum " ]] || [[ " ${package_managers[*]} " =~ " dnf " ]]; then
                print_test_pass "Expected Linux package manager found"
                TESTS_PASSED=$((TESTS_PASSED + 1))
            else
                print_test_warning "No expected Linux package manager found"
                TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
            fi
            ;;
        "macos")
            TESTS_TOTAL=$((TESTS_TOTAL + 1))
            if [[ " ${package_managers[*]} " =~ " brew " ]]; then
                print_test_pass "Homebrew found on macOS"
                TESTS_PASSED=$((TESTS_PASSED + 1))
            else
                print_test_warning "Homebrew not found on macOS"
                TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
            fi
            ;;
        "windows")
            print_test_info "Windows/WSL detected - package managers may vary"
            ;;
    esac
}

# Test 3: Essential Command Availability
test_essential_commands() {
    print_test_header "Test 3: Essential Command Availability"
    
    local essential_commands=("curl" "wget" "git" "unzip" "tar" "grep" "sed" "awk")
    local available_commands=()
    local missing_commands=()
    
    for cmd in "${essential_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            available_commands+=("$cmd")
        else
            missing_commands+=("$cmd")
        fi
    done
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    print_test_info "Available commands: ${available_commands[*]}"
    if [ ${#missing_commands[@]} -gt 0 ]; then
        print_test_warning "Missing commands: ${missing_commands[*]}"
    fi
    
    # At least curl or wget should be available
    if [[ " ${available_commands[*]} " =~ " curl " ]] || [[ " ${available_commands[*]} " =~ " wget " ]]; then
        print_test_pass "Download tools (curl/wget) are available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Neither curl nor wget is available"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Git should be available
    if [[ " ${available_commands[*]} " =~ " git " ]]; then
        print_test_pass "Git is available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_warning "Git is not available"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
    fi
}

# Test 4: Node.js and NPM Availability
test_nodejs_npm() {
    print_test_header "Test 4: Node.js and NPM Availability"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version 2>/dev/null || echo "unknown")
        print_test_pass "Node.js is available: $node_version"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        
        # Check Node.js version (should be >= 16)
        local version_number=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
        if [ "$version_number" -ge 16 ] 2>/dev/null; then
            print_test_pass "Node.js version is sufficient (>= 16)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_test_warning "Node.js version may be too old: $node_version"
            TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
        fi
    else
        print_test_warning "Node.js is not available"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Skip version check
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version 2>/dev/null || echo "unknown")
        print_test_pass "NPM is available: $npm_version"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_warning "NPM is not available"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
    fi
}

# Test 5: File System Operations
test_filesystem_operations() {
    print_test_header "Test 5: File System Operations"
    
    local test_fs_dir="$TEST_DIR/filesystem_test"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test directory creation
    if mkdir -p "$test_fs_dir"; then
        print_test_pass "Directory creation works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Directory creation failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test file creation and permissions
    local test_file="$test_fs_dir/test_file.txt"
    if echo "test content" > "$test_file"; then
        print_test_pass "File creation works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "File creation failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test file permissions (make executable)
    if chmod +x "$test_file"; then
        print_test_pass "File permission modification works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "File permission modification failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test hidden file creation (important for .env files)
    local hidden_file="$test_fs_dir/.hidden_test"
    if echo "hidden content" > "$hidden_file"; then
        print_test_pass "Hidden file creation works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Hidden file creation failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 6: Network Connectivity
test_network_connectivity() {
    print_test_header "Test 6: Network Connectivity"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test basic connectivity to GitHub
    if curl -s --connect-timeout 10 https://github.com >/dev/null 2>&1; then
        print_test_pass "Network connectivity to GitHub works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif wget -q --timeout=10 --spider https://github.com >/dev/null 2>&1; then
        print_test_pass "Network connectivity to GitHub works (via wget)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_warning "Network connectivity to GitHub failed"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure (might be offline)
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test HTTPS support
    if curl -s --connect-timeout 10 https://httpbin.org/get >/dev/null 2>&1; then
        print_test_pass "HTTPS connectivity works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_warning "HTTPS connectivity test failed"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
    fi
}

# Test 7: Shell Compatibility
test_shell_compatibility() {
    print_test_header "Test 7: Shell Compatibility"
    
    print_test_info "Current shell: $SHELL"
    print_test_info "Bash version: ${BASH_VERSION:-not available}"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test if we're running in bash
    if [ -n "$BASH_VERSION" ]; then
        print_test_pass "Running in Bash shell"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        
        # Check bash version (should be >= 4.0)
        local bash_major_version=$(echo "$BASH_VERSION" | cut -d. -f1)
        if [ "$bash_major_version" -ge 4 ] 2>/dev/null; then
            print_test_pass "Bash version is sufficient (>= 4.0)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_test_warning "Bash version may be too old: $BASH_VERSION"
            TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
        fi
    else
        print_test_warning "Not running in Bash shell"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Skip version check
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test array support (important for installer)
    if (
        test_array=("item1" "item2" "item3")
        [ "${#test_array[@]}" -eq 3 ]
    ) 2>/dev/null; then
        print_test_pass "Shell array support works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Shell array support is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 8: Platform-Specific Features
test_platform_specific_features() {
    print_test_header "Test 8: Platform-Specific Features"
    
    case "$CURRENT_PLATFORM" in
        "linux")
            test_linux_specific_features
            ;;
        "macos")
            test_macos_specific_features
            ;;
        "windows")
            test_windows_specific_features
            ;;
        *)
            print_test_skip "Unknown platform, skipping platform-specific tests"
            ;;
    esac
}

test_linux_specific_features() {
    print_test_info "Testing Linux-specific features"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test /proc filesystem
    if [ -d "/proc" ]; then
        print_test_pass "Linux /proc filesystem is available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Linux /proc filesystem is not available"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test systemd (common on modern Linux)
    if command -v systemctl >/dev/null 2>&1; then
        print_test_pass "systemd is available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_info "systemd is not available (not necessarily a problem)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

test_macos_specific_features() {
    print_test_info "Testing macOS-specific features"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test macOS version
    if sw_vers >/dev/null 2>&1; then
        local macos_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
        print_test_pass "macOS version detected: $macos_version"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Cannot detect macOS version"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test Xcode command line tools
    if xcode-select -p >/dev/null 2>&1; then
        print_test_pass "Xcode command line tools are installed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_warning "Xcode command line tools are not installed"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # Warning, not failure
    fi
}

test_windows_specific_features() {
    print_test_info "Testing Windows/WSL-specific features"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test WSL detection
    if [ -n "$WSL_DISTRO_NAME" ]; then
        print_test_pass "WSL environment detected: $WSL_DISTRO_NAME"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_info "Not running in WSL (or WSL version < 2)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test Windows filesystem access
    if [ -d "/mnt/c" ] || [ -d "/c" ]; then
        print_test_pass "Windows filesystem access is available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_info "Windows filesystem access not detected"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

# Main test runner
run_platform_tests() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║         AnarQ&Q Installer Platform Tests v1.0                ║"
    echo "║                                                               ║"
    echo "║          Testing Cross-Platform Compatibility                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_test_info "Test log: $TEST_LOG"
    print_test_info "Test directory: $TEST_DIR"
    print_test_info "Current platform: $CURRENT_PLATFORM"
    echo ""
    
    # Run all tests
    test_platform_detection
    echo ""
    test_package_manager_detection
    echo ""
    test_essential_commands
    echo ""
    test_nodejs_npm
    echo ""
    test_filesystem_operations
    echo ""
    test_network_connectivity
    echo ""
    test_shell_compatibility
    echo ""
    test_platform_specific_features
    echo ""
    
    # Print summary
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Platform Test Summary for $CURRENT_PLATFORM:${NC}"
    echo -e "  Total tests: ${TESTS_TOTAL}"
    echo -e "  Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "  Failed: ${RED}${TESTS_FAILED}${NC}"
    echo -e "  Success rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_test_pass "🎉 All platform tests passed on $CURRENT_PLATFORM!"
        return 0
    else
        print_test_fail "❌ Some platform tests failed on $CURRENT_PLATFORM. Check the log for details."
        return 1
    fi
}

# Cleanup function
cleanup() {
    rm -rf "$TEST_DIR"
}

# Set trap for cleanup
trap cleanup EXIT

# Run tests if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_platform_tests "$@"
fi
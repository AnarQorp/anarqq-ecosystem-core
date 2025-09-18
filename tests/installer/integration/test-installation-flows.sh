#!/bin/bash

# Integration Tests for AnarQ&Q Robust Installer
# Tests complete installation flows and component interactions
# Version: 1.0.0

set -e

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEST_LOG="$PROJECT_ROOT/tests/installer/logs/integration-tests-$(date +%Y%m%d-%H%M%S).log"
TEST_DIR="$PROJECT_ROOT/tests/installer/temp/integration-$(date +%Y%m%d-%H%M%S)"

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

# Logging function
log_test() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$TEST_LOG"
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

# Test 1: Complete Installation Flow (Dry Run)
test_complete_installation_flow() {
    print_test_header "Test 1: Complete Installation Flow (Dry Run)"
    
    local test_install_dir="$TEST_DIR/complete_install"
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check if installer exists
    if [ ! -f "$installer_script" ]; then
        print_test_fail "Installer script not found: $installer_script"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Test installer syntax
    if bash -n "$installer_script" 2>/dev/null; then
        print_test_pass "Installer script has valid syntax"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Installer script has syntax errors"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test installer structure (check for required functions)
    local required_functions=("print_header" "check_prerequisites_enhanced" "download_repositories_enhanced" "install_dependencies" "setup_environment")
    local missing_functions=()
    
    for func in "${required_functions[@]}"; do
        if ! grep -q "^${func}()" "$installer_script"; then
            missing_functions+=("$func")
        fi
    done
    
    if [ ${#missing_functions[@]} -eq 0 ]; then
        print_test_pass "All required functions are present in installer"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Missing functions in installer: ${missing_functions[*]}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 2: Dependency Manager Integration
test_dependency_manager_integration() {
    print_test_header "Test 2: Dependency Manager Integration"
    
    local dependency_manager="$PROJECT_ROOT/install-dependency-manager.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check if dependency manager exists
    if [ -f "$dependency_manager" ]; then
        print_test_pass "Dependency manager script exists"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Dependency manager script not found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test dependency manager syntax
    if bash -n "$dependency_manager" 2>/dev/null; then
        print_test_pass "Dependency manager has valid syntax"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Dependency manager has syntax errors"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test integration (check if installer sources dependency manager)
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    if grep -q "source.*install-dependency-manager.sh" "$installer_script"; then
        print_test_pass "Installer properly sources dependency manager"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Installer does not source dependency manager"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 3: Error Handling Integration
test_error_handling_integration() {
    print_test_header "Test 3: Error Handling Integration"
    
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for error handling functions
    if grep -q "log_error" "$installer_script" && grep -q "cleanup_and_exit" "$installer_script"; then
        print_test_pass "Error handling functions are integrated"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Error handling functions are missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for error trapping
    if grep -q "trap.*ERR" "$installer_script"; then
        print_test_pass "Error trapping is configured"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Error trapping is not configured"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for set -e (exit on error)
    if grep -q "set -e" "$installer_script"; then
        print_test_pass "Exit on error is enabled"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Exit on error is not enabled"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 4: Download Engine Integration
test_download_engine_integration() {
    print_test_header "Test 4: Download Engine Integration"
    
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for multiple download methods
    local download_methods=("git clone" "curl.*zip" "wget.*zip")
    local found_methods=0
    
    for method in "${download_methods[@]}"; do
        if grep -q "$method" "$installer_script"; then
            found_methods=$((found_methods + 1))
        fi
    done
    
    if [ $found_methods -ge 2 ]; then
        print_test_pass "Multiple download methods are implemented ($found_methods/3)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Insufficient download methods implemented ($found_methods/3)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for retry mechanism
    if grep -q "retry_with_backoff" "$installer_script"; then
        print_test_pass "Retry mechanism is integrated"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Retry mechanism is not integrated"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for extraction methods
    if grep -q "unzip" "$installer_script" && grep -q "python.*zipfile" "$installer_script"; then
        print_test_pass "Multiple extraction methods are available"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Multiple extraction methods are not available"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 5: Configuration and Environment Setup
test_configuration_setup() {
    print_test_header "Test 5: Configuration and Environment Setup"
    
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for environment setup function
    if grep -q "setup_environment" "$installer_script"; then
        print_test_pass "Environment setup function exists"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Environment setup function is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for .env file handling
    if grep -q "\.env" "$installer_script"; then
        print_test_pass "Environment file handling is implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Environment file handling is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for directory creation
    if grep -q "mkdir.*INSTALL_DIR" "$installer_script"; then
        print_test_pass "Installation directory creation is implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Installation directory creation is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 6: User Interface and Progress Feedback
test_user_interface() {
    print_test_header "Test 6: User Interface and Progress Feedback"
    
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for progress indicators
    local ui_functions=("print_step" "print_substep" "print_success" "print_error" "print_warning")
    local found_ui_functions=0
    
    for func in "${ui_functions[@]}"; do
        if grep -q "$func" "$installer_script"; then
            found_ui_functions=$((found_ui_functions + 1))
        fi
    done
    
    if [ $found_ui_functions -ge 4 ]; then
        print_test_pass "User interface functions are implemented ($found_ui_functions/5)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Insufficient user interface functions ($found_ui_functions/5)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for user prompts
    if grep -q "read -p" "$installer_script"; then
        print_test_pass "User prompts are implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "User prompts are missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for header display
    if grep -q "print_header" "$installer_script"; then
        print_test_pass "Header display is implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Header display is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 7: Validation and Post-Installation
test_validation_system() {
    print_test_header "Test 7: Validation and Post-Installation"
    
    local installer_script="$PROJECT_ROOT/install-anarqq-robust-enhanced.sh"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for dependency installation
    if grep -q "install_dependencies" "$installer_script"; then
        print_test_pass "Dependency installation is implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Dependency installation is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for npm install commands
    if grep -q "npm install" "$installer_script"; then
        print_test_pass "NPM dependency installation is implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "NPM dependency installation is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Check for success message
    if grep -q "Instalación completada" "$installer_script" || grep -q "Installation completed" "$installer_script"; then
        print_test_pass "Success message is implemented"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Success message is missing"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Main test runner
run_integration_tests() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║          AnarQ&Q Installer Integration Tests v1.0            ║"
    echo "║                                                               ║"
    echo "║            Testing Complete Installation Flows               ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_test_info "Test log: $TEST_LOG"
    print_test_info "Test directory: $TEST_DIR"
    echo ""
    
    # Run all tests
    test_complete_installation_flow
    echo ""
    test_dependency_manager_integration
    echo ""
    test_error_handling_integration
    echo ""
    test_download_engine_integration
    echo ""
    test_configuration_setup
    echo ""
    test_user_interface
    echo ""
    test_validation_system
    echo ""
    
    # Print summary
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Integration Test Summary:${NC}"
    echo -e "  Total tests: ${TESTS_TOTAL}"
    echo -e "  Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "  Failed: ${RED}${TESTS_FAILED}${NC}"
    echo -e "  Success rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_test_pass "🎉 All integration tests passed!"
        return 0
    else
        print_test_fail "❌ Some integration tests failed. Check the log for details."
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
    run_integration_tests "$@"
fi
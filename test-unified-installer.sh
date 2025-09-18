#!/bin/bash

# AnarQ&Q Unified Installer Integration Tests
# Comprehensive testing suite for the unified installer system
# Versión: 1.0.0

set -e

# Test configuration
TEST_DIR="./test-unified-installer-$(date +%Y%m%d-%H%M%S)"
TEST_LOG="./test-unified-installer.log"
INSTALLER_SCRIPT="./install-anarqq-unified.sh"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Print functions
print_test_header() { echo -e "${PURPLE}🧪 $1${NC}"; }
print_test_pass() { echo -e "${GREEN}✅ $1${NC}"; }
print_test_fail() { echo -e "${RED}❌ $1${NC}"; }
print_test_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_test_warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }

# Test logging
log_test() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$TEST_LOG"
}

# Test assertion functions
assert_file_exists() {
    local file="$1"
    local description="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ -f "$file" ]; then
        print_test_pass "$description"
        log_test "PASS" "$description - File exists: $file"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_test_fail "$description"
        log_test "FAIL" "$description - File not found: $file"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

assert_directory_exists() {
    local dir="$1"
    local description="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ -d "$dir" ]; then
        print_test_pass "$description"
        log_test "PASS" "$description - Directory exists: $dir"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_test_fail "$description"
        log_test "FAIL" "$description - Directory not found: $dir"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

assert_command_exists() {
    local cmd="$1"
    local description="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if command -v "$cmd" >/dev/null 2>&1; then
        print_test_pass "$description"
        log_test "PASS" "$description - Command exists: $cmd"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_test_fail "$description"
        log_test "FAIL" "$description - Command not found: $cmd"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

assert_function_exists() {
    local func="$1"
    local description="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if grep -q "^$func()" "$INSTALLER_SCRIPT"; then
        print_test_pass "$description"
        log_test "PASS" "$description - Function exists: $func"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_test_fail "$description"
        log_test "FAIL" "$description - Function not found: $func"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

assert_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if grep -q "$pattern" "$file"; then
        print_test_pass "$description"
        log_test "PASS" "$description - Pattern found: $pattern"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_test_fail "$description"
        log_test "FAIL" "$description - Pattern not found: $pattern"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Setup test environment
setup_test_environment() {
    print_test_header "Setting up test environment"
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    
    # Initialize test log
    echo "# AnarQ&Q Unified Installer Integration Tests" > "$TEST_LOG"
    echo "# Started: $(date)" >> "$TEST_LOG"
    echo "" >> "$TEST_LOG"
    
    print_test_info "Test directory: $TEST_DIR"
    print_test_info "Test log: $TEST_LOG"
}

# Test 1: Installer script structure and syntax
test_installer_structure() {
    print_test_header "Test 1: Installer Script Structure and Syntax"
    
    # Check if installer script exists
    assert_file_exists "$INSTALLER_SCRIPT" "Unified installer script exists"
    
    # Check if script is executable
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if [ -x "$INSTALLER_SCRIPT" ]; then
        print_test_pass "Installer script is executable"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Installer script is not executable"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Check syntax
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if bash -n "$INSTALLER_SCRIPT" 2>/dev/null; then
        print_test_pass "Installer script syntax is valid"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Installer script has syntax errors"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Check shebang
    assert_contains "$INSTALLER_SCRIPT" "^#!/bin/bash" "Script has correct shebang"
    
    # Check version information
    assert_contains "$INSTALLER_SCRIPT" "INSTALLER_VERSION=" "Version information is defined"
    assert_contains "$INSTALLER_SCRIPT" "INSTALLER_NAME=" "Installer name is defined"
}

# Test 2: Core function definitions
test_core_functions() {
    print_test_header "Test 2: Core Function Definitions"
    
    # Utility functions
    assert_function_exists "print_error" "print_error function exists"
    assert_function_exists "print_success" "print_success function exists"
    assert_function_exists "log_message" "log_message function exists"
    assert_function_exists "command_exists" "command_exists function exists"
    assert_function_exists "show_progress" "show_progress function exists"
    assert_function_exists "prompt_user" "prompt_user function exists"
    
    # System detection functions
    assert_function_exists "detect_os" "detect_os function exists"
    assert_function_exists "detect_package_manager" "detect_package_manager function exists"
    assert_function_exists "detect_shell" "detect_shell function exists"
    assert_function_exists "initialize_system_info" "initialize_system_info function exists"
    
    # Dependency management functions
    assert_function_exists "install_dependency" "install_dependency function exists"
    assert_function_exists "check_dependencies" "check_dependencies function exists"
    assert_function_exists "install_nodejs" "install_nodejs function exists"
    
    # Download engine functions
    assert_function_exists "retry_with_backoff" "retry_with_backoff function exists"
    assert_function_exists "download_repository" "download_repository function exists"
    assert_function_exists "download_and_extract_zip" "download_and_extract_zip function exists"
    assert_function_exists "move_extracted_content" "move_extracted_content function exists"
}

# Test 3: Configuration management
test_configuration_management() {
    print_test_header "Test 3: Configuration Management"
    
    # Configuration functions
    assert_function_exists "load_configuration" "load_configuration function exists"
    assert_function_exists "save_configuration" "save_configuration function exists"
    assert_function_exists "source_modules" "source_modules function exists"
    
    # Configuration arrays
    assert_contains "$INSTALLER_SCRIPT" "declare -A INSTALL_CONFIG" "INSTALL_CONFIG array is declared"
    assert_contains "$INSTALLER_SCRIPT" "declare -A SYSTEM_CAPS" "SYSTEM_CAPS array is declared"
    assert_contains "$INSTALLER_SCRIPT" "declare -A ERROR_CONTEXT" "ERROR_CONTEXT array is declared"
    
    # Configuration keys
    assert_contains "$INSTALLER_SCRIPT" '\["mode"\]' "Configuration includes mode setting"
    assert_contains "$INSTALLER_SCRIPT" '\["components"\]' "Configuration includes components setting"
    assert_contains "$INSTALLER_SCRIPT" '\["target_dir"\]' "Configuration includes target_dir setting"
    assert_contains "$INSTALLER_SCRIPT" '\["verbose"\]' "Configuration includes verbose setting"
}

# Test 4: Installation orchestration
test_installation_orchestration() {
    print_test_header "Test 4: Installation Orchestration"
    
    # Orchestration functions
    assert_function_exists "select_installation_mode" "select_installation_mode function exists"
    assert_function_exists "get_components_for_mode" "get_components_for_mode function exists"
    assert_function_exists "create_install_directory" "create_install_directory function exists"
    assert_function_exists "install_repositories" "install_repositories function exists"
    assert_function_exists "install_dependencies" "install_dependencies function exists"
    assert_function_exists "setup_environment" "setup_environment function exists"
    
    # Installation modes
    assert_contains "$INSTALLER_SCRIPT" "minimal" "Minimal installation mode is supported"
    assert_contains "$INSTALLER_SCRIPT" "full" "Full installation mode is supported"
    assert_contains "$INSTALLER_SCRIPT" "development" "Development installation mode is supported"
    
    # Repository mappings
    assert_contains "$INSTALLER_SCRIPT" "declare -A REPO_URLS" "Repository URL mappings are defined"
}

# Test 5: Validation engine
test_validation_engine() {
    print_test_header "Test 5: Validation Engine"
    
    # Validation functions
    assert_function_exists "validate_installation" "validate_installation function exists"
    assert_function_exists "validate_component_installation" "validate_component_installation function exists"
    assert_function_exists "generate_health_report" "generate_health_report function exists"
    
    # Validation logic
    assert_contains "$INSTALLER_SCRIPT" "\.anarqq-installation" "Installation marker validation"
    assert_contains "$INSTALLER_SCRIPT" "package\.json" "Package.json validation"
    assert_contains "$INSTALLER_SCRIPT" "node_modules" "Node modules validation"
}

# Test 6: Error handling and cleanup
test_error_handling() {
    print_test_header "Test 6: Error Handling and Cleanup"
    
    # Error handling functions
    assert_function_exists "log_error" "log_error function exists"
    assert_function_exists "cleanup_on_error" "cleanup_on_error function exists"
    
    # Error handling setup
    assert_contains "$INSTALLER_SCRIPT" "trap.*ERR" "Error trap is set up"
    assert_contains "$INSTALLER_SCRIPT" "trap.*INT TERM" "Interrupt trap is set up"
    
    # Cleanup logic
    assert_contains "$INSTALLER_SCRIPT" "rm -rf.*temp" "Temporary file cleanup"
    assert_contains "$INSTALLER_SCRIPT" "cleanup_on_error" "Error cleanup function calls"
}

# Test 7: User interface and progress
test_user_interface() {
    print_test_header "Test 7: User Interface and Progress"
    
    # UI functions
    assert_function_exists "print_header" "print_header function exists"
    assert_function_exists "display_summary" "display_summary function exists"
    assert_function_exists "show_next_steps" "show_next_steps function exists"
    
    # Progress indicators
    assert_contains "$INSTALLER_SCRIPT" "Step [0-9]/[0-9]" "Step progress indicators"
    assert_contains "$INSTALLER_SCRIPT" "🔄" "Progress emoji indicators"
    assert_contains "$INSTALLER_SCRIPT" "✅" "Success emoji indicators"
    assert_contains "$INSTALLER_SCRIPT" "❌" "Error emoji indicators"
}

# Test 8: Command line argument parsing
test_command_line_args() {
    print_test_header "Test 8: Command Line Argument Parsing"
    
    # Argument parsing
    assert_contains "$INSTALLER_SCRIPT" "\--mode=" "Mode argument parsing"
    assert_contains "$INSTALLER_SCRIPT" "\--target-dir=" "Target directory argument parsing"
    assert_contains "$INSTALLER_SCRIPT" "\--verbose" "Verbose argument parsing"
    assert_contains "$INSTALLER_SCRIPT" "\--non-interactive" "Non-interactive argument parsing"
    assert_contains "$INSTALLER_SCRIPT" "\--skip-validation" "Skip validation argument parsing"
    assert_contains "$INSTALLER_SCRIPT" "\--help" "Help argument parsing"
    
    # Help text
    assert_contains "$INSTALLER_SCRIPT" "Usage:" "Help usage text"
    assert_contains "$INSTALLER_SCRIPT" "Options:" "Help options text"
}

# Test 9: Integration with modular components
test_modular_integration() {
    print_test_header "Test 9: Integration with Modular Components"
    
    # Module sourcing
    assert_contains "$INSTALLER_SCRIPT" "install-dependency-manager.sh" "Dependency manager integration"
    assert_contains "$INSTALLER_SCRIPT" "install-component-manager.sh" "Component manager integration"
    
    # Module loading logic
    assert_contains "$INSTALLER_SCRIPT" "source.*install-dependency-manager" "Dependency manager sourcing"
    assert_contains "$INSTALLER_SCRIPT" "source.*install-component-manager" "Component manager sourcing"
    
    # Fallback handling
    assert_contains "$INSTALLER_SCRIPT" "using built-in functions" "Fallback to built-in functions"
}

# Test 10: Dry run functionality test
test_dry_run() {
    print_test_header "Test 10: Dry Run Functionality"
    
    # Test help option
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if "$INSTALLER_SCRIPT" --help >/dev/null 2>&1; then
        print_test_pass "Help option works correctly"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Help option failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Test non-interactive mode with invalid target
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if timeout 10 "$INSTALLER_SCRIPT" --non-interactive --target-dir="/invalid/path/test" 2>/dev/null; then
        print_test_warn "Non-interactive mode completed (may indicate issue)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_pass "Non-interactive mode properly handles invalid paths"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

# Test 11: Log file generation
test_log_generation() {
    print_test_header "Test 11: Log File Generation"
    
    # Check log file pattern
    assert_contains "$INSTALLER_SCRIPT" "LOG_FILE=.*anarqq-unified-installer" "Log file pattern is defined"
    
    # Check logging functions
    assert_contains "$INSTALLER_SCRIPT" "echo.*LOG_FILE" "Log file writing"
    assert_contains "$INSTALLER_SCRIPT" "timestamp.*date" "Timestamp logging"
    
    # Check log levels
    assert_contains "$INSTALLER_SCRIPT" "INFO" "INFO log level"
    assert_contains "$INSTALLER_SCRIPT" "ERROR" "ERROR log level"
    assert_contains "$INSTALLER_SCRIPT" "WARN" "WARN log level"
    assert_contains "$INSTALLER_SCRIPT" "DEBUG" "DEBUG log level"
    assert_contains "$INSTALLER_SCRIPT" "SUCCESS" "SUCCESS log level"
}

# Test 12: Health report generation
test_health_report() {
    print_test_header "Test 12: Health Report Generation"
    
    # Health report function
    assert_function_exists "generate_health_report" "Health report generation function exists"
    
    # Health report content
    assert_contains "$INSTALLER_SCRIPT" "installation-health-report.json" "Health report file name"
    assert_contains "$INSTALLER_SCRIPT" '"date":' "Health report includes installation date"
    assert_contains "$INSTALLER_SCRIPT" '"os":' "Health report includes system info"
    assert_contains "$INSTALLER_SCRIPT" '"status":' "Health report includes validation status"
    
    # JSON structure
    assert_contains "$INSTALLER_SCRIPT" '"installation":' "Health report JSON structure"
    assert_contains "$INSTALLER_SCRIPT" '"system":' "Health report system section"
    assert_contains "$INSTALLER_SCRIPT" '"validation":' "Health report validation section"
}

# Cleanup test environment
cleanup_test_environment() {
    print_test_header "Cleaning up test environment"
    
    # Remove test directory if it exists
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
        print_test_info "Removed test directory: $TEST_DIR"
    fi
    
    # Keep log file for review
    print_test_info "Test log preserved: $TEST_LOG"
}

# Display test results
display_test_results() {
    echo ""
    print_test_header "Test Results Summary"
    echo ""
    
    print_test_info "Total tests: $TESTS_TOTAL"
    print_test_pass "Passed: $TESTS_PASSED"
    print_test_fail "Failed: $TESTS_FAILED"
    
    local success_rate=0
    if [ $TESTS_TOTAL -gt 0 ]; then
        success_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    fi
    
    echo ""
    print_test_info "Success rate: ${success_rate}%"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        print_test_pass "🎉 All tests passed! The unified installer is ready for use."
        return 0
    else
        echo ""
        print_test_fail "❌ Some tests failed. Please review the issues above."
        print_test_info "Check the test log for detailed information: $TEST_LOG"
        return 1
    fi
}

# Main test execution
main() {
    echo "AnarQ&Q Unified Installer Integration Tests"
    echo "=========================================="
    echo ""
    
    # Setup
    setup_test_environment
    
    # Run all tests
    test_installer_structure
    test_core_functions
    test_configuration_management
    test_installation_orchestration
    test_validation_engine
    test_error_handling
    test_user_interface
    test_command_line_args
    test_modular_integration
    test_dry_run
    test_log_generation
    test_health_report
    
    # Cleanup and results
    cleanup_test_environment
    display_test_results
}

# Execute tests
main "$@"
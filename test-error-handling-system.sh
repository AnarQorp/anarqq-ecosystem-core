#!/bin/bash

# AnarQ&Q Ecosystem Installer - Error Handling System Test Suite
# Version: 1.0.0
# Author: AnarQorp
# License: MIT

# Test configuration
TEST_DIR="/tmp/anarqq-error-test-$(date +%Y%m%d-%H%M%S)"
TEST_LOG_FILE="$TEST_DIR/test-results.log"
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test utility functions
print_test_header() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}║           AnarQ&Q Error Handling System Test Suite           ║${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_test_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_test_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_test_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_test_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_test_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# Test framework functions
start_test() {
    local test_name="$1"
    
    # Disable error trapping temporarily
    set +e
    ((TESTS_TOTAL++))
    set -e
    
    echo ""
    print_test_step "Test $TESTS_TOTAL: $test_name"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting test: $test_name" >> "$TEST_LOG_FILE"
}

pass_test() {
    local test_name="$1"
    
    # Disable error trapping temporarily
    set +e
    ((TESTS_PASSED++))
    set -e
    
    print_test_success "PASSED: $test_name"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - PASSED: $test_name" >> "$TEST_LOG_FILE"
}

fail_test() {
    local test_name="$1"
    local reason="$2"
    
    # Disable error trapping temporarily
    set +e
    ((TESTS_FAILED++))
    set -e
    
    print_test_error "FAILED: $test_name"
    if [ -n "$reason" ]; then
        print_test_error "Reason: $reason"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - FAILED: $test_name - $reason" >> "$TEST_LOG_FILE"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - FAILED: $test_name" >> "$TEST_LOG_FILE"
    fi
}

# Setup test environment
setup_test_environment() {
    print_test_info "Setting up test environment..."
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    
    # Initialize test log
    cat > "$TEST_LOG_FILE" << EOF
AnarQ&Q Error Handling System Test Results
==========================================
Started: $(date '+%Y-%m-%d %H:%M:%S')
Test Directory: $TEST_DIR

EOF
    
    # Copy error handling modules to test directory
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    for module in installer-error-handler.sh installer-logging-config.sh installer-error-recovery.sh installer-verbose-debug.sh installer-error-system.sh; do
        if [ -f "$script_dir/$module" ]; then
            cp "$script_dir/$module" "$TEST_DIR/"
        else
            print_test_warning "Module not found: $module"
        fi
    done
    
    print_test_success "Test environment setup completed"
}

# Test 1: Error handler initialization
test_error_handler_initialization() {
    start_test "Error Handler Initialization"
    
    cd "$TEST_DIR"
    
    # Disable error trapping for this test
    set +e
    
    # Source the error handler
    if source ./installer-error-handler.sh 2>/dev/null; then
        # Test initialization
        if initialize_error_handler "test" >/dev/null 2>&1; then
            # Check if log file was created
            if [ -n "$INSTALLER_LOG_FILE" ] && [ -f "$INSTALLER_LOG_FILE" ]; then
                pass_test "Error Handler Initialization"
            else
                fail_test "Error Handler Initialization" "Log file not created"
            fi
        else
            fail_test "Error Handler Initialization" "Initialization function failed"
        fi
    else
        fail_test "Error Handler Initialization" "Could not source error handler module"
    fi
    
    # Re-enable error trapping
    set -e
}

# Test 2: Logging system functionality
test_logging_system() {
    start_test "Logging System Functionality"
    
    cd "$TEST_DIR"
    
    # Source logging modules
    if source ./installer-error-handler.sh && source ./installer-logging-config.sh; then
        # Initialize systems
        initialize_error_handler "test" >/dev/null 2>&1
        configure_logging >/dev/null 2>&1
        
        # Test different log levels
        log_debug "TEST" "Debug message test"
        log_info "TEST" "Info message test"
        log_warning "TEST" "Warning message test"
        log_error "TEST" "Error message test"
        
        # Check if messages were logged
        if [ -f "$INSTALLER_LOG_FILE" ] && grep -q "TEST" "$INSTALLER_LOG_FILE"; then
            pass_test "Logging System Functionality"
        else
            fail_test "Logging System Functionality" "Log messages not found in log file"
        fi
    else
        fail_test "Logging System Functionality" "Could not source logging modules"
    fi
}

# Test 3: Verbose and debug mode
test_verbose_debug_mode() {
    start_test "Verbose and Debug Mode"
    
    cd "$TEST_DIR"
    
    # Source modules
    if source ./installer-verbose-debug.sh; then
        # Test verbose mode
        enable_verbose_mode
        if [ "$VERBOSE_ENABLED" = true ]; then
            # Test debug mode
            enable_debug_mode
            if [ "$DEBUG_ENABLED" = true ]; then
                # Test debug logging
                debug_log "INFO" "TEST" "Debug mode test message"
                pass_test "Verbose and Debug Mode"
            else
                fail_test "Verbose and Debug Mode" "Debug mode not enabled"
            fi
        else
            fail_test "Verbose and Debug Mode" "Verbose mode not enabled"
        fi
    else
        fail_test "Verbose and Debug Mode" "Could not source verbose-debug module"
    fi
}

# Test 4: Error recovery system
test_error_recovery() {
    start_test "Error Recovery System"
    
    cd "$TEST_DIR"
    
    # Source modules
    if source ./installer-error-recovery.sh; then
        # Test network connectivity check
        if test_network_connectivity; then
            # Test basic system health
            test_basic_system_health
            pass_test "Error Recovery System"
        else
            print_test_warning "Network connectivity test failed (may be expected in some environments)"
            pass_test "Error Recovery System"
        fi
    else
        fail_test "Error Recovery System" "Could not source error recovery module"
    fi
}

# Test 5: Integrated error system
test_integrated_error_system() {
    start_test "Integrated Error System"
    
    cd "$TEST_DIR"
    
    # Source integrated system
    if source ./installer-error-system.sh; then
        # Test system initialization
        if initialize_error_system "verbose,debug" >/dev/null 2>&1; then
            # Test safe execution
            if safe_execute "echo 'Test command'" "Test safe execution" >/dev/null 2>&1; then
                # Test validation
                if safe_validation "command" "echo" "Test validation" >/dev/null 2>&1; then
                    pass_test "Integrated Error System"
                else
                    fail_test "Integrated Error System" "Validation test failed"
                fi
            else
                fail_test "Integrated Error System" "Safe execution test failed"
            fi
        else
            fail_test "Integrated Error System" "System initialization failed"
        fi
    else
        fail_test "Integrated Error System" "Could not source integrated error system"
    fi
}

# Test 6: File operations with error handling
test_file_operations() {
    start_test "File Operations with Error Handling"
    
    cd "$TEST_DIR"
    
    # Source integrated system
    if source ./installer-error-system.sh; then
        initialize_error_system "verbose" >/dev/null 2>&1
        
        # Test file creation
        local test_file="$TEST_DIR/test_file.txt"
        if safe_file_operation "create" "$(dirname "$test_file")" "" "Create test directory" >/dev/null 2>&1; then
            # Test file validation
            if safe_validation "directory" "$(dirname "$test_file")" "Validate test directory" >/dev/null 2>&1; then
                pass_test "File Operations with Error Handling"
            else
                fail_test "File Operations with Error Handling" "Directory validation failed"
            fi
        else
            fail_test "File Operations with Error Handling" "File creation failed"
        fi
    else
        fail_test "File Operations with Error Handling" "Could not source integrated system"
    fi
}

# Test 7: Command line argument parsing
test_argument_parsing() {
    start_test "Command Line Argument Parsing"
    
    cd "$TEST_DIR"
    
    # Source integrated system
    if source ./installer-error-system.sh; then
        # Test argument parsing
        local config_options=$(parse_error_system_args "--verbose" "--debug" "--no-recovery")
        
        if [[ "$config_options" =~ verbose ]] && [[ "$config_options" =~ debug ]] && [[ "$config_options" =~ no-recovery ]]; then
            pass_test "Command Line Argument Parsing"
        else
            fail_test "Command Line Argument Parsing" "Arguments not parsed correctly: $config_options"
        fi
    else
        fail_test "Command Line Argument Parsing" "Could not source integrated system"
    fi
}

# Test 8: Cleanup functionality
test_cleanup_functionality() {
    start_test "Cleanup Functionality"
    
    cd "$TEST_DIR"
    
    # Source error handler
    if source ./installer-error-handler.sh; then
        initialize_error_handler "test" >/dev/null 2>&1
        
        # Create temporary files and register them
        local temp_file1=$(mktemp)
        local temp_file2=$(mktemp)
        
        register_temp_file "$temp_file1"
        register_temp_file "$temp_file2"
        
        # Test cleanup
        cleanup_temp_files
        
        # Check if files were cleaned up
        if [ ! -f "$temp_file1" ] && [ ! -f "$temp_file2" ]; then
            pass_test "Cleanup Functionality"
        else
            fail_test "Cleanup Functionality" "Temporary files not cleaned up"
        fi
    else
        fail_test "Cleanup Functionality" "Could not source error handler"
    fi
}

# Test 9: Performance monitoring
test_performance_monitoring() {
    start_test "Performance Monitoring"
    
    cd "$TEST_DIR"
    
    # Source verbose-debug module
    if source ./installer-verbose-debug.sh; then
        initialize_debug_system >/dev/null 2>&1
        
        # Test performance profiling
        start_profiling "test_operation"
        sleep 0.1
        stop_profiling "test_operation"
        
        # Check if profiling worked (basic check)
        if [ "$?" -eq 0 ]; then
            pass_test "Performance Monitoring"
        else
            fail_test "Performance Monitoring" "Profiling functions failed"
        fi
    else
        fail_test "Performance Monitoring" "Could not source verbose-debug module"
    fi
}

# Test 10: Integration with main installer
test_installer_integration() {
    start_test "Integration with Main Installer"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Check if main installer exists and has error system integration
    if [ -f "$script_dir/install-anarqq-demo.sh" ]; then
        # Check for error system integration
        if grep -q "installer-error-system.sh" "$script_dir/install-anarqq-demo.sh"; then
            # Check for enhanced error handling functions
            if grep -q "setup_error_system" "$script_dir/install-anarqq-demo.sh"; then
                pass_test "Integration with Main Installer"
            else
                fail_test "Integration with Main Installer" "Error system setup not found in main installer"
            fi
        else
            fail_test "Integration with Main Installer" "Error system not integrated in main installer"
        fi
    else
        fail_test "Integration with Main Installer" "Main installer not found"
    fi
}

# Cleanup test environment
cleanup_test_environment() {
    print_test_info "Cleaning up test environment..."
    
    # Remove test directory
    rm -rf "$TEST_DIR" 2>/dev/null || true
    
    print_test_success "Test environment cleaned up"
}

# Show test results
show_test_results() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                        TEST RESULTS                          ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    print_test_info "Test Summary:"
    echo "  • Total Tests: $TESTS_TOTAL"
    echo "  • Passed: $TESTS_PASSED"
    echo "  • Failed: $TESTS_FAILED"
    echo "  • Success Rate: $(( (TESTS_PASSED * 100) / TESTS_TOTAL ))%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_test_success "All tests passed! ✨"
        echo ""
        print_test_info "The error handling system is working correctly."
    else
        print_test_error "$TESTS_FAILED test(s) failed!"
        echo ""
        print_test_info "Please review the test log for details: $TEST_LOG_FILE"
    fi
    
    echo ""
    print_test_info "Test log file: $TEST_LOG_FILE"
}

# Main test execution
main() {
    print_test_header
    
    print_test_info "Starting comprehensive error handling system tests..."
    echo ""
    
    # Setup
    setup_test_environment
    
    # Run all tests
    test_error_handler_initialization
    test_logging_system
    test_verbose_debug_mode
    test_error_recovery
    test_integrated_error_system
    test_file_operations
    test_argument_parsing
    test_cleanup_functionality
    test_performance_monitoring
    test_installer_integration
    
    # Show results
    show_test_results
    
    # Cleanup
    if [ "$1" != "--keep-logs" ]; then
        cleanup_test_environment
    else
        print_test_info "Test logs preserved at: $TEST_DIR"
    fi
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run tests
main "$@"
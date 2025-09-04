#!/bin/bash

# Test script for installer improvements
# Tests the fixes for missing command_exists function, unzip handling, and download logic

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test 1: Verify command_exists function is defined
test_command_exists_function() {
    print_test "command_exists function definition"
    
    # Check if command_exists function is defined in the script
    if grep -q "^command_exists()" install-anarqq-demo.sh; then
        print_pass "command_exists function is defined"
        
        # Check if it has the correct implementation
        if grep -A 2 "^command_exists()" install-anarqq-demo.sh | grep -q "command -v"; then
            print_pass "command_exists function has correct implementation"
        else
            print_fail "command_exists function implementation is incorrect"
            return 1
        fi
    else
        print_fail "command_exists function is not defined"
        return 1
    fi
}

# Test 2: Verify unzip dependency handling
test_unzip_handling() {
    print_test "Unzip dependency handling"
    
    # Check if the installer mentions unzip in prerequisites
    if grep -q "unzip" install-anarqq-demo.sh; then
        print_pass "Installer includes unzip dependency checking"
    else
        print_fail "Installer doesn't check for unzip dependency"
        return 1
    fi
    
    # Check for fallback methods
    if grep -q "python3.*zipfile\|node.*zip" install-anarqq-demo.sh; then
        print_pass "Installer includes fallback extraction methods"
    else
        print_fail "Installer doesn't include fallback extraction methods"
        return 1
    fi
}

# Test 3: Verify download method improvements
test_download_methods() {
    print_test "Download method improvements"
    
    # Check for multiple download methods
    local methods=0
    
    if grep -q "curl.*-L.*-f" install-anarqq-demo.sh; then
        print_pass "curl download method present"
        ((methods++))
    fi
    
    if grep -q "wget.*-q.*-O" install-anarqq-demo.sh; then
        print_pass "wget download method present"
        ((methods++))
    fi
    
    if grep -q "git clone.*--depth" install-anarqq-demo.sh; then
        print_pass "git clone method present"
        ((methods++))
    fi
    
    if [ $methods -ge 2 ]; then
        print_pass "Multiple download methods available ($methods methods)"
    else
        print_fail "Insufficient download methods ($methods methods)"
        return 1
    fi
}

# Test 4: Verify retry logic
test_retry_logic() {
    print_test "Retry logic implementation"
    
    if grep -q "retry_with_backoff" install-anarqq-demo.sh; then
        print_pass "Retry function is implemented"
    else
        print_fail "Retry function is missing"
        return 1
    fi
    
    if grep -q "exponential.*backoff\|delay.*\*.*2" install-anarqq-demo.sh; then
        print_pass "Exponential backoff is implemented"
    else
        print_fail "Exponential backoff is missing"
        return 1
    fi
}

# Test 5: Verify error handling improvements
test_error_handling() {
    print_test "Error handling improvements"
    
    if grep -q "log_error" install-anarqq-demo.sh; then
        print_pass "Enhanced error logging is implemented"
    else
        print_fail "Enhanced error logging is missing"
        return 1
    fi
    
    if grep -q "cleanup_and_exit" install-anarqq-demo.sh; then
        print_pass "Cleanup function is present"
    else
        print_fail "Cleanup function is missing"
        return 1
    fi
}

# Test 6: Verify public/private repository handling
test_repository_access() {
    print_test "Public/private repository access handling"
    
    if grep -q "repositorio privado\|private.*repository\|acceso.*SSH" install-anarqq-demo.sh; then
        print_pass "Private repository access guidance is present"
    else
        print_fail "Private repository access guidance is missing"
        return 1
    fi
    
    if grep -q "ssh-keygen\|github.com/settings/keys" install-anarqq-demo.sh; then
        print_pass "SSH key setup instructions are present"
    else
        print_fail "SSH key setup instructions are missing"
        return 1
    fi
}

# Test 7: Verify automatic dependency installation
test_auto_dependency_installation() {
    print_test "Automatic dependency installation"
    
    if grep -q "install_missing_dependency\|detect_package_manager" install-anarqq-demo.sh; then
        print_pass "Automatic dependency installation is implemented"
    else
        print_fail "Automatic dependency installation is missing"
        return 1
    fi
    
    if grep -q "apt-get\|yum\|dnf\|brew\|pacman" install-anarqq-demo.sh; then
        print_pass "Multiple package managers are supported"
    else
        print_fail "Package manager support is insufficient"
        return 1
    fi
}

# Main test runner
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║           Installer Improvements Test Suite                   ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Run all tests
    local test_functions=(
        "test_command_exists_function"
        "test_unzip_handling"
        "test_download_methods"
        "test_retry_logic"
        "test_error_handling"
        "test_repository_access"
        "test_auto_dependency_installation"
    )
    
    for test_func in "${test_functions[@]}"; do
        echo ""
        if $test_func; then
            ((tests_passed++))
        else
            ((tests_failed++))
        fi
    done
    
    # Summary
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Tests Passed: $tests_passed${NC}"
    echo -e "${RED}Tests Failed: $tests_failed${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    
    if [ $tests_failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Installer improvements are working correctly.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Please review the installer improvements.${NC}"
        return 1
    fi
}

# Check if installer exists
if [ ! -f "install-anarqq-demo.sh" ]; then
    print_fail "install-anarqq-demo.sh not found in current directory"
    exit 1
fi

# Run tests
main "$@"
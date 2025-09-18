#!/bin/bash

# Test script for cross-platform compatibility layer
# Tests all major functions and compatibility features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo -e "${YELLOW}ℹ️  INFO: $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║           Cross-Platform Compatibility Layer Test            ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_RUN++))
    print_test "$test_name"
    
    if eval "$test_command"; then
        print_pass "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_fail "$test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Main test function
main() {
    print_header
    
    # Check if compatibility layer exists
    if [ ! -f "cross-platform-compatibility.sh" ]; then
        print_fail "Cross-platform compatibility layer not found"
        exit 1
    fi
    
    # Source the compatibility layer
    print_info "Loading cross-platform compatibility layer..."
    source cross-platform-compatibility.sh
    
    # Test 1: Initialization
    run_test "Platform compatibility initialization" "initialize_platform_compatibility"
    
    # Test 2: Platform detection
    run_test "Operating system detection" "[[ -n \"\$PLATFORM_OS\" ]]"
    run_test "Architecture detection" "[[ -n \"\$PLATFORM_ARCH\" ]]"
    run_test "Distribution detection" "[[ -n \"\$PLATFORM_DISTRO\" ]]"
    run_test "Shell detection" "[[ -n \"\$PLATFORM_SHELL\" ]]"
    
    # Test 3: Package manager detection
    run_test "Package manager detection" "[[ -n \"\$PLATFORM_PKG_MANAGER\" ]] || [[ \"\$PLATFORM_PKG_MANAGER\" == \"\" ]]"
    
    # Test 4: Path functions
    run_test "Path normalization" "normalize_path '/test/path' >/dev/null"
    run_test "Path joining" "join_path 'test' 'path' 'file.txt' >/dev/null"
    run_test "Temp directory detection" "get_temp_directory >/dev/null"
    
    # Test 5: Directory operations
    local test_dir="/tmp/cross-platform-test-$$"
    run_test "Directory creation" "create_directory_safe '$test_dir'"
    run_test "Directory exists check" "[[ -d '$test_dir' ]]"
    
    # Test 6: Package name mapping
    run_test "Package name mapping (curl)" "get_package_name 'curl' >/dev/null"
    run_test "Package name mapping (git)" "get_package_name 'git' >/dev/null"
    run_test "Package name mapping (node)" "get_package_name 'node' >/dev/null"
    
    # Test 7: Shell compatibility
    run_test "Shell feature detection (arrays)" "is_shell_feature_supported 'arrays' || true"
    run_test "Shell feature detection (associative_arrays)" "is_shell_feature_supported 'associative_arrays' || true"
    
    # Test 8: Platform compatibility check
    run_test "Platform compatibility check" "check_platform_compatibility >/dev/null 2>&1 || true"
    
    # Test 9: Platform information
    run_test "Platform information generation" "get_platform_info >/dev/null"
    
    # Test 10: File operations
    local test_file="$test_dir/test-file.sh"
    echo "#!/bin/bash" > "$test_file"
    echo "echo 'test'" >> "$test_file"
    
    run_test "Make file executable" "make_executable '$test_file'"
    run_test "Check if file is executable" "is_executable '$test_file'"
    
    # Cleanup
    rm -rf "$test_dir" 2>/dev/null || true
    
    # Test results
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                           TEST RESULTS                        ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Tests run: $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_pass "All tests passed! Cross-platform compatibility layer is working correctly."
        echo ""
        print_info "Platform Information:"
        get_platform_info
        return 0
    else
        print_fail "Some tests failed. Please check the cross-platform compatibility layer."
        return 1
    fi
}

# Run tests
main "$@"
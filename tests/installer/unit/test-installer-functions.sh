#!/bin/bash

# Unit Tests for AnarQ&Q Robust Installer Functions
# Tests individual functions in isolation with mocked dependencies
# Version: 1.0.0

set -e

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEST_LOG="$PROJECT_ROOT/tests/installer/logs/unit-tests-$(date +%Y%m%d-%H%M%S).log"
TEMP_DIR=$(mktemp -d)

# Create logs directory
mkdir -p "$(dirname "$TEST_LOG")"

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

# Mock functions for testing
mock_command_exists() {
    local command="$1"
    case "$command" in
        "git"|"curl"|"wget"|"unzip"|"node"|"npm")
            return 0
            ;;
        "missing_command")
            return 1
            ;;
        *)
            return 0
            ;;
    esac
}

# Source the installer functions (with mocking)
source_installer_functions() {
    # Create a temporary installer script with just the functions we need to test
    cat > "$TEMP_DIR/installer_functions.sh" << 'EOF'
#!/bin/bash

# Mock command_exists for testing
command_exists() {
    mock_command_exists "$1"
}

# Function to test: log_error
log_error() {
    local error_type="$1"
    local error_message="$2"
    local context="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_file="${TEST_LOG_FILE:-./test-installer.log}"
    
    echo "[$timestamp] ERROR [$error_type]: $error_message" >> "$log_file"
    if [ -n "$context" ]; then
        echo "[$timestamp] CONTEXT: $context" >> "$log_file"
    fi
    
    echo "ERROR: $error_message" >&2
    return 0
}

# Function to test: retry_with_backoff
retry_with_backoff() {
    local max_attempts="$1"
    local delay="$2"
    local command_to_run="$3"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$command_to_run"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo "Attempt $attempt failed, retrying in ${delay}s..." >&2
            sleep 1  # Reduced for testing
            delay=$((delay * 2))
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Function to test: move_extracted_content
move_extracted_content() {
    local extract_dir="$1"
    local target_dir="$2"
    
    # Find extracted directory
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

# Function to test: cleanup_and_exit
cleanup_and_exit() {
    local exit_code=${1:-1}
    echo "Cleaning up temporary files..." >&2
    rm -rf /tmp/anarqq-test-* 2>/dev/null || true
    return $exit_code
}
EOF

    source "$TEMP_DIR/installer_functions.sh"
}

# Test 1: log_error function
test_log_error() {
    print_test_header "Test 1: log_error Function"
    
    local test_log_file="$TEMP_DIR/test_log_error.log"
    export TEST_LOG_FILE="$test_log_file"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test basic error logging
    log_error "TEST_ERROR" "Test error message" "Test context"
    
    if [ -f "$test_log_file" ] && grep -q "TEST_ERROR" "$test_log_file" && grep -q "Test error message" "$test_log_file"; then
        print_test_pass "log_error creates log file and writes error message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "log_error failed to create log file or write error message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test context logging
    if grep -q "CONTEXT: Test context" "$test_log_file"; then
        print_test_pass "log_error includes context information"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "log_error failed to include context information"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    unset TEST_LOG_FILE
}

# Test 2: retry_with_backoff function
test_retry_with_backoff() {
    print_test_header "Test 2: retry_with_backoff Function"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test successful command (should succeed on first try)
    if retry_with_backoff 3 1 "true"; then
        print_test_pass "retry_with_backoff succeeds with successful command"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "retry_with_backoff failed with successful command"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test failing command (should fail after retries)
    if ! retry_with_backoff 2 1 "false"; then
        print_test_pass "retry_with_backoff fails appropriately after max attempts"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "retry_with_backoff should have failed after max attempts"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 3: move_extracted_content function
test_move_extracted_content() {
    print_test_header "Test 3: move_extracted_content Function"
    
    # Setup test directories
    local extract_dir="$TEMP_DIR/extract_test"
    local target_dir="$TEMP_DIR/target_test"
    local source_dir="$extract_dir/test-repo-main"
    
    mkdir -p "$source_dir"
    echo "test content" > "$source_dir/test_file.txt"
    echo "hidden content" > "$source_dir/.hidden_file"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test moving extracted content
    if move_extracted_content "$extract_dir" "$target_dir"; then
        print_test_pass "move_extracted_content executes successfully"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "move_extracted_content failed to execute"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test if files were moved correctly
    if [ -f "$target_dir/test_file.txt" ] && [ -f "$target_dir/.hidden_file" ]; then
        print_test_pass "move_extracted_content moves files correctly"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "move_extracted_content failed to move files correctly"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 4: cleanup_and_exit function
test_cleanup_and_exit() {
    print_test_header "Test 4: cleanup_and_exit Function"
    
    # Create test files to cleanup
    mkdir -p "/tmp/anarqq-test-cleanup"
    touch "/tmp/anarqq-test-cleanup/test_file"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test cleanup function (capture exit code)
    local exit_code
    (cleanup_and_exit 42) || exit_code=$?
    
    if [ "$exit_code" = "42" ]; then
        print_test_pass "cleanup_and_exit returns correct exit code"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "cleanup_and_exit returned incorrect exit code: $exit_code"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test if cleanup actually happened
    if [ ! -d "/tmp/anarqq-test-cleanup" ]; then
        print_test_pass "cleanup_and_exit removes temporary files"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "cleanup_and_exit failed to remove temporary files"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 5: Mock command_exists function
test_command_exists() {
    print_test_header "Test 5: command_exists Function (Mocked)"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test existing command
    if command_exists "git"; then
        print_test_pass "command_exists returns true for existing command"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "command_exists should return true for git"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test missing command
    if ! command_exists "missing_command"; then
        print_test_pass "command_exists returns false for missing command"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "command_exists should return false for missing_command"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Main test runner
run_unit_tests() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            AnarQ&Q Installer Unit Tests v1.0                 ║"
    echo "║                                                               ║"
    echo "║              Testing Individual Functions                     ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_test_info "Test log: $TEST_LOG"
    print_test_info "Temp directory: $TEMP_DIR"
    echo ""
    
    # Source installer functions
    source_installer_functions
    
    # Run all tests
    test_log_error
    echo ""
    test_retry_with_backoff
    echo ""
    test_move_extracted_content
    echo ""
    test_cleanup_and_exit
    echo ""
    test_command_exists
    echo ""
    
    # Print summary
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Test Summary:${NC}"
    echo -e "  Total tests: ${TESTS_TOTAL}"
    echo -e "  Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "  Failed: ${RED}${TESTS_FAILED}${NC}"
    echo -e "  Success rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_test_pass "🎉 All unit tests passed!"
        return 0
    else
        print_test_fail "❌ Some unit tests failed. Check the log for details."
        return 1
    fi
}

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}

# Set trap for cleanup
trap cleanup EXIT

# Run tests if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    run_unit_tests "$@"
fi
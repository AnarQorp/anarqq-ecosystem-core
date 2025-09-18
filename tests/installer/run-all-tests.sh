#!/bin/bash

# AnarQ&Q Installer Test Suite Runner
# Runs all installer tests: unit, integration, and platform tests
# Version: 1.0.0

set -e

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_LOG="$SCRIPT_DIR/logs/test-suite-$(date +%Y%m%d-%H%M%S).log"

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test suite counters
SUITES_TOTAL=0
SUITES_PASSED=0
SUITES_FAILED=0

# Logging function
log_suite() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$TEST_LOG"
}

# Output functions
print_suite_header() {
    echo -e "${PURPLE}$1${NC}"
    log_suite "INFO" "Starting suite: $1"
}

print_suite_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    log_suite "PASS" "$1"
}

print_suite_fail() {
    echo -e "${RED}❌ $1${NC}"
    log_suite "FAIL" "$1"
}

print_suite_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log_suite "INFO" "$1"
}

# Function to run a test suite
run_test_suite() {
    local suite_name="$1"
    local suite_script="$2"
    local suite_description="$3"
    
    print_suite_header "Running $suite_name: $suite_description"
    
    SUITES_TOTAL=$((SUITES_TOTAL + 1))
    
    if [ ! -f "$suite_script" ]; then
        print_suite_fail "$suite_name: Test script not found: $suite_script"
        SUITES_FAILED=$((SUITES_FAILED + 1))
        return 1
    fi
    
    if [ ! -x "$suite_script" ]; then
        chmod +x "$suite_script"
    fi
    
    # Run the test suite and capture output
    local suite_output
    local suite_exit_code
    
    if suite_output=$("$suite_script" 2>&1); then
        suite_exit_code=0
    else
        suite_exit_code=$?
    fi
    
    # Log the output
    echo "$suite_output" >> "$TEST_LOG"
    
    if [ $suite_exit_code -eq 0 ]; then
        print_suite_pass "$suite_name: All tests passed"
        SUITES_PASSED=$((SUITES_PASSED + 1))
        return 0
    else
        print_suite_fail "$suite_name: Some tests failed (exit code: $suite_exit_code)"
        SUITES_FAILED=$((SUITES_FAILED + 1))
        echo "Last 10 lines of output:"
        echo "$suite_output" | tail -10
        return 1
    fi
}

# Function to check prerequisites
check_test_prerequisites() {
    print_suite_info "Checking test prerequisites..."
    
    local missing_commands=()
    
    # Check for required commands
    local required_commands=("bash" "grep" "sed" "awk" "find" "mkdir" "chmod")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [ ${#missing_commands[@]} -gt 0 ]; then
        print_suite_fail "Missing required commands: ${missing_commands[*]}"
        return 1
    fi
    
    # Check if installer script exists
    if [ ! -f "$PROJECT_ROOT/install-anarqq-robust-enhanced.sh" ]; then
        print_suite_fail "Main installer script not found: install-anarqq-robust-enhanced.sh"
        return 1
    fi
    
    print_suite_pass "All prerequisites satisfied"
    return 0
}

# Function to generate test report
generate_test_report() {
    local report_file="$SCRIPT_DIR/logs/test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# AnarQ&Q Installer Test Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')  
**Platform:** $(uname -s) $(uname -r)  
**Shell:** $SHELL  
**Bash Version:** ${BASH_VERSION:-N/A}  

## Test Suite Summary

| Suite | Status | Description |
|-------|--------|-------------|
| Unit Tests | $([ -f "$SCRIPT_DIR/unit/test-installer-functions.sh" ] && echo "✅ Available" || echo "❌ Missing") | Tests individual installer functions |
| Integration Tests | $([ -f "$SCRIPT_DIR/integration/test-installation-flows.sh" ] && echo "✅ Available" || echo "❌ Missing") | Tests complete installation flows |
| Platform Tests | $([ -f "$SCRIPT_DIR/platform/test-cross-platform.sh" ] && echo "✅ Available" || echo "❌ Missing") | Tests cross-platform compatibility |

## Results

- **Total Suites:** $SUITES_TOTAL
- **Passed:** $SUITES_PASSED
- **Failed:** $SUITES_FAILED
- **Success Rate:** $(( SUITES_TOTAL > 0 ? SUITES_PASSED * 100 / SUITES_TOTAL : 0 ))%

## Test Environment

\`\`\`bash
OS: $(uname -a)
Node.js: $(command -v node >/dev/null && node --version || echo "Not available")
NPM: $(command -v npm >/dev/null && npm --version || echo "Not available")
Git: $(command -v git >/dev/null && git --version || echo "Not available")
Curl: $(command -v curl >/dev/null && curl --version | head -1 || echo "Not available")
Wget: $(command -v wget >/dev/null && wget --version | head -1 || echo "Not available")
\`\`\`

## Detailed Logs

See full test logs in: \`$TEST_LOG\`

EOF

    print_suite_info "Test report generated: $report_file"
}

# Main function
main() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║           AnarQ&Q Installer Test Suite v1.0                  ║"
    echo "║                                                               ║"
    echo "║              Comprehensive Testing Framework                  ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_suite_info "Test suite log: $TEST_LOG"
    print_suite_info "Project root: $PROJECT_ROOT"
    echo ""
    
    # Check prerequisites
    if ! check_test_prerequisites; then
        print_suite_fail "Prerequisites check failed. Aborting test suite."
        exit 1
    fi
    
    echo ""
    
    # Run test suites
    print_suite_info "Starting test suite execution..."
    echo ""
    
    # Unit Tests
    run_test_suite \
        "Unit Tests" \
        "$SCRIPT_DIR/unit/test-installer-functions.sh" \
        "Testing individual installer functions"
    
    echo ""
    
    # Integration Tests
    run_test_suite \
        "Integration Tests" \
        "$SCRIPT_DIR/integration/test-installation-flows.sh" \
        "Testing complete installation flows"
    
    echo ""
    
    # Platform Tests
    run_test_suite \
        "Platform Tests" \
        "$SCRIPT_DIR/platform/test-cross-platform.sh" \
        "Testing cross-platform compatibility"
    
    echo ""
    
    # Generate report
    generate_test_report
    
    # Print final summary
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Final Test Suite Summary:${NC}"
    echo -e "  Total suites: ${SUITES_TOTAL}"
    echo -e "  Passed: ${GREEN}${SUITES_PASSED}${NC}"
    echo -e "  Failed: ${RED}${SUITES_FAILED}${NC}"
    echo -e "  Success rate: $(( SUITES_TOTAL > 0 ? SUITES_PASSED * 100 / SUITES_TOTAL : 0 ))%"
    echo ""
    
    if [ $SUITES_FAILED -eq 0 ]; then
        print_suite_pass "🎉 All test suites passed! The installer is ready for production."
        exit 0
    else
        print_suite_fail "❌ Some test suites failed. Please review the logs and fix issues."
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "unit")
        run_test_suite \
            "Unit Tests" \
            "$SCRIPT_DIR/unit/test-installer-functions.sh" \
            "Testing individual installer functions"
        ;;
    "integration")
        run_test_suite \
            "Integration Tests" \
            "$SCRIPT_DIR/integration/test-installation-flows.sh" \
            "Testing complete installation flows"
        ;;
    "platform")
        run_test_suite \
            "Platform Tests" \
            "$SCRIPT_DIR/platform/test-cross-platform.sh" \
            "Testing cross-platform compatibility"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [unit|integration|platform|help]"
        echo ""
        echo "Options:"
        echo "  unit         Run only unit tests"
        echo "  integration  Run only integration tests"
        echo "  platform     Run only platform tests"
        echo "  help         Show this help message"
        echo ""
        echo "If no option is provided, all test suites will be run."
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac
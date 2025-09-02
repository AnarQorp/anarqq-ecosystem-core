#!/bin/bash

# Comprehensive Identity System Testing Script
# Runs all system tests including unit, integration, e2e, and performance tests
# Requirements: Task 14.2 - Comprehensive system testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=600000  # 10 minutes
MEMORY_LIMIT=4096    # 4GB
COVERAGE_THRESHOLD=80

echo -e "${BLUE}🧪 Starting Comprehensive Identity System Testing${NC}"
echo "=================================================="

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to run tests with error handling
run_test_suite() {
    local test_name="$1"
    local test_pattern="$2"
    local timeout="${3:-$TEST_TIMEOUT}"
    
    echo -e "\n${YELLOW}Running $test_name...${NC}"
    
    if npx vitest run "$test_pattern" --timeout="$timeout" --reporter=verbose; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Function to check system requirements
check_requirements() {
    print_section "Checking System Requirements"
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js version: $NODE_VERSION"
    else
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check available memory
    if command -v free &> /dev/null; then
        AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$AVAILABLE_MEMORY" -lt 2048 ]; then
            print_warning "Low available memory: ${AVAILABLE_MEMORY}MB (recommended: 2048MB+)"
        else
            print_success "Available memory: ${AVAILABLE_MEMORY}MB"
        fi
    fi
    
    # Check disk space
    if command -v df &> /dev/null; then
        AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}')
        print_success "Available disk space: $AVAILABLE_DISK"
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_section "Setting Up Test Environment"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Create test results directory
    mkdir -p test-results
    
    # Set environment variables for testing
    export NODE_ENV=test
    export VITEST_TIMEOUT=$TEST_TIMEOUT
    export NODE_OPTIONS="--max-old-space-size=$MEMORY_LIMIT"
    
    print_success "Test environment configured"
}

# Function to run unit tests
run_unit_tests() {
    print_section "Unit Tests"
    
    local unit_test_patterns=(
        "src/**/*.test.ts"
        "src/**/*.test.tsx"
        "src/services/**/*.test.*"
        "src/hooks/**/*.test.*"
        "src/components/**/*.test.*"
    )
    
    local failed_tests=0
    
    for pattern in "${unit_test_patterns[@]}"; do
        if ! run_test_suite "Unit Tests ($pattern)" "$pattern" 300000; then
            ((failed_tests++))
        fi
    done
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All unit tests passed"
    else
        print_error "$failed_tests unit test suite(s) failed"
    fi
    
    return $failed_tests
}

# Function to run integration tests
run_integration_tests() {
    print_section "Integration Tests"
    
    if run_test_suite "Integration Tests" "src/__tests__/integration/**/*.test.ts" 600000; then
        print_success "Integration tests completed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run end-to-end tests
run_e2e_tests() {
    print_section "End-to-End Tests"
    
    if run_test_suite "E2E Tests" "src/__tests__/e2e/**/*.test.tsx" 900000; then
        print_success "E2E tests completed"
        return 0
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_section "Performance Tests"
    
    # Increase memory limit for performance tests
    export NODE_OPTIONS="--max-old-space-size=8192"
    
    if run_test_suite "Performance Tests" "src/__tests__/performance/**/*.test.ts" 1800000; then
        print_success "Performance tests completed"
        return 0
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Function to run system tests
run_system_tests() {
    print_section "System Tests"
    
    # Increase memory limit for system tests
    export NODE_OPTIONS="--max-old-space-size=8192"
    
    if run_test_suite "System Tests" "src/__tests__/system/**/*.test.ts" 1800000; then
        print_success "System tests completed"
        return 0
    else
        print_error "System tests failed"
        return 1
    fi
}

# Function to generate test coverage report
generate_coverage_report() {
    print_section "Generating Coverage Report"
    
    echo "Running tests with coverage..."
    if npx vitest run --coverage --reporter=verbose; then
        print_success "Coverage report generated"
        
        # Check coverage threshold
        if command -v jq &> /dev/null && [ -f "coverage/coverage-summary.json" ]; then
            COVERAGE=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
            if (( $(echo "$COVERAGE >= $COVERAGE_THRESHOLD" | bc -l) )); then
                print_success "Coverage threshold met: ${COVERAGE}% (required: ${COVERAGE_THRESHOLD}%)"
            else
                print_warning "Coverage below threshold: ${COVERAGE}% (required: ${COVERAGE_THRESHOLD}%)"
            fi
        fi
    else
        print_error "Coverage report generation failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_section "Security Tests"
    
    # Run security-specific tests
    local security_patterns=(
        "src/**/*security*.test.*"
        "src/**/*audit*.test.*"
        "src/**/*validation*.test.*"
    )
    
    local failed_tests=0
    
    for pattern in "${security_patterns[@]}"; do
        if ls $pattern 1> /dev/null 2>&1; then
            if ! run_test_suite "Security Tests ($pattern)" "$pattern" 300000; then
                ((failed_tests++))
            fi
        fi
    done
    
    if [ $failed_tests -eq 0 ]; then
        print_success "Security tests completed"
    else
        print_error "$failed_tests security test suite(s) failed"
    fi
    
    return $failed_tests
}

# Function to validate test results
validate_test_results() {
    print_section "Validating Test Results"
    
    local validation_passed=true
    
    # Check for test result files
    if [ -d "test-results" ]; then
        local result_files=$(find test-results -name "*.xml" -o -name "*.json" | wc -l)
        if [ $result_files -gt 0 ]; then
            print_success "Found $result_files test result files"
        else
            print_warning "No test result files found"
        fi
    fi
    
    # Check for coverage files
    if [ -d "coverage" ]; then
        if [ -f "coverage/lcov.info" ]; then
            print_success "Coverage report generated"
        else
            print_warning "Coverage report not found"
            validation_passed=false
        fi
    fi
    
    # Check memory usage
    if command -v ps &> /dev/null; then
        local memory_usage=$(ps -o pid,vsz,rss,comm -p $$ | tail -1 | awk '{print $3}')
        if [ "$memory_usage" -gt 2097152 ]; then # 2GB in KB
            print_warning "High memory usage detected: ${memory_usage}KB"
        else
            print_success "Memory usage within limits: ${memory_usage}KB"
        fi
    fi
    
    if [ "$validation_passed" = true ]; then
        print_success "Test result validation passed"
        return 0
    else
        print_error "Test result validation failed"
        return 1
    fi
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_section "Cleaning Up Test Environment"
    
    # Remove temporary test files
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name "test-*.log" -delete 2>/dev/null || true
    
    # Clear test databases/storage
    rm -rf .test-storage 2>/dev/null || true
    
    print_success "Test environment cleaned up"
}

# Function to generate final report
generate_final_report() {
    print_section "Generating Final Report"
    
    local report_file="test-results/comprehensive-test-report.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$report_file" << EOF
# Comprehensive Identity System Test Report

**Generated:** $timestamp
**Test Suite:** Identity Management System
**Environment:** $(uname -s) $(uname -r)
**Node.js:** $(node --version)

## Test Results Summary

| Test Suite | Status | Duration | Notes |
|------------|--------|----------|-------|
| Unit Tests | $UNIT_TEST_STATUS | $UNIT_TEST_DURATION | $UNIT_TEST_NOTES |
| Integration Tests | $INTEGRATION_TEST_STATUS | $INTEGRATION_TEST_DURATION | $INTEGRATION_TEST_NOTES |
| E2E Tests | $E2E_TEST_STATUS | $E2E_TEST_DURATION | $E2E_TEST_NOTES |
| Performance Tests | $PERFORMANCE_TEST_STATUS | $PERFORMANCE_TEST_DURATION | $PERFORMANCE_TEST_NOTES |
| System Tests | $SYSTEM_TEST_STATUS | $SYSTEM_TEST_DURATION | $SYSTEM_TEST_NOTES |
| Security Tests | $SECURITY_TEST_STATUS | $SECURITY_TEST_DURATION | $SECURITY_TEST_NOTES |

## Coverage Report

- **Lines:** ${COVERAGE_LINES:-N/A}%
- **Functions:** ${COVERAGE_FUNCTIONS:-N/A}%
- **Branches:** ${COVERAGE_BRANCHES:-N/A}%
- **Statements:** ${COVERAGE_STATEMENTS:-N/A}%

## Performance Metrics

- **Average Identity Creation:** ${AVG_CREATION_TIME:-N/A}ms
- **Average Identity Switch:** ${AVG_SWITCH_TIME:-N/A}ms
- **Memory Usage:** ${PEAK_MEMORY_USAGE:-N/A}MB
- **Concurrent Operations:** ${CONCURRENT_SUCCESS_RATE:-N/A}%

## Recommendations

$(if [ "$OVERALL_STATUS" = "PASSED" ]; then
    echo "✅ All tests passed successfully. System is ready for deployment."
else
    echo "❌ Some tests failed. Review failed test suites before deployment."
fi)

## Test Artifacts

- Coverage Report: \`coverage/lcov-report/index.html\`
- Test Results: \`test-results/\`
- Performance Logs: \`test-results/performance-*.log\`

EOF

    print_success "Final report generated: $report_file"
}

# Main execution flow
main() {
    local start_time=$(date +%s)
    local failed_suites=0
    
    # Initialize status variables
    UNIT_TEST_STATUS="PENDING"
    INTEGRATION_TEST_STATUS="PENDING"
    E2E_TEST_STATUS="PENDING"
    PERFORMANCE_TEST_STATUS="PENDING"
    SYSTEM_TEST_STATUS="PENDING"
    SECURITY_TEST_STATUS="PENDING"
    
    echo -e "${BLUE}Starting comprehensive identity system testing...${NC}"
    echo "Test configuration:"
    echo "  - Timeout: ${TEST_TIMEOUT}ms"
    echo "  - Memory limit: ${MEMORY_LIMIT}MB"
    echo "  - Coverage threshold: ${COVERAGE_THRESHOLD}%"
    
    # Check system requirements
    check_requirements
    
    # Setup test environment
    setup_test_environment
    
    # Run test suites
    echo -e "\n${BLUE}🚀 Executing Test Suites${NC}"
    echo "=========================="
    
    # Unit Tests
    if run_unit_tests; then
        UNIT_TEST_STATUS="PASSED"
    else
        UNIT_TEST_STATUS="FAILED"
        ((failed_suites++))
    fi
    
    # Integration Tests
    if run_integration_tests; then
        INTEGRATION_TEST_STATUS="PASSED"
    else
        INTEGRATION_TEST_STATUS="FAILED"
        ((failed_suites++))
    fi
    
    # E2E Tests
    if run_e2e_tests; then
        E2E_TEST_STATUS="PASSED"
    else
        E2E_TEST_STATUS="FAILED"
        ((failed_suites++))
    fi
    
    # Performance Tests
    if run_performance_tests; then
        PERFORMANCE_TEST_STATUS="PASSED"
    else
        PERFORMANCE_TEST_STATUS="FAILED"
        ((failed_suites++))
    fi
    
    # System Tests
    if run_system_tests; then
        SYSTEM_TEST_STATUS="PASSED"
    else
        SYSTEM_TEST_STATUS="FAILED"
        ((failed_suites++))
    fi
    
    # Security Tests
    if run_security_tests; then
        SECURITY_TEST_STATUS="PASSED"
    else
        SECURITY_TEST_STATUS="FAILED"
        ((failed_suites++))
    fi
    
    # Generate coverage report
    generate_coverage_report
    
    # Validate results
    validate_test_results
    
    # Calculate total duration
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Generate final report
    if [ $failed_suites -eq 0 ]; then
        OVERALL_STATUS="PASSED"
    else
        OVERALL_STATUS="FAILED"
    fi
    
    generate_final_report
    
    # Cleanup
    cleanup_test_environment
    
    # Final summary
    print_section "Test Execution Summary"
    echo "Total duration: ${total_duration}s"
    echo "Failed test suites: $failed_suites"
    
    if [ $failed_suites -eq 0 ]; then
        print_success "🎉 All test suites passed! System is ready for deployment."
        exit 0
    else
        print_error "💥 $failed_suites test suite(s) failed. Review the results before deployment."
        exit 1
    fi
}

# Handle script interruption
trap 'echo -e "\n${RED}Test execution interrupted${NC}"; cleanup_test_environment; exit 130' INT TERM

# Run main function
main "$@"
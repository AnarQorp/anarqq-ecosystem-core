#!/bin/bash

# Module Registration Test Runner
# Runs comprehensive test suite for Qwallet module registration system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="src/__tests__/module-registration"
COVERAGE_DIR="coverage/module-registration"
REPORTS_DIR="test-results/module-registration"

# Create directories
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORTS_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run test category
run_test_category() {
    local category=$1
    local description=$2
    
    print_status "Running $description tests..."
    
    if npx vitest run "$TEST_DIR/$category" --reporter=verbose --coverage.enabled=true --coverage.reportsDirectory="$COVERAGE_DIR/$category" 2>&1 | tee "$REPORTS_DIR/$category.log"; then
        print_success "$description tests completed successfully"
        return 0
    else
        print_error "$description tests failed"
        return 1
    fi
}

# Function to run performance tests with timeout
run_performance_tests() {
    print_status "Running performance tests with extended timeout..."
    
    if timeout 300 npx vitest run "$TEST_DIR/performance" --reporter=verbose --testTimeout=60000 2>&1 | tee "$REPORTS_DIR/performance.log"; then
        print_success "Performance tests completed successfully"
        return 0
    else
        print_error "Performance tests failed or timed out"
        return 1
    fi
}

# Function to generate coverage report
generate_coverage_report() {
    print_status "Generating comprehensive coverage report..."
    
    npx vitest run "$TEST_DIR" --coverage.enabled=true --coverage.reportsDirectory="$COVERAGE_DIR" --coverage.reporter=html --coverage.reporter=lcov --coverage.reporter=json-summary
    
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        print_success "Coverage report generated at $COVERAGE_DIR/index.html"
    else
        print_warning "Coverage report generation may have failed"
    fi
}

# Function to check coverage thresholds
check_coverage_thresholds() {
    print_status "Checking coverage thresholds..."
    
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        # Extract coverage percentages using node
        node -e "
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('$COVERAGE_DIR/coverage-summary.json', 'utf8'));
            const total = coverage.total;
            
            console.log('Coverage Summary:');
            console.log('Lines: ' + total.lines.pct + '%');
            console.log('Functions: ' + total.functions.pct + '%');
            console.log('Branches: ' + total.branches.pct + '%');
            console.log('Statements: ' + total.statements.pct + '%');
            
            const threshold = 85;
            const failed = [];
            
            if (total.lines.pct < threshold) failed.push('lines');
            if (total.functions.pct < threshold) failed.push('functions');
            if (total.branches.pct < threshold) failed.push('branches');
            if (total.statements.pct < threshold) failed.push('statements');
            
            if (failed.length > 0) {
                console.error('Coverage threshold failures: ' + failed.join(', '));
                process.exit(1);
            } else {
                console.log('All coverage thresholds met!');
            }
        "
        
        if [ $? -eq 0 ]; then
            print_success "Coverage thresholds met"
        else
            print_error "Coverage thresholds not met"
            return 1
        fi
    else
        print_warning "Coverage summary not found, skipping threshold check"
    fi
}

# Function to run security tests with special configuration
run_security_tests() {
    print_status "Running security tests with enhanced validation..."
    
    # Set security test environment variables
    export NODE_ENV=test
    export SECURITY_TEST_MODE=true
    
    if npx vitest run "$TEST_DIR/security" --reporter=verbose --testTimeout=30000 2>&1 | tee "$REPORTS_DIR/security.log"; then
        print_success "Security tests completed successfully"
        return 0
    else
        print_error "Security tests failed"
        return 1
    fi
}

# Main execution
main() {
    local test_type=${1:-"all"}
    local failed_tests=()
    
    print_status "Starting Module Registration Test Suite"
    print_status "Test type: $test_type"
    print_status "Timestamp: $(date)"
    
    case $test_type in
        "unit")
            print_status "Running unit tests only"
            run_test_category "unit" "Unit" || failed_tests+=("unit")
            ;;
        "integration")
            print_status "Running integration tests only"
            run_test_category "integration" "Integration" || failed_tests+=("integration")
            ;;
        "e2e")
            print_status "Running end-to-end tests only"
            run_test_category "e2e" "End-to-End" || failed_tests+=("e2e")
            ;;
        "security")
            print_status "Running security tests only"
            run_security_tests || failed_tests+=("security")
            ;;
        "performance")
            print_status "Running performance tests only"
            run_performance_tests || failed_tests+=("performance")
            ;;
        "coverage")
            print_status "Running coverage analysis only"
            generate_coverage_report
            check_coverage_thresholds || failed_tests+=("coverage")
            ;;
        "all"|*)
            print_status "Running complete test suite"
            
            # Run all test categories
            run_test_category "unit" "Unit" || failed_tests+=("unit")
            run_test_category "integration" "Integration" || failed_tests+=("integration")
            run_test_category "e2e" "End-to-End" || failed_tests+=("e2e")
            run_security_tests || failed_tests+=("security")
            run_performance_tests || failed_tests+=("performance")
            
            # Generate coverage report
            generate_coverage_report
            check_coverage_thresholds || failed_tests+=("coverage")
            ;;
    esac
    
    # Summary
    echo
    print_status "Test Suite Summary"
    print_status "=================="
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        print_success "All tests passed successfully!"
        echo
        print_status "Test artifacts:"
        print_status "- Logs: $REPORTS_DIR/"
        print_status "- Coverage: $COVERAGE_DIR/index.html"
        exit 0
    else
        print_error "The following test categories failed:"
        for test in "${failed_tests[@]}"; do
            print_error "  - $test"
        done
        echo
        print_status "Check logs in $REPORTS_DIR/ for details"
        exit 1
    fi
}

# Help function
show_help() {
    echo "Module Registration Test Runner"
    echo
    echo "Usage: $0 [test_type]"
    echo
    echo "Test types:"
    echo "  unit         Run unit tests only"
    echo "  integration  Run integration tests only"
    echo "  e2e          Run end-to-end tests only"
    echo "  security     Run security tests only"
    echo "  performance  Run performance tests only"
    echo "  coverage     Run coverage analysis only"
    echo "  all          Run all tests (default)"
    echo
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 unit              # Run unit tests only"
    echo "  $0 performance       # Run performance tests only"
    echo
    echo "Environment variables:"
    echo "  NODE_ENV             Set to 'test' for testing"
    echo "  SECURITY_TEST_MODE   Set to 'true' for security tests"
    echo
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Check if vitest is available
if ! command -v npx &> /dev/null; then
    print_error "npx is not available. Please install Node.js and npm."
    exit 1
fi

# Check if vitest is installed
if ! npx vitest --version &> /dev/null; then
    print_error "Vitest is not installed. Please run 'npm install' first."
    exit 1
fi

# Run main function
main "$@"
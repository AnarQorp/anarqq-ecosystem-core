#!/bin/bash

# Qwallet Identity Expansion Test Runner
# Comprehensive test suite for all qwallet-related functionality

set -e

echo "🧪 Starting Qwallet Identity Expansion Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test categories
UNIT_TESTS="src/components/qwallet/__tests__/*.test.tsx src/hooks/__tests__/useIdentityQwallet.test.ts src/hooks/__tests__/useQwalletPlugins.test.ts src/hooks/__tests__/useQwalletState.test.ts"
INTEGRATION_TESTS="src/__tests__/integration/qwallet-identity-switching.test.ts src/__tests__/integration/identity-ecosystem-integration.test.ts"
E2E_TESTS="src/__tests__/e2e/qwallet-end-to-end.test.tsx"
PERFORMANCE_TESTS="src/__tests__/performance/qwallet-performance.test.ts"
SECURITY_TESTS="src/__tests__/security/qwallet-security-permissions.test.ts"

# Function to run test category
run_test_category() {
    local category_name=$1
    local test_pattern=$2
    local description=$3
    
    echo -e "\n${BLUE}📋 Running $category_name${NC}"
    echo -e "${YELLOW}$description${NC}"
    echo "----------------------------------------"
    
    if npx vitest run $test_pattern --reporter=verbose; then
        echo -e "${GREEN}✅ $category_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $category_name failed${NC}"
        return 1
    fi
}

# Function to run coverage analysis
run_coverage() {
    echo -e "\n${BLUE}📊 Running Coverage Analysis${NC}"
    echo "----------------------------------------"
    
    npx vitest run --coverage \
        --coverage.include="src/components/qwallet/**" \
        --coverage.include="src/hooks/useIdentityQwallet.ts" \
        --coverage.include="src/hooks/useQwalletPlugins.ts" \
        --coverage.include="src/hooks/useQwalletState.ts" \
        --coverage.include="src/services/QwalletPluginManager.ts" \
        --coverage.include="src/api/qwallet.ts" \
        --coverage.reporter=text \
        --coverage.reporter=html \
        --coverage.reporter=lcov
}

# Function to generate test report
generate_report() {
    echo -e "\n${BLUE}📄 Generating Test Report${NC}"
    echo "----------------------------------------"
    
    cat > test-results/qwallet-test-report.md << EOF
# Qwallet Identity Expansion Test Report

Generated on: $(date)

## Test Categories

### Unit Tests
- **Components**: QwalletDashboard, TokenTransferForm, PiWalletInterface, NFTGallery
- **Hooks**: useIdentityQwallet, useQwalletPlugins, useQwalletState
- **Coverage**: Component rendering, user interactions, error handling, accessibility

### Integration Tests
- **Identity Switching**: Cross-identity wallet operations
- **Ecosystem Integration**: Integration with Qonsent, Qlock, Qerberos, Qindex
- **Pi Wallet Integration**: External wallet linking and operations

### End-to-End Tests
- **Complete User Journeys**: Dashboard → Transfer → Confirmation
- **Multi-Identity Workflows**: ROOT, DAO, CONSENTIDA, AID scenarios
- **Error Recovery**: Network failures, permission denials, validation errors

### Performance Tests
- **Identity Switching Performance**: Response times, memory usage
- **Load Testing**: Concurrent users, high transaction volumes
- **Resource Optimization**: Caching, batching, cleanup

### Security Tests
- **Permission Validation**: Identity-based access controls
- **Transaction Security**: Signature validation, audit logging
- **Input Validation**: Address formats, amount limits, token types
- **Rate Limiting**: Abuse prevention, suspicious activity detection

## Test Results Summary

$(if [ -f "test-results/results.json" ]; then cat test-results/results.json; else echo "Results will be populated after test run"; fi)

## Coverage Report

Coverage reports are available in:
- HTML: \`coverage/index.html\`
- LCOV: \`coverage/lcov.info\`

## Recommendations

1. Maintain >90% test coverage for critical wallet operations
2. Add new tests for any new identity types or permissions
3. Update security tests when adding new validation rules
4. Monitor performance benchmarks for regression detection
EOF

    echo -e "${GREEN}✅ Test report generated: test-results/qwallet-test-report.md${NC}"
}

# Main execution
main() {
    local failed_categories=0
    
    # Create test results directory
    mkdir -p test-results
    
    # Run test categories
    if ! run_test_category "Unit Tests" "$UNIT_TESTS" "Testing individual components and hooks"; then
        ((failed_categories++))
    fi
    
    if ! run_test_category "Integration Tests" "$INTEGRATION_TESTS" "Testing component interactions and ecosystem integration"; then
        ((failed_categories++))
    fi
    
    if ! run_test_category "End-to-End Tests" "$E2E_TESTS" "Testing complete user workflows"; then
        ((failed_categories++))
    fi
    
    if ! run_test_category "Performance Tests" "$PERFORMANCE_TESTS" "Testing performance and resource usage"; then
        ((failed_categories++))
    fi
    
    if ! run_test_category "Security Tests" "$SECURITY_TESTS" "Testing security controls and permissions"; then
        ((failed_categories++))
    fi
    
    # Run coverage analysis
    echo -e "\n${BLUE}📊 Coverage Analysis${NC}"
    echo "----------------------------------------"
    run_coverage
    
    # Generate report
    generate_report
    
    # Final summary
    echo -e "\n${BLUE}🏁 Test Suite Complete${NC}"
    echo "=================================================="
    
    if [ $failed_categories -eq 0 ]; then
        echo -e "${GREEN}✅ All test categories passed!${NC}"
        echo -e "${GREEN}🎉 Qwallet Identity Expansion is ready for deployment${NC}"
        exit 0
    else
        echo -e "${RED}❌ $failed_categories test categories failed${NC}"
        echo -e "${RED}🚨 Please fix failing tests before deployment${NC}"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        run_test_category "Unit Tests" "$UNIT_TESTS" "Testing individual components and hooks"
        ;;
    "integration")
        run_test_category "Integration Tests" "$INTEGRATION_TESTS" "Testing component interactions"
        ;;
    "e2e")
        run_test_category "End-to-End Tests" "$E2E_TESTS" "Testing complete user workflows"
        ;;
    "performance")
        run_test_category "Performance Tests" "$PERFORMANCE_TESTS" "Testing performance and resource usage"
        ;;
    "security")
        run_test_category "Security Tests" "$SECURITY_TESTS" "Testing security controls"
        ;;
    "coverage")
        run_coverage
        ;;
    "all"|*)
        main
        ;;
esac
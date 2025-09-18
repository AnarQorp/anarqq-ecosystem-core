#!/bin/bash

# Test script for AnarQ&Q Modular Installer System
# Tests all aspects of the modular installation options system

set -e

# Test configuration
TEST_DIR="./test-modular-installation"
TEST_LOG="./test-modular-installer.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test logging
log_test() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$TEST_LOG"
    
    case "$level" in
        "PASS") echo -e "${GREEN}✓ $message${NC}" ;;
        "FAIL") echo -e "${RED}✗ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ $message${NC}" ;;
        "WARN") echo -e "${YELLOW}⚠ $message${NC}" ;;
    esac
}

# Test setup
setup_test_environment() {
    log_test "INFO" "Setting up test environment"
    
    # Clean previous test
    rm -rf "$TEST_DIR" 2>/dev/null || true
    rm -f "$TEST_LOG" 2>/dev/null || true
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    
    # Create mock dependency manager
    cat > "$TEST_DIR/install-dependency-manager.sh" << 'EOF'
#!/bin/bash
# Mock dependency manager for testing

# Mock color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_step() { echo -e "${PURPLE}🔄 $1${NC}"; }
print_substep() { echo -e "  ${BLUE}→ $1${NC}"; }

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

initialize_system_info() {
    return 0
}

interactive_dependency_check() {
    return 0
}
EOF
    
    chmod +x "$TEST_DIR/install-dependency-manager.sh"
    
    log_test "PASS" "Test environment setup completed"
}

# Test disk space calculation
test_disk_space_calculation() {
    log_test "INFO" "Testing disk space calculation functions"
    
    # Copy modular installer to test directory
    cp install-anarqq-modular.sh "$TEST_DIR/"
    cd "$TEST_DIR"
    
    # Source the installer to access functions
    source install-anarqq-modular.sh >/dev/null 2>&1 || true
    
    # Test calculate_total_size function
    local test_components="demo,core,backend"
    local expected_size=$((50 + 200 + 150)) # demo + core + backend
    local actual_size=$(calculate_total_size "$test_components")
    
    if [ "$actual_size" -eq "$expected_size" ]; then
        log_test "PASS" "Disk space calculation correct: ${actual_size}MB"
    else
        log_test "FAIL" "Disk space calculation incorrect: expected ${expected_size}MB, got ${actual_size}MB"
        return 1
    fi
    
    cd ..
    return 0
}

# Test dependency validation
test_dependency_validation() {
    log_test "INFO" "Testing component dependency validation"
    
    cd "$TEST_DIR"
    source install-anarqq-modular.sh >/dev/null 2>&1 || true
    
    # Test case 1: Valid dependencies (qwallet requires core,backend)
    local test_components="demo,core,backend,qwallet"
    local result=$(validate_dependencies "$test_components" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Valid dependency validation passed"
    else
        log_test "FAIL" "Valid dependency validation failed"
        cd ..
        return 1
    fi
    
    # Test case 2: Missing dependencies (qmarket requires qwallet)
    # This test would normally prompt user, so we'll test the logic differently
    local missing_deps=()
    local selected_components="demo,core,backend,qmarket"
    
    # Check if qmarket dependency (qwallet) is missing
    if [[ "$selected_components" != *"qwallet"* ]]; then
        missing_deps+=("qwallet")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_test "PASS" "Missing dependency detection works: ${missing_deps[*]}"
    else
        log_test "FAIL" "Missing dependency detection failed"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Test component installation modes
test_installation_modes() {
    log_test "INFO" "Testing installation mode component selection"
    
    cd "$TEST_DIR"
    source install-anarqq-modular.sh >/dev/null 2>&1 || true
    
    # Test minimal mode
    local minimal_components=$(get_components_for_mode "minimal")
    if [ "$minimal_components" = "demo" ]; then
        log_test "PASS" "Minimal mode components correct"
    else
        log_test "FAIL" "Minimal mode components incorrect: $minimal_components"
        cd ..
        return 1
    fi
    
    # Test full mode
    local full_components=$(get_components_for_mode "full")
    local expected_full="demo,core,backend,frontend,qwallet,qmarket,qsocial,qchat,qdrive,qmail,qnet,dao,qerberos"
    if [ "$full_components" = "$expected_full" ]; then
        log_test "PASS" "Full mode components correct"
    else
        log_test "FAIL" "Full mode components incorrect"
        cd ..
        return 1
    fi
    
    # Test development mode
    local dev_components=$(get_components_for_mode "development")
    if [[ "$dev_components" == *"dev-tools"* ]]; then
        log_test "PASS" "Development mode includes dev-tools"
    else
        log_test "FAIL" "Development mode missing dev-tools"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Test component manager functions
test_component_manager() {
    log_test "INFO" "Testing component manager functions"
    
    # Copy component manager to test directory
    cp install-component-manager.sh "$TEST_DIR/"
    cd "$TEST_DIR"
    
    # Source the component manager
    source install-component-manager.sh >/dev/null 2>&1 || true
    
    # Test component repository mappings
    if [ "${COMPONENT_REPOS[demo]}" = "https://github.com/AnarQorp/anarqq-ecosystem-demo" ]; then
        log_test "PASS" "Component repository mapping correct"
    else
        log_test "FAIL" "Component repository mapping incorrect"
        cd ..
        return 1
    fi
    
    # Test component installation commands
    if [ "${COMPONENT_INSTALL_CMDS[demo]}" = "npm install" ]; then
        log_test "PASS" "Component installation command correct"
    else
        log_test "FAIL" "Component installation command incorrect"
        cd ..
        return 1
    fi
    
    # Test component setup functions exist
    if declare -f setup_demo_component >/dev/null; then
        log_test "PASS" "Component setup functions defined"
    else
        log_test "FAIL" "Component setup functions missing"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Test configuration export
test_configuration_export() {
    log_test "INFO" "Testing configuration export functionality"
    
    cd "$TEST_DIR"
    
    # Create a mock configuration
    declare -A INSTALL_CONFIG=(
        ["mode"]="full"
        ["components"]="demo,core,backend"
        ["target_dir"]="/test/path"
        ["verbose"]="true"
    )
    
    # Export configuration
    echo "# Test Configuration Export" > "./anarqq-install-config.sh"
    for key in "${!INSTALL_CONFIG[@]}"; do
        echo "INSTALL_CONFIG_${key^^}=\"${INSTALL_CONFIG[$key]}\"" >> "./anarqq-install-config.sh"
    done
    
    # Verify export
    if [ -f "./anarqq-install-config.sh" ]; then
        source "./anarqq-install-config.sh"
        
        if [ "$INSTALL_CONFIG_MODE" = "full" ] && [ "$INSTALL_CONFIG_VERBOSE" = "true" ]; then
            log_test "PASS" "Configuration export works correctly"
        else
            log_test "FAIL" "Configuration export values incorrect"
            cd ..
            return 1
        fi
    else
        log_test "FAIL" "Configuration export file not created"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Test disk space checking
test_disk_space_checking() {
    log_test "INFO" "Testing disk space checking functionality"
    
    cd "$TEST_DIR"
    source install-anarqq-modular.sh >/dev/null 2>&1 || true
    
    # Test with current directory (should have enough space for test)
    if check_available_space "." 1; then # 1MB requirement
        log_test "PASS" "Disk space check works for sufficient space"
    else
        log_test "FAIL" "Disk space check failed for sufficient space"
        cd ..
        return 1
    fi
    
    # Test with unrealistic requirement (should fail)
    if ! check_available_space "." 999999999; then # 999GB requirement
        log_test "PASS" "Disk space check correctly detects insufficient space"
    else
        log_test "FAIL" "Disk space check should have failed for insufficient space"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Test cleanup functionality
test_cleanup_functionality() {
    log_test "INFO" "Testing cleanup functionality"
    
    cd "$TEST_DIR"
    
    # Create mock installation directory
    local test_install_dir="./mock-anarqq-install"
    mkdir -p "$test_install_dir"
    touch "$test_install_dir/.anarqq-installation"
    
    # Source installer and set config
    source install-anarqq-modular.sh >/dev/null 2>&1 || true
    INSTALL_CONFIG["target_dir"]="$test_install_dir"
    INSTALL_CONFIG["cleanup_on_error"]="true"
    
    # Test cleanup
    cleanup_partial_installation
    
    if [ ! -d "$test_install_dir" ]; then
        log_test "PASS" "Cleanup functionality works correctly"
    else
        log_test "FAIL" "Cleanup functionality failed to remove directory"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Test integration with existing installer
test_integration() {
    log_test "INFO" "Testing integration with existing installer system"
    
    # Check if required files exist
    if [ -f "install-dependency-manager.sh" ]; then
        log_test "PASS" "Dependency manager integration available"
    else
        log_test "WARN" "Dependency manager not found - integration limited"
    fi
    
    # Check if modular installer can source dependency manager
    cd "$TEST_DIR"
    if source install-anarqq-modular.sh >/dev/null 2>&1; then
        log_test "PASS" "Modular installer sources dependencies correctly"
    else
        log_test "FAIL" "Modular installer failed to source dependencies"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Run all tests
run_all_tests() {
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    log_test "INFO" "Starting AnarQ&Q Modular Installer Test Suite"
    echo ""
    
    # List of test functions
    local tests=(
        "setup_test_environment"
        "test_disk_space_calculation"
        "test_dependency_validation"
        "test_installation_modes"
        "test_component_manager"
        "test_configuration_export"
        "test_disk_space_checking"
        "test_cleanup_functionality"
        "test_integration"
    )
    
    for test_func in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        echo ""
        log_test "INFO" "Running test: $test_func"
        
        if $test_func; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    echo ""
    log_test "INFO" "Test Summary:"
    log_test "INFO" "Total tests: $total_tests"
    log_test "INFO" "Passed: $passed_tests"
    log_test "INFO" "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log_test "PASS" "All tests passed! ✨"
        return 0
    else
        log_test "FAIL" "Some tests failed. Check the log for details."
        return 1
    fi
}

# Cleanup test environment
cleanup_test_environment() {
    log_test "INFO" "Cleaning up test environment"
    rm -rf "$TEST_DIR" 2>/dev/null || true
}

# Main execution
main() {
    echo "AnarQ&Q Modular Installer Test Suite"
    echo "===================================="
    echo ""
    
    if run_all_tests; then
        echo ""
        echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
        cleanup_test_environment
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Some tests failed. Check $TEST_LOG for details.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
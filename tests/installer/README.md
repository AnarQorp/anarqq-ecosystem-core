# AnarQ&Q Installer Testing Framework

Comprehensive testing suite for the AnarQ&Q robust installer system.

## Overview

This testing framework provides three levels of testing:

1. **Unit Tests** - Test individual installer functions in isolation
2. **Integration Tests** - Test complete installation flows and component interactions
3. **Platform Tests** - Test cross-platform compatibility on Linux, macOS, and Windows WSL

## Quick Start

### Run All Tests

```bash
# Run the complete test suite
./tests/installer/run-all-tests.sh

# View test results
cat tests/installer/logs/test-report-*.md
```

### Run Specific Test Categories

```bash
# Unit tests only
./tests/installer/run-all-tests.sh unit

# Integration tests only
./tests/installer/run-all-tests.sh integration

# Platform tests only
./tests/installer/run-all-tests.sh platform
```

### Run Individual Test Scripts

```bash
# Unit tests
./tests/installer/unit/test-installer-functions.sh

# Integration tests
./tests/installer/integration/test-installation-flows.sh

# Platform tests
./tests/installer/platform/test-cross-platform.sh
```

## Test Structure

```
tests/installer/
├── README.md                           # This file
├── run-all-tests.sh                   # Main test runner
├── unit/
│   └── test-installer-functions.sh    # Unit tests for individual functions
├── integration/
│   └── test-installation-flows.sh     # Integration tests for complete flows
├── platform/
│   └── test-cross-platform.sh         # Platform compatibility tests
├── logs/                              # Test logs and reports
│   ├── unit-tests-*.log
│   ├── integration-tests-*.log
│   ├── platform-tests-*.log
│   ├── test-suite-*.log
│   └── test-report-*.md
└── temp/                              # Temporary test files
    ├── unit-*/
    ├── integration-*/
    └── platform-*/
```

## Test Categories

### Unit Tests (`unit/test-installer-functions.sh`)

Tests individual installer functions with mocked dependencies:

- **log_error()** - Error logging functionality
- **retry_with_backoff()** - Retry mechanism with exponential backoff
- **move_extracted_content()** - Archive extraction and file movement
- **cleanup_and_exit()** - Cleanup and exit handling
- **command_exists()** - Command availability checking (mocked)

**Features:**
- Isolated testing with mocked dependencies
- No external dependencies required
- Fast execution (< 10 seconds)
- Detailed logging and reporting

**Example Output:**
```
Test 1: log_error Function
✅ log_error creates log file and writes error message
✅ log_error includes context information

Test Summary:
  Total tests: 10
  Passed: 10
  Failed: 0
  Success rate: 100%
```

### Integration Tests (`integration/test-installation-flows.sh`)

Tests complete installation flows and component interactions:

- **Complete Installation Flow** - Syntax and structure validation
- **Dependency Manager Integration** - Dependency manager sourcing
- **Error Handling Integration** - Error trapping and cleanup
- **Download Engine Integration** - Multiple download methods
- **Configuration Setup** - Environment and directory setup
- **User Interface** - Progress feedback and prompts
- **Validation System** - Post-installation validation

**Features:**
- Tests real installer components
- Validates script structure and syntax
- Checks component integration
- No actual installation performed (dry run)

**Example Output:**
```
Test 4: Download Engine Integration
✅ Multiple download methods are implemented (3/3)
✅ Retry mechanism is integrated
✅ Multiple extraction methods are available

Integration Test Summary:
  Total tests: 20
  Passed: 20
  Failed: 0
  Success rate: 100%
```

### Platform Tests (`platform/test-cross-platform.sh`)

Tests cross-platform compatibility and system requirements:

- **Platform Detection** - OS and environment detection
- **Package Manager Detection** - Available package managers
- **Essential Commands** - Required system utilities
- **Node.js and NPM** - JavaScript runtime availability
- **File System Operations** - File and directory operations
- **Network Connectivity** - Internet and GitHub access
- **Shell Compatibility** - Bash version and features
- **Platform-Specific Features** - OS-specific functionality

**Features:**
- Automatic platform detection
- Comprehensive system analysis
- Network connectivity testing
- Platform-specific validations

**Example Output:**
```
Test 1: Platform Detection
ℹ️  Detected platform: linux
✅ Platform detection successful: linux

Test 4: Node.js and NPM Availability
✅ Node.js is available: v20.19.4
✅ Node.js version is sufficient (>= 16)
✅ NPM is available: 10.8.2

Platform Test Summary for linux:
  Total tests: 19
  Passed: 19
  Failed: 0
  Success rate: 100%
```

## Test Runner (`run-all-tests.sh`)

The main test runner orchestrates all test suites:

**Features:**
- Runs all test categories in sequence
- Generates comprehensive test reports
- Provides detailed logging
- Supports individual test category execution
- Creates markdown reports for documentation

**Usage:**
```bash
# Run all tests
./tests/installer/run-all-tests.sh

# Run specific category
./tests/installer/run-all-tests.sh [unit|integration|platform]

# Show help
./tests/installer/run-all-tests.sh help
```

**Generated Reports:**
- **Console Output** - Real-time test results
- **Log Files** - Detailed execution logs
- **Markdown Reports** - Formatted test reports with system information

## Requirements Validation

The testing framework validates the following requirements from the specification:

### Requirement 3.4 - Error Handling and Logging
- ✅ Comprehensive error logging with timestamps
- ✅ Detailed error reporting with context
- ✅ Proper cleanup mechanisms
- ✅ Verbose mode support

### Requirement 4.6 - Cross-Platform Compatibility
- ✅ Linux compatibility testing
- ✅ macOS compatibility testing (when available)
- ✅ Windows WSL compatibility testing (when available)
- ✅ Package manager detection and adaptation

### Requirement 6.4 - User Interface and Progress Feedback
- ✅ Progress indicator validation
- ✅ User prompt functionality testing
- ✅ Clear status message validation
- ✅ Interactive guidance testing

### Requirement 7.6 - Post-Installation Validation
- ✅ Installation validation testing
- ✅ Component functionality verification
- ✅ Network connectivity testing
- ✅ System requirement validation

## Continuous Integration

### GitHub Actions Integration

Add to `.github/workflows/installer-tests.yml`:

```yaml
name: Installer Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-installer:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Run Installer Tests
      run: |
        chmod +x tests/installer/run-all-tests.sh
        ./tests/installer/run-all-tests.sh
    
    - name: Upload Test Reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-reports-${{ matrix.os }}
        path: tests/installer/logs/
```

### Local Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running installer tests..."
./tests/installer/run-all-tests.sh
if [ $? -ne 0 ]; then
    echo "Installer tests failed. Commit aborted."
    exit 1
fi
```

## Troubleshooting

### Test Failures

#### Unit Test Failures
- Check function implementations in the installer script
- Verify mock functions are working correctly
- Review test logic and assertions

#### Integration Test Failures
- Ensure installer script exists and is executable
- Check for missing functions or components
- Verify script syntax with `bash -n script.sh`

#### Platform Test Failures
- Install missing system dependencies
- Check network connectivity
- Verify platform-specific requirements

### Common Issues

#### Permission Errors
```bash
chmod +x tests/installer/run-all-tests.sh
chmod +x tests/installer/unit/test-installer-functions.sh
chmod +x tests/installer/integration/test-installation-flows.sh
chmod +x tests/installer/platform/test-cross-platform.sh
```

#### Missing Dependencies
```bash
# Ubuntu/Debian
sudo apt install curl wget git unzip

# macOS
brew install curl wget git unzip

# Check Node.js
node --version  # Should be >= 16.0.0
npm --version
```

#### Network Issues
```bash
# Test connectivity
ping -c 3 github.com
curl -I https://github.com

# Configure proxy if needed
export http_proxy=http://proxy:8080
export https_proxy=https://proxy:8080
```

## Extending the Tests

### Adding New Unit Tests

1. Add test function to `unit/test-installer-functions.sh`:

```bash
test_new_function() {
    print_test_header "Test N: new_function"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test implementation
    if new_function "test_input"; then
        print_test_pass "new_function works correctly"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "new_function failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}
```

2. Call the test in `run_unit_tests()`:

```bash
run_unit_tests() {
    # ... existing tests ...
    test_new_function
    echo ""
    # ... rest of function ...
}
```

### Adding New Integration Tests

1. Add test function to `integration/test-installation-flows.sh`:

```bash
test_new_integration() {
    print_test_header "Test N: New Integration Test"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Integration test implementation
    if check_integration_aspect; then
        print_test_pass "Integration aspect works"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_test_fail "Integration aspect failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}
```

### Adding New Platform Tests

1. Add test function to `platform/test-cross-platform.sh`:

```bash
test_new_platform_feature() {
    print_test_header "Test N: New Platform Feature"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Platform-specific test
    case "$CURRENT_PLATFORM" in
        "linux")
            # Linux-specific test
            ;;
        "macos")
            # macOS-specific test
            ;;
        "windows")
            # Windows-specific test
            ;;
    esac
}
```

## Best Practices

### Test Design
- Keep tests independent and isolated
- Use descriptive test names and messages
- Include both positive and negative test cases
- Mock external dependencies when possible

### Error Handling
- Always check return codes
- Provide clear error messages
- Clean up temporary files and directories
- Log detailed information for debugging

### Performance
- Keep tests fast and efficient
- Use temporary directories for test files
- Clean up resources after tests
- Avoid unnecessary network calls

### Maintenance
- Update tests when installer changes
- Keep test documentation current
- Review and refactor tests regularly
- Add tests for new features

## Support

### Documentation
- [Troubleshooting Guide](../../docs/installer/TROUBLESHOOTING.md)
- [Installation Guides](../../docs/installer/INSTALLATION_GUIDES.md)
- [Installer Requirements](../../.kiro/specs/robust-installer-system/requirements.md)

### Getting Help
- **GitHub Issues:** [Report test issues](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)
- **Email:** anarqorp@proton.me
- **Documentation:** Check the installer documentation

---

*Last updated: $(date '+%Y-%m-%d')*
*Version: 1.0.0*
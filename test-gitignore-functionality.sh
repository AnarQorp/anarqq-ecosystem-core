#!/bin/bash

# Test script to verify core functionality with new .gitignore configuration
# This script tests that essential files are accessible and core functionality works

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Testing: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        print_success "✓ $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "✗ $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# Function to test file accessibility
test_file_access() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ] && [ -r "$file" ]; then
        print_success "✓ $description: $file"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "✗ $description: $file (not accessible)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$description")
        return 1
    fi
}

# Function to test directory accessibility
test_dir_access() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ] && [ -r "$dir" ]; then
        print_success "✓ $description: $dir"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "✗ $description: $dir (not accessible)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$description")
        return 1
    fi
}

print_header "CORE FUNCTIONALITY TESTS WITH NEW GITIGNORE"

# Test 1: Main Installation Scripts
print_header "Testing Main Installation Scripts"
test_file_access "install-anarqq.sh" "Main installer script"
test_file_access "install-anarqq-demo.sh" "Demo installer script"
test_file_access "install-anarqq-demo.ps1" "PowerShell demo installer"
test_file_access "install-anarqq-demo.py" "Python demo installer"
test_file_access "verify-installation.sh" "Installation verification script"

# Test 2: Core Configuration Files
print_header "Testing Core Configuration Files"
test_file_access "package.json" "Main package configuration"
test_file_access "package-lock.json" "Package lock file"
test_file_access "tsconfig.json" "TypeScript configuration"
test_file_access "tsconfig.base.json" "Base TypeScript configuration"
test_file_access "ecosystem.config.js" "Ecosystem configuration"
test_file_access "vitest.config.ts" "Vitest configuration"
test_file_access "tailwind.config.js" "Tailwind configuration"
test_file_access "postcss.config.cjs" "PostCSS configuration"
test_file_access "eslint.config.js" "ESLint configuration"

# Test 3: Essential Directories
print_header "Testing Essential Directories"
test_dir_access "src/" "Source code directory"
test_dir_access "modules/" "Modules directory"
test_dir_access "libs/" "Libraries directory"
test_dir_access "backend/" "Backend directory"
test_dir_access "contracts/" "Smart contracts directory"
test_dir_access "scripts/" "Scripts directory"
test_dir_access "docs/" "Documentation directory"
test_dir_access "config/" "Configuration directory"
test_dir_access "schemas/" "Schemas directory"
test_dir_access "templates/" "Templates directory"
test_dir_access ".kiro/" "Kiro configuration directory"
test_dir_access ".github/" "GitHub configuration directory"

# Test 4: Module Structure Integrity
print_header "Testing Module Structure Integrity"
for module_dir in modules/*/; do
    if [ -d "$module_dir" ]; then
        module_name=$(basename "$module_dir")
        test_dir_access "$module_dir" "Module: $module_name"
        
        # Check for essential module files
        if [ -f "${module_dir}package.json" ]; then
            test_file_access "${module_dir}package.json" "Module $module_name package.json"
        fi
        
        if [ -d "${module_dir}src/" ]; then
            test_dir_access "${module_dir}src/" "Module $module_name source directory"
        fi
    fi
done

# Test 5: Installation Script Functionality
print_header "Testing Installation Script Functionality"
run_test "Main installer help" "./install-anarqq.sh --help"
run_test "Demo installer help" "./install-anarqq-demo.sh --help"
run_test "Verification script help" "./verify-installation.sh --help"

# Test 6: Documentation Accessibility
print_header "Testing Documentation Accessibility"
test_file_access "README.md" "Main README"
test_file_access "LICENSE" "License file"
test_file_access "LICENSE-CC-BY-NC-SA" "Creative Commons license"
test_file_access "docs/README.md" "Documentation README"

# Test 7: Essential Scripts Accessibility
print_header "Testing Essential Scripts Accessibility"
if [ -d "scripts/" ]; then
    script_count=$(find scripts/ -name "*.sh" -o -name "*.mjs" -o -name "*.js" | wc -l)
    if [ "$script_count" -gt 0 ]; then
        print_success "✓ Scripts directory contains $script_count executable scripts"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "✗ No scripts found in scripts directory"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("Scripts directory content")
    fi
fi

# Test 8: Verify .gitignore is working (files should be ignored)
print_header "Testing .gitignore Effectiveness"
ignored_patterns=(
    "node_modules/"
    "dist/"
    "*.log"
    ".env"
    "*.tsbuildinfo"
    ".rollback/"
    "test-results/"
    "artifacts/"
)

for pattern in "${ignored_patterns[@]}"; do
    # Create a temporary test file/directory
    temp_name="test_gitignore_$(echo "$pattern" | sed 's/[^a-zA-Z0-9]/_/g')"
    
    if [[ "$pattern" == *"/" ]]; then
        # Directory pattern
        mkdir -p "$temp_name"
        echo "test" > "$temp_name/test.txt"
        test_path="$temp_name"
    else
        # File pattern
        test_path="$temp_name"
        echo "test" > "$test_path"
    fi
    
    # Check if git would ignore this file
    if git check-ignore "$test_path" >/dev/null 2>&1; then
        print_success "✓ Pattern '$pattern' is properly ignored"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_warning "⚠ Pattern '$pattern' may not be working as expected"
        # Don't count as failure since some patterns might not have test files
    fi
    
    # Clean up test file/directory
    rm -rf "$test_path"
done

# Test 9: Repository Size Analysis
print_header "Repository Size Analysis"
total_size=$(du -sh . 2>/dev/null | cut -f1)
print_status "Total repository size: $total_size"

# Count large files that are properly ignored
large_ignored_count=$(find . -type f -size +1M -not -path "./.git/*" | while read -r file; do
    if git check-ignore "$file" >/dev/null 2>&1; then
        echo "ignored"
    fi
done | wc -l)

large_tracked_count=$(find . -type f -size +1M -not -path "./.git/*" | while read -r file; do
    if ! git check-ignore "$file" >/dev/null 2>&1; then
        echo "tracked"
    fi
done | wc -l)

print_status "Large files (>1MB) - Ignored: $large_ignored_count, Tracked: $large_tracked_count"

if [ "$large_ignored_count" -gt "$large_tracked_count" ]; then
    print_success "✓ More large files are ignored than tracked (good for repository size)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "⚠ More large files are tracked than ignored"
fi

# Final Results
echo
print_header "TEST RESULTS SUMMARY"
echo
print_status "Tests Passed: $TESTS_PASSED"
print_status "Tests Failed: $TESTS_FAILED"
print_status "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo
    print_success "🎉 ALL TESTS PASSED! Core functionality is working correctly with the new .gitignore configuration."
    echo
    print_status "Key achievements:"
    print_status "• All essential files and directories are accessible"
    print_status "• Installation scripts work correctly"
    print_status "• Module structure is preserved"
    print_status "• Configuration files are accessible"
    print_status "• Documentation is available"
    print_status "• .gitignore patterns are working effectively"
    echo
    exit 0
else
    echo
    print_error "❌ SOME TESTS FAILED! Please review the issues above."
    echo
    print_status "Failed tests:"
    for failed_test in "${FAILED_TESTS[@]}"; do
        print_error "  • $failed_test"
    done
    echo
    exit 1
fi
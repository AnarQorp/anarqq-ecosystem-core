#!/bin/bash

# AnarQ-Q Ecosystem - Essential Files Validation Script
# This script verifies that core ecosystem files are not ignored by .gitignore
# and provides size analysis to show repository cleanup impact

set -euo pipefail

# Configuration
GITIGNORE_FILE=".gitignore"
VALIDATION_REPORT="validation-report.txt"
TEMP_DIR=$(mktemp -d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# Essential files and directories that must never be ignored
declare -a ESSENTIAL_FILES=(
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "tsconfig.base.json"
    "README.md"
    "LICENSE"
    "LICENSE-CC-BY-NC-SA"
    "ecosystem.config.js"
    "vitest.config.ts"
    "tailwind.config.js"
    "postcss.config.cjs"
    "eslint.config.js"
    "install-anarqq.sh"
    "install-anarqq-demo.sh"
    "install-anarqq-demo.ps1"
    "install-anarqq-demo.py"
    "verify-installation.sh"
)

declare -a ESSENTIAL_DIRECTORIES=(
    "src/"
    "modules/"
    "libs/"
    "backend/"
    "frontend/"
    "contracts/"
    "scripts/"
    "docs/"
    "config/"
    "schemas/"
    "templates/"
    ".kiro/"
    ".github/"
)

# Files that should be ignored (for testing ignore functionality)
declare -a SHOULD_BE_IGNORED=(
    "*.log"
    "node_modules/"
    "dist/"
    "build/"
    ".env"
    "*.tsbuildinfo"
    ".rollback/"
    "test-results/"
    "artifacts/"
    "*.tar.gz"
    "*.zip"
    "*-release/"
    "test-unified-installer-*/"
    "*-implementation-summary.md"
    "comprehensive-*-report.*"
)

# Function to check if a file/pattern is ignored by git
is_ignored_by_git() {
    local file="$1"
    git check-ignore "$file" >/dev/null 2>&1
}

# Function to get file size in human readable format
get_file_size() {
    local file="$1"
    if [ -f "$file" ]; then
        du -h "$file" | cut -f1
    elif [ -d "$file" ]; then
        du -sh "$file" 2>/dev/null | cut -f1 || echo "0B"
    else
        echo "N/A"
    fi
}

# Function to validate essential files
validate_essential_files() {
    print_header "VALIDATING ESSENTIAL FILES"
    
    local failed_files=()
    local total_files=0
    local passed_files=0
    
    for file in "${ESSENTIAL_FILES[@]}"; do
        total_files=$((total_files + 1))
        if [ -f "$file" ]; then
            if is_ignored_by_git "$file"; then
                print_error "CRITICAL: Essential file '$file' is being ignored!"
                failed_files+=("$file")
            else
                print_success "✓ $file ($(get_file_size "$file"))"
                passed_files=$((passed_files + 1))
            fi
        else
            print_warning "Essential file '$file' not found in repository"
        fi
    done
    
    echo
    print_status "Essential Files Summary: $passed_files/$total_files passed"
    
    if [ ${#failed_files[@]} -gt 0 ]; then
        print_error "FAILED: ${#failed_files[@]} essential files are being ignored!"
        return 1
    fi
    
    return 0
}

# Function to validate essential directories
validate_essential_directories() {
    print_header "VALIDATING ESSENTIAL DIRECTORIES"
    
    local failed_dirs=()
    local total_dirs=0
    local passed_dirs=0
    
    for dir in "${ESSENTIAL_DIRECTORIES[@]}"; do
        total_dirs=$((total_dirs + 1))
        if [ -d "$dir" ]; then
            if is_ignored_by_git "$dir"; then
                print_error "CRITICAL: Essential directory '$dir' is being ignored!"
                failed_dirs+=("$dir")
            else
                print_success "✓ $dir ($(get_file_size "$dir"))"
                passed_dirs=$((passed_dirs + 1))
            fi
        else
            print_warning "Essential directory '$dir' not found in repository"
        fi
    done
    
    echo
    print_status "Essential Directories Summary: $passed_dirs/$total_dirs passed"
    
    if [ ${#failed_dirs[@]} -gt 0 ]; then
        print_error "FAILED: ${#failed_dirs[@]} essential directories are being ignored!"
        return 1
    fi
    
    return 0
}

# Function to test ignore patterns
test_ignore_patterns() {
    print_header "TESTING IGNORE PATTERNS"
    
    local working_patterns=0
    local total_patterns=${#SHOULD_BE_IGNORED[@]}
    
    # Create temporary test files to check ignore patterns
    for pattern in "${SHOULD_BE_IGNORED[@]}"; do
        # Create a test file/directory based on pattern
        local test_path="${TEMP_DIR}/$(echo "$pattern" | sed 's/[*]/test/g' | sed 's|/$||')"
        
        if [[ "$pattern" == *"/" ]]; then
            # Directory pattern
            mkdir -p "$test_path"
            echo "test" > "$test_path/test.txt"
        else
            # File pattern
            mkdir -p "$(dirname "$test_path")"
            echo "test" > "$test_path"
        fi
        
        # Check if the pattern would be ignored
        if git check-ignore "$test_path" >/dev/null 2>&1; then
            print_success "✓ Pattern '$pattern' is working"
            working_patterns=$((working_patterns + 1))
        else
            print_warning "Pattern '$pattern' may not be working as expected"
        fi
    done
    
    echo
    print_status "Ignore Patterns Summary: $working_patterns/$total_patterns working"
}

# Function to analyze repository size impact
analyze_repository_size() {
    print_header "REPOSITORY SIZE ANALYSIS"
    
    # Get total repository size
    local total_size=$(du -sh . 2>/dev/null | cut -f1)
    print_status "Total repository size: $total_size"
    
    # Analyze large files that might be ignored
    print_status "Large files analysis (>1MB):"
    find . -type f -size +1M -not -path "./.git/*" -not -path "./node_modules/*" | while read -r file; do
        local size=$(get_file_size "$file")
        if is_ignored_by_git "$file"; then
            echo "  [IGNORED] $file ($size)"
        else
            echo "  [TRACKED] $file ($size)"
        fi
    done
    
    echo
    
    # Count files by category
    print_status "File count analysis:"
    
    local total_files=$(find . -type f -not -path "./.git/*" | wc -l)
    local ignored_files=0
    local tracked_files=0
    
    find . -type f -not -path "./.git/*" | while read -r file; do
        if is_ignored_by_git "$file" 2>/dev/null; then
            ignored_files=$((ignored_files + 1))
        else
            tracked_files=$((tracked_files + 1))
        fi
    done
    
    echo "  Total files: $total_files"
    echo "  Tracked files: $tracked_files"
    echo "  Ignored files: $ignored_files"
}

# Function to generate detailed report
generate_report() {
    local report_file="$1"
    
    print_header "GENERATING VALIDATION REPORT"
    
    {
        echo "AnarQ-Q Ecosystem - .gitignore Validation Report"
        echo "Generated: $(date)"
        echo "Repository: $(pwd)"
        echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo "Not in git repository")"
        echo
        echo "=== VALIDATION SUMMARY ==="
        echo
        
        # Re-run validations for report
        echo "Essential Files Validation:"
        for file in "${ESSENTIAL_FILES[@]}"; do
            if [ -f "$file" ]; then
                if is_ignored_by_git "$file"; then
                    echo "  [FAIL] $file - BEING IGNORED!"
                else
                    echo "  [PASS] $file ($(get_file_size "$file"))"
                fi
            else
                echo "  [WARN] $file - NOT FOUND"
            fi
        done
        
        echo
        echo "Essential Directories Validation:"
        for dir in "${ESSENTIAL_DIRECTORIES[@]}"; do
            if [ -d "$dir" ]; then
                if is_ignored_by_git "$dir"; then
                    echo "  [FAIL] $dir - BEING IGNORED!"
                else
                    echo "  [PASS] $dir ($(get_file_size "$dir"))"
                fi
            else
                echo "  [WARN] $dir - NOT FOUND"
            fi
        done
        
        echo
        echo "=== REPOSITORY SIZE ANALYSIS ==="
        echo "Total size: $(du -sh . 2>/dev/null | cut -f1)"
        echo
        echo "Large files (>1MB):"
        find . -type f -size +1M -not -path "./.git/*" -not -path "./node_modules/*" | while read -r file; do
            local size=$(get_file_size "$file")
            if is_ignored_by_git "$file"; then
                echo "  [IGNORED] $file ($size)"
            else
                echo "  [TRACKED] $file ($size)"
            fi
        done
        
    } > "$report_file"
    
    print_success "Validation report saved to: $report_file"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  validate        Run full validation (default)"
    echo "  files           Validate essential files only"
    echo "  dirs            Validate essential directories only"
    echo "  patterns        Test ignore patterns only"
    echo "  size            Analyze repository size only"
    echo "  report [file]   Generate detailed report (default: validation-report.txt)"
    echo "  help            Show this help message"
    echo
    echo "Examples:"
    echo "  $0                          # Run full validation"
    echo "  $0 validate                 # Run full validation"
    echo "  $0 files                    # Check essential files only"
    echo "  $0 report custom-report.txt # Generate custom report"
}

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    local command="${1:-validate}"
    local exit_code=0
    
    case "$command" in
        "validate")
            validate_essential_files || exit_code=1
            echo
            validate_essential_directories || exit_code=1
            echo
            test_ignore_patterns
            echo
            analyze_repository_size
            ;;
        "files")
            validate_essential_files || exit_code=1
            ;;
        "dirs")
            validate_essential_directories || exit_code=1
            ;;
        "patterns")
            test_ignore_patterns
            ;;
        "size")
            analyze_repository_size
            ;;
        "report")
            local report_file="${2:-$VALIDATION_REPORT}"
            generate_report "$report_file"
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo
            show_usage
            exit 1
            ;;
    esac
    
    if [ $exit_code -eq 0 ]; then
        echo
        print_success "Validation completed successfully!"
    else
        echo
        print_error "Validation failed! Please review the issues above."
    fi
    
    exit $exit_code
}

# Run main function with all arguments
main "$@"
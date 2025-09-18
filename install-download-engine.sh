#!/bin/bash

# AnarQ&Q Ecosystem - Robust Download Engine
# Multi-method repository downloading with fallback mechanisms
# Version: 1.0.0

set -e

# Color definitions for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global configuration
DOWNLOAD_LOG_FILE=""
VERBOSE_MODE=false
MAX_RETRIES=3
INITIAL_DELAY=2
MAX_DELAY=30
TEMP_DIR=""

# Download statistics
declare -A DOWNLOAD_STATS=(
    ["attempts"]=0
    ["successes"]=0
    ["failures"]=0
    ["method_used"]=""
    ["total_time"]=0
)

# Utility functions for output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    [ "$VERBOSE_MODE" = true ] && [ -n "$DOWNLOAD_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') INFO: $1" >> "$DOWNLOAD_LOG_FILE" 2>/dev/null || true
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    [ -n "$DOWNLOAD_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') SUCCESS: $1" >> "$DOWNLOAD_LOG_FILE" 2>/dev/null || true
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    [ -n "$DOWNLOAD_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') WARNING: $1" >> "$DOWNLOAD_LOG_FILE" 2>/dev/null || true
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    [ -n "$DOWNLOAD_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: $1" >> "$DOWNLOAD_LOG_FILE" 2>/dev/null || true
}

print_substep() {
    echo -e "   ${BLUE}→ $1${NC}"
    [ "$VERBOSE_MODE" = true ] && [ -n "$DOWNLOAD_LOG_FILE" ] && echo "$(date '+%Y-%m-%d %H:%M:%S') SUBSTEP: $1" >> "$DOWNLOAD_LOG_FILE" 2>/dev/null || true
}

print_progress() {
    local message="$1"
    local percentage="$2"
    if [ -n "$percentage" ]; then
        echo -e "${CYAN}🔄 $message ($percentage%)${NC}"
    else
        echo -e "${CYAN}🔄 $message${NC}"
    fi
}

# Core utility function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialize download engine
initialize_download_engine() {
    local log_suffix="${1:-$(date +%Y%m%d-%H%M%S)}"
    
    DOWNLOAD_LOG_FILE="/tmp/anarqq-download-$log_suffix.log"
    TEMP_DIR=$(mktemp -d -t anarqq-download-XXXXXX)
    
    print_info "Initializing download engine..."
    print_substep "Log file: $DOWNLOAD_LOG_FILE"
    print_substep "Temp directory: $TEMP_DIR"
    
    # Log initialization
    echo "$(date '+%Y-%m-%d %H:%M:%S') INIT: Download engine initialized" > "$DOWNLOAD_LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') TEMP_DIR: $TEMP_DIR" >> "$DOWNLOAD_LOG_FILE"
    
    # Set up cleanup trap
    trap 'cleanup_download_engine' EXIT
}

# Cleanup function
cleanup_download_engine() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        print_substep "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi
}

# Exponential backoff retry function
retry_with_exponential_backoff() {
    local max_attempts="$1"
    local initial_delay="$2"
    local command_to_run="$3"
    local context="$4"
    
    local attempt=1
    local delay="$initial_delay"
    
    while [ $attempt -le $max_attempts ]; do
        DOWNLOAD_STATS["attempts"]=$((${DOWNLOAD_STATS["attempts"]} + 1))
        
        print_substep "Attempt $attempt/$max_attempts: $context"
        
        local start_time=$(date +%s)
        if eval "$command_to_run"; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            DOWNLOAD_STATS["successes"]=$((${DOWNLOAD_STATS["successes"]} + 1))
            DOWNLOAD_STATS["total_time"]=$((${DOWNLOAD_STATS["total_time"]} + duration))
            
            print_success "$context completed in ${duration}s"
            return 0
        fi
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        DOWNLOAD_STATS["failures"]=$((${DOWNLOAD_STATS["failures"]} + 1))
        DOWNLOAD_STATS["total_time"]=$((${DOWNLOAD_STATS["total_time"]} + duration))
        
        if [ $attempt -lt $max_attempts ]; then
            print_warning "Attempt $attempt failed, retrying in ${delay}s..."
            sleep $delay
            
            # Exponential backoff with jitter
            delay=$((delay * 2))
            if [ $delay -gt $MAX_DELAY ]; then
                delay=$MAX_DELAY
            fi
            
            # Add random jitter (0-25% of delay)
            local jitter=$((delay / 4))
            local random_jitter=$((RANDOM % jitter))
            delay=$((delay + random_jitter))
        fi
        
        attempt=$((attempt + 1))
    done
    
    print_error "$context failed after $max_attempts attempts"
    return 1
}

# Git clone method (primary)
download_with_git() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="${3:-main}"
    local depth="${4:-1}"
    
    if ! command_exists git; then
        print_warning "Git not available for download"
        return 1
    fi
    
    print_substep "Attempting git clone method..."
    
    # Ensure target directory parent exists
    mkdir -p "$(dirname "$target_dir")"
    
    # Remove existing directory if it exists
    if [ -d "$target_dir" ]; then
        rm -rf "$target_dir"
    fi
    
    # Construct git command
    local git_cmd="git clone --depth $depth --branch $branch --single-branch '$repo_url' '$target_dir'"
    
    # Log the attempt
    echo "$(date '+%Y-%m-%d %H:%M:%S') GIT_CLONE: $git_cmd" >> "$DOWNLOAD_LOG_FILE"
    
    # Execute with retry logic
    if retry_with_exponential_backoff $MAX_RETRIES $INITIAL_DELAY "$git_cmd" "Git clone"; then
        DOWNLOAD_STATS["method_used"]="git"
        
        # Verify the clone was successful
        if [ -d "$target_dir" ] && [ -d "$target_dir/.git" ]; then
            print_success "Git clone successful"
            return 0
        else
            print_error "Git clone appeared successful but directory validation failed"
            return 1
        fi
    fi
    
    return 1
}

# cURL ZIP download method
download_with_curl() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="${3:-main}"
    
    if ! command_exists curl; then
        print_warning "cURL not available for download"
        return 1
    fi
    
    print_substep "Attempting cURL ZIP download method..."
    
    # Construct ZIP URL
    local zip_url="${repo_url}/archive/refs/heads/${branch}.zip"
    local zip_file="$TEMP_DIR/$(basename "$repo_url")-${branch}.zip"
    
    # Log the attempt
    echo "$(date '+%Y-%m-%d %H:%M:%S') CURL_DOWNLOAD: $zip_url -> $zip_file" >> "$DOWNLOAD_LOG_FILE"
    
    # Download with cURL
    local curl_cmd="curl -L -f -s --connect-timeout 30 --max-time 300 -o '$zip_file' '$zip_url'"
    
    if retry_with_exponential_backoff $MAX_RETRIES $INITIAL_DELAY "$curl_cmd" "cURL download"; then
        # Verify download
        if [ -f "$zip_file" ] && [ -s "$zip_file" ]; then
            print_success "cURL download successful"
            
            # Extract the archive
            if extract_archive "$zip_file" "$target_dir" "$branch"; then
                DOWNLOAD_STATS["method_used"]="curl"
                return 0
            else
                print_error "Archive extraction failed after successful cURL download"
                return 1
            fi
        else
            print_error "cURL download failed - file not found or empty"
            return 1
        fi
    fi
    
    return 1
}

# wget ZIP download method
download_with_wget() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="${3:-main}"
    
    if ! command_exists wget; then
        print_warning "wget not available for download"
        return 1
    fi
    
    print_substep "Attempting wget ZIP download method..."
    
    # Construct ZIP URL
    local zip_url="${repo_url}/archive/refs/heads/${branch}.zip"
    local zip_file="$TEMP_DIR/$(basename "$repo_url")-${branch}.zip"
    
    # Log the attempt
    echo "$(date '+%Y-%m-%d %H:%M:%S') WGET_DOWNLOAD: $zip_url -> $zip_file" >> "$DOWNLOAD_LOG_FILE"
    
    # Download with wget
    local wget_cmd="wget --timeout=30 --tries=1 --quiet -O '$zip_file' '$zip_url'"
    
    if retry_with_exponential_backoff $MAX_RETRIES $INITIAL_DELAY "$wget_cmd" "wget download"; then
        # Verify download
        if [ -f "$zip_file" ] && [ -s "$zip_file" ]; then
            print_success "wget download successful"
            
            # Extract the archive
            if extract_archive "$zip_file" "$target_dir" "$branch"; then
                DOWNLOAD_STATS["method_used"]="wget"
                return 0
            else
                print_error "Archive extraction failed after successful wget download"
                return 1
            fi
        else
            print_error "wget download failed - file not found or empty"
            return 1
        fi
    fi
    
    return 1
}

# Multi-method archive extraction
extract_archive() {
    local archive_file="$1"
    local target_dir="$2"
    local branch="${3:-main}"
    
    print_substep "Extracting archive: $(basename "$archive_file")"
    
    # Create extraction directory
    local extract_dir="$TEMP_DIR/extract_$(basename "$archive_file" .zip)"
    mkdir -p "$extract_dir"
    
    # Try multiple extraction methods
    local extraction_success=false
    
    # Method 1: unzip (preferred)
    if command_exists unzip && [ "$extraction_success" = false ]; then
        print_substep "Trying unzip extraction..."
        if unzip -q "$archive_file" -d "$extract_dir" 2>/dev/null; then
            print_success "unzip extraction successful"
            extraction_success=true
        else
            print_warning "unzip extraction failed"
        fi
    fi
    
    # Method 2: Python zipfile (fallback)
    if command_exists python3 && [ "$extraction_success" = false ]; then
        print_substep "Trying Python zipfile extraction..."
        local python_extract_cmd="python3 -c \"
import zipfile
import os
try:
    with zipfile.ZipFile('$archive_file', 'r') as zip_ref:
        zip_ref.extractall('$extract_dir')
    print('Python extraction successful')
except Exception as e:
    print(f'Python extraction failed: {e}')
    exit(1)
\""
        
        if eval "$python_extract_cmd" 2>/dev/null; then
            print_success "Python zipfile extraction successful"
            extraction_success=true
        else
            print_warning "Python zipfile extraction failed"
        fi
    fi
    
    # Method 3: Node.js (if available and has required modules)
    if command_exists node && [ "$extraction_success" = false ]; then
        print_substep "Trying Node.js extraction..."
        local node_extract_cmd="node -e \"
const fs = require('fs');
const path = require('path');
try {
    // Try to use built-in zlib for basic ZIP support
    const zlib = require('zlib');
    console.log('Node.js extraction not implemented - requires additional modules');
    process.exit(1);
} catch(e) {
    console.log('Node.js extraction failed:', e.message);
    process.exit(1);
}
\""
        
        # Note: This is a placeholder - full Node.js ZIP extraction would require additional modules
        print_warning "Node.js extraction requires additional modules (adm-zip)"
    fi
    
    # Method 4: Try system unzip with different options
    if [ "$extraction_success" = false ] && command_exists unzip; then
        print_substep "Trying unzip with alternative options..."
        if unzip -o "$archive_file" -d "$extract_dir" 2>/dev/null; then
            print_success "Alternative unzip extraction successful"
            extraction_success=true
        fi
    fi
    
    if [ "$extraction_success" = false ]; then
        print_error "All extraction methods failed"
        return 1
    fi
    
    # Move extracted content to target directory
    if move_extracted_content "$extract_dir" "$target_dir" "$branch"; then
        print_success "Archive extracted and moved to target directory"
        return 0
    else
        print_error "Failed to move extracted content"
        return 1
    fi
}

# Move extracted content to target directory
move_extracted_content() {
    local extract_dir="$1"
    local target_dir="$2"
    local branch="${3:-main}"
    
    print_substep "Moving extracted content to target directory..."
    
    # Find the extracted directory (GitHub creates repo-branch format)
    local extracted_subdir=""
    
    # Look for directory with branch suffix
    for dir in "$extract_dir"/*-"$branch"; do
        if [ -d "$dir" ]; then
            extracted_subdir="$dir"
            break
        fi
    done
    
    # If not found, look for any subdirectory
    if [ -z "$extracted_subdir" ]; then
        for dir in "$extract_dir"/*; do
            if [ -d "$dir" ]; then
                extracted_subdir="$dir"
                break
            fi
        done
    fi
    
    # If still not found, use extract_dir itself
    if [ -z "$extracted_subdir" ]; then
        extracted_subdir="$extract_dir"
    fi
    
    if [ ! -d "$extracted_subdir" ]; then
        print_error "No extracted directory found"
        return 1
    fi
    
    print_substep "Found extracted content in: $(basename "$extracted_subdir")"
    
    # Create target directory
    mkdir -p "$target_dir"
    
    # Remove existing content if any
    if [ -d "$target_dir" ] && [ "$(ls -A "$target_dir" 2>/dev/null)" ]; then
        print_substep "Removing existing content in target directory..."
        rm -rf "$target_dir"/*
        rm -rf "$target_dir"/.[^.]* 2>/dev/null || true
    fi
    
    # Move content
    if cp -r "$extracted_subdir"/* "$target_dir/" 2>/dev/null; then
        # Also copy hidden files
        cp -r "$extracted_subdir"/.[^.]* "$target_dir/" 2>/dev/null || true
        print_success "Content moved successfully"
        return 0
    else
        print_error "Failed to move extracted content"
        return 1
    fi
}

# Main download function with fallback methods
download_repository() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="${3:-main}"
    local repo_name="${4:-$(basename "$repo_url")}"
    
    print_info "Downloading repository: $repo_name"
    print_substep "URL: $repo_url"
    print_substep "Target: $target_dir"
    print_substep "Branch: $branch"
    
    # Reset download statistics
    DOWNLOAD_STATS["attempts"]=0
    DOWNLOAD_STATS["successes"]=0
    DOWNLOAD_STATS["failures"]=0
    DOWNLOAD_STATS["method_used"]=""
    DOWNLOAD_STATS["total_time"]=0
    
    local start_time=$(date +%s)
    
    # Try download methods in order of preference
    local methods=("git" "curl" "wget")
    local success=false
    
    for method in "${methods[@]}"; do
        print_substep "Trying $method method..."
        
        case $method in
            git)
                if download_with_git "$repo_url" "$target_dir" "$branch"; then
                    success=true
                    break
                fi
                ;;
            curl)
                if download_with_curl "$repo_url" "$target_dir" "$branch"; then
                    success=true
                    break
                fi
                ;;
            wget)
                if download_with_wget "$repo_url" "$target_dir" "$branch"; then
                    success=true
                    break
                fi
                ;;
        esac
        
        print_warning "$method method failed, trying next method..."
    done
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        print_success "Repository downloaded successfully using ${DOWNLOAD_STATS["method_used"]} method"
        print_substep "Total time: ${total_duration}s"
        print_substep "Attempts: ${DOWNLOAD_STATS["attempts"]}"
        
        # Log success
        echo "$(date '+%Y-%m-%d %H:%M:%S') SUCCESS: $repo_name downloaded via ${DOWNLOAD_STATS["method_used"]} in ${total_duration}s" >> "$DOWNLOAD_LOG_FILE"
        
        # Validate download
        if validate_download "$target_dir"; then
            print_success "Download validation passed"
            return 0
        else
            print_error "Download validation failed"
            return 1
        fi
    else
        print_error "All download methods failed for repository: $repo_name"
        print_substep "Total attempts: ${DOWNLOAD_STATS["attempts"]}"
        print_substep "Total time: ${total_duration}s"
        
        # Log failure
        echo "$(date '+%Y-%m-%d %H:%M:%S') FAILURE: $repo_name download failed after ${DOWNLOAD_STATS["attempts"]} attempts in ${total_duration}s" >> "$DOWNLOAD_LOG_FILE"
        
        # Provide troubleshooting information
        provide_download_troubleshooting "$repo_url" "$repo_name"
        
        return 1
    fi
}

# Validate downloaded repository
validate_download() {
    local target_dir="$1"
    
    print_substep "Validating download..."
    
    # Check if directory exists and is not empty
    if [ ! -d "$target_dir" ]; then
        print_error "Target directory does not exist"
        return 1
    fi
    
    if [ ! "$(ls -A "$target_dir" 2>/dev/null)" ]; then
        print_error "Target directory is empty"
        return 1
    fi
    
    # Check for common repository files
    local common_files=("package.json" "README.md" "README.rst" "Makefile" "Dockerfile")
    local found_files=0
    
    for file in "${common_files[@]}"; do
        if [ -f "$target_dir/$file" ]; then
            ((found_files++))
        fi
    done
    
    if [ $found_files -gt 0 ]; then
        print_substep "Found $found_files common repository files"
        return 0
    else
        print_warning "No common repository files found, but directory is not empty"
        return 0  # Still consider it valid
    fi
}

# Provide troubleshooting information
provide_download_troubleshooting() {
    local repo_url="$1"
    local repo_name="$2"
    
    print_info "Troubleshooting information for $repo_name:"
    echo ""
    
    print_info "Possible causes:"
    echo "  1. Repository is private and requires authentication"
    echo "  2. Network connectivity issues"
    echo "  3. Repository URL is incorrect or has moved"
    echo "  4. Branch name is incorrect (tried: main)"
    echo "  5. Repository is temporarily unavailable"
    echo ""
    
    print_info "Manual download options:"
    echo "  1. Visit: $repo_url"
    echo "  2. Download as ZIP manually"
    echo "  3. Set up SSH keys for private repositories"
    echo "  4. Use personal access token for authentication"
    echo ""
    
    print_info "Authentication setup (for private repositories):"
    echo "  SSH: ssh-keygen -t ed25519 -C 'your-email@example.com'"
    echo "  Add key to GitHub: https://github.com/settings/keys"
    echo "  Token: https://github.com/settings/tokens"
    echo ""
    
    print_info "Network troubleshooting:"
    echo "  Test connectivity: ping github.com"
    echo "  Check DNS: nslookup github.com"
    echo "  Try different network or VPN"
    echo ""
}

# Generate download report
generate_download_report() {
    local report_file="${1:-/tmp/anarqq-download-report-$(date +%Y%m%d-%H%M%S).json}"
    
    print_info "Generating download report: $report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "download_engine": {
    "version": "1.0.0",
    "log_file": "$DOWNLOAD_LOG_FILE",
    "temp_dir": "$TEMP_DIR"
  },
  "configuration": {
    "max_retries": $MAX_RETRIES,
    "initial_delay": $INITIAL_DELAY,
    "max_delay": $MAX_DELAY,
    "verbose_mode": $VERBOSE_MODE
  },
  "capabilities": {
    "git_available": $(command_exists git && echo "true" || echo "false"),
    "curl_available": $(command_exists curl && echo "true" || echo "false"),
    "wget_available": $(command_exists wget && echo "true" || echo "false"),
    "unzip_available": $(command_exists unzip && echo "true" || echo "false"),
    "python3_available": $(command_exists python3 && echo "true" || echo "false"),
    "node_available": $(command_exists node && echo "true" || echo "false")
  },
  "statistics": {
    "total_attempts": ${DOWNLOAD_STATS["attempts"]},
    "successful_operations": ${DOWNLOAD_STATS["successes"]},
    "failed_operations": ${DOWNLOAD_STATS["failures"]},
    "last_method_used": "${DOWNLOAD_STATS["method_used"]}",
    "total_time_seconds": ${DOWNLOAD_STATS["total_time"]}
  }
}
EOF
    
    print_success "Download report generated: $report_file"
}

# Main function for testing the download engine
main_download_test() {
    local test_repo="${1:-https://github.com/octocat/Hello-World}"
    local test_dir="${2:-/tmp/test-download}"
    local test_branch="${3:-main}"
    
    print_info "Testing download engine with repository: $test_repo"
    
    # Initialize
    initialize_download_engine
    
    # Test download
    if download_repository "$test_repo" "$test_dir" "$test_branch" "test-repo"; then
        print_success "Download test completed successfully"
        
        # Show downloaded content
        if [ -d "$test_dir" ]; then
            print_info "Downloaded content:"
            ls -la "$test_dir" | head -10
        fi
        
        # Generate report
        generate_download_report
        
        return 0
    else
        print_error "Download test failed"
        generate_download_report
        return 1
    fi
}

# Command line interface
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE_MODE=true
                shift
                ;;
            -r|--retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            -d|--delay)
                INITIAL_DELAY="$2"
                shift 2
                ;;
            --max-delay)
                MAX_DELAY="$2"
                shift 2
                ;;
            -t|--test)
                TEST_MODE=true
                TEST_REPO="$2"
                shift 2
                ;;
            --test-dir)
                TEST_DIR="$2"
                shift 2
                ;;
            --test-branch)
                TEST_BRANCH="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  -v, --verbose         Enable verbose logging"
                echo "  -r, --retries NUM     Set maximum retry attempts (default: 3)"
                echo "  -d, --delay SEC       Set initial delay for retries (default: 2)"
                echo "  --max-delay SEC       Set maximum delay for retries (default: 30)"
                echo "  -t, --test REPO       Test download with specified repository"
                echo "  --test-dir DIR        Set test download directory"
                echo "  --test-branch BRANCH  Set test branch (default: main)"
                echo "  -h, --help            Show this help"
                echo ""
                echo "Example:"
                echo "  $0 --test https://github.com/octocat/Hello-World --test-dir /tmp/test"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run test if requested
    if [ "$TEST_MODE" = true ]; then
        main_download_test "$TEST_REPO" "${TEST_DIR:-/tmp/test-download}" "${TEST_BRANCH:-main}"
    else
        print_info "Download engine loaded. Use --test to run a test download."
        print_info "Use --help for more options."
    fi
fi
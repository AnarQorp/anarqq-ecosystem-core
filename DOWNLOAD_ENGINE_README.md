# AnarQ&Q Robust Download Engine

## Overview

The AnarQ&Q Robust Download Engine is a comprehensive, multi-method repository downloading system with fallback mechanisms, retry logic, and extensive error handling. It implements the requirements for Task 3 of the robust installer system specification.

## Features

### ✅ Multiple Download Methods
- **Git Clone** (Primary method) - Fast, efficient, includes full git history
- **cURL ZIP Download** (Fallback) - HTTP-based ZIP archive download
- **wget ZIP Download** (Fallback) - Alternative HTTP client for ZIP archives

### ✅ Multiple Archive Extraction Methods
- **unzip** (Preferred) - Standard ZIP extraction utility
- **Python zipfile** (Fallback) - Python-based ZIP extraction
- **Node.js** (Placeholder) - Ready for adm-zip module integration

### ✅ Exponential Backoff Retry Logic
- Configurable maximum retry attempts (default: 3)
- Exponential backoff with jitter to prevent thundering herd
- Per-method retry with different strategies
- Comprehensive retry statistics tracking

### ✅ Comprehensive Error Handling
- Detailed error logging with timestamps
- Context-aware error messages
- Troubleshooting guidance for common issues
- Graceful degradation and cleanup

### ✅ Advanced Features
- Progress indicators and status reporting
- Download validation and verification
- Temporary file management with automatic cleanup
- Detailed reporting and statistics
- Verbose logging mode for debugging

## Usage

### Basic Usage

```bash
# Source the download engine
source ./install-download-engine.sh

# Initialize the engine
initialize_download_engine

# Download a repository
download_repository "https://github.com/user/repo" "/target/path" "main" "repo-name"

# Cleanup
cleanup_download_engine
```

### Command Line Usage

```bash
# Test download with default settings
./install-download-engine.sh --test https://github.com/octocat/Hello-World

# Test with custom settings
./install-download-engine.sh --test https://github.com/user/repo \
    --test-dir /tmp/test \
    --test-branch main \
    --retries 5 \
    --delay 3 \
    --verbose

# Show help
./install-download-engine.sh --help
```

### Integration with Installer

The download engine integrates seamlessly with the main installer:

```bash
# The installer automatically detects and uses the robust download engine
./install-anarqq-demo.sh
```

## API Reference

### Core Functions

#### `initialize_download_engine([log_suffix])`
Initializes the download engine with logging and temporary directory setup.

#### `download_repository(repo_url, target_dir, [branch], [repo_name])`
Main download function that tries all available methods with fallback.

**Parameters:**
- `repo_url`: Repository URL (without .git suffix)
- `target_dir`: Target directory for extraction
- `branch`: Git branch to download (default: "main")
- `repo_name`: Display name for logging (default: basename of URL)

**Returns:** 0 on success, 1 on failure

#### `cleanup_download_engine()`
Cleans up temporary files and resources.

### Download Methods

#### `download_with_git(repo_url, target_dir, [branch], [depth])`
Downloads repository using git clone with shallow clone support.

#### `download_with_curl(repo_url, target_dir, [branch])`
Downloads repository as ZIP archive using cURL.

#### `download_with_wget(repo_url, target_dir, [branch])`
Downloads repository as ZIP archive using wget.

### Extraction Methods

#### `extract_archive(archive_file, target_dir, [branch])`
Extracts ZIP archive using multiple fallback methods.

#### `move_extracted_content(extract_dir, target_dir, [branch])`
Moves extracted content to final destination, handling GitHub's directory structure.

### Utility Functions

#### `retry_with_exponential_backoff(max_attempts, initial_delay, command, context)`
Executes command with exponential backoff retry logic.

#### `validate_download(target_dir)`
Validates that download was successful and contains expected content.

#### `generate_download_report([report_file])`
Generates detailed JSON report of download operations.

## Configuration

### Environment Variables

```bash
# Maximum retry attempts (default: 3)
MAX_RETRIES=5

# Initial delay in seconds (default: 2)
INITIAL_DELAY=3

# Maximum delay in seconds (default: 30)
MAX_DELAY=60

# Enable verbose logging (default: false)
VERBOSE_MODE=true
```

### Command Line Options

```bash
-v, --verbose         Enable verbose logging
-r, --retries NUM     Set maximum retry attempts
-d, --delay SEC       Set initial delay for retries
--max-delay SEC       Set maximum delay for retries
-t, --test REPO       Test download with specified repository
--test-dir DIR        Set test download directory
--test-branch BRANCH  Set test branch
-h, --help            Show help message
```

## Error Handling

### Error Categories

1. **Network Errors**: Connection timeouts, DNS failures, HTTP errors
2. **Authentication Errors**: Private repository access, SSH key issues
3. **Extraction Errors**: Corrupted archives, missing extraction tools
4. **Validation Errors**: Empty directories, missing expected files

### Troubleshooting

The engine provides comprehensive troubleshooting information:

- **Network Issues**: Connectivity tests, DNS resolution checks
- **Authentication**: SSH key setup, personal access token configuration
- **Repository Issues**: Branch validation, URL verification
- **System Issues**: Missing dependencies, permission problems

### Logging

All operations are logged with timestamps and context:

```
[2025-01-05 10:30:15] INFO: Initializing download engine...
[2025-01-05 10:30:16] GIT_CLONE: git clone --depth 1 --branch main 'https://github.com/user/repo' '/target/path'
[2025-01-05 10:30:18] SUCCESS: Repository downloaded via git in 2s
```

## Testing

### Unit Tests

```bash
# Test all download methods
./test-zip-download.sh

# Test function availability
./test-functions-only.sh

# Test installer integration
./test-installer-integration.sh
```

### Integration Tests

```bash
# Test with real repository
./install-download-engine.sh --test https://github.com/octocat/Hello-World --verbose

# Test with different branches
./install-download-engine.sh --test https://github.com/user/repo --test-branch develop

# Test error handling
./install-download-engine.sh --test https://github.com/nonexistent/repo
```

## Performance

### Benchmarks

- **Git Clone**: ~1-2 seconds for small repositories
- **ZIP Download**: ~2-3 seconds including extraction
- **Retry Logic**: Exponential backoff prevents excessive load
- **Memory Usage**: Minimal, uses temporary files for large archives

### Optimization Features

- Shallow git clones (--depth 1) for faster downloads
- Parallel extraction methods testing
- Intelligent fallback ordering (fastest methods first)
- Automatic cleanup of temporary files

## Requirements Compliance

This implementation satisfies all requirements from Task 3:

### ✅ Requirement 2.1: Multiple Download Methods
- Git clone as primary method
- cURL and wget as ZIP download fallbacks
- Automatic method selection and fallback

### ✅ Requirement 2.2: Retry Logic with Exponential Backoff
- Configurable retry attempts (default: 3)
- Exponential backoff with jitter
- Per-method retry strategies

### ✅ Requirement 2.3: Network Error Handling
- Connection timeout handling
- HTTP error code handling
- DNS resolution error handling
- Comprehensive error reporting

### ✅ Requirement 2.4: Multiple Archive Extraction Methods
- unzip (preferred method)
- Python zipfile (fallback)
- Node.js support (extensible)
- Automatic method selection

## Future Enhancements

### Planned Features

1. **Resume Downloads**: Support for interrupted download resumption
2. **Parallel Downloads**: Multiple repositories simultaneously
3. **Checksum Verification**: SHA256 verification for downloaded archives
4. **Bandwidth Throttling**: Configurable download speed limits
5. **Mirror Support**: Multiple repository mirrors for redundancy

### Extension Points

1. **Custom Extraction Methods**: Plugin system for additional extractors
2. **Authentication Providers**: OAuth, token-based authentication
3. **Progress Callbacks**: Custom progress reporting
4. **Storage Backends**: Support for different storage systems

## License

This download engine is part of the AnarQ&Q ecosystem and follows the same licensing terms as the main project.

## Support

For issues, questions, or contributions:
- Email: anarqorp@proton.me
- GitHub: https://github.com/AnarQorp
- Documentation: See project README files
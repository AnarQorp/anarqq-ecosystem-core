# AnarQ&Q Interactive Installer System

## Overview

The AnarQ&Q Interactive Installer System provides a comprehensive, user-friendly installation experience with real-time progress feedback, interactive prompts, and robust error handling. This system implements all requirements for task 7 of the robust installer system specification.

## Features

### ✨ Interactive User Interface
- **Progress Indicators**: Real-time progress bars with percentage completion
- **Step-by-Step Guidance**: Clear indication of current installation step
- **Time Estimation**: Estimated time remaining based on previous steps
- **Visual Feedback**: Color-coded messages and status indicators

### 🎯 User Prompts and Options
- **Installation Mode Selection**: Choose between minimal, full, or development installation
- **Interactive Confirmations**: Yes/No prompts with default options and explanations
- **Customizable Responses**: User input with default values and validation
- **Clear Instructions**: Detailed explanations for each choice

### 📊 Progress Feedback
- **Multi-Level Progress**: Overall progress and individual operation progress
- **Spinning Indicators**: Visual feedback for long-running background operations
- **Operation Tracking**: Real-time updates for multi-item operations
- **Duration Tracking**: Time tracking for each installation step

### 🛡️ Graceful Cancellation
- **Interrupt Handling**: Clean handling of Ctrl+C interruptions
- **Cleanup Options**: Interactive choice to clean up partial installations
- **Safe Exit**: Proper cleanup of temporary files and processes
- **User Confirmation**: Confirmation before performing destructive operations

## Files

### Core Components

1. **`installer-ui-module.sh`** - Main UI module with all interactive components
2. **`install-anarqq-interactive.sh`** - Enhanced installer with full UI integration
3. **`test-interactive-ui.sh`** - Comprehensive test suite for UI components

### Dependencies

- **`install-dependency-manager.sh`** - Dependency management system (required)
- Standard Unix utilities: `bash`, `curl`/`wget`, `git`, `npm`

## Usage

### Basic Installation

```bash
# Make the installer executable
chmod +x install-anarqq-interactive.sh

# Run the interactive installer
./install-anarqq-interactive.sh
```

### Installation Modes

The installer offers three installation modes:

#### 1. Minimal Demo
- **Components**: Core demo components only
- **Time**: 2-3 minutes
- **Space**: ~100MB
- **Use Case**: Quick evaluation and testing

#### 2. Full Ecosystem
- **Components**: All 14 modules + backend services
- **Time**: 8-12 minutes
- **Space**: ~500MB
- **Use Case**: Complete AnarQ&Q ecosystem setup

#### 3. Development Environment
- **Components**: Full ecosystem + development tools and tests
- **Time**: 15-20 minutes
- **Space**: ~1GB
- **Use Case**: Development and contribution work

### Interactive Features

#### Progress Indicators
```
┌─────────────────────────────────────────────────────────────────┐
│ Step 3/8: Installation                                          │
└─────────────────────────────────────────────────────────────────┘

Progress: [██████████████████████████████░░░░░░░░░░░░░░░░░░░░] 60%
Installing dependencies and components
Estimated time remaining: 4m 32s

  ▶ Installing packages [████████████░░░░░░░░░░░░░░░░░░] 40% (2/5) core-package
```

#### User Prompts
```
Would you like to continue with the installation?
This will download and set up the AnarQ&Q ecosystem components.
Options: Y/n
Default: y
Your choice: 
```

#### Installation Summary
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                 🎉 Installation Completed! 🎉                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Installation Summary:
  Mode: full
  Location: /home/user/anarqq-ecosystem
  Components: All 14 modules + backend services
  Duration: 8m 45s
```

## Testing

### Run the Test Suite

```bash
# Make test script executable
chmod +x test-interactive-ui.sh

# Run comprehensive UI tests
./test-interactive-ui.sh
```

The test suite demonstrates:
- Progress indicators and bars
- User prompts and responses
- Error handling and cleanup
- Installation summaries
- Disk space checking

### Manual Testing

Test individual components:

```bash
# Source the UI module
source installer-ui-module.sh

# Initialize UI
initialize_ui

# Test progress indicators
set_total_steps 3
start_step "Test Step" "Testing progress indication"
show_substep "Running test operation..."
complete_step "Test completed"
```

## API Reference

### Core Functions

#### Progress Management
- `initialize_ui()` - Initialize the UI system
- `set_total_steps(count)` - Set total number of installation steps
- `start_step(name, description)` - Begin a new installation step
- `complete_step(name)` - Mark a step as completed
- `show_substep(message)` - Show a sub-operation within a step

#### Progress Indicators
- `show_progress_bar(percent, description)` - Display progress bar
- `show_operation_progress(name, total, current, item)` - Show operation progress
- `show_spinner(pid, message)` - Show spinning indicator for background process

#### User Interaction
- `prompt_user(question, default, options, explanation)` - General user prompt
- `prompt_yes_no(question, default, explanation)` - Yes/No prompt
- `select_installation_mode()` - Installation mode selection menu

#### Feedback and Messages
- `show_info(message)` - Informational message
- `show_warning(message)` - Warning message
- `show_error(message)` - Error message
- `show_installation_summary(mode, dir, components)` - Installation summary
- `show_next_steps(mode, dir)` - Post-installation guidance

#### Error Handling
- `handle_interruption()` - Handle Ctrl+C interruption
- `start_cleanup_process()` - Interactive cleanup process
- `check_and_show_disk_space(required_mb, path)` - Disk space validation

### Configuration Variables

```bash
# UI Colors
UI_RED='\033[0;31m'
UI_GREEN='\033[0;32m'
UI_YELLOW='\033[1;33m'
UI_BLUE='\033[0;34m'
UI_PURPLE='\033[0;35m'
UI_CYAN='\033[0;36m'
UI_WHITE='\033[1;37m'
UI_GRAY='\033[0;37m'
UI_BOLD='\033[1m'
UI_DIM='\033[2m'
UI_NC='\033[0m'

# Progress Tracking
CURRENT_STEP=0
TOTAL_STEPS=0
STEP_START_TIME=0
INSTALLATION_START_TIME=0
```

## Error Handling

### Graceful Interruption
When users press Ctrl+C during installation:

1. **Immediate Response**: Installation stops immediately
2. **User Choice**: Prompt to clean up partial installation
3. **Safe Cleanup**: Remove temporary files and partial installations
4. **Clear Exit**: Informative exit message

### Error Recovery
- **Automatic Retry**: Network operations with exponential backoff
- **Fallback Methods**: Multiple download and extraction methods
- **User Guidance**: Clear error messages with suggested solutions
- **Partial Recovery**: Continue installation when possible

### Validation
- **Pre-installation**: Disk space and dependency checks
- **Post-installation**: Comprehensive validation tests
- **User Confirmation**: Allow continuation despite minor issues

## Customization

### Adding New Steps
```bash
# Increase total steps
set_total_steps 9

# Add your custom step
start_step "Custom Operation" "Performing custom installation task"
show_substep "Initializing custom component..."
# ... your installation logic ...
complete_step "Custom operation completed"
```

### Custom Progress Operations
```bash
# Track multi-item operations
total_items=10
for i in {1..10}; do
    show_operation_progress "Processing items" $total_items $i "item-$i"
    # ... process item ...
done
```

### Custom User Prompts
```bash
# Custom prompt with validation
while true; do
    response=$(prompt_user "Enter port number:" "3000" "1024-65535" "Port for the web server")
    if [[ "$response" =~ ^[0-9]+$ ]] && [ "$response" -ge 1024 ] && [ "$response" -le 65535 ]; then
        break
    else
        show_error "Invalid port number. Please enter a number between 1024 and 65535."
    fi
done
```

## Requirements Compliance

This implementation satisfies all requirements from task 7:

### ✅ Requirement 6.1 - Progress Indicators
- Real-time progress bars with percentage completion
- Current step indication with estimated time remaining
- Visual progress feedback for all operations

### ✅ Requirement 6.2 - User Prompts
- Clear prompts with default options
- Detailed explanations for each choice
- Input validation and error handling

### ✅ Requirement 6.3 - Progress Bars
- Multi-level progress indication
- Operation-specific progress tracking
- Visual feedback for long-running operations

### ✅ Requirement 6.4 - Graceful Cancellation
- Interrupt signal handling (Ctrl+C)
- Interactive cleanup options
- Safe exit with proper cleanup

### ✅ Requirement 6.6 - Interactive Guidance
- Step-by-step installation guidance
- Clear status messages and feedback
- Post-installation next steps

## Troubleshooting

### Common Issues

1. **UI Not Displaying Correctly**
   - Ensure terminal supports ANSI colors
   - Check terminal width (minimum 80 characters recommended)

2. **Progress Bars Malformed**
   - Verify bash version (4.0+ recommended)
   - Check for conflicting terminal settings

3. **Interruption Not Working**
   - Ensure script has proper signal handling
   - Check if running in compatible shell environment

### Debug Mode

Enable verbose output for troubleshooting:

```bash
# Set debug mode before running
export DEBUG_UI=1
./install-anarqq-interactive.sh
```

## Contributing

To extend the interactive UI system:

1. **Add New UI Components**: Extend `installer-ui-module.sh`
2. **Test Thoroughly**: Update `test-interactive-ui.sh`
3. **Document Changes**: Update this README
4. **Follow Patterns**: Maintain consistent UI patterns and colors

## License

This interactive installer system is part of the AnarQ&Q ecosystem and follows the same licensing terms as the main project.
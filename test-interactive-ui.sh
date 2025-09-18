#!/bin/bash

# Test script for the Interactive UI Module
# Demonstrates all UI components and functionality

# Source the UI module
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/installer-ui-module.sh"

# Test function for progress indicators
test_progress_indicators() {
    echo "=== Testing Progress Indicators ==="
    
    # Initialize UI
    initialize_ui
    
    # Set up a test installation with 5 steps
    set_total_steps 5
    
    # Test each step with different scenarios
    start_step "System Check" "Checking system requirements and dependencies"
    show_substep "Detecting operating system..."
    sleep 1
    show_substep "Checking package managers..."
    sleep 1
    show_substep "Verifying permissions..."
    sleep 1
    complete_step "System check completed"
    
    start_step "Download" "Downloading required repositories"
    show_substep "Downloading demo repository..."
    sleep 2
    show_substep "Downloading core repository..."
    sleep 2
    complete_step "Download completed"
    
    start_step "Installation" "Installing dependencies and components"
    # Test operation progress
    for i in {1..5}; do
        show_operation_progress "Installing packages" 5 $i "package-$i"
        sleep 0.5
    done
    complete_step "Installation completed"
    
    start_step "Configuration" "Setting up environment and configuration files"
    show_substep "Creating configuration files..."
    sleep 1
    show_warning "Configuration file already exists, backing up..."
    sleep 1
    show_substep "Applying default settings..."
    sleep 1
    complete_step "Configuration completed"
    
    start_step "Validation" "Running post-installation tests"
    show_substep "Testing basic functionality..."
    sleep 1
    show_substep "Validating configuration..."
    sleep 1
    show_info "All tests passed successfully"
    complete_step "Validation completed"
    
    echo
}

# Test function for user prompts
test_user_prompts() {
    echo "=== Testing User Prompts ==="
    echo
    
    # Test basic prompt
    echo "Testing basic user prompt:"
    name=$(prompt_user "What is your name?" "Anonymous" "" "This will be used for personalization")
    echo "You entered: $name"
    echo
    
    # Test yes/no prompt with default yes
    echo "Testing yes/no prompt (default yes):"
    response1=$(prompt_yes_no "Do you want to continue?" "y" "This will proceed with the test")
    echo "You chose: $response1"
    echo
    
    # Test yes/no prompt with default no
    echo "Testing yes/no prompt (default no):"
    response2=$(prompt_yes_no "Do you want to enable debug mode?" "n" "This will show detailed logging")
    echo "You chose: $response2"
    echo
    
    # Test installation mode selection
    echo "Testing installation mode selection:"
    mode=$(select_installation_mode)
    echo "You selected: $mode"
    echo
}

# Test function for progress bars and spinners
test_progress_feedback() {
    echo "=== Testing Progress Feedback ==="
    echo
    
    # Test progress bars
    echo "Testing progress bars:"
    for percent in 0 25 50 75 100; do
        show_progress_bar $percent "Processing step $percent%"
        sleep 0.5
    done
    echo
    
    # Test operation progress
    echo "Testing operation progress:"
    for i in {1..10}; do
        show_operation_progress "Processing files" 10 $i "file-$i.txt"
        sleep 0.3
    done
    echo
    
    # Test spinner (simulate background process)
    echo "Testing spinner:"
    (sleep 3) &
    spinner_pid=$!
    show_spinner $spinner_pid "Processing in background"
    wait $spinner_pid
    echo "Background process completed"
    echo
}

# Test function for disk space check
test_disk_space_check() {
    echo "=== Testing Disk Space Check ==="
    echo
    
    # Test with reasonable space requirement
    echo "Testing disk space check (100MB requirement):"
    if check_and_show_disk_space 100 "$HOME"; then
        echo "Disk space check passed"
    else
        echo "Disk space check failed"
    fi
    echo
    
    # Test with unrealistic space requirement
    echo "Testing disk space check (1TB requirement):"
    if check_and_show_disk_space 1000000 "$HOME"; then
        echo "Disk space check passed"
    else
        echo "Disk space check failed (expected)"
    fi
    echo
}

# Test function for installation summary
test_installation_summary() {
    echo "=== Testing Installation Summary ==="
    echo
    
    # Simulate installation completion
    INSTALLATION_START_TIME=$(($(date +%s) - 120))  # 2 minutes ago
    
    show_installation_summary "full" "$HOME/anarqq-ecosystem" "All 14 modules + backend services"
    echo
    
    show_next_steps "full" "$HOME/anarqq-ecosystem"
    echo
}

# Test function for error handling and cleanup
test_error_handling() {
    echo "=== Testing Error Handling ==="
    echo
    
    # Test different message types
    show_info "This is an informational message"
    show_warning "This is a warning message"
    show_error "This is an error message"
    echo
    
    # Test cleanup process (non-interactive for testing)
    echo "Testing cleanup process:"
    echo "Note: This would normally be interactive, but we'll simulate it"
    
    # Create some test files
    mkdir -p /tmp/test-cleanup
    touch /tmp/test-cleanup/test-file.txt
    
    # Simulate cleanup
    echo "Simulating cleanup of test files..."
    show_operation_progress "Cleaning up" 3 1 "test-file.txt"
    rm -rf /tmp/test-cleanup
    show_operation_progress "Cleaning up" 3 2 "temp directories"
    show_operation_progress "Cleaning up" 3 3 "log files"
    
    echo "Cleanup simulation completed"
    echo
}

# Main test function
main() {
    echo "Interactive UI Module Test Suite"
    echo "==============================="
    echo
    echo "This test will demonstrate all interactive UI components."
    echo "Some tests require user input, others are automated."
    echo
    
    read -p "Press Enter to start the tests..."
    echo
    
    # Run automated tests first
    test_progress_indicators
    test_progress_feedback
    test_disk_space_check
    test_installation_summary
    test_error_handling
    
    # Ask if user wants to test interactive components
    echo "The remaining tests require user interaction."
    read -p "Do you want to test interactive prompts? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_user_prompts
    else
        echo "Skipping interactive prompt tests"
    fi
    
    echo
    echo "=== Test Suite Completed ==="
    echo "All UI components have been demonstrated."
    echo "The interactive installer is ready for use!"
}

# Run the test suite
main "$@"
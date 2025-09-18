#!/bin/bash

# AnarQ&Q Ecosystem Demo Installer - Interactive UI Enhanced
# Enhanced installer with comprehensive interactive user interface
# Version: 2.1.0 - Interactive UI Integration
# Author: AnarQorp
# License: MIT

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source required modules
if [ -f "$SCRIPT_DIR/installer-ui-module.sh" ]; then
    source "$SCRIPT_DIR/installer-ui-module.sh"
else
    echo "❌ Error: installer-ui-module.sh not found in $SCRIPT_DIR"
    echo "Please ensure all installer modules are in the same directory"
    exit 1
fi

if [ -f "$SCRIPT_DIR/install-dependency-manager.sh" ]; then
    source "$SCRIPT_DIR/install-dependency-manager.sh"
else
    echo "❌ Error: install-dependency-manager.sh not found in $SCRIPT_DIR"
    echo "Please ensure all installer modules are in the same directory"
    exit 1
fi

# Configuration
DEMO_REPO="https://github.com/AnarQorp/anarqq-ecosystem-demo"
CORE_REPO="https://github.com/AnarQorp/anarqq-ecosystem-core"
INSTALL_DIR="$HOME/anarqq-ecosystem"
DEMO_DIR="$INSTALL_DIR/demo"
CORE_DIR="$INSTALL_DIR/core"

# Installation mode configuration
declare -A MODE_CONFIG
MODE_CONFIG["minimal_steps"]=6
MODE_CONFIG["minimal_space"]=100
MODE_CONFIG["full_steps"]=8
MODE_CONFIG["full_space"]=500
MODE_CONFIG["development_steps"]=10
MODE_CONFIG["development_space"]=1000

# Global installation state
INSTALL_MODE=""
SELECTED_COMPONENTS=""

# Enhanced error logging with UI integration
log_error() {
    local error_type="$1"
    local error_message="$2"
    local context="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_file="./anarqq-installer-$(date +%Y%m%d-%H%M%S).log"
    
    echo "[$timestamp] ERROR [$error_type]: $error_message" >> "$log_file"
    if [ -n "$context" ]; then
        echo "[$timestamp] CONTEXT: $context" >> "$log_file"
    fi
    
    show_error "$error_message"
    if [ -n "$context" ]; then
        show_info "Context: $context"
    fi
    show_info "Detailed log: $log_file"
}

# Retry function with UI progress feedback
retry_with_backoff() {
    local max_attempts="$1"
    local delay="$2"
    local command_to_run="$3"
    local operation_name="$4"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$command_to_run"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            show_substep "Attempt $attempt failed, retrying in ${delay}s..."
            
            # Show countdown
            for ((i=delay; i>0; i--)); do
                printf "\r  ${UI_GRAY}Retrying in %ds...${UI_NC}" "$i"
                sleep 1
            done
            printf "\r  ${UI_GRAY}Retrying now...     ${UI_NC}\n"
            
            delay=$((delay * 2))  # Exponential backoff
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Interactive welcome and mode selection
interactive_welcome() {
    initialize_ui
    
    echo -e "${UI_WHITE}${UI_BOLD}Welcome to the AnarQ&Q Ecosystem Installer!${UI_NC}"
    echo
    echo -e "${UI_GRAY}This interactive installer will guide you through setting up the${UI_NC}"
    echo -e "${UI_GRAY}AnarQ&Q decentralized ecosystem on your system.${UI_NC}"
    echo
    
    # Show system information
    show_info "Detected system: $(uname -s) $(uname -m)"
    show_info "Installation directory: $INSTALL_DIR"
    echo
    
    # Get user confirmation to proceed
    local proceed
    proceed=$(prompt_yes_no "Would you like to continue with the installation?" "y" \
        "This will download and set up the AnarQ&Q ecosystem components.")
    
    if [ "$proceed" != "y" ]; then
        echo -e "${UI_CYAN}Installation cancelled. Thank you for your interest in AnarQ&Q!${UI_NC}"
        exit 0
    fi
    
    echo
    
    # Select installation mode
    INSTALL_MODE=$(select_installation_mode)
    
    # Set up installation parameters based on mode
    case "$INSTALL_MODE" in
        "minimal")
            set_total_steps ${MODE_CONFIG["minimal_steps"]}
            SELECTED_COMPONENTS="Demo components only"
            ;;
        "full")
            set_total_steps ${MODE_CONFIG["full_steps"]}
            SELECTED_COMPONENTS="All 14 modules + backend services"
            ;;
        "development")
            set_total_steps ${MODE_CONFIG["development_steps"]}
            SELECTED_COMPONENTS="Full ecosystem + development tools"
            ;;
    esac
    
    echo
    show_info "Selected mode: $INSTALL_MODE"
    show_info "Components: $SELECTED_COMPONENTS"
    echo
    
    # Disk space check
    local required_space=${MODE_CONFIG["${INSTALL_MODE}_space"]}
    if ! check_and_show_disk_space "$required_space" "$INSTALL_DIR"; then
        echo
        local continue_anyway
        continue_anyway=$(prompt_yes_no "Continue anyway?" "n" \
            "Installation may fail due to insufficient disk space.")
        
        if [ "$continue_anyway" != "y" ]; then
            echo -e "${UI_CYAN}Installation cancelled due to disk space concerns.${UI_NC}"
            exit 0
        fi
    fi
    
    echo
    
    # Final confirmation
    local final_confirm
    final_confirm=$(prompt_yes_no "Ready to begin installation?" "y" \
        "This will start the actual installation process.")
    
    if [ "$final_confirm" != "y" ]; then
        echo -e "${UI_CYAN}Installation cancelled.${UI_NC}"
        exit 0
    fi
    
    echo
}

# Enhanced prerequisite check with interactive UI
check_prerequisites_interactive() {
    start_step "System Prerequisites" "Checking and installing required system dependencies"
    
    # Initialize the dependency manager
    show_substep "Initializing system detection..."
    initialize_system_info
    
    # Run interactive dependency check with progress feedback
    show_substep "Checking system dependencies..."
    if interactive_dependency_check; then
        complete_step "System prerequisites verified"
        return 0
    else
        show_error "Critical prerequisites are missing"
        
        local retry_check
        retry_check=$(prompt_yes_no "Would you like to retry the dependency check?" "y" \
            "Some dependencies might have been installed during the check.")
        
        if [ "$retry_check" = "y" ]; then
            show_substep "Retrying dependency check..."
            if interactive_dependency_check; then
                complete_step "System prerequisites verified on retry"
                return 0
            fi
        fi
        
        show_error "Unable to satisfy all prerequisites"
        show_info "Please install missing dependencies manually and run the installer again"
        return 1
    fi
}

# Interactive directory creation
create_install_directory_interactive() {
    start_step "Installation Directory" "Setting up installation directory"
    
    show_substep "Checking installation directory: $INSTALL_DIR"
    
    if [ -d "$INSTALL_DIR" ]; then
        show_warning "Directory $INSTALL_DIR already exists"
        
        # Show directory contents if not empty
        if [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
            show_info "Directory contains existing files"
            local show_contents
            show_contents=$(prompt_yes_no "Would you like to see the contents?" "n")
            
            if [ "$show_contents" = "y" ]; then
                echo -e "${UI_GRAY}"
                ls -la "$INSTALL_DIR" | head -10
                if [ $(ls -1 "$INSTALL_DIR" | wc -l) -gt 10 ]; then
                    echo "... and more files"
                fi
                echo -e "${UI_NC}"
            fi
        fi
        
        local overwrite
        overwrite=$(prompt_yes_no "Do you want to overwrite the existing directory?" "n" \
            "This will permanently delete all existing files in the directory.")
        
        if [ "$overwrite" != "y" ]; then
            show_info "Installation cancelled to preserve existing files"
            exit 0
        fi
        
        show_substep "Removing existing directory..."
        rm -rf "$INSTALL_DIR"
    fi
    
    show_substep "Creating installation directory..."
    mkdir -p "$INSTALL_DIR"
    
    complete_step "Installation directory created"
}

# Enhanced repository download with interactive progress
download_repositories_interactive() {
    start_step "Repository Download" "Downloading AnarQ&Q ecosystem repositories"
    
    # Configure repositories based on installation mode
    local repositories=()
    
    case "$INSTALL_MODE" in
        "minimal")
            repositories=(
                "demo|$DEMO_REPO|$DEMO_DIR|required|Demo Repository"
            )
            ;;
        "full"|"development")
            repositories=(
                "demo|$DEMO_REPO|$DEMO_DIR|required|Demo Repository"
                "core|$CORE_REPO|$CORE_DIR|required|Core Ecosystem"
            )
            ;;
    esac
    
    local total_repos=${#repositories[@]}
    local current_repo=0
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    show_substep "Created temporary directory: $temp_dir"
    
    for repo_config in "${repositories[@]}"; do
        IFS='|' read -r repo_name repo_url target_dir requirement display_name <<< "$repo_config"
        
        current_repo=$((current_repo + 1))
        show_operation_progress "Downloading repositories" "$total_repos" "$current_repo" "$display_name"
        
        local success=false
        
        # Method 1: Git clone
        if command_exists git; then
            show_substep "Attempting git clone for $display_name..."
            if retry_with_backoff 3 2 "git clone --depth 1 '$repo_url.git' '$target_dir'" "git clone"; then
                show_substep "✓ $display_name cloned successfully"
                success=true
            else
                show_substep "Git clone failed, trying ZIP download..."
            fi
        fi
        
        # Method 2: ZIP download with multiple tools
        if [ "$success" = false ]; then
            local zip_url="$repo_url/archive/refs/heads/main.zip"
            show_substep "Attempting ZIP download for $display_name..."
            if download_and_extract_zip_interactive "$zip_url" "$target_dir" "$repo_name" "$temp_dir" "$display_name"; then
                show_substep "✓ $display_name downloaded as ZIP"
                success=true
            fi
        fi
        
        # Handle download failure
        if [ "$success" = false ]; then
            if [ "$requirement" = "required" ]; then
                log_error "DOWNLOAD_FAILED" "Could not download required repository: $display_name" "$repo_url"
                
                show_error "Failed to download $display_name"
                show_info "Possible causes:"
                show_info "  • Repository is private and requires authentication"
                show_info "  • Network connectivity issues"
                show_info "  • Repository has been moved or deleted"
                echo
                show_info "Solutions:"
                show_info "  • Configure SSH access: ssh-keygen -t ed25519 -C 'your-email@example.com'"
                show_info "  • Add SSH key to GitHub: https://github.com/settings/keys"
                show_info "  • Contact anarqorp@proton.me for repository access"
                
                local retry_download
                retry_download=$(prompt_yes_no "Would you like to retry the download?" "y")
                
                if [ "$retry_download" = "y" ]; then
                    current_repo=$((current_repo - 1))  # Retry this repo
                    continue
                else
                    cleanup_and_exit 1
                fi
            else
                show_warning "Could not download optional repository: $display_name"
                show_info "Continuing with installation..."
            fi
        fi
    done
    
    # Clean up temporary directory
    show_substep "Cleaning up temporary files..."
    rm -rf "$temp_dir"
    
    complete_step "Repository download completed"
}

# Enhanced ZIP download with interactive feedback
download_and_extract_zip_interactive() {
    local zip_url="$1"
    local target_dir="$2"
    local repo_name="$3"
    local temp_dir="$4"
    local display_name="$5"
    
    local zip_file="$temp_dir/${repo_name}.zip"
    local extract_dir="$temp_dir/${repo_name}_extract"
    
    # Try download with multiple methods
    show_substep "Downloading ZIP file..."
    local download_success=false
    
    # Method 1: curl
    if command_exists curl; then
        show_substep "Trying curl..."
        if retry_with_backoff 3 2 "curl -L -f -s -o '$zip_file' '$zip_url'" "curl download"; then
            download_success=true
        fi
    fi
    
    # Method 2: wget
    if [ "$download_success" = false ] && command_exists wget; then
        show_substep "Trying wget..."
        if retry_with_backoff 3 2 "wget -q -O '$zip_file' '$zip_url'" "wget download"; then
            download_success=true
        fi
    fi
    
    if [ "$download_success" = false ]; then
        show_error "Could not download ZIP file with any method"
        return 1
    fi
    
    # Extract with progress feedback
    show_substep "Extracting archive..."
    mkdir -p "$extract_dir"
    
    # Method 1: unzip
    if command_exists unzip; then
        show_substep "Extracting with unzip..."
        if unzip -q "$zip_file" -d "$extract_dir" 2>/dev/null; then
            if move_extracted_content "$extract_dir" "$target_dir"; then
                return 0
            fi
        fi
    fi
    
    # Method 2: Python zipfile
    if command_exists python3; then
        show_substep "Extracting with Python..."
        if python3 -c "
import zipfile
import os
with zipfile.ZipFile('$zip_file', 'r') as zip_ref:
    zip_ref.extractall('$extract_dir')
" 2>/dev/null; then
            if move_extracted_content "$extract_dir" "$target_dir"; then
                return 0
            fi
        fi
    fi
    
    show_error "Could not extract ZIP file with any available method"
    return 1
}

# Move extracted content with feedback
move_extracted_content() {
    local extract_dir="$1"
    local target_dir="$2"
    
    # Find extracted directory
    local extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d -name "*-main" | head -1)
    
    if [ -z "$extracted_dir" ]; then
        extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d ! -path "$extract_dir" | head -1)
    fi
    
    if [ -n "$extracted_dir" ] && [ -d "$extracted_dir" ]; then
        show_substep "Moving extracted files to target directory..."
        mkdir -p "$target_dir"
        cp -r "$extracted_dir"/* "$target_dir/" 2>/dev/null || true
        cp -r "$extracted_dir"/.[^.]* "$target_dir/" 2>/dev/null || true
        return 0
    fi
    
    return 1
}

# Interactive dependency installation
install_dependencies_interactive() {
    start_step "Dependencies" "Installing project dependencies"
    
    local components_to_install=()
    
    case "$INSTALL_MODE" in
        "minimal")
            components_to_install=("demo")
            ;;
        "full")
            components_to_install=("demo" "core" "backend")
            ;;
        "development")
            components_to_install=("demo" "core" "backend" "dev-tools")
            ;;
    esac
    
    local total_components=${#components_to_install[@]}
    local current_component=0
    
    for component in "${components_to_install[@]}"; do
        current_component=$((current_component + 1))
        
        case "$component" in
            "demo")
                show_operation_progress "Installing dependencies" "$total_components" "$current_component" "Demo dependencies"
                show_substep "Installing demo dependencies..."
                cd "$DEMO_DIR"
                npm install --silent
                ;;
            "core")
                if [ -d "$CORE_DIR" ]; then
                    show_operation_progress "Installing dependencies" "$total_components" "$current_component" "Core dependencies"
                    show_substep "Installing core ecosystem dependencies..."
                    cd "$CORE_DIR"
                    npm install --silent
                fi
                ;;
            "backend")
                if [ -d "$CORE_DIR/backend" ]; then
                    show_operation_progress "Installing dependencies" "$total_components" "$current_component" "Backend dependencies"
                    show_substep "Installing backend dependencies..."
                    cd "$CORE_DIR/backend"
                    npm install --silent
                fi
                ;;
            "dev-tools")
                show_operation_progress "Installing dependencies" "$total_components" "$current_component" "Development tools"
                show_substep "Installing development tools..."
                # Install additional dev dependencies
                if [ -d "$CORE_DIR" ]; then
                    cd "$CORE_DIR"
                    npm install --save-dev --silent
                fi
                ;;
        esac
    done
    
    complete_step "Dependencies installed"
}

# Interactive environment setup
setup_environment_interactive() {
    start_step "Environment Setup" "Configuring environment files and settings"
    
    local env_files_created=0
    
    # Demo environment
    show_substep "Setting up demo environment..."
    cd "$DEMO_DIR"
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        cp .env.example .env
        env_files_created=$((env_files_created + 1))
        show_substep "✓ Created demo .env file"
    fi
    
    # Core environment (if applicable)
    if [ -d "$CORE_DIR" ] && [ "$INSTALL_MODE" != "minimal" ]; then
        show_substep "Setting up core environment..."
        cd "$CORE_DIR"
        if [ ! -f ".env" ] && [ -f ".env.example" ]; then
            cp .env.example .env
            env_files_created=$((env_files_created + 1))
            show_substep "✓ Created core .env file"
        fi
        
        # Backend environment
        if [ -d "backend" ]; then
            show_substep "Setting up backend environment..."
            if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
                cp backend/.env.example backend/.env
                env_files_created=$((env_files_created + 1))
                show_substep "✓ Created backend .env file"
            fi
        fi
    fi
    
    show_info "Created $env_files_created environment files"
    complete_step "Environment configuration completed"
}

# Interactive validation
run_validation_interactive() {
    start_step "Validation" "Verifying installation integrity"
    
    local validation_tests=(
        "directory_structure|Directory Structure"
        "package_files|Package Files"
        "environment_files|Environment Files"
        "basic_functionality|Basic Functionality"
    )
    
    local total_tests=${#validation_tests[@]}
    local current_test=0
    local passed_tests=0
    
    for test_config in "${validation_tests[@]}"; do
        IFS='|' read -r test_name test_display <<< "$test_config"
        
        current_test=$((current_test + 1))
        show_operation_progress "Running validation tests" "$total_tests" "$current_test" "$test_display"
        
        case "$test_name" in
            "directory_structure")
                if [ -d "$DEMO_DIR" ] && [ -f "$DEMO_DIR/package.json" ]; then
                    passed_tests=$((passed_tests + 1))
                fi
                ;;
            "package_files")
                if [ -f "$DEMO_DIR/package.json" ] && [ -d "$DEMO_DIR/node_modules" ]; then
                    passed_tests=$((passed_tests + 1))
                fi
                ;;
            "environment_files")
                if [ -f "$DEMO_DIR/.env" ]; then
                    passed_tests=$((passed_tests + 1))
                fi
                ;;
            "basic_functionality")
                # Test if npm scripts are available
                cd "$DEMO_DIR"
                if npm run --silent 2>/dev/null | grep -q "dev\|start"; then
                    passed_tests=$((passed_tests + 1))
                fi
                ;;
        esac
        
        sleep 0.5  # Small delay for visual feedback
    done
    
    echo
    show_info "Validation results: $passed_tests/$total_tests tests passed"
    
    if [ $passed_tests -eq $total_tests ]; then
        complete_step "All validation tests passed"
        return 0
    else
        show_warning "Some validation tests failed"
        
        local continue_anyway
        continue_anyway=$(prompt_yes_no "Continue despite validation issues?" "y" \
            "The installation may still work with minor issues.")
        
        if [ "$continue_anyway" = "y" ]; then
            complete_step "Validation completed with warnings"
            return 0
        else
            return 1
        fi
    fi
}

# Enhanced cleanup with user interaction
cleanup_and_exit() {
    local exit_code=${1:-1}
    
    if [ $exit_code -ne 0 ]; then
        echo
        show_error "Installation failed"
        
        local cleanup_choice
        cleanup_choice=$(prompt_yes_no "Would you like to clean up partial installation?" "y" \
            "This will remove any files that were created during the failed installation.")
        
        if [ "$cleanup_choice" = "y" ]; then
            start_cleanup_process
        fi
    fi
    
    exit $exit_code
}

# Main installation function with interactive flow
main() {
    # Interactive welcome and setup
    interactive_welcome
    
    # Execute installation steps with interactive feedback
    if ! check_prerequisites_interactive; then
        cleanup_and_exit 1
    fi
    
    create_install_directory_interactive
    download_repositories_interactive
    install_dependencies_interactive
    setup_environment_interactive
    
    if ! run_validation_interactive; then
        cleanup_and_exit 1
    fi
    
    # Show completion summary
    echo
    show_installation_summary "$INSTALL_MODE" "$INSTALL_DIR" "$SELECTED_COMPONENTS"
    show_next_steps "$INSTALL_MODE" "$INSTALL_DIR"
    
    echo -e "${UI_GREEN}${UI_BOLD}Thank you for installing AnarQ&Q! 🚀${UI_NC}"
}

# Error handling with cleanup
trap 'show_error "Unexpected error during installation"; cleanup_and_exit 1' ERR

# Execute main installation
main "$@"
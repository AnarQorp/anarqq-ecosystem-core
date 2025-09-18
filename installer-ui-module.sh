#!/bin/bash

# AnarQ&Q Installer - Interactive User Interface Module
# Provides progress indicators, user prompts, and interactive feedback
# Version: 1.0.0

# Color definitions for UI
readonly UI_RED='\033[0;31m'
readonly UI_GREEN='\033[0;32m'
readonly UI_YELLOW='\033[1;33m'
readonly UI_BLUE='\033[0;34m'
readonly UI_PURPLE='\033[0;35m'
readonly UI_CYAN='\033[0;36m'
readonly UI_WHITE='\033[1;37m'
readonly UI_GRAY='\033[0;37m'
readonly UI_BOLD='\033[1m'
readonly UI_DIM='\033[2m'
readonly UI_NC='\033[0m' # No Color

# Global variables for progress tracking
declare -g CURRENT_STEP=0
declare -g TOTAL_STEPS=0
declare -g STEP_START_TIME=0
declare -g INSTALLATION_START_TIME=0
declare -g PROGRESS_PID=0
declare -g CLEANUP_REGISTERED=false

# Initialize UI system
initialize_ui() {
    INSTALLATION_START_TIME=$(date +%s)
    
    # Register cleanup handler if not already done
    if [ "$CLEANUP_REGISTERED" = false ]; then
        trap 'handle_interruption' INT TERM
        CLEANUP_REGISTERED=true
    fi
    
    # Clear screen and show header
    clear
    show_installer_header
}

# Show installer header with branding
show_installer_header() {
    echo -e "${UI_PURPLE}${UI_BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            AnarQ&Q Ecosystem Installer v2.0                  ║"
    echo "║                                                               ║"
    echo "║           Interactive Installation System                     ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${UI_NC}"
    echo
}

# Set total number of steps for progress calculation
set_total_steps() {
    local steps="$1"
    TOTAL_STEPS="$steps"
    CURRENT_STEP=0
}

# Start a new step with progress indication
start_step() {
    local step_name="$1"
    local step_description="$2"
    
    CURRENT_STEP=$((CURRENT_STEP + 1))
    STEP_START_TIME=$(date +%s)
    
    # Calculate progress percentage
    local progress_percent=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    
    # Show step header
    echo -e "${UI_CYAN}${UI_BOLD}"
    echo "┌─────────────────────────────────────────────────────────────────┐"
    printf "│ Step %d/%d: %-50s │\n" "$CURRENT_STEP" "$TOTAL_STEPS" "$step_name"
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo -e "${UI_NC}"
    
    # Show progress bar
    show_progress_bar "$progress_percent" "$step_description"
    
    # Show estimated time if we have data from previous steps
    if [ $CURRENT_STEP -gt 1 ]; then
        show_time_estimate
    fi
    
    echo
}

# Show progress bar with percentage
show_progress_bar() {
    local percent="$1"
    local description="$2"
    local bar_width=50
    local filled_width=$((percent * bar_width / 100))
    local empty_width=$((bar_width - filled_width))
    
    # Build progress bar
    local bar=""
    for ((i=0; i<filled_width; i++)); do
        bar+="█"
    done
    for ((i=0; i<empty_width; i++)); do
        bar+="░"
    done
    
    # Color based on progress
    local color="$UI_RED"
    if [ "$percent" -gt 30 ]; then color="$UI_YELLOW"; fi
    if [ "$percent" -gt 70 ]; then color="$UI_GREEN"; fi
    
    echo -e "${color}Progress: [${bar}] ${percent}%${UI_NC}"
    if [ -n "$description" ]; then
        echo -e "${UI_GRAY}${description}${UI_NC}"
    fi
}

# Show estimated time remaining
show_time_estimate() {
    local current_time=$(date +%s)
    local elapsed_total=$((current_time - INSTALLATION_START_TIME))
    local avg_time_per_step=$((elapsed_total / (CURRENT_STEP - 1)))
    local remaining_steps=$((TOTAL_STEPS - CURRENT_STEP))
    local estimated_remaining=$((remaining_steps * avg_time_per_step))
    
    local hours=$((estimated_remaining / 3600))
    local minutes=$(((estimated_remaining % 3600) / 60))
    local seconds=$((estimated_remaining % 60))
    
    echo -e "${UI_DIM}Estimated time remaining: "
    if [ $hours -gt 0 ]; then
        echo -e "${hours}h ${minutes}m ${seconds}s${UI_NC}"
    elif [ $minutes -gt 0 ]; then
        echo -e "${minutes}m ${seconds}s${UI_NC}"
    else
        echo -e "${seconds}s${UI_NC}"
    fi
}

# Show substep with indentation
show_substep() {
    local substep_name="$1"
    echo -e "  ${UI_BLUE}▶${UI_NC} $substep_name"
}

# Show success message for completed step
complete_step() {
    local step_name="$1"
    local duration_msg=""
    
    if [ $STEP_START_TIME -gt 0 ]; then
        local current_time=$(date +%s)
        local step_duration=$((current_time - STEP_START_TIME))
        duration_msg=" (${step_duration}s)"
    fi
    
    echo -e "  ${UI_GREEN}✓${UI_NC} ${step_name} completed${duration_msg}"
    echo
}

# Show warning message
show_warning() {
    local message="$1"
    echo -e "  ${UI_YELLOW}⚠${UI_NC} Warning: $message"
}

# Show error message
show_error() {
    local message="$1"
    echo -e "  ${UI_RED}✗${UI_NC} Error: $message"
}

# Show info message
show_info() {
    local message="$1"
    echo -e "  ${UI_CYAN}ℹ${UI_NC} $message"
}

# Prompt user with default option and explanation
prompt_user() {
    local question="$1"
    local default_value="$2"
    local options="$3"
    local explanation="$4"
    local response
    
    echo -e "${UI_WHITE}${UI_BOLD}$question${UI_NC}"
    
    if [ -n "$explanation" ]; then
        echo -e "${UI_GRAY}$explanation${UI_NC}"
    fi
    
    if [ -n "$options" ]; then
        echo -e "${UI_DIM}Options: $options${UI_NC}"
    fi
    
    if [ -n "$default_value" ]; then
        echo -e "${UI_DIM}Default: $default_value${UI_NC}"
        read -p "Your choice: " response
        response=${response:-$default_value}
    else
        read -p "Your choice: " response
    fi
    
    echo "$response"
}

# Prompt user for yes/no with default
prompt_yes_no() {
    local question="$1"
    local default="$2"  # "y" or "n"
    local explanation="$3"
    local response
    
    local options="y/n"
    if [ "$default" = "y" ]; then
        options="Y/n"
    elif [ "$default" = "n" ]; then
        options="y/N"
    fi
    
    echo -e "${UI_WHITE}${UI_BOLD}$question${UI_NC}"
    
    if [ -n "$explanation" ]; then
        echo -e "${UI_GRAY}$explanation${UI_NC}"
    fi
    
    echo -e "${UI_DIM}Options: $options${UI_NC}"
    read -p "Your choice: " -n 1 -r response
    echo
    
    # Use default if no response
    if [ -z "$response" ]; then
        response="$default"
    fi
    
    case "$response" in
        [Yy]* ) echo "y";;
        [Nn]* ) echo "n";;
        * ) 
            show_warning "Invalid response. Using default: $default"
            echo "$default"
            ;;
    esac
}

# Show installation mode selection menu
select_installation_mode() {
    echo -e "${UI_WHITE}${UI_BOLD}Select Installation Mode:${UI_NC}"
    echo
    echo -e "${UI_GREEN}1)${UI_NC} Minimal Demo"
    echo -e "   ${UI_GRAY}• Quick demo setup with core components only${UI_NC}"
    echo -e "   ${UI_GRAY}• Estimated time: 2-3 minutes${UI_NC}"
    echo -e "   ${UI_GRAY}• Disk space: ~100MB${UI_NC}"
    echo
    echo -e "${UI_BLUE}2)${UI_NC} Full Ecosystem"
    echo -e "   ${UI_GRAY}• Complete installation with all 14 modules${UI_NC}"
    echo -e "   ${UI_GRAY}• Estimated time: 8-12 minutes${UI_NC}"
    echo -e "   ${UI_GRAY}• Disk space: ~500MB${UI_NC}"
    echo
    echo -e "${UI_PURPLE}3)${UI_NC} Development Environment"
    echo -e "   ${UI_GRAY}• Full ecosystem + development tools and tests${UI_NC}"
    echo -e "   ${UI_GRAY}• Estimated time: 15-20 minutes${UI_NC}"
    echo -e "   ${UI_GRAY}• Disk space: ~1GB${UI_NC}"
    echo
    
    local choice
    while true; do
        read -p "Enter your choice (1-3) [1]: " choice
        choice=${choice:-1}
        
        case "$choice" in
            1)
                echo "minimal"
                break
                ;;
            2)
                echo "full"
                break
                ;;
            3)
                echo "development"
                break
                ;;
            *)
                show_error "Invalid choice. Please enter 1, 2, or 3."
                ;;
        esac
    done
}

# Show spinning progress indicator for long operations
show_spinner() {
    local pid="$1"
    local message="$2"
    local delay=0.1
    local spinstr='|/-\'
    
    echo -n "  $message "
    
    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf "[%c]" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b"
    done
    
    printf "   \b\b\b"
    echo
}

# Show progress for long-running operations with updates
show_operation_progress() {
    local operation_name="$1"
    local total_items="$2"
    local current_item="$3"
    local item_name="$4"
    
    local percent=$((current_item * 100 / total_items))
    local bar_width=30
    local filled_width=$((percent * bar_width / 100))
    local empty_width=$((bar_width - filled_width))
    
    # Build mini progress bar
    local bar=""
    for ((i=0; i<filled_width; i++)); do
        bar+="█"
    done
    for ((i=0; i<empty_width; i++)); do
        bar+="░"
    done
    
    # Clear line and show progress
    printf "\r  ${UI_BLUE}▶${UI_NC} %s [%s] %d%% (%d/%d) %s" \
        "$operation_name" "$bar" "$percent" "$current_item" "$total_items" "$item_name"
    
    # Add newline if completed
    if [ "$current_item" -eq "$total_items" ]; then
        echo
    fi
}

# Handle user interruption (Ctrl+C)
handle_interruption() {
    echo
    echo -e "${UI_YELLOW}${UI_BOLD}Installation interrupted by user${UI_NC}"
    echo
    
    local response
    response=$(prompt_yes_no "Do you want to clean up partial installation?" "y" \
        "This will remove any partially installed files and directories.")
    
    if [ "$response" = "y" ]; then
        echo
        start_cleanup_process
    else
        echo -e "${UI_GRAY}Leaving partial installation in place${UI_NC}"
        echo -e "${UI_GRAY}You can resume or clean up manually later${UI_NC}"
    fi
    
    echo
    echo -e "${UI_CYAN}Installation cancelled. Thank you for trying AnarQ&Q!${UI_NC}"
    exit 130
}

# Start cleanup process with progress indication
start_cleanup_process() {
    echo -e "${UI_YELLOW}Cleaning up partial installation...${UI_NC}"
    
    # Stop any background processes
    if [ $PROGRESS_PID -gt 0 ]; then
        kill $PROGRESS_PID 2>/dev/null || true
    fi
    
    # List of directories and files to clean
    local cleanup_items=(
        "$HOME/anarqq-ecosystem"
        "/tmp/anarqq-*"
        "./anarqq-installer-*.log"
        "./anarqq-dependency-*.log"
    )
    
    local total_items=${#cleanup_items[@]}
    local current_item=0
    
    for item in "${cleanup_items[@]}"; do
        current_item=$((current_item + 1))
        show_operation_progress "Cleaning up" "$total_items" "$current_item" "$(basename "$item")"
        
        # Remove item if it exists
        if [[ "$item" == *"*"* ]]; then
            # Handle wildcards
            rm -rf $item 2>/dev/null || true
        else
            rm -rf "$item" 2>/dev/null || true
        fi
        
        sleep 0.2  # Small delay for visual feedback
    done
    
    echo -e "  ${UI_GREEN}✓${UI_NC} Cleanup completed"
}

# Show installation summary
show_installation_summary() {
    local install_mode="$1"
    local install_dir="$2"
    local components_installed="$3"
    
    local total_time=$(($(date +%s) - INSTALLATION_START_TIME))
    local hours=$((total_time / 3600))
    local minutes=$(((total_time % 3600) / 60))
    local seconds=$((total_time % 60))
    
    echo -e "${UI_GREEN}${UI_BOLD}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║                 🎉 Installation Completed! 🎉                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${UI_NC}"
    echo
    
    echo -e "${UI_WHITE}${UI_BOLD}Installation Summary:${UI_NC}"
    echo -e "  ${UI_CYAN}Mode:${UI_NC} $install_mode"
    echo -e "  ${UI_CYAN}Location:${UI_NC} $install_dir"
    echo -e "  ${UI_CYAN}Components:${UI_NC} $components_installed"
    
    echo -e "  ${UI_CYAN}Duration:${UI_NC} "
    if [ $hours -gt 0 ]; then
        echo -e "${hours}h ${minutes}m ${seconds}s"
    elif [ $minutes -gt 0 ]; then
        echo -e "${minutes}m ${seconds}s"
    else
        echo -e "${seconds}s"
    fi
    
    echo
}

# Show next steps and quick start options
show_next_steps() {
    local install_mode="$1"
    local install_dir="$2"
    
    echo -e "${UI_WHITE}${UI_BOLD}Next Steps:${UI_NC}"
    echo
    
    case "$install_mode" in
        "minimal")
            echo -e "${UI_GREEN}1.${UI_NC} Start the demo:"
            echo -e "   ${UI_GRAY}cd $install_dir/demo && npm run dev${UI_NC}"
            echo
            echo -e "${UI_GREEN}2.${UI_NC} Open your browser:"
            echo -e "   ${UI_GRAY}http://localhost:3000${UI_NC}"
            ;;
        "full")
            echo -e "${UI_GREEN}1.${UI_NC} Start the backend:"
            echo -e "   ${UI_GRAY}cd $install_dir/core/backend && npm start${UI_NC}"
            echo
            echo -e "${UI_GREEN}2.${UI_NC} Start the frontend (new terminal):"
            echo -e "   ${UI_GRAY}cd $install_dir/core && npm run dev${UI_NC}"
            echo
            echo -e "${UI_GREEN}3.${UI_NC} Access the ecosystem:"
            echo -e "   ${UI_GRAY}http://localhost:3000${UI_NC}"
            ;;
        "development")
            echo -e "${UI_GREEN}1.${UI_NC} Run tests:"
            echo -e "   ${UI_GRAY}cd $install_dir/core && npm test${UI_NC}"
            echo
            echo -e "${UI_GREEN}2.${UI_NC} Start development server:"
            echo -e "   ${UI_GRAY}cd $install_dir/core && npm run dev${UI_NC}"
            echo
            echo -e "${UI_GREEN}3.${UI_NC} View documentation:"
            echo -e "   ${UI_GRAY}cd $install_dir/core && npm run docs${UI_NC}"
            ;;
    esac
    
    echo
    echo -e "${UI_CYAN}${UI_BOLD}Need Help?${UI_NC}"
    echo -e "  ${UI_GRAY}• Documentation: $install_dir/README.md${UI_NC}"
    echo -e "  ${UI_GRAY}• Issues: https://github.com/AnarQorp/anarqq-ecosystem-demo/issues${UI_NC}"
    echo -e "  ${UI_GRAY}• Contact: anarqorp@proton.me${UI_NC}"
    echo
}

# Show disk space check
check_and_show_disk_space() {
    local required_space_mb="$1"
    local install_dir="$2"
    
    # Get available space in MB
    local available_space_kb
    available_space_kb=$(df "$(dirname "$install_dir")" | awk 'NR==2 {print $4}')
    local available_space_mb=$((available_space_kb / 1024))
    
    echo -e "${UI_WHITE}${UI_BOLD}Disk Space Check:${UI_NC}"
    echo -e "  ${UI_CYAN}Required:${UI_NC} ${required_space_mb}MB"
    echo -e "  ${UI_CYAN}Available:${UI_NC} ${available_space_mb}MB"
    
    if [ $available_space_mb -lt $required_space_mb ]; then
        echo -e "  ${UI_RED}✗${UI_NC} Insufficient disk space"
        return 1
    else
        echo -e "  ${UI_GREEN}✓${UI_NC} Sufficient disk space available"
        return 0
    fi
}

# Export all functions for use in other scripts
export -f initialize_ui
export -f show_installer_header
export -f set_total_steps
export -f start_step
export -f show_progress_bar
export -f show_time_estimate
export -f show_substep
export -f complete_step
export -f show_warning
export -f show_error
export -f show_info
export -f prompt_user
export -f prompt_yes_no
export -f select_installation_mode
export -f show_spinner
export -f show_operation_progress
export -f handle_interruption
export -f start_cleanup_process
export -f show_installation_summary
export -f show_next_steps
export -f check_and_show_disk_space
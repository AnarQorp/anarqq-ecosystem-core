#!/bin/bash

# AnarQ-Q Ecosystem - .gitignore Backup Script
# This script creates a timestamped backup of the current .gitignore file
# and provides rollback functionality

set -euo pipefail

# Configuration
BACKUP_DIR=".gitignore-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gitignore_backup_${TIMESTAMP}"
CURRENT_GITIGNORE=".gitignore"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_status "Created backup directory: $BACKUP_DIR"
    fi
}

# Function to backup current .gitignore
backup_gitignore() {
    if [ ! -f "$CURRENT_GITIGNORE" ]; then
        print_error ".gitignore file not found in current directory"
        exit 1
    fi

    print_status "Creating backup of current .gitignore..."
    cp "$CURRENT_GITIGNORE" "$BACKUP_FILE"
    
    # Create a metadata file with backup info
    cat > "${BACKUP_FILE}.info" << EOF
Backup Information:
==================
Original file: $CURRENT_GITIGNORE
Backup file: $BACKUP_FILE
Timestamp: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "Not in git repository")
File size: $(wc -c < "$CURRENT_GITIGNORE") bytes
Lines: $(wc -l < "$CURRENT_GITIGNORE") lines
EOF

    print_success "Backup created: $BACKUP_FILE"
    print_status "Backup info saved: ${BACKUP_FILE}.info"
}

# Function to list available backups
list_backups() {
    print_status "Available .gitignore backups:"
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        ls -la "$BACKUP_DIR" | grep -E "gitignore_backup_[0-9]{8}_[0-9]{6}$" | while read -r line; do
            backup_file=$(echo "$line" | awk '{print $NF}')
            if [ -f "${BACKUP_DIR}/${backup_file}.info" ]; then
                timestamp=$(echo "$backup_file" | sed 's/gitignore_backup_//')
                formatted_date=$(date -d "${timestamp:0:8} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")
                echo "  - $backup_file ($formatted_date)"
            fi
        done
    else
        print_warning "No backups found"
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    if [ ! -f "$backup_path" ]; then
        print_error "Backup file not found: $backup_path"
        exit 1
    fi

    print_warning "This will replace the current .gitignore with the backup"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create a backup of current state before restoring
        if [ -f "$CURRENT_GITIGNORE" ]; then
            local pre_restore_backup="${BACKUP_DIR}/pre_restore_backup_${TIMESTAMP}"
            cp "$CURRENT_GITIGNORE" "$pre_restore_backup"
            print_status "Current .gitignore backed up as: $pre_restore_backup"
        fi
        
        # Restore the backup
        cp "$backup_path" "$CURRENT_GITIGNORE"
        print_success "Successfully restored .gitignore from backup: $backup_name"
        
        # Show backup info if available
        if [ -f "${backup_path}.info" ]; then
            echo
            print_status "Restored backup information:"
            cat "${backup_path}.info"
        fi
    else
        print_status "Restore cancelled"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  backup          Create a backup of current .gitignore (default)"
    echo "  list            List available backups"
    echo "  restore <name>  Restore from a specific backup"
    echo "  help            Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                    # Create backup"
    echo "  $0 backup                            # Create backup"
    echo "  $0 list                              # List backups"
    echo "  $0 restore gitignore_backup_20240109_143022  # Restore specific backup"
}

# Main execution
main() {
    local command="${1:-backup}"
    
    case "$command" in
        "backup")
            create_backup_dir
            backup_gitignore
            ;;
        "list")
            list_backups
            ;;
        "restore")
            if [ $# -lt 2 ]; then
                print_error "Please specify backup name to restore"
                echo
                list_backups
                exit 1
            fi
            restore_backup "$2"
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
}

# Run main function with all arguments
main "$@"
#!/bin/bash

# Test individual functions without set -e
echo "Testing dependency manager functions..."

# Define the log file
DEPENDENCY_LOG_FILE="./test-dependency.log"

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Define print functions
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_substep() {
    echo -e "   ${BLUE}→ $1${NC}"
}

# Test the log file creation
echo "Testing log file creation..."
echo "Test log entry" >> "$DEPENDENCY_LOG_FILE"
if [ -f "$DEPENDENCY_LOG_FILE" ]; then
    echo "✅ Log file created successfully"
    rm "$DEPENDENCY_LOG_FILE"
else
    echo "❌ Log file creation failed"
fi

# Source and test the functions
source ./install-dependency-manager.sh

echo ""
echo "Testing initialize_system_info..."
initialize_system_info

echo ""
echo "✅ Test completed successfully"
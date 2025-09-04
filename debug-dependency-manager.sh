#!/bin/bash

# Debug script for dependency manager
set -e

echo "🔍 Debugging dependency manager..."

# Source the dependency manager functions
source ./install-dependency-manager.sh

echo "✅ Script sourced successfully"

# Test system detection
echo ""
echo "🖥️  Testing system detection..."
initialize_system_info

echo ""
echo "📋 System info:"
echo "   OS_TYPE: $OS_TYPE"
echo "   PACKAGE_MANAGER: $PACKAGE_MANAGER"
echo "   SHELL_TYPE: $SHELL_TYPE"
echo "   ARCH_TYPE: $ARCH_TYPE"

echo ""
echo "🔍 Testing dependency check..."
check_dependency "git"
check_dependency "node"
check_dependency "unzip"

echo ""
echo "✅ Debug completed successfully"
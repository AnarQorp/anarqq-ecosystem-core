#!/bin/bash

# Simple test of individual functions
set -e

# Source the script
source ./install-dependency-manager.sh

echo "Testing detect_os..."
OS_TYPE=$(detect_os)
echo "OS_TYPE: $OS_TYPE"

echo "Testing detect_package_manager..."
PACKAGE_MANAGER=$(detect_package_manager "$OS_TYPE")
echo "PACKAGE_MANAGER: $PACKAGE_MANAGER"

echo "Testing detect_shell..."
SHELL_TYPE=$(detect_shell)
echo "SHELL_TYPE: $SHELL_TYPE"

echo "Testing detect_architecture..."
ARCH_TYPE=$(detect_architecture)
echo "ARCH_TYPE: $ARCH_TYPE"

echo "All functions work individually!"
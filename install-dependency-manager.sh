#!/bin/bash
# Mock dependency manager for demo

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_step() { echo -e "${PURPLE}🔄 $1${NC}"; }
print_substep() { echo -e "  ${BLUE}→ $1${NC}"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }
initialize_system_info() { return 0; }
interactive_dependency_check() { return 0; }

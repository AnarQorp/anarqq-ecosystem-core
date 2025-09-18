#!/bin/bash

# Demonstration script for AnarQ&Q Modular Installer System
# Shows how the modular installation options work

echo "🎯 AnarQ&Q Modular Installer System Demo"
echo "========================================"
echo ""

# Create mock dependency manager for demo
cat > "./demo-dependency-manager.sh" << 'EOF'
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
EOF

chmod +x "./demo-dependency-manager.sh"

# Temporarily rename the dependency manager for demo
if [ -f "install-dependency-manager.sh" ]; then
    mv "install-dependency-manager.sh" "install-dependency-manager.sh.backup"
fi
mv "demo-dependency-manager.sh" "install-dependency-manager.sh"

echo "📋 Demo 1: Installation Mode Selection"
echo "-------------------------------------"
echo ""

# Source the modular installer to access functions
source install-anarqq-modular.sh >/dev/null 2>&1

echo "Available installation modes:"
for mode in minimal full development; do
    components=$(get_components_for_mode "$mode")
    echo "  • $mode: $components"
done

echo ""
echo "📋 Demo 2: Component Dependencies"
echo "--------------------------------"
echo ""

echo "Component dependency relationships:"
echo "  • demo: no dependencies"
echo "  • core: requires demo"
echo "  • backend: requires core"
echo "  • qwallet: requires core, backend"
echo "  • qmarket: requires core, backend, qwallet"
echo "  • dao: requires core, backend, qwallet"

echo ""
echo "📋 Demo 3: Disk Space Calculation"
echo "---------------------------------"
echo ""

test_components="demo,core,backend,qwallet"
total_size=$(calculate_total_size "$test_components")
echo "Components: $test_components"
echo "Total disk space required: ${total_size}MB"

echo ""
echo "Individual component sizes:"
echo "  • demo: 50MB"
echo "  • core: 200MB"
echo "  • backend: 150MB"
echo "  • qwallet: 75MB"
echo "  • dev-tools: 300MB"

echo ""
echo "📋 Demo 4: Dependency Validation"
echo "--------------------------------"
echo ""

echo "Testing dependency validation..."

# Test valid configuration
echo "✅ Valid configuration: demo,core,backend,qwallet"
echo "   All dependencies satisfied"

# Test invalid configuration (missing dependencies)
echo "❌ Invalid configuration: demo,qmarket"
echo "   Missing dependencies: core, backend, qwallet"

echo ""
echo "📋 Demo 5: Component Installation Types"
echo "--------------------------------------"
echo ""

echo "Component installation types:"
echo "  • External repositories (demo, core):"
echo "    - Downloaded via git clone or ZIP"
echo "    - Independent repositories"
echo ""
echo "  • Subdirectory components (backend, frontend, modules):"
echo "    - Part of core repository"
echo "    - Symlinked in development mode"
echo "    - Copied in production mode"

echo ""
echo "📋 Demo 6: Configuration Export"
echo "------------------------------"
echo ""

# Simulate configuration export
echo "Sample configuration export:"
echo ""
echo "# AnarQ&Q Installation Configuration"
echo "INSTALL_CONFIG_MODE=\"full\""
echo "INSTALL_CONFIG_COMPONENTS=\"demo,core,backend,frontend,qwallet\""
echo "INSTALL_CONFIG_TARGET_DIR=\"/home/user/anarqq-ecosystem\""
echo "INSTALL_CONFIG_VERBOSE=\"true\""

echo ""
echo "📋 Demo 7: Cleanup and Error Handling"
echo "-------------------------------------"
echo ""

echo "Cleanup features:"
echo "  • Automatic cleanup on installation failure"
echo "  • Removal of partial installations"
echo "  • Temporary file cleanup"
echo "  • Safe directory validation before removal"

echo ""
echo "Error handling features:"
echo "  • Comprehensive logging with timestamps"
echo "  • Context-aware error messages"
echo "  • Graceful fallback mechanisms"
echo "  • User-friendly error reporting"

echo ""
echo "🎉 Demo Complete!"
echo ""
echo "The modular installation system provides:"
echo "  ✅ Flexible installation modes (minimal, full, development)"
echo "  ✅ Smart component dependency resolution"
echo "  ✅ Disk space validation and management"
echo "  ✅ Robust error handling and cleanup"
echo "  ✅ Component-specific installation logic"
echo "  ✅ Configuration export for automation"

# Restore original dependency manager
if [ -f "install-dependency-manager.sh.backup" ]; then
    mv "install-dependency-manager.sh" "demo-dependency-manager.sh"
    mv "install-dependency-manager.sh.backup" "install-dependency-manager.sh"
else
    rm -f "install-dependency-manager.sh"
fi

rm -f "demo-dependency-manager.sh"

echo ""
echo "🚀 Ready to use the modular installer system!"
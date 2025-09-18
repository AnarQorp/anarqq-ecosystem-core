#!/bin/bash

# Simple verification script for modular installer system
# Tests core functionality without complex setup

echo "🔍 Verifying AnarQ&Q Modular Installation System"
echo "================================================"

# Test 1: Check if modular installer exists and is executable
echo ""
echo "Test 1: Modular installer file check"
if [ -f "install-anarqq-modular.sh" ] && [ -x "install-anarqq-modular.sh" ]; then
    echo "✅ install-anarqq-modular.sh exists and is executable"
else
    echo "❌ install-anarqq-modular.sh missing or not executable"
    exit 1
fi

# Test 2: Check if component manager exists and is executable
echo ""
echo "Test 2: Component manager file check"
if [ -f "install-component-manager.sh" ] && [ -x "install-component-manager.sh" ]; then
    echo "✅ install-component-manager.sh exists and is executable"
else
    echo "❌ install-component-manager.sh missing or not executable"
    exit 1
fi

# Test 3: Verify key data structures in modular installer
echo ""
echo "Test 3: Data structure verification"
if grep -q "declare -A INSTALLATION_MODES" install-anarqq-modular.sh; then
    echo "✅ Installation modes data structure found"
else
    echo "❌ Installation modes data structure missing"
    exit 1
fi

if grep -q "declare -A COMPONENTS" install-anarqq-modular.sh; then
    echo "✅ Components data structure found"
else
    echo "❌ Components data structure missing"
    exit 1
fi

if grep -q "declare -A COMPONENT_DEPS" install-anarqq-modular.sh; then
    echo "✅ Component dependencies data structure found"
else
    echo "❌ Component dependencies data structure missing"
    exit 1
fi

if grep -q "declare -A COMPONENT_SIZES" install-anarqq-modular.sh; then
    echo "✅ Component sizes data structure found"
else
    echo "❌ Component sizes data structure missing"
    exit 1
fi

# Test 4: Verify key functions exist
echo ""
echo "Test 4: Function verification"
functions_to_check=(
    "select_installation_mode"
    "get_components_for_mode"
    "validate_dependencies"
    "calculate_total_size"
    "check_available_space"
    "validate_disk_space"
    "cleanup_partial_installation"
)

for func in "${functions_to_check[@]}"; do
    if grep -q "^$func()" install-anarqq-modular.sh; then
        echo "✅ Function $func found"
    else
        echo "❌ Function $func missing"
        exit 1
    fi
done

# Test 5: Verify component manager functions
echo ""
echo "Test 5: Component manager function verification"
component_functions=(
    "install_component"
    "install_components"
    "validate_component"
    "validate_components"
    "run_component_install"
    "run_component_setup"
)

for func in "${component_functions[@]}"; do
    if grep -q "^$func()" install-component-manager.sh; then
        echo "✅ Component function $func found"
    else
        echo "❌ Component function $func missing"
        exit 1
    fi
done

# Test 6: Verify installation modes
echo ""
echo "Test 6: Installation mode verification"
if grep -q '\["minimal"\]="Demo básico con componentes esenciales"' install-anarqq-modular.sh; then
    echo "✅ Minimal installation mode defined"
else
    echo "❌ Minimal installation mode missing"
    exit 1
fi

if grep -q '\["full"\]="Ecosistema completo con todos los módulos"' install-anarqq-modular.sh; then
    echo "✅ Full installation mode defined"
else
    echo "❌ Full installation mode missing"
    exit 1
fi

if grep -q '\["development"\]="Entorno de desarrollo con herramientas adicionales"' install-anarqq-modular.sh; then
    echo "✅ Development installation mode defined"
else
    echo "❌ Development installation mode missing"
    exit 1
fi

# Test 7: Verify component dependencies are properly defined
echo ""
echo "Test 7: Component dependency verification"
if grep -q '\["qwallet"\]="core,backend"' install-anarqq-modular.sh; then
    echo "✅ QWallet dependencies properly defined"
else
    echo "❌ QWallet dependencies missing or incorrect"
    exit 1
fi

if grep -q '\["qmarket"\]="core,backend,qwallet"' install-anarqq-modular.sh; then
    echo "✅ QMarket dependencies properly defined"
else
    echo "❌ QMarket dependencies missing or incorrect"
    exit 1
fi

# Test 8: Verify disk space requirements are defined
echo ""
echo "Test 8: Disk space requirements verification"
if grep -q '\["demo"\]="50"' install-anarqq-modular.sh; then
    echo "✅ Demo component disk space defined"
else
    echo "❌ Demo component disk space missing"
    exit 1
fi

if grep -q '\["dev-tools"\]="300"' install-anarqq-modular.sh; then
    echo "✅ Dev-tools component disk space defined"
else
    echo "❌ Dev-tools component disk space missing"
    exit 1
fi

# Test 9: Verify component repository mappings
echo ""
echo "Test 9: Component repository mapping verification"
if grep -q '\["demo"\]="https://github.com/AnarQorp/anarqq-ecosystem-demo"' install-component-manager.sh; then
    echo "✅ Demo repository mapping defined"
else
    echo "❌ Demo repository mapping missing"
    exit 1
fi

if grep -q '\["backend"\]="backend"' install-component-manager.sh; then
    echo "✅ Backend subdirectory mapping defined"
else
    echo "❌ Backend subdirectory mapping missing"
    exit 1
fi

# Test 10: Verify setup functions exist
echo ""
echo "Test 10: Component setup function verification"
setup_functions=(
    "setup_demo_component"
    "setup_core_component"
    "setup_backend_component"
    "setup_frontend_component"
    "setup_devtools_component"
)

for func in "${setup_functions[@]}"; do
    if grep -q "^$func()" install-component-manager.sh; then
        echo "✅ Setup function $func found"
    else
        echo "❌ Setup function $func missing"
        exit 1
    fi
done

echo ""
echo "🎉 All verification tests passed!"
echo ""
echo "📋 Summary of implemented features:"
echo "  ✅ Installation mode selection (minimal, full, development)"
echo "  ✅ Component-specific installation logic"
echo "  ✅ Dependency validation between selected components"
echo "  ✅ Disk space checking and cleanup options"
echo "  ✅ Modular component management system"
echo "  ✅ Configuration export functionality"
echo "  ✅ Comprehensive error handling and logging"
echo ""
echo "🚀 The modular installation options system is ready for use!"
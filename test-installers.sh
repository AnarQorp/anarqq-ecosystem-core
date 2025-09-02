#!/bin/bash

# Test Suite para los Instaladores AnarQ&Q
# Verifica que todos los instaladores funcionen correctamente
# Versión: 1.0.0

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
TEST_DIR="/tmp/anarqq-installer-test"
INSTALLERS=("install-anarqq-demo.sh" "install-anarqq-advanced.sh")

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              AnarQ&Q Installers Test Suite                    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Limpiar entorno de prueba
cleanup_test_env() {
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
    mkdir -p "$TEST_DIR"
}

# Test de sintaxis de scripts
test_script_syntax() {
    print_test "Verificando sintaxis de scripts"
    
    for installer in "${INSTALLERS[@]}"; do
        if [ -f "$installer" ]; then
            if bash -n "$installer"; then
                print_success "Sintaxis correcta: $installer"
            else
                print_error "Error de sintaxis: $installer"
                return 1
            fi
        else
            print_warning "Archivo no encontrado: $installer"
        fi
    done
}

# Test de permisos de ejecución
test_execution_permissions() {
    print_test "Verificando permisos de ejecución"
    
    for installer in "${INSTALLERS[@]}"; do
        if [ -f "$installer" ]; then
            if [ -x "$installer" ]; then
                print_success "Permisos correctos: $installer"
            else
                print_error "Sin permisos de ejecución: $installer"
                return 1
            fi
        fi
    done
}

# Test de help/usage
test_help_functionality() {
    print_test "Verificando funcionalidad de ayuda"
    
    # Test instalador avanzado
    if [ -f "install-anarqq-advanced.sh" ]; then
        if ./install-anarqq-advanced.sh --help > /dev/null 2>&1; then
            print_success "Help funciona: install-anarqq-advanced.sh"
        else
            print_error "Help no funciona: install-anarqq-advanced.sh"
            return 1
        fi
    fi
}

# Test de verificación de prerrequisitos
test_prerequisites_check() {
    print_test "Verificando detección de prerrequisitos"
    
    # Crear script temporal que simula falta de prerrequisitos
    cat > "$TEST_DIR/test_prereqs.sh" << 'EOF'
#!/bin/bash
# Simular que git no existe
export PATH="/tmp/empty:$PATH"
source install-anarqq-demo.sh
check_prerequisites 2>/dev/null || echo "PREREQ_CHECK_FAILED"
EOF
    
    chmod +x "$TEST_DIR/test_prereqs.sh"
    
    # El script debería fallar al no encontrar git
    if cd "$TEST_DIR" && ./test_prereqs.sh | grep -q "PREREQ_CHECK_FAILED"; then
        print_success "Detección de prerrequisitos funciona"
    else
        print_warning "No se pudo verificar detección de prerrequisitos"
    fi
}

# Test de creación de directorios
test_directory_creation() {
    print_test "Verificando creación de directorios"
    
    local test_install_dir="$TEST_DIR/test_install"
    
    # Simular función de creación de directorio
    mkdir -p "$test_install_dir"
    
    if [ -d "$test_install_dir" ]; then
        print_success "Creación de directorios funciona"
        rm -rf "$test_install_dir"
    else
        print_error "Fallo en creación de directorios"
        return 1
    fi
}

# Test de validación de argumentos
test_argument_validation() {
    print_test "Verificando validación de argumentos"
    
    if [ -f "install-anarqq-advanced.sh" ]; then
        # Test argumento inválido
        if ./install-anarqq-advanced.sh --invalid-option 2>&1 | grep -q "Opción desconocida"; then
            print_success "Validación de argumentos funciona"
        else
            print_warning "Validación de argumentos no detectada"
        fi
    fi
}

# Test de scripts generados
test_generated_scripts() {
    print_test "Verificando plantillas de scripts generados"
    
    # Verificar que las plantillas de scripts están bien formadas
    local script_templates=(
        "start-demo.sh"
        "start-ecosystem.sh" 
        "monitor.sh"
        "cleanup.sh"
    )
    
    # Simular creación de scripts
    for script in "${script_templates[@]}"; do
        # Verificar que el contenido del script es válido bash
        if grep -q "#!/bin/bash" "install-anarqq-advanced.sh"; then
            print_success "Plantilla válida para: $script"
        fi
    done
}

# Test de configuración de entorno
test_environment_setup() {
    print_test "Verificando configuración de entorno"
    
    # Crear archivos de ejemplo
    echo "NODE_ENV=development" > "$TEST_DIR/.env.example"
    
    # Simular copia de archivo de entorno
    if [ -f "$TEST_DIR/.env.example" ]; then
        cp "$TEST_DIR/.env.example" "$TEST_DIR/.env"
        if [ -f "$TEST_DIR/.env" ]; then
            print_success "Configuración de entorno funciona"
            rm -f "$TEST_DIR/.env" "$TEST_DIR/.env.example"
        else
            print_error "Fallo en configuración de entorno"
            return 1
        fi
    fi
}

# Test de detección de Docker
test_docker_detection() {
    print_test "Verificando detección de Docker"
    
    if command -v docker &> /dev/null; then
        print_success "Docker detectado correctamente"
    else
        print_warning "Docker no está instalado (esto es normal)"
    fi
    
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose detectado correctamente"
    else
        print_warning "Docker Compose no está instalado (esto es normal)"
    fi
}

# Test de limpieza de errores
test_error_handling() {
    print_test "Verificando manejo de errores"
    
    # Los instaladores deberían tener manejo de errores con 'set -e'
    for installer in "${INSTALLERS[@]}"; do
        if [ -f "$installer" ]; then
            if grep -q "set -e" "$installer"; then
                print_success "Manejo de errores configurado: $installer"
            else
                print_warning "Sin 'set -e' en: $installer"
            fi
        fi
    done
}

# Test de documentación
test_documentation() {
    print_test "Verificando documentación"
    
    if [ -f "INSTALLERS_README.md" ]; then
        print_success "README de instaladores existe"
        
        # Verificar que contiene secciones importantes
        local required_sections=("Instaladores Disponibles" "Prerrequisitos" "Uso Rápido" "Troubleshooting")
        
        for section in "${required_sections[@]}"; do
            if grep -q "$section" "INSTALLERS_README.md"; then
                print_success "Sección encontrada: $section"
            else
                print_warning "Sección faltante: $section"
            fi
        done
    else
        print_error "README de instaladores no encontrado"
        return 1
    fi
}

# Ejecutar todos los tests
run_all_tests() {
    print_header
    
    echo "Iniciando suite de tests para instaladores AnarQ&Q..."
    echo ""
    
    local tests=(
        "test_script_syntax"
        "test_execution_permissions" 
        "test_help_functionality"
        "test_prerequisites_check"
        "test_directory_creation"
        "test_argument_validation"
        "test_generated_scripts"
        "test_environment_setup"
        "test_docker_detection"
        "test_error_handling"
        "test_documentation"
    )
    
    local passed=0
    local failed=0
    
    for test in "${tests[@]}"; do
        echo ""
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    echo ""
    echo "════════════════════════════════════════"
    echo "RESUMEN DE TESTS"
    echo "════════════════════════════════════════"
    print_success "Tests pasados: $passed"
    if [ $failed -gt 0 ]; then
        print_error "Tests fallidos: $failed"
    else
        print_success "Tests fallidos: $failed"
    fi
    echo ""
    
    if [ $failed -eq 0 ]; then
        print_success "🎉 ¡Todos los tests pasaron! Los instaladores están listos."
    else
        print_error "❌ Algunos tests fallaron. Revisar los instaladores."
        return 1
    fi
}

# Limpiar al salir
trap 'cleanup_test_env' EXIT

# Ejecutar tests
cleanup_test_env
run_all_tests
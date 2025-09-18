#!/bin/bash

# AnarQ&Q Ecosystem Integrated Installer
# Combines the robust installer with modular installation options
# Versión: 4.0.0 - Integrated Modular System
# Autor: AnarQorp
# Licencia: MIT

set -e

# Source required modules
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source dependency manager
if [ -f "$SCRIPT_DIR/install-dependency-manager.sh" ]; then
    source "$SCRIPT_DIR/install-dependency-manager.sh"
else
    echo "❌ Error: install-dependency-manager.sh not found in $SCRIPT_DIR"
    echo "Please ensure all installer scripts are in the same directory"
    exit 1
fi

# Source component manager
if [ -f "$SCRIPT_DIR/install-component-manager.sh" ]; then
    source "$SCRIPT_DIR/install-component-manager.sh"
else
    echo "❌ Error: install-component-manager.sh not found in $SCRIPT_DIR"
    echo "Please ensure all installer scripts are in the same directory"
    exit 1
fi

# Load configuration if exists
if [ -f "./anarqq-install-config.sh" ]; then
    source "./anarqq-install-config.sh"
    print_info "Configuración cargada desde anarqq-install-config.sh"
fi

# Configuration with defaults
INSTALL_DIR="${INSTALL_CONFIG_TARGET_DIR:-$HOME/anarqq-ecosystem}"
INSTALL_MODE="${INSTALL_CONFIG_MODE:-minimal}"
COMPONENTS="${INSTALL_CONFIG_COMPONENTS:-demo}"
VERBOSE="${INSTALL_CONFIG_VERBOSE:-false}"
LOG_FILE="./anarqq-integrated-installer-$(date +%Y%m%d-%H%M%S).log"

# Enhanced logging
log_integrated() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case "$level" in
        "ERROR") print_error "$message" ;;
        "WARN") print_warning "$message" ;;
        "INFO") print_info "$message" ;;
        "DEBUG") [ "$VERBOSE" = "true" ] && print_substep "$message" ;;
    esac
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║         AnarQ&Q Ecosystem Integrated Installer v4.0          ║"
    echo "║                                                               ║"
    echo "║           Instalador Integrado del Ecosistema                ║"
    echo "║                  AnarQ&Q Modular Avanzado                    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Enhanced prerequisite check
check_prerequisites_integrated() {
    print_step "Verificando prerrequisitos del sistema..."
    
    initialize_system_info
    
    if interactive_dependency_check; then
        log_integrated "INFO" "All prerequisites satisfied"
        print_success "Todos los prerrequisitos están satisfechos"
        return 0
    else
        log_integrated "ERROR" "Prerequisites check failed"
        print_error "Faltan prerrequisitos críticos"
        return 1
    fi
}

# Create installation directory with proper setup
create_install_directory_integrated() {
    print_step "Configurando directorio de instalación..."
    
    if [ -d "$INSTALL_DIR" ]; then
        if [ -f "$INSTALL_DIR/.anarqq-installation" ]; then
            print_warning "Instalación existente detectada en $INSTALL_DIR"
            read -p "¿Deseas actualizar la instalación existente? (Y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                print_info "Instalación cancelada"
                exit 0
            fi
        else
            print_warning "El directorio $INSTALL_DIR ya existe"
            read -p "¿Deseas continuar y sobrescribir? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Instalación cancelada"
                exit 0
            fi
            rm -rf "$INSTALL_DIR"
        fi
    fi
    
    mkdir -p "$INSTALL_DIR"
    touch "$INSTALL_DIR/.anarqq-installation"
    
    log_integrated "INFO" "Installation directory created: $INSTALL_DIR"
    print_success "Directorio de instalación configurado: $INSTALL_DIR"
}

# Install components using the modular system
install_components_integrated() {
    print_step "Instalando componentes del ecosistema..."
    
    log_integrated "INFO" "Installing components: $COMPONENTS"
    log_integrated "INFO" "Installation mode: $INSTALL_MODE"
    
    # Set component manager log file
    export LOG_FILE="$LOG_FILE"
    
    if install_components "$COMPONENTS" "$INSTALL_DIR" "$VERBOSE"; then
        log_integrated "INFO" "All components installed successfully"
        print_success "Todos los componentes instalados exitosamente"
        return 0
    else
        log_integrated "ERROR" "Component installation failed"
        print_error "Error durante la instalación de componentes"
        return 1
    fi
}

# Validate installation
validate_installation_integrated() {
    print_step "Validando instalación..."
    
    log_integrated "INFO" "Validating installation"
    
    # Set component manager log file
    export LOG_FILE="$LOG_FILE"
    
    if validate_components "$COMPONENTS" "$INSTALL_DIR" "$VERBOSE"; then
        log_integrated "INFO" "Installation validation passed"
        print_success "Validación de instalación exitosa"
        return 0
    else
        log_integrated "WARN" "Some validation checks failed"
        print_warning "Algunas validaciones fallaron, pero la instalación puede funcionar"
        return 0  # Don't fail installation for validation warnings
    fi
}

# Create startup scripts and shortcuts
create_startup_scripts() {
    print_step "Creando scripts de inicio..."
    
    # Create main startup script
    cat > "$INSTALL_DIR/start-anarqq.sh" << EOF
#!/bin/bash
# AnarQ&Q Ecosystem Startup Script
# Generated by Integrated Installer v4.0

cd "\$(dirname "\${BASH_SOURCE[0]}")"

echo "🚀 Iniciando ecosistema AnarQ&Q..."
echo "Modo de instalación: $INSTALL_MODE"
echo "Componentes: $COMPONENTS"
echo ""

# Start based on available components
if [ -d "demo" ]; then
    echo "▶️ Iniciando demo..."
    cd demo
    npm run dev &
    DEMO_PID=\$!
    cd ..
fi

if [ -d "backend" ]; then
    echo "▶️ Iniciando backend..."
    cd backend
    npm start &
    BACKEND_PID=\$!
    cd ..
fi

echo ""
echo "✅ Ecosistema AnarQ&Q iniciado"
echo "📍 Directorio: \$(pwd)"
echo "🌐 Demo disponible en: http://localhost:3000"
echo ""
echo "Para detener: Ctrl+C"

# Wait for processes
wait
EOF
    
    chmod +x "$INSTALL_DIR/start-anarqq.sh"
    
    # Create quick development script if in development mode
    if [ "$INSTALL_MODE" = "development" ]; then
        cat > "$INSTALL_DIR/dev-anarqq.sh" << EOF
#!/bin/bash
# AnarQ&Q Development Environment Script

cd "\$(dirname "\${BASH_SOURCE[0]}")"

echo "🛠️ Iniciando entorno de desarrollo AnarQ&Q..."
echo ""

# Development specific commands
if [ -d "core" ]; then
    echo "▶️ Ejecutando tests..."
    cd core && npm test && cd ..
fi

echo "▶️ Iniciando en modo desarrollo..."
./start-anarqq.sh
EOF
        chmod +x "$INSTALL_DIR/dev-anarqq.sh"
    fi
    
    log_integrated "INFO" "Startup scripts created"
    print_success "Scripts de inicio creados"
}

# Show installation summary
show_installation_summary() {
    print_step "Resumen de instalación"
    echo ""
    
    print_info "🎉 Instalación completada exitosamente!"
    echo ""
    print_info "📋 Detalles de la instalación:"
    print_info "  • Modo: $INSTALL_MODE"
    print_info "  • Directorio: $INSTALL_DIR"
    print_info "  • Componentes: $COMPONENTS"
    print_info "  • Log: $LOG_FILE"
    echo ""
    
    print_info "🚀 Opciones de inicio:"
    print_info "  • Inicio rápido: cd $INSTALL_DIR && ./start-anarqq.sh"
    
    if [ "$INSTALL_MODE" = "development" ]; then
        print_info "  • Modo desarrollo: cd $INSTALL_DIR && ./dev-anarqq.sh"
    fi
    
    if [[ "$COMPONENTS" == *"demo"* ]]; then
        print_info "  • Demo directo: cd $INSTALL_DIR/demo && npm run dev"
    fi
    
    echo ""
    print_info "📚 Documentación y soporte:"
    print_info "  • GitHub: https://github.com/AnarQorp"
    print_info "  • Email: anarqorp@proton.me"
    
    echo ""
    print_success "¡Disfruta del ecosistema AnarQ&Q! 🌟"
}

# Error handling and cleanup
cleanup_and_exit_integrated() {
    local exit_code=${1:-1}
    
    log_integrated "ERROR" "Installation failed, cleaning up..."
    print_warning "Limpiando instalación fallida..."
    
    # Use component manager cleanup if available
    if declare -f cleanup_partial_installation >/dev/null; then
        INSTALL_CONFIG["target_dir"]="$INSTALL_DIR"
        INSTALL_CONFIG["cleanup_on_error"]="true"
        cleanup_partial_installation
    else
        # Fallback cleanup
        if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/.anarqq-installation" ]; then
            rm -rf "$INSTALL_DIR"
            print_success "Directorio de instalación limpiado"
        fi
    fi
    
    # Clean temporary files
    rm -rf /tmp/anarqq-* 2>/dev/null || true
    
    exit $exit_code
}

# Main installation function
main() {
    print_header
    
    log_integrated "INFO" "Starting AnarQ&Q Integrated Installer v4.0"
    
    print_info "Instalador integrado del ecosistema AnarQ&Q v4.0"
    echo ""
    print_info "Este instalador combina:"
    echo "  • Verificación robusta de prerrequisitos"
    echo "  • Sistema modular de instalación de componentes"
    echo "  • Validación automática de dependencias"
    echo "  • Gestión inteligente de espacio en disco"
    echo "  • Manejo avanzado de errores y recuperación"
    echo ""
    
    if [ -f "./anarqq-install-config.sh" ]; then
        print_info "Configuración detectada:"
        print_info "  • Modo: $INSTALL_MODE"
        print_info "  • Componentes: $COMPONENTS"
        print_info "  • Directorio: $INSTALL_DIR"
        echo ""
        read -p "¿Usar esta configuración? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "Ejecuta install-anarqq-modular.sh para reconfigurar"
            exit 0
        fi
    else
        print_warning "No se encontró configuración previa"
        print_info "Ejecuta install-anarqq-modular.sh primero para configurar la instalación"
        echo ""
        read -p "¿Continuar con configuración por defecto (modo mínimo)? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Instalación cancelada"
            exit 0
        fi
    fi
    
    echo ""
    
    # Execute installation steps
    check_prerequisites_integrated
    create_install_directory_integrated
    install_components_integrated
    validate_installation_integrated
    create_startup_scripts
    show_installation_summary
    
    log_integrated "INFO" "Installation completed successfully"
}

# Set up error handling
trap 'log_integrated "ERROR" "Installation failed unexpectedly"; cleanup_and_exit_integrated 1' ERR

# Execute main function
main "$@"
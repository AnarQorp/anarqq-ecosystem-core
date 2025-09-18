#!/bin/bash

# AnarQ&Q Ecosystem Modular Installer
# Instalador modular para el ecosistema AnarQ&Q con opciones de instalación flexibles
# Versión: 3.0.0 - Modular Installation System
# Autor: AnarQorp
# Licencia: MIT

set -e

# Source the dependency manager
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/install-dependency-manager.sh" ]; then
    source "$SCRIPT_DIR/install-dependency-manager.sh"
else
    echo "❌ Error: install-dependency-manager.sh not found in $SCRIPT_DIR"
    echo "Please ensure both scripts are in the same directory"
    exit 1
fi

# Configuration
INSTALL_DIR="$HOME/anarqq-ecosystem"
LOG_FILE="./anarqq-modular-installer-$(date +%Y%m%d-%H%M%S).log"

# Installation modes and components
declare -A INSTALLATION_MODES=(
    ["minimal"]="Demo básico con componentes esenciales"
    ["full"]="Ecosistema completo con todos los módulos"
    ["development"]="Entorno de desarrollo con herramientas adicionales"
)

declare -A COMPONENTS=(
    ["demo"]="Demo básico del ecosistema"
    ["core"]="Núcleo del ecosistema"
    ["backend"]="Servicios backend"
    ["frontend"]="Interfaz de usuario"
    ["qwallet"]="Módulo de billetera"
    ["qmarket"]="Módulo de mercado"
    ["qsocial"]="Módulo social"
    ["qchat"]="Módulo de chat"
    ["qdrive"]="Módulo de almacenamiento"
    ["qmail"]="Módulo de correo"
    ["qnet"]="Módulo de red"
    ["dao"]="Módulo DAO"
    ["qerberos"]="Módulo de seguridad"
    ["dev-tools"]="Herramientas de desarrollo"
)

# Component dependencies
declare -A COMPONENT_DEPS=(
    ["demo"]=""
    ["core"]="demo"
    ["backend"]="core"
    ["frontend"]="core"
    ["qwallet"]="core,backend"
    ["qmarket"]="core,backend,qwallet"
    ["qsocial"]="core,backend"
    ["qchat"]="core,backend,qsocial"
    ["qdrive"]="core,backend"
    ["qmail"]="core,backend"
    ["qnet"]="core,backend"
    ["dao"]="core,backend,qwallet"
    ["qerberos"]="core,backend"
    ["dev-tools"]="core"
)

# Component disk space requirements (in MB)
declare -A COMPONENT_SIZES=(
    ["demo"]="50"
    ["core"]="200"
    ["backend"]="150"
    ["frontend"]="100"
    ["qwallet"]="75"
    ["qmarket"]="100"
    ["qsocial"]="80"
    ["qchat"]="60"
    ["qdrive"]="120"
    ["qmail"]="70"
    ["qnet"]="90"
    ["dao"]="110"
    ["qerberos"]="85"
    ["dev-tools"]="300"
)

# Installation configuration
declare -A INSTALL_CONFIG=(
    ["mode"]=""
    ["components"]=""
    ["target_dir"]="$INSTALL_DIR"
    ["skip_validation"]="false"
    ["verbose"]="false"
    ["cleanup_on_error"]="true"
)

# Enhanced logging
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case "$level" in
        "ERROR") print_error "$message" ;;
        "WARN") print_warning "$message" ;;
        "INFO") print_info "$message" ;;
        "DEBUG") [ "${INSTALL_CONFIG[verbose]}" = "true" ] && print_substep "$message" ;;
    esac
}

# Disk space utilities
check_available_space() {
    local target_dir="$1"
    local required_mb="$2"
    
    # Create target directory if it doesn't exist
    mkdir -p "$target_dir"
    
    # Get available space in MB
    local available_kb=$(df "$target_dir" | awk 'NR==2 {print $4}')
    local available_mb=$((available_kb / 1024))
    
    log_message "DEBUG" "Available space: ${available_mb}MB, Required: ${required_mb}MB"
    
    if [ "$available_mb" -lt "$required_mb" ]; then
        return 1
    fi
    return 0
}

calculate_total_size() {
    local components="$1"
    local total_size=0
    
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs) # trim whitespace
        if [ -n "${COMPONENT_SIZES[$component]}" ]; then
            total_size=$((total_size + ${COMPONENT_SIZES[$component]}))
        fi
    done
    
    echo "$total_size"
}

# Component dependency validation
validate_dependencies() {
    local selected_components="$1"
    local missing_deps=()
    local all_required=()
    
    log_message "INFO" "Validating component dependencies..."
    
    # Convert selected components to array
    IFS=',' read -ra SELECTED <<< "$selected_components"
    
    # For each selected component, check its dependencies
    for component in "${SELECTED[@]}"; do
        component=$(echo "$component" | xargs)
        local deps="${COMPONENT_DEPS[$component]}"
        
        if [ -n "$deps" ]; then
            IFS=',' read -ra DEP_ARRAY <<< "$deps"
            for dep in "${DEP_ARRAY[@]}"; do
                dep=$(echo "$dep" | xargs)
                all_required+=("$dep")
            done
        fi
    done
    
    # Check if all required dependencies are in selected components
    for required in "${all_required[@]}"; do
        local found=false
        for selected in "${SELECTED[@]}"; do
            selected=$(echo "$selected" | xargs)
            if [ "$selected" = "$required" ]; then
                found=true
                break
            fi
        done
        
        if [ "$found" = false ]; then
            missing_deps+=("$required")
        fi
    done
    
    # Remove duplicates from missing_deps
    if [ ${#missing_deps[@]} -gt 0 ]; then
        local unique_missing=($(printf "%s\n" "${missing_deps[@]}" | sort -u))
        
        log_message "WARN" "Missing required dependencies: ${unique_missing[*]}"
        print_warning "Los siguientes componentes son requeridos pero no están seleccionados:"
        for dep in "${unique_missing[@]}"; do
            print_info "  • $dep: ${COMPONENTS[$dep]}"
        done
        
        echo ""
        read -p "¿Agregar automáticamente las dependencias faltantes? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            # Add missing dependencies
            local updated_components="$selected_components"
            for dep in "${unique_missing[@]}"; do
                updated_components="$updated_components,$dep"
            done
            echo "$updated_components"
            return 0
        else
            log_message "ERROR" "Installation cancelled due to missing dependencies"
            return 1
        fi
    fi
    
    echo "$selected_components"
    return 0
}

# Installation mode selection
select_installation_mode() {
    print_step "Selección del modo de instalación"
    echo ""
    print_info "Modos de instalación disponibles:"
    echo ""
    
    local mode_keys=("minimal" "full" "development")
    local i=1
    
    for mode in "${mode_keys[@]}"; do
        echo "  $i) $mode: ${INSTALLATION_MODES[$mode]}"
        i=$((i + 1))
    done
    
    echo ""
    read -p "Selecciona el modo de instalación (1-3) [1]: " mode_choice
    mode_choice=${mode_choice:-1}
    
    case "$mode_choice" in
        1) echo "minimal" ;;
        2) echo "full" ;;
        3) echo "development" ;;
        *) 
            log_message "WARN" "Invalid mode selection, defaulting to minimal"
            echo "minimal" 
            ;;
    esac
}

# Component selection based on mode
get_components_for_mode() {
    local mode="$1"
    
    case "$mode" in
        "minimal")
            echo "demo"
            ;;
        "full")
            echo "demo,core,backend,frontend,qwallet,qmarket,qsocial,qchat,qdrive,qmail,qnet,dao,qerberos"
            ;;
        "development")
            echo "demo,core,backend,frontend,qwallet,qmarket,qsocial,qchat,qdrive,qmail,qnet,dao,qerberos,dev-tools"
            ;;
        *)
            log_message "ERROR" "Unknown installation mode: $mode"
            echo "demo"
            ;;
    esac
}

# Interactive component selection
interactive_component_selection() {
    local mode="$1"
    local default_components=$(get_components_for_mode "$mode")
    
    print_step "Configuración de componentes"
    echo ""
    print_info "Componentes por defecto para el modo '$mode':"
    
    IFS=',' read -ra DEFAULT_ARRAY <<< "$default_components"
    for component in "${DEFAULT_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        echo "  • $component: ${COMPONENTS[$component]}"
    done
    
    echo ""
    read -p "¿Deseas personalizar la selección de componentes? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return_custom_selection "$default_components"
    else
        echo "$default_components"
    fi
}

return_custom_selection() {
    local default_components="$1"
    local selected_components=""
    
    print_substep "Selección personalizada de componentes:"
    echo ""
    
    for component in "${!COMPONENTS[@]}"; do
        local default_selected=false
        IFS=',' read -ra DEFAULT_ARRAY <<< "$default_components"
        for default_comp in "${DEFAULT_ARRAY[@]}"; do
            default_comp=$(echo "$default_comp" | xargs)
            if [ "$component" = "$default_comp" ]; then
                default_selected=true
                break
            fi
        done
        
        local prompt_text="$component: ${COMPONENTS[$component]}"
        local size_mb="${COMPONENT_SIZES[$component]}"
        prompt_text="$prompt_text (${size_mb}MB)"
        
        if [ "$default_selected" = true ]; then
            read -p "  ✓ $prompt_text [Y/n]: " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                selected_components="$selected_components,$component"
            fi
        else
            read -p "  ✗ $prompt_text [y/N]: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                selected_components="$selected_components,$component"
            fi
        fi
    done
    
    # Remove leading comma
    selected_components="${selected_components#,}"
    echo "$selected_components"
}

# Disk space validation
validate_disk_space() {
    local components="$1"
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    print_step "Validando espacio en disco..."
    
    local required_mb=$(calculate_total_size "$components")
    local buffer_mb=$((required_mb / 10)) # 10% buffer
    local total_required=$((required_mb + buffer_mb))
    
    log_message "INFO" "Required disk space: ${total_required}MB (${required_mb}MB + ${buffer_mb}MB buffer)"
    
    if ! check_available_space "$target_dir" "$total_required"; then
        local available_kb=$(df "$target_dir" | awk 'NR==2 {print $4}')
        local available_mb=$((available_kb / 1024))
        
        log_message "ERROR" "Insufficient disk space. Required: ${total_required}MB, Available: ${available_mb}MB"
        print_error "Espacio insuficiente en disco"
        print_info "Requerido: ${total_required}MB (incluyendo buffer del 10%)"
        print_info "Disponible: ${available_mb}MB"
        print_info "Directorio objetivo: $target_dir"
        
        echo ""
        print_info "Opciones:"
        print_info "  1. Liberar espacio en disco"
        print_info "  2. Cambiar directorio de instalación"
        print_info "  3. Seleccionar menos componentes"
        
        return 1
    fi
    
    print_success "Espacio en disco suficiente: ${total_required}MB requeridos"
    return 0
}

# Cleanup utilities
cleanup_partial_installation() {
    local target_dir="${INSTALL_CONFIG[target_dir]}"
    
    if [ "${INSTALL_CONFIG[cleanup_on_error]}" = "true" ]; then
        log_message "INFO" "Cleaning up partial installation..."
        print_warning "Limpiando instalación parcial..."
        
        if [ -d "$target_dir" ]; then
            # Only remove if it looks like our installation
            if [ -f "$target_dir/.anarqq-installation" ]; then
                rm -rf "$target_dir"
                print_success "Instalación parcial eliminada"
            else
                print_warning "Directorio no parece ser una instalación de AnarQ&Q, no se eliminó"
            fi
        fi
        
        # Clean temporary files
        rm -rf /tmp/anarqq-* 2>/dev/null || true
    fi
}

# Main configuration function
configure_installation() {
    print_header
    
    print_info "Configurador de instalación modular del ecosistema AnarQ&Q"
    echo ""
    print_info "Este instalador te permite:"
    echo "  • Seleccionar modo de instalación (mínimo, completo, desarrollo)"
    echo "  • Personalizar componentes a instalar"
    echo "  • Validar dependencias automáticamente"
    echo "  • Verificar espacio en disco disponible"
    echo "  • Configurar opciones avanzadas"
    echo ""
    
    read -p "¿Continuar con la configuración? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Configuración cancelada"
        exit 0
    fi
    
    echo ""
    
    # Step 1: Select installation mode
    local mode=$(select_installation_mode)
    INSTALL_CONFIG["mode"]="$mode"
    log_message "INFO" "Selected installation mode: $mode"
    
    echo ""
    
    # Step 2: Select components
    local components=$(interactive_component_selection "$mode")
    log_message "INFO" "Initial component selection: $components"
    
    # Step 3: Validate dependencies
    print_step "Validando dependencias de componentes..."
    components=$(validate_dependencies "$components")
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Dependency validation failed"
        exit 1
    fi
    
    INSTALL_CONFIG["components"]="$components"
    log_message "INFO" "Final component selection: $components"
    
    echo ""
    
    # Step 4: Validate disk space
    if ! validate_disk_space "$components"; then
        echo ""
        read -p "¿Deseas continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_message "INFO" "Installation cancelled due to disk space"
            exit 0
        fi
    fi
    
    echo ""
    
    # Step 5: Advanced options
    print_step "Opciones avanzadas"
    read -p "¿Habilitar modo verbose? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        INSTALL_CONFIG["verbose"]="true"
    fi
    
    read -p "¿Cambiar directorio de instalación? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Nuevo directorio de instalación [$INSTALL_DIR]: " new_dir
        if [ -n "$new_dir" ]; then
            INSTALL_CONFIG["target_dir"]="$new_dir"
        fi
    fi
    
    echo ""
    
    # Step 6: Configuration summary
    print_step "Resumen de configuración"
    echo ""
    print_info "Modo de instalación: ${INSTALL_CONFIG[mode]}"
    print_info "Directorio objetivo: ${INSTALL_CONFIG[target_dir]}"
    print_info "Modo verbose: ${INSTALL_CONFIG[verbose]}"
    
    echo ""
    print_info "Componentes seleccionados:"
    IFS=',' read -ra COMP_ARRAY <<< "${INSTALL_CONFIG[components]}"
    local total_size=0
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        local size="${COMPONENT_SIZES[$component]}"
        total_size=$((total_size + size))
        echo "  • $component: ${COMPONENTS[$component]} (${size}MB)"
    done
    
    echo ""
    print_info "Espacio total requerido: ${total_size}MB"
    
    echo ""
    read -p "¿Proceder con la instalación? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Instalación cancelada"
        exit 0
    fi
    
    return 0
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            AnarQ&Q Ecosystem Modular Installer v3.0          ║"
    echo "║                                                               ║"
    echo "║           Instalador Modular del Ecosistema                  ║"
    echo "║                     AnarQ&Q Avanzado                         ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Error handling
cleanup_and_exit() {
    local exit_code=${1:-1}
    cleanup_partial_installation
    exit $exit_code
}

# Main execution
main() {
    # Initialize logging
    log_message "INFO" "Starting AnarQ&Q Modular Installer v3.0"
    
    # Configure installation
    configure_installation
    
    # Mark installation directory
    mkdir -p "${INSTALL_CONFIG[target_dir]}"
    touch "${INSTALL_CONFIG[target_dir]}/.anarqq-installation"
    
    print_success "🎉 Configuración completada exitosamente!"
    print_info "📍 Configuración guardada en: $LOG_FILE"
    print_info "🚀 Ejecuta el instalador principal para proceder con la instalación"
    
    # Export configuration for use by main installer
    echo "# AnarQ&Q Installation Configuration" > "./anarqq-install-config.sh"
    echo "# Generated on $(date)" >> "./anarqq-install-config.sh"
    echo "" >> "./anarqq-install-config.sh"
    
    for key in "${!INSTALL_CONFIG[@]}"; do
        echo "INSTALL_CONFIG_${key^^}=\"${INSTALL_CONFIG[$key]}\"" >> "./anarqq-install-config.sh"
    done
    
    print_success "Configuración exportada a: ./anarqq-install-config.sh"
}

# Trap errors
trap 'log_message "ERROR" "Installation configuration failed"; cleanup_and_exit 1' ERR

# Execute main function
main "$@"
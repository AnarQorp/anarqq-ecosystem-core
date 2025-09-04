#!/bin/bash

# AnarQ&Q Ecosystem Demo Installer - Enhanced with Robust Dependency Management
# Instalador automático para la demo del ecosistema AnarQ&Q
# Versión: 2.0.0 - Enhanced with robust dependency management
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

# Configuración
DEMO_REPO="https://github.com/AnarQorp/anarqq-ecosystem-demo.git"
CORE_REPO="https://github.com/AnarQorp/anarqq-ecosystem-core.git"
INSTALL_DIR="$HOME/anarqq-ecosystem"
DEMO_DIR="$INSTALL_DIR/demo"
CORE_DIR="$INSTALL_DIR/core"

# Enhanced error logging
log_error() {
    local error_type="$1"
    local error_message="$2"
    local context="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_file="./anarqq-installer-$(date +%Y%m%d-%H%M%S).log"
    
    echo "[$timestamp] ERROR [$error_type]: $error_message" >> "$log_file"
    if [ -n "$context" ]; then
        echo "[$timestamp] CONTEXT: $context" >> "$log_file"
    fi
    
    print_error "$error_message"
    if [ -n "$context" ]; then
        print_info "Contexto: $context"
    fi
    print_info "Log detallado en: $log_file"
}

# Retry function with exponential backoff
retry_with_backoff() {
    local max_attempts="$1"
    local delay="$2"
    local command_to_run="$3"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$command_to_run"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            print_substep "Intento $attempt falló, reintentando en ${delay}s..."
            sleep $delay
            delay=$((delay * 2))  # Exponential backoff
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║            AnarQ&Q Ecosystem Demo Installer v2.0             ║"
    echo "║                                                               ║"
    echo "║           Instalador Automático del Ecosistema               ║"
    echo "║                     AnarQ&Q Enhanced                         ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Enhanced prerequisite check using the dependency manager
check_prerequisites_enhanced() {
    print_step "Verificando prerrequisitos del sistema con sistema robusto..."
    
    # Initialize the dependency manager
    initialize_system_info
    
    # Run interactive dependency check
    if interactive_dependency_check; then
        print_success "Todos los prerrequisitos críticos están satisfechos"
        return 0
    else
        print_error "Faltan prerrequisitos críticos para la instalación"
        print_info "Por favor, instala las dependencias faltantes y ejecuta el instalador nuevamente"
        return 1
    fi
}

# Función para crear directorio de instalación
create_install_directory() {
    print_step "Creando directorio de instalación..."
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "El directorio $INSTALL_DIR ya existe"
        read -p "¿Deseas continuar y sobrescribir? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Instalación cancelada"
            exit 0
        fi
        rm -rf "$INSTALL_DIR"
    fi
    
    mkdir -p "$INSTALL_DIR"
    print_success "Directorio creado: $INSTALL_DIR"
}

# Enhanced download function with multiple fallback methods
download_repositories_enhanced() {
    print_step "Descargando repositorios del ecosistema AnarQ&Q con métodos robustos..."
    
    # Configuración de repositorios
    local repositories=(
        "demo|https://github.com/AnarQorp/anarqq-ecosystem-demo|$DEMO_DIR|required"
        "core|https://github.com/AnarQorp/anarqq-ecosystem-core|$CORE_DIR|optional"
    )
    
    # Crear directorio temporal
    local temp_dir=$(mktemp -d)
    
    for repo_config in "${repositories[@]}"; do
        IFS='|' read -r repo_name repo_url target_dir requirement <<< "$repo_config"
        
        print_substep "Descargando repositorio: $repo_name..."
        
        # Intentar múltiples métodos de descarga
        local success=false
        
        # Método 1: Git clone (mejor para repositorios públicos)
        if command_exists git; then
            print_substep "Intentando git clone..."
            if retry_with_backoff 3 2 "git clone --depth 1 '$repo_url.git' '$target_dir'"; then
                print_success "Repositorio $repo_name clonado exitosamente"
                success=true
            else
                print_substep "Git clone falló, intentando descarga ZIP..."
            fi
        fi
        
        # Método 2: Descarga ZIP con múltiples herramientas
        if [ "$success" = false ]; then
            local zip_url="$repo_url/archive/refs/heads/main.zip"
            if download_and_extract_zip_enhanced "$zip_url" "$target_dir" "$repo_name" "$temp_dir"; then
                print_success "Repositorio $repo_name descargado como ZIP"
                success=true
            fi
        fi
        
        # Manejo de errores según el tipo de repositorio
        if [ "$success" = false ]; then
            if [ "$requirement" = "required" ]; then
                log_error "DOWNLOAD_FAILED" "No se pudo descargar el repositorio requerido: $repo_name" "$repo_url"
                print_info "Posibles causas:"
                print_info "  1. Repositorio privado sin acceso configurado"
                print_info "  2. Problemas de conectividad de red"
                print_info "  3. Repositorio no disponible o movido"
                echo ""
                print_info "Soluciones:"
                print_info "  1. Configura acceso SSH: ssh-keygen -t ed25519 -C 'tu-email@ejemplo.com'"
                print_info "  2. Agrega la clave a GitHub: https://github.com/settings/keys"
                print_info "  3. Contacta a anarqorp@proton.me para obtener acceso"
                echo ""
                cleanup_and_exit 1
            else
                print_warning "No se pudo descargar el repositorio opcional: $repo_name"
                print_info "Continuando con la instalación..."
            fi
        fi
    done
    
    # Limpiar directorio temporal
    rm -rf "$temp_dir"
}

# Enhanced ZIP download and extraction with multiple methods
download_and_extract_zip_enhanced() {
    local zip_url="$1"
    local target_dir="$2"
    local repo_name="$3"
    local temp_dir="$4"
    
    local zip_file="$temp_dir/${repo_name}.zip"
    local extract_dir="$temp_dir/${repo_name}_extract"
    
    # Intentar descarga con múltiples métodos y reintentos
    print_substep "Descargando archivo ZIP con reintentos..."
    local download_success=false
    
    # Método 1: curl con reintentos
    if command_exists curl; then
        print_substep "Intentando descarga con curl..."
        if retry_with_backoff 3 2 "curl -L -f -s -o '$zip_file' '$zip_url'"; then
            download_success=true
        fi
    fi
    
    # Método 2: wget (fallback) con reintentos
    if [ "$download_success" = false ] && command_exists wget; then
        print_substep "Intentando descarga con wget..."
        if retry_with_backoff 3 2 "wget -q -O '$zip_file' '$zip_url'"; then
            download_success=true
        fi
    fi
    
    if [ "$download_success" = false ]; then
        print_error "No se pudo descargar el archivo con ningún método"
        return 1
    fi
    
    # Extraer archivo descargado con múltiples métodos
    print_substep "Extrayendo archivos con métodos robustos..."
    mkdir -p "$extract_dir"
    
    # Método 1: unzip (preferido)
    if command_exists unzip; then
        print_substep "Extrayendo con unzip..."
        if unzip -q "$zip_file" -d "$extract_dir" 2>/dev/null; then
            if move_extracted_content "$extract_dir" "$target_dir"; then
                return 0
            fi
        fi
    fi
    
    # Método 2: Python zipfile (fallback)
    if command_exists python3; then
        print_substep "Extrayendo con Python..."
        if python3 -c "
import zipfile
import os
with zipfile.ZipFile('$zip_file', 'r') as zip_ref:
    zip_ref.extractall('$extract_dir')
" 2>/dev/null; then
            if move_extracted_content "$extract_dir" "$target_dir"; then
                return 0
            fi
        fi
    fi
    
    print_error "No se pudo extraer el archivo ZIP con ningún método disponible"
    return 1
}

# Función auxiliar para mover contenido extraído
move_extracted_content() {
    local extract_dir="$1"
    local target_dir="$2"
    
    # Buscar el directorio extraído (GitHub crea un directorio con formato repo-branch)
    local extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d -name "*-main" | head -1)
    
    if [ -z "$extracted_dir" ]; then
        # Si no hay directorio con -main, buscar cualquier directorio
        extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d ! -path "$extract_dir" | head -1)
    fi
    
    if [ -n "$extracted_dir" ] && [ -d "$extracted_dir" ]; then
        # Mover contenido al directorio objetivo
        mkdir -p "$target_dir"
        cp -r "$extracted_dir"/* "$target_dir/" 2>/dev/null || true
        cp -r "$extracted_dir"/.[^.]* "$target_dir/" 2>/dev/null || true
        return 0
    fi
    
    return 1
}

# Función para limpiar y salir
cleanup_and_exit() {
    local exit_code=${1:-1}
    print_warning "Limpiando archivos temporales..."
    # Limpiar cualquier directorio temporal que pueda haber quedado
    rm -rf /tmp/anarqq-* 2>/dev/null || true
    rm -rf ./anarqq-dependency-*.log 2>/dev/null || true
    exit $exit_code
}

# Resto de funciones del instalador original...
install_dependencies() {
    print_step "Instalando dependencias..."
    
    # Instalar dependencias de la demo
    print_substep "Instalando dependencias de la demo..."
    cd "$DEMO_DIR"
    npm install
    print_success "Dependencias de la demo instaladas"
    
    # Si existe el core, instalar sus dependencias también
    if [ -d "$CORE_DIR" ]; then
        print_substep "Instalando dependencias del ecosistema completo..."
        cd "$CORE_DIR"
        npm install
        
        # Instalar dependencias del backend si existe
        if [ -d "backend" ]; then
            print_substep "Instalando dependencias del backend..."
            cd backend
            npm install
            cd ..
        fi
        
        print_success "Dependencias del ecosistema completo instaladas"
    fi
}

setup_environment() {
    print_step "Configurando entorno..."
    
    cd "$DEMO_DIR"
    
    # Copiar archivo de entorno si no existe
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        print_substep "Creando archivo de configuración .env..."
        cp .env.example .env
        print_success "Archivo .env creado desde .env.example"
    fi
    
    # Si existe el core, configurar también
    if [ -d "$CORE_DIR" ]; then
        cd "$CORE_DIR"
        if [ ! -f ".env" ] && [ -f ".env.example" ]; then
            print_substep "Creando archivo .env para el ecosistema completo..."
            cp .env.example .env
        fi
        
        # Backend environment
        if [ -d "backend" ] && [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
            print_substep "Creando archivo .env para el backend..."
            cp backend/.env.example backend/.env
        fi
    fi
}

# Función principal
main() {
    print_header
    
    print_info "Este instalador mejorado configurará automáticamente:"
    echo "  • Verificación robusta de prerrequisitos con instalación automática"
    echo "  • Descarga de repositorios con múltiples métodos de fallback"
    echo "  • Instalación de dependencias"
    echo "  • Configuración del entorno"
    echo "  • Scripts de acceso rápido"
    echo ""
    
    read -p "¿Continuar con la instalación mejorada? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalación cancelada"
        exit 0
    fi
    
    echo ""
    
    # Ejecutar pasos de instalación con sistema robusto
    check_prerequisites_enhanced
    create_install_directory
    download_repositories_enhanced
    install_dependencies
    setup_environment
    
    echo ""
    print_success "🎉 ¡Instalación completada exitosamente con sistema robusto!"
    print_info "📍 Ubicación de instalación: $INSTALL_DIR"
    print_info "🚀 Para iniciar: cd $DEMO_DIR && npm run dev"
}

# Manejo de errores
trap 'print_error "Error durante la instalación. Revisa los logs arriba."; cleanup_and_exit 1' ERR

# Ejecutar instalador
main "$@"
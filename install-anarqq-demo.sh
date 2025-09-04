#!/bin/bash

# AnarQ&Q Ecosystem Demo Installer
# Instalador automático para la demo del ecosistema AnarQ&Q
# Versión: 1.0.0
# Autor: AnarQorp
# Licencia: MIT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Utility functions
command_exists() {
    command -v "$1" >/dev/null 2>&1
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

# Enhanced error logging
log_error() {
    local error_type="$1"
    local error_message="$2"
    local context="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_file="/tmp/anarqq-installer-$(date +%Y%m%d-%H%M%S).log"
    
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

# Configuración
DEMO_REPO="https://github.com/AnarQorp/anarqq-ecosystem-demo.git"
CORE_REPO="https://github.com/AnarQorp/anarqq-ecosystem-core.git"
INSTALL_DIR="$HOME/anarqq-ecosystem"
DEMO_DIR="$INSTALL_DIR/demo"
CORE_DIR="$INSTALL_DIR/core"

# Función para imprimir mensajes con colores
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║               AnarQ&Q Ecosystem Demo Installer                ║"
    echo "║                                                               ║"
    echo "║           Instalador Automático del Ecosistema               ║"
    echo "║                     AnarQ&Q v1.0.0                           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

print_substep() {
    echo -e "   ${BLUE}→ $1${NC}"
}

# Función para detectar el gestor de paquetes del sistema
detect_package_manager() {
    if command_exists apt-get; then
        echo "apt"
    elif command_exists yum; then
        echo "yum"
    elif command_exists dnf; then
        echo "dnf"
    elif command_exists brew; then
        echo "brew"
    elif command_exists pacman; then
        echo "pacman"
    else
        echo "manual"
    fi
}

# Función para instalar dependencias automáticamente
install_missing_dependency() {
    local dep_name="$1"
    local dep_description="$2"
    local pkg_manager=$(detect_package_manager)
    
    print_substep "Intentando instalar $dep_name automáticamente..."
    
    case $pkg_manager in
        apt)
            if sudo apt-get update && sudo apt-get install -y "$dep_name"; then
                print_success "$dep_name instalado exitosamente"
                return 0
            fi
            ;;
        yum)
            if sudo yum install -y "$dep_name"; then
                print_success "$dep_name instalado exitosamente"
                return 0
            fi
            ;;
        dnf)
            if sudo dnf install -y "$dep_name"; then
                print_success "$dep_name instalado exitosamente"
                return 0
            fi
            ;;
        brew)
            if brew install "$dep_name"; then
                print_success "$dep_name instalado exitosamente"
                return 0
            fi
            ;;
        pacman)
            if sudo pacman -S --noconfirm "$dep_name"; then
                print_success "$dep_name instalado exitosamente"
                return 0
            fi
            ;;
        *)
            print_warning "No se pudo detectar un gestor de paquetes compatible"
            ;;
    esac
    
    return 1
}

# Función para verificar prerrequisitos con instalación automática
check_prerequisites() {
    print_step "Verificando prerrequisitos del sistema..."
    
    local errors=0
    local auto_install=false
    
    # Preguntar si quiere instalación automática
    echo ""
    read -p "¿Deseas que el instalador intente instalar dependencias faltantes automáticamente? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        auto_install=true
        print_info "Instalación automática habilitada"
    fi
    echo ""
    
    # Verificar unzip (crítico para extracción)
    if command_exists unzip; then
        print_substep "unzip está instalado"
    else
        print_warning "unzip no está instalado"
        if [ "$auto_install" = true ]; then
            if install_missing_dependency "unzip" "Utilidad de extracción ZIP"; then
                print_substep "unzip instalado exitosamente"
            else
                print_info "Instalación manual: sudo apt install unzip (Ubuntu/Debian) o brew install unzip (macOS)"
            fi
        else
            print_info "Instalación manual: sudo apt install unzip (Ubuntu/Debian) o brew install unzip (macOS)"
        fi
    fi
    
    # Verificar curl o wget
    local has_downloader=false
    if command_exists curl; then
        print_substep "curl está instalado"
        has_downloader=true
    elif command_exists wget; then
        print_substep "wget está instalado"
        has_downloader=true
    else
        print_warning "Ni curl ni wget están instalados"
        if [ "$auto_install" = true ]; then
            if install_missing_dependency "curl" "Herramienta de descarga"; then
                print_substep "curl instalado exitosamente"
                has_downloader=true
            fi
        fi
        
        if [ "$has_downloader" = false ]; then
            print_info "Instalación manual: sudo apt install curl (Ubuntu/Debian) o brew install curl (macOS)"
        fi
    fi
    
    # Verificar Git
    if command_exists git; then
        print_substep "Git está instalado: $(git --version)"
    else
        print_warning "Git no está instalado"
        if [ "$auto_install" = true ]; then
            if install_missing_dependency "git" "Sistema de control de versiones"; then
                print_substep "Git instalado exitosamente"
            else
                ((errors++))
            fi
        else
            ((errors++))
        fi
    fi
    
    # Verificar Node.js
    if command_exists node; then
        local node_version=$(node --version)
        print_substep "Node.js está instalado: $node_version"
        
        # Verificar versión mínima (18+)
        local major_version=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
        if [ "$major_version" -ge 18 ]; then
            print_substep "Versión de Node.js compatible (≥18)"
        else
            print_error "Node.js versión $node_version no es compatible (requiere ≥18)"
            ((errors++))
        fi
    else
        print_error "Node.js no está instalado"
        if [ "$auto_install" = true ]; then
            print_info "Node.js requiere instalación manual desde: https://nodejs.org/"
            print_info "O usar nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        fi
        ((errors++))
    fi
    
    # Verificar npm
    if command_exists npm; then
        print_substep "npm está instalado: $(npm --version)"
    else
        print_error "npm no está instalado (normalmente viene con Node.js)"
        ((errors++))
    fi
    
    # Verificar Python (para fallback de extracción)
    if command_exists python3; then
        print_substep "Python3 está disponible (útil para fallback de extracción)"
    elif command_exists python; then
        print_substep "Python está disponible (útil para fallback de extracción)"
    else
        print_info "Python no está disponible (opcional para métodos de extracción alternativos)"
    fi
    
    # Verificar Docker (opcional)
    if command_exists docker; then
        print_substep "Docker está instalado: $(docker --version)"
    else
        print_info "Docker no está instalado (opcional para contenedores)"
    fi
    
    # Verificar Docker Compose (opcional)
    if command_exists docker-compose; then
        print_substep "Docker Compose está instalado: $(docker-compose --version)"
    else
        print_info "Docker Compose no está instalado (opcional para orquestación)"
    fi
    
    if [ $errors -gt 0 ]; then
        print_error "Se encontraron $errors errores críticos en los prerrequisitos"
        echo ""
        print_info "Dependencias críticas faltantes:"
        if ! command_exists git; then
            echo "  • Git: sudo apt install git (Ubuntu/Debian) o brew install git (macOS)"
        fi
        if ! command_exists node; then
            echo "  • Node.js: https://nodejs.org/ o usar nvm"
        fi
        if ! command_exists npm; then
            echo "  • npm: normalmente viene con Node.js"
        fi
        echo ""
        print_info "Ejecuta el instalador nuevamente después de instalar las dependencias"
        exit 1
    fi
    
    print_success "Todos los prerrequisitos críticos están satisfechos"
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

# Función para descargar repositorios con manejo de acceso público/privado
download_repositories() {
    print_step "Descargando repositorios del ecosistema AnarQ&Q..."
    
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
            if git clone --depth 1 "$repo_url.git" "$target_dir" 2>/dev/null; then
                print_success "Repositorio $repo_name clonado exitosamente"
                success=true
            else
                print_substep "Git clone falló, intentando descarga ZIP..."
            fi
        fi
        
        # Método 2: Descarga ZIP (fallback)
        if [ "$success" = false ]; then
            local zip_url="$repo_url/archive/refs/heads/main.zip"
            if download_and_extract_zip "$zip_url" "$target_dir" "$repo_name" "$temp_dir"; then
                print_success "Repositorio $repo_name descargado como ZIP"
                success=true
            fi
        fi
        
        # Manejo de errores según el tipo de repositorio
        if [ "$success" = false ]; then
            if [ "$requirement" = "required" ]; then
                print_error "No se pudo descargar el repositorio requerido: $repo_name"
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
                
                # Preguntar si quiere intentar descarga manual
                echo ""
                read -p "¿Deseas intentar la descarga manual de $repo_name? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    print_info "Para descarga manual:"
                    print_info "  1. Visita: $repo_url"
                    print_info "  2. Descarga como ZIP o clona manualmente"
                    print_info "  3. Extrae en: $target_dir"
                    echo ""
                    read -p "Presiona Enter cuando hayas completado la descarga manual..." -r
                    
                    # Verificar si la descarga manual fue exitosa
                    if [ -d "$target_dir" ] && [ "$(ls -A "$target_dir" 2>/dev/null)" ]; then
                        print_success "Descarga manual de $repo_name completada"
                    else
                        print_warning "Descarga manual no detectada, continuando sin $repo_name"
                    fi
                fi
            fi
        fi
    done
    
    # Limpiar directorio temporal
    rm -rf "$temp_dir"
}

# Función para limpiar y salir
cleanup_and_exit() {
    local exit_code=${1:-1}
    print_warning "Limpiando archivos temporales..."
    # Limpiar cualquier directorio temporal que pueda haber quedado
    rm -rf /tmp/anarqq-* 2>/dev/null || true
    exit $exit_code
}

# Función auxiliar para descargar y extraer ZIP
download_and_extract_zip() {
    local zip_url="$1"
    local target_dir="$2"
    local repo_name="$3"
    local temp_dir="$4"
    
    local zip_file="$temp_dir/${repo_name}.zip"
    local extract_dir="$temp_dir/${repo_name}_extract"
    
    # Intentar descarga con múltiples métodos
    print_substep "Descargando archivo ZIP..."
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
    
    # Método 3: git clone (fallback para repositorios públicos)
    if [ "$download_success" = false ] && command_exists git; then
        print_substep "Intentando clonación con git..."
        local git_url=$(echo "$zip_url" | sed 's|/archive/refs/heads/main.zip|.git|')
        if git clone --depth 1 "$git_url" "$target_dir" 2>/dev/null; then
            return 0
        fi
    fi
    
    if [ "$download_success" = false ]; then
        print_error "No se pudo descargar el archivo"
        return 1
    fi
    
    # Extraer archivo descargado
    print_substep "Extrayendo archivos..."
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
    
    # Método 3: Node.js (fallback si está disponible)
    if command_exists node; then
        print_substep "Extrayendo con Node.js..."
        if node -e "
const fs = require('fs');
const path = require('path');
try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip('$zip_file');
    zip.extractAllTo('$extract_dir', true);
    console.log('success');
} catch(e) {
    process.exit(1);
}
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

# Función para instalar dependencias
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

# Función para configurar entorno
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

# Función para ejecutar tests básicos
run_basic_tests() {
    print_step "Ejecutando tests básicos..."
    
    cd "$DEMO_DIR"
    
    # Test de build de la demo
    print_substep "Probando build de la demo..."
    if npm run build &> /dev/null; then
        print_success "Build de la demo exitoso"
    else
        print_warning "Build de la demo falló (puede requerir configuración adicional)"
    fi
    
    # Test básico si existe
    if [ -f "test-basic.mjs" ]; then
        print_substep "Ejecutando test básico..."
        if node test-basic.mjs &> /dev/null; then
            print_success "Test básico pasó"
        else
            print_warning "Test básico falló (puede requerir configuración adicional)"
        fi
    fi
}

# Función para crear scripts de acceso rápido
create_shortcuts() {
    print_step "Creando scripts de acceso rápido..."
    
    # Script para iniciar la demo
    cat > "$INSTALL_DIR/start-demo.sh" << 'EOF'
#!/bin/bash
echo "🚀 Iniciando AnarQ&Q Ecosystem Demo..."
cd "$(dirname "$0")/demo"
npm run dev
EOF
    
    # Script para iniciar el ecosistema completo
    if [ -d "$CORE_DIR" ]; then
        cat > "$INSTALL_DIR/start-ecosystem.sh" << 'EOF'
#!/bin/bash
echo "🚀 Iniciando AnarQ&Q Ecosystem Core..."
cd "$(dirname "$0")/core"

# Iniciar backend en background si existe
if [ -d "backend" ]; then
    echo "📡 Iniciando backend..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    echo "Backend iniciado con PID: $BACKEND_PID"
fi

# Iniciar frontend
echo "🎨 Iniciando frontend..."
npm run dev
EOF
    fi
    
    # Script para Docker Compose si está disponible
    if command -v docker-compose &> /dev/null && [ -f "$DEMO_DIR/docker-compose.yml" ]; then
        cat > "$INSTALL_DIR/start-docker.sh" << 'EOF'
#!/bin/bash
echo "🐳 Iniciando AnarQ&Q Ecosystem con Docker..."
cd "$(dirname "$0")/demo"
docker-compose up -d
echo "✅ Servicios iniciados con Docker Compose"
echo "📊 Para ver logs: docker-compose logs -f"
echo "🛑 Para detener: docker-compose down"
EOF
    fi
    
    # Hacer ejecutables
    chmod +x "$INSTALL_DIR"/*.sh
    
    print_success "Scripts de acceso rápido creados en: $INSTALL_DIR"
}

# Función para mostrar información final
show_final_info() {
    print_header
    print_success "🎉 ¡Instalación completada exitosamente!"
    echo ""
    print_info "📍 Ubicación de instalación: $INSTALL_DIR"
    echo ""
    print_info "🚀 Para iniciar la demo:"
    echo "   cd $DEMO_DIR"
    echo "   npm run dev"
    echo ""
    print_info "⚡ O usar el script de acceso rápido:"
    echo "   $INSTALL_DIR/start-demo.sh"
    echo ""
    
    if [ -d "$CORE_DIR" ]; then
        print_info "🌐 Para iniciar el ecosistema completo:"
        echo "   $INSTALL_DIR/start-ecosystem.sh"
        echo ""
    fi
    
    if [ -f "$INSTALL_DIR/start-docker.sh" ]; then
        print_info "🐳 Para iniciar con Docker:"
        echo "   $INSTALL_DIR/start-docker.sh"
        echo ""
    fi
    
    print_info "📚 Documentación:"
    echo "   • Demo: $DEMO_DIR/README.md"
    if [ -d "$CORE_DIR" ]; then
        echo "   • Ecosistema: $CORE_DIR/README.md"
    fi
    echo ""
    
    print_info "🔧 Configuración:"
    echo "   • Demo: $DEMO_DIR/.env"
    if [ -d "$CORE_DIR" ]; then
        echo "   • Ecosistema: $CORE_DIR/.env"
        echo "   • Backend: $CORE_DIR/backend/.env"
    fi
    echo ""
    
    print_info "🌐 URLs por defecto (una vez iniciado):"
    echo "   • Frontend: http://localhost:8080"
    echo "   • Backend: http://localhost:3001"
    echo ""
    
    print_info "📧 Soporte: anarqorp@proton.me"
    print_info "🔗 GitHub: https://github.com/AnarQorp"
    echo ""
    
    print_success "¡Disfruta explorando el ecosistema AnarQ&Q! 🚀"
}

# Función principal
main() {
    print_header
    
    print_info "Este instalador configurará automáticamente:"
    echo "  • Verificación de prerrequisitos"
    echo "  • Descarga de repositorios"
    echo "  • Instalación de dependencias"
    echo "  • Configuración del entorno"
    echo "  • Tests básicos"
    echo "  • Scripts de acceso rápido"
    echo ""
    
    read -p "¿Continuar con la instalación? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalación cancelada"
        exit 0
    fi
    
    echo ""
    
    # Ejecutar pasos de instalación
    check_prerequisites
    create_install_directory
    download_repositories
    install_dependencies
    setup_environment
    run_basic_tests
    create_shortcuts
    
    echo ""
    show_final_info
}

# Manejo de errores
trap 'print_error "Error durante la instalación. Revisa los logs arriba."; exit 1' ERR

# Ejecutar instalador
main "$@"
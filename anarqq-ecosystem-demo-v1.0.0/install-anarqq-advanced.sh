#!/bin/bash

# AnarQ&Q Ecosystem Advanced Installer
# Instalador avanzado con opciones completas
# Versión: 1.0.0
# Autor: AnarQorp
# Licencia: MIT

set -e

# Configuración por defecto
DEMO_REPO="https://github.com/AnarQorp/anarqq-ecosystem-demo.git"
CORE_REPO="https://github.com/AnarQorp/anarqq-ecosystem-core.git"
DEFAULT_INSTALL_DIR="$HOME/anarqq-ecosystem"
INSTALL_DIR="$DEFAULT_INSTALL_DIR"
DEMO_DIR=""
CORE_DIR=""

# Opciones de instalación
INSTALL_DEMO=true
INSTALL_CORE=false
INSTALL_DOCKER=false
SKIP_PREREQS=false
SKIP_TESTS=false
VERBOSE=false
AUTO_START=false
DEVELOPMENT_MODE=false

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Funciones de utilidad
print_usage() {
    echo "AnarQ&Q Ecosystem Advanced Installer"
    echo ""
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "OPCIONES:"
    echo "  -h, --help              Mostrar esta ayuda"
    echo "  -d, --demo-only         Instalar solo la demo"
    echo "  -c, --core-only         Instalar solo el ecosistema completo"
    echo "  -a, --all               Instalar demo y ecosistema completo"
    echo "  -D, --docker            Configurar con Docker"
    echo "  -p, --path PATH         Directorio de instalación personalizado"
    echo "  -s, --skip-prereqs      Omitir verificación de prerrequisitos"
    echo "  -t, --skip-tests        Omitir tests de verificación"
    echo "  -v, --verbose           Modo verboso"
    echo "  -S, --start             Iniciar automáticamente después de instalar"
    echo "  -dev, --development     Modo desarrollo (instala dependencias dev)"
    echo ""
    echo "EJEMPLOS:"
    echo "  $0                      # Instalación interactiva"
    echo "  $0 --demo-only          # Solo la demo"
    echo "  $0 --all --docker       # Todo con Docker"
    echo "  $0 --core-only --dev    # Solo core en modo desarrollo"
    echo ""
}

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
    echo "║            AnarQ&Q Ecosystem Advanced Installer               ║"
    echo "║                                                               ║"
    echo "║           Instalador Avanzado del Ecosistema                 ║"
    echo "║                     AnarQ&Q v1.0.0                           ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

print_substep() {
    if [ "$VERBOSE" = true ]; then
        echo -e "   ${BLUE}→ $1${NC}"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE] $1${NC}"
    fi
}

# Parsear argumentos de línea de comandos
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -d|--demo-only)
                INSTALL_DEMO=true
                INSTALL_CORE=false
                shift
                ;;
            -c|--core-only)
                INSTALL_DEMO=false
                INSTALL_CORE=true
                shift
                ;;
            -a|--all)
                INSTALL_DEMO=true
                INSTALL_CORE=true
                shift
                ;;
            -D|--docker)
                INSTALL_DOCKER=true
                shift
                ;;
            -p|--path)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -s|--skip-prereqs)
                SKIP_PREREQS=true
                shift
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -S|--start)
                AUTO_START=true
                shift
                ;;
            -dev|--development)
                DEVELOPMENT_MODE=true
                shift
                ;;
            *)
                print_error "Opción desconocida: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # Configurar directorios
    DEMO_DIR="$INSTALL_DIR/demo"
    CORE_DIR="$INSTALL_DIR/core"
}

# Mostrar configuración
show_configuration() {
    print_step "Configuración de instalación:"
    echo "  📁 Directorio: $INSTALL_DIR"
    echo "  🎯 Demo: $([ "$INSTALL_DEMO" = true ] && echo "✅" || echo "❌")"
    echo "  🌐 Ecosistema completo: $([ "$INSTALL_CORE" = true ] && echo "✅" || echo "❌")"
    echo "  🐳 Docker: $([ "$INSTALL_DOCKER" = true ] && echo "✅" || echo "❌")"
    echo "  🔧 Modo desarrollo: $([ "$DEVELOPMENT_MODE" = true ] && echo "✅" || echo "❌")"
    echo "  🚀 Auto-inicio: $([ "$AUTO_START" = true ] && echo "✅" || echo "❌")"
    echo ""
}

# Verificar prerrequisitos avanzados
check_advanced_prerequisites() {
    if [ "$SKIP_PREREQS" = true ]; then
        print_warning "Omitiendo verificación de prerrequisitos"
        return 0
    fi
    
    print_step "Verificando prerrequisitos avanzados..."
    
    local errors=0
    local warnings=0
    
    # Verificaciones básicas
    for cmd in git node npm; do
        if command -v $cmd &> /dev/null; then
            log_verbose "$cmd está disponible"
        else
            print_error "$cmd no está instalado"
            ((errors++))
        fi
    done
    
    # Verificar versión de Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d'.' -f1)
        if [ "$major_version" -ge 18 ]; then
            log_verbose "Node.js $node_version es compatible"
        else
            print_error "Node.js $node_version no es compatible (requiere ≥18)"
            ((errors++))
        fi
    fi
    
    # Verificaciones opcionales
    if [ "$INSTALL_DOCKER" = true ]; then
        if command -v docker &> /dev/null; then
            log_verbose "Docker está disponible"
            if command -v docker-compose &> /dev/null; then
                log_verbose "Docker Compose está disponible"
            else
                print_warning "Docker Compose no está disponible"
                ((warnings++))
            fi
        else
            print_error "Docker no está instalado (requerido con --docker)"
            ((errors++))
        fi
    fi
    
    # Verificar espacio en disco
    local available_space=$(df "$HOME" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # 1GB en KB
        print_warning "Espacio en disco bajo (< 1GB disponible)"
        ((warnings++))
    fi
    
    # Verificar permisos de escritura
    if [ ! -w "$(dirname "$INSTALL_DIR")" ]; then
        print_error "Sin permisos de escritura en $(dirname "$INSTALL_DIR")"
        ((errors++))
    fi
    
    if [ $errors -gt 0 ]; then
        print_error "Se encontraron $errors errores críticos"
        exit 1
    fi
    
    if [ $warnings -gt 0 ]; then
        print_warning "Se encontraron $warnings advertencias"
    fi
    
    print_success "Verificación de prerrequisitos completada"
}

# Instalación con Docker
install_with_docker() {
    print_step "Configurando instalación con Docker..."
    
    cd "$DEMO_DIR"
    
    # Crear docker-compose override para desarrollo
    if [ "$DEVELOPMENT_MODE" = true ]; then
        cat > docker-compose.override.yml << 'EOF'
version: '3.8'
services:
  demo:
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
EOF
        print_success "Configuración de desarrollo con Docker creada"
    fi
    
    # Construir e iniciar servicios
    print_substep "Construyendo imágenes Docker..."
    docker-compose build
    
    if [ "$AUTO_START" = true ]; then
        print_substep "Iniciando servicios con Docker..."
        docker-compose up -d
        print_success "Servicios iniciados con Docker"
    fi
}

# Instalación de dependencias avanzada
install_advanced_dependencies() {
    print_step "Instalando dependencias avanzadas..."
    
    local npm_flags=""
    if [ "$DEVELOPMENT_MODE" = true ]; then
        npm_flags="--include=dev"
        log_verbose "Instalando dependencias de desarrollo"
    fi
    
    # Demo dependencies
    if [ "$INSTALL_DEMO" = true ] && [ -d "$DEMO_DIR" ]; then
        print_substep "Instalando dependencias de la demo..."
        cd "$DEMO_DIR"
        npm install $npm_flags
        
        # Instalar herramientas de desarrollo adicionales
        if [ "$DEVELOPMENT_MODE" = true ]; then
            npm install --save-dev nodemon concurrently
        fi
        
        print_success "Dependencias de la demo instaladas"
    fi
    
    # Core dependencies
    if [ "$INSTALL_CORE" = true ] && [ -d "$CORE_DIR" ]; then
        print_substep "Instalando dependencias del ecosistema completo..."
        cd "$CORE_DIR"
        npm install $npm_flags
        
        # Backend dependencies
        if [ -d "backend" ]; then
            print_substep "Instalando dependencias del backend..."
            cd backend
            npm install $npm_flags
            cd ..
        fi
        
        # Módulos individuales
        if [ "$DEVELOPMENT_MODE" = true ]; then
            print_substep "Instalando dependencias de módulos individuales..."
            for module_dir in modules/*/; do
                if [ -f "$module_dir/package.json" ]; then
                    log_verbose "Instalando dependencias para $(basename "$module_dir")"
                    cd "$module_dir"
                    npm install $npm_flags
                    cd - > /dev/null
                fi
            done
        fi
        
        print_success "Dependencias del ecosistema completo instaladas"
    fi
}

# Tests avanzados
run_advanced_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Omitiendo tests de verificación"
        return 0
    fi
    
    print_step "Ejecutando tests avanzados..."
    
    # Test de demo
    if [ "$INSTALL_DEMO" = true ] && [ -d "$DEMO_DIR" ]; then
        cd "$DEMO_DIR"
        
        print_substep "Verificando build de la demo..."
        if npm run build &> /dev/null; then
            print_success "Build de la demo exitoso"
        else
            print_warning "Build de la demo falló"
        fi
        
        # Test unitarios si existen
        if [ -f "package.json" ] && grep -q '"test"' package.json; then
            print_substep "Ejecutando tests unitarios de la demo..."
            if npm test &> /dev/null; then
                print_success "Tests unitarios pasaron"
            else
                print_warning "Algunos tests unitarios fallaron"
            fi
        fi
    fi
    
    # Test de ecosistema completo
    if [ "$INSTALL_CORE" = true ] && [ -d "$CORE_DIR" ]; then
        cd "$CORE_DIR"
        
        print_substep "Verificando build del ecosistema..."
        if npm run build &> /dev/null; then
            print_success "Build del ecosistema exitoso"
        else
            print_warning "Build del ecosistema falló"
        fi
    fi
}

# Crear scripts avanzados
create_advanced_shortcuts() {
    print_step "Creando scripts avanzados..."
    
    # Script de desarrollo
    if [ "$DEVELOPMENT_MODE" = true ]; then
        cat > "$INSTALL_DIR/dev-start.sh" << 'EOF'
#!/bin/bash
echo "🔧 Iniciando AnarQ&Q en modo desarrollo..."

# Función para matar procesos al salir
cleanup() {
    echo "🛑 Deteniendo servicios..."
    jobs -p | xargs -r kill
    exit 0
}
trap cleanup SIGINT SIGTERM

# Iniciar servicios en paralelo
if [ -d "core/backend" ]; then
    echo "📡 Iniciando backend en modo desarrollo..."
    cd core/backend
    npm run dev &
    cd ../..
fi

if [ -d "demo" ]; then
    echo "🎨 Iniciando demo en modo desarrollo..."
    cd demo
    npm run dev &
    cd ..
fi

if [ -d "core" ]; then
    echo "🌐 Iniciando frontend en modo desarrollo..."
    cd core
    npm run dev &
    cd ..
fi

echo "✅ Servicios iniciados. Presiona Ctrl+C para detener."
wait
EOF
        chmod +x "$INSTALL_DIR/dev-start.sh"
    fi
    
    # Script de monitoreo
    cat > "$INSTALL_DIR/monitor.sh" << 'EOF'
#!/bin/bash
echo "📊 Monitor del ecosistema AnarQ&Q"
echo "=================================="

check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $name está funcionando"
    else
        echo "❌ $name no responde"
    fi
}

echo "Verificando servicios..."
check_service "http://localhost:8080" "Frontend"
check_service "http://localhost:3001/health" "Backend"

echo ""
echo "Procesos Node.js activos:"
ps aux | grep node | grep -v grep || echo "No hay procesos Node.js activos"

echo ""
echo "Puertos en uso:"
netstat -tlnp 2>/dev/null | grep -E ':(3001|8080)' || echo "Puertos 3001 y 8080 libres"
EOF
    chmod +x "$INSTALL_DIR/monitor.sh"
    
    # Script de limpieza
    cat > "$INSTALL_DIR/cleanup.sh" << 'EOF'
#!/bin/bash
echo "🧹 Limpiando instalación AnarQ&Q..."

# Detener procesos
pkill -f "npm.*dev" || true
pkill -f "node.*server" || true

# Limpiar node_modules si se solicita
if [ "$1" = "--deep" ]; then
    echo "🗑️  Eliminando node_modules..."
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    echo "📦 Para reinstalar dependencias: npm install"
fi

# Limpiar builds
echo "🗑️  Limpiando builds..."
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ Limpieza completada"
EOF
    chmod +x "$INSTALL_DIR/cleanup.sh"
    
    print_success "Scripts avanzados creados"
}

# Auto-inicio
auto_start_services() {
    if [ "$AUTO_START" = false ]; then
        return 0
    fi
    
    print_step "Iniciando servicios automáticamente..."
    
    if [ "$INSTALL_DOCKER" = true ]; then
        cd "$DEMO_DIR"
        docker-compose up -d
        print_success "Servicios iniciados con Docker"
    else
        if [ "$DEVELOPMENT_MODE" = true ]; then
            "$INSTALL_DIR/dev-start.sh" &
        else
            "$INSTALL_DIR/start-demo.sh" &
        fi
        print_success "Servicios iniciados en background"
    fi
    
    sleep 3
    "$INSTALL_DIR/monitor.sh"
}

# Función principal
main() {
    parse_arguments "$@"
    
    print_header
    show_configuration
    
    if [ "$INSTALL_DEMO" = false ] && [ "$INSTALL_CORE" = false ]; then
        print_error "Debe seleccionar al menos una opción de instalación"
        print_usage
        exit 1
    fi
    
    # Confirmación interactiva si no hay flags
    if [ $# -eq 0 ]; then
        read -p "¿Continuar con la instalación? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Instalación cancelada"
            exit 0
        fi
    fi
    
    echo ""
    
    # Ejecutar instalación
    check_advanced_prerequisites
    
    # Crear directorio
    mkdir -p "$INSTALL_DIR"
    
    # Clonar repositorios
    if [ "$INSTALL_DEMO" = true ]; then
        git clone "$DEMO_REPO" "$DEMO_DIR"
    fi
    if [ "$INSTALL_CORE" = true ]; then
        git clone "$CORE_REPO" "$CORE_DIR"
    fi
    
    # Instalación específica
    if [ "$INSTALL_DOCKER" = true ]; then
        install_with_docker
    else
        install_advanced_dependencies
    fi
    
    # Configurar entorno
    for dir in "$DEMO_DIR" "$CORE_DIR"; do
        if [ -d "$dir" ]; then
            cd "$dir"
            [ -f ".env.example" ] && [ ! -f ".env" ] && cp .env.example .env
        fi
    done
    
    # Tests y scripts
    run_advanced_tests
    create_advanced_shortcuts
    
    # Auto-inicio
    auto_start_services
    
    echo ""
    print_success "🎉 ¡Instalación avanzada completada!"
    print_info "📁 Ubicación: $INSTALL_DIR"
    print_info "🔧 Scripts disponibles: start-demo.sh, monitor.sh, cleanup.sh"
    if [ "$DEVELOPMENT_MODE" = true ]; then
        print_info "👨‍💻 Modo desarrollo: dev-start.sh"
    fi
}

# Manejo de errores
trap 'print_error "Error durante la instalación"; exit 1' ERR

# Ejecutar
main "$@"
#!/bin/bash

# Script para configurar distribución pública de instaladores
# usando el repositorio core como punto de distribución

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

print_info "Configurando distribución pública de instaladores..."

# Crear instalador público que descarga desde el repositorio core
cat > "install-anarqq-public.sh" << 'EOF'
#!/bin/bash

# AnarQ&Q Ecosystem Demo - Instalador Público
# Descarga e instala la demo desde repositorios públicos
# Version: 1.0.0

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║               🚀 AnarQ&Q Ecosystem Demo                       ║"
    echo "║                                                               ║"
    echo "║                 Instalador Público v1.0.0                    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_step() { echo -e "${CYAN}🔄 $1${NC}"; }

# URLs públicas
CORE_REPO_URL="https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main"
INSTALLERS_PACKAGE_URL="https://github.com/AnarQorp/anarqq-ecosystem-core/raw/main/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz"

main() {
    print_banner
    
    print_info "Descargando instaladores del AnarQ&Q Ecosystem Demo..."
    print_info "Fuente: Repositorio público AnarQorp/anarqq-ecosystem-core"
    echo ""
    
    # Crear directorio temporal
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    print_step "Descargando paquete de instaladores..."
    
    # Intentar descargar el paquete completo
    if curl -L -f -o "installers.tar.gz" "$INSTALLERS_PACKAGE_URL" 2>/dev/null; then
        print_success "Paquete descargado exitosamente"
        
        print_step "Extrayendo instaladores..."
        tar -xzf "installers.tar.gz"
        
        # Buscar el directorio extraído
        INSTALLER_DIR=$(find . -name "anarqq-ecosystem-demo-v*" -type d | head -1)
        
        if [ -n "$INSTALLER_DIR" ] && [ -d "$INSTALLER_DIR" ]; then
            cd "$INSTALLER_DIR"
            print_success "Instaladores extraídos correctamente"
            
            # Ejecutar el instalador maestro
            if [ -f "install-anarqq.sh" ]; then
                print_step "Ejecutando instalador maestro..."
                chmod +x install-anarqq.sh
                ./install-anarqq.sh
            else
                print_error "Instalador maestro no encontrado"
                exit 1
            fi
        else
            print_error "No se pudo extraer el paquete correctamente"
            exit 1
        fi
    else
        # Fallback: descargar instaladores individuales
        print_warning "Paquete completo no disponible, descargando instaladores individuales..."
        
        # Descargar instalador maestro
        if curl -f -o "install-anarqq.sh" "$CORE_REPO_URL/install-anarqq.sh" 2>/dev/null; then
            print_success "Instalador maestro descargado"
            chmod +x install-anarqq.sh
            ./install-anarqq.sh
        else
            print_error "No se pudieron descargar los instaladores"
            print_info "Por favor contacta a: anarqorp@proton.me"
            exit 1
        fi
    fi
    
    # Limpiar archivos temporales
    cd /
    rm -rf "$TEMP_DIR"
    
    print_success "🎉 ¡Instalación completada!"
}

# Ejecutar función principal
main "$@"
EOF

chmod +x install-anarqq-public.sh
print_success "Instalador público creado: install-anarqq-public.sh"

# Crear README para distribución pública
cat > "PUBLIC_DISTRIBUTION.md" << 'EOF'
# 🚀 AnarQ&Q Ecosystem Demo - Distribución Pública

## 📦 Instalación Pública (Repositorio Privado)

Aunque el repositorio principal de la demo es privado, los instaladores están disponibles públicamente a través del repositorio core.

### 🎯 Instalación Rápida

#### Opción 1: Instalador Público Directo
```bash
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-public.sh | bash
```

#### Opción 2: Descarga Manual
```bash
# Descargar instalador público
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-public.sh
chmod +x install-anarqq-public.sh
./install-anarqq-public.sh
```

#### Opción 3: Paquete Completo
```bash
# Descargar paquete completo desde repositorio core
curl -L -O https://github.com/AnarQorp/anarqq-ecosystem-core/raw/main/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz

# Extraer y ejecutar
tar -xzf anarqq-ecosystem-demo-installers-v1.0.0.tar.gz
cd anarqq-ecosystem-demo-v1.0.0
./install-anarqq.sh
```

### 🔗 Enlaces Públicos

- **Instalador Público**: https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-public.sh
- **Paquete TAR.GZ**: https://github.com/AnarQorp/anarqq-ecosystem-core/raw/main/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz
- **Paquete ZIP**: https://github.com/AnarQorp/anarqq-ecosystem-core/raw/main/anarqq-ecosystem-demo-installers-v1.0.0.zip
- **Documentación**: https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/README-INSTALLERS.md

### 🛡️ Arquitectura de Distribución

```
┌─────────────────────────────────────────────────────────────┐
│                    DISTRIBUCIÓN PÚBLICA                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔒 Repositorio Privado (anarqq-ecosystem-demo)            │
│  ├── Código fuente de la demo                              │
│  ├── Configuraciones privadas                              │
│  └── Desarrollo interno                                     │
│                                                             │
│  🌐 Repositorio Público (anarqq-ecosystem-core)            │
│  ├── install-anarqq-public.sh (instalador público)        │
│  ├── Paquetes de instaladores (tar.gz, zip)               │
│  ├── Documentación pública                                 │
│  └── Enlaces de descarga                                   │
│                                                             │
│  👥 Usuarios Finales                                       │
│  └── Acceso público a instaladores sin autenticación      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 📋 Ventajas de esta Configuración

1. **✅ Privacidad**: Código fuente permanece privado
2. **✅ Accesibilidad**: Instaladores públicamente accesibles
3. **✅ Sin Autenticación**: Los usuarios no necesitan tokens
4. **✅ Distribución Centralizada**: Un solo punto de descarga
5. **✅ Versionado**: Control de versiones de instaladores
6. **✅ Documentación**: Guías públicas disponibles

### 🔄 Flujo de Actualización

1. **Desarrollo**: Actualizar instaladores en repositorio privado
2. **Empaquetado**: Generar paquetes con `create-release.sh`
3. **Distribución**: Subir paquetes al repositorio core público
4. **Publicación**: Actualizar enlaces y documentación

### 📞 Soporte

- **📧 Email**: anarqorp@proton.me
- **🐛 Issues Públicos**: https://github.com/AnarQorp/anarqq-ecosystem-core/issues
- **📖 Documentación**: Disponible en repositorio core

### 🎯 Para Usuarios

Los usuarios pueden instalar la demo sin conocer la existencia del repositorio privado:

```bash
# Un solo comando - instalación completa
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-public.sh | bash
```

---

**Esta configuración permite mantener el código privado mientras facilita la distribución pública de instaladores.**
EOF

print_success "Documentación de distribución pública creada"

# Actualizar el repositorio core con el instalador público
print_step "Actualizando repositorio core con instalador público..."

git add install-anarqq-public.sh PUBLIC_DISTRIBUTION.md
git commit -m "feat: add public installer for private demo repository

- Add install-anarqq-public.sh for public distribution
- Enable installation from public repository core
- Maintain demo repository privacy while allowing public access
- Add comprehensive public distribution documentation

Features:
✅ Public installer without authentication
✅ Downloads from public core repository
✅ Fallback mechanisms for reliability
✅ Maintains private repository security
✅ Single command installation for users

Usage:
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-public.sh | bash

Refs: #public-distribution"

git push origin main

print_success "🎉 Distribución pública configurada exitosamente!"
echo ""
print_info "📍 Repositorio Core (público): https://github.com/AnarQorp/anarqq-ecosystem-core"
print_info "📍 Repositorio Demo (privado): https://github.com/AnarQorp/anarqq-ecosystem-demo"
echo ""
print_info "🚀 Los usuarios pueden instalar con:"
echo "curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-public.sh | bash"
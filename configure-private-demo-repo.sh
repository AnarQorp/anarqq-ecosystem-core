#!/bin/bash

# Script para configurar el repositorio privado de la demo
# con distribución de instaladores mediante releases públicos

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

# Configuración
ORG_NAME="AnarQorp"
REPO_NAME="anarqq-ecosystem-demo"

if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GITHUB_TOKEN no configurado"
    exit 1
fi

print_info "Configurando repositorio privado de la demo con distribución pública de instaladores..."

# Mantener el repositorio como privado pero configurar releases públicos
print_info "Verificando configuración del repositorio privado..."
response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME")

if echo "$response" | grep -q '"private": true'; then
    print_success "Repositorio confirmado como privado"
else
    print_warning "El repositorio no está configurado como privado"
fi

# Actualizar descripción y topics (manteniendo privacidad)
print_info "Actualizando metadatos del repositorio..."
topics_data='{
    "description": "AnarQ&Q Ecosystem Demo - Private repository with comprehensive demonstration of the AnarQ&Q decentralized ecosystem and QNET Phase 2 integration.",
    "topics": ["anarqq", "ecosystem", "demo", "decentralized", "qnet", "private"]
}'

response=$(curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$topics_data" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME")

if echo "$response" | grep -q '"topics"'; then
    print_success "Metadatos actualizados"
fi

# Crear release público con los instaladores
print_info "Creando GitHub Release público v1.0.0..."

# Crear el release con archivos adjuntos
release_data='{
    "tag_name": "v1.0.0",
    "target_commitish": "main",
    "name": "AnarQ&Q Ecosystem Demo v1.0.0 - Installers",
    "body": "# 🚀 AnarQ&Q Ecosystem Demo v1.0.0\n\n## Instaladores Automáticos\n\nEsta release contiene instaladores automáticos para todas las plataformas del AnarQ&Q Ecosystem Demo.\n\n### 📦 Instaladores Incluidos\n\n- **Paquete Completo**: `anarqq-ecosystem-demo-installers-v1.0.0.tar.gz`\n- **Paquete ZIP**: `anarqq-ecosystem-demo-installers-v1.0.0.zip`\n\n### 🎯 Instalación Rápida\n\n```bash\n# Descargar paquete completo\nwget https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz\n\n# Extraer\ntar -xzf anarqq-ecosystem-demo-installers-v1.0.0.tar.gz\n\n# Ejecutar instalador\ncd anarqq-ecosystem-demo-v1.0.0\n./install-anarqq.sh\n```\n\n### 📋 Contenido del Paquete\n\n- `install-anarqq.sh` - Instalador maestro con detección automática\n- `install-anarqq-demo.sh` - Instalador Bash (Linux/macOS)\n- `install-anarqq-demo.py` - Instalador Python GUI (Multiplataforma)\n- `install-anarqq-demo.ps1` - Instalador PowerShell (Windows)\n- `verify-installation.sh` - Verificación post-instalación\n- `README.md` - Guía de inicio rápido\n- `README-INSTALLERS.md` - Documentación completa\n\n### 🔧 Requisitos\n\n- Node.js v18.0.0+\n- npm (incluido con Node.js)\n- Git (recomendado)\n- 5GB espacio libre\n- 2GB RAM\n\n### 📞 Soporte\n\n- **Email**: anarqorp@proton.me\n- **Issues**: Contactar por email para acceso al repositorio\n\n---\n\n**Nota**: Este es un repositorio privado. Los instaladores están disponibles públicamente a través de releases, pero el código fuente requiere acceso autorizado.",
    "draft": false,
    "prerelease": false
}'

response=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$release_data" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/releases")

if echo "$response" | grep -q '"html_url"'; then
    release_url=$(echo "$response" | grep '"html_url"' | cut -d'"' -f4)
    release_id=$(echo "$response" | grep '"id"' | head -1 | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
    print_success "GitHub Release creado: $release_url"
    
    # Subir archivos al release
    print_info "Subiendo archivos al release..."
    
    # Subir archivo TAR.GZ
    if [ -f "anarqq-ecosystem-demo-installers-v1.0.0.tar.gz" ]; then
        print_info "Subiendo archivo TAR.GZ..."
        curl -s -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Content-Type: application/gzip" \
            --data-binary @"anarqq-ecosystem-demo-installers-v1.0.0.tar.gz" \
            "https://uploads.github.com/repos/$ORG_NAME/$REPO_NAME/releases/$release_id/assets?name=anarqq-ecosystem-demo-installers-v1.0.0.tar.gz" > /dev/null
        print_success "Archivo TAR.GZ subido al release"
    fi
    
    # Subir archivo ZIP
    if [ -f "anarqq-ecosystem-demo-installers-v1.0.0.zip" ]; then
        print_info "Subiendo archivo ZIP..."
        curl -s -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Content-Type: application/zip" \
            --data-binary @"anarqq-ecosystem-demo-installers-v1.0.0.zip" \
            "https://uploads.github.com/repos/$ORG_NAME/$REPO_NAME/releases/$release_id/assets?name=anarqq-ecosystem-demo-installers-v1.0.0.zip" > /dev/null
        print_success "Archivo ZIP subido al release"
    fi
    
else
    print_error "No se pudo crear el release"
    echo "Respuesta: $response"
    exit 1
fi

# Crear instrucciones de distribución
print_info "Creando instrucciones de distribución..."

cat > "DISTRIBUTION_INSTRUCTIONS.md" << 'EOF'
# 📦 AnarQ&Q Ecosystem Demo - Instrucciones de Distribución

## 🔒 Repositorio Privado con Distribución Pública

Este repositorio es **privado** pero los instaladores están disponibles públicamente a través de **GitHub Releases**.

### 🎯 Para Usuarios Finales

#### Opción 1: Descarga Directa desde Release
```bash
# Descargar paquete completo
wget https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz

# Extraer
tar -xzf anarqq-ecosystem-demo-installers-v1.0.0.tar.gz

# Ejecutar instalador
cd anarqq-ecosystem-demo-v1.0.0
./install-anarqq.sh
```

#### Opción 2: Descarga con curl
```bash
# Descargar y extraer en un comando
curl -L https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz | tar -xz

# Ejecutar instalador
cd anarqq-ecosystem-demo-v1.0.0
./install-anarqq.sh
```

### 🔗 Enlaces Públicos

- **Release Page**: https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/tag/v1.0.0
- **TAR.GZ**: https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz
- **ZIP**: https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.zip

### 📋 Contenido del Paquete

```
anarqq-ecosystem-demo-v1.0.0/
├── install-anarqq.sh              # Instalador maestro
├── install-anarqq-demo.sh         # Bash (Linux/macOS)
├── install-anarqq-demo.py         # Python GUI
├── install-anarqq-demo.ps1        # PowerShell (Windows)
├── verify-installation.sh         # Verificación
├── README.md                      # Guía rápida
├── README-INSTALLERS.md           # Documentación completa
└── SHA256SUMS                     # Checksums
```

### 🛡️ Ventajas de esta Configuración

1. **Privacidad del Código**: El código fuente permanece privado
2. **Distribución Pública**: Los instaladores son accesibles públicamente
3. **Seguridad**: Control de acceso al repositorio principal
4. **Facilidad de Uso**: Los usuarios pueden descargar sin autenticación
5. **Versionado**: Releases organizados por versiones

### 📞 Soporte

- **Email**: anarqorp@proton.me
- **Acceso al Repositorio**: Contactar para solicitar acceso
- **Issues Públicos**: Disponibles en el release page

### 🔄 Actualización de Releases

Para crear nuevas releases:

1. Actualizar instaladores en el repositorio privado
2. Ejecutar `./create-release.sh` para generar paquetes
3. Crear nuevo release en GitHub con los archivos generados
4. Actualizar enlaces de distribución

---

**Nota**: Esta configuración permite mantener el código privado mientras facilita la distribución pública de instaladores.
EOF

print_success "Instrucciones de distribución creadas"

print_success "🎉 Configuración del repositorio privado completada!"
echo ""
print_info "📍 Repositorio (privado): https://github.com/$ORG_NAME/$REPO_NAME"
print_info "📦 Release público: https://github.com/$ORG_NAME/$REPO_NAME/releases/tag/v1.0.0"
echo ""
print_info "🚀 Los usuarios pueden instalar con:"
echo "wget https://github.com/$ORG_NAME/$REPO_NAME/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz"
echo "tar -xzf anarqq-ecosystem-demo-installers-v1.0.0.tar.gz"
echo "cd anarqq-ecosystem-demo-v1.0.0 && ./install-anarqq.sh"
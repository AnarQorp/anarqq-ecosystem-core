#!/bin/bash

# Script para configurar el repositorio de la demo como público
# y optimizar para distribución

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

print_info "Configurando repositorio de la demo para distribución pública..."

# Hacer el repositorio público
print_info "Configurando repositorio como público..."
response=$(curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"private": false}' \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME")

if echo "$response" | grep -q '"private": false'; then
    print_success "Repositorio configurado como público"
else
    print_warning "No se pudo hacer público el repositorio (puede requerir permisos de admin)"
    echo "Respuesta: $response"
fi

# Configurar descripción y topics
print_info "Actualizando descripción y topics..."
topics_data='{
    "description": "AnarQ&Q Ecosystem Demo - Comprehensive demonstration of the AnarQ&Q decentralized ecosystem with QNET Phase 2 integration. Includes automated installers for all platforms.",
    "homepage": "https://github.com/AnarQorp/anarqq-ecosystem-demo",
    "topics": ["anarqq", "ecosystem", "demo", "decentralized", "qnet", "blockchain", "p2p", "installer", "automation", "cross-platform"]
}'

response=$(curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$topics_data" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME")

if echo "$response" | grep -q '"topics"'; then
    print_success "Descripción y topics actualizados"
else
    print_warning "No se pudieron actualizar los topics"
fi

# Habilitar GitHub Pages (si es posible)
print_info "Configurando GitHub Pages..."
pages_data='{
    "source": {
        "branch": "main",
        "path": "/"
    }
}'

response=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$pages_data" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/pages")

if echo "$response" | grep -q '"html_url"'; then
    pages_url=$(echo "$response" | grep '"html_url"' | cut -d'"' -f4)
    print_success "GitHub Pages configurado: $pages_url"
else
    print_info "GitHub Pages no configurado (puede no estar disponible)"
fi

# Crear release con los instaladores
print_info "Creando GitHub Release v1.0.0..."

# Primero crear el tag
tag_data='{
    "tag": "v1.0.0",
    "message": "AnarQ&Q Ecosystem Demo v1.0.0 - Complete installer suite",
    "object": "'$(git rev-parse HEAD)'",
    "type": "commit"
}'

curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$tag_data" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/git/tags" > /dev/null

# Crear el release
release_data='{
    "tag_name": "v1.0.0",
    "target_commitish": "main",
    "name": "AnarQ&Q Ecosystem Demo v1.0.0",
    "body": "# AnarQ&Q Ecosystem Demo v1.0.0\n\n## 🚀 Complete Installer Suite\n\nThis release includes comprehensive installers for all platforms:\n\n### 📦 Installers\n- **install-anarqq.sh** - Master installer with auto-detection\n- **install-anarqq-demo.sh** - Bash installer (Linux/macOS)\n- **install-anarqq-demo.py** - Python GUI installer (Cross-platform)\n- **install-anarqq-demo.ps1** - PowerShell installer (Windows)\n- **verify-installation.sh** - Post-installation verification\n\n### 🎯 Quick Install\n```bash\ncurl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq.sh | bash\n```\n\n### 📚 Documentation\n- Complete installation guides\n- Troubleshooting documentation\n- Multi-platform support\n\n### ✨ Features\n- ✅ Automatic system detection\n- ✅ Dependency installation\n- ✅ Cross-platform compatibility\n- ✅ GUI and console modes\n- ✅ Post-installation verification\n\nFor detailed documentation, see [README-INSTALLERS.md](README-INSTALLERS.md)",
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
    print_success "GitHub Release creado: $release_url"
else
    print_warning "No se pudo crear el release"
    echo "Respuesta: $response"
fi

# Verificar acceso público a los instaladores
print_info "Verificando acceso público a instaladores..."
sleep 5  # Esperar a que se propague el cambio

if curl -s -f "https://raw.githubusercontent.com/$ORG_NAME/$REPO_NAME/main/install-anarqq.sh" > /dev/null; then
    print_success "✅ Instaladores accesibles públicamente"
    echo ""
    print_info "🚀 Comando de instalación público:"
    echo "curl -fsSL https://raw.githubusercontent.com/$ORG_NAME/$REPO_NAME/main/install-anarqq.sh | bash"
else
    print_warning "Los instaladores aún no son accesibles públicamente"
    print_info "Puede tomar unos minutos en propagarse"
fi

print_success "🎉 Configuración del repositorio de la demo completada!"
print_info "📍 Repositorio: https://github.com/$ORG_NAME/$REPO_NAME"
#!/bin/bash

# Script para subir instaladores al repositorio de la demo
# Uso: ./upload-to-demo-repo.sh

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
BRANCH="main"

if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GITHUB_TOKEN no configurado"
    exit 1
fi

print_info "Subiendo instaladores al repositorio de la demo..."

# Función para subir archivo a GitHub
upload_file() {
    local file_path="$1"
    local github_path="$2"
    local commit_message="$3"
    
    if [ ! -f "$file_path" ]; then
        print_warning "Archivo no encontrado: $file_path"
        return 1
    fi
    
    print_info "Subiendo: $github_path"
    
    # Codificar archivo en base64
    local content=$(base64 -w 0 "$file_path")
    
    # Verificar si el archivo ya existe
    local existing_sha=""
    local existing_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/contents/$github_path")
    
    if echo "$existing_response" | grep -q '"sha"'; then
        existing_sha=$(echo "$existing_response" | grep '"sha"' | cut -d'"' -f4)
        print_info "Archivo existe, actualizando..."
    fi
    
    # Crear JSON para la API
    local json_data='{
        "message": "'$commit_message'",
        "content": "'$content'",
        "branch": "'$BRANCH'"'
    
    if [ -n "$existing_sha" ]; then
        json_data+=', "sha": "'$existing_sha'"'
    fi
    
    json_data+='}'
    
    # Subir archivo
    local response=$(curl -s -X PUT \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$json_data" \
        "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/contents/$github_path")
    
    if echo "$response" | grep -q '"sha"'; then
        print_success "✅ Subido: $github_path"
        return 0
    else
        print_error "Error subiendo $github_path"
        echo "Respuesta: $response"
        return 1
    fi
}

# Lista de archivos a subir
declare -A files_to_upload=(
    ["install-anarqq.sh"]="install-anarqq.sh"
    ["install-anarqq-demo.sh"]="install-anarqq-demo.sh"
    ["install-anarqq-demo.py"]="install-anarqq-demo.py"
    ["install-anarqq-demo.ps1"]="install-anarqq-demo.ps1"
    ["verify-installation.sh"]="verify-installation.sh"
    ["create-release.sh"]="create-release.sh"
    ["README-INSTALLERS.md"]="README-INSTALLERS.md"
    ["RELEASE_NOTES_v1.0.0.md"]="RELEASE_NOTES_v1.0.0.md"
    ["anarqq-ecosystem-demo-installers-v1.0.0.tar.gz"]="releases/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz"
    ["anarqq-ecosystem-demo-installers-v1.0.0.zip"]="releases/anarqq-ecosystem-demo-installers-v1.0.0.zip"
)

# Subir archivos
for local_file in "${!files_to_upload[@]}"; do
    github_path="${files_to_upload[$local_file]}"
    upload_file "$local_file" "$github_path" "feat: add installer - $local_file"
done

# Crear README principal para el repositorio de la demo
print_info "Creando README principal..."

cat > /tmp/demo_readme.md << 'EOF'
# 🚀 AnarQ&Q Ecosystem Demo

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/AnarQorp/anarqq-ecosystem-demo)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

Una demostración completa del **ecosistema descentralizado AnarQ&Q** con integración **QNET Phase 2**. Este repositorio contiene la aplicación demo interactiva y los instaladores automáticos para facilitar el despliegue en cualquier plataforma.

## 🎯 Instalación Rápida (Un Solo Comando)

### Instalación Automática (Recomendado)
```bash
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq.sh | bash
```

### Instalación Manual
```bash
# Descargar instalador
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq.sh
chmod +x install-anarqq.sh
./install-anarqq.sh
```

## 📦 Instaladores Disponibles

| Instalador | Plataforma | Descripción |
|------------|------------|-------------|
| **`install-anarqq.sh`** | 🎯 **Maestro** | Detección automática de sistema |
| **`install-anarqq-demo.sh`** | 🐧 Linux/macOS | Instalador Bash completo |
| **`install-anarqq-demo.py`** | 🌐 Multiplataforma | Interfaz gráfica con Python |
| **`install-anarqq-demo.ps1`** | 🪟 Windows | PowerShell avanzado |

## 🔧 Requisitos Mínimos

- **Node.js**: v18.0.0 o superior
- **npm**: Incluido con Node.js
- **Git**: Recomendado (opcional)
- **Espacio**: 5GB libres
- **RAM**: 2GB disponibles

## 🚀 Inicio Rápido

### 1. Instalar
```bash
./install-anarqq.sh
```

### 2. Iniciar Demo
```bash
# Linux/macOS
~/anarqq-ecosystem/start-demo.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\start-demo.bat
```

### 3. Verificar Instalación
```bash
./verify-installation.sh
```

## 🌟 Características del Ecosistema

### 🔐 Componentes Principales
- **🛡️ QConsent**: Sistema de consentimiento descentralizado
- **🏪 QMarket**: Marketplace de datos seguro  
- **🌐 QNet Phase 2**: Red descentralizada avanzada
- **🔑 Identity Management**: Gestión de identidad descentralizada

### 🎮 Funcionalidades Demo
- **📊 Dashboard Interactivo**: Visualización en tiempo real
- **💰 Transacciones P2P**: Procesamiento seguro de transacciones
- **🔗 APIs RESTful**: Integración completa con servicios
- **🔒 Seguridad Avanzada**: Encriptación y autenticación

## 📞 Soporte

- **📧 Email**: anarqorp@proton.me
- **🐛 Issues**: [GitHub Issues](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)
- **📖 Documentación**: [README-INSTALLERS.md](README-INSTALLERS.md)

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License**.

---

## 🚀 ¡Comienza Ahora!

```bash
# Un solo comando para empezar
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq.sh | bash
```

**¡Explora el futuro de los ecosistemas descentralizados con AnarQ&Q!** 🌟
EOF

upload_file "/tmp/demo_readme.md" "README.md" "feat: add comprehensive README for demo repository"

print_success "🎉 ¡Todos los instaladores subidos al repositorio de la demo!"
print_info "📍 Repositorio: https://github.com/$ORG_NAME/$REPO_NAME"
print_info "🚀 Los usuarios ya pueden instalar con:"
echo "curl -fsSL https://raw.githubusercontent.com/$ORG_NAME/$REPO_NAME/main/install-anarqq.sh | bash"
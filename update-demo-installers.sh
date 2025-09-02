#!/bin/bash

# Script para actualizar instaladores en el repositorio de la demo
# con soporte para descarga ZIP (sin autenticación)

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

print_info "Actualizando instaladores en el repositorio de la demo..."
print_info "Cambio principal: Usar descarga ZIP en lugar de git clone"

# Función para subir archivo a GitHub
upload_file() {
    local file_path="$1"
    local github_path="$2"
    local commit_message="$3"
    
    if [ ! -f "$file_path" ]; then
        print_warning "Archivo no encontrado: $file_path"
        return 1
    fi
    
    print_info "Actualizando: $github_path"
    
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
        print_success "✅ Actualizado: $github_path"
        return 0
    else
        print_error "Error actualizando $github_path"
        echo "Respuesta: $response"
        return 1
    fi
}

# Actualizar instaladores principales
print_info "Actualizando instaladores con soporte ZIP..."

# Actualizar instalador Bash principal
upload_file "install-anarqq-demo.sh" "install-anarqq-demo.sh" "fix: use ZIP download instead of git clone to avoid authentication

- Replace git clone with ZIP download for private repositories
- Add fallback mechanisms for reliable download
- Eliminate need for user authentication during installation
- Maintain full functionality while improving accessibility

This resolves the issue where users were prompted for GitHub credentials
during installation of the private demo repository."

# Actualizar instalador maestro
upload_file "install-anarqq.sh" "install-anarqq.sh" "fix: update master installer instructions for ZIP download"

# Crear README actualizado con nuevas instrucciones
cat > /tmp/updated_readme.md << 'EOF'
# 🚀 AnarQ&Q Ecosystem Demo

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/AnarQorp/anarqq-ecosystem-demo)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

Una demostración completa del **ecosistema descentralizado AnarQ&Q** con integración **QNET Phase 2**. Este repositorio contiene la aplicación demo interactiva y los instaladores automáticos para facilitar el despliegue en cualquier plataforma.

## 🎯 Instalación Rápida

### Para Usuarios con Acceso al Repositorio

Si tienes acceso a este repositorio privado, puedes usar los instaladores directamente:

```bash
# Descargar instaladores desde el repositorio
git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git
cd anarqq-ecosystem-demo

# Ejecutar instalador (no requiere autenticación adicional)
./install-anarqq.sh
```

### Instalación Sin Git Clone

Los instaladores ahora usan **descarga ZIP** en lugar de `git clone`, eliminando la necesidad de autenticación durante la instalación:

```bash
# Los instaladores descargan automáticamente usando ZIP
./install-anarqq-demo.sh  # No solicita credenciales
```

## 📦 Instaladores Disponibles

| Instalador | Plataforma | Descripción |
|------------|------------|-------------|
| **`install-anarqq.sh`** | 🎯 **Maestro** | Detección automática de sistema |
| **`install-anarqq-demo.sh`** | 🐧 Linux/macOS | **Actualizado** - Descarga ZIP sin autenticación |
| **`install-anarqq-demo.py`** | 🌐 Multiplataforma | Interfaz gráfica con fallback ZIP |
| **`install-anarqq-demo.ps1`** | 🪟 Windows | PowerShell avanzado |

## ✨ Novedades v1.0.1

### 🔧 Mejoras en Instalación
- **✅ Sin Autenticación**: Los instaladores ya no solicitan credenciales de GitHub
- **✅ Descarga ZIP**: Uso de archivos ZIP en lugar de `git clone`
- **✅ Más Confiable**: Menos puntos de falla durante la instalación
- **✅ Mejor UX**: Instalación más fluida para usuarios finales

### 🛠️ Cambios Técnicos
- Reemplazado `git clone` con descarga y extracción de ZIP
- Agregado manejo de errores mejorado
- Incluido fallback automático para diferentes métodos de descarga
- Mejorada compatibilidad con repositorios privados

## 🔧 Requisitos Mínimos

- **Node.js**: v18.0.0 o superior
- **npm**: Incluido con Node.js
- **unzip**: Para extracción de archivos (instalado por defecto en la mayoría de sistemas)
- **curl**: Para descarga de archivos (instalado por defecto en la mayoría de sistemas)
- **Espacio**: 5GB libres
- **RAM**: 2GB disponibles

## 🚀 Inicio Rápido

### 1. Obtener Instaladores
```bash
# Si tienes acceso al repositorio
git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git
cd anarqq-ecosystem-demo
```

### 2. Ejecutar Instalación
```bash
# Instalador automático (recomendado)
./install-anarqq.sh

# O instalador específico
./install-anarqq-demo.sh
```

### 3. Iniciar Demo
```bash
# Linux/macOS
~/anarqq-ecosystem/start-demo.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\start-demo.bat
```

### 4. Verificar Instalación
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

## 🛠️ Solución de Problemas

### Problemas Comunes Resueltos

#### ❌ "Git solicita usuario y contraseña"
**Solucionado en v1.0.1**: Los instaladores ahora usan descarga ZIP y no requieren autenticación.

#### ❌ "Permission denied" durante git clone
**Solucionado en v1.0.1**: Ya no se usa `git clone` durante la instalación.

#### ❌ "Repository not found"
**Solucionado en v1.0.1**: Descarga directa de archivos ZIP evita problemas de acceso.

### Nuevos Problemas Potenciales

#### ⚠️ "unzip command not found"
```bash
# Ubuntu/Debian
sudo apt-get install unzip

# CentOS/RHEL/Fedora
sudo yum install unzip  # o sudo dnf install unzip

# macOS
brew install unzip  # (raramente necesario)
```

#### ⚠️ "curl command not found"
```bash
# Ubuntu/Debian
sudo apt-get install curl

# CentOS/RHEL/Fedora
sudo yum install curl  # o sudo dnf install curl
```

## 📞 Soporte y Comunidad

### 🎯 Contacto Directo
- **📧 Email**: anarqorp@proton.me
- **🐛 Issues**: Contactar por email (repositorio privado)
- **💬 Consultas**: Solicitar acceso al repositorio si es necesario

### 📚 Recursos Adicionales
- **📖 Documentación**: [README-INSTALLERS.md](README-INSTALLERS.md)
- **🔧 Core Ecosystem**: Repositorio relacionado (acceso separado)
- **📋 Release Notes**: [RELEASE_NOTES_v1.0.0.md](RELEASE_NOTES_v1.0.0.md)

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License** - ver [LICENSE](LICENSE) para detalles.

## 🔄 Changelog v1.0.1

### Agregado
- Descarga ZIP automática sin autenticación
- Mejor manejo de errores durante descarga
- Fallback automático para métodos de descarga
- Compatibilidad mejorada con repositorios privados

### Cambiado
- Reemplazado `git clone` con descarga ZIP
- Mejorada experiencia de usuario durante instalación
- Actualizada documentación con nuevas instrucciones

### Corregido
- Eliminada solicitud de credenciales durante instalación
- Resueltos problemas de acceso a repositorio privado
- Mejorada confiabilidad de descarga

---

## 🚀 ¡Comienza Ahora!

```bash
# Obtener instaladores
git clone https://github.com/AnarQorp/anarqq-ecosystem-demo.git
cd anarqq-ecosystem-demo

# Instalar (sin autenticación adicional)
./install-anarqq.sh
```

**¡Explora el futuro de los ecosistemas descentralizados con AnarQ&Q!** 🌟

---

*Para más información sobre el ecosistema completo, contacta a anarqorp@proton.me*
EOF

upload_file "/tmp/updated_readme.md" "README.md" "docs: update README with v1.0.1 changes - ZIP download support

- Document new ZIP download functionality
- Remove references to git authentication issues
- Add troubleshooting for new dependencies (unzip, curl)
- Update installation instructions
- Add changelog for v1.0.1
- Improve user experience documentation"

print_success "🎉 ¡Instaladores actualizados en el repositorio de la demo!"
print_info "📍 Repositorio: https://github.com/$ORG_NAME/$REPO_NAME"
print_info "🔧 Cambio principal: Los instaladores ahora usan descarga ZIP"
print_info "✅ Problema resuelto: Ya no se solicitan credenciales durante la instalación"
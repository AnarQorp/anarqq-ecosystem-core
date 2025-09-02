#!/bin/bash

# Script simple para actualizar el instalador principal en el repositorio de la demo

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

ORG_NAME="AnarQorp"
REPO_NAME="anarqq-ecosystem-demo"

if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GITHUB_TOKEN no configurado"
    exit 1
fi

print_info "Actualizando instalador principal en el repositorio de la demo..."

# Obtener SHA del archivo actual
print_info "Obteniendo información del archivo actual..."
response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/contents/install-anarqq-demo.sh")

if echo "$response" | grep -q '"sha"'; then
    sha=$(echo "$response" | grep '"sha"' | cut -d'"' -f4)
    print_info "SHA actual: $sha"
else
    print_error "No se pudo obtener información del archivo"
    exit 1
fi

# Codificar archivo en base64
print_info "Codificando archivo..."
content=$(base64 -w 0 install-anarqq-demo.sh)

# Crear archivo JSON temporal
cat > /tmp/update_payload.json << EOF
{
    "message": "fix: use ZIP download instead of git clone - resolves authentication issues",
    "content": "$content",
    "sha": "$sha",
    "branch": "main"
}
EOF

# Subir archivo
print_info "Subiendo archivo actualizado..."
response=$(curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d @/tmp/update_payload.json \
    "https://api.github.com/repos/$ORG_NAME/$REPO_NAME/contents/install-anarqq-demo.sh")

if echo "$response" | grep -q '"sha"'; then
    print_success "✅ Instalador actualizado exitosamente"
    new_sha=$(echo "$response" | grep '"sha"' | cut -d'"' -f4)
    print_info "Nuevo SHA: $new_sha"
else
    print_error "Error actualizando el instalador"
    echo "Respuesta: $response"
    exit 1
fi

# Limpiar archivo temporal
rm -f /tmp/update_payload.json

print_success "🎉 ¡Instalador actualizado en el repositorio de la demo!"
print_info "📍 Repositorio: https://github.com/$ORG_NAME/$REPO_NAME"
print_info "🔧 Cambio: Ahora usa descarga ZIP en lugar de git clone"
print_info "✅ Problema resuelto: Ya no solicita credenciales durante la instalación"
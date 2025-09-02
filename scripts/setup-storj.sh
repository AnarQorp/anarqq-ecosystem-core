#!/bin/bash

# Setup script for Storj file storage integration
# This script helps configure the necessary services and dependencies

echo "🚀 Configurando Storj File Storage para Qsocial..."

# Check if required commands exist
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 no está instalado. Por favor instálalo primero."
        return 1
    fi
    echo "✅ $1 encontrado"
    return 0
}

# Check Node.js and npm
echo "📋 Verificando dependencias..."
check_command node || exit 1
check_command npm || exit 1

# Install backend dependencies
echo "📦 Instalando dependencias del backend..."
cd backend
npm install aws-sdk ipfs-http-client
cd ..

echo "📦 Instalando dependencias del frontend..."
npm install

# Check if IPFS is installed
echo "🔍 Verificando IPFS..."
if ! command -v ipfs &> /dev/null; then
    echo "⚠️  IPFS no está instalado."
    echo "📥 Descargando e instalando IPFS..."
    
    # Detect OS
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    case $OS in
        Linux)
            if [ "$ARCH" = "x86_64" ]; then
                IPFS_DIST="go-ipfs_v0.17.0_linux-amd64.tar.gz"
            else
                echo "❌ Arquitectura no soportada: $ARCH"
                exit 1
            fi
            ;;
        Darwin)
            if [ "$ARCH" = "x86_64" ]; then
                IPFS_DIST="go-ipfs_v0.17.0_darwin-amd64.tar.gz"
            elif [ "$ARCH" = "arm64" ]; then
                IPFS_DIST="go-ipfs_v0.17.0_darwin-arm64.tar.gz"
            else
                echo "❌ Arquitectura no soportada: $ARCH"
                exit 1
            fi
            ;;
        *)
            echo "❌ Sistema operativo no soportado: $OS"
            echo "Por favor instala IPFS manualmente desde https://ipfs.io/docs/install/"
            exit 1
            ;;
    esac
    
    # Download and install IPFS
    curl -sSL "https://dist.ipfs.io/go-ipfs/v0.17.0/$IPFS_DIST" | tar -xz
    sudo mv go-ipfs/ipfs /usr/local/bin/
    rm -rf go-ipfs
    
    echo "✅ IPFS instalado correctamente"
else
    echo "✅ IPFS ya está instalado"
fi

# Initialize IPFS if not already done
if [ ! -d ~/.ipfs ]; then
    echo "🔧 Inicializando IPFS..."
    ipfs init
    
    # Configure CORS for web access
    echo "🔧 Configurando CORS para IPFS..."
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization"]'
else
    echo "✅ IPFS ya está inicializado"
fi

# Create environment file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creando archivo de configuración..."
    cp backend/.env.example backend/.env
    echo "⚠️  Por favor edita backend/.env con tus credenciales de Storj"
else
    echo "✅ Archivo de configuración ya existe"
fi

# Create systemd service for IPFS (Linux only)
if [ "$OS" = "Linux" ] && command -v systemctl &> /dev/null; then
    echo "🔧 ¿Quieres crear un servicio systemd para IPFS? (y/n)"
    read -r create_service
    
    if [ "$create_service" = "y" ] || [ "$create_service" = "Y" ]; then
        sudo tee /etc/systemd/system/ipfs.service > /dev/null <<EOF
[Unit]
Description=IPFS daemon
After=network.target

[Service]
Type=notify
User=$USER
Environment=IPFS_PATH=$HOME/.ipfs
ExecStart=/usr/local/bin/ipfs daemon
Restart=on-failure
RestartSec=10
KillSignal=SIGINT

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable ipfs
        echo "✅ Servicio IPFS creado. Usa 'sudo systemctl start ipfs' para iniciarlo"
    fi
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita backend/.env con tus credenciales de Storj:"
echo "   - STORJ_ACCESS_KEY_ID=tu_access_key_id"
echo "   - STORJ_SECRET_ACCESS_KEY=tu_secret_access_key"
echo "   - STORJ_BUCKET=tu_bucket_name"
echo ""
echo "2. Inicia IPFS daemon:"
echo "   ipfs daemon"
echo ""
echo "3. Inicia el servidor backend:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Inicia el frontend:"
echo "   npm run dev"
echo ""
echo "5. Visita http://localhost:5173 para probar la subida de archivos"
echo ""
echo "📚 Documentación completa en: docs/STORJ-INTEGRATION.md"
echo "🧪 Ejemplo de uso en: examples/storj-file-upload-example.tsx"
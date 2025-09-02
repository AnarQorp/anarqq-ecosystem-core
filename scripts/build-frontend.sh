
#!/bin/bash
set -euo pipefail

# Path to Vite configuration
VITE_CONFIG="frontend-build/vite.config.ts"

echo "🚀 Iniciando build del frontend AnarQ Nexus..."

# Ensure Vite configuration exists
if [ ! -f "$VITE_CONFIG" ]; then
  echo "❌ ERROR: $VITE_CONFIG no encontrado"
  exit 1
fi

# Limpiar build anterior
echo "🧹 Limpiando build anterior..."
rm -rf dist/

# Crear archivo .env.production
echo "📝 Configurando entorno de producción..."
cat > .env.production <<EOL
VITE_API_URL=https://anarq.coyotedron.com/api
VITE_PI_TESTNET_RPC=https://api.testnet.minepi.com
VITE_PI_TESTNET_CHAIN_ID=12345
VITE_PI_TESTNET_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_PI_TESTNET_EXPLORER=https://explorer.testnet.minepi.com/tx/
VITE_PRODUCTION_RPC=https://polygon-rpc.com
VITE_PRODUCTION_CONTRACT_ADDRESS=
VITE_ENVIRONMENT=production
EOL

# Verificar que package-lock.json existe
if [ ! -f "package-lock.json" ]; then
  echo "❌ ERROR: package-lock.json no encontrado"
  echo "💡 Ejecuta 'npm install' para generar package-lock.json"
  exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --production=false

# Build usando el script correcto
echo "🏗️ Compilando aplicación..."
NODE_ENV=production npx vite build --config "$VITE_CONFIG"

# Verificar que el build fue exitoso
if [ ! -d "dist" ]; then
  echo "❌ Build fallido: carpeta dist/ no generada"
  exit 1
fi

echo "✅ Build completado exitosamente"
echo "📁 Archivos generados en: ./dist/"

# Copiar a directorio web si existe
if [ -d "/var/www/anarq" ]; then
  echo "📋 Copiando archivos a /var/www/anarq..."
  sudo cp -r dist/* /var/www/anarq/
  echo "🌐 Despliegue completado"
else
  echo "ℹ️ Para desplegar, copia el contenido de dist/ a tu servidor web"
fi

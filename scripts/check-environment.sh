
#!/bin/bash

echo "🔍 Verificando entorno de desarrollo AnarQ Nexus..."
echo "================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar estado
show_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Verificar Node.js
echo -n "Verificando Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js no encontrado${NC}"
    exit 1
fi

# Verificar npm
echo -n "Verificando npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm no encontrado${NC}"
    exit 1
fi

# Verificar package.json
echo -n "Verificando package.json... "
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json encontrado${NC}"
else
    echo -e "${RED}❌ package.json no encontrado${NC}"
    exit 1
fi

# Verificar package-lock.json
echo -n "Verificando package-lock.json... "
if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✅ package-lock.json encontrado${NC}"
else
    echo -e "${YELLOW}⚠️ package-lock.json no encontrado${NC}"
    echo -e "${YELLOW}💡 Ejecuta 'npm install' para generarlo${NC}"
fi

# Verificar node_modules
echo -n "Verificando node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules encontrado${NC}"
else
    echo -e "${YELLOW}⚠️ node_modules no encontrado${NC}"
    echo -e "${YELLOW}💡 Ejecuta 'npm install' para instalar dependencias${NC}"
fi

# Verificar archivos de configuración
echo -n "Verificando frontend-build/vite.config.ts... "
if [ -f "frontend-build/vite.config.ts" ]; then
    echo -e "${GREEN}✅ frontend-build/vite.config.ts encontrado${NC}"
else
    echo -e "${RED}❌ frontend-build/vite.config.ts no encontrado${NC}"
fi

echo -n "Verificando frontend/tsconfig*.json... "
if compgen -G "frontend/tsconfig*.json" > /dev/null; then
    echo -e "${GREEN}✅ tsconfig*.json encontrado(s) en frontend${NC}"
else
    echo -e "${RED}❌ tsconfig*.json no encontrado en frontend${NC}"
fi

echo -n "Verificando frontend/tailwind.config.ts... "
if [ -f "frontend/tailwind.config.ts" ]; then
    echo -e "${GREEN}✅ frontend/tailwind.config.ts encontrado${NC}"
else
    echo -e "${RED}❌ frontend/tailwind.config.ts no encontrado${NC}"
fi

# Verificar scripts en package.json
echo -n "Verificando scripts de npm... "
if npm run | grep -q "build"; then
    echo -e "${GREEN}✅ Script 'build' encontrado${NC}"
else
    echo -e "${RED}❌ Script 'build' no encontrado${NC}"
fi

# Verificar estructura de directorios
echo -n "Verificando estructura src/... "
if [ -d "src" ]; then
    echo -e "${GREEN}✅ Directorio src/ encontrado${NC}"
else
    echo -e "${RED}❌ Directorio src/ no encontrado${NC}"
fi

echo -n "Verificando estructura public/... "
if [ -d "public" ]; then
    echo -e "${GREEN}✅ Directorio public/ encontrado${NC}"
else
    echo -e "${RED}❌ Directorio public/ no encontrado${NC}"
fi

# Verificar permisos de escritura
echo -n "Verificando permisos de escritura... "
if [ -w "." ]; then
    echo -e "${GREEN}✅ Permisos de escritura OK${NC}"
else
    echo -e "${RED}❌ Sin permisos de escritura${NC}"
fi

echo ""
echo "================================================="
echo -e "${GREEN}🎯 Verificación completada${NC}"
echo ""

# Recomendaciones
echo -e "${YELLOW}📋 Recomendaciones:${NC}"
if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}1. Ejecuta 'npm install' para generar package-lock.json${NC}"
fi
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}2. Ejecuta 'npm install' para instalar dependencias${NC}"
fi
echo -e "${YELLOW}3. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo${NC}"
echo -e "${YELLOW}4. Ejecuta 'npm run build' para construir para producción${NC}"

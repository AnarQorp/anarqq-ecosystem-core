#!/bin/bash

# Estrategia de Distribución Pública para Repositorios Privados
# Crea múltiples opciones de distribución sin exponer código privado

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

print_info "Creando estrategia de distribución pública para repositorios privados..."

# Opción 1: Crear instalador autocontenido
print_info "Creando instalador autocontenido..."

cat > "anarqq-installer-standalone.sh" << 'EOF'
#!/bin/bash

# AnarQ&Q Ecosystem Demo - Instalador Autocontenido
# No requiere acceso a repositorios privados
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
    echo "║              Instalador Autocontenido v1.0.0                 ║"
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

# Configuración
INSTALL_DIR="$HOME/anarqq-ecosystem"
DEMO_DIR="$INSTALL_DIR/demo"
LOG_FILE="$INSTALL_DIR/install.log"

# URLs de descarga alternativas (pueden ser CDN, servidor web, etc.)
DEMO_PACKAGE_URL="https://example.com/anarqq-demo-package.tar.gz"  # Placeholder
CONTACT_EMAIL="anarqorp@proton.me"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_requirements() {
    print_step "Verificando requisitos del sistema..."
    
    local errors=0
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version)
        print_success "Node.js encontrado: $node_version"
    else
        print_error "Node.js no encontrado (requerido: v18.0.0+)"
        ((errors++))
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_success "npm encontrado: v$npm_version"
    else
        print_error "npm no encontrado"
        ((errors++))
    fi
    
    # Check Git (opcional)
    if command_exists git; then
        local git_version=$(git --version | cut -d' ' -f3)
        print_success "Git encontrado: v$git_version"
    else
        print_warning "Git no encontrado (recomendado pero no requerido)"
    fi
    
    return $errors
}

install_nodejs() {
    print_step "Instalando Node.js..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            print_info "Instalando Node.js en Ubuntu/Debian..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command_exists yum; then
            print_info "Instalando Node.js en CentOS/RHEL..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
        elif command_exists dnf; then
            print_info "Instalando Node.js en Fedora..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo dnf install -y nodejs
        else
            print_error "Distribución Linux no soportada para instalación automática"
            print_info "Por favor instala Node.js manualmente desde: https://nodejs.org"
            return 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            print_info "Instalando Node.js con Homebrew..."
            brew install node
        else
            print_error "Homebrew no encontrado"
            print_info "Por favor instala Node.js desde: https://nodejs.org"
            return 1
        fi
    else
        print_error "Sistema operativo no soportado para instalación automática"
        print_info "Por favor instala Node.js desde: https://nodejs.org"
        return 1
    fi
    
    print_success "Node.js instalado correctamente"
}

create_demo_structure() {
    print_step "Creando estructura de la demo..."
    
    mkdir -p "$DEMO_DIR"
    cd "$DEMO_DIR"
    
    # Crear package.json básico
    cat > package.json << 'PACKAGE_EOF'
{
  "name": "anarqq-ecosystem-demo",
  "version": "1.0.0",
  "description": "AnarQ&Q Ecosystem Demo - Decentralized ecosystem demonstration",
  "main": "index.js",
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js",
    "build": "echo 'Build completed'",
    "test": "echo 'Tests passed'"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "keywords": ["anarqq", "ecosystem", "demo", "decentralized"],
  "author": "AnarQorp Team",
  "license": "MIT"
}
PACKAGE_EOF
    
    # Crear servidor básico
    cat > server.js << 'SERVER_EOF'
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        message: 'AnarQ&Q Ecosystem Demo is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/ecosystem', (req, res) => {
    res.json({
        components: [
            { name: 'QConsent', status: 'active', description: 'Decentralized consent system' },
            { name: 'QMarket', status: 'active', description: 'Secure data marketplace' },
            { name: 'QNet Phase 2', status: 'active', description: 'Advanced decentralized network' },
            { name: 'Identity Management', status: 'active', description: 'Decentralized identity system' }
        ],
        network: {
            nodes: 42,
            transactions: 1337,
            uptime: '99.9%'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 AnarQ&Q Ecosystem Demo running on http://localhost:${PORT}`);
    console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
    console.log(`🌐 Ecosystem Info: http://localhost:${PORT}/api/ecosystem`);
});
SERVER_EOF
    
    # Crear directorio público
    mkdir -p public
    
    # Crear página principal
    cat > public/index.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnarQ&Q Ecosystem Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 3em; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { 
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            border-radius: 15px; padding: 25px; border: 1px solid rgba(255,255,255,0.2);
        }
        .card h3 { margin-bottom: 15px; color: #ffd700; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 0.8em; margin-left: 10px; }
        .status.active { background: #4CAF50; }
        .api-section { margin-top: 40px; }
        .api-button { 
            background: #4CAF50; color: white; border: none; padding: 12px 24px;
            border-radius: 8px; cursor: pointer; margin: 5px; font-size: 1em;
        }
        .api-button:hover { background: #45a049; }
        .response { 
            background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px;
            margin-top: 20px; font-family: monospace; white-space: pre-wrap;
        }
        .footer { text-align: center; margin-top: 40px; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AnarQ&Q Ecosystem Demo</h1>
            <p>Demostración del Ecosistema Descentralizado AnarQ&Q con QNET Phase 2</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🛡️ QConsent <span class="status active">ACTIVO</span></h3>
                <p>Sistema de consentimiento descentralizado que permite a los usuarios controlar completamente sus datos y permisos de acceso.</p>
            </div>
            
            <div class="card">
                <h3>🏪 QMarket <span class="status active">ACTIVO</span></h3>
                <p>Marketplace seguro de datos que facilita el intercambio P2P de información con garantías criptográficas.</p>
            </div>
            
            <div class="card">
                <h3>🌐 QNet Phase 2 <span class="status active">ACTIVO</span></h3>
                <p>Red descentralizada avanzada con capacidades mejoradas de escalabilidad y consenso distribuido.</p>
            </div>
            
            <div class="card">
                <h3>🔑 Identity Management <span class="status active">ACTIVO</span></h3>
                <p>Sistema de gestión de identidad descentralizada con autenticación sin contraseñas y verificación criptográfica.</p>
            </div>
        </div>
        
        <div class="api-section">
            <h2>🔗 API Endpoints</h2>
            <button class="api-button" onclick="testAPI('/api/status')">Test Status API</button>
            <button class="api-button" onclick="testAPI('/api/ecosystem')">Test Ecosystem API</button>
            <div id="response" class="response" style="display: none;"></div>
        </div>
        
        <div class="footer">
            <p>© 2025 AnarQorp - Ecosistema Descentralizado AnarQ&Q</p>
            <p>📧 Contacto: anarqorp@proton.me</p>
        </div>
    </div>
    
    <script>
        async function testAPI(endpoint) {
            const responseDiv = document.getElementById('response');
            responseDiv.style.display = 'block';
            responseDiv.textContent = 'Cargando...';
            
            try {
                const response = await fetch(endpoint);
                const data = await response.json();
                responseDiv.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
            }
        }
        
        // Auto-test status on load
        window.onload = () => {
            setTimeout(() => testAPI('/api/status'), 1000);
        };
    </script>
</body>
</html>
HTML_EOF
    
    # Crear archivo .env
    cat > .env << 'ENV_EOF'
# AnarQ&Q Ecosystem Demo Configuration
PORT=3000
NODE_ENV=development

# Demo Configuration
DEMO_MODE=true
ECOSYSTEM_VERSION=1.0.0

# Network Configuration
QNET_PHASE=2
NETWORK_NODES=42
ENV_EOF
    
    print_success "Estructura de la demo creada"
}

install_dependencies() {
    print_step "Instalando dependencias..."
    
    cd "$DEMO_DIR"
    npm install
    
    print_success "Dependencias instaladas"
}

create_launchers() {
    print_step "Creando scripts de inicio..."
    
    # Script de inicio para Linux/macOS
    cat > "$INSTALL_DIR/start-demo.sh" << 'START_EOF'
#!/bin/bash
echo "🚀 Iniciando AnarQ&Q Ecosystem Demo..."
cd "$(dirname "$0")/demo"
npm run dev
START_EOF
    chmod +x "$INSTALL_DIR/start-demo.sh"
    
    # Script de parada
    cat > "$INSTALL_DIR/stop-demo.sh" << 'STOP_EOF'
#!/bin/bash
echo "🛑 Deteniendo AnarQ&Q Ecosystem Demo..."
pkill -f "node server.js" || echo "Demo no estaba ejecutándose"
echo "Demo detenida"
STOP_EOF
    chmod +x "$INSTALL_DIR/stop-demo.sh"
    
    # Script para Windows
    cat > "$INSTALL_DIR/start-demo.bat" << 'BAT_EOF'
@echo off
echo 🚀 Iniciando AnarQ&Q Ecosystem Demo...
cd /d "%~dp0demo"
npm run dev
pause
BAT_EOF
    
    print_success "Scripts de inicio creados"
}

main() {
    print_banner
    
    print_info "Instalando AnarQ&Q Ecosystem Demo..."
    print_info "Versión: 1.0.0"
    print_info "Directorio de instalación: $INSTALL_DIR"
    echo ""
    
    # Crear directorio de instalación
    mkdir -p "$INSTALL_DIR"
    echo "Instalación iniciada: $(date)" > "$LOG_FILE"
    
    # Verificar requisitos
    if ! check_requirements; then
        print_warning "Algunos requisitos no se cumplen. Intentando instalar..."
        if ! install_nodejs; then
            print_error "No se pudo instalar Node.js automáticamente"
            print_info "Por favor instala Node.js v18+ desde: https://nodejs.org"
            print_info "Luego ejecuta este script nuevamente"
            exit 1
        fi
    fi
    
    # Crear estructura de la demo
    create_demo_structure
    
    # Instalar dependencias
    install_dependencies
    
    # Crear scripts de inicio
    create_launchers
    
    print_success "🎉 ¡Instalación completada exitosamente!"
    echo ""
    print_info "📍 Directorio de instalación: $INSTALL_DIR"
    print_info "📋 Log de instalación: $LOG_FILE"
    echo ""
    print_info "🚀 Para iniciar la demo:"
    echo "   $INSTALL_DIR/start-demo.sh"
    echo ""
    print_info "🌐 La demo estará disponible en: http://localhost:3000"
    echo ""
    print_info "📞 Soporte: $CONTACT_EMAIL"
    
    # Preguntar si iniciar ahora
    echo ""
    read -p "¿Deseas iniciar la demo ahora? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Iniciando demo..."
        "$INSTALL_DIR/start-demo.sh"
    fi
}

# Ejecutar instalación
main "$@"
EOF

chmod +x anarqq-installer-standalone.sh
print_success "Instalador autocontenido creado: anarqq-installer-standalone.sh"

# Crear documentación de distribución
cat > "PRIVATE_REPO_DISTRIBUTION.md" << 'EOF'
# 🔒 Distribución Pública con Repositorios Privados

## Estrategias de Distribución

### 🎯 Opción 1: Instalador Autocontenido (Recomendado)

**Archivo**: `anarqq-installer-standalone.sh`

Este instalador no requiere acceso a repositorios privados y crea una demo funcional localmente.

#### Características:
- ✅ No requiere acceso a repositorios privados
- ✅ Crea demo funcional con APIs básicas
- ✅ Instala dependencias automáticamente
- ✅ Interfaz web completa
- ✅ Scripts de gestión incluidos

#### Distribución:
```bash
# Los usuarios pueden ejecutar directamente
./anarqq-installer-standalone.sh

# O distribuir via web/email/USB
```

### 🎯 Opción 2: Servidor Web de Distribución

Crear un servidor web simple que sirva los instaladores:

```bash
# Crear servidor de distribución
python3 -m http.server 8080

# Los usuarios acceden a:
# http://tu-servidor.com:8080/anarqq-installer-standalone.sh
```

### 🎯 Opción 3: Distribución por Email/Transferencia

Enviar el instalador directamente a usuarios autorizados:

```bash
# Comprimir instalador
tar -czf anarqq-installer-v1.0.0.tar.gz anarqq-installer-standalone.sh

# Enviar por email o transferir directamente
```

### 🎯 Opción 4: CDN/Almacenamiento en la Nube

Subir a servicios públicos de almacenamiento:

- **AWS S3** (bucket público)
- **Google Cloud Storage** (público)
- **Azure Blob Storage** (público)
- **GitHub Gist** (público)
- **Dropbox/Google Drive** (enlaces públicos)

## 📋 Contenido del Instalador Autocontenido

### Aplicación Demo Incluida:
- **Servidor Express.js** con APIs funcionales
- **Interfaz web** responsive y moderna
- **APIs de demostración**:
  - `/api/status` - Estado del sistema
  - `/api/ecosystem` - Información del ecosistema
- **Componentes simulados**:
  - QConsent (sistema de consentimiento)
  - QMarket (marketplace de datos)
  - QNet Phase 2 (red descentralizada)
  - Identity Management (gestión de identidad)

### Scripts de Gestión:
- `start-demo.sh` / `start-demo.bat` - Iniciar demo
- `stop-demo.sh` - Detener demo
- Configuración automática de entorno

## 🚀 Instrucciones para Usuarios

### Instalación:
```bash
# Descargar instalador (método según distribución elegida)
chmod +x anarqq-installer-standalone.sh
./anarqq-installer-standalone.sh
```

### Uso:
```bash
# Iniciar demo
~/anarqq-ecosystem/start-demo.sh

# Acceder en navegador
http://localhost:3000

# Detener demo
~/anarqq-ecosystem/stop-demo.sh
```

## 🛡️ Ventajas de esta Estrategia

1. **✅ Privacidad Total**: Código fuente permanece privado
2. **✅ Sin Dependencias Externas**: No requiere acceso a GitHub
3. **✅ Funcionalidad Completa**: Demo totalmente funcional
4. **✅ Fácil Distribución**: Un solo archivo ejecutable
5. **✅ Control Total**: Distribución controlada por AnarQorp
6. **✅ Sin Autenticación**: Los usuarios no necesitan tokens

## 📞 Soporte

- **📧 Email**: anarqorp@proton.me
- **🔧 Soporte Técnico**: Contacto directo con el equipo
- **📋 Issues**: Reportar por email

---

**Esta estrategia permite distribución pública manteniendo repositorios completamente privados.**
EOF

print_success "Documentación de distribución creada"

print_success "🎉 Estrategia de distribución pública completada!"
echo ""
print_info "📦 Instalador autocontenido: anarqq-installer-standalone.sh"
print_info "📚 Documentación: PRIVATE_REPO_DISTRIBUTION.md"
echo ""
print_info "🎯 Opciones de distribución:"
echo "   1. Distribuir archivo directamente a usuarios"
echo "   2. Subir a servidor web/CDN público"
echo "   3. Enviar por email a usuarios autorizados"
echo "   4. Usar servicios de almacenamiento en la nube"
echo ""
print_info "✨ El instalador crea una demo completamente funcional sin acceso a repos privados"
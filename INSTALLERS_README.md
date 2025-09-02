# 🚀 AnarQ&Q Ecosystem Installers

Instaladores automáticos para el ecosistema AnarQ&Q que facilitan la configuración y despliegue de la demo y el ecosistema completo.

## 📦 Instaladores Disponibles

### 1. **Instalador Básico** (`install-anarqq-demo.sh`)
Instalador simple e interactivo para usuarios nuevos.

```bash
# Descargar y ejecutar
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-demo.sh | bash

# O clonar y ejecutar localmente
git clone https://github.com/AnarQorp/anarqq-ecosystem-core.git
cd anarqq-ecosystem-core
./install-anarqq-demo.sh
```

**Características:**
- ✅ Verificación automática de prerrequisitos
- ✅ Instalación interactiva paso a paso
- ✅ Configuración automática del entorno
- ✅ Scripts de acceso rápido
- ✅ Soporte para Docker opcional

### 2. **Instalador Windows** (`install-anarqq-demo.ps1`)
Instalador para sistemas Windows con PowerShell.

```powershell
# Ejecutar en PowerShell como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\install-anarqq-demo.ps1

# Con opciones
.\install-anarqq-demo.ps1 -CoreOnly -InstallPath "C:\AnarQQ"
```

**Opciones:**
- `-SkipPrereqs`: Omitir verificación de prerrequisitos
- `-CoreOnly`: Instalar solo el ecosistema completo
- `-DemoOnly`: Instalar solo la demo
- `-InstallPath`: Directorio personalizado

### 3. **Instalador Avanzado** (`install-anarqq-advanced.sh`)
Instalador con opciones completas para desarrolladores y administradores.

```bash
# Instalación básica
./install-anarqq-advanced.sh

# Solo la demo
./install-anarqq-advanced.sh --demo-only

# Ecosistema completo con Docker
./install-anarqq-advanced.sh --all --docker

# Modo desarrollo con auto-inicio
./install-anarqq-advanced.sh --development --start --verbose
```

**Opciones completas:**
```
-h, --help              Mostrar ayuda
-d, --demo-only         Instalar solo la demo
-c, --core-only         Instalar solo el ecosistema completo
-a, --all               Instalar demo y ecosistema completo
-D, --docker            Configurar con Docker
-p, --path PATH         Directorio personalizado
-s, --skip-prereqs      Omitir verificación de prerrequisitos
-t, --skip-tests        Omitir tests de verificación
-v, --verbose           Modo verboso
-S, --start             Iniciar automáticamente
-dev, --development     Modo desarrollo
```

## 🔧 Prerrequisitos

### Mínimos Requeridos
- **Git** 2.0+
- **Node.js** 18+ 
- **npm** 8+

### Opcionales
- **Docker** 20+ (para contenedores)
- **Docker Compose** 2+ (para orquestación)

### Instalación de Prerrequisitos

#### Ubuntu/Debian
```bash
# Actualizar sistema
sudo apt update

# Instalar Git
sudo apt install git

# Instalar Node.js (usando NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Docker (opcional)
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
```

#### macOS
```bash
# Usando Homebrew
brew install git node npm

# Docker (opcional)
brew install --cask docker
```

#### Windows
- **Git**: https://git-scm.com/download/win
- **Node.js**: https://nodejs.org/
- **Docker**: https://docs.docker.com/desktop/windows/

## 🚀 Uso Rápido

### Instalación Express (Recomendada)
```bash
# Una línea - instalación completa
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-demo.sh | bash
```

### Instalación Personalizada
```bash
# Descargar instalador avanzado
wget https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-core/main/install-anarqq-advanced.sh
chmod +x install-anarqq-advanced.sh

# Instalar solo demo en directorio personalizado
./install-anarqq-advanced.sh --demo-only --path ~/mi-anarqq

# Instalar todo con Docker en modo desarrollo
./install-anarqq-advanced.sh --all --docker --development --verbose
```

## 📁 Estructura de Instalación

Después de la instalación, tendrás:

```
~/anarqq-ecosystem/
├── demo/                    # Demo del ecosistema
│   ├── src/                 # Código fuente de la demo
│   ├── scripts/             # Scripts de configuración
│   ├── docker-compose.yml   # Configuración Docker
│   └── package.json         # Dependencias
├── core/                    # Ecosistema completo (opcional)
│   ├── modules/             # 15 módulos del ecosistema
│   ├── backend/             # Backend Node.js
│   ├── frontend/            # Frontend React
│   └── contracts/           # Contratos inteligentes
├── start-demo.sh           # Iniciar demo
├── start-ecosystem.sh      # Iniciar ecosistema completo
├── start-docker.sh         # Iniciar con Docker
├── monitor.sh              # Monitorear servicios
└── cleanup.sh              # Limpiar instalación
```

## 🎯 Scripts Generados

### Scripts Básicos
- **`start-demo.sh`**: Inicia la demo del ecosistema
- **`start-ecosystem.sh`**: Inicia el ecosistema completo
- **`start-docker.sh`**: Inicia con Docker Compose

### Scripts Avanzados (con instalador avanzado)
- **`dev-start.sh`**: Modo desarrollo con hot-reload
- **`monitor.sh`**: Monitorea el estado de los servicios
- **`cleanup.sh`**: Limpia builds y procesos

### Uso de Scripts
```bash
# Iniciar demo
~/anarqq-ecosystem/start-demo.sh

# Monitorear servicios
~/anarqq-ecosystem/monitor.sh

# Limpiar (mantener dependencias)
~/anarqq-ecosystem/cleanup.sh

# Limpiar completo (eliminar node_modules)
~/anarqq-ecosystem/cleanup.sh --deep
```

## 🌐 URLs por Defecto

Una vez iniciado el ecosistema:

- **Frontend Demo**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/health

## 🐳 Uso con Docker

### Iniciar con Docker
```bash
cd ~/anarqq-ecosystem/demo
docker-compose up -d
```

### Monitorear contenedores
```bash
docker-compose ps
docker-compose logs -f
```

### Detener servicios
```bash
docker-compose down
```

## 🔧 Configuración

### Variables de Entorno
Los instaladores crean automáticamente archivos `.env` desde `.env.example`:

```bash
# Demo
~/anarqq-ecosystem/demo/.env

# Ecosistema completo
~/anarqq-ecosystem/core/.env
~/anarqq-ecosystem/core/backend/.env
```

### Configuración Personalizada
Edita los archivos `.env` para personalizar:
- Puertos de servicios
- URLs de APIs
- Tokens de autenticación
- Configuración de base de datos

## 🧪 Testing

### Tests Automáticos
Los instaladores ejecutan automáticamente:
- Verificación de build
- Tests unitarios básicos
- Verificación de conectividad

### Tests Manuales
```bash
# Test de la demo
cd ~/anarqq-ecosystem/demo
npm test

# Test del ecosistema
cd ~/anarqq-ecosystem/core
npm test

# Test de integración
npm run test:integration
```

## 🔍 Troubleshooting

### Problemas Comunes

#### Error: "Node.js version not compatible"
```bash
# Verificar versión
node --version

# Actualizar Node.js
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew upgrade node
```

#### Error: "Permission denied"
```bash
# Dar permisos de ejecución
chmod +x install-*.sh

# Ejecutar con sudo si es necesario
sudo ./install-anarqq-demo.sh
```

#### Error: "Port already in use"
```bash
# Verificar puertos ocupados
netstat -tlnp | grep -E ':(3001|8080)'

# Matar procesos en puertos
sudo fuser -k 3001/tcp
sudo fuser -k 8080/tcp
```

#### Error: "Docker not found"
```bash
# Instalar Docker
# Ubuntu/Debian
sudo apt install docker.io docker-compose

# macOS
brew install --cask docker

# Verificar instalación
docker --version
docker-compose --version
```

### Logs de Depuración

#### Modo Verbose
```bash
# Instalador avanzado con logs detallados
./install-anarqq-advanced.sh --verbose

# Monitorear logs en tiempo real
tail -f ~/anarqq-ecosystem/demo/logs/*.log
```

#### Logs de Docker
```bash
# Ver logs de contenedores
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f demo
```

## 📞 Soporte

### Documentación
- **Demo**: `~/anarqq-ecosystem/demo/README.md`
- **Ecosistema**: `~/anarqq-ecosystem/core/README.md`
- **Módulos**: `~/anarqq-ecosystem/core/modules/*/README.md`

### Contacto
- **Email**: anarqorp@proton.me
- **GitHub**: https://github.com/AnarQorp
- **Issues**: https://github.com/AnarQorp/anarqq-ecosystem-core/issues

### Contribuir
1. Fork del repositorio
2. Crear rama de feature
3. Commit de cambios
4. Push a la rama
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

**AnarQ&Q Ecosystem** - Ecosistema descentralizado de próxima generación 🚀
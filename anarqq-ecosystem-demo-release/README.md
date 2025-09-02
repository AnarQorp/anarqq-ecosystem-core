# 🚀 AnarQ&Q Ecosystem Demo - Instaladores Oficiales

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/AnarQorp/anarqq-ecosystem-demo)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)]()

Instaladores automáticos oficiales para el **AnarQ&Q Ecosystem Demo** - Una demostración completa del ecosistema descentralizado AnarQ&Q con integración QNET Phase 2.

## 🎯 Instalación Rápida

### Opción 1: Instalador Automático (Recomendado)
```bash
# Descargar y ejecutar el instalador maestro
curl -fsSL https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq.sh | bash
```

### Opción 2: Instalador Manual
```bash
# Descargar instalador específico para tu plataforma
curl -O https://raw.githubusercontent.com/AnarQorp/anarqq-ecosystem-demo/main/install-anarqq-demo.sh
chmod +x install-anarqq-demo.sh
./install-anarqq-demo.sh
```

## 📦 Instaladores Disponibles

| Instalador | Plataforma | Características |
|------------|------------|-----------------|
| `install-anarqq.sh` | **Maestro** | 🎯 Detección automática de sistema |
| `install-anarqq-demo.sh` | Linux/macOS | ✅ Completo, verificación automática |
| `install-anarqq-demo.py` | Multiplataforma | 🖥️ Interfaz gráfica con Tkinter |
| `install-anarqq-demo.ps1` | Windows | 🔧 PowerShell avanzado |
| `install-anarqq-demo.bat` | Windows | 📝 CMD nativo |

## 🔧 Requisitos del Sistema

- **Node.js**: v18.0.0 o superior
- **npm**: Incluido con Node.js
- **Git**: Recomendado (opcional)
- **Python**: v3.8+ (solo para instalador GUI)
- **Espacio**: 5GB libres
- **RAM**: 2GB disponibles

## 🚀 Uso

### 1. Instalación Automática
```bash
# El instalador maestro detecta tu sistema automáticamente
./install-anarqq.sh
```

### 2. Instalación con GUI (Python)
```bash
# Interfaz gráfica con barra de progreso
python3 install-anarqq-demo.py
```

### 3. Instalación Windows
```powershell
# PowerShell (recomendado para Windows)
.\install-anarqq-demo.ps1

# O CMD tradicional
install-anarqq-demo.bat
```

## ✅ Verificación Post-Instalación

```bash
# Verificar instalación completa automáticamente
./verify-installation.sh
```

## 📁 Estructura Post-Instalación

```
~/anarqq-ecosystem/
├── demo/                    # 🎮 Aplicación demo
├── core/                   # 🔧 Ecosistema completo (opcional)
├── start-demo.sh/.bat      # ▶️ Iniciar demo
├── stop-services.sh/.bat   # ⏹️ Detener servicios
├── update-demo.sh/.bat     # 🔄 Actualizar demo
└── install.log            # 📋 Log de instalación
```

## 🎮 Iniciar la Demo

```bash
# Linux/macOS
~/anarqq-ecosystem/start-demo.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\start-demo.bat
```

## 🔄 Actualizar

```bash
# Linux/macOS
~/anarqq-ecosystem/update-demo.sh

# Windows
%USERPROFILE%\anarqq-ecosystem\update-demo.bat
```

## 🛠️ Solución de Problemas

### Problemas Comunes

#### Node.js no encontrado
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node

# Windows
# Descargar desde https://nodejs.org
```

#### Error de permisos
```bash
# Linux/macOS
sudo chmod +x install-anarqq-demo.sh

# Windows (ejecutar como administrador)
```

#### Puerto ocupado
```bash
# Cambiar puerto en .env
echo "PORT=3001" >> ~/anarqq-ecosystem/demo/.env
```

### Logs de Diagnóstico

```bash
# Ver log completo
cat ~/anarqq-ecosystem/install.log

# Ver solo errores
grep "ERROR" ~/anarqq-ecosystem/install.log
```

## 🌟 Características del Ecosistema

### 🔐 Componentes de Seguridad
- **QConsent**: Sistema de consentimiento descentralizado
- **QMarket**: Marketplace de datos seguro
- **QNet Phase 2**: Red descentralizada avanzada

### 🎯 Funcionalidades Demo
- **Dashboard Interactivo**: Visualización en tiempo real
- **Gestión de Identidad**: Sistema de identidad descentralizada
- **Transacciones Seguras**: Procesamiento de transacciones P2P
- **APIs RESTful**: Integración completa con APIs

### 🔧 Herramientas de Desarrollo
- **Hot Reload**: Desarrollo en tiempo real
- **Docker Support**: Contenedorización opcional
- **CI/CD Ready**: Pipelines de integración continua
- **Multi-Environment**: Local, staging, producción

## 📚 Documentación

- **[Guía de Instalación Completa](README-INSTALLERS.md)** - Documentación detallada
- **[API Documentation](https://github.com/AnarQorp/anarqq-ecosystem-demo/docs/api)** - Referencia de APIs
- **[Architecture Guide](https://github.com/AnarQorp/anarqq-ecosystem-core/docs/architecture)** - Arquitectura del ecosistema
- **[Developer Guide](https://github.com/AnarQorp/anarqq-ecosystem-core/docs/development)** - Guía de desarrollo

## 🤝 Contribuir

1. **Fork** el repositorio
2. **Crear** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abrir** un Pull Request

## 📞 Soporte

- **📧 Email**: anarqorp@proton.me
- **🐛 Issues**: [GitHub Issues](https://github.com/AnarQorp/anarqq-ecosystem-demo/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/AnarQorp/anarqq-ecosystem-demo/discussions)
- **📖 Wiki**: [Project Wiki](https://github.com/AnarQorp/anarqq-ecosystem-demo/wiki)

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **AnarQorp Team** - Desarrollo y mantenimiento
- **Community Contributors** - Feedback y mejoras
- **Open Source Libraries** - Tecnologías base utilizadas

---

**¡Gracias por usar AnarQ&Q Ecosystem Demo!** 🚀

*Para más información sobre el ecosistema completo, visita [AnarQorp](https://github.com/AnarQorp)*
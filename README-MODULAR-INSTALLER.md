# AnarQ&Q Modular Installation System

## Overview

The AnarQ&Q Modular Installation System provides a flexible, robust, and user-friendly way to install the AnarQ&Q ecosystem with customizable component selection, dependency validation, and comprehensive error handling.

## Features

### ✅ Installation Mode Selection
- **Minimal**: Demo básico con componentes esenciales
- **Full**: Ecosistema completo con todos los módulos  
- **Development**: Entorno de desarrollo con herramientas adicionales

### ✅ Component-Specific Installation Logic
- External repository components (demo, core)
- Subdirectory components (backend, frontend, modules)
- Automatic dependency resolution
- Component-specific setup and validation

### ✅ Dependency Validation
- Automatic detection of missing dependencies
- Interactive dependency resolution
- Smart component relationship management
- Validation before installation begins

### ✅ Disk Space Management
- Pre-installation disk space checking
- Component size calculation with buffer
- Cleanup options for failed installations
- Space requirement reporting

## Installation Scripts

### Core Scripts

1. **`install-anarqq-modular.sh`** - Main modular configuration script
2. **`install-component-manager.sh`** - Component installation management
3. **`install-anarqq-integrated.sh`** - Integrated installer combining all features
4. **`install-dependency-manager.sh`** - System dependency management (required)

### Utility Scripts

- **`verify-modular-system.sh`** - Verification and testing script
- **`demo-modular-installer.sh`** - Demonstration script
- **`test-modular-installer.sh`** - Comprehensive test suite

## Usage

### Quick Start

1. **Configure Installation**:
   ```bash
   ./install-anarqq-modular.sh
   ```
   This creates an `anarqq-install-config.sh` file with your preferences.

2. **Run Installation**:
   ```bash
   ./install-anarqq-integrated.sh
   ```
   This executes the installation using your configuration.

### Manual Configuration

You can also create the configuration file manually:

```bash
# anarqq-install-config.sh
INSTALL_CONFIG_MODE="full"
INSTALL_CONFIG_COMPONENTS="demo,core,backend,frontend,qwallet,qmarket"
INSTALL_CONFIG_TARGET_DIR="/home/user/anarqq-ecosystem"
INSTALL_CONFIG_VERBOSE="true"
```

## Component Architecture

### Available Components

| Component | Description | Size | Dependencies |
|-----------|-------------|------|--------------|
| `demo` | Demo básico del ecosistema | 50MB | - |
| `core` | Núcleo del ecosistema | 200MB | demo |
| `backend` | Servicios backend | 150MB | core |
| `frontend` | Interfaz de usuario | 100MB | core |
| `qwallet` | Módulo de billetera | 75MB | core, backend |
| `qmarket` | Módulo de mercado | 100MB | core, backend, qwallet |
| `qsocial` | Módulo social | 80MB | core, backend |
| `qchat` | Módulo de chat | 60MB | core, backend, qsocial |
| `qdrive` | Módulo de almacenamiento | 120MB | core, backend |
| `qmail` | Módulo de correo | 70MB | core, backend |
| `qnet` | Módulo de red | 90MB | core, backend |
| `dao` | Módulo DAO | 110MB | core, backend, qwallet |
| `qerberos` | Módulo de seguridad | 85MB | core, backend |
| `dev-tools` | Herramientas de desarrollo | 300MB | core |

### Component Types

1. **External Repositories**: Downloaded independently (demo, core)
2. **Subdirectory Components**: Part of core repository (backend, frontend, modules)

## Installation Modes

### Minimal Mode
```
Components: demo
Total Size: ~50MB
Use Case: Quick demo and testing
```

### Full Mode
```
Components: demo, core, backend, frontend, qwallet, qmarket, qsocial, qchat, qdrive, qmail, qnet, dao, qerberos
Total Size: ~1.2GB
Use Case: Complete ecosystem deployment
```

### Development Mode
```
Components: All full mode components + dev-tools
Total Size: ~1.5GB
Use Case: Development and contribution
```

## Advanced Features

### Dependency Resolution

The system automatically resolves component dependencies:

```bash
# If you select qmarket, it automatically includes:
# - core (required by qmarket)
# - backend (required by qmarket)
# - qwallet (required by qmarket)
```

### Disk Space Validation

```bash
# Checks available space before installation
# Includes 10% buffer for temporary files
# Provides cleanup options if space is insufficient
```

### Error Handling

- Comprehensive logging with timestamps
- Automatic cleanup on failure
- Multiple download fallback methods
- Context-aware error messages

### Component Installation Process

1. **Download**: Git clone or ZIP download with fallbacks
2. **Extract**: Multiple extraction methods (unzip, Python, Node)
3. **Install**: Component-specific npm/yarn commands
4. **Setup**: Environment files, directories, configuration
5. **Validate**: Component-specific validation tests

## Configuration Options

### Environment Variables

```bash
INSTALL_CONFIG_MODE="full"              # Installation mode
INSTALL_CONFIG_COMPONENTS="demo,core"   # Selected components
INSTALL_CONFIG_TARGET_DIR="/path"       # Installation directory
INSTALL_CONFIG_VERBOSE="true"           # Verbose logging
INSTALL_CONFIG_SKIP_VALIDATION="false"  # Skip post-install validation
INSTALL_CONFIG_CLEANUP_ON_ERROR="true"  # Auto-cleanup on failure
```

### Logging

All operations are logged to timestamped log files:
```
anarqq-modular-installer-YYYYMMDD-HHMMSS.log
anarqq-integrated-installer-YYYYMMDD-HHMMSS.log
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   # Run dependency check
   ./install-dependency-manager.sh
   ```

2. **Insufficient Disk Space**
   ```bash
   # Check space requirements
   ./verify-modular-system.sh
   ```

3. **Network Issues**
   ```bash
   # The installer automatically tries multiple download methods
   # Check logs for specific network errors
   ```

4. **Permission Issues**
   ```bash
   # Ensure scripts are executable
   chmod +x install-*.sh
   ```

### Validation

Run the verification script to check system integrity:
```bash
./verify-modular-system.sh
```

### Testing

Run the comprehensive test suite:
```bash
./test-modular-installer.sh
```

## Development

### Adding New Components

1. **Update Component Definitions** in `install-anarqq-modular.sh`:
   ```bash
   COMPONENTS["new-component"]="Description"
   COMPONENT_DEPS["new-component"]="core,backend"
   COMPONENT_SIZES["new-component"]="100"
   ```

2. **Add Repository Mapping** in `install-component-manager.sh`:
   ```bash
   COMPONENT_REPOS["new-component"]="https://github.com/user/repo"
   COMPONENT_INSTALL_CMDS["new-component"]="npm install"
   ```

3. **Create Setup Function**:
   ```bash
   setup_new_component() {
       local component="$1"
       local target_dir="$2"
       local verbose="$3"
       
       # Component-specific setup logic
       return 0
   }
   ```

### Testing New Components

```bash
# Test individual component
./test-modular-installer.sh test_component_manager

# Test full system
./verify-modular-system.sh
```

## Requirements Compliance

This implementation satisfies all requirements from the specification:

- **5.1**: ✅ Installation modes (minimal, full, development)
- **5.2**: ✅ Component-specific installation logic  
- **5.3**: ✅ Dependency validation between components
- **5.4**: ✅ Disk space checking and cleanup options
- **5.6**: ✅ Modular component management

## Support

- **GitHub**: https://github.com/AnarQorp
- **Email**: anarqorp@proton.me
- **Documentation**: Check the `docs/` directory for additional guides

## License

MIT License - See LICENSE file for details.

---

**AnarQ&Q Ecosystem Modular Installer v3.0**  
*Instalador modular avanzado para el ecosistema AnarQ&Q*
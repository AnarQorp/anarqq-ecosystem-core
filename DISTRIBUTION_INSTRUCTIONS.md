# 📦 AnarQ&Q Ecosystem Demo - Instrucciones de Distribución

## 🔒 Repositorio Privado con Distribución Pública

Este repositorio es **privado** pero los instaladores están disponibles públicamente a través de **GitHub Releases**.

### 🎯 Para Usuarios Finales

#### Opción 1: Descarga Directa desde Release
```bash
# Descargar paquete completo
wget https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz

# Extraer
tar -xzf anarqq-ecosystem-demo-installers-v1.0.0.tar.gz

# Ejecutar instalador
cd anarqq-ecosystem-demo-v1.0.0
./install-anarqq.sh
```

#### Opción 2: Descarga con curl
```bash
# Descargar y extraer en un comando
curl -L https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz | tar -xz

# Ejecutar instalador
cd anarqq-ecosystem-demo-v1.0.0
./install-anarqq.sh
```

### 🔗 Enlaces Públicos

- **Release Page**: https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/tag/v1.0.0
- **TAR.GZ**: https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.tar.gz
- **ZIP**: https://github.com/AnarQorp/anarqq-ecosystem-demo/releases/download/v1.0.0/anarqq-ecosystem-demo-installers-v1.0.0.zip

### 📋 Contenido del Paquete

```
anarqq-ecosystem-demo-v1.0.0/
├── install-anarqq.sh              # Instalador maestro
├── install-anarqq-demo.sh         # Bash (Linux/macOS)
├── install-anarqq-demo.py         # Python GUI
├── install-anarqq-demo.ps1        # PowerShell (Windows)
├── verify-installation.sh         # Verificación
├── README.md                      # Guía rápida
├── README-INSTALLERS.md           # Documentación completa
└── SHA256SUMS                     # Checksums
```

### 🛡️ Ventajas de esta Configuración

1. **Privacidad del Código**: El código fuente permanece privado
2. **Distribución Pública**: Los instaladores son accesibles públicamente
3. **Seguridad**: Control de acceso al repositorio principal
4. **Facilidad de Uso**: Los usuarios pueden descargar sin autenticación
5. **Versionado**: Releases organizados por versiones

### 📞 Soporte

- **Email**: anarqorp@proton.me
- **Acceso al Repositorio**: Contactar para solicitar acceso
- **Issues Públicos**: Disponibles en el release page

### 🔄 Actualización de Releases

Para crear nuevas releases:

1. Actualizar instaladores en el repositorio privado
2. Ejecutar `./create-release.sh` para generar paquetes
3. Crear nuevo release en GitHub con los archivos generados
4. Actualizar enlaces de distribución

---

**Nota**: Esta configuración permite mantener el código privado mientras facilita la distribución pública de instaladores.

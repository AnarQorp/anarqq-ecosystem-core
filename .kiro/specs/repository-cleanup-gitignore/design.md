# Design Document

## Overview

El diseño del sistema de filtrado mejorado para el `.gitignore` se enfoca en crear una estructura jerárquica y específica que mantenga solo los archivos esenciales del ecosistema AnarQ-Q. El diseño considera las diferentes categorías de archivos presentes en el proyecto y establece reglas claras para cada tipo.

## Architecture

### Estructura de Filtrado Jerárquica

El `.gitignore` se organizará en secciones temáticas:

1. **Core System Files** - Archivos que nunca deben ignorarse
2. **Development Dependencies** - node_modules, caches, etc.
3. **Build Artifacts** - Archivos generados automáticamente
4. **Ecosystem-Specific Exclusions** - Archivos específicos del proyecto AnarQ-Q
5. **Temporary and Log Files** - Archivos temporales y logs
6. **Test and Demo Artifacts** - Resultados de pruebas y demos

### Principios de Diseño

- **Inclusión por Defecto**: Solo ignorar lo que definitivamente no debe estar en el repositorio
- **Especificidad**: Reglas específicas para el ecosistema AnarQ-Q
- **Mantenibilidad**: Estructura clara y comentada
- **Performance**: Evitar patrones complejos que ralenticen Git

## Components and Interfaces

### 1. Core Preservation Rules
- Mantener archivos fuente (.js, .mjs, .ts, .tsx, .sol)
- Mantener archivos de configuración esenciales
- Mantener documentación core (README.md, docs/ principales)
- Mantener scripts de instalación principales

### 2. Ecosystem-Specific Filters
- Ignorar logs de instaladores (`*.log`, `anarqq-*.log`)
- Ignorar archivos de distribución empaquetados (`*.tar.gz`, `*.zip`)
- Ignorar carpetas de rollback (`.rollback/`)
- Ignorar artefactos de prueba temporales

### 3. Development Environment Filters
- node_modules y dependencias
- Archivos de build y dist
- Caches y archivos temporales
- Archivos de IDE específicos

### 4. Size-Based Filtering
- Ignorar archivos grandes que no sean esenciales
- Mantener archivos de configuración independientemente del tamaño

## Data Models

### Categorías de Archivos

```
EcosystemFiles:
  - Core: [src/, modules/, libs/, contracts/]
  - Config: [package.json, tsconfig.json, *.config.js]
  - Scripts: [install-*.sh, scripts/]
  - Docs: [README.md, docs/core/]

IgnoredFiles:
  - Temporary: [*.log, tmp/, temp/]
  - Generated: [dist/, build/, artifacts/]
  - Testing: [test-results/, test-*/, *-test-*]
  - Distribution: [*.tar.gz, *.zip, *-release/]
```

### Patrones de Exclusión

```
# Patrones específicos del ecosistema
anarqq-*-installer-*.log
test-unified-installer-*/
*-test-results/
comprehensive-*-report.*
*-implementation-summary.md
```

## Error Handling

### Casos Edge

1. **Archivos Grandes Esenciales**: Usar `!` para forzar inclusión de archivos importantes
2. **Conflictos de Patrones**: Orden específico de reglas para evitar conflictos
3. **Archivos de Configuración Sensibles**: Balance entre seguridad y funcionalidad

### Validación

- Script de validación para verificar que archivos esenciales no sean ignorados
- Checklist de archivos core que deben estar presentes
- Alertas para archivos grandes que podrían necesitar revisión

## Testing Strategy

### 1. Validation Script
Crear un script que verifique:
- Archivos esenciales del ecosistema están presentes
- Archivos temporales son ignorados correctamente
- Tamaño del repositorio se reduce significativamente

### 2. Before/After Comparison
- Comparar estructura del repositorio antes y después
- Verificar que funcionalidad core no se vea afectada
- Confirmar que instaladores principales funcionan

### 3. Integration Testing
- Probar clonado del repositorio
- Verificar que build process funciona
- Confirmar que demos principales funcionan

## Implementation Considerations

### Migración Gradual
1. Backup del .gitignore actual
2. Implementación por fases
3. Validación en cada fase
4. Rollback plan si es necesario

### Mantenimiento
- Documentar razones para cada regla
- Revisión periódica de efectividad
- Actualización basada en evolución del proyecto

### Performance Impact
- Minimizar uso de patrones complejos
- Agrupar reglas relacionadas
- Comentarios claros para mantenimiento futuro
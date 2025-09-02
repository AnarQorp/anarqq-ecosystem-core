# Vinculación de Identidad Pi con sQuid

## Resumen

Guía para vincular identidades Pi Network con sQuid para autenticación unificada y gestión de permisos.

## Prerrequisitos

- Identidad Pi Network válida
- Instancia sQuid configurada
- Acceso a Pi Browser o Pi SDK

## Proceso de Vinculación

### 1. Preparar Credenciales

```javascript
// Obtener credenciales Pi del usuario
const piCredentials = {
  piUserId: 'pi_user_123',
  accessToken: 'pi_access_token_xyz',
  publicKey: '0x...',
  signature: '0x...'
};

// Preparar identidad sQuid
const squidId = 'squid_abc_456';
```

### 2. Ejecutar Vinculación

```javascript
import { PiIntegrationLayer } from '@anarq/pi-integration';

const piIntegration = new PiIntegrationLayer();
await piIntegration.initialize();

// Vincular identidades
const linkingResult = await piIntegration.linkPiIdentity(
  squidId,
  piCredentials.piUserId,
  {
    verificationMethod: 'signature',
    expiresIn: '30d'
  }
);

if (linkingResult.success) {
  console.log('Vinculación exitosa:', linkingResult.bindingId);
  console.log('Hash de vinculación:', linkingResult.bindingHash);
  console.log('Expira en:', linkingResult.expiresAt);
}
```

### 3. Verificar Vinculación

```javascript
// Verificar estado de vinculación
const binding = await piIntegration.getIdentityBinding(squidId);

if (binding && binding.status === 'VERIFIED') {
  console.log('Identidad verificada:', {
    squidId: binding.squidId,
    piUserId: binding.piUserId,
    verificationMethod: binding.verificationMethod,
    bindingHash: binding.metadata.bindingHash
  });
}
```

## Métodos de Verificación

### Verificación por Firma

```javascript
// Generar prueba de vinculación con firma
const bindingProof = await piIntegration.generateIdentityBindingProof(
  squidId,
  piUserId,
  'signature'
);

console.log('Prueba de vinculación:', {
  method: bindingProof.method,
  signature: bindingProof.signature,
  timestamp: bindingProof.timestamp,
  nonce: bindingProof.nonce
});
```

### Verificación por Token

```javascript
// Verificación usando token Pi
const tokenProof = await piIntegration.generateIdentityBindingProof(
  squidId,
  piUserId,
  'token'
);
```

## Gestión de Permisos

### Configurar Scopes Qonsent

```javascript
// Definir permisos para identidad vinculada
const qonsentScopes = [
  'qwallet:read',
  'qwallet:transaction',
  'qindex:read',
  'qerberos:audit'
];

await piIntegration.configureQonsentScopes(
  bindingId,
  qonsentScopes
);
```

### Validar Permisos

```javascript
// Verificar permisos antes de operaciones
const hasPermission = await piIntegration.validateQonsentScope(
  bindingId,
  'qwallet:transaction'
);

if (hasPermission) {
  // Proceder con transacción
  await executeTransaction();
}
```

## Renovación y Expiración

### Renovar Vinculación

```javascript
// Renovar vinculación antes de expiración
const renewalResult = await piIntegration.renewIdentityBinding(
  bindingId,
  {
    expiresIn: '60d',
    updateVerification: true
  }
);

if (renewalResult.success) {
  console.log('Vinculación renovada hasta:', renewalResult.newExpiresAt);
}
```

### Manejar Expiración

```javascript
// Verificar estado de expiración
const expirationStatus = await piIntegration.checkBindingExpiration(bindingId);

if (expirationStatus.isExpired) {
  console.log('Vinculación expirada, requiere renovación');
  
  // Notificar al usuario
  await notifyUserOfExpiration(squidId, expirationStatus.expiredAt);
}
```

## Seguridad

### Mejores Prácticas

1. **Rotación de Claves**
   - Rotar claves de vinculación regularmente
   - Usar períodos de expiración apropiados

2. **Validación de Firmas**
   - Verificar todas las firmas antes de procesar
   - Usar nonces para prevenir ataques de replay

3. **Auditoría**
   - Registrar todas las operaciones de vinculación
   - Monitorear intentos de vinculación fallidos

### Configuración de Seguridad

```javascript
// Configurar parámetros de seguridad
const securityConfig = {
  maxBindingAttempts: 3,
  bindingCooldown: '5m',
  signatureAlgorithm: 'ed25519',
  nonceExpiration: '10m',
  auditLevel: 'full'
};

await piIntegration.configureBindingSecurity(securityConfig);
```

---

*Última Actualización: 2025-08-31T09:42:47.569Z*  
*Generado por: DocumentationGenerator v1.0.0*

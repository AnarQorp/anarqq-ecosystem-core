# Solución de Problemas Pi Integration

## Resumen

Guía para resolver problemas comunes en la integración Pi Network.

## Problemas de Conexión

### Error: "No se puede conectar a Pi Network"

**Síntomas:**
- Timeouts en llamadas API
- Errores de red
- Fallos de inicialización

**Soluciones:**

1. **Verificar configuración de entorno**
   ```javascript
   const config = piIntegration.getEnvironmentConfig();
   console.log('Configuración actual:', config);
   ```

2. **Validar conectividad**
   ```javascript
   const connectivity = await piIntegration.validateEnvironmentConnections('testnet');
   if (!connectivity.valid) {
     console.log('Problema de conectividad:', connectivity.error);
   }
   ```

3. **Verificar variables de entorno**
   ```bash
   echo $PI_API_KEY
   echo $PI_APP_ID
   echo $PI_WEBHOOK_SECRET
   ```

## Problemas de Autenticación

### Error: "Credenciales Pi inválidas"

**Causas comunes:**
- API key expirada o inválida
- App ID incorrecto
- Permisos insuficientes

**Diagnóstico:**
```javascript
// Verificar credenciales
try {
  await piIntegration.validatePiCredentials({
    piUserId: 'test_user',
    accessToken: 'test_token',
    walletAddress: '0x...'
  });
  console.log('Credenciales válidas');
} catch (error) {
  console.error('Error de credenciales:', error.message);
}
```

## Problemas de Transacciones

### Transacciones Lentas o Fallidas

**Diagnóstico de transacciones:**
```javascript
// Verificar estado de transacción
const transaction = piIntegration.piTransactions.get(transactionId);
console.log('Estado:', transaction.status);
console.log('Confirmaciones:', transaction.confirmations);
console.log('Requeridas:', transaction.requiredConfirmations);

// Verificar gas y fees
if (transaction.error && transaction.error.includes('gas')) {
  console.log('Problema de gas detectado');
  
  const gasEstimate = await piIntegration.estimateContractGas(
    transaction.contractCode,
    transaction.constructorArgs
  );
  console.log('Gas recomendado:', gasEstimate.estimated);
}
```

**Soluciones:**
1. Aumentar límite de gas
2. Verificar saldo suficiente
3. Reintentar con prioridad más alta

## Problemas de Contratos

### Error: "Despliegue de contrato fallido"

**Validación de código:**
```javascript
try {
  await piIntegration.validateContractCode(contractCode);
  console.log('Código de contrato válido');
} catch (error) {
  console.error('Error de validación:', error.message);
}
```

**Verificación de estado:**
```javascript
const stateValidation = await piIntegration.validateContractState(
  contractId,
  expectedState
);

if (!stateValidation.valid) {
  console.log('Problemas de estado:');
  stateValidation.validationResults.forEach(result => {
    if (!result.valid) {
      console.log(`- ${result.property}: esperado ${result.expected}, actual ${result.actual}`);
    }
  });
}
```

## Problemas de Compatibilidad

### Pi Browser CSP Errors

**Verificar CSP:**
```javascript
const cspResult = await piIntegration.checkPiBrowserCSP();

if (!cspResult.valid) {
  console.log('Headers faltantes:', cspResult.missingHeaders);
  console.log('Directivas requeridas:');
  
  piData.browserCompatibility.cspDirectives.forEach(directive => {
    console.log(`- ${directive}`);
  });
}
```

**Configuración correcta:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://sdk.minepi.com;
  connect-src 'self' https://api.minepi.com;
  frame-src https://sdk.minepi.com
">
```

## Herramientas de Diagnóstico

### Script de Diagnóstico Completo

```javascript
class PiIntegrationDiagnostics {
  constructor(piIntegration) {
    this.piIntegration = piIntegration;
  }

  async runFullDiagnostics() {
    const results = {
      environment: await this.checkEnvironment(),
      connectivity: await this.checkConnectivity(),
      credentials: await this.checkCredentials(),
      browserCompatibility: await this.checkBrowserCompatibility(),
      integrations: await this.checkIntegrations(),
      contracts: await this.checkContracts(),
      transactions: await this.checkTransactions()
    };

    this.generateDiagnosticReport(results);
    return results;
  }

  async checkEnvironment() {
    try {
      const config = this.piIntegration.getEnvironmentConfig();
      return {
        status: 'ok',
        current: config.current,
        available: config.available,
        mainnetEnabled: config.mainnetEnabled
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkConnectivity() {
    try {
      const environments = ['sandbox', 'testnet'];
      const results = {};
      
      for (const env of environments) {
        results[env] = await this.piIntegration.validateEnvironmentConnections(env);
      }
      
      return { status: 'ok', results };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkCredentials() {
    try {
      // Verificar que las credenciales estén configuradas
      const secrets = this.piIntegration.secrets;
      const configured = {
        piApiKey: !!secrets.piApiKey,
        piAppId: !!secrets.piAppId,
        piWebhookSecret: !!secrets.piWebhookSecret,
        piPrivateKey: !!secrets.piPrivateKey
      };
      
      return { status: 'ok', configured };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkBrowserCompatibility() {
    try {
      const compatibility = await this.piIntegration.validatePiBrowserCompatibility([
        '/api/pi/test'
      ]);
      
      const csp = await this.piIntegration.checkPiBrowserCSP();
      
      return {
        status: 'ok',
        compatibility: compatibility.compatible,
        csp: csp.valid,
        issues: [...(compatibility.issues || []), ...(csp.missingHeaders || [])]
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkIntegrations() {
    try {
      const integrations = Array.from(this.piIntegration.walletIntegrations.values());
      const active = integrations.filter(i => i.status === 'ACTIVE').length;
      const total = integrations.length;
      
      return {
        status: 'ok',
        total,
        active,
        inactive: total - active
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkContracts() {
    try {
      const contracts = Array.from(this.piIntegration.smartContracts.values());
      const deployed = contracts.filter(c => c.status === 'DEPLOYED').length;
      const total = contracts.length;
      
      return {
        status: 'ok',
        total,
        deployed,
        failed: contracts.filter(c => c.status === 'FAILED').length
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async checkTransactions() {
    try {
      const transactions = Array.from(this.piIntegration.piTransactions.values());
      const successful = transactions.filter(t => t.status === 'CONFIRMED').length;
      const pending = transactions.filter(t => t.status === 'PENDING' || t.status === 'SUBMITTED').length;
      const failed = transactions.filter(t => t.status === 'FAILED').length;
      
      return {
        status: 'ok',
        total: transactions.length,
        successful,
        pending,
        failed
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  generateDiagnosticReport(results) {
    console.log('\n=== REPORTE DE DIAGNÓSTICO PI INTEGRATION ===\n');
    
    Object.entries(results).forEach(([category, result]) => {
      console.log(`${category.toUpperCase()}: ${result.status}`);
      if (result.status === 'error') {
        console.log(`  Error: ${result.error}`);
      } else {
        Object.entries(result).forEach(([key, value]) => {
          if (key !== 'status') {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
          }
        });
      }
      console.log('');
    });
  }
}

// Uso del diagnóstico
const diagnostics = new PiIntegrationDiagnostics(piIntegration);
const report = await diagnostics.runFullDiagnostics();
```

## Contacto y Soporte

Si los problemas persisten:

1. Ejecutar diagnóstico completo
2. Revisar logs de Qerberos para auditoría
3. Contactar soporte técnico con reporte de diagnóstico

---

*Última Actualización: 2025-08-31T09:42:47.571Z*  
*Generado por: DocumentationGenerator v1.0.0*

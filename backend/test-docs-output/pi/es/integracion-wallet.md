# Integración Pi Wallet con Qwallet

## Resumen

Esta guía explica cómo integrar Pi Wallet con Qwallet para transacciones cross-chain y gestión unificada de identidades.

## Prerrequisitos

### Requisitos del Sistema

- Node.js 18+
- Pi Network Developer Account
- Acceso a Pi Browser o Pi SDK
- Instancia Qwallet configurada

### Variables de Entorno

```bash
PI_API_KEY=your_pi_api_key
PI_APP_ID=your_pi_app_id
PI_WEBHOOK_SECRET=your_webhook_secret
PI_PRIVATE_KEY=your_private_key
```

## Instalación

```bash
npm install @anarq/pi-integration
```

## Configuración

### Configuración Básica

```javascript
import { PiIntegrationLayer } from '@anarq/pi-integration';
import { QwalletIntegrationService } from '@anarq/qwallet';

const piIntegration = new PiIntegrationLayer({
  environment: 'sandbox', // sandbox, testnet, mainnet
  eventBus: eventBusInstance,
  observability: observabilityInstance
});

await piIntegration.initialize();
```

### Configuración de Entornos

| Entorno | Descripción | Endpoint API |
|-----------|-------------|-------------|
| sandbox | Entorno de desarrollo y pruebas | https://api.minepi.com/v2/sandbox |
| testnet | Red de pruebas pre-producción | https://api.minepi.com/v2/testnet |
| mainnet | Red Pi Network de producción | https://api.minepi.com/v2 |

## Uso

### Integrar Pi Wallet

```javascript
// Integrar Pi Wallet con instancia Qwallet existente
const integrationResult = await piIntegration.integratePiWallet(
  qwalletInstance,
  {
    piUserId: 'pi_user_123',
    accessToken: 'pi_access_token',
    walletAddress: '0x...',
    walletVersion: '2.0.0'
  }
);

if (integrationResult.success) {
  console.log('Integración exitosa:', integrationResult.integrationId);
  console.log('Características disponibles:', integrationResult.features);
} else {
  console.error('Error de integración:', integrationResult.error);
}
```

### Ejecutar Transacciones Cross-Chain

```javascript
// Ejecutar transacción Pi con contexto Qflow
const transactionResult = await piIntegration.executePiTransaction(
  {
    fromSquidId: 'squid_123',
    toAddress: '0x...',
    amount: 10.5,
    currency: 'PI',
    memo: 'Pago por servicios'
  },
  {
    workflowId: 'qflow_workflow_456',
    executionId: 'exec_789',
    stepId: 'payment_step'
  }
);

if (transactionResult.success) {
  console.log('Transacción enviada:', transactionResult.txHash);
  console.log('Confirmaciones requeridas:', transactionResult.requiredConfirmations);
}
```

### Sincronizar Balances

```javascript
// Sincronizar balances entre Pi Wallet y Qwallet
const syncResult = await piIntegration.syncWalletBalances(integrationId);

console.log('Balances sincronizados:', {
  pi: syncResult.balances.pi,
  qtoken: syncResult.balances.qtoken,
  lastSync: syncResult.lastSyncAt
});
```

## Ejemplos

### Ejemplo Completo de Integración

```javascript
import { PiIntegrationLayer } from '@anarq/pi-integration';
import { QwalletIntegrationService } from '@anarq/qwallet';

class PiWalletDemo {
  constructor() {
    this.piIntegration = new PiIntegrationLayer({
      environment: 'sandbox'
    });
    this.qwallet = new QwalletIntegrationService();
  }

  async initialize() {
    await this.piIntegration.initialize();
    await this.qwallet.initialize();
  }

  async demonstrateIntegration() {
    try {
      // 1. Crear instancia Qwallet
      const qwalletInstance = await this.qwallet.createWallet({
        squidId: 'demo_squid_123',
        walletType: 'standard'
      });

      // 2. Integrar con Pi Wallet
      const integration = await this.piIntegration.integratePiWallet(
        qwalletInstance,
        {
          piUserId: 'demo_pi_user',
          accessToken: 'demo_token',
          walletAddress: '0x1234567890abcdef'
        }
      );

      // 3. Ejecutar transacción de prueba
      const transaction = await this.piIntegration.executePiTransaction(
        {
          fromSquidId: 'demo_squid_123',
          toAddress: '0xabcdef1234567890',
          amount: 1.0,
          currency: 'PI',
          memo: 'Transacción de prueba'
        }
      );

      return {
        integration: integration.success,
        transaction: transaction.success,
        integrationId: integration.integrationId,
        txHash: transaction.txHash
      };
    } catch (error) {
      console.error('Error en demo:', error);
      throw error;
    }
  }
}

// Uso del demo
const demo = new PiWalletDemo();
await demo.initialize();
const result = await demo.demonstrateIntegration();
console.log('Resultado del demo:', result);
```

## Solución de Problemas

### Problemas Comunes

#### Error: "Pi API Key inválida"

**Solución**: Verifica que PI_API_KEY esté configurada correctamente en las variables de entorno.

#### Error: "Integración Pi Wallet no encontrada"

**Solución**: Asegúrate de que la integración se haya completado exitosamente antes de ejecutar transacciones.

#### Transacciones Lentas

**Solución**: Verifica la configuración del entorno y el número de confirmaciones requeridas.

---

*Última Actualización: 2025-08-31T09:42:47.568Z*  
*Generado por: DocumentationGenerator v1.0.0*

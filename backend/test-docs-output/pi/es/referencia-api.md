# Referencia API Pi Integration

## Resumen

Referencia completa de la API para integración Pi Network con el ecosistema AnarQ&Q.

## PiIntegrationLayer

### Constructor

```javascript
new PiIntegrationLayer(options)
```

**Parámetros:**
- `options` (Object): Opciones de configuración
  - `environment` (string): Entorno Pi (sandbox/testnet/mainnet)
  - `eventBus` (EventBusService): Instancia del bus de eventos
  - `observability` (ObservabilityService): Servicio de observabilidad

### Métodos

#### `initialize()`

Inicializa el servicio de integración Pi.

**Retorna:** `Promise<void>`

```javascript
await piIntegration.initialize();
```

#### `setEnvironment(environment)`

Configura el entorno Pi Network.

**Parámetros:**
- `environment` (string): Entorno objetivo (sandbox/testnet/mainnet)

```javascript
piIntegration.setEnvironment('testnet');
```

#### `integratePiWallet(qwalletInstance, piCredentials)`

Integra Pi Wallet con Qwallet.

**Parámetros:**
- `qwalletInstance` (Object): Instancia Qwallet
- `piCredentials` (Object): Credenciales Pi Network
  - `piUserId` (string): ID de usuario Pi
  - `accessToken` (string): Token de acceso Pi
  - `walletAddress` (string): Dirección de wallet Pi

**Retorna:** `Promise<IntegrationResult>`

```javascript
const result = await piIntegration.integratePiWallet(qwallet, {
  piUserId: 'pi_user_123',
  accessToken: 'token_xyz',
  walletAddress: '0x...'
});
```

#### `linkPiIdentity(squidId, piUserId, options)`

Vincula identidad Pi con sQuid.

**Parámetros:**
- `squidId` (string): ID de identidad sQuid
- `piUserId` (string): ID de usuario Pi
- `options` (Object): Opciones de vinculación
  - `verificationMethod` (string): Método de verificación
  - `expiresIn` (string): Tiempo de expiración

**Retorna:** `Promise<LinkingResult>`

#### `deployPiSmartContract(contractCode, qflowWorkflow)`

Despliega contrato inteligente Pi.

**Parámetros:**
- `contractCode` (string): Código del contrato
- `qflowWorkflow` (Object): Configuración Qflow

**Retorna:** `Promise<DeploymentResult>`

#### `executePiTransaction(transactionData, qflowContext)`

Ejecuta transacción Pi.

**Parámetros:**
- `transactionData` (Object): Datos de transacción
- `qflowContext` (Object): Contexto Qflow

**Retorna:** `Promise<TransactionResult>`

## Tipos de Datos

### IntegrationResult

```typescript
interface IntegrationResult {
  success: boolean;
  integrationId?: string;
  status?: string;
  features?: string[];
  balances?: {
    pi: number;
    qtoken: number;
  };
  error?: string;
}
```

### LinkingResult

```typescript
interface LinkingResult {
  success: boolean;
  bindingId?: string;
  bindingHash?: string;
  status?: string;
  expiresAt?: string;
  error?: string;
}
```

### DeploymentResult

```typescript
interface DeploymentResult {
  success: boolean;
  contractId?: string;
  contractAddress?: string;
  deploymentTxHash?: string;
  gasUsed?: number;
  gasEstimate?: GasEstimate;
  status?: string;
  error?: string;
}
```

### TransactionResult

```typescript
interface TransactionResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  status?: string;
  requiredConfirmations?: number;
  qflowContext?: QflowContext;
  error?: string;
}
```

## Códigos de Error

| Código | Descripción |
|-------|-------------|
| `PI_INVALID_CREDENTIALS` | Credenciales Pi inválidas |
| `PI_INTEGRATION_NOT_FOUND` | Integración Pi no encontrada |
| `PI_IDENTITY_BINDING_FAILED` | Fallo en vinculación de identidad |
| `PI_CONTRACT_DEPLOYMENT_FAILED` | Fallo en despliegue de contrato |
| `PI_TRANSACTION_FAILED` | Fallo en transacción Pi |
| `PI_INSUFFICIENT_PERMISSIONS` | Permisos insuficientes |
| `PI_ENVIRONMENT_NOT_SUPPORTED` | Entorno no soportado |

---

*Última Actualización: 2025-08-31T09:42:47.571Z*  
*Generado por: DocumentationGenerator v1.0.0*

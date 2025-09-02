# Contratos Inteligentes Pi Network

## Resumen

Guía completa para desplegar y gestionar contratos inteligentes Pi Network integrados con Qflow.

## Prerrequisitos

- Conocimiento básico de Solidity
- Cuenta Pi Network Developer
- Acceso a Pi Testnet/Mainnet
- Instancia Qflow configurada

## Plantillas de Contratos

### Contrato de Pagos

```solidity
// Contrato básico para gestión de pagos Pi
contract PiPaymentContract {
    address public owner;
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    function deposit() public payable {
        require(msg.value > 0, "Monto debe ser mayor a 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Saldo insuficiente");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }
    
    function getBalance(address account) public view returns (uint256) {
        return balances[account];
    }
}
```

### Contrato de Gobernanza

```solidity
// Contrato para votaciones y gobernanza descentralizada
contract PiGovernanceContract {
    address public owner;
    mapping(bytes32 => uint256) public votes;
    mapping(bytes32 => bool) public proposals;
    mapping(bytes32 => mapping(address => bool)) public hasVoted;
    
    event ProposalCreated(bytes32 indexed proposalId, string description);
    event VoteCast(bytes32 indexed proposalId, address indexed voter);
    
    constructor() {
        owner = msg.sender;
    }
    
    function createProposal(bytes32 proposalId, string memory description) public {
        require(msg.sender == owner, "Solo el propietario puede crear propuestas");
        require(!proposals[proposalId], "La propuesta ya existe");
        
        proposals[proposalId] = true;
        emit ProposalCreated(proposalId, description);
    }
    
    function vote(bytes32 proposalId) public {
        require(proposals[proposalId], "La propuesta no existe");
        require(!hasVoted[proposalId][msg.sender], "Ya has votado");
        
        votes[proposalId] += 1;
        hasVoted[proposalId][msg.sender] = true;
        emit VoteCast(proposalId, msg.sender);
    }
    
    function getVotes(bytes32 proposalId) public view returns (uint256) {
        return votes[proposalId];
    }
}
```

## Despliegue de Contratos

### Despliegue Básico

```javascript
import { PiIntegrationLayer } from '@anarq/pi-integration';

const piIntegration = new PiIntegrationLayer({
  environment: 'testnet' // Usar testnet para pruebas
});

await piIntegration.initialize();

// Desplegar contrato de pagos
const deploymentResult = await piIntegration.deployPiSmartContract(
  paymentContractCode,
  {
    contractName: 'PiPaymentContract',
    contractVersion: '1.0.0',
    gasLimit: 200000,
    constructorArgs: [],
    qflowIntegration: {
      workflowId: 'payment_workflow_123',
      triggerEvents: ['Deposit', 'Withdrawal'],
      callbackEndpoints: ['/api/payment/callback'],
      stateValidation: {
        owner: '0x...',
        isActive: true
      }
    }
  }
);

if (deploymentResult.success) {
  console.log('Contrato desplegado:', deploymentResult.contractAddress);
  console.log('Hash de transacción:', deploymentResult.deploymentTxHash);
  console.log('Gas utilizado:', deploymentResult.gasUsed);
}
```

### Despliegue con Integración Qflow

```javascript
// Configurar integración avanzada con Qflow
const qflowIntegration = {
  workflowId: 'governance_workflow_456',
  triggerEvents: ['ProposalCreated', 'VoteCast'],
  callbackEndpoints: [
    '/api/governance/proposal-created',
    '/api/governance/vote-cast'
  ],
  stateValidation: {
    owner: expectedOwnerAddress,
    isActive: true,
    minVotes: 10
  }
};

const governanceDeployment = await piIntegration.deployPiSmartContract(
  governanceContractCode,
  {
    contractName: 'PiGovernanceContract',
    contractVersion: '2.0.0',
    gasLimit: 300000,
    qflowIntegration
  }
);
```

## Estimación de Gas y Costos

### Estimación Automática

```javascript
// Estimar gas antes del despliegue
const gasEstimate = await piIntegration.estimateContractGas(
  contractCode,
  constructorArgs
);

console.log('Estimación de gas:', {
  estimated: gasEstimate.estimated,
  maximum: gasEstimate.maximum,
  baseFee: gasEstimate.baseFee,
  complexityFee: gasEstimate.complexityFee,
  argumentsFee: gasEstimate.argumentsFee
});
```

### Límites por Entorno

| Entorno | Límite Gas | Confirmaciones |
|-----------|------------|---------------|
| sandbox | 100000 | 1 |
| testnet | 200000 | 3 |
| mainnet | 300000 | 6 |

## Validación de Estado

```javascript
// Validar estado del contrato
const validationResult = await piIntegration.validateContractState(
  contractId,
  {
    owner: expectedOwnerAddress,
    balance: expectedBalance,
    isActive: true
  }
);

if (validationResult.valid) {
  console.log('Estado del contrato válido');
} else {
  console.log('Problemas de validación:', validationResult.validationResults);
}
```

## Monitoreo y Eventos

### Suscripción a Eventos

```javascript
// Suscribirse a eventos del contrato
await piIntegration.subscribeToContractEvent(
  contractId,
  'Deposit',
  'payment_workflow_123'
);

await piIntegration.subscribeToContractEvent(
  contractId,
  'Withdrawal',
  'payment_workflow_123'
);
```

### Callbacks Qflow

```javascript
// Registrar endpoints de callback
await piIntegration.registerContractCallback(
  contractId,
  '/api/contracts/state-changed'
);
```

---

*Última Actualización: 2025-08-31T09:42:47.569Z*  
*Generado por: DocumentationGenerator v1.0.0*

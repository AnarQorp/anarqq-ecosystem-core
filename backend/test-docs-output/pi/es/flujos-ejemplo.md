# Flujos de Ejemplo Pi Integration

## Resumen

Ejemplos completos de flujos de trabajo para integración Pi Network con el ecosistema AnarQ&Q.

## Flujo 1: Registro y Autenticación

### Descripción
Flujo completo para registrar un nuevo usuario Pi y vincularlo con sQuid.

```javascript
class PiRegistrationWorkflow {
  constructor() {
    this.piIntegration = new PiIntegrationLayer();
    this.squidService = new SquidService();
  }

  async executeRegistrationFlow(piUserData) {
    try {
      // Paso 1: Crear identidad sQuid
      const squidResult = await this.squidService.createIdentity({
        username: piUserData.username,
        email: piUserData.email,
        metadata: {
          piUserId: piUserData.piUserId,
          registrationSource: 'pi_network'
        }
      });

      // Paso 2: Vincular identidad Pi
      const linkingResult = await this.piIntegration.linkPiIdentity(
        squidResult.squidId,
        piUserData.piUserId,
        {
          verificationMethod: 'signature',
          expiresIn: '90d'
        }
      );

      // Paso 3: Configurar Qwallet
      const qwalletResult = await this.piIntegration.integratePiWallet(
        squidResult.qwalletInstance,
        {
          piUserId: piUserData.piUserId,
          accessToken: piUserData.accessToken,
          walletAddress: piUserData.walletAddress
        }
      );

      // Paso 4: Configurar permisos
      await this.piIntegration.configureQonsentScopes(
        linkingResult.bindingId,
        ['qwallet:read', 'qwallet:transaction', 'qindex:read']
      );

      return {
        success: true,
        squidId: squidResult.squidId,
        bindingId: linkingResult.bindingId,
        integrationId: qwalletResult.integrationId,
        message: 'Registro completado exitosamente'
      };
    } catch (error) {
      console.error('Error en registro:', error);
      return { success: false, error: error.message };
    }
  }
}

// Uso del flujo
const workflow = new PiRegistrationWorkflow();
const result = await workflow.executeRegistrationFlow({
  piUserId: 'pi_user_123',
  username: 'john_doe',
  email: 'john@example.com',
  accessToken: 'pi_token_xyz',
  walletAddress: '0x...'
});
```

## Flujo 2: Pago Cross-Chain

### Descripción
Flujo para ejecutar pagos entre Pi Network y Qwallet con validación completa.

```javascript
class CrossChainPaymentWorkflow {
  constructor() {
    this.piIntegration = new PiIntegrationLayer();
    this.qflowService = new QflowService();
  }

  async executeCrossChainPayment(paymentData) {
    const workflowId = `payment_${crypto.randomBytes(8).toString('hex')}`;
    
    try {
      // Paso 1: Validar identidad y permisos
      const binding = await this.piIntegration.getIdentityBinding(paymentData.fromSquidId);
      if (!binding || binding.status !== 'VERIFIED') {
        throw new Error('Identidad Pi no verificada');
      }

      const hasPermission = await this.piIntegration.validateQonsentScope(
        binding.bindingId,
        'qwallet:transaction'
      );
      if (!hasPermission) {
        throw new Error('Permisos insuficientes para transacción');
      }

      // Paso 2: Iniciar workflow Qflow
      const qflowExecution = await this.qflowService.startWorkflow({
        workflowId,
        type: 'cross_chain_payment',
        steps: [
          'validate_balances',
          'execute_pi_transaction',
          'update_qwallet_balance',
          'audit_transaction'
        ]
      });

      // Paso 3: Ejecutar transacción Pi
      const piTransaction = await this.piIntegration.executePiTransaction(
        {
          fromSquidId: paymentData.fromSquidId,
          toAddress: paymentData.toAddress,
          amount: paymentData.amount,
          currency: 'PI',
          memo: paymentData.memo
        },
        {
          workflowId,
          executionId: qflowExecution.executionId,
          stepId: 'execute_pi_transaction'
        }
      );

      // Paso 4: Actualizar Qwallet
      await this.qflowService.executeStep(qflowExecution.executionId, 'update_qwallet_balance', {
        squidId: paymentData.fromSquidId,
        amount: paymentData.amount,
        transactionHash: piTransaction.txHash
      });

      // Paso 5: Auditoría
      await this.qflowService.executeStep(qflowExecution.executionId, 'audit_transaction', {
        piTransactionHash: piTransaction.txHash,
        qwalletTransactionId: paymentData.qwalletTransactionId,
        auditLevel: 'full'
      });

      return {
        success: true,
        workflowId,
        piTransactionHash: piTransaction.txHash,
        qflowExecutionId: qflowExecution.executionId,
        message: 'Pago cross-chain completado'
      };
    } catch (error) {
      console.error('Error en pago cross-chain:', error);
      
      // Rollback en caso de error
      if (qflowExecution) {
        await this.qflowService.rollbackWorkflow(qflowExecution.executionId);
      }
      
      return { success: false, error: error.message };
    }
  }
}
```

## Flujo 3: Despliegue de Contrato con Gobernanza

### Descripción
Flujo para desplegar contratos inteligentes Pi con aprobación DAO y integración Qflow.

```javascript
class GovernanceContractDeploymentWorkflow {
  constructor() {
    this.piIntegration = new PiIntegrationLayer();
    this.daoService = new DAOService();
    this.qflowService = new QflowService();
  }

  async executeGovernanceDeployment(deploymentData) {
    const proposalId = `contract_proposal_${crypto.randomBytes(8).toString('hex')}`;
    
    try {
      // Paso 1: Crear propuesta DAO
      const proposal = await this.daoService.createProposal({
        proposalId,
        type: 'CONTRACT_DEPLOYMENT',
        title: deploymentData.contractName,
        description: deploymentData.description,
        contractCode: deploymentData.contractCode,
        requiredVotes: 10,
        votingPeriod: '7d'
      });

      // Paso 2: Período de votación
      console.log(`Propuesta creada: ${proposalId}`);
      console.log(`Votación abierta hasta: ${proposal.votingEndsAt}`);

      // Simular votación (en implementación real, esto sería asíncrono)
      await this.simulateVotingProcess(proposalId);

      // Paso 3: Verificar resultado de votación
      const votingResult = await this.daoService.getVotingResult(proposalId);
      if (!votingResult.approved) {
        throw new Error(`Propuesta rechazada: ${votingResult.reason}`);
      }

      // Paso 4: Desplegar contrato
      const deploymentResult = await this.piIntegration.deployPiSmartContract(
        deploymentData.contractCode,
        {
          contractName: deploymentData.contractName,
          contractVersion: deploymentData.version,
          qflowIntegration: {
            workflowId: `governance_${proposalId}`,
            triggerEvents: deploymentData.triggerEvents,
            callbackEndpoints: deploymentData.callbackEndpoints
          }
        }
      );

      // Paso 5: Registrar en DAO
      await this.daoService.registerDeployedContract({
        proposalId,
        contractId: deploymentResult.contractId,
        contractAddress: deploymentResult.contractAddress,
        deploymentTxHash: deploymentResult.deploymentTxHash
      });

      return {
        success: true,
        proposalId,
        contractId: deploymentResult.contractId,
        contractAddress: deploymentResult.contractAddress,
        votingResult,
        message: 'Contrato desplegado con aprobación DAO'
      };
    } catch (error) {
      console.error('Error en despliegue con gobernanza:', error);
      return { success: false, error: error.message };
    }
  }

  async simulateVotingProcess(proposalId) {
    // Simular votos (implementación de ejemplo)
    const votes = [
      { voter: 'dao_member_1', vote: 'yes' },
      { voter: 'dao_member_2', vote: 'yes' },
      { voter: 'dao_member_3', vote: 'yes' },
      { voter: 'dao_member_4', vote: 'no' },
      { voter: 'dao_member_5', vote: 'yes' }
    ];

    for (const vote of votes) {
      await this.daoService.castVote(proposalId, vote.voter, vote.vote);
    }
  }
}
```

---

*Última Actualización: 2025-08-31T09:42:47.570Z*  
*Generado por: DocumentationGenerator v1.0.0*

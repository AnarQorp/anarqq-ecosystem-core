/**
 * Pi Integration Layer Tests
 * 
 * Tests for Pi Network integration including wallet integration,
 * identity binding, and transaction execution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PiIntegrationLayer } from '../services/PiIntegrationLayer.mjs';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';

describe('PiIntegrationLayer', () => {
  let piIntegration;
  let eventBus;
  let qwalletIntegration;

  beforeEach(async () => {
    eventBus = new EventBusService();
    qwalletIntegration = new QwalletIntegrationService({ 
      sandboxMode: true,
      eventBus 
    });
    
    piIntegration = new PiIntegrationLayer({
      environment: 'sandbox',
      eventBus,
      qwalletIntegration
    });

    await qwalletIntegration.initialize();
    await piIntegration.initialize();
  });

  afterEach(async () => {
    await piIntegration.shutdown();
    await qwalletIntegration.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully in sandbox environment', async () => {
      expect(piIntegration.initialized).toBe(true);
      expect(piIntegration.environment).toBe('sandbox');
    });

    it('should validate environment configuration', async () => {
      const healthCheck = await piIntegration.healthCheck();
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.environment).toBe('sandbox');
    });

    it('should set environment correctly', () => {
      piIntegration.setEnvironment('testnet');
      expect(piIntegration.environment).toBe('testnet');
    });

    it('should protect mainnet environment', () => {
      expect(() => {
        piIntegration.setEnvironment('mainnet');
      }).toThrow('Mainnet access is protected by feature flag');
    });
  });

  describe('Pi Wallet Integration', () => {
    const mockQwalletInstance = {
      squidId: 'did:squid:test_user_001',
      version: '1.0.0'
    };

    const mockPiCredentials = {
      piUserId: 'pi_user_12345',
      accessToken: 'pi_access_token_abc123',
      walletAddress: 'GCKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
      walletVersion: '2.0.0'
    };

    it('should integrate Pi wallet with Qwallet successfully', async () => {
      const result = await piIntegration.integratePiWallet(
        mockQwalletInstance,
        mockPiCredentials
      );

      expect(result.success).toBe(true);
      expect(result.integrationId).toBeDefined();
      expect(result.status).toBe('ACTIVE');
      expect(result.features).toContain('cross_chain_payments');
      expect(result.features).toContain('identity_binding');
      expect(result.features).toContain('transaction_sync');
      expect(result.balances).toBeDefined();
    });

    it('should validate Pi credentials', async () => {
      const invalidCredentials = {
        ...mockPiCredentials,
        walletAddress: 'invalid_address'
      };

      const result = await piIntegration.integratePiWallet(
        mockQwalletInstance,
        invalidCredentials
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Pi wallet address format');
    });

    it('should sync wallet balances', async () => {
      const integrationResult = await piIntegration.integratePiWallet(
        mockQwalletInstance,
        mockPiCredentials
      );

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.balances.pi).toBeGreaterThanOrEqual(0);
      expect(integrationResult.balances.qtoken).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pi Identity Binding', () => {
    const squidId = 'did:squid:test_user_002';
    const piUserId = 'pi_user_67890';

    it('should link Pi identity with sQuid successfully', async () => {
      const result = await piIntegration.linkPiIdentity(squidId, piUserId);

      expect(result.success).toBe(true);
      expect(result.bindingId).toBeDefined();
      expect(result.bindingHash).toBeDefined();
      expect(result.status).toBe('VERIFIED');
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate identity binding proof', async () => {
      const result = await piIntegration.linkPiIdentity(
        squidId, 
        piUserId,
        { verificationMethod: 'signature' }
      );

      expect(result.success).toBe(true);
      expect(result.bindingHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle custom expiration times', async () => {
      const result = await piIntegration.linkPiIdentity(
        squidId,
        piUserId,
        { expiresIn: '7d' }
      );

      expect(result.success).toBe(true);
      
      const expirationDate = new Date(result.expiresAt);
      const now = new Date();
      const daysDiff = (expirationDate - now) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeCloseTo(7, 0);
    });
  });

  describe('Pi Transaction Execution', () => {
    let integrationId;

    beforeEach(async () => {
      const mockQwalletInstance = {
        squidId: 'did:squid:test_user_003',
        version: '1.0.0'
      };

      const mockPiCredentials = {
        piUserId: 'pi_user_11111',
        accessToken: 'pi_access_token_def456',
        walletAddress: 'GDKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
        walletVersion: '2.0.0'
      };

      const integrationResult = await piIntegration.integratePiWallet(
        mockQwalletInstance,
        mockPiCredentials
      );

      integrationId = integrationResult.integrationId;
    });

    it('should execute Pi transaction successfully', async () => {
      const transactionData = {
        fromSquidId: 'did:squid:test_user_003',
        toAddress: 'GCKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
        amount: 10.0,
        currency: 'PI',
        memo: 'Test transaction',
        priority: 'normal'
      };

      const qflowContext = {
        workflowId: 'qflow_pi_payment_workflow',
        executionId: 'exec_789012345',
        stepId: 'step_pi_payment',
        nodeId: 'qnet_node_alpha'
      };

      const result = await piIntegration.executePiTransaction(
        transactionData,
        qflowContext
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.txHash).toBeDefined();
      expect(result.status).toMatch(/^(SUBMITTED|PENDING)$/);
      expect(result.requiredConfirmations).toBe(1); // sandbox environment
    });

    it('should validate transaction parameters', async () => {
      const invalidTransactionData = {
        fromSquidId: 'did:squid:test_user_003',
        toAddress: 'invalid_address',
        amount: -10.0, // Invalid negative amount
        currency: 'INVALID_CURRENCY'
      };

      const result = await piIntegration.executePiTransaction(invalidTransactionData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle insufficient balance', async () => {
      const transactionData = {
        fromSquidId: 'did:squid:test_user_003',
        toAddress: 'GCKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
        amount: 999999.0, // Amount larger than balance
        currency: 'PI'
      };

      const result = await piIntegration.executePiTransaction(transactionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });

    it('should include Qflow context in transaction', async () => {
      const transactionData = {
        fromSquidId: 'did:squid:test_user_003',
        toAddress: 'GCKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
        amount: 5.0,
        currency: 'PI'
      };

      const qflowContext = {
        workflowId: 'test_workflow',
        executionId: 'test_execution',
        stepId: 'test_step',
        nodeId: 'test_node'
      };

      const result = await piIntegration.executePiTransaction(
        transactionData,
        qflowContext
      );

      expect(result.success).toBe(true);
      expect(result.qflowContext).toEqual(qflowContext);
    });
  });

  describe('Event Handling', () => {
    it('should handle Qwallet transaction settled events', async () => {
      const event = {
        actor: { squidId: 'did:squid:test_user' },
        data: {
          transactionId: 'qwallet_tx_123',
          status: 'SETTLED'
        }
      };

      // This should not throw
      await piIntegration.handleEvent('q.qwallet.tx.settled.v1', event);
    });

    it('should handle Qflow execution events', async () => {
      const event = {
        actor: { squidId: 'did:squid:test_user' },
        data: {
          executionId: 'qflow_exec_456',
          workflowId: 'test_workflow'
        }
      };

      // This should not throw
      await piIntegration.handleEvent('q.qflow.execution.started.v1', event);
      await piIntegration.handleEvent('q.qflow.execution.completed.v1', event);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when initialized', async () => {
      const health = await piIntegration.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.environment).toBe('sandbox');
      expect(health.walletIntegrations).toBeGreaterThanOrEqual(0);
      expect(health.identityBindings).toBeGreaterThanOrEqual(0);
      expect(health.piTransactions).toBeGreaterThanOrEqual(0);
      expect(health.browserCompatibility).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should complete full Pi wallet integration workflow', async () => {
      // Step 1: Integrate Pi wallet
      const mockQwalletInstance = {
        squidId: 'did:squid:integration_test_001',
        version: '1.0.0'
      };

      const mockPiCredentials = {
        piUserId: 'pi_integration_test_001',
        accessToken: 'pi_access_token_integration',
        walletAddress: 'GCKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
        walletVersion: '2.0.0'
      };

      const integrationResult = await piIntegration.integratePiWallet(
        mockQwalletInstance,
        mockPiCredentials
      );

      expect(integrationResult.success).toBe(true);

      // Step 2: Link Pi identity
      const identityResult = await piIntegration.linkPiIdentity(
        mockQwalletInstance.squidId,
        mockPiCredentials.piUserId
      );

      expect(identityResult.success).toBe(true);

      // Step 3: Execute Pi transaction
      const transactionData = {
        fromSquidId: mockQwalletInstance.squidId,
        toAddress: 'GDKFBEIYTKQTPD5YGBQCQY3TYXRPGVEZ3OKXNWFRFQN6NKJFKJFKJFKJ',
        amount: 15.0,
        currency: 'PI',
        memo: 'Integration test transaction'
      };

      const qflowContext = {
        workflowId: 'integration_test_workflow',
        executionId: 'integration_test_execution',
        stepId: 'integration_test_step',
        nodeId: 'integration_test_node'
      };

      const transactionResult = await piIntegration.executePiTransaction(
        transactionData,
        qflowContext
      );

      expect(transactionResult.success).toBe(true);

      // Verify all components are working together
      const healthCheck = await piIntegration.healthCheck();
      expect(healthCheck.walletIntegrations).toBeGreaterThan(0);
      expect(healthCheck.identityBindings).toBeGreaterThan(0);
      expect(healthCheck.piTransactions).toBeGreaterThan(0);
    });
  });
});
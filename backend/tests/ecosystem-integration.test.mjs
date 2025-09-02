/**
 * Comprehensive Ecosystem Integration Tests
 * Tests the integration between Qwallet, Qerberos, Qindex, and other ecosystem services
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getQwalletService, 
  getQerberosService, 
  getQindexService,
  initializeEcosystemServices,
  getEcosystemHealth
} from '../ecosystem/index.mjs';

describe('Ecosystem Integration Tests', () => {
  let qwalletService;
  let qerberosService;
  let qindexService;
  let testIdentityId;
  let testSessionId;

  beforeEach(async () => {
    // Initialize individual services directly
    qwalletService = getQwalletService();
    qerberosService = getQerberosService();
    qindexService = getQindexService();
    
    // Setup test data
    testIdentityId = 'test_identity_' + Date.now();
    testSessionId = 'session_' + Date.now();
  });

  afterEach(() => {
    // Cleanup test data if needed
  });

  describe('Enhanced Qerberos Integration', () => {
    it('should log wallet operations with enhanced metadata', async () => {
      const eventData = {
        action: 'wallet_transfer_initiated',
        squidId: testIdentityId,
        resourceId: 'tx_123456',
        operationType: 'WALLET',
        identityType: 'ROOT',
        walletAddress: '0x1234567890123456789012345678901234567890',
        transactionAmount: 1000,
        transactionToken: 'QToken',
        riskScore: 0.3,
        sessionId: testSessionId,
        deviceFingerprint: 'device_fingerprint_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        metadata: {
          toSquidId: 'recipient_identity',
          transactionType: 'transfer_funds'
        }
      };

      const result = await qerberosService.logEvent(eventData);

      expect(result.logged).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(result.severity).toBeDefined();
      
      // Verify enhanced wallet-specific fields are captured
      const userEvents = await qerberosService.getUserEvents(testIdentityId);
      const loggedEvent = userEvents.events.find(e => e.eventId === result.eventId);
      
      expect(loggedEvent).toBeDefined();
      expect(loggedEvent.operationType).toBe('WALLET');
      expect(loggedEvent.identityType).toBe('ROOT');
      expect(loggedEvent.walletAddress).toBe(eventData.walletAddress);
      expect(loggedEvent.transactionAmount).toBe(1000);
      expect(loggedEvent.transactionToken).toBe('QToken');
      expect(loggedEvent.riskScore).toBe(0.3);
      expect(loggedEvent.sessionId).toBe(testSessionId);
    });

    it('should detect wallet-specific anomalies', async () => {
      // Test large transaction anomaly
      const largeTransactionEvent = {
        action: 'wallet_transfer',
        squidId: testIdentityId,
        resourceId: 'tx_large',
        operationType: 'WALLET',
        identityType: 'AID', // AID has low threshold
        transactionAmount: 500, // Exceeds AID threshold of 100
        transactionToken: 'QToken',
        riskScore: 0.8
      };

      const result = await qerberosService.logEvent(largeTransactionEvent);
      
      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      
      const largeTransactionAnomaly = result.anomalies.find(a => 
        a.detector === 'wallet_large_transaction'
      );
      expect(largeTransactionAnomaly).toBeDefined();
      expect(largeTransactionAnomaly.severity).toBe('high');
    });

    it('should detect rapid identity switching', async () => {
      // Create multiple wallet events with different identity types
      const identityTypes = ['ROOT', 'DAO', 'ENTERPRISE', 'CONSENTIDA'];
      
      for (let i = 0; i < identityTypes.length; i++) {
        await qerberosService.logEvent({
          action: 'wallet_operation',
          squidId: testIdentityId,
          resourceId: `tx_switch_${i}`,
          operationType: 'WALLET',
          identityType: identityTypes[i],
          transactionAmount: 100,
          sessionId: testSessionId
        });
      }

      // The next event should trigger rapid switching anomaly
      const result = await qerberosService.logEvent({
        action: 'wallet_operation',
        squidId: testIdentityId,
        resourceId: 'tx_final',
        operationType: 'WALLET',
        identityType: 'ROOT',
        transactionAmount: 100,
        sessionId: testSessionId
      });

      const switchingAnomaly = result.anomalies.find(a => 
        a.detector === 'wallet_identity_switching'
      );
      expect(switchingAnomaly).toBeDefined();
      expect(switchingAnomaly.severity).toBe('medium');
    });
  });

  describe('Enhanced Qindex Integration', () => {
    it('should register wallet transactions in the index', async () => {
      const transactionData = {
        transactionId: 'tx_index_test_123',
        squidId: testIdentityId,
        identityType: 'ROOT',
        operationType: 'TRANSFER',
        amount: 500,
        token: 'QToken',
        fromAddress: '0x1111111111111111111111111111111111111111',
        toAddress: '0x2222222222222222222222222222222222222222',
        timestamp: new Date().toISOString(),
        riskScore: 0.2,
        metadata: {
          gasEstimate: 21000,
          sessionId: testSessionId
        }
      };

      const result = await qindexService.registerTransaction(transactionData);

      expect(result.success).toBe(true);
      expect(result.indexId).toBeDefined();
      expect(result.transactionId).toBe('tx_index_test_123');
      expect(result.indexed).toBe(true);

      // Verify transaction can be retrieved
      const indexRecord = await qindexService.getFile(result.indexId);
      expect(indexRecord).toBeDefined();
      expect(indexRecord.walletMetadata).toBeDefined();
      expect(indexRecord.walletMetadata.transactionId).toBe('tx_index_test_123');
      expect(indexRecord.walletMetadata.operationType).toBe('TRANSFER');
      expect(indexRecord.walletMetadata.transactionAmount).toBe(500);
    });

    it('should search wallet transactions by identity', async () => {
      // Register multiple transactions
      const transactions = [
        {
          transactionId: 'tx_search_1',
          squidId: testIdentityId,
          identityType: 'ROOT',
          operationType: 'TRANSFER',
          amount: 100,
          token: 'QToken',
          fromAddress: '0x1111',
          toAddress: '0x2222'
        },
        {
          transactionId: 'tx_search_2',
          squidId: testIdentityId,
          identityType: 'ROOT',
          operationType: 'MINT',
          amount: 200,
          token: 'ETH',
          fromAddress: '0x1111',
          toAddress: '0x3333'
        }
      ];

      for (const tx of transactions) {
        await qindexService.registerTransaction(tx);
      }

      // Search transactions
      const searchResults = await qindexService.searchTransactions({
        squidId: testIdentityId,
        operationType: 'TRANSFER'
      });

      expect(searchResults.results).toBeDefined();
      expect(searchResults.results.length).toBeGreaterThan(0);
      
      const transferTx = searchResults.results.find(r => 
        r.walletMetadata.transactionId === 'tx_search_1'
      );
      expect(transferTx).toBeDefined();
      expect(transferTx.walletMetadata.operationType).toBe('TRANSFER');
    });

    it('should generate transaction analytics', async () => {
      // Register transactions with different amounts and tokens
      const testTransactions = [
        { amount: 100, token: 'QToken', operationType: 'TRANSFER' },
        { amount: 200, token: 'QToken', operationType: 'TRANSFER' },
        { amount: 50, token: 'ETH', operationType: 'MINT' },
        { amount: 300, token: 'QToken', operationType: 'TRANSFER' }
      ];

      for (let i = 0; i < testTransactions.length; i++) {
        await qindexService.registerTransaction({
          transactionId: `tx_analytics_${i}`,
          squidId: testIdentityId,
          identityType: 'ROOT',
          ...testTransactions[i],
          fromAddress: '0x1111',
          toAddress: '0x2222'
        });
      }

      const analytics = await qindexService.getTransactionAnalytics(testIdentityId);

      expect(analytics).toBeDefined();
      expect(analytics.totalTransactions).toBeGreaterThan(0);
      expect(analytics.totalVolume).toBeGreaterThan(0);
      expect(analytics.byToken).toBeDefined();
      expect(analytics.byToken['QToken']).toBeGreaterThan(0);
      expect(analytics.byOperationType).toBeDefined();
      expect(analytics.byOperationType['TRANSFER']).toBeGreaterThan(0);
    });
  });

  describe('Qwallet Enhanced Integration', () => {
    it('should transfer funds with full ecosystem integration', async () => {
      const fromId = testIdentityId;
      const toId = 'recipient_' + Date.now();
      const amount = 100;
      const token = 'QToken';

      const transferOptions = {
        identityType: 'ROOT',
        sessionId: testSessionId,
        deviceFingerprint: 'test_device_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        riskScore: 0.1
      };

      const result = await qwalletService.transferFunds(
        fromId, 
        toId, 
        amount, 
        token, 
        transferOptions
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.amount).toBe(amount);
      expect(result.token).toBe(token);
      expect(result.identityType).toBe('ROOT');

      // Verify Qerberos logged the transaction
      const userEvents = await qerberosService.getUserEvents(fromId);
      const transferEvents = userEvents.events.filter(e => 
        e.action === 'wallet_transfer_initiated' || 
        e.action === 'wallet_transfer_completed'
      );
      expect(transferEvents.length).toBeGreaterThanOrEqual(1);

      // Verify Qindex indexed the transaction
      const searchResults = await qindexService.searchTransactions({
        squidId: fromId,
        operationType: 'TRANSFER'
      });
      const indexedTx = searchResults.results.find(r => 
        r.walletMetadata.transactionId === result.transactionId
      );
      expect(indexedTx).toBeDefined();
    });

    it('should handle transfer failures with proper logging', async () => {
      const fromId = testIdentityId;
      const toId = fromId; // Same ID should cause error
      const amount = 100;

      const result = await qwalletService.transferFunds(fromId, toId, amount);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verify error was logged to Qerberos
      const userEvents = await qerberosService.getUserEvents(fromId);
      const errorEvents = userEvents.events.filter(e => 
        e.action === 'wallet_transfer_failed'
      );
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Identity Context Switching Coordination', () => {
    it('should coordinate identity switches across all modules', async () => {
      const identityId1 = 'identity_1_' + Date.now();
      const identityId2 = 'identity_2_' + Date.now();

      // Create wallets for both identities
      await qwalletService.getOrCreateWallet(identityId1);
      await qwalletService.getOrCreateWallet(identityId2);

      // Simulate identity switch by logging operations for different identities
      await qerberosService.logEvent({
        action: 'wallet_identity_switch',
        squidId: identityId1,
        operationType: 'WALLET',
        identityType: 'ROOT',
        sessionId: testSessionId,
        metadata: {
          previousIdentityId: null,
          newIdentityId: identityId1,
          switchTimestamp: new Date().toISOString()
        }
      });

      await qerberosService.logEvent({
        action: 'wallet_identity_switch',
        squidId: identityId2,
        operationType: 'WALLET',
        identityType: 'DAO',
        sessionId: testSessionId,
        metadata: {
          previousIdentityId: identityId1,
          newIdentityId: identityId2,
          switchTimestamp: new Date().toISOString()
        }
      });

      // Verify both identities have logged events
      const events1 = await qerberosService.getUserEvents(identityId1);
      const events2 = await qerberosService.getUserEvents(identityId2);

      expect(events1.events.length).toBeGreaterThan(0);
      expect(events2.events.length).toBeGreaterThan(0);

      const switchEvent1 = events1.events.find(e => e.action === 'wallet_identity_switch');
      const switchEvent2 = events2.events.find(e => e.action === 'wallet_identity_switch');

      expect(switchEvent1).toBeDefined();
      expect(switchEvent2).toBeDefined();
      expect(switchEvent2.metadata.previousIdentityId).toBe(identityId1);
    });
  });

  describe('Ecosystem Health and Status', () => {
    it('should report healthy ecosystem status', async () => {
      // Test individual service health directly
      const qwalletHealth = await qwalletService.healthCheck();
      const qerberosHealth = await qerberosService.healthCheck();
      const qindexHealth = await qindexService.healthCheck();

      expect(qwalletHealth.status).toBe('healthy');
      expect(qerberosHealth.status).toBe('healthy');
      expect(qindexHealth.status).toBe('healthy');

      // Verify health check structure
      expect(qwalletHealth.wallets).toBeDefined();
      expect(qwalletHealth.transactions).toBeDefined();
      expect(qerberosHealth.monitoring).toBeDefined();
      expect(qindexHealth.index).toBeDefined();
      expect(qwalletHealth.timestamp).toBeDefined();
      expect(qerberosHealth.timestamp).toBeDefined();
      expect(qindexHealth.timestamp).toBeDefined();
    });

    it('should provide comprehensive system statistics', async () => {
      // Generate some activity
      await qwalletService.transferFunds(
        testIdentityId, 
        'recipient_stats', 
        50, 
        'QToken',
        { identityType: 'ROOT', sessionId: testSessionId }
      );

      const qerberosStats = await qerberosService.getSystemStats();
      const qindexStats = await qindexService.getIndexStats();
      const qwalletHealth = await qwalletService.healthCheck();

      expect(qerberosStats.totalEvents).toBeGreaterThan(0);
      expect(qerberosStats.uniqueUsers).toBeGreaterThan(0);
      expect(qindexStats.totalFiles).toBeGreaterThan(0);
      expect(qwalletHealth.wallets.total).toBeGreaterThan(0);
      expect(qwalletHealth.transactions.total).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Qerberos logging failures gracefully', async () => {
      // Mock a scenario where Qerberos is temporarily unavailable
      const originalLogEvent = qerberosService.logEvent;
      qerberosService.logEvent = async () => {
        throw new Error('Qerberos temporarily unavailable');
      };

      // Transfer should still succeed even if logging fails
      const result = await qwalletService.transferFunds(
        testIdentityId,
        'recipient_resilience',
        25,
        'QToken'
      );

      expect(result.success).toBe(true);

      // Restore original method
      qerberosService.logEvent = originalLogEvent;
    });

    it('should handle Qindex indexing failures gracefully', async () => {
      // Mock a scenario where Qindex is temporarily unavailable
      const originalRegisterTransaction = qindexService.registerTransaction;
      qindexService.registerTransaction = async () => {
        throw new Error('Qindex temporarily unavailable');
      };

      // Transfer should still succeed even if indexing fails
      const result = await qwalletService.transferFunds(
        testIdentityId,
        'recipient_index_fail',
        25,
        'QToken'
      );

      expect(result.success).toBe(true);

      // Restore original method
      qindexService.registerTransaction = originalRegisterTransaction;
    });
  });
});
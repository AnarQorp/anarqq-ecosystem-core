/**
 * Simple Ecosystem Test
 * Tests individual services to isolate the issue
 */

import { describe, it, expect } from 'vitest';
import { 
  getQwalletService, 
  getQerberosService, 
  getQindexService
} from '../ecosystem/index.mjs';

describe('Simple Ecosystem Tests', () => {
  it('should initialize individual services', async () => {
    const qwalletService = getQwalletService();
    const qerberosService = getQerberosService();
    const qindexService = getQindexService();
    
    expect(qwalletService).toBeDefined();
    expect(qerberosService).toBeDefined();
    expect(qindexService).toBeDefined();
    
    // Test basic functionality
    const walletHealth = await qwalletService.healthCheck();
    const qerberosHealth = await qerberosService.healthCheck();
    const qindexHealth = await qindexService.healthCheck();
    
    expect(walletHealth.status).toBe('healthy');
    expect(qerberosHealth.status).toBe('healthy');
    expect(qindexHealth.status).toBe('healthy');
  });

  it('should log enhanced wallet events to Qerberos', async () => {
    const qerberosService = getQerberosService();
    
    const eventData = {
      action: 'wallet_transfer_test',
      squidId: 'test_identity_123',
      resourceId: 'tx_test_123',
      operationType: 'WALLET',
      identityType: 'ROOT',
      walletAddress: '0x1234567890123456789012345678901234567890',
      transactionAmount: 1000,
      transactionToken: 'QToken',
      riskScore: 0.3,
      sessionId: 'session_test_123'
    };

    const result = await qerberosService.logEvent(eventData);
    
    expect(result.logged).toBe(true);
    expect(result.eventId).toBeDefined();
  });

  it('should register transactions in Qindex', async () => {
    const qindexService = getQindexService();
    
    const transactionData = {
      transactionId: 'tx_simple_test_123',
      squidId: 'test_identity_123',
      identityType: 'ROOT',
      operationType: 'TRANSFER',
      amount: 500,
      token: 'QToken',
      fromAddress: '0x1111111111111111111111111111111111111111',
      toAddress: '0x2222222222222222222222222222222222222222'
    };

    const result = await qindexService.registerTransaction(transactionData);
    
    expect(result.success).toBe(true);
    expect(result.indexId).toBeDefined();
    expect(result.transactionId).toBe('tx_simple_test_123');
  });

  it('should perform enhanced wallet transfer', async () => {
    const qwalletService = getQwalletService();
    
    const fromId = 'test_sender_123';
    const toId = 'test_recipient_123';
    const amount = 100;
    const token = 'QToken';
    
    const transferOptions = {
      identityType: 'ROOT',
      sessionId: 'session_transfer_123',
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
    expect(result.identityType).toBe('ROOT');
  });
});
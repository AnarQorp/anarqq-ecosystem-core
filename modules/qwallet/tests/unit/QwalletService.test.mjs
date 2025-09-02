/**
 * Unit Tests for QwalletService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QwalletService } from '../../src/services/QwalletService.mjs';
import { MockServices } from '../../src/mocks/MockServices.mjs';
import { EventBus } from '../../src/services/EventBus.mjs';

describe('QwalletService', () => {
  let qwalletService;
  let mockServices;
  let eventBus;

  beforeEach(async () => {
    eventBus = new EventBus({
      mode: 'standalone',
      topics: ['q.qwallet.intent.created.v1', 'q.qwallet.tx.signed.v1']
    });

    mockServices = new MockServices();
    await mockServices.initialize();

    qwalletService = new QwalletService({
      mode: 'standalone',
      eventBus,
      mockServices,
      config: {
        piNetworkEnabled: true,
        defaultCurrency: 'QToken',
        maxTransactionAmount: 10000,
        dailyLimit: 1000,
        monthlyLimit: 10000
      }
    });

    await qwalletService.initialize();
  });

  afterEach(async () => {
    await qwalletService.shutdown();
    await eventBus.shutdown();
  });

  describe('Payment Intent Creation', () => {
    it('should create a payment intent successfully', async () => {
      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 100,
        currency: 'QToken',
        recipient: 'did:squid:bob456',
        purpose: 'Test payment'
      };

      const result = await qwalletService.createPaymentIntent(intentData);

      expect(result.success).toBe(true);
      expect(result.intentId).toMatch(/^intent_[a-f0-9]{32}$/);
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('QToken');
      expect(result.recipient).toBe('did:squid:bob456');
      expect(result.status).toBe('PENDING');
      expect(result.fees).toBeDefined();
      expect(result.fees.total).toBeGreaterThan(0);
    });

    it('should reject payment intent with insufficient balance', async () => {
      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 10000, // More than available balance
        currency: 'QToken',
        recipient: 'did:squid:bob456',
        purpose: 'Large payment'
      };

      const result = await qwalletService.createPaymentIntent(intentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });

    it('should reject payment intent with invalid currency', async () => {
      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 100,
        currency: 'INVALID',
        recipient: 'did:squid:bob456',
        purpose: 'Test payment'
      };

      const result = await qwalletService.createPaymentIntent(intentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported currency');
    });

    it('should reject payment intent exceeding daily limit', async () => {
      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 1500, // Exceeds daily limit of 1000
        currency: 'QToken',
        recipient: 'did:squid:bob456',
        purpose: 'Large payment'
      };

      const result = await qwalletService.createPaymentIntent(intentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily spending limit exceeded');
    });
  });

  describe('Transaction Signing', () => {
    let intentId;

    beforeEach(async () => {
      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 100,
        currency: 'QToken',
        recipient: 'did:squid:bob456',
        purpose: 'Test payment'
      };

      const result = await qwalletService.createPaymentIntent(intentData);
      intentId = result.intentId;
    });

    it('should sign transaction successfully', async () => {
      const signData = {
        squidId: 'did:squid:alice123',
        intentId,
        signature: '0x1234567890abcdef1234567890abcdef12345678'
      };

      const result = await qwalletService.signTransaction(signData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^tx_[a-f0-9]{32}$/);
      expect(result.signature).toBeDefined();
      expect(result.gasEstimate).toBeGreaterThan(0);
    });

    it('should reject signing with invalid intent ID', async () => {
      const signData = {
        squidId: 'did:squid:alice123',
        intentId: 'invalid_intent_id',
        signature: '0x1234567890abcdef1234567890abcdef12345678'
      };

      const result = await qwalletService.signTransaction(signData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment intent not found');
    });

    it('should reject signing by unauthorized identity', async () => {
      const signData = {
        squidId: 'did:squid:charlie789', // Different identity
        intentId,
        signature: '0x1234567890abcdef1234567890abcdef12345678'
      };

      const result = await qwalletService.signTransaction(signData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('Payment Processing', () => {
    let transactionId;

    beforeEach(async () => {
      // Create intent
      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 100,
        currency: 'QToken',
        recipient: 'did:squid:bob456',
        purpose: 'Test payment'
      };

      const intentResult = await qwalletService.createPaymentIntent(intentData);
      
      // Sign transaction
      const signData = {
        squidId: 'did:squid:alice123',
        intentId: intentResult.intentId,
        signature: '0x1234567890abcdef1234567890abcdef12345678'
      };

      const signResult = await qwalletService.signTransaction(signData);
      transactionId = signResult.transactionId;
    });

    it('should process payment successfully', async () => {
      const paymentData = {
        squidId: 'did:squid:alice123',
        transactionId
      };

      const result = await qwalletService.processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('SETTLED');
      expect(result.settlementHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.settledAt).toBeDefined();
    });

    it('should reject processing invalid transaction', async () => {
      const paymentData = {
        squidId: 'did:squid:alice123',
        transactionId: 'invalid_tx_id'
      };

      const result = await qwalletService.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction not found');
    });
  });

  describe('Balance Management', () => {
    it('should get balance for existing wallet', async () => {
      const result = await qwalletService.getBalance('did:squid:alice123', 'QToken');

      expect(result.success).toBe(true);
      expect(result.squidId).toBe('did:squid:alice123');
      expect(result.currency).toBe('QToken');
      expect(result.balance).toBe(1000); // Initial test balance
      expect(result.walletAddress).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('should get all balances for wallet', async () => {
      const result = await qwalletService.getBalance('did:squid:alice123');

      expect(result.success).toBe(true);
      expect(result.squidId).toBe('did:squid:alice123');
      expect(result.balances).toBeDefined();
      expect(result.balances.QToken).toBe(1000);
      expect(result.balances.PI).toBe(50);
    });

    it('should reject balance request for invalid currency', async () => {
      const result = await qwalletService.getBalance('did:squid:alice123', 'INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported currency');
    });
  });

  describe('Payment Quotes', () => {
    it('should generate payment quote successfully', async () => {
      const quoteData = {
        amount: 100,
        currency: 'QToken',
        priority: 'normal'
      };

      const result = await qwalletService.getPaymentQuote(quoteData);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('QToken');
      expect(result.fees).toBeDefined();
      expect(result.fees.total).toBeGreaterThan(0);
      expect(result.estimatedTime).toBeDefined();
      expect(result.exchangeRate).toBeDefined();
      expect(result.quoteId).toBeDefined();
    });

    it('should reject quote for invalid amount', async () => {
      const quoteData = {
        amount: -100,
        currency: 'QToken'
      };

      const result = await qwalletService.getPaymentQuote(quoteData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });
  });

  describe('Transaction History', () => {
    it('should get empty transaction history for new wallet', async () => {
      const result = await qwalletService.getTransactionHistory('did:squid:alice123');

      expect(result.success).toBe(true);
      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination parameters', async () => {
      const result = await qwalletService.getTransactionHistory('did:squid:alice123', {
        limit: 10,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });

  describe('Event Publishing', () => {
    it('should publish events when creating payment intent', async () => {
      const eventPromise = new Promise((resolve) => {
        eventBus.subscribe('q.qwallet.intent.created.v1', resolve);
      });

      const intentData = {
        squidId: 'did:squid:alice123',
        amount: 100,
        currency: 'QToken',
        recipient: 'did:squid:bob456',
        purpose: 'Test payment'
      };

      await qwalletService.createPaymentIntent(intentData);

      const event = await eventPromise;
      expect(event.topic).toBe('q.qwallet.intent.created.v1');
      expect(event.actor.squidId).toBe('did:squid:alice123');
      expect(event.data.amount).toBe(100);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await qwalletService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.wallets).toBeGreaterThanOrEqual(0);
      expect(health.supportedCurrencies).toContain('QToken');
      expect(health.supportedCurrencies).toContain('PI');
      expect(health.config.mode).toBe('standalone');
    });
  });
});
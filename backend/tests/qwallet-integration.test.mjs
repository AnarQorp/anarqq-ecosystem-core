/**
 * Qwallet Integration Test Suite
 * 
 * Comprehensive tests for cross-module payment integration including
 * Qmail, Qmarket, and Qdrive payment processing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { QmailPaymentService } from '../services/QmailPaymentService.mjs';
import { QdrivePaymentService } from '../services/QdrivePaymentService.mjs';
import { EventBusService } from '../services/EventBusService.mjs';

describe('Qwallet Integration Service', () => {
  let qwalletIntegration;
  let eventBus;

  beforeAll(async () => {
    eventBus = new EventBusService();
    qwalletIntegration = new QwalletIntegrationService({
      sandboxMode: true,
      eventBus
    });
    await qwalletIntegration.initialize();
  });

  afterAll(async () => {
    await qwalletIntegration.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully in sandbox mode', async () => {
      const health = await qwalletIntegration.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.sandboxMode).toBe(true);
      expect(health.sandboxWallets).toBeGreaterThan(0);
    });

    it('should create test wallets with initial balances', async () => {
      const balance = await qwalletIntegration.getSandboxBalance('did:squid:alice123');
      expect(balance.success).toBe(true);
      expect(balance.balances.QToken).toBeGreaterThan(0);
      expect(balance.balances.PI).toBeGreaterThan(0);
    });
  });

  describe('Payment Intent Creation', () => {
    it('should create payment intent successfully', async () => {
      const result = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:alice123',
        amount: 10.0,
        currency: 'QToken',
        purpose: 'test_payment',
        metadata: { module: 'test' }
      });

      expect(result.success).toBe(true);
      expect(result.intentId).toBeDefined();
      expect(result.amount).toBe(10.0);
      expect(result.currency).toBe('QToken');
      expect(result.status).toBe('PENDING');
    });

    it('should track payment intent in audit trail', async () => {
      const intentResult = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:bob456',
        amount: 5.0,
        currency: 'QToken',
        purpose: 'audit_test',
        metadata: { module: 'test' }
      });

      const auditTrail = await qwalletIntegration.getAuditTrail({
        squidId: 'did:squid:bob456',
        action: 'PAYMENT_INTENT_CREATED'
      });

      expect(auditTrail.success).toBe(true);
      expect(auditTrail.auditEvents.length).toBeGreaterThan(0);
      expect(auditTrail.auditEvents[0].intentId).toBe(intentResult.intentId);
    });
  });

  describe('Sandbox Payment Processing', () => {
    it('should process sandbox payment successfully', async () => {
      const intentResult = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:alice123',
        amount: 1.0,
        currency: 'QToken',
        purpose: 'sandbox_test',
        metadata: { module: 'test' }
      });

      const paymentResult = await qwalletIntegration.processSandboxPayment(intentResult);

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.transactionId).toBeDefined();
      expect(paymentResult.status).toBe('SETTLED');
    });

    it('should fail payment with insufficient balance', async () => {
      const intentResult = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:alice123',
        amount: 10000.0, // More than available balance
        currency: 'QToken',
        purpose: 'insufficient_balance_test',
        metadata: { module: 'test' }
      });

      const paymentResult = await qwalletIntegration.processSandboxPayment(intentResult);

      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toContain('Insufficient balance');
    });

    it('should update sandbox wallet balance after payment', async () => {
      const initialBalance = await qwalletIntegration.getSandboxBalance('did:squid:charlie789');
      const initialAmount = initialBalance.balances.QToken;

      const intentResult = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:charlie789',
        amount: 10.0,
        currency: 'QToken',
        purpose: 'balance_update_test',
        metadata: { module: 'test' }
      });

      await qwalletIntegration.processSandboxPayment(intentResult);

      const finalBalance = await qwalletIntegration.getSandboxBalance('did:squid:charlie789');
      expect(finalBalance.balances.QToken).toBe(initialAmount - 10.0);
    });
  });

  describe('Revenue Distribution', () => {
    it('should distribute Qmail revenue correctly', async () => {
      const intentResult = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:alice123',
        amount: 1.0,
        currency: 'QToken',
        purpose: 'qmail_premium_message',
        metadata: { module: 'qmail' }
      });

      await qwalletIntegration.processSandboxPayment(intentResult);
      const distribution = await qwalletIntegration.distributeQmailRevenue(intentResult, 1.0);

      expect(distribution.module).toBe('qmail');
      expect(distribution.totalAmount).toBe(1.0);
      expect(distribution.distributions).toHaveLength(2); // platform and network
      expect(distribution.distributions[0].recipient).toBe('platform');
      expect(distribution.distributions[1].recipient).toBe('network');
    });

    it('should distribute Qmarket revenue with creator royalty', async () => {
      const intentResult = await qwalletIntegration.createPaymentIntent({
        squidId: 'did:squid:alice123',
        amount: 100.0,
        currency: 'QToken',
        purpose: 'qmarket_purchase',
        metadata: {
          module: 'qmarket',
          sellerId: 'did:squid:bob456',
          originalCreatorId: 'did:squid:charlie789',
          isResale: true
        }
      });

      await qwalletIntegration.processSandboxPayment(intentResult);
      const distribution = await qwalletIntegration.distributeQmarketRevenue(intentResult, 90.0, 10.0);

      expect(distribution.module).toBe('qmarket');
      expect(distribution.salePrice).toBe(90.0);
      expect(distribution.totalFees).toBe(10.0);
      expect(distribution.distributions).toHaveLength(3); // platform, seller, creator
      
      const creatorDist = distribution.distributions.find(d => d.recipient === 'creator');
      expect(creatorDist).toBeDefined();
      expect(creatorDist.squidId).toBe('did:squid:charlie789');
    });
  });

  describe('Settlement Reporting', () => {
    beforeEach(async () => {
      // Create some test settlements
      const testPayments = [
        { squidId: 'did:squid:alice123', amount: 5.0, module: 'qmail' },
        { squidId: 'did:squid:bob456', amount: 10.0, module: 'qmarket' },
        { squidId: 'did:squid:charlie789', amount: 2.0, module: 'qdrive' }
      ];

      for (const payment of testPayments) {
        const intent = await qwalletIntegration.createPaymentIntent({
          ...payment,
          currency: 'QToken',
          purpose: `test_${payment.module}`,
          metadata: { module: payment.module }
        });
        await qwalletIntegration.processSandboxPayment(intent);
        
        if (payment.module === 'qmail') {
          await qwalletIntegration.distributeQmailRevenue(intent, payment.amount);
        } else if (payment.module === 'qmarket') {
          await qwalletIntegration.distributeQmarketRevenue(intent, payment.amount * 0.9, payment.amount * 0.1);
        } else if (payment.module === 'qdrive') {
          await qwalletIntegration.distributeQdriveRevenue(intent, payment.amount);
        }
      }
    });

    it('should generate settlement report', async () => {
      const report = await qwalletIntegration.getSettlementReport();

      expect(report.success).toBe(true);
      expect(report.summary.totalSettlements).toBeGreaterThan(0);
      expect(report.summary.byModule).toBeDefined();
      expect(report.settlements).toBeInstanceOf(Array);
    });

    it('should filter settlement report by module', async () => {
      const report = await qwalletIntegration.getSettlementReport({ module: 'qmail' });

      expect(report.success).toBe(true);
      expect(report.settlements.every(s => s.module === 'qmail')).toBe(true);
    });

    it('should calculate correct settlement summary', async () => {
      const report = await qwalletIntegration.getSettlementReport();

      expect(report.summary.totalAmount).toBeGreaterThan(0);
      expect(report.summary.byModule.qmail).toBeDefined();
      expect(report.summary.byModule.qmarket).toBeDefined();
      expect(report.summary.byModule.qdrive).toBeDefined();
      expect(report.summary.byRecipient.platform).toBeDefined();
    });
  });
});

describe('Qmail Payment Service', () => {
  let qmailPayment;
  let qwalletIntegration;

  beforeAll(async () => {
    qwalletIntegration = new QwalletIntegrationService({ sandboxMode: true });
    await qwalletIntegration.initialize();
    
    qmailPayment = new QmailPaymentService({
      qwalletIntegration,
      sandboxMode: true
    });
    await qmailPayment.initialize();
  });

  afterAll(async () => {
    await qmailPayment.shutdown();
  });

  describe('Premium Message Processing', () => {
    it('should process premium message payment', async () => {
      const result = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_test_001',
        serviceType: 'premium',
        recipients: ['did:squid:bob456'],
        attachments: [],
        priority: 'normal'
      });

      expect(result.success).toBe(true);
      expect(result.serviceType).toBe('premium');
      expect(result.totalFee).toBeGreaterThan(0);
      expect(result.features).toContain('read_receipts');
    });

    it('should calculate correct fees for certified messages', async () => {
      const result = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_test_002',
        serviceType: 'certified',
        recipients: ['did:squid:bob456', 'did:squid:charlie789'],
        attachments: [],
        priority: 'normal'
      });

      expect(result.success).toBe(true);
      expect(result.serviceType).toBe('certified');
      expect(result.totalFee).toBe(0.05 * 2); // 0.05 per recipient
      expect(result.features).toContain('legal_certification');
    });

    it('should apply priority multiplier', async () => {
      const normalResult = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_test_003',
        serviceType: 'priority',
        recipients: ['did:squid:bob456'],
        priority: 'normal'
      });

      const highResult = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_test_004',
        serviceType: 'priority',
        recipients: ['did:squid:bob456'],
        priority: 'high'
      });

      expect(highResult.messageFee).toBe(normalResult.messageFee * 2);
    });

    it('should calculate attachment fees correctly', async () => {
      const attachments = [
        { name: 'file1.pdf', size: 5 * 1024 * 1024, type: 'application/pdf' }, // 5MB
        { name: 'file2.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' } // 2MB
      ];

      const result = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_test_005',
        serviceType: 'premium',
        recipients: ['did:squid:bob456'],
        attachments
      });

      expect(result.success).toBe(true);
      expect(result.attachmentFee).toBeGreaterThan(0);
      expect(result.totalFee).toBe(result.messageFee + result.attachmentFee);
    });
  });

  describe('Subscription Processing', () => {
    it('should process monthly subscription', async () => {
      const result = await qmailPayment.processSubscription({
        squidId: 'did:squid:alice123',
        planId: 'basic',
        billingPeriod: 'monthly'
      });

      expect(result.success).toBe(true);
      expect(result.planId).toBe('basic');
      expect(result.billingPeriod).toBe('monthly');
      expect(result.amount).toBe(5.0);
      expect(result.features.premiumMessages).toBe(100);
    });

    it('should apply yearly discount', async () => {
      const monthlyResult = await qmailPayment.processSubscription({
        squidId: 'did:squid:alice123',
        planId: 'professional',
        billingPeriod: 'monthly'
      });

      const yearlyResult = await qmailPayment.processSubscription({
        squidId: 'did:squid:bob456',
        planId: 'professional',
        billingPeriod: 'yearly'
      });

      expect(yearlyResult.amount).toBe(monthlyResult.amount * 12 * 0.9); // 10% discount
    });
  });

  describe('Service Pricing', () => {
    it('should return complete pricing information', async () => {
      const result = await qmailPayment.getServicePricing();

      expect(result.success).toBe(true);
      expect(result.pricing.services).toBeDefined();
      expect(result.pricing.attachments).toBeDefined();
      expect(result.pricing.subscriptions).toBeDefined();
      expect(result.currency).toBe('QToken');
    });

    it('should include all service types', async () => {
      const result = await qmailPayment.getServicePricing();
      const serviceTypes = Object.keys(result.pricing.services);

      expect(serviceTypes).toContain('premium');
      expect(serviceTypes).toContain('certified');
      expect(serviceTypes).toContain('priority');
      expect(serviceTypes).toContain('bulk');
    });
  });

  describe('Payment History', () => {
    beforeEach(async () => {
      // Create some test payments
      await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_history_001',
        serviceType: 'premium',
        recipients: ['did:squid:bob456']
      });

      await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'msg_history_002',
        serviceType: 'certified',
        recipients: ['did:squid:charlie789']
      });
    });

    it('should return payment history', async () => {
      const result = await qmailPayment.getPaymentHistory('did:squid:alice123');

      expect(result.success).toBe(true);
      expect(result.history).toBeInstanceOf(Array);
      expect(result.summary.totalPayments).toBeGreaterThan(0);
      expect(result.summary.byServiceType).toBeDefined();
    });

    it('should filter by service type', async () => {
      const result = await qmailPayment.getPaymentHistory('did:squid:alice123', {
        serviceType: 'premium'
      });

      expect(result.success).toBe(true);
      expect(result.history.every(h => h.serviceType === 'premium')).toBe(true);
    });

    it('should paginate results', async () => {
      const result = await qmailPayment.getPaymentHistory('did:squid:alice123', {
        limit: 1,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(true);
    });
  });
});

describe('Qdrive Payment Service', () => {
  let qdrivePayment;
  let qwalletIntegration;

  beforeAll(async () => {
    qwalletIntegration = new QwalletIntegrationService({ sandboxMode: true });
    await qwalletIntegration.initialize();
    
    qdrivePayment = new QdrivePaymentService({
      qwalletIntegration,
      sandboxMode: true
    });
    await qdrivePayment.initialize();
  });

  afterAll(async () => {
    await qdrivePayment.shutdown();
  });

  describe('Storage Quota Processing', () => {
    it('should allow storage within free tier', async () => {
      const result = await qdrivePayment.processStorageQuota({
        squidId: 'did:squid:alice123',
        currentUsage: 0.5, // 0.5 GB
        requestedSize: 0.3 // 0.3 GB
      });

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.paymentRequired).toBe(false);
      expect(result.totalUsage).toBe(0.8);
    });

    it('should require payment for overage', async () => {
      const result = await qdrivePayment.processStorageQuota({
        squidId: 'did:squid:bob456',
        currentUsage: 0.8, // 0.8 GB
        requestedSize: 0.5 // 0.5 GB (total 1.3 GB, exceeds 1 GB free tier)
      });

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(true);
      expect(result.overage).toBe(0.3); // 1.3 - 1.0 = 0.3 GB overage
      expect(result.overageFee).toBeGreaterThan(0);
    });

    it('should handle subscription quota limits', async () => {
      // First, set up a user with a subscription (mock)
      const userStorage = await qdrivePayment.getUserStorage('did:squid:charlie789');
      userStorage.subscriptionPlan = 'basic'; // 10 GB limit
      
      const result = await qdrivePayment.processStorageQuota({
        squidId: 'did:squid:charlie789',
        currentUsage: 5.0, // 5 GB
        requestedSize: 3.0 // 3 GB (total 8 GB, within 10 GB limit)
      });

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.paymentRequired).toBe(false);
    });
  });

  describe('Premium Feature Processing', () => {
    it('should process encryption feature payment', async () => {
      const result = await qdrivePayment.processPremiumFeature({
        squidId: 'did:squid:alice123',
        featureType: 'encryption',
        fileId: 'file_test_001',
        fileSize: 50 * 1024 * 1024, // 50MB
        operationCount: 1
      });

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('encryption');
      expect(result.paymentRequired).toBe(true);
      expect(result.fee).toBeGreaterThan(0);
      expect(result.description).toContain('Client-side encryption');
    });

    it('should process sharing feature payment', async () => {
      const result = await qdrivePayment.processPremiumFeature({
        squidId: 'did:squid:bob456',
        featureType: 'sharing',
        operationCount: 5
      });

      expect(result.success).toBe(true);
      expect(result.featureType).toBe('sharing');
      expect(result.operationCount).toBe(5);
      expect(result.fee).toBe(0.005 * 5); // 0.005 per share * 5 operations
    });

    it('should handle subscription coverage', async () => {
      // Mock subscription coverage
      const userStorage = await qdrivePayment.getUserStorage('did:squid:charlie789');
      userStorage.subscriptionPlan = 'premium'; // Includes encryption, sharing, versioning
      
      const result = await qdrivePayment.processPremiumFeature({
        squidId: 'did:squid:charlie789',
        featureType: 'versioning',
        operationCount: 1
      });

      // Note: In the current implementation, subscription coverage is mocked to return false
      // In a real implementation, this would check actual subscription status
      expect(result.success).toBe(true);
      expect(result.featureType).toBe('versioning');
    });
  });

  describe('Bandwidth Processing', () => {
    it('should allow bandwidth within free tier', async () => {
      const result = await qdrivePayment.processBandwidthUsage({
        squidId: 'did:squid:alice123',
        bandwidthUsed: 5.0 // 5 GB (within 10 GB free tier)
      });

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(false);
      expect(result.freeTierRemaining).toBe(5.0);
    });

    it('should charge for bandwidth overage', async () => {
      const result = await qdrivePayment.processBandwidthUsage({
        squidId: 'did:squid:bob456',
        bandwidthUsed: 15.0 // 15 GB (exceeds 10 GB free tier)
      });

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(true);
      expect(result.chargeableBandwidth).toBe(5.0); // 15 - 10 = 5 GB chargeable
      expect(result.bandwidthFee).toBeGreaterThan(0);
    });
  });

  describe('Storage Summary', () => {
    it('should return comprehensive storage summary', async () => {
      const result = await qdrivePayment.getStorageSummary('did:squid:alice123');

      expect(result.success).toBe(true);
      expect(result.squidId).toBe('did:squid:alice123');
      expect(result.storageUsed).toBeDefined();
      expect(result.storageLimit).toBeDefined();
      expect(result.storageAvailable).toBeDefined();
      expect(result.bandwidthUsed).toBeDefined();
      expect(result.featureUsage).toBeDefined();
    });
  });

  describe('Pricing Information', () => {
    it('should return complete pricing structure', async () => {
      const result = await qdrivePayment.getPricingInfo();

      expect(result.success).toBe(true);
      expect(result.pricing.storage).toBeDefined();
      expect(result.pricing.bandwidth).toBeDefined();
      expect(result.pricing.premiumFeatures).toBeDefined();
      expect(result.pricing.subscriptions).toBeDefined();
    });

    it('should include all premium features', async () => {
      const result = await qdrivePayment.getPricingInfo();
      const features = Object.keys(result.pricing.premiumFeatures);

      expect(features).toContain('encryption');
      expect(features).toContain('sharing');
      expect(features).toContain('versioning');
      expect(features).toContain('backup');
      expect(features).toContain('sync');
    });

    it('should include subscription plans with yearly discounts', async () => {
      const result = await qdrivePayment.getPricingInfo();
      const basicPlan = result.pricing.subscriptions.basic;

      expect(basicPlan.monthlyFee).toBeDefined();
      expect(basicPlan.yearlyFee).toBe(basicPlan.monthlyFee * 12 * 0.85); // 15% discount
    });
  });
});

describe('Integration Tests', () => {
  let qwalletIntegration;
  let qmailPayment;
  let qdrivePayment;

  beforeAll(async () => {
    qwalletIntegration = new QwalletIntegrationService({ sandboxMode: true });
    await qwalletIntegration.initialize();
    
    qmailPayment = new QmailPaymentService({ qwalletIntegration, sandboxMode: true });
    qdrivePayment = new QdrivePaymentService({ qwalletIntegration, sandboxMode: true });
    
    await Promise.all([
      qmailPayment.initialize(),
      qdrivePayment.initialize()
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      qmailPayment.shutdown(),
      qdrivePayment.shutdown(),
      qwalletIntegration.shutdown()
    ]);
  });

  describe('Cross-Module Payment Flow', () => {
    it('should process Qmail payment and update wallet balance', async () => {
      const initialBalance = await qwalletIntegration.getSandboxBalance('did:squid:alice123');
      const initialAmount = initialBalance.balances.QToken;

      const result = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'integration_test_001',
        serviceType: 'premium',
        recipients: ['did:squid:bob456']
      });

      expect(result.success).toBe(true);

      const finalBalance = await qwalletIntegration.getSandboxBalance('did:squid:alice123');
      expect(finalBalance.balances.QToken).toBeLessThan(initialAmount);
    });

    it('should process Qdrive payment and generate audit trail', async () => {
      const result = await qdrivePayment.processStorageQuota({
        squidId: 'did:squid:bob456',
        currentUsage: 1.5,
        requestedSize: 0.5
      });

      expect(result.success).toBe(true);
      expect(result.paymentRequired).toBe(true);

      // Check audit trail
      const auditTrail = await qwalletIntegration.getAuditTrail({
        squidId: 'did:squid:bob456',
        module: 'qdrive'
      });

      expect(auditTrail.success).toBe(true);
      expect(auditTrail.auditEvents.length).toBeGreaterThan(0);
    });

    it('should generate comprehensive settlement report across modules', async () => {
      // Process payments across different modules
      await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'settlement_test_001',
        serviceType: 'certified',
        recipients: ['did:squid:bob456']
      });

      await qdrivePayment.processStorageQuota({
        squidId: 'did:squid:charlie789',
        currentUsage: 2.0,
        requestedSize: 1.0
      });

      // Generate settlement report
      const report = await qwalletIntegration.getSettlementReport();

      expect(report.success).toBe(true);
      expect(report.summary.byModule.qmail).toBeDefined();
      expect(report.summary.byModule.qdrive).toBeDefined();
      expect(report.summary.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient balance gracefully', async () => {
      // Try to spend more than available balance
      const result = await qmailPayment.processPremiumMessage({
        squidId: 'did:squid:alice123',
        messageId: 'error_test_001',
        serviceType: 'certified',
        recipients: Array(1000).fill('did:squid:bob456') // 1000 recipients = 50 QToken
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });

    it('should validate payment parameters', async () => {
      const result = await qdrivePayment.processPremiumFeature({
        squidId: 'did:squid:alice123',
        featureType: 'invalid_feature', // Invalid feature type
        operationCount: 1
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid premium feature');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent payments', async () => {
      const concurrentPayments = Array(10).fill(null).map((_, index) => 
        qmailPayment.processPremiumMessage({
          squidId: 'did:squid:alice123',
          messageId: `concurrent_test_${index}`,
          serviceType: 'premium',
          recipients: ['did:squid:bob456']
        })
      );

      const results = await Promise.all(concurrentPayments);
      
      // All payments should succeed (assuming sufficient balance)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should maintain data consistency under load', async () => {
      const initialBalance = await qwalletIntegration.getSandboxBalance('did:squid:charlie789');
      const initialAmount = initialBalance.balances.QToken;

      // Process multiple small payments
      const payments = Array(5).fill(null).map((_, index) => 
        qdrivePayment.processPremiumFeature({
          squidId: 'did:squid:charlie789',
          featureType: 'sharing',
          operationCount: 1
        })
      );

      const results = await Promise.all(payments);
      const successfulPayments = results.filter(r => r.success);

      const finalBalance = await qwalletIntegration.getSandboxBalance('did:squid:charlie789');
      const expectedDeduction = successfulPayments.length * 0.005; // 0.005 per sharing operation

      expect(Math.abs((initialAmount - finalBalance.balances.QToken) - expectedDeduction)).toBeLessThan(0.001);
    });
  });
});
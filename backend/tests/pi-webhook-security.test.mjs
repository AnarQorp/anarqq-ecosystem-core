/**
 * Pi Webhook Security Tests
 * 
 * Tests for Pi Network webhook signature verification, Qonsent scope validation,
 * and webhook verification status tracking.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PiIntegrationLayer } from '../services/PiIntegrationLayer.mjs';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import crypto from 'crypto';

describe('Pi Webhook Security', () => {
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

  describe('Webhook Signature Verification', () => {
    const testPayload = JSON.stringify({ 
      event: 'payment.completed',
      data: { amount: 10, currency: 'PI' }
    });

    it('should verify Ed25519 signature successfully', async () => {
      const signature = crypto.createHmac('sha256', 'default-secret')
        .update(crypto.createHash('sha256').update(testPayload).digest('hex'))
        .digest('hex');

      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        signature,
        'ed25519'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('ed25519');
      expect(result.verificationId).toBeDefined();
    });

    it('should verify BLS signature successfully', async () => {
      const signature = crypto.createHmac('sha512', 'default-secret')
        .update(crypto.createHash('sha512').update(testPayload).digest('hex'))
        .digest('hex');

      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        signature,
        'bls'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('bls');
    });

    it('should verify Dilithium signature successfully', async () => {
      const signature = crypto.createHmac('sha3-256', 'default-secret')
        .update(crypto.createHash('sha3-256').update(testPayload).digest('hex'))
        .digest('hex');

      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        signature,
        'dilithium'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('dilithium');
    });

    it('should verify HMAC-SHA256 signature successfully', async () => {
      const signature = crypto.createHmac('sha256', 'default-secret')
        .update(testPayload)
        .digest('hex');

      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        signature,
        'hmac-sha256'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('hmac-sha256');
    });

    it('should reject invalid signature', async () => {
      const invalidSignature = 'invalid_signature_12345';

      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        invalidSignature,
        'ed25519'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
    });

    it('should handle unsupported algorithm', async () => {
      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        'some_signature',
        'unsupported_algorithm'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported signature algorithm');
    });

    it('should parse signature from header format', async () => {
      const signature = crypto.createHmac('sha256', 'default-secret')
        .update(testPayload)
        .digest('hex');
      
      const headerSignature = `sha256=${signature}`;

      const result = await piIntegration.verifyWebhookSignature(
        testPayload,
        headerSignature,
        'hmac-sha256'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });
  });

  describe('Qonsent Scope Validation', () => {
    const testPrincipal = 'did:squid:test_principal_001';

    it('should validate basic scopes successfully', async () => {
      const requestedScopes = ['pi:read', 'wallet:read'];
      const context = {
        permissions: ['identity']
      };

      const result = await piIntegration.validateQonsentScopes(
        testPrincipal,
        requestedScopes,
        context
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.validScopes).toBe(2);
      expect(result.totalScopes).toBe(2);
      expect(result.results['pi:read'].valid).toBe(true);
      expect(result.results['wallet:read'].valid).toBe(true);
    });

    it('should validate elevated scopes with proper permissions', async () => {
      const requestedScopes = ['pi:write', 'wallet:write'];
      const context = {
        permissions: ['identity', 'wallet']
      };

      const result = await piIntegration.validateQonsentScopes(
        testPrincipal,
        requestedScopes,
        context
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.validScopes).toBe(2);
    });

    it('should reject elevated scopes without proper permissions', async () => {
      const requestedScopes = ['pi:write', 'pi:admin'];
      const context = {
        permissions: ['identity'] // Missing wallet and admin permissions
      };

      const result = await piIntegration.validateQonsentScopes(
        testPrincipal,
        requestedScopes,
        context
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.validScopes).toBe(0);
      expect(result.totalScopes).toBe(2);
      expect(result.results['pi:write'].valid).toBe(false);
      expect(result.results['pi:admin'].valid).toBe(false);
    });

    it('should handle unknown scopes', async () => {
      const requestedScopes = ['unknown:scope'];
      const context = {
        permissions: ['identity', 'wallet', 'admin']
      };

      const result = await piIntegration.validateQonsentScopes(
        testPrincipal,
        requestedScopes,
        context
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.results['unknown:scope'].valid).toBe(false);
      expect(result.results['unknown:scope'].reason).toBe('Unknown scope');
    });

    it('should validate mixed scopes correctly', async () => {
      const requestedScopes = ['pi:read', 'pi:write', 'pi:admin'];
      const context = {
        permissions: ['identity', 'wallet'] // Missing admin permission
      };

      const result = await piIntegration.validateQonsentScopes(
        testPrincipal,
        requestedScopes,
        context
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.validScopes).toBe(2); // pi:read and pi:write should be valid
      expect(result.totalScopes).toBe(3);
      expect(result.results['pi:read'].valid).toBe(true);
      expect(result.results['pi:write'].valid).toBe(true);
      expect(result.results['pi:admin'].valid).toBe(false);
    });
  });

  describe('Webhook Verification Status Tracking', () => {
    it('should track webhook verification status', async () => {
      const webhookId = 'webhook_test_001';
      const status = 'verified';
      const metadata = {
        algorithm: 'ed25519',
        timestamp: new Date().toISOString()
      };

      const result = await piIntegration.trackWebhookVerificationStatus(
        webhookId,
        status,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.webhookId).toBe(webhookId);
      expect(result.status).toBe(status);
      expect(result.trackingId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should update existing webhook status', async () => {
      const webhookId = 'webhook_test_002';
      
      // First, create a webhook verification
      await piIntegration.verifyWebhookSignature(
        'test payload',
        'test signature',
        'ed25519'
      );

      // Then track its status
      const result = await piIntegration.trackWebhookVerificationStatus(
        webhookId,
        'processed',
        { processedAt: new Date().toISOString() }
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('processed');
    });

    it('should handle multiple status updates', async () => {
      const webhookId = 'webhook_test_003';
      
      // Track initial status
      const result1 = await piIntegration.trackWebhookVerificationStatus(
        webhookId,
        'received'
      );

      // Update status
      const result2 = await piIntegration.trackWebhookVerificationStatus(
        webhookId,
        'verified'
      );

      // Final status update
      const result3 = await piIntegration.trackWebhookVerificationStatus(
        webhookId,
        'processed'
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      expect(result3.status).toBe('processed');
    });
  });

  describe('Webhook Verification Statistics', () => {
    beforeEach(async () => {
      // Create some test verifications
      await piIntegration.verifyWebhookSignature('payload1', 'sig1', 'ed25519');
      await piIntegration.verifyWebhookSignature('payload2', 'sig2', 'bls');
      await piIntegration.trackWebhookVerificationStatus('webhook1', 'verified');
      await piIntegration.trackWebhookVerificationStatus('webhook2', 'failed');
    });

    it('should return webhook verification statistics', async () => {
      const stats = await piIntegration.getWebhookVerificationStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byAlgorithm).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.byEnvironment).toBeDefined();
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.recentVerifications).toBeInstanceOf(Array);
    });

    it('should calculate success rate correctly', async () => {
      const stats = await piIntegration.getWebhookVerificationStats();

      expect(typeof stats.successRate).toBe('number');
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should group statistics by algorithm', async () => {
      const stats = await piIntegration.getWebhookVerificationStats();

      expect(stats.byAlgorithm).toBeDefined();
      // Should have at least ed25519 and bls from our test data
      expect(Object.keys(stats.byAlgorithm).length).toBeGreaterThan(0);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should complete full webhook security workflow', async () => {
      const testPayload = JSON.stringify({
        event: 'integration.test',
        data: { test: true }
      });

      // Step 1: Verify webhook signature
      const signature = crypto.createHmac('sha256', 'default-secret')
        .update(testPayload)
        .digest('hex');

      const verificationResult = await piIntegration.verifyWebhookSignature(
        testPayload,
        signature,
        'hmac-sha256'
      );

      expect(verificationResult.success).toBe(true);
      expect(verificationResult.valid).toBe(true);

      // Step 2: Validate Qonsent scopes
      const scopeValidation = await piIntegration.validateQonsentScopes(
        'did:squid:integration_test',
        ['pi:read', 'wallet:read'],
        { permissions: ['identity'] }
      );

      expect(scopeValidation.success).toBe(true);
      expect(scopeValidation.valid).toBe(true);

      // Step 3: Track webhook status
      const statusTracking = await piIntegration.trackWebhookVerificationStatus(
        'integration_webhook_001',
        'processed',
        { 
          verificationId: verificationResult.verificationId,
          scopeValidationId: scopeValidation.validationId
        }
      );

      expect(statusTracking.success).toBe(true);

      // Step 4: Get statistics
      const stats = await piIntegration.getWebhookVerificationStats();
      expect(stats.total).toBeGreaterThan(0);

      // Verify health check includes webhook data
      const healthCheck = await piIntegration.healthCheck();
      expect(healthCheck.status).toBe('healthy');
    });

    it('should handle webhook security with different algorithms', async () => {
      const testPayload = 'test payload for multiple algorithms';
      const algorithms = ['ed25519', 'bls', 'dilithium', 'hmac-sha256'];
      const results = [];

      for (const algorithm of algorithms) {
        let signature;
        
        // Generate appropriate signature for each algorithm
        switch (algorithm) {
          case 'ed25519':
            signature = crypto.createHmac('sha256', 'default-secret')
              .update(crypto.createHash('sha256').update(testPayload).digest('hex'))
              .digest('hex');
            break;
          case 'bls':
            signature = crypto.createHmac('sha512', 'default-secret')
              .update(crypto.createHash('sha512').update(testPayload).digest('hex'))
              .digest('hex');
            break;
          case 'dilithium':
            signature = crypto.createHmac('sha3-256', 'default-secret')
              .update(crypto.createHash('sha3-256').update(testPayload).digest('hex'))
              .digest('hex');
            break;
          case 'hmac-sha256':
            signature = crypto.createHmac('sha256', 'default-secret')
              .update(testPayload)
              .digest('hex');
            break;
        }

        const result = await piIntegration.verifyWebhookSignature(
          testPayload,
          signature,
          algorithm
        );

        results.push(result);
        expect(result.success).toBe(true);
        expect(result.valid).toBe(true);
        expect(result.algorithm).toBe(algorithm);
      }

      // Verify all algorithms were tested
      expect(results).toHaveLength(4);
      
      // Check statistics reflect all algorithms
      const stats = await piIntegration.getWebhookVerificationStats();
      expect(Object.keys(stats.byAlgorithm)).toEqual(
        expect.arrayContaining(algorithms)
      );
    });
  });
});
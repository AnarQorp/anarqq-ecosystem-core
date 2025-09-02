/**
 * WebhookService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookService } from '../webhooks/WebhookService.js';

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    webhookService = new WebhookService();
  });

  describe('registerWebhook', () => {
    it('should register a webhook configuration', async () => {
      const config = {
        flowId: 'test-flow-1',
        endpoint: '/webhooks/test',
        secret: 'test-secret',
        signatureHeader: 'x-signature',
        signatureAlgorithm: 'sha256' as const,
        allowedSources: ['github', 'stripe'],
        rateLimitPerMinute: 60,
        enabled: true,
        createdBy: 'user-123'
      };

      const webhookId = await webhookService.registerWebhook(config);

      expect(webhookId).toBeDefined();
      expect(webhookId).toMatch(/^webhook_\d+_[a-z0-9]+$/);

      const webhooks = webhookService.getWebhookConfigs('test-flow-1');
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].endpoint).toBe('/webhooks/test');
      expect(webhooks[0].enabled).toBe(true);
    });

    it('should throw error for invalid flow', async () => {
      const config = {
        flowId: 'non-existent-flow',
        endpoint: '/webhooks/test',
        enabled: true,
        createdBy: 'user-123'
      };

      // Mock getFlow to return null
      vi.spyOn(webhookService as any, 'getFlow').mockResolvedValue(null);

      await expect(webhookService.registerWebhook(config)).rejects.toThrow('Flow not found');
    });
  });

  describe('processWebhookEvent', () => {
    beforeEach(async () => {
      // Register a test webhook
      await webhookService.registerWebhook({
        flowId: 'test-flow-1',
        endpoint: '/webhooks/github',
        secret: 'github-secret',
        signatureHeader: 'x-hub-signature-256',
        signatureAlgorithm: 'sha256',
        allowedSources: ['github'],
        rateLimitPerMinute: 60,
        enabled: true,
        createdBy: 'user-123'
      });
    });

    it('should process valid webhook event', async () => {
      const headers = {
        'user-agent': 'GitHub-Hookshot/abc123',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=test-signature',
        'content-type': 'application/json'
      };

      const body = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { name: 'test-repo' },
        commits: [{ id: 'abc123', message: 'Test commit' }]
      });

      // Mock signature validation
      vi.spyOn(webhookService as any, 'validateSignature').mockReturnValue(true);
      
      // Mock pipeline validation
      vi.spyOn(webhookService as any, 'validateThroughPipeline').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });

      const result = await webhookService.processWebhookEvent(
        '/webhooks/github',
        headers,
        body,
        '192.168.1.1'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.processedEvent).toBeDefined();
      expect(result.processedEvent?.originalEvent.source).toBe('github');
      expect(result.processedEvent?.originalEvent.type).toBe('push');
    });

    it('should reject webhook with invalid signature', async () => {
      const headers = {
        'user-agent': 'GitHub-Hookshot/abc123',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=invalid-signature',
        'content-type': 'application/json'
      };

      const body = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { name: 'test-repo' }
      });

      // Mock signature validation to fail
      vi.spyOn(webhookService as any, 'validateSignature').mockReturnValue(false);

      const result = await webhookService.processWebhookEvent(
        '/webhooks/github',
        headers,
        body
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid webhook signature');
    });

    it('should reject webhook from disallowed source', async () => {
      const headers = {
        'user-agent': 'Unknown-Service/1.0',
        'x-custom-event': 'test',
        'content-type': 'application/json'
      };

      const body = JSON.stringify({ test: 'data' });

      const result = await webhookService.processWebhookEvent(
        '/webhooks/github',
        headers,
        body,
        '192.168.1.1'
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Source not allowed');
    });

    it('should handle rate limiting', async () => {
      // Register webhook with low rate limit
      await webhookService.registerWebhook({
        flowId: 'test-flow-2',
        endpoint: '/webhooks/rate-limited',
        rateLimitPerMinute: 1,
        enabled: true,
        createdBy: 'user-123'
      });

      const headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ test: 'data' });

      // Mock pipeline validation to succeed
      vi.spyOn(webhookService as any, 'validateThroughPipeline').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });

      // First request should succeed
      const result1 = await webhookService.processWebhookEvent(
        '/webhooks/rate-limited',
        headers,
        body
      );
      expect(result1.valid).toBe(true);

      // Second request should be rate limited
      const result2 = await webhookService.processWebhookEvent(
        '/webhooks/rate-limited',
        headers,
        body
      );
      expect(result2.valid).toBe(false);
      expect(result2.errors[0]).toContain('Rate limit exceeded');
    });

    it('should return error for non-existent endpoint', async () => {
      const headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ test: 'data' });

      const result = await webhookService.processWebhookEvent(
        '/webhooks/non-existent',
        headers,
        body
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Webhook endpoint not found');
    });

    it('should return error for disabled endpoint', async () => {
      // Register disabled webhook
      await webhookService.registerWebhook({
        flowId: 'test-flow-3',
        endpoint: '/webhooks/disabled',
        enabled: false,
        createdBy: 'user-123'
      });

      const headers = { 'content-type': 'application/json' };
      const body = JSON.stringify({ test: 'data' });

      const result = await webhookService.processWebhookEvent(
        '/webhooks/disabled',
        headers,
        body
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Webhook endpoint is disabled');
    });
  });

  describe('updateWebhookConfig', () => {
    let webhookId: string;

    beforeEach(async () => {
      webhookId = await webhookService.registerWebhook({
        flowId: 'test-flow-1',
        endpoint: '/webhooks/test',
        enabled: true,
        createdBy: 'user-123'
      });
    });

    it('should update webhook configuration', async () => {
      const updates = {
        secret: 'new-secret',
        rateLimitPerMinute: 120,
        enabled: false
      };

      const success = await webhookService.updateWebhookConfig(
        webhookId,
        updates,
        'user-123'
      );

      expect(success).toBe(true);

      const webhooks = webhookService.getWebhookConfigs('test-flow-1');
      expect(webhooks[0].secret).toBe('new-secret');
      expect(webhooks[0].rateLimitPerMinute).toBe(120);
      expect(webhooks[0].enabled).toBe(false);
    });

    it('should return false for non-existent webhook', async () => {
      const success = await webhookService.updateWebhookConfig(
        'non-existent-id',
        { enabled: false },
        'user-123'
      );

      expect(success).toBe(false);
    });
  });

  describe('deleteWebhookConfig', () => {
    let webhookId: string;

    beforeEach(async () => {
      webhookId = await webhookService.registerWebhook({
        flowId: 'test-flow-1',
        endpoint: '/webhooks/test',
        enabled: true,
        createdBy: 'user-123'
      });
    });

    it('should delete webhook configuration', async () => {
      const success = await webhookService.deleteWebhookConfig(webhookId, 'user-123');

      expect(success).toBe(true);

      const webhooks = webhookService.getWebhookConfigs('test-flow-1');
      expect(webhooks).toHaveLength(0);
    });

    it('should return false for non-existent webhook', async () => {
      const success = await webhookService.deleteWebhookConfig('non-existent-id', 'user-123');

      expect(success).toBe(false);
    });
  });

  describe('event schema registration', () => {
    it('should register custom event schema', () => {
      const schema = {
        name: 'custom-event',
        version: '1.0.0',
        source: 'custom-service',
        schema: {
          type: 'object' as const,
          properties: {
            eventType: { type: 'string' },
            payload: { type: 'object' }
          },
          required: ['eventType', 'payload']
        }
      };

      webhookService.registerEventSchema(schema);

      // Verify schema is registered by checking internal state
      const schemas = (webhookService as any).eventSchemas;
      expect(schemas.has('custom-service:custom-event:1.0.0')).toBe(true);
    });
  });

  describe('signature validation', () => {
    it('should validate SHA256 signature correctly', () => {
      const body = '{"test":"data"}';
      const secret = 'test-secret';
      
      // Generate expected signature
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');

      const isValid = (webhookService as any).validateSignature(
        body,
        secret,
        `sha256=${expectedSignature}`,
        'sha256'
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid SHA256 signature', () => {
      const body = '{"test":"data"}';
      const secret = 'test-secret';
      const invalidSignature = 'sha256=invalid-signature';

      const isValid = (webhookService as any).validateSignature(
        body,
        secret,
        invalidSignature,
        'sha256'
      );

      expect(isValid).toBe(false);
    });

    it('should validate SHA1 signature correctly', () => {
      const body = '{"test":"data"}';
      const secret = 'test-secret';
      
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha1', secret)
        .update(body, 'utf8')
        .digest('hex');

      const isValid = (webhookService as any).validateSignature(
        body,
        secret,
        `sha1=${expectedSignature}`,
        'sha1'
      );

      expect(isValid).toBe(true);
    });
  });
});
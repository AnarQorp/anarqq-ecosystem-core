/**
 * Tests for InterModuleSyncService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  InterModuleSyncService,
  getInterModuleSyncService,
  destroyInterModuleSyncService
} from '../InterModuleSyncService';
import type { ModuleEvent } from '../InterModuleSyncService';

// Mock dependencies
vi.mock('../../state/identity', () => ({
  getActiveIdentity: vi.fn(() => ({
    did: 'test-user-123',
    signMessage: vi.fn()
  }))
}));

const mockCreatePost = vi.fn().mockResolvedValue({
  id: 'post-123',
  title: 'Test Cross Post',
  content: 'Test content',
  author_id: 'test-user-123'
});

vi.mock('../CachedPostService', () => ({
  getCachedPostService: vi.fn(() => ({
    createPost: mockCreatePost
  }))
}));

vi.mock('../PerformanceMonitoringService', () => ({
  getPerformanceService: vi.fn(() => ({
    recordTiming: vi.fn().mockImplementation(async (name, fn, tags) => {
      if (typeof fn === 'function') {
        return await fn();
      }
      return Promise.resolve();
    })
  }))
}));

vi.mock('../CacheInvalidationService', () => ({
  getCacheInvalidationService: vi.fn(() => ({
    invalidateFeeds: vi.fn(),
    invalidateSearch: vi.fn()
  }))
}));

describe('InterModuleSyncService', () => {
  let service: InterModuleSyncService;

  beforeEach(() => {
    service = new InterModuleSyncService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Module Integration Management', () => {
    it('should have default integrations configured', () => {
      const integrations = service.getAllIntegrations();
      
      expect(integrations.length).toBeGreaterThan(0);
      
      const qmarketIntegration = integrations.find(i => i.module === 'qmarket');
      expect(qmarketIntegration).toBeDefined();
      expect(qmarketIntegration?.enabled).toBe(true);
      expect(qmarketIntegration?.crossPostConfig.autoPost).toBe(true);
    });

    it('should allow updating module integration', () => {
      const newIntegration = {
        module: 'test-module',
        apiEndpoint: '/api/test',
        enabled: true,
        crossPostConfig: {
          enabled: true,
          autoPost: false,
          requireApproval: true,
          tags: ['test'],
          template: 'Test template',
          visibility: 'public' as const
        }
      };

      service.setModuleIntegration('test-module', newIntegration);
      
      const retrieved = service.getModuleIntegration('test-module');
      expect(retrieved).toEqual(newIntegration);
    });

    it('should allow toggling integration status', () => {
      service.toggleIntegration('qmarket', false);
      
      const integration = service.getModuleIntegration('qmarket');
      expect(integration?.enabled).toBe(false);
      
      service.toggleIntegration('qmarket', true);
      expect(integration?.enabled).toBe(true);
    });
  });

  describe('Event Processing', () => {
    it('should process module event successfully', async () => {
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'test-user-123',
        data: {
          title: 'Test Product',
          description: 'Test description',
          price: '100',
          currency: 'QARMA'
        },
        timestamp: Date.now()
      };

      const result = await service.processModuleEvent(event);
      
      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
    });

    it('should skip processing for disabled integration', async () => {
      service.toggleIntegration('qmarket', false);
      
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'test-user-123',
        data: { title: 'Test Product' },
        timestamp: Date.now()
      };

      const result = await service.processModuleEvent(event);
      
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('disabled');
    });

    it('should handle user identity mismatch', async () => {
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'different-user',
        data: { title: 'Test Product' },
        timestamp: Date.now()
      };

      const result = await service.processModuleEvent(event);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('identity mismatch');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle webhook successfully', async () => {
      const payload = {
        eventType: 'created',
        entityId: 'item-123',
        userId: 'test-user-123',
        data: {
          title: 'Test Item',
          description: 'Test description'
        }
      };

      const result = await service.handleWebhook('qmarket', payload);
      
      expect(result.success).toBe(true);
    });

    it('should reject webhook for unknown module', async () => {
      const payload = {
        eventType: 'created',
        entityId: 'item-123',
        userId: 'test-user-123'
      };

      const result = await service.handleWebhook('unknown-module', payload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No integration found');
    });

    it('should verify webhook signature when provided', async () => {
      const integration = service.getModuleIntegration('qmarket');
      if (integration) {
        integration.webhookSecret = 'test-secret';
        service.setModuleIntegration('qmarket', integration);
      }

      const payload = { eventType: 'created', entityId: 'item-123', userId: 'test-user-123' };
      const invalidSignature = 'invalid-signature';

      const result = await service.handleWebhook('qmarket', payload, invalidSignature);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
    });
  });

  describe('Content Generation', () => {
    it('should generate post content using template', async () => {
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'test-user-123',
        data: {
          title: 'Amazing NFT',
          description: 'Beautiful digital art',
          price: '50',
          currency: 'QARMA'
        },
        timestamp: Date.now()
      };

      const result = await service.processModuleEvent(event);
      
      expect(result.success).toBe(true);
      expect(result.postId).toBeDefined();
    });

    it('should extract appropriate title from event data', async () => {
      const event: ModuleEvent = {
        module: 'qdrive',
        eventType: 'uploaded',
        entityId: 'file-123',
        entityType: 'file',
        userId: 'test-user-123',
        data: {
          filename: 'document.pdf',
          size: '2.5 MB',
          type: 'PDF'
        },
        timestamp: Date.now()
      };

      const result = await service.processModuleEvent(event);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Event Queue Management', () => {
    it('should queue events for processing', () => {
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'test-user-123',
        data: { title: 'Test Product' },
        timestamp: Date.now()
      };

      service.queueEvent(event);
      
      const stats = service.getSyncStats();
      expect(stats.queuedEvents).toBe(1);
    });

    it('should clear event queue', () => {
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'test-user-123',
        data: { title: 'Test Product' },
        timestamp: Date.now()
      };

      service.queueEvent(event);
      expect(service.getSyncStats().queuedEvents).toBe(1);
      
      service.clearEventQueue();
      expect(service.getSyncStats().queuedEvents).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide sync statistics', () => {
      const stats = service.getSyncStats();
      
      expect(stats).toHaveProperty('totalIntegrations');
      expect(stats).toHaveProperty('enabledIntegrations');
      expect(stats).toHaveProperty('autoPostEnabled');
      expect(stats).toHaveProperty('queuedEvents');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('integrations');
      
      expect(typeof stats.totalIntegrations).toBe('number');
      expect(typeof stats.enabledIntegrations).toBe('number');
      expect(typeof stats.processing).toBe('boolean');
    });

    it('should track enabled integrations correctly', () => {
      service.toggleIntegration('qmarket', false);
      service.toggleIntegration('qdrive', false);
      
      const stats = service.getSyncStats();
      
      expect(stats.enabledIntegrations).toBeLessThan(stats.totalIntegrations);
    });
  });

  describe('Service Lifecycle', () => {
    it('should destroy service cleanly', () => {
      const event: ModuleEvent = {
        module: 'qmarket',
        eventType: 'created',
        entityId: 'product-123',
        entityType: 'product',
        userId: 'test-user-123',
        data: { title: 'Test Product' },
        timestamp: Date.now()
      };

      service.queueEvent(event);
      expect(service.getSyncStats().queuedEvents).toBe(1);
      
      service.destroy();
      
      // After destroy, stats should be reset
      const stats = service.getSyncStats();
      expect(stats.queuedEvents).toBe(0);
      expect(stats.totalIntegrations).toBe(0);
    });
  });
});

describe('Singleton InterModuleSyncService', () => {
  afterEach(() => {
    destroyInterModuleSyncService();
  });

  it('should return the same instance', () => {
    const service1 = getInterModuleSyncService();
    const service2 = getInterModuleSyncService();
    
    expect(service1).toBe(service2);
  });

  it('should create new instance after destroy', () => {
    const service1 = getInterModuleSyncService();
    destroyInterModuleSyncService();
    const service2 = getInterModuleSyncService();
    
    expect(service1).not.toBe(service2);
  });
});
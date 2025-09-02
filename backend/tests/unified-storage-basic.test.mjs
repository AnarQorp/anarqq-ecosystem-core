/**
 * Basic Unified Storage Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger to avoid import issues
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

describe('UnifiedStorageService Basic Tests', () => {
  let UnifiedStorageService;
  let storageService;

  beforeEach(async () => {
    // Dynamically import the service to avoid early import issues
    const module = await import('../services/UnifiedStorageService.mjs');
    UnifiedStorageService = module.default;

    // Mock dependencies
    const mockDependencies = {
      ipfsService: {
        add: vi.fn(),
        pin: vi.fn(),
        unpin: vi.fn(),
        stat: vi.fn(),
        get: vi.fn()
      },
      eventBus: {
        publish: vi.fn(),
        subscribe: vi.fn()
      },
      qerberosService: {
        audit: vi.fn()
      },
      qindexService: {
        put: vi.fn(),
        get: vi.fn()
      },
      qwalletService: {
        processPayment: vi.fn()
      }
    };

    storageService = new UnifiedStorageService(mockDependencies);
  });

  it('should create UnifiedStorageService instance', () => {
    expect(storageService).toBeDefined();
    expect(storageService.initialized).toBe(false);
  });

  it('should initialize successfully', async () => {
    await storageService.initialize();
    expect(storageService.initialized).toBe(true);
  });

  it('should load default pinning policies', async () => {
    await storageService.initialize();
    
    expect(storageService.pinningPolicies.size).toBeGreaterThan(0);
    expect(storageService.pinningPolicies.has('default')).toBe(true);
    expect(storageService.pinningPolicies.has('public')).toBe(true);
    expect(storageService.pinningPolicies.has('hot')).toBe(true);
    expect(storageService.pinningPolicies.has('cold')).toBe(true);
  });

  it('should check storage quota', async () => {
    await storageService.initialize();
    
    const squidId = 'test-user-123';
    const requestedSize = 1024 * 1024; // 1MB
    
    const result = await storageService.checkStorageQuota(squidId, requestedSize);
    
    expect(result).toBeDefined();
    expect(result.squidId).toBe(squidId);
    expect(result.withinLimit).toBe(true);
    expect(result.warningLevel).toBe('normal');
  });

  it('should detect content deduplication', async () => {
    await storageService.initialize();
    
    const fileBuffer = Buffer.from('test content for deduplication');
    const metadata = { size: fileBuffer.length };
    
    const result = await storageService.deduplicateContent(fileBuffer, metadata);
    
    expect(result).toBeDefined();
    expect(result.isDuplicate).toBe(false);
    expect(result.contentHash).toBeDefined();
  });

  it('should get storage statistics', async () => {
    await storageService.initialize();
    
    const stats = await storageService.getStorageStats();
    
    expect(stats).toBeDefined();
    expect(stats.initialized).toBe(true);
    expect(stats.pinningPolicies).toBeGreaterThan(0);
    expect(stats.timestamp).toBeDefined();
  });

  it('should shutdown gracefully', async () => {
    await storageService.initialize();
    expect(storageService.initialized).toBe(true);
    
    await storageService.shutdown();
    expect(storageService.initialized).toBe(false);
  });
});
/**
 * Unified Storage Service Tests
 * 
 * Tests for comprehensive IPFS storage management including:
 * - Pinning policy management
 * - Content deduplication
 * - Storage quota management
 * - Garbage collection
 * - Backup verification
 * - Disaster recovery
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import UnifiedStorageService from '../services/UnifiedStorageService.mjs';

// Mock dependencies
const mockIPFSService = {
  add: vi.fn(),
  pin: vi.fn(),
  unpin: vi.fn(),
  stat: vi.fn(),
  get: vi.fn()
};

const mockEventBus = {
  publish: vi.fn(),
  subscribe: vi.fn()
};

const mockQerberosService = {
  audit: vi.fn()
};

const mockQindexService = {
  put: vi.fn(),
  get: vi.fn()
};

const mockQwalletService = {
  processPayment: vi.fn()
};

describe('UnifiedStorageService', () => {
  let storageService;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create service instance
    storageService = new UnifiedStorageService({
      ipfsService: mockIPFSService,
      eventBus: mockEventBus,
      qerberosService: mockQerberosService,
      qindexService: mockQindexService,
      qwalletService: mockQwalletService
    });

    // Initialize service
    await storageService.initialize();
  });

  afterEach(async () => {
    if (storageService) {
      await storageService.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(storageService.initialized).toBe(true);
      expect(storageService.pinningPolicies.size).toBeGreaterThan(0);
    });

    it('should load default pinning policies', async () => {
      expect(storageService.pinningPolicies.has('default')).toBe(true);
      expect(storageService.pinningPolicies.has('public')).toBe(true);
      expect(storageService.pinningPolicies.has('hot')).toBe(true);
      expect(storageService.pinningPolicies.has('cold')).toBe(true);
    });

    it('should start background processes', async () => {
      expect(storageService.intervals.size).toBeGreaterThan(0);
    });
  });

  describe('Pinning Policy Management', () => {
    it('should apply default pinning policy', async () => {
      const cid = 'QmTestCID123';
      const metadata = { size: 1024, privacy: 'private' };
      
      mockIPFSService.pin.mockResolvedValue();
      
      const result = await storageService.applyPinningPolicy(cid, metadata);
      
      expect(result.success).toBe(true);
      expect(result.policy).toBe('default');
      expect(mockIPFSService.pin).toHaveBeenCalled();
    });

    it('should select hot policy for frequently accessed files', async () => {
      const cid = 'QmTestCID123';
      const metadata = { size: 1024, privacy: 'private', accessCount: 150 };
      
      mockIPFSService.pin.mockResolvedValue();
      
      const result = await storageService.applyPinningPolicy(cid, metadata);
      
      expect(result.policy).toBe('hot');
    });

    it('should select cold policy for rarely accessed files', async () => {
      const cid = 'QmTestCID123';
      const metadata = { 
        size: 1024, 
        privacy: 'private', 
        accessCount: 2,
        lastAccessed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
      };
      
      mockIPFSService.pin.mockResolvedValue();
      
      const result = await storageService.applyPinningPolicy(cid, metadata);
      
      expect(result.policy).toBe('cold');
    });

    it('should select public policy for public files', async () => {
      const cid = 'QmTestCID123';
      const metadata = { size: 1024, privacy: 'public' };
      
      mockIPFSService.pin.mockResolvedValue();
      
      const result = await storageService.applyPinningPolicy(cid, metadata);
      
      expect(result.policy).toBe('public');
    });
  });

  describe('Content Deduplication', () => {
    it('should detect duplicate content', async () => {
      const fileBuffer = Buffer.from('test content');
      const metadata = { size: fileBuffer.length };
      
      // First upload
      const result1 = await storageService.deduplicateContent(fileBuffer, metadata);
      expect(result1.isDuplicate).toBe(false);
      
      // Register the content
      await storageService.registerContent('QmTestCID123', result1.contentHash, fileBuffer.length);
      
      // Mock content availability
      mockIPFSService.stat.mockResolvedValue({ cumulativeSize: fileBuffer.length });
      
      // Second upload (duplicate)
      const result2 = await storageService.deduplicateContent(fileBuffer, metadata);
      expect(result2.isDuplicate).toBe(true);
      expect(result2.originalCid).toBe('QmTestCID123');
      expect(result2.spaceSaved).toBe(fileBuffer.length);
    });

    it('should handle unavailable duplicate content', async () => {
      const fileBuffer = Buffer.from('test content');
      const metadata = { size: fileBuffer.length };
      
      // First upload
      const result1 = await storageService.deduplicateContent(fileBuffer, metadata);
      await storageService.registerContent('QmTestCID123', result1.contentHash, fileBuffer.length);
      
      // Mock content unavailable
      mockIPFSService.stat.mockRejectedValue(new Error('Content not found'));
      
      // Second upload should not detect duplicate
      const result2 = await storageService.deduplicateContent(fileBuffer, metadata);
      expect(result2.isDuplicate).toBe(false);
    });

    it('should skip deduplication for small files', async () => {
      const smallBuffer = Buffer.from('x'); // 1 byte
      const metadata = { size: smallBuffer.length };
      
      const result = await storageService.deduplicateContent(smallBuffer, metadata);
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('Storage Quota Management', () => {
    it('should check storage quota within limits', async () => {
      const squidId = 'test-user-123';
      const requestedSize = 1024 * 1024; // 1MB
      
      const result = await storageService.checkStorageQuota(squidId, requestedSize);
      
      expect(result.withinLimit).toBe(true);
      expect(result.warningLevel).toBe('normal');
      expect(result.available).toBeGreaterThan(0);
    });

    it('should detect quota exceeded', async () => {
      const squidId = 'test-user-123';
      const largeSize = 2 * 1024 * 1024 * 1024; // 2GB (exceeds default 1GB quota)
      
      const result = await storageService.checkStorageQuota(squidId, largeSize);
      
      expect(result.withinLimit).toBe(false);
      expect(result.overage).toBeDefined();
      expect(result.overage.cost).toBeGreaterThan(0);
    });

    it('should update storage usage', async () => {
      const squidId = 'test-user-123';
      const sizeChange = 1024 * 1024; // 1MB
      
      const result = await storageService.updateStorageUsage(squidId, sizeChange);
      
      expect(result.used).toBe(sizeChange);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should trigger quota alerts', async () => {
      const squidId = 'test-user-123';
      const warningSize = 0.85 * 1024 * 1024 * 1024; // 85% of 1GB
      
      await storageService.updateStorageUsage(squidId, warningSize);
      
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'q.storage.quota.alert.v1',
        expect.objectContaining({
          actor: { squidId },
          data: expect.objectContaining({
            warningLevel: 'warning'
          })
        })
      );
    });
  });

  describe('Access Pattern Optimization', () => {
    it('should update access patterns', async () => {
      const cid = 'QmTestCID123';
      
      const pattern = await storageService.updateAccessPattern(cid, 'read');
      
      expect(pattern.totalAccess).toBe(1);
      expect(pattern.dailyAccess).toBe(1);
      expect(pattern.accessTypes.read).toBe(1);
      expect(pattern.lastAccessed).toBeDefined();
    });

    it('should adjust replication for hot content', async () => {
      const cid = 'QmTestCID123';
      
      // Set up replication status
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 2,
        targetReplicas: 2
      });
      
      // Simulate high access
      const pattern = {
        totalAccess: 100,
        dailyAccess: 60,
        lastAccessed: new Date().toISOString(),
        accessTypes: { read: 100 }
      };
      storageService.accessPatterns.set(cid, pattern);
      
      mockIPFSService.pin.mockResolvedValue();
      
      await storageService.evaluateReplicationAdjustment(cid, pattern);
      
      expect(mockIPFSService.pin).toHaveBeenCalled();
    });
  });

  describe('Garbage Collection', () => {
    it('should process garbage collection queue', async () => {
      const cid = 'QmTestCID123';
      storageService.garbageCollectionQueue.add(cid);
      
      // Mock evaluation to delete
      vi.spyOn(storageService, 'evaluateForDeletion').mockResolvedValue({
        delete: true,
        reason: 'retention_expired',
        size: 1024
      });
      
      mockIPFSService.unpin.mockResolvedValue();
      
      const stats = await storageService.startGarbageCollection();
      
      expect(stats.filesProcessed).toBe(1);
      expect(stats.filesDeleted).toBe(1);
      expect(stats.spaceFree).toBe(1024);
      expect(mockIPFSService.unpin).toHaveBeenCalledWith(cid);
    });

    it('should evaluate content for deletion based on retention', async () => {
      const cid = 'QmTestCID123';
      
      // Mock metadata with expired retention
      vi.spyOn(storageService, 'getContentMetadata').mockResolvedValue({
        retentionPolicy: {
          deleteAt: new Date(Date.now() - 1000).toISOString() // Expired
        },
        size: 1024
      });
      
      const result = await storageService.evaluateForDeletion(cid);
      
      expect(result.delete).toBe(true);
      expect(result.reason).toBe('retention_expired');
    });

    it('should not delete content with active references', async () => {
      const cid = 'QmTestCID123';
      
      mockQindexService.get.mockResolvedValue(['ref1', 'ref2']);
      
      const result = await storageService.evaluateForDeletion(cid);
      
      expect(result.delete).toBe(false);
      expect(result.reason).toBe('has_references');
    });
  });

  describe('Backup Verification', () => {
    it('should verify backups successfully', async () => {
      const cid = 'QmTestCID123';
      
      // Set up replication status
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 2,
        targetReplicas: 2
      });
      
      mockIPFSService.stat.mockResolvedValue({ cumulativeSize: 1024 });
      
      const stats = await storageService.verifyBackups();
      
      expect(stats.backupsChecked).toBe(1);
      expect(stats.backupsHealthy).toBe(1);
      expect(stats.backupsFailed).toBe(0);
    });

    it('should detect degraded backups', async () => {
      const cid = 'QmTestCID123';
      
      // Set up degraded replication status
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 1, // Below target
        targetReplicas: 2
      });
      
      mockIPFSService.stat.mockResolvedValue({ cumulativeSize: 1024 });
      
      const stats = await storageService.verifyBackups();
      
      expect(stats.backupsDegraded).toBe(1);
    });

    it('should detect failed backups', async () => {
      const cid = 'QmTestCID123';
      
      // Set up failed replication status
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 0, // Below minimum
        targetReplicas: 2
      });
      
      mockIPFSService.stat.mockRejectedValue(new Error('Content not found'));
      
      const stats = await storageService.verifyBackups();
      
      expect(stats.backupsFailed).toBe(1);
    });
  });

  describe('Disaster Recovery', () => {
    it('should perform disaster recovery test', async () => {
      mockIPFSService.add.mockResolvedValue({ cid: { toString: () => 'QmTestCID123' } });
      mockIPFSService.pin.mockResolvedValue();
      mockIPFSService.unpin.mockResolvedValue();
      mockIPFSService.stat.mockResolvedValue({ cumulativeSize: 1024 });
      
      const testResults = await storageService.performDisasterRecoveryTest();
      
      expect(testResults.overallStatus).toBeDefined();
      expect(testResults.backupRestoreTest).toBeDefined();
      expect(testResults.replicationTest).toBeDefined();
      expect(testResults.integrityTest).toBeDefined();
      expect(testResults.performanceTest).toBeDefined();
    });

    it('should test backup restore functionality', async () => {
      mockIPFSService.add.mockResolvedValue({ cid: { toString: () => 'QmTestCID123' } });
      mockIPFSService.pin.mockResolvedValue();
      mockIPFSService.unpin.mockResolvedValue();
      mockIPFSService.stat.mockResolvedValue({ cumulativeSize: 1024 });
      
      const result = await storageService.testBackupRestore();
      
      expect(result.test).toBe('backup_restore');
      expect(result.status).toBe('passed');
      expect(result.testCid).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    it('should handle file created events', async () => {
      const event = {
        topic: 'q.qdrive.file.created.v1',
        data: {
          cid: 'QmTestCID123',
          metadata: { size: 1024, privacy: 'private' },
          actor: { squidId: 'test-user-123' }
        }
      };
      
      mockIPFSService.pin.mockResolvedValue();
      
      await storageService.handleEvent(event);
      
      expect(storageService.replicationStatus.has('QmTestCID123')).toBe(true);
      expect(storageService.storageQuotas.has('test-user-123')).toBe(true);
    });

    it('should handle file accessed events', async () => {
      const event = {
        topic: 'q.qdrive.file.accessed.v1',
        data: {
          cid: 'QmTestCID123',
          accessType: 'read'
        }
      };
      
      await storageService.handleEvent(event);
      
      expect(storageService.accessPatterns.has('QmTestCID123')).toBe(true);
    });

    it('should handle file deleted events', async () => {
      const event = {
        topic: 'q.qdrive.file.deleted.v1',
        data: {
          cid: 'QmTestCID123',
          metadata: { size: 1024 },
          actor: { squidId: 'test-user-123' }
        }
      };
      
      // Set up initial usage
      await storageService.updateStorageUsage('test-user-123', 2048);
      
      await storageService.handleEvent(event);
      
      expect(storageService.garbageCollectionQueue.has('QmTestCID123')).toBe(true);
      
      const quota = storageService.storageQuotas.get('test-user-123');
      expect(quota.used).toBe(1024); // 2048 - 1024
    });

    it('should handle quota exceeded events', async () => {
      const event = {
        topic: 'q.storage.quota.exceeded.v1',
        data: {
          squidId: 'test-user-123',
          overage: {
            size: 1024 * 1024 * 1024, // 1GB
            cost: 0.1
          }
        }
      };
      
      mockQwalletService.processPayment.mockResolvedValue({ success: true });
      
      await storageService.handleEvent(event);
      
      expect(mockQwalletService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: { squidId: 'test-user-123' },
          amount: 0.1,
          currency: 'QToken',
          purpose: 'storage_overage'
        })
      );
    });
  });

  describe('Utility Methods', () => {
    it('should match policy conditions correctly', () => {
      const metadata = { size: 1024, privacy: 'public', accessCount: 50 };
      const conditions = {
        fileSize: { min: 0, max: 2048 },
        privacy: ['public', 'private'],
        accessCount: { min: 10, max: 100 }
      };
      
      const matches = storageService.matchesPolicyConditions(metadata, conditions);
      expect(matches).toBe(true);
    });

    it('should not match policy conditions when size exceeds limit', () => {
      const metadata = { size: 3072, privacy: 'public' };
      const conditions = {
        fileSize: { min: 0, max: 2048 },
        privacy: ['public']
      };
      
      const matches = storageService.matchesPolicyConditions(metadata, conditions);
      expect(matches).toBe(false);
    });

    it('should get storage statistics', async () => {
      const stats = await storageService.getStorageStats();
      
      expect(stats.initialized).toBe(true);
      expect(stats.pinningPolicies).toBeGreaterThan(0);
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('Audit Integration', () => {
    it('should audit pinning operations', async () => {
      const cid = 'QmTestCID123';
      const policyId = 'default';
      const results = { successful: 2, failed: 0, regions: ['us-east-1', 'eu-west-1'] };
      
      await storageService.auditPinningOperation(cid, policyId, results);
      
      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_PINNING_APPLIED',
          data: expect.objectContaining({
            cid,
            policyId,
            successfulReplicas: 2,
            failedReplicas: 0
          }),
          outcome: 'SUCCESS'
        })
      );
    });

    it('should audit garbage collection', async () => {
      const stats = { filesProcessed: 10, filesDeleted: 5, spaceFree: 5120 };
      
      await storageService.auditGarbageCollection(stats);
      
      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_GARBAGE_COLLECTION',
          data: expect.objectContaining(stats),
          outcome: 'SUCCESS'
        })
      );
    });
  });
});
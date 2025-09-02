/**
 * Comprehensive Unified Storage Service Tests
 * 
 * Tests all aspects of the unified storage management system:
 * - Pinning policies and automation
 * - Content deduplication and optimization
 * - Storage quota management and billing
 * - Backup verification and disaster recovery
 * - Garbage collection automation
 * - Access pattern optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import UnifiedStorageService from '../services/UnifiedStorageService.mjs';

// Mock dependencies
const mockIpfsService = {
  add: vi.fn(),
  cat: vi.fn(),
  pin: vi.fn(),
  unpin: vi.fn(),
  stat: vi.fn(),
  ls: vi.fn()
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
      ipfsService: mockIpfsService,
      eventBus: mockEventBus,
      qerberosService: mockQerberosService,
      qindexService: mockQindexService,
      qwalletService: mockQwalletService
    });

    // Initialize service
    await storageService.initialize();
  });

  afterEach(async () => {
    if (storageService.initialized) {
      await storageService.shutdown();
    }
  });

  // ==================== INITIALIZATION TESTS ====================

  describe('Initialization', () => {
    it('should initialize successfully with all dependencies', async () => {
      expect(storageService.initialized).toBe(true);
      expect(storageService.pinningPolicies.size).toBeGreaterThan(0);
      expect(storageService.intervals.size).toBeGreaterThan(0);
    });

    it('should load default pinning policies', async () => {
      expect(storageService.pinningPolicies.has('default')).toBe(true);
      expect(storageService.pinningPolicies.has('public')).toBe(true);
      expect(storageService.pinningPolicies.has('hot')).toBe(true);
      expect(storageService.pinningPolicies.has('cold')).toBe(true);
    });

    it('should start background processes', async () => {
      expect(storageService.intervals.has('garbageCollection')).toBe(true);
      expect(storageService.intervals.has('backupVerification')).toBe(true);
      expect(storageService.intervals.has('disasterRecoveryTest')).toBe(true);
      expect(storageService.intervals.has('accessPatternReset')).toBe(true);
    });
  });

  // ==================== PINNING POLICY TESTS ====================

  describe('Pinning Policies', () => {
    it('should apply default pinning policy', async () => {
      const cid = 'QmTest123';
      const metadata = { size: 1024, privacy: 'private' };

      mockIpfsService.pin.mockResolvedValue({ success: true });

      const result = await storageService.applyPinningPolicy(cid, metadata);

      expect(result.success).toBe(true);
      expect(result.policy).toBe('default');
      expect(result.replicas).toBeGreaterThan(0);
      expect(mockIpfsService.pin).toHaveBeenCalled();
    });

    it('should select hot policy for high-access content', async () => {
      const cid = 'QmTest456';
      const metadata = { 
        size: 1024, 
        privacy: 'public',
        accessCount: 150 
      };

      mockIpfsService.pin.mockResolvedValue({ success: true });

      const result = await storageService.applyPinningPolicy(cid, metadata);

      expect(result.policy).toBe('hot');
      expect(result.replicas).toBeGreaterThanOrEqual(5);
    });

    it('should select cold policy for old, rarely accessed content', async () => {
      const cid = 'QmTest789';
      const metadata = { 
        size: 1024, 
        privacy: 'private',
        accessCount: 2,
        lastAccessed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
      };

      mockIpfsService.pin.mockResolvedValue({ success: true });

      const result = await storageService.applyPinningPolicy(cid, metadata);

      expect(result.policy).toBe('cold');
      expect(result.replicas).toBeLessThanOrEqual(2);
    });

    it('should handle pinning failures gracefully', async () => {
      const cid = 'QmTestFail';
      const metadata = { size: 1024, privacy: 'private' };

      mockIpfsService.pin.mockRejectedValue(new Error('Pinning failed'));

      const result = await storageService.applyPinningPolicy(cid, metadata);

      expect(result.success).toBe(true);
      expect(result.replicas).toBe(0);
      expect(storageService.replicationStatus.get(cid).status).toBe('degraded');
    });
  });

  // ==================== CONTENT DEDUPLICATION TESTS ====================

  describe('Content Deduplication', () => {
    it('should detect duplicate content', async () => {
      const fileBuffer = Buffer.from('test content');
      const metadata = { filename: 'test.txt' };

      // First upload
      const result1 = await storageService.deduplicateContent(fileBuffer, metadata);
      expect(result1.isDuplicate).toBe(false);
      expect(result1.contentHash).toBeDefined();

      // Register the content
      await storageService.registerContent('QmTest123', result1.contentHash, fileBuffer.length);

      // Second upload (duplicate)
      const result2 = await storageService.deduplicateContent(fileBuffer, metadata);
      expect(result2.isDuplicate).toBe(true);
      expect(result2.originalCid).toBe('QmTest123');
      expect(result2.spaceSaved).toBe(fileBuffer.length);
    });

    it('should skip deduplication for small files', async () => {
      const smallBuffer = Buffer.from('x'); // 1 byte
      const metadata = { filename: 'small.txt' };

      const result = await storageService.deduplicateContent(smallBuffer, metadata);

      expect(result.isDuplicate).toBe(false);
      expect(result.contentHash).toBeUndefined();
    });

    it('should verify content availability for duplicates', async () => {
      const fileBuffer = Buffer.from('test content');
      const metadata = { filename: 'test.txt' };

      // Register content that doesn't exist
      await storageService.registerContent('QmNonExistent', 'hash123', fileBuffer.length);
      
      mockIpfsService.stat.mockRejectedValue(new Error('Not found'));

      const result = await storageService.deduplicateContent(fileBuffer, metadata);

      expect(result.isDuplicate).toBe(false);
      expect(storageService.deduplicationCache.has('hash123')).toBe(false);
    });
  });

  // ==================== STORAGE QUOTA TESTS ====================

  describe('Storage Quota Management', () => {
    it('should check storage quota within limits', async () => {
      const squidId = 'test-user-1';
      const requestedSize = 1024 * 1024; // 1MB

      const result = await storageService.checkStorageQuota(squidId, requestedSize);

      expect(result.withinLimit).toBe(true);
      expect(result.squidId).toBe(squidId);
      expect(result.requestedSize).toBe(requestedSize);
      expect(result.warningLevel).toBe('normal');
    });

    it('should detect quota exceeded', async () => {
      const squidId = 'test-user-2';
      const largeSize = 2 * 1024 * 1024 * 1024; // 2GB (exceeds default 1GB)

      const result = await storageService.checkStorageQuota(squidId, largeSize);

      expect(result.withinLimit).toBe(false);
      expect(result.overage).toBeDefined();
      expect(result.overage.cost).toBeGreaterThan(0);
    });

    it('should update storage usage correctly', async () => {
      const squidId = 'test-user-3';
      const sizeIncrease = 100 * 1024 * 1024; // 100MB

      const quota = await storageService.updateStorageUsage(squidId, sizeIncrease);

      expect(quota.used).toBe(sizeIncrease);
      expect(quota.lastUpdated).toBeDefined();
    });

    it('should trigger quota alerts', async () => {
      const squidId = 'test-user-4';
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

  // ==================== ACCESS PATTERN TESTS ====================

  describe('Access Pattern Optimization', () => {
    it('should update access patterns', async () => {
      const cid = 'QmAccess123';

      const pattern = await storageService.updateAccessPattern(cid, 'read');

      expect(pattern.totalAccess).toBe(1);
      expect(pattern.dailyAccess).toBe(1);
      expect(pattern.accessTypes.read).toBe(1);
      expect(pattern.lastAccessed).toBeDefined();
    });

    it('should adjust replication for hot content', async () => {
      const cid = 'QmHot123';
      
      // Set up initial replication status
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 2,
        targetReplicas: 2,
        regions: ['us-east-1', 'eu-west-1'],
        status: 'healthy'
      });

      // Simulate high access
      for (let i = 0; i < 60; i++) {
        await storageService.updateAccessPattern(cid, 'read');
      }

      const replicationStatus = storageService.replicationStatus.get(cid);
      expect(replicationStatus.replicas).toBeGreaterThan(2);
      expect(replicationStatus.adjustmentReason).toBe('high_access');
    });

    it('should reduce replication for cold content', async () => {
      const cid = 'QmCold123';
      const policy = storageService.pinningPolicies.get('default');
      
      // Set up initial replication status with higher replicas
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 4,
        targetReplicas: 4,
        regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2'],
        status: 'healthy'
      });

      // Set up old access pattern
      storageService.accessPatterns.set(cid, {
        totalAccess: 5,
        dailyAccess: 0,
        weeklyAccess: 0,
        lastAccessed: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
        accessTypes: {},
        regions: {},
        lastReset: new Date().toISOString()
      });

      await storageService.evaluateReplicationAdjustment(cid, storageService.accessPatterns.get(cid));

      const replicationStatus = storageService.replicationStatus.get(cid);
      expect(replicationStatus.replicas).toBeLessThan(4);
      expect(replicationStatus.adjustmentReason).toBe('low_access');
    });
  });

  // ==================== GARBAGE COLLECTION TESTS ====================

  describe('Garbage Collection', () => {
    it('should process garbage collection queue', async () => {
      const cid = 'QmGarbage123';
      
      // Add to garbage collection queue
      storageService.garbageCollectionQueue.add(cid);
      
      // Mock evaluation to delete
      vi.spyOn(storageService, 'evaluateForDeletion').mockResolvedValue({
        delete: true,
        reason: 'orphaned_content',
        size: 1024
      });
      
      mockIpfsService.unpin.mockResolvedValue({ success: true });

      const stats = await storageService.startGarbageCollection();

      expect(stats.filesProcessed).toBe(1);
      expect(stats.filesDeleted).toBe(1);
      expect(stats.spaceFree).toBe(1024);
      expect(mockIpfsService.unpin).toHaveBeenCalledWith(cid);
    });

    it('should not delete content with references', async () => {
      const cid = 'QmReferenced123';
      
      storageService.garbageCollectionQueue.add(cid);
      
      // Mock evaluation to keep
      vi.spyOn(storageService, 'evaluateForDeletion').mockResolvedValue({
        delete: false,
        reason: 'has_references'
      });

      const stats = await storageService.startGarbageCollection();

      expect(stats.filesProcessed).toBe(1);
      expect(stats.filesDeleted).toBe(0);
      expect(mockIpfsService.unpin).not.toHaveBeenCalled();
    });

    it('should handle garbage collection errors gracefully', async () => {
      const cid = 'QmError123';
      
      storageService.garbageCollectionQueue.add(cid);
      
      vi.spyOn(storageService, 'evaluateForDeletion').mockRejectedValue(new Error('Evaluation failed'));

      const stats = await storageService.startGarbageCollection();

      expect(stats.filesProcessed).toBe(1);
      expect(stats.errors).toBe(1);
      expect(stats.filesDeleted).toBe(0);
    });
  });

  // ==================== BACKUP VERIFICATION TESTS ====================

  describe('Backup Verification', () => {
    it('should verify healthy backups', async () => {
      const cid = 'QmHealthy123';
      
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 3,
        targetReplicas: 3,
        regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
        status: 'healthy'
      });

      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: 1024 });

      const result = await storageService.verifyContentBackup(cid, storageService.replicationStatus.get(cid));

      expect(result.status).toBe('healthy');
      expect(result.replicas).toBe(3);
      expect(result.integrityError).toBe(false);
    });

    it('should detect degraded backups', async () => {
      const cid = 'QmDegraded123';
      
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 1, // Below target
        targetReplicas: 3,
        regions: ['us-east-1'],
        status: 'degraded'
      });

      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: 1024 });

      const result = await storageService.verifyContentBackup(cid, storageService.replicationStatus.get(cid));

      expect(result.status).toBe('degraded');
      expect(result.replicas).toBe(1);
    });

    it('should detect failed backups', async () => {
      const cid = 'QmFailed123';
      
      storageService.replicationStatus.set(cid, {
        policy: 'default',
        replicas: 0,
        targetReplicas: 2,
        regions: [],
        status: 'failed'
      });

      mockIpfsService.stat.mockRejectedValue(new Error('Content not found'));

      const result = await storageService.verifyContentBackup(cid, storageService.replicationStatus.get(cid));

      expect(result.status).toBe('failed');
      expect(result.reason).toBe('content_unavailable');
    });

    it('should run complete backup verification', async () => {
      // Set up multiple content items
      storageService.replicationStatus.set('QmTest1', {
        policy: 'default',
        replicas: 2,
        targetReplicas: 2,
        status: 'healthy'
      });
      
      storageService.replicationStatus.set('QmTest2', {
        policy: 'default',
        replicas: 1,
        targetReplicas: 2,
        status: 'degraded'
      });

      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: 1024 });

      const stats = await storageService.verifyBackups();

      expect(stats.backupsChecked).toBe(2);
      expect(stats.backupsHealthy).toBe(1);
      expect(stats.backupsDegraded).toBe(1);
      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_BACKUP_VERIFICATION'
        })
      );
    });
  });

  // ==================== DISASTER RECOVERY TESTS ====================

  describe('Disaster Recovery', () => {
    it('should run disaster recovery test', async () => {
      mockIpfsService.add.mockResolvedValue({ cid: { toString: () => 'QmTest123' } });
      mockIpfsService.unpin.mockResolvedValue({ success: true });
      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: 1024 });

      const results = await storageService.performDisasterRecoveryTest();

      expect(results.overallStatus).toBeDefined();
      expect(results.backupRestoreTest).toBeDefined();
      expect(results.replicationTest).toBeDefined();
      expect(results.integrityTest).toBeDefined();
      expect(results.performanceTest).toBeDefined();
      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_DISASTER_RECOVERY_TEST'
        })
      );
    });

    it('should handle backup restore test', async () => {
      mockIpfsService.add.mockResolvedValue({ cid: { toString: () => 'QmRestore123' } });
      mockIpfsService.pin.mockResolvedValue({ success: true });
      mockIpfsService.unpin.mockResolvedValue({ success: true });
      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: 1024 });

      const result = await storageService.testBackupRestore();

      expect(result.test).toBe('backup_restore');
      expect(result.status).toBe('passed');
      expect(result.testCid).toBeDefined();
    });
  });

  // ==================== PUBLIC API TESTS ====================

  describe('Public API', () => {
    it('should store file successfully', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = { filename: 'test.txt', privacy: 'private' };
      const squidId = 'test-user';

      mockIpfsService.add.mockResolvedValue({ cid: { toString: () => 'QmStore123' } });
      mockIpfsService.pin.mockResolvedValue({ success: true });

      const result = await storageService.storeFile(fileBuffer, metadata, squidId);

      expect(result.success).toBe(true);
      expect(result.cid).toBe('QmStore123');
      expect(result.deduplicated).toBe(false);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'q.storage.file.stored.v1',
        expect.objectContaining({
          actor: { squidId },
          data: expect.objectContaining({
            cid: 'QmStore123'
          })
        })
      );
    });

    it('should handle deduplicated file storage', async () => {
      const fileBuffer = Buffer.from('duplicate content');
      const metadata = { filename: 'dup.txt', privacy: 'private' };
      const squidId = 'test-user';

      // Pre-register content for deduplication
      const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      storageService.deduplicationCache.set(contentHash, 'QmExisting123');
      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: fileBuffer.length });

      const result = await storageService.storeFile(fileBuffer, metadata, squidId);

      expect(result.success).toBe(true);
      expect(result.cid).toBe('QmExisting123');
      expect(result.deduplicated).toBe(true);
      expect(result.spaceSaved).toBe(fileBuffer.length);
    });

    it('should retrieve file successfully', async () => {
      const cid = 'QmRetrieve123';
      const squidId = 'test-user';
      const fileBuffer = Buffer.from('retrieved content');

      mockIpfsService.cat.mockResolvedValue(fileBuffer);

      const result = await storageService.retrieveFile(cid, squidId);

      expect(result).toEqual(fileBuffer);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'q.storage.file.accessed.v1',
        expect.objectContaining({
          actor: { squidId },
          data: expect.objectContaining({
            cid,
            accessType: 'read'
          })
        })
      );
    });

    it('should delete file successfully', async () => {
      const cid = 'QmDelete123';
      const squidId = 'test-user';

      vi.spyOn(storageService, 'getContentMetadata').mockResolvedValue({ size: 1024 });

      const result = await storageService.deleteFile(cid, squidId);

      expect(result.success).toBe(true);
      expect(result.cid).toBe(cid);
      expect(storageService.garbageCollectionQueue.has(cid)).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'q.storage.file.deleted.v1',
        expect.objectContaining({
          actor: { squidId },
          data: expect.objectContaining({
            cid,
            size: 1024
          })
        })
      );
    });

    it('should get storage usage', async () => {
      const squidId = 'test-user';
      const usage = 500 * 1024 * 1024; // 500MB

      await storageService.updateStorageUsage(squidId, usage);

      const result = await storageService.getStorageUsage(squidId);

      expect(result.squidId).toBe(squidId);
      expect(result.used).toBe(usage);
      expect(result.usagePercentage).toBeCloseTo(0.5, 2);
      expect(result.warningLevel).toBe('normal');
    });

    it('should update storage quota', async () => {
      const squidId = 'test-user';
      const newLimit = 2 * 1024 * 1024 * 1024; // 2GB

      const result = await storageService.updateStorageQuota(squidId, newLimit);

      expect(result.limit).toBe(newLimit);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'q.storage.quota.updated.v1',
        expect.objectContaining({
          actor: { squidId },
          data: expect.objectContaining({
            squidId,
            newLimit
          })
        })
      );
    });
  });

  // ==================== EVENT HANDLING TESTS ====================

  describe('Event Handling', () => {
    it('should handle file created events', async () => {
      const event = {
        data: {
          cid: 'QmCreated123',
          squidId: 'test-user',
          size: 1024,
          metadata: { filename: 'test.txt', privacy: 'private' }
        }
      };

      mockIpfsService.pin.mockResolvedValue({ success: true });

      await storageService.handleFileCreated(event);

      expect(storageService.accessPatterns.has('QmCreated123')).toBe(true);
      expect(storageService.replicationStatus.has('QmCreated123')).toBe(true);
    });

    it('should handle quota payment events', async () => {
      const event = {
        data: {
          squidId: 'test-user',
          amount: 5, // 5 QTokens = 5GB
          purpose: 'storage_quota_increase'
        }
      };

      await storageService.handleQuotaPayment(event);

      const quota = storageService.storageQuotas.get('test-user');
      expect(quota.limit).toBe(storageService.config.quotas.defaultQuota + (5 * 1024 * 1024 * 1024));
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    it('should handle IPFS service failures gracefully', async () => {
      const fileBuffer = Buffer.from('test content');
      const metadata = { filename: 'test.txt' };
      const squidId = 'test-user';

      mockIpfsService.add.mockRejectedValue(new Error('IPFS unavailable'));

      await expect(storageService.storeFile(fileBuffer, metadata, squidId))
        .rejects.toThrow('IPFS unavailable');
    });

    it('should handle quota exceeded errors', async () => {
      const fileBuffer = Buffer.from('x'.repeat(2 * 1024 * 1024 * 1024)); // 2GB
      const metadata = { filename: 'large.txt' };
      const squidId = 'test-user';

      await expect(storageService.storeFile(fileBuffer, metadata, squidId))
        .rejects.toThrow('Storage quota exceeded');
    });

    it('should handle background process errors', async () => {
      // Mock garbage collection to fail
      vi.spyOn(storageService, 'startGarbageCollection').mockRejectedValue(new Error('GC failed'));

      // Trigger garbage collection manually
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await storageService.startGarbageCollection();
      } catch (error) {
        // Expected to fail
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background garbage collection failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance', () => {
    it('should handle concurrent file operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        const fileBuffer = Buffer.from(`test content ${i}`);
        const metadata = { filename: `test${i}.txt`, privacy: 'private' };
        const squidId = `user-${i}`;

        mockIpfsService.add.mockResolvedValue({ cid: { toString: () => `QmTest${i}` } });
        mockIpfsService.pin.mockResolvedValue({ success: true });

        operations.push(storageService.storeFile(fileBuffer, metadata, squidId));
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.cid).toBe(`QmTest${index}`);
      });
    });

    it('should efficiently handle deduplication cache', async () => {
      const fileBuffer = Buffer.from('duplicate content');
      const metadata = { filename: 'dup.txt' };

      // First deduplication check
      const start1 = Date.now();
      const result1 = await storageService.deduplicateContent(fileBuffer, metadata);
      const time1 = Date.now() - start1;

      // Register content
      await storageService.registerContent('QmDup123', result1.contentHash, fileBuffer.length);
      mockIpfsService.stat.mockResolvedValue({ cumulativeSize: fileBuffer.length });

      // Second deduplication check (should be faster due to cache)
      const start2 = Date.now();
      const result2 = await storageService.deduplicateContent(fileBuffer, metadata);
      const time2 = Date.now() - start2;

      expect(result2.isDuplicate).toBe(true);
      // Cache lookup should be faster than initial hash calculation
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });
});
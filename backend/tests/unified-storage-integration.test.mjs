/**
 * Unified Storage Integration Tests
 * 
 * Tests integration between UnifiedStorageService and other ecosystem modules:
 * - Qdrive file storage integration
 * - Qwallet payment and quota integration
 * - Qerberos audit and security integration
 * - Qindex content indexing integration
 * - Qonsent permission checking integration
 * - Event bus communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import UnifiedStorageService from '../services/UnifiedStorageService.mjs';
import { EventBusService } from '../services/EventBusService.mjs';
import ipfsService from '../services/ipfsService.mjs';

// Mock other services
const mockQerberosService = {
  audit: vi.fn().mockResolvedValue({ success: true }),
  riskScore: vi.fn().mockResolvedValue({ score: 0.1 })
};

const mockQindexService = {
  put: vi.fn().mockResolvedValue({ success: true }),
  get: vi.fn().mockResolvedValue(null),
  list: vi.fn().mockResolvedValue([])
};

const mockQwalletService = {
  processPayment: vi.fn().mockResolvedValue({ success: true }),
  checkBalance: vi.fn().mockResolvedValue({ balance: 100 })
};

const mockQonsentService = {
  check: vi.fn().mockResolvedValue({ allowed: true }),
  grant: vi.fn().mockResolvedValue({ success: true })
};

const mockQdriveService = {
  storeFile: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn()
};

describe('Unified Storage Integration', () => {
  let storageService;
  let eventBus;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create event bus
    eventBus = new EventBusService();
    await eventBus.initialize();
    
    // Create storage service
    storageService = new UnifiedStorageService({
      ipfsService,
      eventBus,
      qerberosService: mockQerberosService,
      qindexService: mockQindexService,
      qwalletService: mockQwalletService
    });

    await storageService.initialize();
  });

  afterEach(async () => {
    if (storageService.initialized) {
      await storageService.shutdown();
    }
    if (eventBus.initialized) {
      await eventBus.shutdown();
    }
  });

  // ==================== QDRIVE INTEGRATION ====================

  describe('Qdrive Integration', () => {
    it('should handle file upload through Qdrive with storage management', async () => {
      const fileBuffer = Buffer.from('test file content for qdrive');
      const metadata = {
        filename: 'qdrive-test.txt',
        privacy: 'private',
        owner: 'test-user-1',
        contentType: 'text/plain'
      };
      const squidId = 'test-user-1';

      // Mock IPFS operations
      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmQdriveTest123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      // Store file through unified storage
      const result = await storageService.storeFile(fileBuffer, metadata, squidId);

      expect(result.success).toBe(true);
      expect(result.cid).toBe('QmQdriveTest123');

      // Verify audit logging
      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_PINNING_APPLIED',
          data: expect.objectContaining({
            cid: 'QmQdriveTest123'
          })
        })
      );

      // Verify indexing
      expect(mockQindexService.put).toHaveBeenCalledWith(
        expect.stringContaining('dedup:'),
        expect.objectContaining({
          cid: 'QmQdriveTest123'
        })
      );

      // Verify storage quota update
      const usage = await storageService.getStorageUsage(squidId);
      expect(usage.used).toBe(fileBuffer.length);
    });

    it('should handle file retrieval with access pattern tracking', async () => {
      const cid = 'QmQdriveRetrieve123';
      const squidId = 'test-user-1';
      const fileBuffer = Buffer.from('retrieved file content');

      vi.spyOn(ipfsService, 'cat').mockResolvedValue(fileBuffer);

      const result = await storageService.retrieveFile(cid, squidId);

      expect(result).toEqual(fileBuffer);

      // Verify access pattern was updated
      const pattern = storageService.accessPatterns.get(cid);
      expect(pattern.totalAccess).toBe(1);
      expect(pattern.accessTypes.read).toBe(1);

      // Verify access event was published
      expect(eventBus.eventHistory.some(event => 
        event.topic === 'q.storage.file.accessed.v1' &&
        event.data.data.cid === cid
      )).toBe(true);
    });

    it('should handle file deletion with garbage collection', async () => {
      const cid = 'QmQdriveDelete123';
      const squidId = 'test-user-1';
      const fileSize = 1024;

      // Pre-populate storage usage
      await storageService.updateStorageUsage(squidId, fileSize);

      vi.spyOn(storageService, 'getContentMetadata').mockResolvedValue({ size: fileSize });

      const result = await storageService.deleteFile(cid, squidId);

      expect(result.success).toBe(true);
      expect(storageService.garbageCollectionQueue.has(cid)).toBe(true);

      // Verify storage usage was updated
      const usage = await storageService.getStorageUsage(squidId);
      expect(usage.used).toBe(0);
    });
  });

  // ==================== QWALLET INTEGRATION ====================

  describe('Qwallet Integration', () => {
    it('should handle quota payment and upgrade', async () => {
      const squidId = 'test-user-payment';
      const paymentAmount = 10; // 10 QTokens for 10GB

      // Simulate payment event
      const paymentEvent = {
        data: {
          squidId,
          amount: paymentAmount,
          purpose: 'storage_quota_increase',
          transactionId: 'tx-123'
        }
      };

      await storageService.handleQuotaPayment(paymentEvent);

      const quota = storageService.storageQuotas.get(squidId);
      const expectedIncrease = paymentAmount * 1024 * 1024 * 1024; // Convert to bytes
      
      expect(quota.limit).toBe(storageService.config.quotas.defaultQuota + expectedIncrease);
    });

    it('should handle overage billing', async () => {
      const squidId = 'test-user-overage';
      const largeFileSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB (exceeds 1GB default)

      const quotaCheck = await storageService.checkStorageQuota(squidId, largeFileSize);

      expect(quotaCheck.withinLimit).toBe(false);
      expect(quotaCheck.overage).toBeDefined();
      expect(quotaCheck.overage.cost).toBeGreaterThan(0);
      expect(quotaCheck.overage.currency).toBe('QToken');
    });

    it('should integrate with wallet for payment verification', async () => {
      const squidId = 'test-user-verify';
      const fileBuffer = Buffer.from('x'.repeat(2 * 1024 * 1024 * 1024)); // 2GB
      const metadata = { filename: 'large.txt', privacy: 'private' };

      // Mock wallet balance check
      mockQwalletService.checkBalance.mockResolvedValue({ balance: 50 });

      // Should fail due to quota exceeded
      await expect(storageService.storeFile(fileBuffer, metadata, squidId))
        .rejects.toThrow('Storage quota exceeded');
    });
  });

  // ==================== QERBEROS INTEGRATION ====================

  describe('Qerberos Integration', () => {
    it('should audit all storage operations', async () => {
      const fileBuffer = Buffer.from('audit test content');
      const metadata = { filename: 'audit.txt', privacy: 'confidential' };
      const squidId = 'test-user-audit';

      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmAuditTest123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      await storageService.storeFile(fileBuffer, metadata, squidId);

      // Verify pinning operation was audited
      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_PINNING_APPLIED',
          actor: { squidId: 'system' },
          outcome: 'SUCCESS'
        })
      );
    });

    it('should audit backup verification results', async () => {
      // Set up some content for backup verification
      storageService.replicationStatus.set('QmBackupTest123', {
        policy: 'default',
        replicas: 2,
        targetReplicas: 2,
        status: 'healthy'
      });

      vi.spyOn(ipfsService, 'stat').mockResolvedValue({ cumulativeSize: 1024 });

      const stats = await storageService.verifyBackups();

      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_BACKUP_VERIFICATION',
          data: expect.objectContaining({
            backupsChecked: 1,
            backupsHealthy: 1
          })
        })
      );
    });

    it('should audit disaster recovery tests', async () => {
      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmDRTest123' }
      });
      vi.spyOn(ipfsService, 'unpin').mockResolvedValue({ success: true });
      vi.spyOn(ipfsService, 'stat').mockResolvedValue({ cumulativeSize: 1024 });

      const results = await storageService.performDisasterRecoveryTest();

      expect(mockQerberosService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STORAGE_DISASTER_RECOVERY_TEST',
          data: expect.objectContaining({
            overallStatus: expect.any(String)
          })
        })
      );
    });
  });

  // ==================== QINDEX INTEGRATION ====================

  describe('Qindex Integration', () => {
    it('should register content for deduplication indexing', async () => {
      const cid = 'QmIndexTest123';
      const contentHash = 'hash123abc';
      const fileSize = 2048;

      await storageService.registerContent(cid, contentHash, fileSize);

      expect(mockQindexService.put).toHaveBeenCalledWith(
        `dedup:${contentHash}`,
        expect.objectContaining({
          cid,
          size: fileSize,
          registeredAt: expect.any(String)
        })
      );
    });

    it('should check for content references during garbage collection', async () => {
      const cid = 'QmGCTest123';
      
      // Mock that content has references
      mockQindexService.get.mockResolvedValue(['ref1', 'ref2']);

      storageService.garbageCollectionQueue.add(cid);

      const stats = await storageService.startGarbageCollection();

      // Should not delete content with references
      expect(stats.filesDeleted).toBe(0);
      expect(mockQindexService.get).toHaveBeenCalledWith(`refs:${cid}`);
    });

    it('should index file metadata for searchability', async () => {
      const fileBuffer = Buffer.from('searchable content');
      const metadata = {
        filename: 'searchable.txt',
        privacy: 'public',
        tags: ['document', 'text'],
        description: 'A searchable document'
      };
      const squidId = 'test-user-search';

      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmSearchTest123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      await storageService.storeFile(fileBuffer, metadata, squidId);

      // Verify deduplication indexing
      expect(mockQindexService.put).toHaveBeenCalledWith(
        expect.stringContaining('dedup:'),
        expect.objectContaining({
          cid: 'QmSearchTest123'
        })
      );
    });
  });

  // ==================== EVENT BUS INTEGRATION ====================

  describe('Event Bus Integration', () => {
    it('should publish storage events to event bus', async () => {
      const fileBuffer = Buffer.from('event test content');
      const metadata = { filename: 'event.txt', privacy: 'private' };
      const squidId = 'test-user-events';

      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmEventTest123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      await storageService.storeFile(fileBuffer, metadata, squidId);

      // Check that storage event was published
      const storageEvents = eventBus.eventHistory.filter(event => 
        event.topic === 'q.storage.file.stored.v1'
      );

      expect(storageEvents).toHaveLength(1);
      expect(storageEvents[0].data.actor.squidId).toBe(squidId);
      expect(storageEvents[0].data.data.cid).toBe('QmEventTest123');
    });

    it('should handle quota alert events', async () => {
      const squidId = 'test-user-alert';
      const warningSize = 0.85 * 1024 * 1024 * 1024; // 85% of 1GB

      await storageService.updateStorageUsage(squidId, warningSize);

      // Check that quota alert was published
      const alertEvents = eventBus.eventHistory.filter(event => 
        event.topic === 'q.storage.quota.alert.v1'
      );

      expect(alertEvents).toHaveLength(1);
      expect(alertEvents[0].data.data.warningLevel).toBe('warning');
      expect(alertEvents[0].data.data.squidId).toBe(squidId);
    });

    it('should subscribe to and handle external events', async () => {
      // Simulate file created event from Qdrive
      const fileCreatedEvent = {
        data: {
          cid: 'QmExternalFile123',
          squidId: 'test-user-external',
          size: 1024,
          metadata: { filename: 'external.txt', privacy: 'private' }
        }
      };

      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      await storageService.handleFileCreated(fileCreatedEvent);

      // Verify access pattern was initialized
      expect(storageService.accessPatterns.has('QmExternalFile123')).toBe(true);
      
      // Verify replication status was set
      expect(storageService.replicationStatus.has('QmExternalFile123')).toBe(true);
    });
  });

  // ==================== CROSS-MODULE WORKFLOW TESTS ====================

  describe('Cross-Module Workflows', () => {
    it('should handle complete file lifecycle workflow', async () => {
      const squidId = 'test-user-lifecycle';
      const fileBuffer = Buffer.from('lifecycle test content');
      const metadata = {
        filename: 'lifecycle.txt',
        privacy: 'private',
        tags: ['test', 'lifecycle']
      };

      // Mock all IPFS operations
      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmLifecycle123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });
      vi.spyOn(ipfsService, 'cat').mockResolvedValue(fileBuffer);
      vi.spyOn(ipfsService, 'unpin').mockResolvedValue({ success: true });

      // 1. Store file
      const storeResult = await storageService.storeFile(fileBuffer, metadata, squidId);
      expect(storeResult.success).toBe(true);

      // 2. Access file multiple times to build access pattern
      for (let i = 0; i < 5; i++) {
        await storageService.retrieveFile(storeResult.cid, squidId);
      }

      // 3. Check access pattern
      const pattern = storageService.accessPatterns.get(storeResult.cid);
      expect(pattern.totalAccess).toBe(5);

      // 4. Check storage usage
      const usage = await storageService.getStorageUsage(squidId);
      expect(usage.used).toBe(fileBuffer.length);

      // 5. Delete file
      const deleteResult = await storageService.deleteFile(storeResult.cid, squidId);
      expect(deleteResult.success).toBe(true);

      // 6. Verify garbage collection queue
      expect(storageService.garbageCollectionQueue.has(storeResult.cid)).toBe(true);

      // 7. Run garbage collection
      vi.spyOn(storageService, 'evaluateForDeletion').mockResolvedValue({
        delete: true,
        reason: 'user_deleted',
        size: fileBuffer.length
      });

      const gcStats = await storageService.startGarbageCollection();
      expect(gcStats.filesDeleted).toBe(1);

      // Verify all audit events were logged
      expect(mockQerberosService.audit).toHaveBeenCalledTimes(2); // Pinning + GC
    });

    it('should handle quota exceeded with payment workflow', async () => {
      const squidId = 'test-user-payment-flow';
      const largeFileSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB
      const fileBuffer = Buffer.alloc(largeFileSize, 'x');
      const metadata = { filename: 'large.bin', privacy: 'private' };

      // 1. Try to store large file (should fail)
      await expect(storageService.storeFile(fileBuffer, metadata, squidId))
        .rejects.toThrow('Storage quota exceeded');

      // 2. Process payment to increase quota
      const paymentEvent = {
        data: {
          squidId,
          amount: 2, // 2 QTokens for 2GB
          purpose: 'storage_quota_increase'
        }
      };

      await storageService.handleQuotaPayment(paymentEvent);

      // 3. Verify quota was increased
      const usage = await storageService.getStorageUsage(squidId);
      expect(usage.limit).toBeGreaterThan(storageService.config.quotas.defaultQuota);

      // 4. Now store the large file (should succeed)
      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmLargeFile123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      const storeResult = await storageService.storeFile(fileBuffer, metadata, squidId);
      expect(storeResult.success).toBe(true);
    });

    it('should handle deduplication across multiple users', async () => {
      const fileBuffer = Buffer.from('shared content for deduplication');
      const metadata = { filename: 'shared.txt', privacy: 'public' };
      
      const user1 = 'test-user-dedup-1';
      const user2 = 'test-user-dedup-2';

      vi.spyOn(ipfsService, 'add').mockResolvedValue({
        cid: { toString: () => 'QmSharedContent123' }
      });
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });
      vi.spyOn(ipfsService, 'stat').mockResolvedValue({ cumulativeSize: fileBuffer.length });

      // 1. User 1 stores file
      const result1 = await storageService.storeFile(fileBuffer, metadata, user1);
      expect(result1.success).toBe(true);
      expect(result1.deduplicated).toBe(false);

      // 2. User 2 stores same file (should be deduplicated)
      const result2 = await storageService.storeFile(fileBuffer, metadata, user2);
      expect(result2.success).toBe(true);
      expect(result2.deduplicated).toBe(true);
      expect(result2.cid).toBe(result1.cid);
      expect(result2.spaceSaved).toBe(fileBuffer.length);

      // 3. Verify both users have quota usage (even though deduplicated)
      const usage1 = await storageService.getStorageUsage(user1);
      const usage2 = await storageService.getStorageUsage(user2);
      
      expect(usage1.used).toBe(fileBuffer.length);
      expect(usage2.used).toBe(0); // No additional storage used due to deduplication
    });
  });

  // ==================== PERFORMANCE AND SCALABILITY TESTS ====================

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations efficiently', async () => {
      const concurrentOperations = 20;
      const operations = [];

      // Mock IPFS operations
      vi.spyOn(ipfsService, 'add').mockImplementation(async (data) => ({
        cid: { toString: () => `QmConcurrent${Math.random().toString(36).substr(2, 9)}` }
      }));
      vi.spyOn(ipfsService, 'pin').mockResolvedValue({ success: true });

      // Create concurrent store operations
      for (let i = 0; i < concurrentOperations; i++) {
        const fileBuffer = Buffer.from(`concurrent content ${i}`);
        const metadata = { filename: `concurrent${i}.txt`, privacy: 'private' };
        const squidId = `user-${i}`;

        operations.push(storageService.storeFile(fileBuffer, metadata, squidId));
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should succeed
      expect(results).toHaveLength(concurrentOperations);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      console.log(`Completed ${concurrentOperations} concurrent operations in ${endTime - startTime}ms`);
    });

    it('should efficiently manage large deduplication cache', async () => {
      const cacheSize = 1000;
      const fileBuffers = [];
      
      // Generate unique content for cache
      for (let i = 0; i < cacheSize; i++) {
        fileBuffers.push(Buffer.from(`unique content ${i} ${Math.random()}`));
      }

      // Fill deduplication cache
      for (let i = 0; i < cacheSize; i++) {
        const result = await storageService.deduplicateContent(fileBuffers[i], {});
        if (result.contentHash) {
          await storageService.registerContent(`QmCache${i}`, result.contentHash, fileBuffers[i].length);
        }
      }

      expect(storageService.deduplicationCache.size).toBe(cacheSize);

      // Test cache lookup performance
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const randomIndex = Math.floor(Math.random() * cacheSize);
        vi.spyOn(ipfsService, 'stat').mockResolvedValue({ cumulativeSize: fileBuffers[randomIndex].length });
        
        const result = await storageService.deduplicateContent(fileBuffers[randomIndex], {});
        expect(result.isDuplicate).toBe(true);
      }

      const endTime = Date.now();
      const avgLookupTime = (endTime - startTime) / 100;

      // Cache lookups should be fast (less than 10ms average)
      expect(avgLookupTime).toBeLessThan(10);

      console.log(`Average cache lookup time: ${avgLookupTime.toFixed(2)}ms`);
    });
  });
});
/**
 * Comprehensive Identity System Testing
 * Tests complete identity lifecycle from creation to deletion
 * Validates all ecosystem service integrations
 * Tests security and privacy features thoroughly
 * Requirements: All requirements from squid-identity-expansion spec
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';

// Core services and managers
import { identityManager } from '@/services/IdentityManager';
import { IdentityStorage } from '@/services/identity/IdentityStorage';
import { IdentityValidationService } from '@/services/IdentityValidationService';

// Ecosystem services
import { QonsentService } from '@/services/qonsent/QonsentService';
import { QlockService } from '@/services/qlock/QlockService';
import { QerberosService } from '@/services/qerberos/QerberosService';
import { QindexService } from '@/services/qindex/QindexService';
import { QwalletService } from '@/services/qwallet/QwalletService';

// State management
import { useIdentityStore } from '@/state/identity';

// Types
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  IdentityStatus,
  GovernanceType,
  IdentityAction,
  SubidentityMetadata,
  IdentityCreationRules,
  SecurityFlag
} from '@/types/identity';

// Test utilities
import { createMockIdentity, createMockSubidentityMetadata } from '../utils/identity-test-utils';

// Performance monitoring
interface PerformanceMetrics {
  operationName: string;
  duration: number;
  memoryUsage: number;
  timestamp: number;
}

class SystemTestMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  private startMemory: number = 0;

  startOperation(operationName: string) {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
    console.log(`[SystemTest] Starting operation: ${operationName}`);
  }

  endOperation(operationName: string) {
    const duration = performance.now() - this.startTime;
    const memoryUsage = process.memoryUsage().heapUsed - this.startMemory;
    
    const metric: PerformanceMetrics = {
      operationName,
      duration,
      memoryUsage,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    console.log(`[SystemTest] Completed operation: ${operationName} (${duration.toFixed(2)}ms, ${(memoryUsage / 1024 / 1024).toFixed(2)}MB)`);
    
    return metric;
  }

  getMetrics() {
    return this.metrics;
  }

  generateReport() {
    const report = {
      totalOperations: this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      totalMemoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0),
      slowestOperation: this.metrics.reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest, this.metrics[0]),
      fastestOperation: this.metrics.reduce((fastest, current) => 
        current.duration < fastest.duration ? current : fastest, this.metrics[0])
    };
    
    console.log('[SystemTest] Performance Report:', report);
    return report;
  }
}

describe('Comprehensive Identity System Testing', () => {
  let monitor: SystemTestMonitor;
  let testIdentities: ExtendedSquidIdentity[] = [];
  let rootIdentity: ExtendedSquidIdentity;

  beforeAll(async () => {
    monitor = new SystemTestMonitor();
    console.log('[SystemTest] Starting comprehensive system testing...');
    
    // Initialize test environment
    monitor.startOperation('System Initialization');
    
    // Create root identity for testing
    rootIdentity = createMockIdentity({
      type: IdentityType.ROOT,
      name: 'System Test Root Identity',
      permissions: {
        canCreateSubidentities: true,
        canDeleteSubidentities: true,
        canModifyProfile: true,
        canSwitchIdentities: true
      }
    });
    
    testIdentities.push(rootIdentity);
    monitor.endOperation('System Initialization');
  });

  afterAll(async () => {
    console.log('[SystemTest] Cleaning up test environment...');
    monitor.startOperation('System Cleanup');
    
    // Clean up all test identities
    for (const identity of testIdentities) {
      try {
        if (identity.type !== IdentityType.ROOT) {
          await identityManager.deleteSubidentity(identity.did);
        }
      } catch (error) {
        console.warn(`[SystemTest] Failed to cleanup identity ${identity.did}:`, error);
      }
    }
    
    monitor.endOperation('System Cleanup');
    
    // Generate final performance report
    const report = monitor.generateReport();
    console.log('[SystemTest] Final Performance Report:', JSON.stringify(report, null, 2));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Identity Lifecycle Testing', () => {
    it('should handle complete identity lifecycle from creation to deletion', async () => {
      monitor.startOperation('Complete Identity Lifecycle');

      // Step 1: Create DAO identity
      const daoMetadata = createMockSubidentityMetadata({
        name: 'System Test DAO Identity',
        type: IdentityType.DAO,
        privacyLevel: PrivacyLevel.DAO_ONLY
      });

      const createResult = await identityManager.createSubidentity(IdentityType.DAO, daoMetadata);
      expect(createResult.success).toBe(true);
      expect(createResult.identity).toBeDefined();
      
      const daoIdentity = createResult.identity!;
      testIdentities.push(daoIdentity);

      // Step 2: Verify identity was created with correct properties
      expect(daoIdentity.type).toBe(IdentityType.DAO);
      expect(daoIdentity.name).toBe(daoMetadata.name);
      expect(daoIdentity.privacyLevel).toBe(PrivacyLevel.DAO_ONLY);
      expect(daoIdentity.status).toBe(IdentityStatus.ACTIVE);

      // Step 3: Switch to the new identity
      const switchResult = await identityManager.switchActiveIdentity(daoIdentity.did);
      expect(switchResult.success).toBe(true);

      // Step 4: Create a sub-identity from the DAO identity
      const enterpriseMetadata = createMockSubidentityMetadata({
        name: 'System Test Enterprise Identity',
        type: IdentityType.ENTERPRISE,
        privacyLevel: PrivacyLevel.PRIVATE
      });

      const subCreateResult = await identityManager.createSubidentity(IdentityType.ENTERPRISE, enterpriseMetadata);
      expect(subCreateResult.success).toBe(true);
      
      const enterpriseIdentity = subCreateResult.identity!;
      testIdentities.push(enterpriseIdentity);

      // Step 5: Verify hierarchy relationships
      expect(enterpriseIdentity.parentId).toBe(daoIdentity.did);
      expect(enterpriseIdentity.depth).toBe(daoIdentity.depth + 1);

      // Step 6: Test identity tree retrieval
      const treeResult = await identityManager.getIdentityTree(rootIdentity.did);
      expect(treeResult.success).toBe(true);
      expect(treeResult.tree).toBeDefined();

      // Step 7: Delete the enterprise identity
      const deleteResult = await identityManager.deleteSubidentity(enterpriseIdentity.did);
      expect(deleteResult.success).toBe(true);

      // Step 8: Verify deletion cascade
      const verifyResult = await identityManager.getIdentity(enterpriseIdentity.did);
      expect(verifyResult.success).toBe(false);

      monitor.endOperation('Complete Identity Lifecycle');
    });

    it('should handle multiple identity types with different governance models', async () => {
      monitor.startOperation('Multiple Identity Types');

      const identityTypes = [
        { type: IdentityType.DAO, governance: GovernanceType.DAO },
        { type: IdentityType.ENTERPRISE, governance: GovernanceType.ENTERPRISE },
        { type: IdentityType.CONSENTIDA, governance: GovernanceType.PARENT },
        { type: IdentityType.AID, governance: GovernanceType.SELF }
      ];

      const createdIdentities: ExtendedSquidIdentity[] = [];

      for (const { type, governance } of identityTypes) {
        const metadata = createMockSubidentityMetadata({
          name: `System Test ${type} Identity`,
          type,
          governanceLevel: governance
        });

        const result = await identityManager.createSubidentity(type, metadata);
        expect(result.success).toBe(true);
        
        const identity = result.identity!;
        expect(identity.type).toBe(type);
        expect(identity.governanceLevel).toBe(governance);
        
        createdIdentities.push(identity);
        testIdentities.push(identity);
      }

      // Verify all identities were created successfully
      expect(createdIdentities).toHaveLength(4);

      monitor.endOperation('Multiple Identity Types');
    });

    it('should enforce identity creation rules and constraints', async () => {
      monitor.startOperation('Identity Creation Rules');

      // Test depth limit enforcement
      let currentIdentity = rootIdentity;
      const maxDepth = 3;
      
      for (let depth = 1; depth <= maxDepth + 1; depth++) {
        const metadata = createMockSubidentityMetadata({
          name: `Depth ${depth} Identity`,
          type: IdentityType.DAO
        });

        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        
        if (depth <= maxDepth) {
          expect(result.success).toBe(true);
          currentIdentity = result.identity!;
          testIdentities.push(currentIdentity);
          
          // Switch to the new identity for next iteration
          await identityManager.switchActiveIdentity(currentIdentity.did);
        } else {
          // Should fail due to depth limit
          expect(result.success).toBe(false);
          expect(result.error).toContain('depth');
        }
      }

      monitor.endOperation('Identity Creation Rules');
    });
  });

  describe('Ecosystem Service Integration Testing', () => {
    it('should coordinate all ecosystem services during identity operations', async () => {
      monitor.startOperation('Ecosystem Service Integration');

      // Mock all ecosystem services
      const mockQonsentService = vi.mocked(QonsentService);
      const mockQlockService = vi.mocked(QlockService);
      const mockQerberosService = vi.mocked(QerberosService);
      const mockQindexService = vi.mocked(QindexService);
      const mockQwalletService = vi.mocked(QwalletService);

      // Setup successful responses
      mockQonsentService.prototype.createProfile = vi.fn().mockResolvedValue({
        success: true,
        profileId: 'qonsent_profile_test'
      });

      mockQlockService.prototype.generateKeyPair = vi.fn().mockResolvedValue({
        success: true,
        publicKey: 'test_public_key',
        privateKey: 'test_private_key'
      });

      mockQerberosService.prototype.logAction = vi.fn().mockResolvedValue({
        success: true,
        logId: 'audit_log_test'
      });

      mockQindexService.prototype.registerIdentity = vi.fn().mockResolvedValue({
        success: true,
        indexId: 'qindex_entry_test'
      });

      mockQwalletService.prototype.createWalletContext = vi.fn().mockResolvedValue({
        success: true,
        contextId: 'wallet_context_test'
      });

      // Create identity and verify all services were called
      const metadata = createMockSubidentityMetadata({
        name: 'Ecosystem Integration Test Identity',
        type: IdentityType.DAO
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      expect(result.success).toBe(true);

      // Verify all ecosystem services were called
      expect(mockQonsentService.prototype.createProfile).toHaveBeenCalled();
      expect(mockQlockService.prototype.generateKeyPair).toHaveBeenCalled();
      expect(mockQerberosService.prototype.logAction).toHaveBeenCalled();
      expect(mockQindexService.prototype.registerIdentity).toHaveBeenCalled();
      expect(mockQwalletService.prototype.createWalletContext).toHaveBeenCalled();

      testIdentities.push(result.identity!);
      monitor.endOperation('Ecosystem Service Integration');
    });

    it('should handle ecosystem service failures gracefully', async () => {
      monitor.startOperation('Service Failure Handling');

      // Mock service failures
      const mockQindexService = vi.mocked(QindexService);
      mockQindexService.prototype.registerIdentity = vi.fn().mockResolvedValue({
        success: false,
        error: 'Qindex service temporarily unavailable'
      });

      const metadata = createMockSubidentityMetadata({
        name: 'Service Failure Test Identity',
        type: IdentityType.DAO
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      
      // Should still succeed with warnings
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Qindex registration failed');

      testIdentities.push(result.identity!);
      monitor.endOperation('Service Failure Handling');
    });

    it('should maintain data consistency across all services', async () => {
      monitor.startOperation('Data Consistency');

      const metadata = createMockSubidentityMetadata({
        name: 'Data Consistency Test Identity',
        type: IdentityType.ENTERPRISE,
        privacyLevel: PrivacyLevel.PRIVATE
      });

      const result = await identityManager.createSubidentity(IdentityType.ENTERPRISE, metadata);
      expect(result.success).toBe(true);

      const identity = result.identity!;
      testIdentities.push(identity);

      // Verify data consistency across services
      const qonsentProfile = await QonsentService.prototype.getProfile(identity.qonsentProfileId);
      const qindexEntry = await QindexService.prototype.getIdentity(identity.did);
      const walletContext = await QwalletService.prototype.getWalletContext(identity.did);

      // All services should have consistent identity data
      expect(qonsentProfile.identityId).toBe(identity.did);
      expect(qindexEntry.did).toBe(identity.did);
      expect(walletContext.identityId).toBe(identity.did);

      monitor.endOperation('Data Consistency');
    });
  });

  describe('Security and Privacy Features Testing', () => {
    it('should enforce security validation for all identity operations', async () => {
      monitor.startOperation('Security Validation');

      // Test signature verification
      const validationService = new IdentityValidationService();
      
      const metadata = createMockSubidentityMetadata({
        name: 'Security Test Identity',
        type: IdentityType.DAO
      });

      // Test with invalid signature
      const invalidResult = await validationService.validateIdentityCreation(
        IdentityType.DAO,
        metadata,
        'invalid_signature'
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Invalid signature');

      // Test with valid signature
      const validSignature = await validationService.generateValidSignature(metadata);
      const validResult = await validationService.validateIdentityCreation(
        IdentityType.DAO,
        metadata,
        validSignature
      );
      expect(validResult.isValid).toBe(true);

      monitor.endOperation('Security Validation');
    });

    it('should detect and log suspicious activities', async () => {
      monitor.startOperation('Suspicious Activity Detection');

      const mockQerberosService = vi.mocked(QerberosService);
      mockQerberosService.prototype.logSecurityEvent = vi.fn().mockResolvedValue({
        success: true,
        eventId: 'security_event_test'
      });

      // Simulate rapid identity switching (suspicious behavior)
      const identities = testIdentities.slice(0, 3);
      
      for (let i = 0; i < 5; i++) {
        for (const identity of identities) {
          await identityManager.switchActiveIdentity(identity.did);
        }
      }

      // Should detect and log suspicious activity
      expect(mockQerberosService.prototype.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SUSPICIOUS_ACTIVITY',
          severity: expect.any(String),
          description: expect.stringContaining('rapid identity switching')
        })
      );

      monitor.endOperation('Suspicious Activity Detection');
    });

    it('should enforce privacy levels and data access controls', async () => {
      monitor.startOperation('Privacy Level Enforcement');

      // Create identities with different privacy levels
      const privacyLevels = [
        PrivacyLevel.PUBLIC,
        PrivacyLevel.DAO_ONLY,
        PrivacyLevel.PRIVATE,
        PrivacyLevel.ANONYMOUS
      ];

      const privacyTestIdentities: ExtendedSquidIdentity[] = [];

      for (const privacyLevel of privacyLevels) {
        const metadata = createMockSubidentityMetadata({
          name: `Privacy ${privacyLevel} Test Identity`,
          type: IdentityType.DAO,
          privacyLevel
        });

        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        expect(result.success).toBe(true);
        
        const identity = result.identity!;
        expect(identity.privacyLevel).toBe(privacyLevel);
        
        privacyTestIdentities.push(identity);
        testIdentities.push(identity);
      }

      // Test data access based on privacy levels
      for (const identity of privacyTestIdentities) {
        const accessResult = await identityManager.checkDataAccess(
          identity.did,
          'external_user_did',
          'profile_data'
        );

        switch (identity.privacyLevel) {
          case PrivacyLevel.PUBLIC:
            expect(accessResult.hasAccess).toBe(true);
            break;
          case PrivacyLevel.PRIVATE:
          case PrivacyLevel.ANONYMOUS:
            expect(accessResult.hasAccess).toBe(false);
            break;
          case PrivacyLevel.DAO_ONLY:
            expect(accessResult.requiresDAOPermission).toBe(true);
            break;
        }
      }

      monitor.endOperation('Privacy Level Enforcement');
    });

    it('should maintain audit trail integrity', async () => {
      monitor.startOperation('Audit Trail Integrity');

      const mockQerberosService = vi.mocked(QerberosService);
      const auditLogs: any[] = [];
      
      mockQerberosService.prototype.logAction = vi.fn().mockImplementation((action) => {
        auditLogs.push({
          ...action,
          timestamp: new Date().toISOString(),
          id: `audit_${auditLogs.length + 1}`
        });
        return Promise.resolve({ success: true, logId: `audit_${auditLogs.length}` });
      });

      // Perform a series of identity operations
      const operations = [
        () => identityManager.createSubidentity(IdentityType.DAO, createMockSubidentityMetadata({
          name: 'Audit Test Identity 1',
          type: IdentityType.DAO
        })),
        () => identityManager.createSubidentity(IdentityType.ENTERPRISE, createMockSubidentityMetadata({
          name: 'Audit Test Identity 2',
          type: IdentityType.ENTERPRISE
        }))
      ];

      for (const operation of operations) {
        const result = await operation();
        if (result.success && result.identity) {
          testIdentities.push(result.identity);
        }
      }

      // Verify audit logs were created in correct sequence
      expect(auditLogs).toHaveLength(operations.length);
      
      // Verify log integrity
      for (let i = 0; i < auditLogs.length; i++) {
        const log = auditLogs[i];
        expect(log.action).toBe(IdentityAction.CREATED);
        expect(log.timestamp).toBeDefined();
        expect(log.id).toBeDefined();
        
        // Verify chronological order
        if (i > 0) {
          expect(new Date(log.timestamp).getTime()).toBeGreaterThan(
            new Date(auditLogs[i - 1].timestamp).getTime()
          );
        }
      }

      monitor.endOperation('Audit Trail Integrity');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent identity operations', async () => {
      monitor.startOperation('Concurrent Operations');

      const concurrentOperations = 10;
      const operations: Promise<any>[] = [];

      // Create multiple concurrent identity creation operations
      for (let i = 0; i < concurrentOperations; i++) {
        const metadata = createMockSubidentityMetadata({
          name: `Concurrent Test Identity ${i}`,
          type: IdentityType.DAO
        });

        operations.push(identityManager.createSubidentity(IdentityType.DAO, metadata));
      }

      // Wait for all operations to complete
      const results = await Promise.allSettled(operations);

      // Verify all operations completed successfully
      const successfulResults = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );

      expect(successfulResults.length).toBe(concurrentOperations);

      // Add successful identities to cleanup list
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success && result.value.identity) {
          testIdentities.push(result.value.identity);
        }
      });

      monitor.endOperation('Concurrent Operations');
    });

    it('should maintain performance with large numbers of identities', async () => {
      monitor.startOperation('Large Scale Performance');

      const identityCount = 50;
      const createdIdentities: ExtendedSquidIdentity[] = [];

      // Create a large number of identities
      for (let i = 0; i < identityCount; i++) {
        const metadata = createMockSubidentityMetadata({
          name: `Performance Test Identity ${i}`,
          type: IdentityType.DAO
        });

        const startTime = performance.now();
        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        const duration = performance.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000); // Should complete within 1 second

        if (result.identity) {
          createdIdentities.push(result.identity);
          testIdentities.push(result.identity);
        }
      }

      // Test identity tree retrieval performance
      const treeStartTime = performance.now();
      const treeResult = await identityManager.getIdentityTree(rootIdentity.did);
      const treeDuration = performance.now() - treeStartTime;

      expect(treeResult.success).toBe(true);
      expect(treeDuration).toBeLessThan(2000); // Should complete within 2 seconds

      // Test identity search performance
      const searchStartTime = performance.now();
      const searchResult = await identityManager.searchIdentities({
        query: 'Performance Test',
        limit: 20
      });
      const searchDuration = performance.now() - searchStartTime;

      expect(searchResult.success).toBe(true);
      expect(searchDuration).toBeLessThan(500); // Should complete within 500ms

      monitor.endOperation('Large Scale Performance');
    });

    it('should efficiently handle identity switching operations', async () => {
      monitor.startOperation('Identity Switching Performance');

      // Use existing test identities for switching
      const switchableIdentities = testIdentities.slice(0, 5);
      const switchTimes: number[] = [];

      for (const identity of switchableIdentities) {
        const startTime = performance.now();
        const result = await identityManager.switchActiveIdentity(identity.did);
        const duration = performance.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(500); // Should complete within 500ms
        
        switchTimes.push(duration);
      }

      // Verify consistent performance
      const averageSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
      const maxSwitchTime = Math.max(...switchTimes);

      expect(averageSwitchTime).toBeLessThan(300); // Average should be under 300ms
      expect(maxSwitchTime).toBeLessThan(500); // Max should be under 500ms

      console.log(`[SystemTest] Identity switching performance - Average: ${averageSwitchTime.toFixed(2)}ms, Max: ${maxSwitchTime.toFixed(2)}ms`);

      monitor.endOperation('Identity Switching Performance');
    });

    it('should manage memory usage efficiently', async () => {
      monitor.startOperation('Memory Usage Testing');

      const initialMemory = process.memoryUsage().heapUsed;
      const memorySnapshots: number[] = [initialMemory];

      // Perform memory-intensive operations
      for (let i = 0; i < 20; i++) {
        const metadata = createMockSubidentityMetadata({
          name: `Memory Test Identity ${i}`,
          type: IdentityType.DAO
        });

        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        if (result.success && result.identity) {
          testIdentities.push(result.identity);
        }

        // Take memory snapshot every 5 operations
        if (i % 5 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerOperation = memoryIncrease / 20;

      console.log(`[SystemTest] Memory usage - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[SystemTest] Memory per operation: ${(memoryIncreasePerOperation / 1024).toFixed(2)}KB`);

      // Memory increase should be reasonable (less than 10MB total)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      monitor.endOperation('Memory Usage Testing');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid identity data gracefully', async () => {
      monitor.startOperation('Invalid Data Handling');

      // Test with invalid identity type
      const invalidTypeResult = await identityManager.createSubidentity(
        'INVALID_TYPE' as IdentityType,
        createMockSubidentityMetadata({ name: 'Invalid Type Test' })
      );
      expect(invalidTypeResult.success).toBe(false);
      expect(invalidTypeResult.error).toContain('Invalid identity type');

      // Test with missing required fields
      const incompleteMetadata = { name: '' } as SubidentityMetadata;
      const incompleteResult = await identityManager.createSubidentity(
        IdentityType.DAO,
        incompleteMetadata
      );
      expect(incompleteResult.success).toBe(false);
      expect(incompleteResult.error).toContain('required');

      // Test with invalid DID format
      const invalidDIDResult = await identityManager.switchActiveIdentity('invalid_did_format');
      expect(invalidDIDResult.success).toBe(false);
      expect(invalidDIDResult.error).toContain('Invalid DID format');

      monitor.endOperation('Invalid Data Handling');
    });

    it('should handle network failures and service unavailability', async () => {
      monitor.startOperation('Network Failure Handling');

      // Mock network failures
      const mockQonsentService = vi.mocked(QonsentService);
      mockQonsentService.prototype.createProfile = vi.fn().mockRejectedValue(
        new Error('Network timeout')
      );

      const metadata = createMockSubidentityMetadata({
        name: 'Network Failure Test Identity',
        type: IdentityType.DAO
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      
      // Should handle network failure gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');

      monitor.endOperation('Network Failure Handling');
    });

    it('should handle storage failures and data corruption', async () => {
      monitor.startOperation('Storage Failure Handling');

      // Mock storage failure
      const mockStorage = vi.mocked(IdentityStorage);
      mockStorage.prototype.storeIdentity = vi.fn().mockRejectedValue(
        new Error('Storage quota exceeded')
      );

      const metadata = createMockSubidentityMetadata({
        name: 'Storage Failure Test Identity',
        type: IdentityType.DAO
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      
      // Should handle storage failure gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage');

      monitor.endOperation('Storage Failure Handling');
    });

    it('should recover from partial operation failures', async () => {
      monitor.startOperation('Partial Failure Recovery');

      // Mock partial failure scenario
      const mockQindexService = vi.mocked(QindexService);
      mockQindexService.prototype.registerIdentity = vi.fn()
        .mockResolvedValueOnce({ success: false, error: 'Service unavailable' })
        .mockResolvedValueOnce({ success: true, indexId: 'recovered_index' });

      const metadata = createMockSubidentityMetadata({
        name: 'Recovery Test Identity',
        type: IdentityType.DAO
      });

      // First attempt should fail
      const firstResult = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      expect(firstResult.success).toBe(false);

      // Retry should succeed
      const retryResult = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      expect(retryResult.success).toBe(true);

      if (retryResult.identity) {
        testIdentities.push(retryResult.identity);
      }

      monitor.endOperation('Partial Failure Recovery');
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity across identity relationships', async () => {
      monitor.startOperation('Referential Integrity');

      // Create parent identity
      const parentMetadata = createMockSubidentityMetadata({
        name: 'Integrity Test Parent',
        type: IdentityType.DAO
      });

      const parentResult = await identityManager.createSubidentity(IdentityType.DAO, parentMetadata);
      expect(parentResult.success).toBe(true);
      
      const parentIdentity = parentResult.identity!;
      testIdentities.push(parentIdentity);

      // Switch to parent identity
      await identityManager.switchActiveIdentity(parentIdentity.did);

      // Create child identity
      const childMetadata = createMockSubidentityMetadata({
        name: 'Integrity Test Child',
        type: IdentityType.ENTERPRISE
      });

      const childResult = await identityManager.createSubidentity(IdentityType.ENTERPRISE, childMetadata);
      expect(childResult.success).toBe(true);
      
      const childIdentity = childResult.identity!;
      testIdentities.push(childIdentity);

      // Verify parent-child relationship
      expect(childIdentity.parentId).toBe(parentIdentity.did);
      expect(childIdentity.depth).toBe(parentIdentity.depth + 1);

      // Verify tree structure
      const treeResult = await identityManager.getIdentityTree(rootIdentity.did);
      expect(treeResult.success).toBe(true);
      
      const tree = treeResult.tree!;
      const foundParent = findIdentityInTree(tree, parentIdentity.did);
      const foundChild = findIdentityInTree(tree, childIdentity.did);

      expect(foundParent).toBeDefined();
      expect(foundChild).toBeDefined();
      expect(foundChild?.parentId).toBe(foundParent?.identity.did);

      monitor.endOperation('Referential Integrity');
    });

    it('should handle concurrent modifications safely', async () => {
      monitor.startOperation('Concurrent Modifications');

      const identity = testIdentities.find(id => id.type === IdentityType.DAO);
      if (!identity) {
        throw new Error('No DAO identity available for concurrent modification test');
      }

      // Simulate concurrent modifications
      const modifications = [
        () => identityManager.updateIdentityMetadata(identity.did, { name: 'Updated Name 1' }),
        () => identityManager.updateIdentityMetadata(identity.did, { description: 'Updated Description' }),
        () => identityManager.updateIdentityMetadata(identity.did, { tags: ['updated', 'concurrent'] })
      ];

      const results = await Promise.allSettled(modifications.map(mod => mod()));

      // At least one modification should succeed
      const successfulResults = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );
      expect(successfulResults.length).toBeGreaterThan(0);

      monitor.endOperation('Concurrent Modifications');
    });

    it('should validate data consistency after operations', async () => {
      monitor.startOperation('Data Consistency Validation');

      const metadata = createMockSubidentityMetadata({
        name: 'Consistency Test Identity',
        type: IdentityType.DAO,
        privacyLevel: PrivacyLevel.DAO_ONLY
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      expect(result.success).toBe(true);
      
      const identity = result.identity!;
      testIdentities.push(identity);

      // Verify consistency across all storage layers
      const storageResult = await IdentityStorage.prototype.getIdentity(identity.did);
      expect(storageResult.success).toBe(true);
      expect(storageResult.identity?.did).toBe(identity.did);
      expect(storageResult.identity?.name).toBe(metadata.name);
      expect(storageResult.identity?.privacyLevel).toBe(metadata.privacyLevel);

      // Verify ecosystem service consistency
      const qonsentProfile = await QonsentService.prototype.getProfile(identity.qonsentProfileId);
      expect(qonsentProfile.identityId).toBe(identity.did);
      expect(qonsentProfile.privacyLevel).toBe(metadata.privacyLevel);

      monitor.endOperation('Data Consistency Validation');
    });
  });
});

// Helper function to find identity in tree structure
function findIdentityInTree(tree: any, identityId: string): any {
  if (tree.identity.did === identityId) {
    return tree;
  }
  
  for (const child of tree.children || []) {
    const found = findIdentityInTree(child, identityId);
    if (found) {
      return found;
    }
  }
  
  return null;
}
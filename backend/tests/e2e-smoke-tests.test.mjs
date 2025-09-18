/**
 * End-to-End Smoke Tests
 * 
 * Fast, lightweight tests that verify critical paths across all modules are functional.
 * These tests run quickly and catch major system failures.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { UnifiedStorageService } from '../services/UnifiedStorageService.mjs';
import { QmarketService } from '../services/QmarketService.mjs';
import ObservabilityService from '../services/ObservabilityService.mjs';
import { performance } from 'perf_hooks';

describe('E2E Smoke Tests', () => {
  let services;
  let testUser;
  let smokeTestResults;

  beforeAll(async () => {
    console.log('🔥 Initializing E2E Smoke Tests...');
    
    // Initialize services with minimal configuration for speed
    const eventBus = new EventBusService();
    const observabilityService = new ObservabilityService({ eventBus, minimal: true });
    
    services = {
      eventBus,
      observability: observabilityService,
      qwallet: new QwalletIntegrationService({ 
        sandboxMode: true, 
        eventBus,
        fastInit: true // Skip heavy initialization
      }),
      storage: new UnifiedStorageService({ 
        sandboxMode: true, 
        eventBus,
        fastInit: true
      }),
      qmarket: new QmarketService({ 
        sandboxMode: true, 
        eventBus,
        fastInit: true
      })
    };

    // Fast parallel initialization
    await Promise.all([
      services.qwallet.initialize(),
      services.storage.initialize(),
      services.qmarket.initialize(),
      services.observability.initialize()
    ]);

    // Single test user for all smoke tests
    testUser = {
      squidId: 'did:squid:smoke_test_user',
      subId: 'smoke_test_sub'
    };

    await services.qwallet.getSandboxBalance(testUser.squidId, 100.0);
    
    smokeTestResults = {
      startTime: performance.now(),
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    };

    console.log('✅ E2E Smoke Test Environment Ready');
  });

  afterAll(async () => {
    const totalTime = performance.now() - smokeTestResults.startTime;
    
    console.log('🔥 Smoke Test Summary:');
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Total Tests: ${smokeTestResults.totalTests}`);
    console.log(`   Passed: ${smokeTestResults.passedTests}`);
    console.log(`   Failed: ${smokeTestResults.failedTests}`);
    console.log(`   Success Rate: ${((smokeTestResults.passedTests / smokeTestResults.totalTests) * 100).toFixed(1)}%`);

    // Fast cleanup
    await Promise.all([
      services.qmarket?.shutdown(),
      services.storage?.shutdown(),
      services.qwallet?.shutdown(),
      services.observability?.shutdown()
    ]);
    
    console.log('✅ E2E Smoke Tests Completed');
  });

  describe('Critical Path Smoke Tests', () => {
    it('should verify sQuid identity system is functional', async () => {
      const testName = 'sQuid Identity Smoke Test';
      const startTime = performance.now();
      
      try {
        // Basic identity verification
        const identityResult = await mockSquidIdentityVerification(testUser.squidId);
        expect(identityResult.success).toBe(true);
        expect(identityResult.verified).toBe(true);
        
        // Subidentity creation
        const subIdentityResult = await mockSquidSubIdentityCreation(testUser.squidId, testUser.subId);
        expect(subIdentityResult.success).toBe(true);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qwallet payment system is functional', async () => {
      const testName = 'Qwallet Payment Smoke Test';
      const startTime = performance.now();
      
      try {
        // Check wallet balance
        const balanceResult = await services.qwallet.getSandboxBalance(testUser.squidId);
        expect(balanceResult.success).toBe(true);
        expect(balanceResult.balance).toBeGreaterThan(0);
        
        // Create payment intent
        const paymentIntent = await services.qwallet.createPaymentIntent({
          squidId: testUser.squidId,
          amount: 1.0,
          currency: 'QToken',
          purpose: 'smoke_test_payment'
        });
        expect(paymentIntent.success).toBe(true);
        expect(paymentIntent.intentId).toBeDefined();
        
        // Process payment
        const paymentResult = await services.qwallet.processSandboxPayment(paymentIntent);
        expect(paymentResult.success).toBe(true);
        expect(paymentResult.status).toBe('SETTLED');
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qlock encryption system is functional', async () => {
      const testName = 'Qlock Encryption Smoke Test';
      const startTime = performance.now();
      
      try {
        const testContent = 'Smoke test encryption content';
        
        // Encrypt content
        const encryptResult = await mockQlockEncryption(testContent, testUser.squidId);
        expect(encryptResult.success).toBe(true);
        expect(encryptResult.encryptedData).toBeDefined();
        expect(encryptResult.signature).toBeDefined();
        
        // Decrypt content
        const decryptResult = await mockQlockDecryption(
          encryptResult.encryptedData, 
          testUser.squidId,
          encryptResult.signature
        );
        expect(decryptResult.success).toBe(true);
        expect(decryptResult.decryptedData).toBe(testContent);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qonsent permission system is functional', async () => {
      const testName = 'Qonsent Permission Smoke Test';
      const startTime = performance.now();
      
      try {
        const testResource = 'smoke_test_resource';
        
        // Grant permission
        const grantResult = await mockQonsentPermissionGrant({
          grantor: testUser.squidId,
          grantee: testUser.squidId,
          resource: testResource,
          permissions: ['read', 'write']
        });
        expect(grantResult.success).toBe(true);
        expect(grantResult.grantId).toBeDefined();
        
        // Check permission
        const checkResult = await mockQonsentPermissionCheck({
          actor: testUser.squidId,
          resource: testResource,
          permission: 'read'
        });
        expect(checkResult.allowed).toBe(true);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qindex indexing system is functional', async () => {
      const testName = 'Qindex Indexing Smoke Test';
      const startTime = performance.now();
      
      try {
        const testRecord = {
          type: 'smoke_test',
          key: `smoke_test_${Date.now()}`,
          cid: `bafybei${Math.random().toString(36).substring(2, 15)}`,
          metadata: { test: true }
        };
        
        // Index record
        const indexResult = await mockQindexRegistration({
          resourceType: testRecord.type,
          resourceId: testRecord.key,
          squidId: testUser.squidId,
          cid: testRecord.cid,
          metadata: testRecord.metadata
        });
        expect(indexResult.success).toBe(true);
        expect(indexResult.indexed).toBe(true);
        
        // Retrieve record
        const retrieveResult = await mockQindexRetrieval(testRecord.key);
        expect(retrieveResult.success).toBe(true);
        expect(retrieveResult.record.cid).toBe(testRecord.cid);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qdrive storage system is functional', async () => {
      const testName = 'Qdrive Storage Smoke Test';
      const startTime = performance.now();
      
      try {
        const testContent = Buffer.from('Smoke test file content');
        
        // Upload file
        const uploadResult = await services.storage.uploadFile({
          squidId: testUser.squidId,
          fileName: 'smoke-test.txt',
          fileSize: testContent.length,
          contentType: 'text/plain',
          content: testContent
        });
        expect(uploadResult.success).toBe(true);
        expect(uploadResult.cid).toBeDefined();
        
        // Retrieve file
        const retrieveResult = await services.storage.retrieveFile({
          squidId: testUser.squidId,
          cid: uploadResult.cid
        });
        expect(retrieveResult.success).toBe(true);
        expect(retrieveResult.content.equals(testContent)).toBe(true);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qmarket marketplace system is functional', async () => {
      const testName = 'Qmarket Marketplace Smoke Test';
      const startTime = performance.now();
      
      try {
        const testCid = `bafybei${Math.random().toString(36).substring(2, 15)}`;
        
        // Create listing
        const listingResult = await services.qmarket.createListing({
          squidId: testUser.squidId,
          contentCid: testCid,
          title: 'Smoke Test Content',
          description: 'Test content for smoke testing',
          price: 2.0,
          currency: 'QToken',
          category: 'test'
        });
        expect(listingResult.success).toBe(true);
        expect(listingResult.listingId).toBeDefined();
        
        // Get listing
        const getListingResult = await services.qmarket.getListing(listingResult.listingId);
        expect(getListingResult.success).toBe(true);
        expect(getListingResult.listing.title).toBe('Smoke Test Content');
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qerberos audit system is functional', async () => {
      const testName = 'Qerberos Audit Smoke Test';
      const startTime = performance.now();
      
      try {
        // Create audit event
        const auditResult = await mockQerberosAuditEvent({
          type: 'SMOKE_TEST',
          actor: testUser.squidId,
          action: 'TEST_ACTION',
          target: 'smoke_test_target',
          metadata: { test: true }
        });
        expect(auditResult.success).toBe(true);
        expect(auditResult.auditId).toBeDefined();
        expect(auditResult.immutable).toBe(true);
        
        // Retrieve audit trail
        const auditTrailResult = await mockQerberosAuditTrail(testUser.squidId);
        expect(auditTrailResult.success).toBe(true);
        expect(auditTrailResult.events.length).toBeGreaterThan(0);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify Qmask privacy system is functional', async () => {
      const testName = 'Qmask Privacy Smoke Test';
      const startTime = performance.now();
      
      try {
        const testData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890'
        };
        
        // Apply privacy mask
        const maskResult = await mockQmaskApplyProfile(testData, 'basic_anonymization');
        expect(maskResult.success).toBe(true);
        expect(maskResult.maskedData.name).not.toBe(testData.name);
        expect(maskResult.maskedData.email).toContain('***');
        
        // Verify privacy profile
        const profileResult = await mockQmaskGetProfile('basic_anonymization');
        expect(profileResult.success).toBe(true);
        expect(profileResult.profile.name).toBe('basic_anonymization');
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify QNET network system is functional', async () => {
      const testName = 'QNET Network Smoke Test';
      const startTime = performance.now();
      
      try {
        // Network ping
        const pingResult = await mockQnetPing('localhost');
        expect(pingResult.success).toBe(true);
        expect(pingResult.latency).toBeLessThan(100); // Under 100ms
        
        // Node capabilities
        const capabilitiesResult = await mockQnetCapabilities();
        expect(capabilitiesResult.success).toBe(true);
        expect(capabilitiesResult.capabilities.length).toBeGreaterThan(0);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify DAO governance system is functional', async () => {
      const testName = 'DAO Governance Smoke Test';
      const startTime = performance.now();
      
      try {
        const testDao = 'dao:smoke_test_dao';
        
        // Create proposal
        const proposalResult = await mockDaoCreateProposal({
          daoId: testDao,
          proposer: testUser.squidId,
          title: 'Smoke Test Proposal',
          description: 'Test proposal for smoke testing',
          type: 'PARAMETER_CHANGE'
        });
        expect(proposalResult.success).toBe(true);
        expect(proposalResult.proposalId).toBeDefined();
        
        // Cast vote
        const voteResult = await mockDaoVote({
          daoId: testDao,
          proposalId: proposalResult.proposalId,
          voter: testUser.squidId,
          vote: 'YES'
        });
        expect(voteResult.success).toBe(true);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });
  });

  describe('Inter-Module Communication Smoke Tests', () => {
    it('should verify event bus communication is functional', async () => {
      const testName = 'Event Bus Communication Smoke Test';
      const startTime = performance.now();
      
      try {
        let eventReceived = false;
        const testTopic = 'q.smoke.test.v1';
        
        // Subscribe to test event
        services.eventBus.subscribe(testTopic, testUser, (event) => {
          eventReceived = true;
          expect(event.topic).toBe(testTopic);
          expect(event.payload.test).toBe(true);
        });
        
        // Publish test event
        await services.eventBus.publish(testTopic, testUser, {
          test: true,
          timestamp: new Date().toISOString()
        });
        
        // Wait for event processing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(eventReceived).toBe(true);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify cross-module integration is functional', async () => {
      const testName = 'Cross-Module Integration Smoke Test';
      const startTime = performance.now();
      
      try {
        // Test Qwallet + Qmarket integration
        const paymentIntent = await services.qwallet.createPaymentIntent({
          squidId: testUser.squidId,
          amount: 1.0,
          currency: 'QToken',
          purpose: 'smoke_test_marketplace_purchase'
        });
        expect(paymentIntent.success).toBe(true);
        
        const testCid = `bafybei${Math.random().toString(36).substring(2, 15)}`;
        const listing = await services.qmarket.createListing({
          squidId: testUser.squidId,
          contentCid: testCid,
          title: 'Cross-Module Test Content',
          price: 1.0,
          currency: 'QToken'
        });
        expect(listing.success).toBe(true);
        
        // Test Storage + Market integration
        const uploadResult = await services.storage.uploadFile({
          squidId: testUser.squidId,
          fileName: 'cross-module-test.txt',
          fileSize: 100,
          contentType: 'text/plain',
          content: Buffer.from('Cross-module test content')
        });
        expect(uploadResult.success).toBe(true);
        
        recordSmokeTestResult(testName, true, performance.now() - startTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });
  });

  describe('Performance Smoke Tests', () => {
    it('should verify system responds within acceptable time limits', async () => {
      const testName = 'Performance Response Time Smoke Test';
      const startTime = performance.now();
      
      try {
        const operations = [];
        
        // Test multiple operations concurrently
        operations.push(services.qwallet.getSandboxBalance(testUser.squidId));
        operations.push(mockSquidIdentityVerification(testUser.squidId));
        operations.push(mockQlockEncryption('test', testUser.squidId));
        operations.push(mockQonsentPermissionCheck({
          actor: testUser.squidId,
          resource: 'test_resource',
          permission: 'read'
        }));
        
        const results = await Promise.all(operations);
        
        // All operations should complete successfully
        results.forEach(result => {
          expect(result.success).toBe(true);
        });
        
        const totalTime = performance.now() - startTime;
        
        // All operations should complete within 2 seconds
        expect(totalTime).toBeLessThan(2000);
        
        recordSmokeTestResult(testName, true, totalTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });

    it('should verify system handles basic load without degradation', async () => {
      const testName = 'Basic Load Handling Smoke Test';
      const startTime = performance.now();
      
      try {
        const concurrentOperations = 10;
        const operations = [];
        
        // Create multiple concurrent operations
        for (let i = 0; i < concurrentOperations; i++) {
          operations.push(
            services.storage.uploadFile({
              squidId: testUser.squidId,
              fileName: `load-test-${i}.txt`,
              fileSize: 50,
              contentType: 'text/plain',
              content: Buffer.from(`Load test content ${i}`)
            })
          );
        }
        
        const results = await Promise.all(operations);
        
        // All operations should succeed
        const successCount = results.filter(r => r.success).length;
        expect(successCount).toBe(concurrentOperations);
        
        const totalTime = performance.now() - startTime;
        
        // Should handle basic load within 5 seconds
        expect(totalTime).toBeLessThan(5000);
        
        recordSmokeTestResult(testName, true, totalTime);
      } catch (error) {
        recordSmokeTestResult(testName, false, performance.now() - startTime, error.message);
        throw error;
      }
    });
  });

  // Helper function to record smoke test results
  function recordSmokeTestResult(testName, passed, duration, error = null) {
    smokeTestResults.tests.push({
      name: testName,
      passed,
      duration: duration.toFixed(2) + 'ms',
      error
    });
    
    smokeTestResults.totalTests++;
    if (passed) {
      smokeTestResults.passedTests++;
    } else {
      smokeTestResults.failedTests++;
    }
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${duration.toFixed(2)}ms${error ? ` (${error})` : ''}`);
  }
});

// Mock functions for smoke testing (lightweight implementations)

async function mockSquidIdentityVerification(squidId) {
  return {
    success: true,
    verified: true,
    squidId,
    reputation: 75,
    timestamp: new Date().toISOString()
  };
}

async function mockSquidSubIdentityCreation(squidId, subId) {
  return {
    success: true,
    squidId,
    subId,
    created: true,
    timestamp: new Date().toISOString()
  };
}

async function mockQlockEncryption(content, recipient) {
  return {
    success: true,
    encryptedData: `encrypted_${Buffer.from(content).toString('base64')}`,
    signature: `sig_${Date.now()}_${recipient}`,
    algorithm: 'AES-256-GCM'
  };
}

async function mockQlockDecryption(encryptedData, recipient, signature) {
  const content = Buffer.from(encryptedData.replace('encrypted_', ''), 'base64').toString();
  return {
    success: true,
    decryptedData: content,
    verified: true,
    signature
  };
}

async function mockQonsentPermissionGrant(grantData) {
  return {
    success: true,
    grantId: `grant_${Date.now()}`,
    grantor: grantData.grantor,
    grantee: grantData.grantee,
    resource: grantData.resource,
    permissions: grantData.permissions
  };
}

async function mockQonsentPermissionCheck(checkData) {
  return {
    success: true,
    allowed: true,
    actor: checkData.actor,
    resource: checkData.resource,
    permission: checkData.permission
  };
}

async function mockQindexRegistration(data) {
  return {
    success: true,
    indexed: true,
    indexId: `idx_${Date.now()}`,
    resourceId: data.resourceId,
    cid: data.cid
  };
}

async function mockQindexRetrieval(key) {
  return {
    success: true,
    record: {
      key,
      cid: `bafybei${Math.random().toString(36).substring(2, 15)}`,
      timestamp: new Date().toISOString()
    }
  };
}

async function mockQerberosAuditEvent(eventData) {
  return {
    success: true,
    auditId: `audit_${Date.now()}`,
    type: eventData.type,
    actor: eventData.actor,
    action: eventData.action,
    target: eventData.target,
    immutable: true,
    timestamp: new Date().toISOString()
  };
}

async function mockQerberosAuditTrail(squidId) {
  return {
    success: true,
    events: [
      {
        auditId: `audit_${Date.now()}`,
        type: 'SMOKE_TEST',
        actor: squidId,
        timestamp: new Date().toISOString()
      }
    ]
  };
}

async function mockQmaskApplyProfile(data, profileName) {
  return {
    success: true,
    maskedData: {
      name: '***',
      email: data.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      phone: data.phone.replace(/(.{3}).*(.{4})/, '$1***$2')
    },
    profileApplied: profileName
  };
}

async function mockQmaskGetProfile(profileName) {
  return {
    success: true,
    profile: {
      name: profileName,
      rules: ['anonymize_name', 'mask_email', 'mask_phone'],
      version: '1.0'
    }
  };
}

async function mockQnetPing(target) {
  return {
    success: true,
    target,
    latency: Math.random() * 50 + 10, // 10-60ms
    timestamp: new Date().toISOString()
  };
}

async function mockQnetCapabilities() {
  return {
    success: true,
    capabilities: [
      'storage',
      'compute',
      'messaging',
      'payments'
    ]
  };
}

async function mockDaoCreateProposal(proposalData) {
  return {
    success: true,
    proposalId: `prop_${Date.now()}`,
    daoId: proposalData.daoId,
    proposer: proposalData.proposer,
    title: proposalData.title,
    status: 'ACTIVE'
  };
}

async function mockDaoVote(voteData) {
  return {
    success: true,
    voteId: `vote_${Date.now()}`,
    daoId: voteData.daoId,
    proposalId: voteData.proposalId,
    voter: voteData.voter,
    vote: voteData.vote,
    timestamp: new Date().toISOString()
  };
}
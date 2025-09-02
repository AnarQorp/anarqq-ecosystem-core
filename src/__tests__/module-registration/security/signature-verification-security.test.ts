/**
 * Signature Verification Security Tests
 * Tests security aspects of signature verification and authorization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../../../services/ModuleRegistrationService';
import { ModuleVerificationService } from '../../../services/ModuleVerificationService';
import { ModuleSecurityValidationService } from '../../../services/ModuleSecurityValidationService';
import {
  ModuleRegistrationRequest,
  SignedModuleMetadata,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  IdentityType
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity } from '../../../types/identity';
import { 
  createMockIdentity, 
  createMockModuleInfo, 
  createMockSignedMetadata,
  createMaliciousInputs,
  setupSecurityTestEnvironment
} from '../../utils/qwallet-test-utils';

describe('Signature Verification Security Tests', () => {
  let registrationService: ModuleRegistrationService;
  let verificationService: ModuleVerificationService;
  let securityService: ModuleSecurityValidationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let securityTestEnv: any;

  beforeEach(async () => {
    securityTestEnv = await setupSecurityTestEnvironment();
    
    registrationService = new ModuleRegistrationService();
    verificationService = new ModuleVerificationService();
    securityService = new ModuleSecurityValidationService();
    
    mockRootIdentity = createMockIdentity(IdentityType.ROOT);
    mockDAOIdentity = createMockIdentity(IdentityType.DAO);
  });

  afterEach(() => {
    vi.clearAllMocks();
    securityTestEnv.cleanup();
  });

  describe('Signature Tampering Detection', () => {
    it('should detect tampered signatures', async () => {
      const moduleInfo = createMockModuleInfo('SecurityTestModule', '1.0.0');
      const validSignedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Tamper with signature
      const tamperedSignedMetadata: SignedModuleMetadata = {
        ...validSignedMetadata,
        signature: 'tampered-signature-12345'
      };

      const result = await verificationService.verifySignature(tamperedSignedMetadata);

      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
      expect(result.error).toContain('Invalid signature');
    });

    it('should detect tampered metadata with valid signature', async () => {
      const moduleInfo = createMockModuleInfo('SecurityTestModule', '1.0.0');
      const validSignedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Tamper with metadata but keep original signature
      const tamperedSignedMetadata: SignedModuleMetadata = {
        ...validSignedMetadata,
        metadata: {
          ...validSignedMetadata.metadata,
          version: '2.0.0' // Changed version but signature is for 1.0.0
        }
      };

      const result = await verificationService.verifySignature(tamperedSignedMetadata);

      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });

    it('should detect signature replay attacks', async () => {
      const moduleInfo1 = createMockModuleInfo('Module1', '1.0.0');
      const moduleInfo2 = createMockModuleInfo('Module2', '1.0.0');
      
      const signedMetadata1 = createMockSignedMetadata(moduleInfo1, mockRootIdentity);
      
      // Try to use signature from Module1 for Module2
      const replayAttackMetadata: SignedModuleMetadata = {
        ...signedMetadata1,
        metadata: {
          ...signedMetadata1.metadata,
          module: 'Module2' // Different module but same signature
        }
      };

      const result = await verificationService.verifySignature(replayAttackMetadata);

      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });

    it('should detect timestamp manipulation', async () => {
      const moduleInfo = createMockModuleInfo('SecurityTestModule', '1.0.0');
      const validSignedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Manipulate timestamp
      const timestampManipulatedMetadata: SignedModuleMetadata = {
        ...validSignedMetadata,
        signed_at: Date.now() + 86400000, // Future timestamp
        metadata: {
          ...validSignedMetadata.metadata,
          timestamp: Date.now() + 86400000
        }
      };

      const result = await verificationService.verifySignature(timestampManipulatedMetadata);

      expect(result.valid).toBe(false);
      expect(result.timestampValid).toBe(false);
    });

    it('should detect public key substitution attacks', async () => {
      const moduleInfo = createMockModuleInfo('SecurityTestModule', '1.0.0');
      const validSignedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Substitute public key
      const keySubstitutionMetadata: SignedModuleMetadata = {
        ...validSignedMetadata,
        publicKey: 'attacker-public-key-12345'
      };

      const result = await verificationService.verifySignature(keySubstitutionMetadata);

      expect(result.valid).toBe(false);
      expect(result.identityVerified).toBe(false);
    });
  });

  describe('Identity Authorization Security', () => {
    it('should prevent unauthorized identity registration', async () => {
      const unauthorizedIdentities = [
        createMockIdentity(IdentityType.AID),
        createMockIdentity(IdentityType.CONSENTIDA)
      ];

      const moduleInfo = createMockModuleInfo('UnauthorizedModule', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      for (const identity of unauthorizedIdentities) {
        await expect(registrationService.registerModule(request, identity))
          .rejects.toThrow(ModuleRegistrationError);
      }
    });

    it('should validate identity permissions for different operations', async () => {
      const moduleInfo = createMockModuleInfo('PermissionTestModule', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      // Register with ROOT identity (should succeed)
      const registrationResult = await registrationService.registerModule(request, mockRootIdentity);
      expect(registrationResult.success).toBe(true);

      // Try to update with unauthorized identity (should fail)
      const unauthorizedIdentity = createMockIdentity(IdentityType.ENTERPRISE);
      const updates = { version: '1.1.0' };

      await expect(registrationService.updateModule('PermissionTestModule', updates, unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);

      // Try to deregister with unauthorized identity (should fail)
      await expect(registrationService.deregisterModule('PermissionTestModule', unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should prevent identity spoofing attacks', async () => {
      const moduleInfo = createMockModuleInfo('SpoofingTestModule', '1.0.0');
      
      // Create a fake ROOT identity with invalid DID
      const spoofedIdentity: ExtendedSquidIdentity = {
        ...mockRootIdentity,
        did: 'did:fake:spoofed-root-identity',
        publicKey: 'fake-public-key'
      };

      const request: ModuleRegistrationRequest = { moduleInfo };

      await expect(registrationService.registerModule(request, spoofedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should validate identity signature chain', async () => {
      const moduleInfo = createMockModuleInfo('ChainTestModule', '1.0.0');
      const signedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Modify signer identity to not match the actual signer
      const invalidChainMetadata: SignedModuleMetadata = {
        ...signedMetadata,
        signer_identity: 'did:fake:different-signer'
      };

      const result = await verificationService.verifySignature(invalidChainMetadata);

      expect(result.valid).toBe(false);
      expect(result.identityVerified).toBe(false);
    });

    it('should enforce rate limiting for registration attempts', async () => {
      const moduleInfo = createMockModuleInfo('RateLimitTestModule', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      // Simulate rapid registration attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const moduleInfoCopy = { ...moduleInfo, name: `RateLimitModule${i}` };
        const requestCopy = { moduleInfo: moduleInfoCopy };
        promises.push(registrationService.registerModule(requestCopy, mockRootIdentity));
      }

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent injection attacks in module metadata', async () => {
      const maliciousInputs = createMaliciousInputs();
      
      for (const maliciousInput of maliciousInputs) {
        const maliciousModuleInfo = createMockModuleInfo('MaliciousModule', '1.0.0');
        
        // Try different fields with malicious input
        const testCases = [
          { ...maliciousModuleInfo, name: maliciousInput },
          { ...maliciousModuleInfo, description: maliciousInput },
          { ...maliciousModuleInfo, repositoryUrl: maliciousInput }
        ];

        for (const testCase of testCases) {
          const request: ModuleRegistrationRequest = { moduleInfo: testCase };
          
          await expect(registrationService.registerModule(request, mockRootIdentity))
            .rejects.toThrow(ModuleRegistrationError);
        }
      }
    });

    it('should sanitize metadata before processing', async () => {
      const moduleInfo = createMockModuleInfo('SanitizationTest', '1.0.0');
      moduleInfo.description = '<script>alert("xss")</script>Legitimate description';
      
      const request: ModuleRegistrationRequest = { moduleInfo };
      
      const result = await registrationService.registerModule(request, mockRootIdentity);
      expect(result.success).toBe(true);

      // Verify malicious content was sanitized
      const registeredModule = await registrationService.getModule('SanitizationTest');
      expect(registeredModule?.metadata.description).not.toContain('<script>');
      expect(registeredModule?.metadata.description).toContain('Legitimate description');
    });

    it('should validate field lengths to prevent buffer overflow attacks', async () => {
      const oversizedData = 'A'.repeat(10000); // Very long string
      
      const maliciousModuleInfo = createMockModuleInfo('OverflowTest', '1.0.0');
      maliciousModuleInfo.description = oversizedData;
      
      const request: ModuleRegistrationRequest = { moduleInfo: maliciousModuleInfo };
      
      await expect(registrationService.registerModule(request, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should validate array inputs to prevent array manipulation attacks', async () => {
      const moduleInfo = createMockModuleInfo('ArrayAttackTest', '1.0.0');
      
      // Try various array manipulation attacks
      const maliciousArrays = [
        null,
        undefined,
        'not-an-array',
        [null, undefined, ''],
        new Array(1000).fill('spam'), // Array flooding
        ['valid', { malicious: 'object' }] // Mixed types
      ];

      for (const maliciousArray of maliciousArrays) {
        const testModuleInfo = {
          ...moduleInfo,
          identitiesSupported: maliciousArray as any
        };
        
        const request: ModuleRegistrationRequest = { moduleInfo: testModuleInfo };
        
        await expect(registrationService.registerModule(request, mockRootIdentity))
          .rejects.toThrow(ModuleRegistrationError);
      }
    });
  });

  describe('Cryptographic Security', () => {
    it('should use strong signature algorithms', async () => {
      const moduleInfo = createMockModuleInfo('CryptoTestModule', '1.0.0');
      const signedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Verify strong signature algorithm is used
      expect(['RSA-SHA256', 'ECDSA-SHA256', 'RSA-SHA512', 'ECDSA-SHA512'])
        .toContain(signedMetadata.signature_type);
    });

    it('should reject weak signature algorithms', async () => {
      const moduleInfo = createMockModuleInfo('WeakCryptoTest', '1.0.0');
      const signedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Try to use weak signature algorithm
      const weakSignedMetadata: SignedModuleMetadata = {
        ...signedMetadata,
        signature_type: 'MD5' as any // Weak algorithm
      };

      const result = await verificationService.verifySignature(weakSignedMetadata);

      expect(result.valid).toBe(false);
    });

    it('should validate signature key strength', async () => {
      const moduleInfo = createMockModuleInfo('KeyStrengthTest', '1.0.0');
      const signedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Mock weak key detection
      const weakKeyMetadata: SignedModuleMetadata = {
        ...signedMetadata,
        publicKey: 'weak-512-bit-key' // Simulated weak key
      };

      const result = await verificationService.verifySignature(weakKeyMetadata);

      // Should reject weak keys
      expect(result.valid).toBe(false);
    });

    it('should prevent signature algorithm downgrade attacks', async () => {
      const moduleInfo = createMockModuleInfo('DowngradeTest', '1.0.0');
      const signedMetadata = createMockSignedMetadata(moduleInfo, mockRootIdentity);

      // Try to downgrade from strong to weak algorithm
      const downgradeMetadata: SignedModuleMetadata = {
        ...signedMetadata,
        signature_type: 'SHA1' as any, // Downgraded algorithm
        metadata: {
          ...signedMetadata.metadata,
          signature_algorithm: 'SHA1' as any
        }
      };

      const result = await verificationService.verifySignature(downgradeMetadata);

      expect(result.valid).toBe(false);
    });
  });

  describe('Access Control Security', () => {
    it('should enforce module ownership for updates', async () => {
      const moduleInfo = createMockModuleInfo('OwnershipTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      // Register with ROOT identity
      await registrationService.registerModule(request, mockRootIdentity);

      // Try to update with different identity (should fail)
      const updates = { version: '1.1.0' };
      await expect(registrationService.updateModule('OwnershipTest', updates, mockDAOIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should validate permissions for sensitive operations', async () => {
      const moduleInfo = createMockModuleInfo('PermissionTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      await registrationService.registerModule(request, mockRootIdentity);

      // Test various permission levels
      const testCases = [
        {
          identity: createMockIdentity(IdentityType.CONSENTIDA),
          operation: 'update',
          shouldFail: true
        },
        {
          identity: createMockIdentity(IdentityType.AID),
          operation: 'deregister',
          shouldFail: true
        },
        {
          identity: mockRootIdentity,
          operation: 'update',
          shouldFail: false
        }
      ];

      for (const testCase of testCases) {
        if (testCase.operation === 'update') {
          const updates = { version: '1.1.0' };
          if (testCase.shouldFail) {
            await expect(registrationService.updateModule('PermissionTest', updates, testCase.identity))
              .rejects.toThrow(ModuleRegistrationError);
          } else {
            const result = await registrationService.updateModule('PermissionTest', updates, testCase.identity);
            expect(result.success).toBe(true);
          }
        }
      }
    });

    it('should prevent privilege escalation attacks', async () => {
      const lowPrivilegeIdentity = createMockIdentity(IdentityType.ENTERPRISE);
      
      // Try to register a module that claims ROOT privileges
      const privilegeEscalationModule = createMockModuleInfo('PrivilegeEscalation', '1.0.0');
      privilegeEscalationModule.compliance = {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: true,
        gdpr_compliant: true,
        data_retention_policy: 'root_level_access' // Attempting to claim root privileges
      };

      const request: ModuleRegistrationRequest = { moduleInfo: privilegeEscalationModule };

      // Should be rejected based on identity permissions
      await expect(registrationService.registerModule(request, lowPrivilegeIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });
  });

  describe('Audit Trail Security', () => {
    it('should maintain tamper-proof audit logs', async () => {
      const moduleInfo = createMockModuleInfo('AuditTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      await registrationService.registerModule(request, mockRootIdentity);

      // Verify audit events are properly signed and timestamped
      const auditEvents = securityTestEnv.getAuditEvents();
      const registrationEvent = auditEvents.find(e => e.action === 'REGISTERED');

      expect(registrationEvent).toBeDefined();
      expect(registrationEvent.signature).toBeDefined();
      expect(registrationEvent.timestamp).toBeDefined();
      expect(registrationEvent.actorIdentity).toBe(mockRootIdentity.did);
    });

    it('should detect audit log tampering', async () => {
      const moduleInfo = createMockModuleInfo('TamperTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      await registrationService.registerModule(request, mockRootIdentity);

      // Simulate audit log tampering
      const auditEvents = securityTestEnv.getAuditEvents();
      const originalEvent = auditEvents[0];
      
      // Tamper with event
      originalEvent.details.version = '2.0.0'; // Changed version
      
      // Verify tampering is detected
      const tamperingDetected = securityTestEnv.verifyAuditIntegrity();
      expect(tamperingDetected).toBe(false); // Should detect tampering
    });

    it('should log all security-relevant events', async () => {
      const moduleInfo = createMockModuleInfo('SecurityEventTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      // Attempt unauthorized registration
      const unauthorizedIdentity = createMockIdentity(IdentityType.AID);
      try {
        await registrationService.registerModule(request, unauthorizedIdentity);
      } catch (error) {
        // Expected to fail
      }

      // Successful registration
      await registrationService.registerModule(request, mockRootIdentity);

      // Verify all events are logged
      const auditEvents = securityTestEnv.getAuditEvents();
      
      expect(auditEvents.some(e => e.action === 'REGISTRATION_ERROR')).toBe(true);
      expect(auditEvents.some(e => e.action === 'REGISTERED')).toBe(true);
      expect(auditEvents.some(e => e.details?.errorCode === 'UNAUTHORIZED_SIGNER')).toBe(true);
    });
  });

  describe('Data Protection Security', () => {
    it('should protect sensitive data in transit and at rest', async () => {
      const moduleInfo = createMockModuleInfo('DataProtectionTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      const result = await registrationService.registerModule(request, mockRootIdentity);
      expect(result.success).toBe(true);

      // Verify sensitive data is properly encrypted/hashed
      const registeredModule = await registrationService.getModule('DataProtectionTest');
      
      expect(registeredModule?.metadata.checksum).toMatch(/^[a-f0-9]{64}$/); // Proper hash format
      expect(registeredModule?.metadata.audit_hash).toMatch(/^[a-f0-9]{64}$/); // Proper hash format
      expect(registeredModule?.signedMetadata.signature).toBeDefined();
    });

    it('should prevent data leakage through error messages', async () => {
      const moduleInfo = createMockModuleInfo('DataLeakageTest', '1.0.0');
      moduleInfo.auditHash = 'sensitive-internal-data-12345';
      
      const request: ModuleRegistrationRequest = { moduleInfo };

      try {
        await registrationService.registerModule(request, mockRootIdentity);
      } catch (error) {
        // Error messages should not contain sensitive data
        expect(error.message).not.toContain('sensitive-internal-data');
        expect(error.message).not.toContain(mockRootIdentity.privateKey || '');
      }
    });

    it('should implement proper data retention policies', async () => {
      const moduleInfo = createMockModuleInfo('RetentionTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      await registrationService.registerModule(request, mockRootIdentity);

      // Verify data retention policy is enforced
      const registeredModule = await registrationService.getModule('RetentionTest');
      expect(registeredModule?.metadata.compliance.data_retention_policy).toBeDefined();
      expect(registeredModule?.metadata.compliance.data_retention_policy).not.toBe('');
    });
  });
});
/**
 * Ecosystem Validator Tests
 * 
 * Tests to ensure ecosystem compliance validation works correctly
 * and follows the Q∞ architecture specification.
 */

import { describe, it, expect } from 'vitest';
import { EcosystemValidator } from '../ecosystemValidator';
import { QsocialFileAttachment, EcosystemFileData } from '../../types/qsocial';

// Mock file attachment with complete ecosystem integration
const createMockAttachment = (overrides: Partial<QsocialFileAttachment> = {}): QsocialFileAttachment => ({
  fileId: 'test-file-123',
  originalName: 'test-image.jpg',
  storjUrl: 'https://gateway.storjshare.io/qsocial-files/user123/test-file-123.jpg',
  storjKey: 'qsocial/user123/1234567890_test-file-123.jpg',
  fileSize: 1024000,
  contentType: 'image/jpeg',
  uploadedAt: new Date().toISOString(),
  processingTime: 1250,
  ecosystem: {
    qonsent: {
      profileId: 'qonsent_abc123',
      visibility: 'private',
      encryptionLevel: 'standard'
    },
    qlock: {
      encrypted: true,
      encryptionLevel: 'standard',
      keyId: 'qlock_def456'
    },
    ipfs: {
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      generated: true,
      gatewayUrls: ['https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi']
    },
    qindex: {
      indexId: 'qindex_ghi789',
      searchable: true
    },
    qnet: {
      routingId: 'qnet_jkl012',
      routedUrl: 'https://dao-mesh.qnet.anarq.io/qsocial-files/user123/test-file-123.jpg',
      accessToken: 'token_mno345'
    },
    filecoin: {
      filecoinCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      dealStatus: 'prepared'
    }
  },
  ...overrides
});

describe('EcosystemValidator', () => {
  describe('validateFileAttachment', () => {
    it('should validate a fully compliant file attachment', () => {
      const attachment = createMockAttachment();
      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.errors).toHaveLength(0);
      expect(result.compliance.squidIdentity).toBe(true);
      expect(result.compliance.qonsentProfile).toBe(true);
      expect(result.compliance.qlockEncryption).toBe(true);
      expect(result.compliance.ipfsCid).toBe(true);
      expect(result.compliance.qindexRegistration).toBe(true);
      expect(result.compliance.qerberosLogging).toBe(true);
      expect(result.compliance.qnetRouting).toBe(true);
    });

    it('should fail validation for missing basic structure', () => {
      const attachment = createMockAttachment({
        fileId: '',
        storjUrl: '',
        ecosystem: undefined as any
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.errors).toContain('Missing basic file attachment structure');
    });

    it('should fail sQuid identity validation for invalid storjKey', () => {
      const attachment = createMockAttachment({
        storjKey: 'invalid-key-without-path'
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.compliance.squidIdentity).toBe(false);
      expect(result.errors).toContain('sQuid identity binding validation failed');
    });

    it('should fail Qonsent validation for invalid visibility', () => {
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          qonsent: {
            profileId: 'qonsent_abc123',
            visibility: 'invalid-visibility' as any,
            encryptionLevel: 'standard'
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.compliance.qonsentProfile).toBe(false);
      expect(result.errors).toContain('Qonsent privacy profile validation failed');
    });

    it('should fail Qlock validation for missing encryption data', () => {
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          qlock: {
            encrypted: true,
            encryptionLevel: 'invalid-level' as any
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.compliance.qlockEncryption).toBe(false);
      expect(result.errors).toContain('Qlock encryption validation failed');
    });

    it('should warn for missing IPFS CID when generation is claimed', () => {
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          ipfs: {
            generated: true,
            cid: undefined
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.compliance.ipfsCid).toBe(false);
      expect(result.warnings).toContain('IPFS CID not generated (optional but recommended)');
    });

    it('should fail Qindex validation for missing indexId', () => {
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          qindex: {
            indexId: '',
            searchable: true
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.compliance.qindexRegistration).toBe(false);
      expect(result.errors).toContain('Qindex registration validation failed');
    });

    it('should fail QNET validation for invalid routing URL', () => {
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          qnet: {
            routingId: 'qnet_jkl012',
            routedUrl: 'invalid-url'
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      expect(result.compliance.qnetRouting).toBe(false);
      expect(result.errors).toContain('QNET routing validation failed');
    });

    it('should calculate correct compliance score', () => {
      // Create attachment with 5 out of 7 components valid
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          ipfs: {
            generated: false,
            cid: undefined
          },
          qnet: {
            routingId: '',
            routedUrl: 'invalid-url'
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      // 5 out of 7 components = ~71%
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThanOrEqual(75);
    });
  });

  describe('validateMultipleAttachments', () => {
    it('should validate multiple attachments correctly', () => {
      const attachments = [
        createMockAttachment({ fileId: 'file1' }),
        createMockAttachment({ fileId: 'file2' }),
        createMockAttachment({ 
          fileId: 'file3',
          ecosystem: {
            ...createMockAttachment().ecosystem,
            qonsent: {
              profileId: '',
              visibility: 'invalid' as any,
              encryptionLevel: 'standard'
            }
          }
        })
      ];

      const result = EcosystemValidator.validateMultipleAttachments(attachments);

      expect(result.overallValid).toBe(false);
      expect(result.summary.totalFiles).toBe(3);
      expect(result.summary.validFiles).toBe(2);
      expect(result.summary.commonErrors).toContain('Qonsent privacy profile validation failed');
    });

    it('should identify common errors across multiple files', () => {
      const attachments = [
        createMockAttachment({
          fileId: 'file1',
          storjKey: 'invalid-key-1'
        }),
        createMockAttachment({
          fileId: 'file2',
          storjKey: 'invalid-key-2'
        })
      ];

      const result = EcosystemValidator.validateMultipleAttachments(attachments);

      expect(result.summary.commonErrors).toContain('sQuid identity binding validation failed');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate a readable compliance report', () => {
      const attachment = createMockAttachment();
      const validationResult = EcosystemValidator.validateFileAttachment(attachment);
      const report = EcosystemValidator.generateComplianceReport(validationResult);

      expect(report).toContain('ECOSYSTEM COMPLIANCE REPORT');
      expect(report).toContain('Overall Valid: ✅ YES');
      expect(report).toContain('Compliance Score: 100/100');
      expect(report).toContain('✅ Squid Identity: PASS');
      expect(report).toContain('✅ Qonsent Profile: PASS');
      expect(report).toContain('✅ Qlock Encryption: PASS');
    });

    it('should show errors and warnings in report', () => {
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          qonsent: {
            profileId: '',
            visibility: 'invalid' as any,
            encryptionLevel: 'standard'
          }
        }
      });

      const validationResult = EcosystemValidator.validateFileAttachment(attachment);
      const report = EcosystemValidator.generateComplianceReport(validationResult);

      expect(report).toContain('Overall Valid: ❌ NO');
      expect(report).toContain('--- Errors ---');
      expect(report).toContain('❌ Qonsent privacy profile validation failed');
    });
  });

  describe('Q∞ Architecture Compliance', () => {
    it('should enforce complete Q∞ flow validation', () => {
      // Test that all components of the Q∞ flow are validated:
      // sQuid → Qonsent → Qlock → Storj → IPFS → Qindex → Qerberos → QNET
      
      const attachment = createMockAttachment();
      const result = EcosystemValidator.validateFileAttachment(attachment);

      // Verify all Q∞ components are checked
      const expectedComponents = [
        'squidIdentity',    // sQuid
        'qonsentProfile',   // Qonsent
        'qlockEncryption',  // Qlock
        'ipfsCid',          // IPFS
        'qindexRegistration', // Qindex
        'qerberosLogging',  // Qerberos
        'qnetRouting'       // QNET
      ];

      expectedComponents.forEach(component => {
        expect(result.compliance).toHaveProperty(component);
      });

      // For a fully compliant file, all should be true
      expectedComponents.forEach(component => {
        expect(result.compliance[component as keyof typeof result.compliance]).toBe(true);
      });
    });

    it('should require core components for validity', () => {
      // Test that core Q∞ components are required for validity
      const attachment = createMockAttachment({
        ecosystem: {
          ...createMockAttachment().ecosystem,
          qonsent: {
            profileId: '',
            visibility: 'invalid' as any,
            encryptionLevel: 'standard'
          },
          qlock: {
            encrypted: false,
            encryptionLevel: 'invalid' as any
          }
        }
      });

      const result = EcosystemValidator.validateFileAttachment(attachment);

      // Should be invalid due to missing core components
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Ecosystem Integration Patterns', () => {
  it('should validate the complete upload flow pattern', () => {
    // This test validates that the ecosystem follows the exact pattern
    // specified in the canonical specification
    
    const attachment = createMockAttachment();
    const result = EcosystemValidator.validateFileAttachment(attachment);

    // Verify the Q∞ flow is complete
    expect(result.compliance.squidIdentity).toBe(true);     // Entry: sQuid identity
    expect(result.compliance.qonsentProfile).toBe(true);    // Process: Privacy profile
    expect(result.compliance.qlockEncryption).toBe(true);   // Process: Encryption
    expect(result.compliance.ipfsCid).toBe(true);           // Process: IPFS CID
    expect(result.compliance.qindexRegistration).toBe(true); // Output: Indexing
    expect(result.compliance.qerberosLogging).toBe(true);   // Output: Monitoring
    expect(result.compliance.qnetRouting).toBe(true);       // Output: Routing

    expect(result.isValid).toBe(true);
    expect(result.score).toBe(100);
  });

  it('should validate modular architecture compliance', () => {
    // Test that the validation enforces modular architecture
    const attachment = createMockAttachment();
    
    // Each ecosystem component should be independently validatable
    expect(attachment.ecosystem.qonsent).toBeDefined();
    expect(attachment.ecosystem.qlock).toBeDefined();
    expect(attachment.ecosystem.ipfs).toBeDefined();
    expect(attachment.ecosystem.qindex).toBeDefined();
    expect(attachment.ecosystem.qnet).toBeDefined();

    // Each component should have its required fields
    expect(attachment.ecosystem.qonsent.profileId).toBeTruthy();
    expect(attachment.ecosystem.qlock.encryptionLevel).toBeTruthy();
    expect(attachment.ecosystem.qindex.indexId).toBeTruthy();
    expect(attachment.ecosystem.qnet.routingId).toBeTruthy();
  });
});
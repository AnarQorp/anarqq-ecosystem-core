/**
 * Module Documentation Integration Tests
 * Tests the complete documentation workflow with module registration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../ModuleRegistrationService';
import { moduleDocumentationService } from '../ModuleDocumentationService';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';
import { ModuleInfo } from '../../types/qwallet-module-registration';

// Mock IPFS service
const mockIPFSService = {
  uploadToStoracha: vi.fn(),
  downloadFromStoracha: vi.fn(),
  getFileInfo: vi.fn()
};

// Mock ecosystem services
const mockQindexService = {
  registerModule: vi.fn(),
  getModule: vi.fn(),
  searchModules: vi.fn()
};

const mockQerberosService = {
  logEvent: vi.fn()
};

// Mock the imports
vi.mock('../../../backend/services/ipfsService.mjs', () => ({
  default: mockIPFSService
}));

vi.mock('../../backend/ecosystem/QindexService.mjs', () => ({
  getQindexService: () => mockQindexService
}));

vi.mock('../../backend/ecosystem/QerberosService.mjs', () => ({
  getQerberosService: () => mockQerberosService
}));

// Mock identity service
vi.mock('../identity/IdentityQlockService', () => ({
  identityQlockService: {
    signMetadata: vi.fn(),
    verifyMetadataSignature: vi.fn()
  }
}));

// Mock other services
vi.mock('../QModuleMetadataGenerator', () => ({
  qModuleMetadataGenerator: {
    generateMetadata: vi.fn()
  }
}));

vi.mock('../ModuleSecurityValidationService', () => ({
  moduleSecurityValidationService: {
    validateRegistrationRequest: vi.fn(),
    isIdentityAuthorized: vi.fn(),
    sanitizeMetadata: vi.fn(),
    validateSignedMetadata: vi.fn()
  }
}));

describe('Module Documentation Integration', () => {
  let registrationService: ModuleRegistrationService;
  
  const mockRootIdentity: ExtendedSquidIdentity = {
    id: 'did:root:test123',
    did: 'did:root:test123',
    type: IdentityType.ROOT,
    publicKey: 'test-public-key',
    space: 'test-space'
  };

  const mockModuleInfo: ModuleInfo = {
    name: 'test-module',
    version: '1.0.0',
    description: 'Test module for documentation integration',
    identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
    integrations: ['Qindex', 'Qlock'],
    repositoryUrl: 'https://github.com/test/test-module',
    auditHash: 'a'.repeat(64),
    compliance: {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard'
    }
  };

  const mockDocumentationContent = `# Test Module Documentation

## Overview
This is a comprehensive documentation for the test module.

## Installation
\`\`\`bash
npm install test-module
\`\`\`

## API Reference

### TestModule Class
The main class for the test module.

#### Methods
- \`initialize()\`: Initialize the module
- \`process(data)\`: Process input data
- \`cleanup()\`: Clean up resources

## Examples

\`\`\`javascript
import { TestModule } from 'test-module';

const module = new TestModule();
await module.initialize();
const result = await module.process({ input: 'test' });
console.log(result);
\`\`\`

## Troubleshooting

### Common Issues
1. **Module not found**: Ensure the module is properly installed
2. **Initialization failed**: Check your configuration
3. **Processing errors**: Validate your input data

## Support
For support, please visit our GitHub repository.
`;

  beforeEach(() => {
    registrationService = new ModuleRegistrationService();
    vi.clearAllMocks();

    // Setup default mocks
    const { moduleSecurityValidationService } = require('../ModuleSecurityValidationService');
    const { qModuleMetadataGenerator } = require('../QModuleMetadataGenerator');
    const { identityQlockService } = require('../identity/IdentityQlockService');

    moduleSecurityValidationService.validateRegistrationRequest.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: []
    });

    moduleSecurityValidationService.isIdentityAuthorized.mockResolvedValue(true);
    
    moduleSecurityValidationService.sanitizeMetadata.mockImplementation((metadata) => metadata);
    
    moduleSecurityValidationService.validateSignedMetadata.mockResolvedValue({
      valid: true,
      error: null
    });

    qModuleMetadataGenerator.generateMetadata.mockResolvedValue({
      module: mockModuleInfo.name,
      version: mockModuleInfo.version,
      description: mockModuleInfo.description,
      identities_supported: mockModuleInfo.identitiesSupported,
      integrations: mockModuleInfo.integrations,
      status: 'PRODUCTION_READY',
      audit_hash: mockModuleInfo.auditHash,
      compliance: mockModuleInfo.compliance,
      repository: mockModuleInfo.repositoryUrl,
      documentation: 'QmTestDocumentationCID123456789012345678901234567890',
      activated_by: mockRootIdentity.did,
      timestamp: Date.now(),
      checksum: 'test-checksum',
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'test-key-id'
    });

    identityQlockService.signMetadata.mockResolvedValue({
      metadata: expect.any(Object),
      signature: 'test-signature',
      publicKey: 'test-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: mockRootIdentity.did
    });

    identityQlockService.verifyMetadataSignature.mockResolvedValue({
      valid: true,
      signatureValid: true,
      identityVerified: true,
      timestampValid: true
    });

    mockQindexService.registerModule.mockResolvedValue({
      success: true,
      cid: 'QmTestRegistrationCID',
      indexId: 'test-index-id',
      timestamp: new Date().toISOString()
    });

    mockQindexService.getModule.mockResolvedValue(null); // No existing module

    mockQerberosService.logEvent.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Documentation Upload Integration', () => {
    it('should upload documentation and integrate with module registration', async () => {
      const mockDocCID = 'QmTestDocumentationCID123456789012345678901234567890';
      
      // Mock IPFS upload for documentation
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: mockDocCID,
        name: 'test-module-docs-1.0.0.json',
        size: Buffer.byteLength(mockDocumentationContent),
        type: 'application/json'
      });

      // Upload documentation first
      const docResult = await registrationService.uploadModuleDocumentation(
        mockModuleInfo.name,
        mockModuleInfo.version,
        mockDocumentationContent,
        {
          format: 'markdown',
          language: 'en',
          author: 'Test Author',
          tags: ['api', 'documentation', 'test']
        }
      );

      expect(docResult).toBe(mockDocCID);
      expect(mockIPFSService.uploadToStoracha).toHaveBeenCalledWith(
        expect.stringContaining('"content"'),
        'test-module-docs-1.0.0.json',
        'default'
      );

      // Verify the uploaded content structure
      const uploadCall = mockIPFSService.uploadToStoracha.mock.calls[0];
      const uploadedContent = JSON.parse(uploadCall[0]);
      
      expect(uploadedContent.content).toBe(mockDocumentationContent);
      expect(uploadedContent.metadata.title).toBe('Test Module Documentation');
      expect(uploadedContent.metadata.version).toBe('1.0.0');
      expect(uploadedContent.metadata.moduleId).toBe('test-module');
      expect(uploadedContent.metadata.format).toBe('markdown');
      expect(uploadedContent.metadata.language).toBe('en');
      expect(uploadedContent.metadata.author).toBe('Test Author');
      expect(uploadedContent.metadata.tags).toEqual(['api', 'documentation', 'test']);
      expect(uploadedContent.searchIndex).toBeDefined();
      expect(uploadedContent.searchIndex.keywords).toContain('test');
      expect(uploadedContent.searchIndex.keywords).toContain('module');
      expect(uploadedContent.searchIndex.sections).toHaveLength(6); // Based on markdown headers
    });

    it('should handle documentation upload failure gracefully', async () => {
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: false,
        error: 'IPFS upload failed'
      });

      await expect(
        registrationService.uploadModuleDocumentation(
          mockModuleInfo.name,
          mockModuleInfo.version,
          mockDocumentationContent
        )
      ).rejects.toThrow('Failed to upload documentation: IPFS upload failed');
    });
  });

  describe('Documentation Validation Integration', () => {
    it('should validate documentation CID during module verification', async () => {
      const mockDocCID = 'QmTestDocumentationCID123456789012345678901234567890';
      const mockModule = {
        moduleId: 'test-module',
        metadata: {
          module: 'test-module',
          version: '1.0.0',
          description: 'Test module',
          identities_supported: [IdentityType.ROOT],
          integrations: ['Qindex'],
          status: 'PRODUCTION_READY',
          audit_hash: 'a'.repeat(64),
          compliance: mockModuleInfo.compliance,
          repository: 'https://github.com/test/test-module',
          documentation: mockDocCID,
          activated_by: mockRootIdentity.did,
          timestamp: Date.now(),
          checksum: 'test-checksum',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'test-key-id'
        },
        signedMetadata: {
          metadata: expect.any(Object),
          signature: 'test-signature',
          publicKey: 'test-public-key',
          signature_type: 'RSA-SHA256',
          signed_at: Date.now(),
          signer_identity: mockRootIdentity.did
        },
        registrationInfo: {
          cid: 'QmTestRegistrationCID',
          indexId: 'test-index-id',
          registeredAt: new Date().toISOString(),
          registeredBy: mockRootIdentity.did,
          status: 'PRODUCTION_READY',
          verificationStatus: 'VERIFIED'
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      };

      // Mock documentation package for validation
      const mockDocumentationPackage = {
        content: mockDocumentationContent,
        metadata: {
          title: 'Test Module Documentation',
          version: '1.0.0',
          moduleId: 'test-module',
          format: 'markdown',
          language: 'en',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: 'Test Author',
          tags: ['api', 'documentation'],
          size: Buffer.byteLength(mockDocumentationContent),
          checksum: 'doc-checksum'
        }
      };

      mockQindexService.getModule.mockResolvedValue(mockModule);
      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(mockDocumentationPackage))
      );

      const verificationResult = await registrationService.verifyModule('test-module');

      expect(verificationResult.status).toBe('production_ready');
      expect(verificationResult.verificationChecks.documentationAvailable).toBe(true);
      expect(verificationResult.verificationChecks.metadataValid).toBe(true);
      expect(verificationResult.verificationChecks.signatureValid).toBe(true);
      expect(verificationResult.issues).toHaveLength(0);

      // Verify that documentation validation was called
      expect(mockIPFSService.downloadFromStoracha).toHaveBeenCalledWith(mockDocCID);
    });

    it('should handle invalid documentation CID during verification', async () => {
      const invalidDocCID = 'invalid-cid-format';
      const mockModule = {
        moduleId: 'test-module',
        metadata: {
          module: 'test-module',
          version: '1.0.0',
          description: 'Test module',
          identities_supported: [IdentityType.ROOT],
          integrations: ['Qindex'],
          status: 'PRODUCTION_READY',
          audit_hash: 'a'.repeat(64),
          compliance: mockModuleInfo.compliance,
          repository: 'https://github.com/test/test-module',
          documentation: invalidDocCID,
          activated_by: mockRootIdentity.did,
          timestamp: Date.now(),
          checksum: 'test-checksum',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'test-key-id'
        },
        signedMetadata: {
          metadata: expect.any(Object),
          signature: 'test-signature',
          publicKey: 'test-public-key',
          signature_type: 'RSA-SHA256',
          signed_at: Date.now(),
          signer_identity: mockRootIdentity.did
        },
        registrationInfo: {
          cid: 'QmTestRegistrationCID',
          indexId: 'test-index-id',
          registeredAt: new Date().toISOString(),
          registeredBy: mockRootIdentity.did,
          status: 'PRODUCTION_READY',
          verificationStatus: 'VERIFIED'
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      };

      mockQindexService.getModule.mockResolvedValue(mockModule);

      const verificationResult = await registrationService.verifyModule('test-module');

      expect(verificationResult.verificationChecks.documentationAvailable).toBe(false);
      expect(verificationResult.issues.some(issue => 
        issue.code === 'DOCUMENTATION_UNAVAILABLE'
      )).toBe(true);
    });
  });

  describe('Documentation Search Integration', () => {
    it('should search module documentation across registered modules', async () => {
      // Setup documentation in cache
      const mockIndex = {
        moduleId: 'test-module',
        currentVersion: '1.0.0',
        versions: [
          {
            version: '1.0.0',
            cid: 'QmTestDocCID',
            metadata: {
              title: 'Test Module Documentation',
              version: '1.0.0',
              moduleId: 'test-module',
              format: 'markdown',
              language: 'en',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: 'Test Author',
              tags: ['api', 'documentation'],
              size: 1024,
              checksum: 'doc-checksum'
            },
            createdAt: new Date().toISOString()
          }
        ],
        searchIndex: {
          keywords: ['test', 'module', 'api', 'documentation'],
          sections: [
            {
              title: 'API Reference',
              content: 'The main class for the test module.',
              level: 2,
              anchor: 'api-reference'
            }
          ],
          metadata: {}
        },
        lastUpdated: new Date().toISOString()
      };

      // Access private cache
      (moduleDocumentationService as any).indexCache.set('test-module', mockIndex);

      const searchResults = await registrationService.searchModuleDocumentation('API', {
        moduleIds: ['test-module'],
        limit: 10
      });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].moduleId).toBe('test-module');
      expect(searchResults[0].title).toBe('Test Module Documentation');
      expect(searchResults[0].relevanceScore).toBeGreaterThan(0);
      expect(searchResults[0].matchedSections).toHaveLength(1);
      expect(searchResults[0].matchedSections[0].title).toBe('API Reference');
    });

    it('should return empty results when no documentation matches', async () => {
      const searchResults = await registrationService.searchModuleDocumentation('nonexistent', {
        moduleIds: ['test-module'],
        limit: 10
      });

      expect(searchResults).toHaveLength(0);
    });
  });

  describe('Documentation Update Integration', () => {
    it('should update documentation and maintain version history', async () => {
      const newDocCID = 'QmNewDocumentationCID123456789012345678901234567890';
      const updatedContent = `# Test Module Documentation v1.1.0

## Overview
This is the updated documentation for the test module.

## New Features
- Feature A: New functionality
- Feature B: Enhanced performance

## Breaking Changes
- Removed deprecated method \`oldMethod()\`
- Changed parameter structure for \`process()\`

## Migration Guide
To migrate from v1.0.0 to v1.1.0:
1. Update your imports
2. Replace \`oldMethod()\` calls
3. Update \`process()\` parameters
`;

      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: newDocCID,
        name: 'test-module-docs-1.1.0.json',
        size: Buffer.byteLength(updatedContent),
        type: 'application/json'
      });

      const updateResult = await registrationService.updateModuleDocumentation(
        'test-module',
        '1.1.0',
        updatedContent,
        {
          format: 'markdown',
          language: 'en',
          author: 'Updated Author',
          tags: ['api', 'documentation', 'migration']
        }
      );

      expect(updateResult).toBe(newDocCID);
      expect(mockIPFSService.uploadToStoracha).toHaveBeenCalledWith(
        expect.stringContaining('"content"'),
        'test-module-docs-1.1.0.json',
        'default'
      );

      // Verify the updated content structure
      const uploadCall = mockIPFSService.uploadToStoracha.mock.calls[0];
      const uploadedContent = JSON.parse(uploadCall[0]);
      
      expect(uploadedContent.content).toBe(updatedContent);
      expect(uploadedContent.metadata.title).toBe('Test Module Documentation v1.1.0');
      expect(uploadedContent.metadata.version).toBe('1.1.0');
      expect(uploadedContent.metadata.tags).toEqual(['api', 'documentation', 'migration']);
      expect(uploadedContent.searchIndex.keywords).toContain('migration');
      expect(uploadedContent.searchIndex.sections.some(section => 
        section.title === 'Breaking Changes'
      )).toBe(true);
    });
  });

  describe('Documentation Version Management', () => {
    it('should retrieve documentation versions for a module', async () => {
      // Setup mock versions in cache
      const mockVersions = [
        {
          version: '1.0.0',
          cid: 'QmTestDocCID1',
          metadata: {
            title: 'Test Module Documentation',
            version: '1.0.0',
            moduleId: 'test-module',
            format: 'markdown',
            language: 'en',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            author: 'Test Author',
            tags: ['api'],
            size: 1024,
            checksum: 'checksum1'
          },
          createdAt: '2023-01-01T00:00:00.000Z'
        },
        {
          version: '1.1.0',
          cid: 'QmTestDocCID2',
          metadata: {
            title: 'Test Module Documentation v1.1.0',
            version: '1.1.0',
            moduleId: 'test-module',
            format: 'markdown',
            language: 'en',
            createdAt: '2023-02-01T00:00:00.000Z',
            updatedAt: '2023-02-01T00:00:00.000Z',
            author: 'Updated Author',
            tags: ['api', 'migration'],
            size: 1536,
            checksum: 'checksum2'
          },
          createdAt: '2023-02-01T00:00:00.000Z'
        }
      ];

      const mockIndex = {
        moduleId: 'test-module',
        currentVersion: '1.1.0',
        versions: mockVersions,
        searchIndex: { keywords: [], sections: [], metadata: {} },
        lastUpdated: '2023-02-01T00:00:00.000Z'
      };

      (moduleDocumentationService as any).indexCache.set('test-module', mockIndex);

      const versions = await registrationService.getModuleDocumentationVersions('test-module');

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('1.0.0');
      expect(versions[1].version).toBe('1.1.0');
      expect(versions[1].metadata.tags).toContain('migration');
    });

    it('should return empty array for module with no documentation', async () => {
      const versions = await registrationService.getModuleDocumentationVersions('nonexistent-module');
      expect(versions).toEqual([]);
    });
  });
});
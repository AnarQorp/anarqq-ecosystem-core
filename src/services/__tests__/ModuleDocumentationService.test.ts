/**
 * Module Documentation Service Tests
 * Tests for IPFS integration, documentation validation, and search functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ModuleDocumentationService,
  DocumentationUploadOptions,
  DocumentationRetrievalOptions,
  DocumentationValidationResult
} from '../ModuleDocumentationService';

// Mock the IPFS service import
vi.mock('../../../backend/services/ipfsService.mjs', () => ({
  default: {
    uploadToStoracha: vi.fn(),
    downloadFromStoracha: vi.fn(),
    getFileInfo: vi.fn()
  }
}));

describe('ModuleDocumentationService', () => {
  let service: ModuleDocumentationService;
  let mockIPFSService: any;

  const mockDocumentationContent = `# Test Module Documentation

This is a test documentation for the module.

## Features

- Feature 1: Basic functionality
- Feature 2: Advanced features

## Installation

\`\`\`bash
npm install test-module
\`\`\`

## Usage

\`\`\`javascript
import { TestModule } from 'test-module';
const module = new TestModule();
\`\`\`
`;

  const mockUploadOptions: DocumentationUploadOptions = {
    moduleId: 'test-module',
    version: '1.0.0',
    format: 'markdown',
    language: 'en',
    author: 'Test Author',
    tags: ['test', 'documentation'],
    generateSearchIndex: true
  };

  beforeEach(async () => {
    service = new ModuleDocumentationService();
    
    // Get the mocked IPFS service
    const ipfsModule = await import('../../../backend/services/ipfsService.mjs');
    mockIPFSService = ipfsModule.default;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('uploadDocumentation', () => {
    it('should upload documentation successfully', async () => {
      const mockCID = 'QmTestDocumentationCID123456789012345678901234567890';
      
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: mockCID,
        name: 'test-module-docs-1.0.0.json',
        size: 1024,
        type: 'application/json',
        url: `https://${mockCID}.ipfs.w3s.link/test-module-docs-1.0.0.json`
      });

      const result = await service.uploadDocumentation(mockDocumentationContent, mockUploadOptions);

      expect(result.cid).toBe(mockCID);
      expect(result.metadata.title).toBe('Test Module Documentation');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.moduleId).toBe('test-module');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.metadata.tags).toEqual(['test', 'documentation']);
      expect(result.metadata.size).toBeGreaterThan(0);
      expect(result.metadata.checksum).toBeDefined();

      expect(mockIPFSService.uploadToStoracha).toHaveBeenCalledWith(
        expect.stringContaining('"content"'),
        'test-module-docs-1.0.0.json',
        'default'
      );
    });

    it('should handle upload failure', async () => {
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: false,
        error: 'Upload failed'
      });

      await expect(
        service.uploadDocumentation(mockDocumentationContent, mockUploadOptions)
      ).rejects.toThrow('Failed to upload documentation: Upload failed');
    });

    it('should generate search index when requested', async () => {
      const mockCID = 'QmTestDocumentationCID123456789012345678901234567890';
      
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: mockCID
      });

      const result = await service.uploadDocumentation(mockDocumentationContent, {
        ...mockUploadOptions,
        generateSearchIndex: true
      });

      expect(result.metadata).toBeDefined();
      
      // Verify that the uploaded content includes search index
      const uploadCall = mockIPFSService.uploadToStoracha.mock.calls[0];
      const uploadedContent = JSON.parse(uploadCall[0]);
      expect(uploadedContent.searchIndex).toBeDefined();
      expect(uploadedContent.searchIndex.keywords).toBeInstanceOf(Array);
      expect(uploadedContent.searchIndex.sections).toBeInstanceOf(Array);
    });

    it('should extract title from markdown content', async () => {
      const mockCID = 'QmTestDocumentationCID123456789012345678901234567890';
      
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: mockCID
      });

      const result = await service.uploadDocumentation(mockDocumentationContent, mockUploadOptions);

      expect(result.metadata.title).toBe('Test Module Documentation');
    });

    it('should handle different content formats', async () => {
      const mockCID = 'QmTestDocumentationCID123456789012345678901234567890';
      
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: mockCID
      });

      const htmlContent = '<html><head><title>HTML Documentation</title></head><body><h1>Test</h1></body></html>';
      
      const result = await service.uploadDocumentation(htmlContent, {
        ...mockUploadOptions,
        format: 'html'
      });

      expect(result.metadata.title).toBe('HTML Documentation');
      expect(result.metadata.format).toBe('html');
    });
  });

  describe('retrieveDocumentation', () => {
    const mockCID = 'QmTestDocumentationCID123456789012345678901234567890';
    const mockDocumentationPackage = {
      content: mockDocumentationContent,
      metadata: {
        title: 'Test Module Documentation',
        version: '1.0.0',
        moduleId: 'test-module',
        format: 'markdown',
        language: 'en',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        author: 'Test Author',
        tags: ['test', 'documentation'],
        size: 1024,
        checksum: 'abc123'
      },
      searchIndex: {
        keywords: ['test', 'module', 'documentation'],
        sections: [
          {
            title: 'Test Module Documentation',
            content: 'This is a test documentation for the module.',
            level: 1,
            anchor: 'test-module-documentation'
          }
        ],
        metadata: {}
      }
    };

    it('should retrieve documentation successfully', async () => {
      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(mockDocumentationPackage))
      );

      const result = await service.retrieveDocumentation(mockCID);

      expect(result.content).toBe(mockDocumentationContent);
      expect(result.metadata.title).toBe('Test Module Documentation');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.searchIndex).toBeUndefined(); // Not included by default

      expect(mockIPFSService.downloadFromStoracha).toHaveBeenCalledWith(mockCID);
    });

    it('should retrieve documentation with search index when requested', async () => {
      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(mockDocumentationPackage))
      );

      const result = await service.retrieveDocumentation(mockCID, {
        includeSearchIndex: true
      });

      expect(result.searchIndex).toBeDefined();
      expect(result.searchIndex.keywords).toEqual(['test', 'module', 'documentation']);
      expect(result.searchIndex.sections).toHaveLength(1);
    });

    it('should return metadata only when requested', async () => {
      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(mockDocumentationPackage))
      );

      const result = await service.retrieveDocumentation(mockCID, {
        format: 'metadata-only'
      });

      expect(result.content).toBe('');
      expect(result.metadata).toBeDefined();
    });

    it('should parse markdown to HTML when requested', async () => {
      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(mockDocumentationPackage))
      );

      const result = await service.retrieveDocumentation(mockCID, {
        format: 'parsed'
      });

      expect(result.content).toContain('<h1>');
      expect(result.content).toContain('<h2>');
      expect(result.content).toContain('<strong>');
    });

    it('should handle retrieval errors', async () => {
      mockIPFSService.downloadFromStoracha.mockRejectedValue(new Error('Download failed'));

      await expect(
        service.retrieveDocumentation(mockCID)
      ).rejects.toThrow('Failed to retrieve documentation: Download failed');
    });

    it('should handle invalid documentation package', async () => {
      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify({ invalid: 'package' }))
      );

      await expect(
        service.retrieveDocumentation(mockCID)
      ).rejects.toThrow('Invalid documentation package: missing metadata');
    });
  });

  describe('validateDocumentationCID', () => {
    const validCID = 'QmTestDocumentationCID123456789012345678901234567890';
    const invalidCID = 'invalid-cid';

    it('should validate valid CID successfully', async () => {
      const mockDocumentationPackage = {
        metadata: {
          title: 'Test Documentation',
          version: '1.0.0',
          moduleId: 'test-module',
          format: 'markdown',
          language: 'en',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          author: 'Test Author',
          tags: [],
          size: 1024,
          checksum: 'abc123'
        }
      };

      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(mockDocumentationPackage))
      );

      const result = await service.validateDocumentationCID(validCID);

      expect(result.valid).toBe(true);
      expect(result.available).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid CID format', async () => {
      const result = await service.validateDocumentationCID(invalidCID);

      expect(result.valid).toBe(false);
      expect(result.available).toBe(false);
      expect(result.errors).toContain('Invalid IPFS CID format');
    });

    it('should handle unavailable documentation', async () => {
      mockIPFSService.downloadFromStoracha.mockRejectedValue(new Error('Not found'));

      const result = await service.validateDocumentationCID(validCID);

      expect(result.valid).toBe(false);
      expect(result.available).toBe(false);
      expect(result.errors).toContain('Documentation not available: Not found');
    });

    it('should generate warnings for incomplete metadata', async () => {
      const incompletePackage = {
        metadata: {
          version: '1.0.0',
          moduleId: 'test-module',
          format: 'markdown',
          language: 'en',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          author: 'Test Author',
          tags: [],
          size: 0, // Empty documentation
          checksum: 'abc123'
          // Missing title
        }
      };

      mockIPFSService.downloadFromStoracha.mockResolvedValue(
        Buffer.from(JSON.stringify(incompletePackage))
      );

      const result = await service.validateDocumentationCID(validCID);

      expect(result.valid).toBe(true);
      expect(result.available).toBe(true);
      expect(result.warnings).toContain('Documentation title is missing');
      expect(result.warnings).toContain('Documentation appears to be empty');
    });
  });

  describe('searchDocumentation', () => {
    beforeEach(() => {
      // Set up mock documentation index in cache
      const mockIndex = {
        moduleId: 'test-module',
        currentVersion: '1.0.0',
        versions: [
          {
            version: '1.0.0',
            cid: 'QmTestCID1',
            metadata: {
              title: 'Test Module Documentation',
              version: '1.0.0',
              moduleId: 'test-module',
              format: 'markdown',
              language: 'en',
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
              author: 'Test Author',
              tags: ['test', 'api'],
              size: 1024,
              checksum: 'abc123'
            },
            createdAt: '2023-01-01T00:00:00.000Z'
          }
        ],
        searchIndex: {
          keywords: ['test', 'module', 'api'],
          sections: [],
          metadata: {}
        },
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      // Access private cache through service instance
      (service as any).indexCache.set('test-module', mockIndex);
    });

    it('should search documentation successfully', async () => {
      const results = await service.searchDocumentation('test', {
        moduleIds: ['test-module'],
        limit: 10
      });

      expect(results).toHaveLength(1);
      expect(results[0].moduleId).toBe('test-module');
      expect(results[0].title).toBe('Test Module Documentation');
      expect(results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should return empty results for no matches', async () => {
      const results = await service.searchDocumentation('nonexistent', {
        moduleIds: ['test-module'],
        limit: 10
      });

      expect(results).toHaveLength(0);
    });

    it('should filter by tags', async () => {
      const results = await service.searchDocumentation('test', {
        moduleIds: ['test-module'],
        tags: ['api'],
        limit: 10
      });

      expect(results).toHaveLength(1);
      expect(results[0].moduleId).toBe('test-module');
    });

    it('should filter by language', async () => {
      const results = await service.searchDocumentation('test', {
        moduleIds: ['test-module'],
        language: 'en',
        limit: 10
      });

      expect(results).toHaveLength(1);

      const noResults = await service.searchDocumentation('test', {
        moduleIds: ['test-module'],
        language: 'fr',
        limit: 10
      });

      expect(noResults).toHaveLength(0);
    });

    it('should limit results', async () => {
      const results = await service.searchDocumentation('test', {
        moduleIds: ['test-module'],
        limit: 0
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('updateDocumentation', () => {
    it('should update documentation successfully', async () => {
      const mockCID = 'QmNewDocumentationCID123456789012345678901234567890';
      
      mockIPFSService.uploadToStoracha.mockResolvedValue({
        success: true,
        cid: mockCID
      });

      const newContent = '# Updated Documentation\n\nThis is updated content.';
      
      const result = await service.updateDocumentation(
        'test-module',
        '1.1.0',
        newContent,
        {
          format: 'markdown',
          language: 'en',
          author: 'Updated Author',
          tags: ['updated', 'documentation']
        }
      );

      expect(result.cid).toBe(mockCID);
      expect(result.metadata.version).toBe('1.1.0');
      expect(result.metadata.title).toBe('Updated Documentation');
    });
  });

  describe('getDocumentationVersions', () => {
    it('should return empty array when no versions exist', async () => {
      const versions = await service.getDocumentationVersions('nonexistent-module');
      expect(versions).toEqual([]);
    });

    it('should return versions from cache', async () => {
      const mockVersions = [
        {
          version: '1.0.0',
          cid: 'QmTestCID1',
          metadata: {
            title: 'Test Documentation',
            version: '1.0.0',
            moduleId: 'test-module',
            format: 'markdown',
            language: 'en',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            author: 'Test Author',
            tags: [],
            size: 1024,
            checksum: 'abc123'
          },
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      const mockIndex = {
        moduleId: 'test-module',
        currentVersion: '1.0.0',
        versions: mockVersions,
        searchIndex: { keywords: [], sections: [], metadata: {} },
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      (service as any).indexCache.set('test-module', mockIndex);

      const versions = await service.getDocumentationVersions('test-module');
      expect(versions).toEqual(mockVersions);
    });
  });

  describe('getCurrentDocumentationCID', () => {
    it('should return null when no documentation exists', async () => {
      const cid = await service.getCurrentDocumentationCID('nonexistent-module');
      expect(cid).toBeNull();
    });

    it('should return current CID from cache', async () => {
      const mockIndex = {
        moduleId: 'test-module',
        currentVersion: '1.0.0',
        versions: [
          {
            version: '1.0.0',
            cid: 'QmCurrentCID',
            metadata: {} as any,
            createdAt: '2023-01-01T00:00:00.000Z'
          }
        ],
        searchIndex: { keywords: [], sections: [], metadata: {} },
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      (service as any).indexCache.set('test-module', mockIndex);

      const cid = await service.getCurrentDocumentationCID('test-module');
      expect(cid).toBe('QmCurrentCID');
    });
  });

  describe('deprecateDocumentationVersion', () => {
    it('should deprecate version successfully', async () => {
      const mockIndex = {
        moduleId: 'test-module',
        currentVersion: '1.0.0',
        versions: [
          {
            version: '1.0.0',
            cid: 'QmTestCID',
            metadata: {} as any,
            createdAt: '2023-01-01T00:00:00.000Z',
            deprecated: false
          }
        ],
        searchIndex: { keywords: [], sections: [], metadata: {} },
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      (service as any).indexCache.set('test-module', mockIndex);

      const result = await service.deprecateDocumentationVersion('test-module', '1.0.0');
      expect(result).toBe(true);

      const updatedIndex = (service as any).indexCache.get('test-module');
      expect(updatedIndex.versions[0].deprecated).toBe(true);
    });

    it('should return false when version not found', async () => {
      const result = await service.deprecateDocumentationVersion('test-module', '2.0.0');
      expect(result).toBe(false);
    });
  });
});
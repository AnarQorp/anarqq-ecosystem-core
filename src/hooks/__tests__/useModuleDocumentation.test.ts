/**
 * Tests for useModuleDocumentation React Hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useModuleDocumentation } from '../useModuleDocumentation';

// Mock the ModuleDocumentationService
vi.mock('../../services/ModuleDocumentationService', () => ({
  moduleDocumentationService: {
    getDocumentationVersions: vi.fn(),
    validateDocumentationCID: vi.fn(),
    retrieveDocumentation: vi.fn(),
    uploadDocumentation: vi.fn(),
    updateDocumentation: vi.fn(),
    searchDocumentation: vi.fn(),
    deprecateDocumentationVersion: vi.fn()
  }
}));

describe('useModuleDocumentation', () => {
  let mockService: any;

  const mockVersions = [
    {
      version: '1.0.0',
      cid: 'QmTestCID1',
      metadata: {
        title: 'Test Documentation v1.0.0',
        version: '1.0.0',
        moduleId: 'test-module',
        format: 'markdown',
        language: 'en',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        author: 'Test Author',
        tags: ['test', 'v1'],
        size: 1024,
        checksum: 'abc123'
      },
      createdAt: '2023-01-01T00:00:00.000Z',
      deprecated: false
    },
    {
      version: '0.9.0',
      cid: 'QmTestCID2',
      metadata: {
        title: 'Test Documentation v0.9.0',
        version: '0.9.0',
        moduleId: 'test-module',
        format: 'markdown',
        language: 'en',
        createdAt: '2022-12-01T00:00:00.000Z',
        updatedAt: '2022-12-01T00:00:00.000Z',
        author: 'Test Author',
        tags: ['test', 'beta'],
        size: 512,
        checksum: 'def456'
      },
      createdAt: '2022-12-01T00:00:00.000Z',
      deprecated: true
    }
  ];

  const mockDocumentation = {
    content: '# Test Documentation\n\nThis is test content.',
    metadata: mockVersions[0].metadata,
    searchIndex: {
      keywords: ['test', 'documentation'],
      sections: [
        {
          title: 'Test Documentation',
          content: 'This is test content.',
          level: 1,
          anchor: 'test-documentation'
        }
      ],
      metadata: {}
    }
  };

  beforeEach(async () => {
    const serviceModule = await import('../../services/ModuleDocumentationService');
    mockService = serviceModule.moduleDocumentationService;
    
    vi.clearAllMocks();
    
    // Default mock implementations
    mockService.getDocumentationVersions.mockResolvedValue(mockVersions);
    mockService.validateDocumentationCID.mockResolvedValue({
      valid: true,
      available: true,
      metadata: mockVersions[0].metadata,
      errors: [],
      warnings: []
    });
    mockService.retrieveDocumentation.mockResolvedValue(mockDocumentation);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      expect(result.current.documentation).toBeNull();
      expect(result.current.versions).toEqual([]);
      expect(result.current.currentVersion).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasDocumentation).toBe(false);
    });

    it('should auto-load versions when autoLoad is true', async () => {
      renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(mockService.getDocumentationVersions).toHaveBeenCalledWith('test-module');
      });
    });

    it('should set initial version when provided', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          version: '1.0.0',
          autoLoad: true
        })
      );

      await waitFor(() => {
        expect(result.current.currentVersion).toBe('1.0.0');
      });
    });
  });

  describe('version management', () => {
    it('should load documentation versions', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      await act(async () => {
        await result.current.refreshVersions();
      });

      expect(result.current.versions).toEqual(mockVersions);
      expect(result.current.currentVersion).toBe('1.0.0'); // Should select first non-deprecated
    });

    it('should switch to different version', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      // Load versions first
      await act(async () => {
        await result.current.refreshVersions();
      });

      // Switch version
      await act(async () => {
        await result.current.switchVersion('0.9.0');
      });

      expect(result.current.currentVersion).toBe('0.9.0');
      expect(mockService.validateDocumentationCID).toHaveBeenCalledWith('QmTestCID2');
      expect(mockService.retrieveDocumentation).toHaveBeenCalledWith('QmTestCID2', {
        format: 'parsed',
        includeSearchIndex: true
      });
    });

    it('should handle version switch errors', async () => {
      mockService.validateDocumentationCID.mockResolvedValue({
        valid: false,
        available: false,
        errors: ['Documentation not found'],
        warnings: []
      });

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      await act(async () => {
        await result.current.refreshVersions();
      });

      await act(async () => {
        await result.current.switchVersion('1.0.0');
      });

      expect(result.current.error).toContain('Documentation not available');
    });
  });

  describe('documentation operations', () => {
    it('should upload new documentation', async () => {
      const mockUploadResult = {
        cid: 'QmNewCID',
        metadata: {
          ...mockVersions[0].metadata,
          version: '1.1.0'
        }
      };

      mockService.uploadDocumentation.mockResolvedValue(mockUploadResult);

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadDocumentation('# New Documentation', {
          version: '1.1.0',
          format: 'markdown',
          language: 'en',
          author: 'Test Author',
          tags: ['new'],
          generateSearchIndex: true
        });
      });

      expect(mockService.uploadDocumentation).toHaveBeenCalledWith('# New Documentation', {
        moduleId: 'test-module',
        version: '1.1.0',
        format: 'markdown',
        language: 'en',
        author: 'Test Author',
        tags: ['new'],
        generateSearchIndex: true
      });

      expect(uploadResult).toEqual(mockUploadResult);
      expect(mockService.getDocumentationVersions).toHaveBeenCalledTimes(1); // refreshVersions called
    });

    it('should update documentation', async () => {
      const mockUpdateResult = {
        cid: 'QmUpdatedCID',
        metadata: {
          ...mockVersions[0].metadata,
          version: '1.2.0'
        }
      };

      mockService.updateDocumentation.mockResolvedValue(mockUpdateResult);

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateDocumentation(
          '1.2.0',
          '# Updated Documentation',
          {
            format: 'markdown',
            language: 'en',
            author: 'Updated Author',
            tags: ['updated'],
            generateSearchIndex: true
          }
        );
      });

      expect(mockService.updateDocumentation).toHaveBeenCalledWith(
        'test-module',
        '1.2.0',
        '# Updated Documentation',
        {
          format: 'markdown',
          language: 'en',
          author: 'Updated Author',
          tags: ['updated'],
          generateSearchIndex: true
        }
      );

      expect(updateResult).toEqual(mockUpdateResult);
      expect(result.current.currentVersion).toBe('1.2.0');
    });

    it('should deprecate version', async () => {
      mockService.deprecateDocumentationVersion.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let deprecateResult;
      await act(async () => {
        deprecateResult = await result.current.deprecateVersion('0.9.0');
      });

      expect(mockService.deprecateDocumentationVersion).toHaveBeenCalledWith('test-module', '0.9.0');
      expect(deprecateResult).toBe(true);
      expect(mockService.getDocumentationVersions).toHaveBeenCalledTimes(1); // refreshVersions called
    });
  });

  describe('search functionality', () => {
    it('should search documentation', async () => {
      const mockSearchResults = [
        {
          moduleId: 'test-module',
          version: '1.0.0',
          cid: 'QmTestCID1',
          title: 'Test Documentation',
          excerpt: 'This is test content...',
          relevanceScore: 15.5,
          matchedSections: []
        }
      ];

      mockService.searchDocumentation.mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let searchResults;
      await act(async () => {
        searchResults = await result.current.searchDocumentation('test query', {
          version: '1.0.0',
          language: 'en'
        });
      });

      expect(mockService.searchDocumentation).toHaveBeenCalledWith('test query', {
        moduleIds: ['test-module'],
        version: '1.0.0',
        language: 'en'
      });

      expect(searchResults).toEqual(mockSearchResults);
    });

    it('should handle search errors gracefully', async () => {
      mockService.searchDocumentation.mockRejectedValue(new Error('Search failed'));

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let searchResults;
      await act(async () => {
        searchResults = await result.current.searchDocumentation('test query');
      });

      expect(searchResults).toEqual([]);
    });
  });

  describe('validation', () => {
    it('should validate CID', async () => {
      const mockValidationResult = {
        valid: true,
        available: true,
        metadata: mockVersions[0].metadata,
        errors: [],
        warnings: ['Minor warning']
      };

      mockService.validateDocumentationCID.mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateCID('QmTestCID1');
      });

      expect(mockService.validateDocumentationCID).toHaveBeenCalledWith('QmTestCID1');
      expect(validationResult).toEqual(mockValidationResult);
      expect(result.current.validationResult).toEqual(mockValidationResult);
    });

    it('should handle validation errors', async () => {
      mockService.validateDocumentationCID.mockRejectedValue(new Error('Validation failed'));

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateCID('QmInvalidCID');
      });

      expect(validationResult.valid).toBe(false);
      expect(validationResult.available).toBe(false);
      expect(validationResult.errors).toContain('Validation failed');
    });
  });

  describe('computed values', () => {
    it('should compute hasDocumentation correctly', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      expect(result.current.hasDocumentation).toBe(false);

      await act(async () => {
        await result.current.refreshVersions();
      });

      // After loading versions, should still be false until documentation is loaded
      expect(result.current.hasDocumentation).toBe(false);

      await act(async () => {
        await result.current.loadDocumentation();
      });

      expect(result.current.hasDocumentation).toBe(true);
    });

    it('should compute isLatestVersion correctly', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      await act(async () => {
        await result.current.refreshVersions();
      });

      // Should be latest version (first non-deprecated)
      expect(result.current.isLatestVersion).toBe(true);

      await act(async () => {
        await result.current.switchVersion('0.9.0');
      });

      // Should not be latest version (deprecated)
      expect(result.current.isLatestVersion).toBe(false);
    });

    it('should compute availableVersions and deprecatedVersions correctly', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      await act(async () => {
        await result.current.refreshVersions();
      });

      expect(result.current.availableVersions).toHaveLength(1);
      expect(result.current.availableVersions[0].version).toBe('1.0.0');

      expect(result.current.deprecatedVersions).toHaveLength(1);
      expect(result.current.deprecatedVersions[0].version).toBe('0.9.0');
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      // Load some data
      await act(async () => {
        await result.current.refreshVersions();
        await result.current.loadDocumentation();
      });

      expect(result.current.documentation).not.toBeNull();

      // Clear cache
      act(() => {
        result.current.clearCache();
      });

      expect(result.current.documentation).toBeNull();
      expect(result.current.validationResult).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should respect cache timeout', async () => {
      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false,
          cacheTimeout: 100 // 100ms cache timeout
        })
      );

      await act(async () => {
        await result.current.refreshVersions();
        await result.current.loadDocumentation();
      });

      // Clear mock call history
      mockService.retrieveDocumentation.mockClear();

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Switch version should trigger reload due to cache expiry
      await act(async () => {
        await result.current.switchVersion('1.0.0');
      });

      expect(mockService.retrieveDocumentation).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockService.getDocumentationVersions.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      await act(async () => {
        await result.current.refreshVersions();
      });

      expect(result.current.error).toBe('Service unavailable');
      expect(result.current.versions).toEqual([]);
    });

    it('should handle upload errors', async () => {
      mockService.uploadDocumentation.mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(() =>
        useModuleDocumentation({
          moduleId: 'test-module',
          autoLoad: false
        })
      );

      await expect(
        act(async () => {
          await result.current.uploadDocumentation('content', {
            version: '1.0.0',
            format: 'markdown'
          });
        })
      ).rejects.toThrow('Upload failed');

      expect(result.current.error).toBe('Upload failed');
    });
  });
});
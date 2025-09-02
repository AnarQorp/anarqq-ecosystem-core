import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileService } from '../../src/services/FileService.js';

describe('FileService', () => {
  let fileService;
  let mockServices;

  beforeEach(() => {
    mockServices = {
      ipfs: {
        add: vi.fn(),
        get: vi.fn(),
        unpin: vi.fn()
      },
      encryption: {
        encrypt: vi.fn(),
        decrypt: vi.fn()
      },
      auth: {
        checkPermission: vi.fn(),
        checkFileAccess: vi.fn()
      },
      index: {
        indexFile: vi.fn(),
        updateFile: vi.fn(),
        removeFile: vi.fn(),
        listFiles: vi.fn()
      },
      audit: {
        logFileUpload: vi.fn(),
        logFileAccess: vi.fn(),
        logFileDeletion: vi.fn()
      },
      cache: {
        setFileMetadata: vi.fn(),
        getFileMetadata: vi.fn(),
        deleteFileMetadata: vi.fn(),
        setMetadataMapping: vi.fn()
      }
    };

    const config = {
      storage: {
        maxFileSize: 100 * 1024 * 1024,
        allowedMimeTypes: ['image/*', 'text/*', 'application/pdf']
      },
      retention: {
        defaultDays: 365
      }
    };

    fileService = new FileService(mockServices, config);
  });

  describe('validateFile', () => {
    it('should validate a valid file', () => {
      const fileData = {
        buffer: Buffer.from('test content'),
        size: 1024,
        mimetype: 'text/plain'
      };

      expect(() => fileService.validateFile(fileData)).not.toThrow();
    });

    it('should reject file without buffer', () => {
      const fileData = {
        size: 1024,
        mimetype: 'text/plain'
      };

      expect(() => fileService.validateFile(fileData)).toThrow('No file data provided');
    });

    it('should reject file that is too large', () => {
      const fileData = {
        buffer: Buffer.from('test content'),
        size: 200 * 1024 * 1024, // 200MB
        mimetype: 'text/plain'
      };

      expect(() => fileService.validateFile(fileData)).toThrow('File too large');
    });

    it('should reject disallowed mime type', () => {
      const fileData = {
        buffer: Buffer.from('test content'),
        size: 1024,
        mimetype: 'application/x-executable'
      };

      expect(() => fileService.validateFile(fileData)).toThrow('File type not allowed');
    });
  });

  describe('isAllowedMimeType', () => {
    it('should allow exact mime type match', () => {
      expect(fileService.isAllowedMimeType('application/pdf')).toBe(true);
    });

    it('should allow wildcard mime type match', () => {
      expect(fileService.isAllowedMimeType('image/jpeg')).toBe(true);
      expect(fileService.isAllowedMimeType('text/html')).toBe(true);
    });

    it('should reject non-matching mime type', () => {
      expect(fileService.isAllowedMimeType('video/mp4')).toBe(false);
    });
  });

  describe('calculateDeleteDate', () => {
    it('should calculate correct delete date', () => {
      const retentionDays = 30;
      const deleteDate = fileService.calculateDeleteDate(retentionDays);
      
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);
      
      const parsedDate = new Date(deleteDate);
      expect(parsedDate.getDate()).toBe(expectedDate.getDate());
    });

    it('should use default retention days when not specified', () => {
      const deleteDate = fileService.calculateDeleteDate();
      
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 365);
      
      const parsedDate = new Date(deleteDate);
      expect(parsedDate.getFullYear()).toBe(expectedDate.getFullYear());
    });
  });
});
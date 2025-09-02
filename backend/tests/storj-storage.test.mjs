/**
 * Tests for Storj Storage Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorjStorageService } from '../services/StorjStorageService.mjs';

// Mock AWS SDK
vi.mock('aws-sdk', () => ({
  default: {
    S3: vi.fn().mockImplementation(() => ({
      upload: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          Location: 'https://gateway.storjshare.io/test-bucket/test-file.jpg'
        })
      }),
      getObject: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          Body: Buffer.from('test file content'),
          ContentType: 'image/jpeg',
          Metadata: { originalName: 'test.jpg' },
          LastModified: new Date()
        })
      }),
      headObject: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          ContentType: 'image/jpeg',
          ContentLength: 1024,
          LastModified: new Date(),
          Metadata: { originalName: 'test.jpg' },
          ETag: '"test-etag"'
        })
      }),
      deleteObject: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({})
      }),
      listObjectsV2: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          Contents: [
            {
              Key: 'qsocial/user123/test-file.jpg',
              Size: 1024,
              LastModified: new Date(),
              ETag: '"test-etag"'
            }
          ],
          IsTruncated: false
        })
      }),
      headBucket: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({})
      }),
      getSignedUrl: vi.fn().mockReturnValue('https://signed-url.example.com')
    }))
  }
}));

// Mock IPFS HTTP Client
vi.mock('ipfs-http-client', () => ({
  create: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({
      cid: {
        toString: () => 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      }
    }),
    id: vi.fn().mockResolvedValue({ id: 'test-peer-id' })
  })
}));

describe('StorjStorageService', () => {
  let storjService;
  const testConfig = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    endpoint: 'https://gateway.storjshare.io',
    bucket: 'test-bucket',
    region: 'us-east-1'
  };

  beforeEach(() => {
    storjService = new StorjStorageService(testConfig);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const fileBuffer = Buffer.from('test file content');
      const metadata = {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        userId: 'user123'
      };

      const result = await storjService.uploadFile(fileBuffer, metadata);

      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
      expect(result.storjUrl).toBe('https://gateway.storjshare.io/test-bucket/test-file.jpg');
      expect(result.fileSize).toBe(fileBuffer.length);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.ipfsCid).toBe('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
    });

    it('should handle upload errors', async () => {
      // Mock S3 upload failure
      const mockS3 = storjService.s3;
      mockS3.upload.mockReturnValueOnce({
        promise: vi.fn().mockRejectedValue(new Error('Upload failed'))
      });

      const fileBuffer = Buffer.from('test file content');
      const metadata = { filename: 'test.jpg', userId: 'user123' };

      const result = await storjService.uploadFile(fileBuffer, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const storjKey = 'qsocial/user123/test-file.jpg';

      const result = await storjService.downloadFile(storjKey);

      expect(result.success).toBe(true);
      expect(result.buffer).toEqual(Buffer.from('test file content'));
      expect(result.contentType).toBe('image/jpeg');
      expect(result.metadata.originalName).toBe('test.jpg');
    });

    it('should handle download errors', async () => {
      const mockS3 = storjService.s3;
      mockS3.getObject.mockReturnValueOnce({
        promise: vi.fn().mockRejectedValue(new Error('File not found'))
      });

      const storjKey = 'qsocial/user123/nonexistent.jpg';

      const result = await storjService.downloadFile(storjKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata successfully', async () => {
      const storjKey = 'qsocial/user123/test-file.jpg';

      const result = await storjService.getFileMetadata(storjKey);

      expect(result.success).toBe(true);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.contentLength).toBe(1024);
      expect(result.metadata.originalName).toBe('test.jpg');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const storjKey = 'qsocial/user123/test-file.jpg';

      const result = await storjService.deleteFile(storjKey);

      expect(result.success).toBe(true);
      expect(result.message).toBe('File deleted successfully');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const prefix = 'qsocial/user123/';

      const result = await storjService.listFiles(prefix);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].key).toBe('qsocial/user123/test-file.jpg');
      expect(result.files[0].size).toBe(1024);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const storjKey = 'qsocial/user123/test-file.jpg';
      const expiresIn = 3600;

      const result = await storjService.generateSignedUrl(storjKey, expiresIn);

      expect(result.success).toBe(true);
      expect(result.signedUrl).toBe('https://signed-url.example.com');
      expect(result.expiresIn).toBe(3600);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await storjService.healthCheck();

      expect(health.storj).toBe(true);
      expect(health.ipfs).toBe(true);
      expect(health.bucket).toBe(true);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('generateIPFSCid', () => {
    it('should generate IPFS CID', async () => {
      const fileBuffer = Buffer.from('test file content');

      const cid = await storjService.generateIPFSCid(fileBuffer);

      expect(cid).toBe('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
    });

    it('should handle IPFS unavailable', async () => {
      storjService.ipfs = null;

      await expect(storjService.generateIPFSCid(Buffer.from('test')))
        .rejects.toThrow('IPFS client not available');
    });
  });

  describe('utility methods', () => {
    it('should generate unique file ID', () => {
      const fileId1 = storjService.generateFileId();
      const fileId2 = storjService.generateFileId();

      expect(fileId1).toBeDefined();
      expect(fileId2).toBeDefined();
      expect(fileId1).not.toBe(fileId2);
      expect(fileId1).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate proper Storj key', () => {
      const userId = 'user123';
      const fileId = 'abc123def456';
      const filename = 'test.jpg';

      const storjKey = storjService.generateStorjKey(userId, fileId, filename);

      expect(storjKey).toMatch(/^qsocial\/user123\/\d+_abc123def456\.jpg$/);
    });
  });
});
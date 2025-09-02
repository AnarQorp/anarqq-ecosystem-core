import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { StorjFilecoinService, S3Config } from '../StorjFilecoinService';
import { PrivacyLevel, ContentType, ModerationStatus } from '../../../types/qsocial';

// Mock AWS SDK
const mockS3Client = {
  putObject: vi.fn(),
  getObject: vi.fn(),
  deleteObject: vi.fn(),
  headObject: vi.fn(),
  listObjects: vi.fn()
};

const mockAWSSDK = {
  S3: vi.fn().mockImplementation(() => mockS3Client)
};

// Mock dynamic import
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn()
}));

describe('StorjFilecoinService', () => {
  const mockConfig: S3Config = {
    endpoint: 'https://gateway.storjshare.io',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    region: 'us-east-1',
    bucket: 'test-bucket',
    forcePathStyle: true
  };

  const mockPost = {
    authorId: 'did:test:123',
    title: 'Test Post',
    content: 'This is test content',
    contentType: ContentType.TEXT,
    privacyLevel: PrivacyLevel.PUBLIC,
    subcommunityId: undefined,
    tags: ['test'],
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    isPinned: false,
    isLocked: false,
    moderationStatus: ModerationStatus.APPROVED
  };

  const mockComment = {
    postId: 'post-123',
    authorId: 'did:test:123',
    content: 'This is a test comment',
    parentCommentId: undefined,
    depth: 0,
    childrenIds: [],
    upvotes: 0,
    downvotes: 0,
    privacyLevel: PrivacyLevel.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    moderationStatus: ModerationStatus.APPROVED
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock crypto.subtle
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
        }
      },
      writable: true
    });

    // Reset the service state
    StorjFilecoinService['client'] = null;
    StorjFilecoinService['config'] = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize S3 client with correct configuration', async () => {
      // Mock the dynamic import to return our mock AWS SDK
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);

      await StorjFilecoinService.initialize(mockConfig);

      expect(mockAWSSDK.S3).toHaveBeenCalledWith({
        endpoint: mockConfig.endpoint,
        accessKeyId: mockConfig.accessKeyId,
        secretAccessKey: mockConfig.secretAccessKey,
        region: mockConfig.region,
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
      });
    });

    it('should throw error when AWS SDK is not available', async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockRejectedValue(new Error('AWS SDK not available'));

      await expect(StorjFilecoinService.initialize(mockConfig))
        .rejects.toThrow('Failed to initialize Storj/Filecoin client');
    });
  });

  describe('uploadPostContent', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should upload post content successfully', async () => {
      const mockETag = '"abc123"';
      mockS3Client.putObject.mockResolvedValue({ ETag: mockETag });

      const result = await StorjFilecoinService.uploadPostContent(mockPost);

      expect(result.etag).toBe(mockETag);
      expect(result.key).toMatch(/^qsocial\/posts\/\d{4}\/\d{2}\/\d{2}\//);
      expect(result.url).toContain(mockConfig.endpoint);
      expect(result.size).toBeGreaterThan(0);
      expect(mockS3Client.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: mockConfig.bucket,
          Key: expect.stringMatching(/^qsocial\/posts\/\d{4}\/\d{2}\/\d{2}\//),
          ContentType: 'application/json',
          Metadata: expect.objectContaining({
            'content-type': ContentType.TEXT,
            'privacy-level': PrivacyLevel.PUBLIC,
            'author-id': 'did:test:123'
          })
        })
      );
    });

    it('should throw error when service not initialized', async () => {
      StorjFilecoinService['client'] = null;
      StorjFilecoinService['config'] = null;

      await expect(StorjFilecoinService.uploadPostContent(mockPost))
        .rejects.toThrow('StorjFilecoin service not initialized');
    });

    it('should retry on failure and eventually succeed', async () => {
      mockS3Client.putObject
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ETag: '"success123"' });

      const result = await StorjFilecoinService.uploadPostContent(mockPost);

      expect(result.etag).toBe('"success123"');
      expect(mockS3Client.putObject).toHaveBeenCalledTimes(3);
    });
  });

  describe('uploadCommentContent', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should upload comment content successfully', async () => {
      const mockETag = '"comment123"';
      mockS3Client.putObject.mockResolvedValue({ ETag: mockETag });

      const result = await StorjFilecoinService.uploadCommentContent(mockComment);

      expect(result.etag).toBe(mockETag);
      expect(result.key).toMatch(/^qsocial\/comments\/\d{4}\/\d{2}\/\d{2}\//);
      expect(result.url).toContain(mockConfig.endpoint);
      expect(mockS3Client.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: mockConfig.bucket,
          Key: expect.stringMatching(/^qsocial\/comments\/\d{4}\/\d{2}\/\d{2}\//),
          ContentType: 'application/json',
          Metadata: expect.objectContaining({
            'content-type': ContentType.TEXT,
            'privacy-level': PrivacyLevel.PUBLIC,
            'author-id': 'did:test:123'
          })
        })
      );
    });
  });

  describe('downloadContent', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should download and parse content successfully', async () => {
      const mockContentData = {
        content: 'Downloaded content',
        metadata: {
          contentHash: 'hash123',
          contentType: ContentType.TEXT,
          privacyLevel: PrivacyLevel.PUBLIC,
          authorId: 'did:test:123',
          timestamp: new Date().toISOString(),
          originalName: 'test-content',
        }
      };

      const mockBody = new TextEncoder().encode(JSON.stringify(mockContentData));
      mockS3Client.getObject.mockResolvedValue({
        Body: mockBody,
        ContentType: 'application/json',
        Metadata: {
          'content-hash': 'hash123',
          'content-type': ContentType.TEXT,
          'privacy-level': PrivacyLevel.PUBLIC,
          'author-id': 'did:test:123'
        }
      });

      const result = await StorjFilecoinService.downloadContent('test-key');

      expect(result.content).toEqual(mockContentData);
      expect(result.metadata.contentHash).toBe('hash123');
      expect(result.verified).toBe(true);
      expect(mockS3Client.getObject).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: 'test-key'
      });
    });

    it('should handle download errors', async () => {
      mockS3Client.getObject.mockRejectedValue(new Error('Not found'));

      await expect(StorjFilecoinService.downloadContent('nonexistent-key'))
        .rejects.toThrow('Failed to download content');
    });
  });

  describe('deleteContent', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should delete content successfully', async () => {
      mockS3Client.deleteObject.mockResolvedValue({});

      await StorjFilecoinService.deleteContent('test-key');

      expect(mockS3Client.deleteObject).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: 'test-key'
      });
    });

    it('should handle delete errors', async () => {
      mockS3Client.deleteObject.mockRejectedValue(new Error('Delete failed'));

      await expect(StorjFilecoinService.deleteContent('test-key'))
        .rejects.toThrow('Failed to delete content');
    });
  });

  describe('contentExists', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should return true when content exists', async () => {
      mockS3Client.headObject.mockResolvedValue({
        ContentLength: 100,
        ContentType: 'application/json'
      });

      const exists = await StorjFilecoinService.contentExists('test-key');

      expect(exists).toBe(true);
      expect(mockS3Client.headObject).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: 'test-key'
      });
    });

    it('should return false when content does not exist', async () => {
      mockS3Client.headObject.mockRejectedValue(new Error('Not found'));

      const exists = await StorjFilecoinService.contentExists('nonexistent-key');

      expect(exists).toBe(false);
    });

    it('should return false when service not initialized', async () => {
      StorjFilecoinService['client'] = null;
      StorjFilecoinService['config'] = null;

      const exists = await StorjFilecoinService.contentExists('test-key');

      expect(exists).toBe(false);
    });
  });

  describe('listContent', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should list content successfully', async () => {
      const mockContents = [
        { Key: 'file1.json', Size: 100, LastModified: new Date('2023-01-01') },
        { Key: 'file2.json', Size: 200, LastModified: new Date('2023-01-02') }
      ];

      mockS3Client.listObjects.mockResolvedValue({
        Contents: mockContents
      });

      const result = await StorjFilecoinService.listContent('qsocial/', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'file1.json',
        size: 100,
        lastModified: new Date('2023-01-01')
      });
      expect(mockS3Client.listObjects).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Prefix: 'qsocial/',
        MaxKeys: 10
      });
    });
  });

  describe('cleanupOldContent', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should cleanup old content successfully', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - (35 * 24 * 60 * 60 * 1000)); // 35 days ago
      const recentDate = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)); // 5 days ago

      const mockContents = [
        { Key: 'old-file.json', Size: 100, LastModified: oldDate },
        { Key: 'recent-file.json', Size: 200, LastModified: recentDate }
      ];

      mockS3Client.listObjects.mockResolvedValue({
        Contents: mockContents
      });
      mockS3Client.deleteObject.mockResolvedValue({});

      const cleanedCount = await StorjFilecoinService.cleanupOldContent(30 * 24 * 60 * 60 * 1000); // 30 days

      expect(cleanedCount).toBe(1);
      expect(mockS3Client.deleteObject).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: 'old-file.json'
      });
      expect(mockS3Client.deleteObject).not.toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: 'recent-file.json'
      });
    });
  });

  describe('getStorageStats', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should calculate storage statistics correctly', async () => {
      const mockContents = [
        { Key: 'file1.json', Size: 100, LastModified: new Date('2023-01-01') },
        { Key: 'file2.json', Size: 200, LastModified: new Date('2023-01-02') },
        { Key: 'file3.json', Size: 150, LastModified: new Date('2023-01-03') }
      ];

      mockS3Client.listObjects.mockResolvedValue({
        Contents: mockContents
      });

      const stats = await StorjFilecoinService.getStorageStats();

      expect(stats.totalObjects).toBe(3);
      expect(stats.totalSize).toBe(450);
      expect(stats.oldestObject).toEqual(new Date('2023-01-01'));
      expect(stats.newestObject).toEqual(new Date('2023-01-03'));
    });

    it('should handle empty storage', async () => {
      mockS3Client.listObjects.mockResolvedValue({
        Contents: []
      });

      const stats = await StorjFilecoinService.getStorageStats();

      expect(stats.totalObjects).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestObject).toBeUndefined();
      expect(stats.newestObject).toBeUndefined();
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      vi.spyOn(StorjFilecoinService as any, 'importAWSSDK').mockResolvedValue(mockAWSSDK);
      await StorjFilecoinService.initialize(mockConfig);
    });

    it('should return true when connection is successful', async () => {
      mockS3Client.listObjects.mockResolvedValue({
        Contents: []
      });

      const result = await StorjFilecoinService.testConnection();

      expect(result).toBe(true);
      expect(mockS3Client.listObjects).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        MaxKeys: 1
      });
    });

    it('should return false when connection fails', async () => {
      mockS3Client.listObjects.mockRejectedValue(new Error('Connection failed'));

      const result = await StorjFilecoinService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when service not initialized', async () => {
      StorjFilecoinService['client'] = null;
      StorjFilecoinService['config'] = null;

      const result = await StorjFilecoinService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should generate correct content keys', () => {
      const timestamp = new Date('2023-06-15T10:30:00Z').getTime();
      const authorId = 'did:test:12345678';
      
      const postKey = StorjFilecoinService['generateContentKey']('post', authorId, timestamp);
      const commentKey = StorjFilecoinService['generateContentKey']('comment', authorId, timestamp);

      expect(postKey).toMatch(/^qsocial\/posts\/2023\/06\/15\/12345678_\d+_[a-z0-9]{8}\.json$/);
      expect(commentKey).toMatch(/^qsocial\/comments\/2023\/06\/15\/12345678_\d+_[a-z0-9]{8}\.json$/);
    });

    it('should generate correct public URLs', () => {
      StorjFilecoinService['config'] = mockConfig;
      
      const url = StorjFilecoinService['generatePublicUrl']('test/file.json');
      
      expect(url).toBe(`${mockConfig.endpoint}/${mockConfig.bucket}/test/file.json`);
    });

    it('should convert metadata formats correctly', () => {
      const metadata = {
        contentType: ContentType.TEXT,
        privacyLevel: PrivacyLevel.PUBLIC,
        authorId: 'did:test:123',
        timestamp: '2023-06-15T10:30:00Z',
        originalName: 'test-file',
        contentHash: 'hash123'
      };

      const s3Format = StorjFilecoinService['metadataToS3Format'](metadata);
      const backToMetadata = StorjFilecoinService['s3FormatToMetadata'](s3Format);

      expect(s3Format).toEqual({
        'content-type': ContentType.TEXT,
        'privacy-level': PrivacyLevel.PUBLIC,
        'author-id': 'did:test:123',
        'timestamp': '2023-06-15T10:30:00Z',
        'original-name': 'test-file',
        'content-hash': 'hash123'
      });

      expect(backToMetadata).toEqual(metadata);
    });
  });
});
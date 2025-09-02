import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { QsocialStorageService } from '../QsocialStorageService';
import { PrivacyLevel, ContentType, ModerationStatus } from '../../../types/qsocial';
import * as ipfsUtils from '../../../utils/ipfs';
import * as ipfsApi from '../../../api/ipfs';
import * as squidLib from '../../../lib/squid';

// Mock dependencies
vi.mock('../../../utils/ipfs');
vi.mock('../../../api/ipfs');
vi.mock('../../../lib/squid');

const mockUploadToIPFS = ipfsUtils.uploadToIPFS as Mock;
const mockGetFromIPFS = ipfsUtils.getFromIPFS as Mock;
const mockUploadEncryptedFile = ipfsApi.uploadEncryptedFile as Mock;
const mockDownloadAndDecryptFile = ipfsApi.downloadAndDecryptFile as Mock;
const mockGetFileMetadata = ipfsApi.getFileMetadata as Mock;
const mockGetActiveIdentity = squidLib.getActiveIdentity as Mock;

describe('QsocialStorageService', () => {
  const mockIdentity = {
    did: 'did:test:123',
    id: 'did:test:123',
    name: 'Test User',
    type: 'ROOT' as const,
    kyc: true,
    reputation: 100,
    space: 'test-space'
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveIdentity.mockReturnValue(mockIdentity);
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      key: vi.fn(),
      length: 0
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock crypto.subtle
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storePostContent', () => {
    it('should store public post content to IPFS', async () => {
      const mockCid = 'QmTest123';
      mockUploadToIPFS.mockResolvedValue(mockCid);

      const result = await QsocialStorageService.storePostContent(mockPost);

      expect(result.ipfsHash).toBe(mockCid);
      expect(result.isEncrypted).toBe(false);
      expect(result.metadata.contentType).toBe(ContentType.TEXT);
      expect(result.metadata.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(result.metadata.authorId).toBe('did:test:123');
      expect(mockUploadToIPFS).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'This is test content',
          metadata: expect.objectContaining({
            contentType: ContentType.TEXT,
            privacyLevel: PrivacyLevel.PUBLIC,
            authorId: 'did:test:123'
          })
        })
      );
    });

    it('should store private post content with encryption', async () => {
      const mockCid = 'QmEncrypted123';
      const privatePost = { ...mockPost, privacyLevel: PrivacyLevel.PRIVATE };
      mockUploadEncryptedFile.mockResolvedValue(mockCid);

      const result = await QsocialStorageService.storePostContent(privatePost);

      expect(result.ipfsHash).toBe(mockCid);
      expect(result.isEncrypted).toBe(true);
      expect(result.metadata.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(mockUploadEncryptedFile).toHaveBeenCalled();
    });

    it('should use fallback storage when IPFS fails', async () => {
      mockUploadToIPFS.mockRejectedValue(new Error('IPFS error'));
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.setItem = vi.fn();

      const result = await QsocialStorageService.storePostContent(mockPost);

      expect(result.fallbackUsed).toBe(true);
      expect(result.ipfsHash).toMatch(/^fallback:/);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error when no active identity', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(QsocialStorageService.storePostContent(mockPost))
        .rejects.toThrow('No active identity found for content storage');
    });
  });

  describe('storeCommentContent', () => {
    it('should store public comment content to IPFS', async () => {
      const mockCid = 'QmComment123';
      mockUploadToIPFS.mockResolvedValue(mockCid);

      const result = await QsocialStorageService.storeCommentContent(mockComment);

      expect(result.ipfsHash).toBe(mockCid);
      expect(result.isEncrypted).toBe(false);
      expect(result.metadata.contentType).toBe(ContentType.TEXT);
      expect(result.metadata.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(mockUploadToIPFS).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'This is a test comment',
          metadata: expect.objectContaining({
            contentType: ContentType.TEXT,
            privacyLevel: PrivacyLevel.PUBLIC,
            authorId: 'did:test:123'
          })
        })
      );
    });

    it('should store private comment content with encryption', async () => {
      const mockCid = 'QmEncryptedComment123';
      const privateComment = { ...mockComment, privacyLevel: PrivacyLevel.PRIVATE };
      mockUploadEncryptedFile.mockResolvedValue(mockCid);

      const result = await QsocialStorageService.storeCommentContent(privateComment);

      expect(result.ipfsHash).toBe(mockCid);
      expect(result.isEncrypted).toBe(true);
      expect(result.metadata.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      expect(mockUploadEncryptedFile).toHaveBeenCalled();
    });
  });

  describe('retrieveContent', () => {
    it('should retrieve and verify public content from IPFS', async () => {
      const mockContentPackage = {
        content: 'Retrieved content',
        metadata: {
          contentHash: 'hash123',
          contentType: ContentType.TEXT,
          privacyLevel: PrivacyLevel.PUBLIC,
          authorId: 'did:test:123',
          timestamp: new Date().toISOString(),
          originalSize: 100,
          version: '1.0.0'
        }
      };
      mockGetFromIPFS.mockResolvedValue(mockContentPackage);

      const result = await QsocialStorageService.retrieveContent('QmTest123', false);

      expect(result.content).toBe('Retrieved content');
      expect(result.metadata).toEqual(mockContentPackage.metadata);
      expect(result.verified).toBe(true);
      expect(mockGetFromIPFS).toHaveBeenCalledWith('QmTest123');
    });

    it('should retrieve and decrypt private content from IPFS', async () => {
      const mockContentPackage = {
        content: 'Decrypted content',
        metadata: {
          contentHash: 'hash123',
          contentType: ContentType.TEXT,
          privacyLevel: PrivacyLevel.PRIVATE,
          authorId: 'did:test:123',
          timestamp: new Date().toISOString(),
          originalSize: 100,
          version: '1.0.0'
        }
      };
      const mockDecryptResult = {
        data: new TextEncoder().encode(JSON.stringify(mockContentPackage)),
        metadata: {}
      };
      mockDownloadAndDecryptFile.mockResolvedValue(mockDecryptResult);

      const result = await QsocialStorageService.retrieveContent('QmEncrypted123', true);

      expect(result.content).toBe('Decrypted content');
      expect(result.metadata).toEqual(mockContentPackage.metadata);
      expect(mockDownloadAndDecryptFile).toHaveBeenCalledWith('QmEncrypted123');
    });

    it('should retrieve content from fallback storage', async () => {
      const mockContentPackage = {
        content: 'Fallback content',
        metadata: {
          contentHash: 'hash123',
          contentType: ContentType.TEXT,
          privacyLevel: PrivacyLevel.PUBLIC,
          authorId: 'did:test:123',
          timestamp: new Date().toISOString(),
          originalSize: 100,
          version: '1.0.0'
        }
      };
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockContentPackage));

      const result = await QsocialStorageService.retrieveFallbackContent('test-key', false);

      expect(result.content).toBe('Fallback content');
      expect(result.metadata).toEqual(mockContentPackage.metadata);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle invalid content package', async () => {
      mockGetFromIPFS.mockResolvedValue(null);

      await expect(QsocialStorageService.retrieveContent('QmInvalid123', false))
        .rejects.toThrow('Invalid content package retrieved from IPFS');
    });
  });

  describe('checkContentAvailability', () => {
    it('should check availability of IPFS content', async () => {
      mockGetFromIPFS.mockResolvedValue({ metadata: {} });

      const result = await QsocialStorageService.checkContentAvailability('QmTest123', false);

      expect(result).toBe(true);
      expect(mockGetFromIPFS).toHaveBeenCalledWith('QmTest123');
    });

    it('should check availability of encrypted content', async () => {
      mockGetFileMetadata.mockResolvedValue({ some: 'metadata' });

      const result = await QsocialStorageService.checkContentAvailability('QmEncrypted123', true);

      expect(result).toBe(true);
      expect(mockGetFileMetadata).toHaveBeenCalledWith('QmEncrypted123');
    });

    it('should check availability of fallback content', async () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue('some content');

      const result = await QsocialStorageService.checkContentAvailability('fallback:test-key', false);

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return false when content is not available', async () => {
      mockGetFromIPFS.mockRejectedValue(new Error('Not found'));

      const result = await QsocialStorageService.checkContentAvailability('QmNotFound123', false);

      expect(result).toBe(false);
    });
  });

  describe('cleanupFallbackStorage', () => {
    it('should clean up old fallback storage entries', () => {
      const mockLocalStorage = window.localStorage as any;
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      const recentTimestamp = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago
      
      mockLocalStorage.length = 3;
      mockLocalStorage.key = vi.fn()
        .mockReturnValueOnce(`qsocial_fallback_${oldTimestamp}_abc123`)
        .mockReturnValueOnce(`qsocial_fallback_${recentTimestamp}_def456`)
        .mockReturnValueOnce('other_key');
      mockLocalStorage.removeItem = vi.fn();

      QsocialStorageService.cleanupFallbackStorage(7 * 24 * 60 * 60 * 1000); // 7 days

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`qsocial_fallback_${oldTimestamp}_abc123`);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith(`qsocial_fallback_${recentTimestamp}_def456`);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other_key');
    });
  });

  describe('getStorageStats', () => {
    it('should calculate storage statistics', () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.length = 3;
      mockLocalStorage.key = vi.fn()
        .mockReturnValueOnce('qsocial_fallback_123_abc')
        .mockReturnValueOnce('qsocial_fallback_456_def')
        .mockReturnValueOnce('other_key');
      mockLocalStorage.getItem = vi.fn()
        .mockReturnValueOnce('content1')
        .mockReturnValueOnce('content2');

      const stats = QsocialStorageService.getStorageStats();

      expect(stats.fallbackEntries).toBe(2);
      expect(stats.fallbackSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('content integrity verification', () => {
    it('should verify content integrity correctly', async () => {
      const content = 'test content';
      const mockContentPackage = {
        content,
        metadata: {
          contentHash: await QsocialStorageService['generateContentHash'](content),
          contentType: ContentType.TEXT,
          privacyLevel: PrivacyLevel.PUBLIC,
          authorId: 'did:test:123',
          timestamp: new Date().toISOString(),
          originalSize: 100,
          version: '1.0.0'
        }
      };
      mockGetFromIPFS.mockResolvedValue(mockContentPackage);

      const result = await QsocialStorageService.retrieveContent('QmTest123', false);

      expect(result.verified).toBe(true);
    });

    it('should detect content integrity failure', async () => {
      const mockContentPackage = {
        content: 'tampered content',
        metadata: {
          contentHash: 'wrong_hash',
          contentType: ContentType.TEXT,
          privacyLevel: PrivacyLevel.PUBLIC,
          authorId: 'did:test:123',
          timestamp: new Date().toISOString(),
          originalSize: 100,
          version: '1.0.0'
        }
      };
      mockGetFromIPFS.mockResolvedValue(mockContentPackage);

      const result = await QsocialStorageService.retrieveContent('QmTest123', false);

      expect(result.verified).toBe(false);
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed operations', async () => {
      mockUploadToIPFS
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('QmSuccess123');

      const result = await QsocialStorageService.storePostContent(mockPost);

      expect(result.ipfsHash).toBe('QmSuccess123');
      expect(mockUploadToIPFS).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retry attempts', async () => {
      mockUploadToIPFS.mockRejectedValue(new Error('Persistent error'));
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.setItem = vi.fn();

      // Should use fallback after retries fail
      const result = await QsocialStorageService.storePostContent(mockPost);

      expect(result.fallbackUsed).toBe(true);
      expect(mockUploadToIPFS).toHaveBeenCalledTimes(3); // Default max attempts
    });
  });
});
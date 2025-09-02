/**
 * Tests for CrossPostService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrossPostService, CrossPostContent } from '../CrossPostService';
import { ContentType, PrivacyLevel } from '@/types/qsocial';

// Mock the module APIs
vi.mock('@/api/qpic', () => ({
  getUserMediaFiles: vi.fn()
}));

vi.mock('@/api/qmail', () => ({
  getMessages: vi.fn()
}));

vi.mock('@/api/qdrive', () => ({
  getUserFiles: vi.fn()
}));

vi.mock('@/api/qchat', () => ({
  fetchMessages: vi.fn()
}));

vi.mock('@/state/identity', () => ({
  getActiveIdentity: vi.fn()
}));

vi.mock('../PostService', () => ({
  PostService: vi.fn().mockImplementation(() => ({
    createPost: vi.fn()
  }))
}));

import { getUserMediaFiles } from '@/api/qpic';
import { getMessages } from '@/api/qmail';
import { getUserFiles } from '@/api/qdrive';
import { fetchMessages } from '@/api/qchat';
import { getActiveIdentity } from '@/state/identity';
import { PostService } from '../PostService';

describe('CrossPostService', () => {
  let crossPostService: CrossPostService;
  let mockPostService: any;

  const mockIdentity = {
    did: 'did:test:user123',
    name: 'Test User',
    type: 'ROOT' as const,
    kyc: true,
    reputation: 100
  };

  beforeEach(() => {
    crossPostService = new CrossPostService();
    mockPostService = new PostService();
    vi.mocked(getActiveIdentity).mockReturnValue(mockIdentity);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getModuleContent', () => {
    it('should get QpiC content correctly', async () => {
      const mockQpicFiles = [
        {
          id: 'qpic1',
          name: 'test-image.jpg',
          size: 1024,
          type: 'image/jpeg',
          isImage: true,
          isVideo: false,
          uploadDate: new Date('2024-01-01'),
          thumbnail: 'data:image/jpeg;base64,thumbnail'
        }
      ];

      vi.mocked(getUserMediaFiles).mockResolvedValue(mockQpicFiles);

      const content = await crossPostService.getModuleContent('qpic');

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        id: 'qpic1',
        title: 'test-image.jpg',
        sourceModule: 'qpic',
        previewData: {
          thumbnail: 'data:image/jpeg;base64,thumbnail',
          snippet: 'Image: test-image.jpg',
          mediaType: 'image'
        }
      });
    });

    it('should get Qmail content correctly', async () => {
      const mockMessages = [
        {
          id: 'msg1',
          subject: 'Test Subject',
          content: 'This is a test message content',
          senderIdentityId: 'sender123',
          timestamp: new Date('2024-01-01'),
          encryptionLevel: 'STANDARD',
          priority: 'NORMAL'
        }
      ];

      vi.mocked(getMessages).mockResolvedValue(mockMessages);

      const content = await crossPostService.getModuleContent('qmail');

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        id: 'msg1',
        title: 'Test Subject',
        sourceModule: 'qmail',
        previewData: {
          snippet: 'Message: Test Subject - This is a test message content...',
          mediaType: 'message'
        }
      });
    });

    it('should get Qdrive content correctly', async () => {
      const mockFiles = [
        {
          id: 'file1',
          name: 'document.pdf',
          size: 2048,
          type: 'application/pdf',
          uploadDate: new Date('2024-01-01'),
          ipfsHash: 'QmHash123'
        }
      ];

      vi.mocked(getUserFiles).mockResolvedValue(mockFiles);

      const content = await crossPostService.getModuleContent('qdrive');

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        id: 'file1',
        title: 'document.pdf',
        sourceModule: 'qdrive',
        previewData: {
          snippet: 'File: document.pdf (2 KB)',
          mediaType: 'document'
        }
      });
    });

    it('should handle authentication error', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue(null);

      await expect(crossPostService.getModuleContent('qpic')).rejects.toThrow('User not authenticated');
    });
  });

  describe('getAllModuleContent', () => {
    it('should get content from all modules', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([]);
      vi.mocked(getMessages).mockResolvedValue([]);
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const allContent = await crossPostService.getAllModuleContent();

      expect(allContent).toHaveProperty('qpic');
      expect(allContent).toHaveProperty('qmail');
      expect(allContent).toHaveProperty('qmarket');
      expect(allContent).toHaveProperty('qdrive');
      expect(allContent).toHaveProperty('qchat');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getUserMediaFiles).mockRejectedValue(new Error('QpiC error'));
      vi.mocked(getMessages).mockResolvedValue([]);
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const allContent = await crossPostService.getAllModuleContent();

      expect(allContent.qpic).toEqual([]);
      expect(allContent.qmail).toEqual([]);
    });
  });

  describe('createCrossPost', () => {
    it('should create a cross-post from QpiC content', async () => {
      const mockQpicFile = {
        id: 'qpic1',
        name: 'test-image.jpg',
        size: 1024,
        type: 'image/jpeg',
        isImage: true,
        isVideo: false,
        uploadDate: new Date('2024-01-01')
      };

      const mockPost = {
        id: 'post1',
        title: 'Custom Title',
        content: 'Custom content',
        contentType: ContentType.CROSS_POST,
        sourceModule: 'qpic' as const,
        sourceId: 'qpic1'
      };

      vi.mocked(getUserMediaFiles).mockResolvedValue([mockQpicFile]);
      
      // Mock the PostService instance method
      const mockCreatePost = vi.fn().mockResolvedValue(mockPost);
      crossPostService['postService'].createPost = mockCreatePost;

      const result = await crossPostService.createCrossPost('qpic', 'qpic1', {
        title: 'Custom Title',
        additionalContent: 'Custom content'
      });

      expect(mockCreatePost).toHaveBeenCalledWith({
        title: 'Custom Title',
        content: 'Custom content',
        contentType: ContentType.CROSS_POST,
        sourceModule: 'qpic',
        sourceId: 'qpic1',
        sourceData: mockQpicFile,
        tags: ['qpic', 'media'],
        privacyLevel: PrivacyLevel.PUBLIC
      });

      expect(result).toEqual(mockPost);
    });

    it('should throw error for non-existent content', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([]);

      await expect(
        crossPostService.createCrossPost('qpic', 'nonexistent', {})
      ).rejects.toThrow('Content not found in qpic with ID: nonexistent');
    });
  });

  describe('getContentPreview', () => {
    it('should get preview for existing content', async () => {
      const mockQpicFile = {
        id: 'qpic1',
        name: 'test-image.jpg',
        size: 1024,
        type: 'image/jpeg',
        isImage: true,
        isVideo: false,
        uploadDate: new Date('2024-01-01'),
        thumbnail: 'data:image/jpeg;base64,thumbnail'
      };

      vi.mocked(getUserMediaFiles).mockResolvedValue([mockQpicFile]);

      const preview = await crossPostService.getContentPreview('qpic', 'qpic1');

      expect(preview).toMatchObject({
        thumbnail: 'data:image/jpeg;base64,thumbnail',
        snippet: 'Image: test-image.jpg',
        mediaType: 'image'
      });
    });

    it('should throw error for non-existent content', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([]);

      await expect(
        crossPostService.getContentPreview('qpic', 'nonexistent')
      ).rejects.toThrow('Content not found in qpic with ID: nonexistent');
    });
  });

  describe('searchContent', () => {
    it('should search across all modules', async () => {
      const mockQpicFile = {
        id: 'qpic1',
        name: 'vacation-photo.jpg',
        size: 1024,
        type: 'image/jpeg',
        isImage: true,
        isVideo: false,
        uploadDate: new Date('2024-01-01')
      };

      const mockMessage = {
        id: 'msg1',
        subject: 'Vacation Plans',
        content: 'Let me share some vacation photos',
        senderIdentityId: 'sender123',
        timestamp: new Date('2024-01-01')
      };

      vi.mocked(getUserMediaFiles).mockResolvedValue([mockQpicFile]);
      vi.mocked(getMessages).mockResolvedValue([mockMessage]);
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const results = await crossPostService.searchContent('vacation');

      expect(results).toHaveLength(2);
      expect(results.some(r => r.sourceModule === 'qpic')).toBe(true);
      expect(results.some(r => r.sourceModule === 'qmail')).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([]);
      vi.mocked(getMessages).mockResolvedValue([]);
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const results = await crossPostService.searchContent('nonexistent');

      expect(results).toHaveLength(0);
    });
  });
});
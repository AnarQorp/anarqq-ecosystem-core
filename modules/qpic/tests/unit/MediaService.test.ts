import { describe, it, expect, beforeEach } from 'vitest';
import { MediaService } from '../../src/services/MediaService';
import { MediaFile } from '../../src/models/MediaFile';

describe('MediaService', () => {
  let mediaService: MediaService;

  beforeEach(() => {
    mediaService = new MediaService();
  });

  describe('getMedia', () => {
    it('should return null for non-existent media', async () => {
      const result = await mediaService.getMedia('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return media file when it exists', async () => {
      // Create a test media file
      const mockMedia = global.testUtils.createMockMediaFile();
      const savedMedia = await MediaFile.create(mockMedia);

      const result = await mediaService.getMedia(savedMedia.id);
      expect(result).toBeTruthy();
      expect(result?.id).toBe(savedMedia.id);
      expect(result?.filename).toBe(mockMedia.filename);
    });
  });

  describe('updateMedia', () => {
    it('should update media metadata', async () => {
      // Create a test media file
      const mockMedia = global.testUtils.createMockMediaFile();
      const savedMedia = await MediaFile.create(mockMedia);

      const updates = {
        'metadata.descriptive.title': 'Updated Title',
        'metadata.descriptive.description': 'Updated Description'
      };

      const result = await mediaService.updateMedia(savedMedia.id, updates);
      expect(result).toBeTruthy();
      expect(result?.metadata.descriptive.title).toBe('Updated Title');
    });

    it('should return null for non-existent media', async () => {
      const result = await mediaService.updateMedia('non-existent-id', {});
      expect(result).toBeNull();
    });
  });

  describe('deleteMedia', () => {
    it('should mark media as deleted', async () => {
      // Create a test media file
      const mockMedia = global.testUtils.createMockMediaFile();
      const savedMedia = await MediaFile.create(mockMedia);

      const result = await mediaService.deleteMedia(savedMedia.id);
      expect(result).toBe(true);

      // Verify media is marked as deleted
      const deletedMedia = await MediaFile.findOne({ id: savedMedia.id });
      expect(deletedMedia?.status).toBe('deleted');
    });

    it('should return false for non-existent media', async () => {
      const result = await mediaService.deleteMedia('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('searchMedia', () => {
    beforeEach(async () => {
      // Create test media files
      const media1 = global.testUtils.createMockMediaFile();
      media1.id = 'media-1';
      media1.cid = 'QmTestCID1';
      media1.ipfsHash = 'QmTestCID1';
      media1.metadata.descriptive.title = 'Sunset Photo';
      media1.metadata.descriptive.tags = ['sunset', 'nature'];
      media1.metadata.descriptive.category = 'photography';

      const media2 = global.testUtils.createMockMediaFile();
      media2.id = 'media-2';
      media2.cid = 'QmTestCID2';
      media2.ipfsHash = 'QmTestCID2';
      media2.metadata.descriptive.title = 'Mountain View';
      media2.metadata.descriptive.tags = ['mountain', 'nature'];
      media2.metadata.descriptive.category = 'photography';

      const media3 = global.testUtils.createMockMediaFile();
      media3.id = 'media-3';
      media3.cid = 'QmTestCID3';
      media3.ipfsHash = 'QmTestCID3';
      media3.metadata.descriptive.title = 'City Lights';
      media3.metadata.descriptive.tags = ['city', 'urban'];
      media3.metadata.descriptive.category = 'urban';
      media3.status = 'deleted'; // This should be excluded

      await MediaFile.create([media1, media2, media3]);
    });

    it('should return all non-deleted media when no query provided', async () => {
      const result = await mediaService.searchMedia('');
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by category', async () => {
      const result = await mediaService.searchMedia('', { category: 'photography' });
      expect(result.results).toHaveLength(2);
      expect(result.results.every(m => m.metadata.descriptive.category === 'photography')).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await mediaService.searchMedia('', { tags: 'nature' });
      expect(result.results).toHaveLength(2);
      expect(result.results.every(m => m.metadata.descriptive.tags.includes('nature'))).toBe(true);
    });

    it('should handle pagination', async () => {
      const result = await mediaService.searchMedia('', {}, { page: 1, limit: 1 });
      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.pages).toBe(2);
    });
  });
});
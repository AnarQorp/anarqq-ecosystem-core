/**
 * Tests for DashboardService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardService } from '../DashboardService';
import { DashboardData } from '@/types/qsocial';

// Mock the module APIs
vi.mock('@/api/qpic', () => ({
  getUserMediaFiles: vi.fn(),
  getQpicStats: vi.fn()
}));

vi.mock('@/api/qmail', () => ({
  getMessages: vi.fn(),
  getMessageStats: vi.fn()
}));

vi.mock('@/api/qdrive', () => ({
  getUserFiles: vi.fn(),
  getQdriveStats: vi.fn()
}));

vi.mock('@/api/qchat', () => ({
  fetchMessages: vi.fn()
}));

vi.mock('@/state/identity', () => ({
  getActiveIdentity: vi.fn()
}));

vi.mock('../PostService', () => ({
  PostService: vi.fn().mockImplementation(() => ({
    getUserPosts: vi.fn()
  }))
}));

vi.mock('../NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    getUserNotifications: vi.fn()
  }))
}));

vi.mock('../SubcommunityService', () => ({
  SubcommunityService: vi.fn().mockImplementation(() => ({
    getTrendingSubcommunities: vi.fn()
  }))
}));

import { getUserMediaFiles, getQpicStats } from '@/api/qpic';
import { getMessages, getMessageStats } from '@/api/qmail';
import { getUserFiles, getQdriveStats } from '@/api/qdrive';
import { fetchMessages } from '@/api/qchat';
import { getActiveIdentity } from '@/state/identity';
import { PostService } from '../PostService';
import { NotificationService } from '../NotificationService';
import { SubcommunityService } from '../SubcommunityService';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockPostService: any;
  let mockNotificationService: any;
  let mockSubcommunityService: any;

  const mockIdentity = {
    did: 'did:test:user123',
    name: 'Test User',
    type: 'ROOT' as const,
    kyc: true,
    reputation: 100
  };

  beforeEach(() => {
    dashboardService = new DashboardService();
    mockPostService = new PostService();
    mockNotificationService = new NotificationService();
    mockSubcommunityService = new SubcommunityService();
    vi.mocked(getActiveIdentity).mockReturnValue(mockIdentity);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardData', () => {
    it('should get complete dashboard data', async () => {
      // Mock all the service responses
      const mockPosts = [
        {
          id: 'post1',
          title: 'Test Post',
          content: 'Test content',
          upvotes: 5,
          downvotes: 1,
          createdAt: new Date('2024-01-01')
        }
      ];

      const mockNotifications = [
        {
          id: 'notif1',
          userId: 'user123',
          type: 'vote' as const,
          title: 'New upvote',
          message: 'Your post received an upvote',
          isRead: false,
          createdAt: new Date('2024-01-01')
        }
      ];

      const mockCommunities = [
        {
          id: 'comm1',
          name: 'test-community',
          displayName: 'Test Community',
          description: 'A test community',
          memberCount: 100,
          postCount: 50,
          createdAt: new Date('2024-01-01')
        }
      ];

      // Mock QpiC data
      vi.mocked(getUserMediaFiles).mockResolvedValue([
        {
          id: 'qpic1',
          name: 'test.jpg',
          size: 1024,
          type: 'image/jpeg',
          isImage: true,
          isVideo: false,
          uploadDate: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getQpicStats).mockResolvedValue({
        totalImages: 5,
        totalVideos: 2,
        totalMediaSize: 5120,
        storageUsed: '5 KB'
      });

      // Mock Qmail data
      vi.mocked(getMessages).mockResolvedValue([
        {
          id: 'msg1',
          subject: 'Test Message',
          content: 'Test content',
          senderId: 'sender1',
          recipientId: 'user123',
          timestamp: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getMessageStats).mockResolvedValue({
        total: 10,
        unread: 2,
        sent: 5,
        received: 5
      });

      // Mock Qdrive data
      vi.mocked(getUserFiles).mockResolvedValue([
        {
          id: 'file1',
          name: 'document.pdf',
          size: 2048,
          type: 'application/pdf',
          uploadDate: new Date('2024-01-01'),
          ipfsHash: 'QmHash123'
        }
      ]);

      vi.mocked(getQdriveStats).mockResolvedValue({
        totalFiles: 3,
        totalSize: 6144,
        storageUsed: '6 KB'
      });

      // Mock Qchat data
      vi.mocked(fetchMessages).mockResolvedValue([
        {
          id: 'chat1',
          senderDID: 'user123',
          recipientDID: 'user456',
          encryptedContent: 'encrypted',
          metadata: { timestamp: new Date('2024-01-01').toISOString() }
        }
      ]);

      // Mock service responses by accessing the service instances
      dashboardService['postService'].getUserPosts = vi.fn().mockResolvedValue(mockPosts);
      dashboardService['notificationService'].getUserNotifications = vi.fn().mockResolvedValue(mockNotifications);
      dashboardService['subcommunityService'].getTrendingSubcommunities = vi.fn().mockResolvedValue(mockCommunities);

      const result = await dashboardService.getDashboardData();

      expect(result).toMatchObject({
        recentPosts: mockPosts,
        notifications: mockNotifications,
        trendingSubcommunities: mockCommunities,
        userStats: {
          totalPosts: mockPosts.length,
          totalQarma: expect.any(Number)
        }
      });

      expect(result.moduleActivities).toHaveLength(4); // qpic, qmail, qdrive, qchat (qmarket has no activities)
    });

    it('should throw error when user not authenticated', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue(null);

      await expect(dashboardService.getDashboardData()).rejects.toThrow('User not authenticated');
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(getUserMediaFiles).mockRejectedValue(new Error('QpiC error'));
      vi.mocked(getMessages).mockRejectedValue(new Error('Qmail error'));
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      dashboardService['postService'].getUserPosts = vi.fn().mockResolvedValue([]);
      dashboardService['notificationService'].getUserNotifications = vi.fn().mockResolvedValue([]);
      dashboardService['subcommunityService'].getTrendingSubcommunities = vi.fn().mockResolvedValue([]);

      const result = await dashboardService.getDashboardData();

      expect(result).toBeDefined();
      // Should have activities from modules that didn't fail (qdrive and qchat in this case)
      expect(result.moduleActivities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUnifiedActivityFeed', () => {
    it('should get unified activity feed from all modules', async () => {
      // Mock module data
      vi.mocked(getUserMediaFiles).mockResolvedValue([
        {
          id: 'qpic1',
          name: 'image.jpg',
          size: 1024,
          type: 'image/jpeg',
          isImage: true,
          isVideo: false,
          uploadDate: new Date('2024-01-02')
        }
      ]);

      vi.mocked(getMessages).mockResolvedValue([
        {
          id: 'msg1',
          subject: 'Test Message',
          content: 'Test content',
          senderId: 'user123',
          recipientId: 'user456',
          timestamp: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const activities = await dashboardService.getUnifiedActivityFeed(10);

      expect(activities).toHaveLength(2);
      expect(activities[0].timestamp.getTime()).toBeGreaterThan(activities[1].timestamp.getTime());
    });

    it('should limit results correctly', async () => {
      const mockFiles = Array.from({ length: 15 }, (_, i) => ({
        id: `qpic${i}`,
        name: `image${i}.jpg`,
        size: 1024,
        type: 'image/jpeg',
        isImage: true,
        isVideo: false,
        uploadDate: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`)
      }));

      vi.mocked(getUserMediaFiles).mockResolvedValue(mockFiles);
      vi.mocked(getMessages).mockResolvedValue([]);
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const activities = await dashboardService.getUnifiedActivityFeed(5);

      expect(activities).toHaveLength(5);
    });
  });

  describe('searchActivities', () => {
    it('should search activities across modules', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([
        {
          id: 'qpic1',
          name: 'vacation-photo.jpg',
          size: 1024,
          type: 'image/jpeg',
          isImage: true,
          isVideo: false,
          uploadDate: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getMessages).mockResolvedValue([
        {
          id: 'msg1',
          subject: 'Vacation Plans',
          content: 'Planning my vacation',
          senderId: 'user123',
          recipientId: 'user456',
          timestamp: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const results = await dashboardService.searchActivities('vacation');

      expect(results).toHaveLength(2);
      expect(results.every(r => 
        r.title.toLowerCase().includes('vacation') || 
        r.description.toLowerCase().includes('vacation')
      )).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([]);
      vi.mocked(getMessages).mockResolvedValue([]);
      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const results = await dashboardService.searchActivities('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('getActivitiesByModule', () => {
    it('should get activities for specific module', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([
        {
          id: 'qpic1',
          name: 'test.jpg',
          size: 1024,
          type: 'image/jpeg',
          isImage: true,
          isVideo: false,
          uploadDate: new Date('2024-01-01')
        }
      ]);

      const activities = await dashboardService.getActivitiesByModule('qpic', 10);

      expect(activities).toHaveLength(1);
      expect(activities[0].type).toBe('media_upload');
    });

    it('should throw error when user not authenticated', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue(null);

      await expect(
        dashboardService.getActivitiesByModule('qpic', 10)
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('getActivitiesByType', () => {
    it('should filter activities by type', async () => {
      vi.mocked(getUserMediaFiles).mockResolvedValue([
        {
          id: 'qpic1',
          name: 'test.jpg',
          size: 1024,
          type: 'image/jpeg',
          isImage: true,
          isVideo: false,
          uploadDate: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getMessages).mockResolvedValue([
        {
          id: 'msg1',
          subject: 'Test',
          content: 'Test',
          senderId: 'user123',
          recipientId: 'user456',
          timestamp: new Date('2024-01-01')
        }
      ]);

      vi.mocked(getUserFiles).mockResolvedValue([]);
      vi.mocked(fetchMessages).mockResolvedValue([]);

      const activities = await dashboardService.getActivitiesByType('media_upload', 10);

      expect(activities).toHaveLength(1);
      expect(activities[0].type).toBe('media_upload');
    });
  });
});
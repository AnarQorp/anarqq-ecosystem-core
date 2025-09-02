/**
 * Dashboard service for aggregating activities from all AnarQ modules
 * Provides unified view of user activities across the ecosystem
 */

import { 
  DashboardData, 
  ModuleActivity, 
  ActivityItem, 
  SourceModule,
  QsocialPost,
  QsocialNotification
} from '@/types/qsocial';
import { getActiveIdentity } from '@/state/identity';
import { PostService } from './PostService';
import { NotificationService } from './NotificationService';
import { SubcommunityService } from './SubcommunityService';

// Import module APIs
import { getUserMediaFiles, getQpicStats } from '@/api/qpic';
import { getMessages, getMessageStats } from '@/api/qmail';
import { getUserFiles, getQdriveStats } from '@/api/qdrive';
import { fetchMessages } from '@/api/qchat';

/**
 * Module activity aggregator interface
 */
interface ModuleActivityAggregator {
  getRecentActivity(userId: string, limit?: number): Promise<ActivityItem[]>;
  getModuleStats(userId: string): Promise<Record<string, any>>;
}

/**
 * QpiC activity aggregator
 */
class QpicActivityAggregator implements ModuleActivityAggregator {
  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityItem[]> {
    try {
      const mediaFiles = await getUserMediaFiles();
      
      return mediaFiles
        .slice(0, limit)
        .map(file => ({
          id: file.id,
          type: 'media_upload',
          title: `Uploaded ${file.isImage ? 'image' : 'video'}`,
          description: `${file.name} (${this.formatFileSize(file.size)})`,
          url: `/qpic/media/${file.id}`,
          timestamp: new Date(file.uploadDate),
          metadata: {
            fileType: file.type,
            size: file.size,
            isImage: file.isImage,
            isVideo: file.isVideo,
            thumbnail: file.thumbnail
          }
        }));
    } catch (error) {
      console.error('Error fetching QpiC activity:', error);
      return [];
    }
  }

  async getModuleStats(userId: string): Promise<Record<string, any>> {
    try {
      return await getQpicStats();
    } catch (error) {
      console.error('Error fetching QpiC stats:', error);
      return {};
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Qmail activity aggregator
 */
class QmailActivityAggregator implements ModuleActivityAggregator {
  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityItem[]> {
    try {
      const messages = await getMessages(userId);
      
      return messages
        .slice(0, limit)
        .map(message => ({
          id: message.id,
          type: message.senderId === userId ? 'message_sent' : 'message_received',
          title: message.senderId === userId ? 'Sent message' : 'Received message',
          description: `${message.subject} - ${message.content.substring(0, 100)}...`,
          url: `/qmail/message/${message.id}`,
          timestamp: message.timestamp,
          metadata: {
            subject: message.subject,
            senderId: message.senderId,
            recipientId: message.recipientId,
            encryptionLevel: message.encryptionLevel,
            priority: message.priority
          }
        }));
    } catch (error) {
      console.error('Error fetching Qmail activity:', error);
      return [];
    }
  }

  async getModuleStats(userId: string): Promise<Record<string, any>> {
    try {
      return await getMessageStats(userId);
    } catch (error) {
      console.error('Error fetching Qmail stats:', error);
      return {};
    }
  }
}

/**
 * Qdrive activity aggregator
 */
class QdriveActivityAggregator implements ModuleActivityAggregator {
  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityItem[]> {
    try {
      const files = await getUserFiles();
      
      return files
        .slice(0, limit)
        .map(file => ({
          id: file.id,
          type: 'file_upload',
          title: 'Uploaded file',
          description: `${file.name} (${this.formatFileSize(file.size)})`,
          url: `/qdrive/file/${file.id}`,
          timestamp: file.uploadDate,
          metadata: {
            fileName: file.name,
            fileType: file.type,
            size: file.size,
            ipfsHash: file.ipfsHash,
            encrypted: !!file.encryptedHash
          }
        }));
    } catch (error) {
      console.error('Error fetching Qdrive activity:', error);
      return [];
    }
  }

  async getModuleStats(userId: string): Promise<Record<string, any>> {
    try {
      return await getQdriveStats();
    } catch (error) {
      console.error('Error fetching Qdrive stats:', error);
      return {};
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Qchat activity aggregator
 */
class QchatActivityAggregator implements ModuleActivityAggregator {
  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityItem[]> {
    try {
      const messages = await fetchMessages({ limit });
      
      return messages
        .slice(0, limit)
        .map((message: any, index: number) => ({
          id: message.id || `chat-${index}`,
          type: message.senderDID === userId ? 'chat_sent' : 'chat_received',
          title: message.senderDID === userId ? 'Sent chat message' : 'Received chat message',
          description: 'Encrypted chat message',
          url: `/qchat/message/${message.id || index}`,
          timestamp: new Date(message.metadata?.timestamp || Date.now()),
          metadata: {
            senderDID: message.senderDID,
            recipientDID: message.recipientDID,
            encrypted: true
          }
        }));
    } catch (error) {
      console.error('Error fetching Qchat activity:', error);
      return [];
    }
  }

  async getModuleStats(userId: string): Promise<Record<string, any>> {
    try {
      const messages = await fetchMessages();
      return {
        totalMessages: messages.length,
        lastActivity: messages.length > 0 ? new Date(messages[0].metadata?.timestamp || Date.now()) : null
      };
    } catch (error) {
      console.error('Error fetching Qchat stats:', error);
      return {};
    }
  }
}

/**
 * Qmarket activity aggregator (placeholder)
 */
class QmarketActivityAggregator implements ModuleActivityAggregator {
  async getRecentActivity(userId: string, limit: number = 10): Promise<ActivityItem[]> {
    // Placeholder - would integrate with actual Qmarket API when available
    return [];
  }

  async getModuleStats(userId: string): Promise<Record<string, any>> {
    // Placeholder - would integrate with actual Qmarket API when available
    return {
      totalItems: 0,
      totalSales: 0,
      totalEarnings: 0
    };
  }
}

/**
 * Main dashboard service
 */
export class DashboardService {
  private aggregators: Record<SourceModule, ModuleActivityAggregator>;
  private postService: PostService;
  private notificationService: NotificationService;
  private subcommunityService: SubcommunityService;

  constructor() {
    this.aggregators = {
      qpic: new QpicActivityAggregator(),
      qmail: new QmailActivityAggregator(),
      qdrive: new QdriveActivityAggregator(),
      qchat: new QchatActivityAggregator(),
      qmarket: new QmarketActivityAggregator()
    };
    
    this.postService = new PostService();
    this.notificationService = new NotificationService();
    this.subcommunityService = new SubcommunityService();
  }

  /**
   * Get complete dashboard data for a user
   */
  async getDashboardData(): Promise<DashboardData> {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      throw new Error('User not authenticated');
    }

    const userId = activeIdentity.did;

    try {
      // Fetch data in parallel
      const [
        recentPosts,
        moduleActivities,
        notifications,
        trendingSubcommunities,
        userStats
      ] = await Promise.all([
        this.getRecentPosts(userId),
        this.getModuleActivities(userId),
        this.getNotifications(userId),
        this.getTrendingSubcommunities(),
        this.getUserStats(userId)
      ]);

      return {
        recentPosts,
        moduleActivities,
        notifications,
        trendingSubcommunities,
        userStats
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to load dashboard data');
    }
  }

  /**
   * Get recent posts from Qsocial
   */
  private async getRecentPosts(userId: string, limit: number = 10): Promise<QsocialPost[]> {
    try {
      return await this.postService.getUserPosts(userId, { limit, sortBy: 'newest' });
    } catch (error) {
      console.error('Error fetching recent posts:', error);
      return [];
    }
  }

  /**
   * Get activities from all modules
   */
  private async getModuleActivities(userId: string): Promise<ModuleActivity[]> {
    const modules: SourceModule[] = ['qpic', 'qmail', 'qdrive', 'qchat', 'qmarket'];
    const moduleNames = {
      qpic: 'QpiC Media',
      qmail: 'Qmail Messages',
      qdrive: 'Qdrive Files',
      qchat: 'Qchat Conversations',
      qmarket: 'Qmarket Items'
    };

    const activities = await Promise.all(
      modules.map(async (moduleId) => {
        try {
          const aggregator = this.aggregators[moduleId];
          const activities = await aggregator.getRecentActivity(userId, 5);
          
          return {
            moduleId,
            moduleName: moduleNames[moduleId],
            activities,
            lastUpdated: new Date()
          };
        } catch (error) {
          console.error(`Error fetching ${moduleId} activities:`, error);
          return {
            moduleId,
            moduleName: moduleNames[moduleId],
            activities: [],
            lastUpdated: new Date()
          };
        }
      })
    );

    // Filter out modules with no activities for cleaner display
    return activities.filter(activity => activity.activities.length > 0);
  }

  /**
   * Get user notifications
   */
  private async getNotifications(userId: string, limit: number = 10): Promise<QsocialNotification[]> {
    try {
      return await this.notificationService.getUserNotifications(userId, { limit, unreadOnly: false });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get trending subcommunities
   */
  private async getTrendingSubcommunities(limit: number = 5) {
    try {
      return await this.subcommunityService.getTrendingSubcommunities();
    } catch (error) {
      console.error('Error fetching trending subcommunities:', error);
      return [];
    }
  }

  /**
   * Get user statistics
   */
  private async getUserStats(userId: string) {
    try {
      // Get stats from various services
      const [posts, moduleStats] = await Promise.all([
        this.postService.getUserPosts(userId, { limit: 1000 }), // Get all posts for counting
        this.getModuleStats(userId)
      ]);

      // Calculate Qsocial stats
      const totalPosts = posts.length;
      const totalComments = 0; // Would need to implement comment counting
      const totalQarma = posts.reduce((sum, post) => sum + (post.upvotes - post.downvotes), 0);
      const joinedCommunities = 0; // Would need to implement community membership counting

      return {
        totalPosts,
        totalComments,
        totalQarma,
        joinedCommunities,
        moduleStats
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalPosts: 0,
        totalComments: 0,
        totalQarma: 0,
        joinedCommunities: 0,
        moduleStats: {}
      };
    }
  }

  /**
   * Get statistics from all modules
   */
  private async getModuleStats(userId: string): Promise<Record<SourceModule, any>> {
    const modules: SourceModule[] = ['qpic', 'qmail', 'qdrive', 'qchat', 'qmarket'];
    const stats: Record<SourceModule, any> = {} as any;

    await Promise.all(
      modules.map(async (moduleId) => {
        try {
          const aggregator = this.aggregators[moduleId];
          stats[moduleId] = await aggregator.getModuleStats(userId);
        } catch (error) {
          console.error(`Error fetching ${moduleId} stats:`, error);
          stats[moduleId] = {};
        }
      })
    );

    return stats;
  }

  /**
   * Get activity feed combining all modules
   */
  async getUnifiedActivityFeed(limit: number = 20): Promise<ActivityItem[]> {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      throw new Error('User not authenticated');
    }

    const userId = activeIdentity.did;
    const modules: SourceModule[] = ['qpic', 'qmail', 'qdrive', 'qchat', 'qmarket'];
    
    // Get activities from all modules
    const allActivities: ActivityItem[] = [];
    
    await Promise.all(
      modules.map(async (moduleId) => {
        try {
          const aggregator = this.aggregators[moduleId];
          const activities = await aggregator.getRecentActivity(userId, limit);
          allActivities.push(...activities);
        } catch (error) {
          console.error(`Error fetching ${moduleId} activities:`, error);
        }
      })
    );

    // Sort by timestamp (newest first) and limit results
    return allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Search activities across all modules
   */
  async searchActivities(query: string, limit: number = 50): Promise<ActivityItem[]> {
    const allActivities = await this.getUnifiedActivityFeed(1000); // Get more for searching
    
    const lowerQuery = query.toLowerCase();
    
    return allActivities
      .filter(activity => 
        activity.title.toLowerCase().includes(lowerQuery) ||
        activity.description.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(type: string, limit: number = 20): Promise<ActivityItem[]> {
    const allActivities = await this.getUnifiedActivityFeed(1000);
    
    return allActivities
      .filter(activity => activity.type === type)
      .slice(0, limit);
  }

  /**
   * Get activities by module
   */
  async getActivitiesByModule(moduleId: SourceModule, limit: number = 20): Promise<ActivityItem[]> {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      throw new Error('User not authenticated');
    }

    const aggregator = this.aggregators[moduleId];
    return await aggregator.getRecentActivity(activeIdentity.did, limit);
  }
}
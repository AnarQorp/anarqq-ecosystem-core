/**
 * Cross-posting service for integrating content from other AnarQ modules
 * Handles content import, preview generation, and attribution
 */

import { 
  QsocialPost, 
  CreatePostRequest, 
  SourceModule, 
  ContentType, 
  PrivacyLevel,
  CrossPostOptions 
} from '@/types/qsocial';
import { PostService } from './PostService';
import { getActiveIdentity } from '@/state/identity';

// Import module APIs
import { QpicFile, getUserMediaFiles } from '@/api/qpic';
import { Message, getMessages } from '@/api/qmail';
import { QmarketItem } from '@/modules/qmarket/types';
import { QdriveFile, getUserFiles } from '@/api/qdrive';
import { fetchMessages } from '@/api/qchat';

/**
 * Interface for cross-post content data
 */
export interface CrossPostContent {
  id: string;
  title: string;
  description: string;
  contentType: string;
  sourceModule: SourceModule;
  sourceData: any;
  previewData: CrossPostPreview;
  attribution: ContentAttribution;
}

/**
 * Preview data for cross-posted content
 */
export interface CrossPostPreview {
  thumbnail?: string;
  snippet: string;
  metadata: Record<string, any>;
  mediaType?: 'image' | 'video' | 'document' | 'message' | 'item';
}

/**
 * Attribution information for cross-posted content
 */
export interface ContentAttribution {
  originalModule: SourceModule;
  originalId: string;
  originalUrl: string;
  originalAuthor?: string;
  originalTimestamp: Date;
}

/**
 * Module content adapter interface
 */
interface ModuleAdapter {
  getContent(userId: string): Promise<any[]>;
  transformToPreview(item: any): CrossPostPreview;
  generateAttribution(item: any): ContentAttribution;
  createCrossPostData(item: any, options: CrossPostOptions): CreatePostRequest;
}

/**
 * QpiC module adapter
 */
class QpicAdapter implements ModuleAdapter {
  async getContent(userId: string): Promise<QpicFile[]> {
    return await getUserMediaFiles();
  }

  transformToPreview(file: QpicFile): CrossPostPreview {
    return {
      thumbnail: file.thumbnail,
      snippet: `${file.isImage ? 'Image' : 'Video'}: ${file.name}`,
      metadata: {
        size: file.size,
        type: file.type,
        dimensions: file.dimensions,
        duration: file.duration
      },
      mediaType: file.isImage ? 'image' : 'video'
    };
  }

  generateAttribution(file: QpicFile): ContentAttribution {
    return {
      originalModule: 'qpic',
      originalId: file.id,
      originalUrl: `/qpic/media/${file.id}`,
      originalTimestamp: new Date(file.uploadDate)
    };
  }

  createCrossPostData(file: QpicFile, options: CrossPostOptions): CreatePostRequest {
    return {
      title: options.title || `Shared from QpiC: ${file.name}`,
      content: options.additionalContent || `Check out this ${file.isImage ? 'image' : 'video'} I uploaded to QpiC!`,
      contentType: ContentType.CROSS_POST,
      sourceModule: 'qpic',
      sourceId: file.id,
      sourceData: file,
      subcommunityId: options.subcommunityId,
      tags: options.tags || ['qpic', 'media'],
      privacyLevel: options.privacyLevel || PrivacyLevel.PUBLIC
    };
  }
}

/**
 * Qmail module adapter
 */
class QmailAdapter implements ModuleAdapter {
  async getContent(userId: string): Promise<Message[]> {
    return await getMessages(userId);
  }

  transformToPreview(message: Message): CrossPostPreview {
    return {
      snippet: `Message: ${message.subject} - ${message.content.substring(0, 100)}...`,
      metadata: {
        subject: message.subject,
        encryptionLevel: message.encryptionLevel,
        priority: message.priority,
        attachments: message.attachments?.length || 0
      },
      mediaType: 'message'
    };
  }

  generateAttribution(message: Message): ContentAttribution {
    return {
      originalModule: 'qmail',
      originalId: message.id,
      originalUrl: `/qmail/message/${message.id}`,
      originalAuthor: message.senderIdentityId,
      originalTimestamp: message.timestamp
    };
  }

  createCrossPostData(message: Message, options: CrossPostOptions): CreatePostRequest {
    return {
      title: options.title || `Shared from Qmail: ${message.subject}`,
      content: options.additionalContent || `Sharing an interesting message thread from Qmail:\n\n"${message.content.substring(0, 200)}..."`,
      contentType: ContentType.CROSS_POST,
      sourceModule: 'qmail',
      sourceId: message.id,
      sourceData: message,
      subcommunityId: options.subcommunityId,
      tags: options.tags || ['qmail', 'message'],
      privacyLevel: options.privacyLevel || PrivacyLevel.COMMUNITY
    };
  }
}

/**
 * Qmarket module adapter
 */
class QmarketAdapter implements ModuleAdapter {
  async getContent(userId: string): Promise<QmarketItem[]> {
    // Note: This would need to be implemented in the qmarket API
    // For now, returning empty array as placeholder
    return [];
  }

  transformToPreview(item: QmarketItem): CrossPostPreview {
    return {
      snippet: `Marketplace Item: ${item.metadata.title} - ${item.metadata.description?.substring(0, 100)}...`,
      metadata: {
        price: item.metadata.price,
        license: item.metadata.license,
        tags: item.metadata.tags,
        contentType: item.content.type,
        size: item.content.size
      },
      mediaType: 'item'
    };
  }

  generateAttribution(item: QmarketItem): ContentAttribution {
    return {
      originalModule: 'qmarket',
      originalId: item.cid,
      originalUrl: `/qmarket/item/${item.cid}`,
      originalAuthor: item.publisher.did,
      originalTimestamp: new Date(item.metadata.createdAt)
    };
  }

  createCrossPostData(item: QmarketItem, options: CrossPostOptions): CreatePostRequest {
    return {
      title: options.title || `Check out this item on Qmarket: ${item.metadata.title}`,
      content: options.additionalContent || `I found this interesting item on Qmarket:\n\n${item.metadata.description}\n\nPrice: ${item.metadata.price === 0 ? 'Free' : `${item.metadata.price} tokens`}`,
      contentType: ContentType.CROSS_POST,
      sourceModule: 'qmarket',
      sourceId: item.cid,
      sourceData: item,
      subcommunityId: options.subcommunityId,
      tags: options.tags || ['qmarket', 'marketplace', ...(item.metadata.tags || [])],
      privacyLevel: options.privacyLevel || PrivacyLevel.PUBLIC
    };
  }
}

/**
 * Qdrive module adapter
 */
class QdriveAdapter implements ModuleAdapter {
  async getContent(userId: string): Promise<QdriveFile[]> {
    return await getUserFiles();
  }

  transformToPreview(file: QdriveFile): CrossPostPreview {
    return {
      snippet: `File: ${file.name} (${this.formatFileSize(file.size)})`,
      metadata: {
        size: file.size,
        type: file.type,
        encrypted: !!file.encryptedHash,
        ipfsHash: file.ipfsHash
      },
      mediaType: 'document'
    };
  }

  generateAttribution(file: QdriveFile): ContentAttribution {
    return {
      originalModule: 'qdrive',
      originalId: file.id,
      originalUrl: `/qdrive/file/${file.id}`,
      originalTimestamp: file.uploadDate
    };
  }

  createCrossPostData(file: QdriveFile, options: CrossPostOptions): CreatePostRequest {
    return {
      title: options.title || `Shared from Qdrive: ${file.name}`,
      content: options.additionalContent || `Check out this file I uploaded to Qdrive!\n\nFile: ${file.name}\nSize: ${this.formatFileSize(file.size)}\nType: ${file.type}`,
      contentType: ContentType.CROSS_POST,
      sourceModule: 'qdrive',
      sourceId: file.id,
      sourceData: file,
      subcommunityId: options.subcommunityId,
      tags: options.tags || ['qdrive', 'file-sharing'],
      privacyLevel: options.privacyLevel || PrivacyLevel.PUBLIC
    };
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
 * Qchat module adapter
 */
class QchatAdapter implements ModuleAdapter {
  async getContent(userId: string): Promise<any[]> {
    return await fetchMessages();
  }

  transformToPreview(message: any): CrossPostPreview {
    return {
      snippet: `Chat Message: ${message.encryptedContent?.substring(0, 100)}...`,
      metadata: {
        senderDID: message.senderDID,
        recipientDID: message.recipientDID,
        encrypted: true
      },
      mediaType: 'message'
    };
  }

  generateAttribution(message: any): ContentAttribution {
    return {
      originalModule: 'qchat',
      originalId: message.id || 'unknown',
      originalUrl: `/qchat/message/${message.id}`,
      originalAuthor: message.senderDID,
      originalTimestamp: new Date(message.metadata?.timestamp || Date.now())
    };
  }

  createCrossPostData(message: any, options: CrossPostOptions): CreatePostRequest {
    return {
      title: options.title || 'Shared from Qchat',
      content: options.additionalContent || 'Sharing an interesting conversation from Qchat (content encrypted)',
      contentType: ContentType.CROSS_POST,
      sourceModule: 'qchat',
      sourceId: message.id || 'unknown',
      sourceData: message,
      subcommunityId: options.subcommunityId,
      tags: options.tags || ['qchat', 'conversation'],
      privacyLevel: options.privacyLevel || PrivacyLevel.PRIVATE
    };
  }
}

/**
 * Main cross-posting service
 */
export class CrossPostService {
  private adapters: Record<SourceModule, ModuleAdapter>;
  private postService: PostService;

  constructor() {
    this.adapters = {
      qpic: new QpicAdapter(),
      qmail: new QmailAdapter(),
      qmarket: new QmarketAdapter(),
      qdrive: new QdriveAdapter(),
      qchat: new QchatAdapter()
    };
    this.postService = new PostService();
  }

  /**
   * Get available content from a specific module
   */
  async getModuleContent(module: SourceModule): Promise<CrossPostContent[]> {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      throw new Error('User not authenticated');
    }

    const adapter = this.adapters[module];
    const content = await adapter.getContent(activeIdentity.did);

    return content.map(item => ({
      id: item.id || item.cid || 'unknown',
      title: this.extractTitle(item, module),
      description: this.extractDescription(item, module),
      contentType: this.extractContentType(item, module),
      sourceModule: module,
      sourceData: item,
      previewData: adapter.transformToPreview(item),
      attribution: adapter.generateAttribution(item)
    }));
  }

  /**
   * Get content from all modules
   */
  async getAllModuleContent(): Promise<Record<SourceModule, CrossPostContent[]>> {
    const modules: SourceModule[] = ['qpic', 'qmail', 'qmarket', 'qdrive', 'qchat'];
    const results: Record<SourceModule, CrossPostContent[]> = {} as any;

    await Promise.all(
      modules.map(async (module) => {
        try {
          results[module] = await this.getModuleContent(module);
        } catch (error) {
          console.error(`Error fetching content from ${module}:`, error);
          results[module] = [];
        }
      })
    );

    return results;
  }

  /**
   * Create a cross-post from module content
   */
  async createCrossPost(
    module: SourceModule,
    contentId: string,
    options: CrossPostOptions = {}
  ): Promise<QsocialPost> {
    const activeIdentity = getActiveIdentity();
    if (!activeIdentity) {
      throw new Error('User not authenticated');
    }

    // Get the specific content item
    const moduleContent = await this.getModuleContent(module);
    const contentItem = moduleContent.find(item => item.id === contentId);
    
    if (!contentItem) {
      throw new Error(`Content not found in ${module} with ID: ${contentId}`);
    }

    // Create the cross-post data
    const adapter = this.adapters[module];
    const postData = adapter.createCrossPostData(contentItem.sourceData, options);

    // Create the post using PostService
    return await this.postService.createPost(postData);
  }

  /**
   * Get preview data for content before cross-posting
   */
  async getContentPreview(module: SourceModule, contentId: string): Promise<CrossPostPreview> {
    const moduleContent = await this.getModuleContent(module);
    const contentItem = moduleContent.find(item => item.id === contentId);
    
    if (!contentItem) {
      throw new Error(`Content not found in ${module} with ID: ${contentId}`);
    }

    return contentItem.previewData;
  }

  /**
   * Search content across all modules
   */
  async searchContent(query: string): Promise<CrossPostContent[]> {
    const allContent = await this.getAllModuleContent();
    const results: CrossPostContent[] = [];

    Object.values(allContent).forEach(moduleContent => {
      const filtered = moduleContent.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.previewData.snippet.toLowerCase().includes(query.toLowerCase())
      );
      results.push(...filtered);
    });

    // Sort by relevance (simple scoring based on title matches)
    return results.sort((a, b) => {
      const aScore = a.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 1;
      const bScore = b.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 1;
      return bScore - aScore;
    });
  }

  /**
   * Extract title from content item based on module
   */
  private extractTitle(item: any, module: SourceModule): string {
    switch (module) {
      case 'qpic':
      case 'qdrive':
        return item.name || 'Untitled File';
      case 'qmail':
        return item.subject || 'No Subject';
      case 'qmarket':
        return item.metadata?.title || 'Untitled Item';
      case 'qchat':
        return 'Chat Message';
      default:
        return 'Untitled Content';
    }
  }

  /**
   * Extract description from content item based on module
   */
  private extractDescription(item: any, module: SourceModule): string {
    switch (module) {
      case 'qpic':
        return `${item.isImage ? 'Image' : 'Video'} file (${this.formatFileSize(item.size)})`;
      case 'qdrive':
        return `File: ${item.type} (${this.formatFileSize(item.size)})`;
      case 'qmail':
        return item.content?.substring(0, 200) + '...' || 'No content';
      case 'qmarket':
        return item.metadata?.description || 'No description';
      case 'qchat':
        return 'Encrypted chat message';
      default:
        return 'No description available';
    }
  }

  /**
   * Extract content type from item based on module
   */
  private extractContentType(item: any, module: SourceModule): string {
    switch (module) {
      case 'qpic':
        return item.type || 'media';
      case 'qdrive':
        return item.type || 'file';
      case 'qmail':
        return 'message';
      case 'qmarket':
        return item.content?.type || 'item';
      case 'qchat':
        return 'chat-message';
      default:
        return 'unknown';
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
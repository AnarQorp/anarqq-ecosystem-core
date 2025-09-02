import { 
  QsocialPost, 
  CreatePostRequest, 
  UpdatePostRequest, 
  FeedOptions, 
  CrossPostOptions,
  VoteResult,
  ContentType,
  PrivacyLevel,
  ModerationStatus,
  QsocialFileAttachment
} from '../../types/qsocial';
import {
  validateCreatePostRequest,
  validateUpdatePostRequest,
  validateFeedOptions,
  validateCrossPostOptions,
  safeValidateCreatePostRequest,
  safeValidateUpdatePostRequest
} from '../../types/qsocial-validation';
import { getActiveIdentity } from '../../state/identity';
import { PostService as PostAPI } from '../../api/qsocial';
import { QsocialStorageService } from './QsocialStorageService';

/**
 * Content sanitization utilities
 */
export class ContentSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(content: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '');
  }

  /**
   * Sanitize text content
   */
  static sanitizeText(content: string): string {
    // Remove null bytes and control characters except newlines and tabs
    return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsedUrl.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize tags
   */
  static sanitizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .filter(tag => /^[a-zA-Z0-9_-]+$/.test(tag))
      .slice(0, 10); // Max 10 tags
  }
}

/**
 * Post validation utilities
 */
export class PostValidator {
  /**
   * Validate post content based on type
   */
  static validateContentByType(content: string, contentType: ContentType): void {
    switch (contentType) {
      case ContentType.TEXT:
        if (content.length > 50000) {
          throw new Error('Text content exceeds maximum length');
        }
        break;
      case ContentType.LINK:
        // For link posts, content should be a valid URL or description
        if (content.length > 10000) {
          throw new Error('Link description exceeds maximum length');
        }
        break;
      case ContentType.MEDIA:
        // Media posts can have descriptions
        if (content.length > 10000) {
          throw new Error('Media description exceeds maximum length');
        }
        break;
      case ContentType.CROSS_POST:
        // Cross-posts can have additional content
        if (content.length > 10000) {
          throw new Error('Cross-post content exceeds maximum length');
        }
        break;
    }
  }

  /**
   * Validate post title
   */
  static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Post title is required');
    }
    if (title.length > 300) {
      throw new Error('Post title exceeds maximum length');
    }
  }

  /**
   * Check if user can create posts in subcommunity
   */
  static async validateSubcommunityAccess(subcommunityId?: string): Promise<void> {
    if (!subcommunityId) return;
    
    // TODO: Implement subcommunity access validation
    // This would check if user is member, has required karma, etc.
    // For now, we'll just validate the ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(subcommunityId)) {
      throw new Error('Invalid subcommunity ID format');
    }
  }
}

/**
 * Enhanced PostService with validation and sanitization
 */
export class PostService {
  /**
   * Create a new post with validation and sanitization
   */
  static async createPost(postData: CreatePostRequest): Promise<QsocialPost> {
    // Validate input data
    const validationResult = safeValidateCreatePostRequest(postData);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedData = validationResult.data;

    // Additional business logic validation
    PostValidator.validateTitle(validatedData.title);
    PostValidator.validateContentByType(validatedData.content, validatedData.contentType);
    await PostValidator.validateSubcommunityAccess(validatedData.subcommunityId);

    // Get current identity for storage
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found. Please login first.');
    }

    // Sanitize content
    const sanitizedPost: CreatePostRequest = {
      ...validatedData,
      title: ContentSanitizer.sanitizeText(validatedData.title.trim()),
      content: validatedData.contentType === ContentType.TEXT 
        ? ContentSanitizer.sanitizeHtml(validatedData.content)
        : ContentSanitizer.sanitizeText(validatedData.content),
      tags: validatedData.tags ? ContentSanitizer.sanitizeTags(validatedData.tags) : [],
      privacyLevel: validatedData.privacyLevel || PrivacyLevel.PUBLIC,
    };

    // Create temporary post object for storage
    const tempPost = {
      authorId: identity.did,
      title: sanitizedPost.title,
      content: sanitizedPost.content,
      contentType: sanitizedPost.contentType,
      privacyLevel: sanitizedPost.privacyLevel,
      subcommunityId: sanitizedPost.subcommunityId,
      tags: sanitizedPost.tags || [],
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
      isPinned: false,
      isLocked: false,
      moderationStatus: ModerationStatus.APPROVED,
      sourceModule: sanitizedPost.sourceModule,
      sourceId: sanitizedPost.sourceId,
      sourceData: sanitizedPost.sourceData,
    };

    // Store content to IPFS
    try {
      const storageResult = await QsocialStorageService.storePostContent(tempPost);
      
      // Add IPFS hash to post data
      const postWithStorage = {
        ...sanitizedPost,
        ipfsHash: storageResult.ipfsHash,
      };

      // Create post via API
      const createdPost = await PostAPI.createPost(postWithStorage);
      
      console.log(`[PostService] Post created successfully with IPFS storage. ID: ${createdPost.id}, Hash: ${storageResult.ipfsHash}`);
      
      return createdPost;
    } catch (storageError) {
      console.error('Failed to store post content:', storageError);
      
      // If storage fails, still try to create the post without IPFS hash
      // The content will be stored in the database as fallback
      console.warn('[PostService] Creating post without IPFS storage due to storage failure');
      
      try {
        const createdPost = await PostAPI.createPost(sanitizedPost);
        return createdPost;
      } catch (apiError) {
        console.error('Failed to create post:', apiError);
        throw new Error('Failed to create post. Please try again.');
      }
    }
  }

  /**
   * Get a post by ID with content retrieval from IPFS if needed
   */
  static async getPost(id: string): Promise<QsocialPost> {
    if (!id || id.trim().length === 0) {
      throw new Error('Post ID is required');
    }

    try {
      const post = await PostAPI.getPost(id);
      
      // If post has IPFS hash, try to retrieve content from IPFS
      if (post.ipfsHash && post.ipfsHash !== '') {
        try {
          const retrievedContent = await this.retrievePostContentFromIPFS(post);
          if (retrievedContent.verified) {
            // Use IPFS content if verification passes
            return {
              ...post,
              content: retrievedContent.content
            };
          } else {
            console.warn(`[PostService] Content verification failed for post ${id}, using database content`);
          }
        } catch (ipfsError) {
          console.warn(`[PostService] Failed to retrieve content from IPFS for post ${id}, using database content:`, ipfsError);
        }
      }
      
      return post;
    } catch (error) {
      console.error('Failed to get post:', error);
      throw new Error('Failed to retrieve post');
    }
  }

  /**
   * Retrieve post content from IPFS
   */
  static async retrievePostContentFromIPFS(post: QsocialPost): Promise<{
    content: string;
    verified: boolean;
  }> {
    if (!post.ipfsHash) {
      throw new Error('Post has no IPFS hash');
    }

    try {
      // Check if it's a fallback storage key
      if (post.ipfsHash.startsWith('fallback:')) {
        const fallbackKey = post.ipfsHash.replace('fallback:', '');
        const isEncrypted = post.privacyLevel !== PrivacyLevel.PUBLIC;
        const result = await QsocialStorageService.retrieveFallbackContent(fallbackKey, isEncrypted);
        return {
          content: result.content,
          verified: result.verified
        };
      }

      // Determine if content is encrypted based on privacy level
      const isEncrypted = post.privacyLevel !== PrivacyLevel.PUBLIC;
      const result = await QsocialStorageService.retrieveContent(post.ipfsHash, isEncrypted);
      
      return {
        content: result.content,
        verified: result.verified
      };
    } catch (error) {
      console.error(`[PostService] Error retrieving content from IPFS for post ${post.id}:`, error);
      throw error;
    }
  }

  /**
   * Update a post with validation and sanitization
   */
  static async updatePost(id: string, updates: UpdatePostRequest): Promise<QsocialPost> {
    if (!id || id.trim().length === 0) {
      throw new Error('Post ID is required');
    }

    // Validate input data
    const validationResult = safeValidateUpdatePostRequest(updates);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedUpdates = validationResult.data;

    // Additional validation
    if (validatedUpdates.title) {
      PostValidator.validateTitle(validatedUpdates.title);
    }

    // Sanitize content
    const sanitizedUpdates: UpdatePostRequest = {
      ...validatedUpdates,
    };

    if (validatedUpdates.title) {
      sanitizedUpdates.title = ContentSanitizer.sanitizeText(validatedUpdates.title.trim());
    }

    if (validatedUpdates.content) {
      sanitizedUpdates.content = ContentSanitizer.sanitizeHtml(validatedUpdates.content);
    }

    if (validatedUpdates.tags) {
      sanitizedUpdates.tags = ContentSanitizer.sanitizeTags(validatedUpdates.tags);
    }

    try {
      return await PostAPI.updatePost(id, sanitizedUpdates);
    } catch (error) {
      console.error('Failed to update post:', error);
      throw new Error('Failed to update post. Please try again.');
    }
  }

  /**
   * Delete a post
   */
  static async deletePost(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new Error('Post ID is required');
    }

    try {
      await PostAPI.deletePost(id);
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw new Error('Failed to delete post. Please try again.');
    }
  }

  /**
   * Get main feed with validation
   */
  static async getFeed(options: FeedOptions = {}): Promise<QsocialPost[]> {
    // Validate options
    const validatedOptions = validateFeedOptions(options);

    try {
      return await PostAPI.getFeed(validatedOptions);
    } catch (error) {
      console.error('Failed to get feed:', error);
      throw new Error('Failed to retrieve feed');
    }
  }

  /**
   * Get subcommunity feed with validation
   */
  static async getSubcommunityFeed(subcommunityId: string, options: FeedOptions = {}): Promise<QsocialPost[]> {
    if (!subcommunityId || subcommunityId.trim().length === 0) {
      throw new Error('Subcommunity ID is required');
    }

    // Validate options
    const validatedOptions = validateFeedOptions(options);

    try {
      return await PostAPI.getSubcommunityFeed(subcommunityId, validatedOptions);
    } catch (error) {
      console.error('Failed to get subcommunity feed:', error);
      throw new Error('Failed to retrieve subcommunity feed');
    }
  }

  /**
   * Get user posts with validation
   */
  static async getUserPosts(userId: string, options: FeedOptions = {}): Promise<QsocialPost[]> {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Validate options
    const validatedOptions = validateFeedOptions(options);

    try {
      return await PostAPI.getUserPosts(userId, validatedOptions);
    } catch (error) {
      console.error('Failed to get user posts:', error);
      throw new Error('Failed to retrieve user posts');
    }
  }

  /**
   * Create cross-post with validation
   */
  static async createCrossPost(sourceModule: string, sourceId: string, options: CrossPostOptions): Promise<QsocialPost> {
    if (!sourceModule || sourceModule.trim().length === 0) {
      throw new Error('Source module is required');
    }
    if (!sourceId || sourceId.trim().length === 0) {
      throw new Error('Source ID is required');
    }

    // Validate options
    const validatedOptions = validateCrossPostOptions(options);

    // Sanitize optional content
    const sanitizedOptions: CrossPostOptions = {
      ...validatedOptions,
    };

    if (validatedOptions.title) {
      sanitizedOptions.title = ContentSanitizer.sanitizeText(validatedOptions.title.trim());
    }

    if (validatedOptions.additionalContent) {
      sanitizedOptions.additionalContent = ContentSanitizer.sanitizeText(validatedOptions.additionalContent);
    }

    if (validatedOptions.tags) {
      sanitizedOptions.tags = ContentSanitizer.sanitizeTags(validatedOptions.tags);
    }

    try {
      return await PostAPI.createCrossPost(sourceModule, sourceId, sanitizedOptions);
    } catch (error) {
      console.error('Failed to create cross-post:', error);
      throw new Error('Failed to create cross-post. Please try again.');
    }
  }

  /**
   * Vote on a post with validation
   */
  static async votePost(postId: string, vote: 'up' | 'down' | 'remove'): Promise<VoteResult> {
    if (!postId || postId.trim().length === 0) {
      throw new Error('Post ID is required');
    }

    if (!['up', 'down', 'remove'].includes(vote)) {
      throw new Error('Invalid vote type');
    }

    try {
      return await PostAPI.votePost(postId, vote);
    } catch (error) {
      console.error('Failed to vote on post:', error);
      throw new Error('Failed to vote on post. Please try again.');
    }
  }

  /**
   * Check if current user can edit post
   */
  static async canEditPost(post: QsocialPost): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // User can edit their own posts
    if (post.authorId === identity.did) return true;

    // TODO: Check if user is moderator of subcommunity
    // TODO: Check if user has admin privileges

    return false;
  }

  /**
   * Check if current user can delete post
   */
  static async canDeletePost(post: QsocialPost): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // User can delete their own posts
    if (post.authorId === identity.did) return true;

    // TODO: Check if user is moderator of subcommunity
    // TODO: Check if user has admin privileges

    return false;
  }

  /**
   * Get post statistics
   */
  static getPostStatistics(post: QsocialPost) {
    const totalVotes = post.upvotes + post.downvotes;
    const score = post.upvotes - post.downvotes;
    const upvoteRatio = totalVotes > 0 ? post.upvotes / totalVotes : 0;

    return {
      score,
      totalVotes,
      upvoteRatio,
      commentCount: post.commentCount,
      isControversial: totalVotes > 10 && upvoteRatio > 0.4 && upvoteRatio < 0.6,
      isPopular: score > 10 && upvoteRatio > 0.7,
    };
  }

  /**
   * Format post for display
   */
  static formatPostForDisplay(post: QsocialPost) {
    const stats = this.getPostStatistics(post);
    
    return {
      ...post,
      stats,
      formattedCreatedAt: new Date(post.createdAt).toLocaleString(),
      formattedUpdatedAt: new Date(post.updatedAt).toLocaleString(),
      isEdited: post.isEdited,
      canEdit: false, // Will be set by component
      canDelete: false, // Will be set by component
    };
  }
}
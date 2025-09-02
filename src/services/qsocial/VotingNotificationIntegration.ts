import { VotingService } from './VotingService';
import { NotificationService } from './NotificationService';
import { PostService as PostAPI, CommentService as CommentAPI } from '../../api/qsocial';
import { getActiveIdentity } from '../../state/identity';

/**
 * Integration service to automatically create notifications when votes are cast
 */
export class VotingNotificationIntegration {
  private static isInitialized = false;

  /**
   * Initialize the integration by setting up vote event listeners
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to vote update events
    VotingService.onVoteUpdate(async (event) => {
      try {
        await this.handleVoteUpdate(event);
      } catch (error) {
        console.error('[VotingNotificationIntegration] Error handling vote update:', error);
      }
    });

    this.isInitialized = true;
    console.log('[VotingNotificationIntegration] Initialized vote notification integration');
  }

  /**
   * Handle vote update events and create appropriate notifications
   */
  private static async handleVoteUpdate(event: any): Promise<void> {
    const { targetId, targetType, qarmaChange } = event;

    // Get the current user who cast the vote
    const voter = getActiveIdentity();
    if (!voter) {
      return; // No voter identity available
    }

    try {
      let authorId: string;
      let contentTitle: string;
      let contentType: string;

      // Get the content and author information
      if (targetType === 'post') {
        const post = await PostAPI.getPost(targetId);
        authorId = post.authorId;
        contentTitle = post.title;
        contentType = 'post';
      } else if (targetType === 'comment') {
        const comment = await CommentAPI.getComment(targetId);
        authorId = comment.authorId;
        contentTitle = comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '');
        contentType = 'comment';
      } else {
        console.warn(`[VotingNotificationIntegration] Unknown target type: ${targetType}`);
        return;
      }

      // Don't notify if user voted on their own content
      if (authorId === voter.did) {
        return;
      }

      // Determine vote type and create appropriate notification
      let notificationTitle: string;
      let notificationMessage: string;
      let priority: 'low' | 'normal' | 'high' = 'normal';

      if (qarmaChange > 0) {
        // Upvote notification
        notificationTitle = `Your ${contentType} received an upvote`;
        notificationMessage = `${voter.name || 'Someone'} upvoted your ${contentType}: "${contentTitle}"`;
        priority = 'normal';
      } else if (qarmaChange < 0) {
        // Downvote notification
        notificationTitle = `Your ${contentType} received a downvote`;
        notificationMessage = `${voter.name || 'Someone'} downvoted your ${contentType}: "${contentTitle}"`;
        priority = 'low'; // Downvotes are less priority to avoid negative feelings
      } else {
        // Vote removed - don't notify for vote removals
        return;
      }

      // Create the notification
      await NotificationService.createNotification({
        userId: authorId,
        type: 'vote',
        title: notificationTitle,
        message: notificationMessage,
        priority,
        data: {
          voterId: voter.did,
          voterName: voter.name,
          targetId,
          targetType,
          qarmaChange,
          contentTitle,
          voteType: qarmaChange > 0 ? 'upvote' : 'downvote'
        }
      });

      console.log(`[VotingNotificationIntegration] Created vote notification for ${authorId}`);

    } catch (error) {
      console.error('[VotingNotificationIntegration] Error creating vote notification:', error);
    }
  }

  /**
   * Create notification for comment replies
   */
  static async notifyCommentReply(
    parentCommentId: string,
    newCommentId: string,
    postId: string
  ): Promise<void> {
    try {
      const commenter = getActiveIdentity();
      if (!commenter) {
        return;
      }

      // Get parent comment to find the author to notify
      const parentComment = await CommentAPI.getComment(parentCommentId);
      
      // Don't notify if user replied to their own comment
      if (parentComment.authorId === commenter.did) {
        return;
      }

      // Get the new comment for content
      const newComment = await CommentAPI.getComment(newCommentId);
      
      // Get post for context
      const post = await PostAPI.getPost(postId);

      const notificationTitle = 'Someone replied to your comment';
      const notificationMessage = `${commenter.name || 'Someone'} replied to your comment on "${post.title}"`;

      await NotificationService.createNotification({
        userId: parentComment.authorId,
        type: 'comment',
        title: notificationTitle,
        message: notificationMessage,
        priority: 'normal',
        data: {
          commenterId: commenter.did,
          commenterName: commenter.name,
          parentCommentId,
          newCommentId,
          postId,
          postTitle: post.title,
          replyContent: newComment.content.substring(0, 100) + (newComment.content.length > 100 ? '...' : '')
        }
      });

      console.log(`[VotingNotificationIntegration] Created comment reply notification for ${parentComment.authorId}`);

    } catch (error) {
      console.error('[VotingNotificationIntegration] Error creating comment reply notification:', error);
    }
  }

  /**
   * Create notification for post comments
   */
  static async notifyPostComment(postId: string, commentId: string): Promise<void> {
    try {
      const commenter = getActiveIdentity();
      if (!commenter) {
        return;
      }

      // Get post to find the author to notify
      const post = await PostAPI.getPost(postId);
      
      // Don't notify if user commented on their own post
      if (post.authorId === commenter.did) {
        return;
      }

      // Get the comment for content
      const comment = await CommentAPI.getComment(commentId);

      const notificationTitle = 'New comment on your post';
      const notificationMessage = `${commenter.name || 'Someone'} commented on your post "${post.title}"`;

      await NotificationService.createNotification({
        userId: post.authorId,
        type: 'comment',
        title: notificationTitle,
        message: notificationMessage,
        priority: 'normal',
        data: {
          commenterId: commenter.did,
          commenterName: commenter.name,
          commentId,
          postId,
          postTitle: post.title,
          commentContent: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
        }
      });

      console.log(`[VotingNotificationIntegration] Created post comment notification for ${post.authorId}`);

    } catch (error) {
      console.error('[VotingNotificationIntegration] Error creating post comment notification:', error);
    }
  }

  /**
   * Create notification for mentions in posts or comments
   */
  static async notifyMention(
    mentionedUserId: string,
    mentionerUserId: string,
    contentId: string,
    contentType: 'post' | 'comment',
    mentionContext: string
  ): Promise<void> {
    try {
      // Don't notify if user mentioned themselves
      if (mentionedUserId === mentionerUserId) {
        return;
      }

      const mentioner = getActiveIdentity();
      const mentionerName = mentioner?.name || 'Someone';

      let contextTitle: string;
      if (contentType === 'post') {
        const post = await PostAPI.getPost(contentId);
        contextTitle = post.title;
      } else {
        const comment = await CommentAPI.getComment(contentId);
        const post = await PostAPI.getPost(comment.postId);
        contextTitle = `comment on "${post.title}"`;
      }

      const notificationTitle = 'You were mentioned';
      const notificationMessage = `${mentionerName} mentioned you in a ${contentType === 'post' ? 'post' : 'comment'}: "${contextTitle}"`;

      await NotificationService.createNotification({
        userId: mentionedUserId,
        type: 'mention',
        title: notificationTitle,
        message: notificationMessage,
        priority: 'high', // Mentions are high priority
        data: {
          mentionerId: mentionerUserId,
          mentionerName,
          contentId,
          contentType,
          contextTitle,
          mentionContext: mentionContext.substring(0, 200) + (mentionContext.length > 200 ? '...' : '')
        }
      });

      console.log(`[VotingNotificationIntegration] Created mention notification for ${mentionedUserId}`);

    } catch (error) {
      console.error('[VotingNotificationIntegration] Error creating mention notification:', error);
    }
  }

  /**
   * Create notification for moderation actions
   */
  static async notifyModerationAction(
    userId: string,
    action: 'hidden' | 'removed' | 'approved' | 'banned',
    contentId: string,
    contentType: 'post' | 'comment',
    reason?: string,
    moderatorId?: string
  ): Promise<void> {
    try {
      const moderator = moderatorId ? { name: 'Moderator' } : { name: 'System' };

      let actionText: string;
      let priority: 'low' | 'normal' | 'high' = 'normal';

      switch (action) {
        case 'hidden':
          actionText = 'hidden';
          priority = 'normal';
          break;
        case 'removed':
          actionText = 'removed';
          priority = 'high';
          break;
        case 'approved':
          actionText = 'approved';
          priority = 'normal';
          break;
        case 'banned':
          actionText = 'resulted in a ban';
          priority = 'high';
          break;
      }

      const notificationTitle = `Your ${contentType} was ${actionText}`;
      const notificationMessage = `${moderator.name} ${actionText} your ${contentType}${reason ? `: ${reason}` : ''}`;

      await NotificationService.createNotification({
        userId,
        type: 'moderation',
        title: notificationTitle,
        message: notificationMessage,
        priority,
        data: {
          action,
          contentId,
          contentType,
          reason,
          moderatorId,
          moderatorName: moderator.name
        }
      });

      console.log(`[VotingNotificationIntegration] Created moderation notification for ${userId}`);

    } catch (error) {
      console.error('[VotingNotificationIntegration] Error creating moderation notification:', error);
    }
  }

  /**
   * Create notification for achievements
   */
  static async notifyAchievement(
    userId: string,
    achievementId: string,
    achievementName: string,
    achievementDescription: string,
    points: number
  ): Promise<void> {
    try {
      const notificationTitle = `Achievement unlocked: ${achievementName}`;
      const notificationMessage = `${achievementDescription} (+${points} Qarma)`;

      await NotificationService.createNotification({
        userId,
        type: 'achievement',
        title: notificationTitle,
        message: notificationMessage,
        priority: 'low', // Achievements are nice but not urgent
        data: {
          achievementId,
          achievementName,
          achievementDescription,
          points
        }
      });

      console.log(`[VotingNotificationIntegration] Created achievement notification for ${userId}`);

    } catch (error) {
      console.error('[VotingNotificationIntegration] Error creating achievement notification:', error);
    }
  }

  /**
   * Extract mentions from content text
   */
  static extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Process mentions in content and create notifications
   */
  static async processMentions(
    content: string,
    contentId: string,
    contentType: 'post' | 'comment'
  ): Promise<void> {
    const mentions = this.extractMentions(content);
    const mentioner = getActiveIdentity();

    if (!mentioner || mentions.length === 0) {
      return;
    }

    for (const mention of mentions) {
      // In a real implementation, you would resolve the mention to a user ID
      // For now, we'll assume the mention is a user ID
      const mentionedUserId = `did:squid:${mention}`;
      
      await this.notifyMention(
        mentionedUserId,
        mentioner.did,
        contentId,
        contentType,
        content
      );
    }
  }

  /**
   * Get initialization status
   */
  static isInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset initialization (for testing)
   */
  static reset(): void {
    this.isInitialized = false;
  }
}
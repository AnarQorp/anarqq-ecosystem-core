import { 
  VoteResult,
  QsocialPost,
  QsocialComment
} from '../../types/qsocial';
import { getActiveIdentity } from '../../state/identity';
import { PostService as PostAPI, CommentService as CommentAPI } from '../../api/qsocial';

/**
 * Vote types
 */
export type VoteType = 'up' | 'down' | 'remove';

/**
 * Vote validation result
 */
interface VoteValidationResult {
  isValid: boolean;
  error?: string;
  canVote: boolean;
  existingVote?: VoteType | null;
}

/**
 * Vote record for tracking user votes
 */
interface VoteRecord {
  userId: string;
  targetId: string;
  targetType: 'post' | 'comment';
  voteType: VoteType | null;
  timestamp: Date;
}

/**
 * Vote statistics
 */
interface VoteStatistics {
  upvotes: number;
  downvotes: number;
  score: number;
  totalVotes: number;
  upvoteRatio: number;
  isControversial: boolean;
  isPopular: boolean;
}

/**
 * Real-time vote update event
 */
interface VoteUpdateEvent {
  targetId: string;
  targetType: 'post' | 'comment';
  newUpvotes: number;
  newDownvotes: number;
  score: number;
  qarmaChange: number;
  timestamp: Date;
}

/**
 * Voting Service with upvote/downvote functionality, duplicate prevention, and Qarma integration
 */
export class VotingService {
  private static voteRecords: Map<string, VoteRecord> = new Map();
  private static voteUpdateListeners: ((event: VoteUpdateEvent) => void)[] = [];

  /**
   * Vote on a post with validation and Qarma impact
   */
  static async votePost(postId: string, vote: VoteType): Promise<VoteResult> {
    try {
      // Validate input
      if (!postId || postId.trim().length === 0) {
        throw new Error('Post ID is required');
      }

      if (!['up', 'down', 'remove'].includes(vote)) {
        throw new Error('Invalid vote type. Must be "up", "down", or "remove"');
      }

      // Get current user identity
      const identity = getActiveIdentity();
      if (!identity) {
        throw new Error('Authentication required to vote');
      }

      // Validate vote eligibility
      const validation = await this.validateVote(identity.did, postId, 'post', vote);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Vote validation failed');
      }

      // Check if this would be a duplicate vote
      if (validation.existingVote === vote) {
        throw new Error('You have already cast this vote');
      }

      // Get current post to check author (prevent self-voting)
      const post = await PostAPI.getPost(postId);
      if (post.authorId === identity.did) {
        throw new Error('You cannot vote on your own posts');
      }

      // Perform the vote via API
      const result = await PostAPI.votePost(postId, vote);

      // Update local vote record
      this.updateVoteRecord(identity.did, postId, 'post', vote === 'remove' ? null : vote);

      // Emit real-time update event
      this.emitVoteUpdate({
        targetId: postId,
        targetType: 'post',
        newUpvotes: result.newUpvotes,
        newDownvotes: result.newDownvotes,
        score: result.newUpvotes - result.newDownvotes,
        qarmaChange: result.qarmaChange,
        timestamp: new Date()
      });

      console.log(`[VotingService] Post vote: ${identity.did} voted "${vote}" on post ${postId}`);
      
      return result;

    } catch (error) {
      console.error('[VotingService] Error voting on post:', error);
      throw error;
    }
  }

  /**
   * Vote on a comment with validation and Qarma impact
   */
  static async voteComment(commentId: string, vote: VoteType): Promise<VoteResult> {
    try {
      // Validate input
      if (!commentId || commentId.trim().length === 0) {
        throw new Error('Comment ID is required');
      }

      if (!['up', 'down', 'remove'].includes(vote)) {
        throw new Error('Invalid vote type. Must be "up", "down", or "remove"');
      }

      // Get current user identity
      const identity = getActiveIdentity();
      if (!identity) {
        throw new Error('Authentication required to vote');
      }

      // Validate vote eligibility
      const validation = await this.validateVote(identity.did, commentId, 'comment', vote);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Vote validation failed');
      }

      // Check if this would be a duplicate vote
      if (validation.existingVote === vote) {
        throw new Error('You have already cast this vote');
      }

      // Get current comment to check author (prevent self-voting)
      const comment = await CommentAPI.getComment(commentId);
      if (comment.authorId === identity.did) {
        throw new Error('You cannot vote on your own comments');
      }

      // Perform the vote via API
      const result = await CommentAPI.voteComment(commentId, vote);

      // Update local vote record
      this.updateVoteRecord(identity.did, commentId, 'comment', vote === 'remove' ? null : vote);

      // Emit real-time update event
      this.emitVoteUpdate({
        targetId: commentId,
        targetType: 'comment',
        newUpvotes: result.newUpvotes,
        newDownvotes: result.newDownvotes,
        score: result.newUpvotes - result.newDownvotes,
        qarmaChange: result.qarmaChange,
        timestamp: new Date()
      });

      console.log(`[VotingService] Comment vote: ${identity.did} voted "${vote}" on comment ${commentId}`);
      
      return result;

    } catch (error) {
      console.error('[VotingService] Error voting on comment:', error);
      throw error;
    }
  }

  /**
   * Get user's current vote on a post or comment
   */
  static getUserVote(userId: string, targetId: string, targetType: 'post' | 'comment'): VoteType | null {
    const key = `${userId}:${targetId}:${targetType}`;
    const record = this.voteRecords.get(key);
    return record?.voteType || null;
  }

  /**
   * Check if user has voted on a post or comment
   */
  static hasUserVoted(userId: string, targetId: string, targetType: 'post' | 'comment'): boolean {
    const vote = this.getUserVote(userId, targetId, targetType);
    return vote !== null;
  }

  /**
   * Get vote statistics for a post or comment
   */
  static getVoteStatistics(upvotes: number, downvotes: number): VoteStatistics {
    const totalVotes = upvotes + downvotes;
    const score = upvotes - downvotes;
    const upvoteRatio = totalVotes > 0 ? upvotes / totalVotes : 0;

    return {
      upvotes,
      downvotes,
      score,
      totalVotes,
      upvoteRatio,
      isControversial: totalVotes > 10 && upvoteRatio > 0.4 && upvoteRatio < 0.6,
      isPopular: score > 10 && upvoteRatio > 0.7
    };
  }

  /**
   * Calculate Qarma impact of a vote
   */
  static calculateQarmaImpact(vote: VoteType, targetType: 'post' | 'comment'): number {
    if (vote === 'remove') return 0;

    const baseImpact = targetType === 'post' ? 10 : 5;
    return vote === 'up' ? baseImpact : -Math.floor(baseImpact / 2);
  }

  /**
   * Validate vote eligibility and check for duplicates
   */
  private static async validateVote(
    userId: string, 
    targetId: string, 
    targetType: 'post' | 'comment', 
    vote: VoteType
  ): Promise<VoteValidationResult> {
    try {
      // Check if user is authenticated
      if (!userId) {
        return {
          isValid: false,
          error: 'User authentication required',
          canVote: false
        };
      }

      // Check if target exists
      try {
        if (targetType === 'post') {
          await PostAPI.getPost(targetId);
        } else {
          await CommentAPI.getComment(targetId);
        }
      } catch (error) {
        return {
          isValid: false,
          error: `${targetType} not found`,
          canVote: false
        };
      }

      // Get existing vote
      const existingVote = this.getUserVote(userId, targetId, targetType);

      // If removing vote, must have existing vote
      if (vote === 'remove' && !existingVote) {
        return {
          isValid: false,
          error: 'No existing vote to remove',
          canVote: false,
          existingVote
        };
      }

      // TODO: Add additional validation rules:
      // - Check if user is banned from voting
      // - Check if content is locked
      // - Check rate limiting
      // - Check subcommunity-specific voting rules

      return {
        isValid: true,
        canVote: true,
        existingVote
      };

    } catch (error) {
      console.error('[VotingService] Vote validation error:', error);
      return {
        isValid: false,
        error: 'Vote validation failed',
        canVote: false
      };
    }
  }

  /**
   * Update local vote record
   */
  private static updateVoteRecord(
    userId: string, 
    targetId: string, 
    targetType: 'post' | 'comment', 
    voteType: VoteType | null
  ): void {
    const key = `${userId}:${targetId}:${targetType}`;
    
    if (voteType === null) {
      // Remove vote record
      this.voteRecords.delete(key);
    } else {
      // Update or create vote record
      this.voteRecords.set(key, {
        userId,
        targetId,
        targetType,
        voteType,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit real-time vote update event
   */
  private static emitVoteUpdate(event: VoteUpdateEvent): void {
    this.voteUpdateListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[VotingService] Error in vote update listener:', error);
      }
    });
  }

  /**
   * Subscribe to real-time vote updates
   */
  static onVoteUpdate(listener: (event: VoteUpdateEvent) => void): () => void {
    this.voteUpdateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.voteUpdateListeners.indexOf(listener);
      if (index > -1) {
        this.voteUpdateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all vote records for a user (for debugging/admin)
   */
  static getUserVoteHistory(userId: string): VoteRecord[] {
    return Array.from(this.voteRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get vote summary for a target (for debugging/admin)
   */
  static getTargetVoteSummary(targetId: string, targetType: 'post' | 'comment'): {
    upvotes: string[];
    downvotes: string[];
    totalVoters: number;
  } {
    const upvotes: string[] = [];
    const downvotes: string[] = [];

    Array.from(this.voteRecords.values()).forEach(record => {
      if (record.targetId === targetId && record.targetType === targetType) {
        if (record.voteType === 'up') {
          upvotes.push(record.userId);
        } else if (record.voteType === 'down') {
          downvotes.push(record.userId);
        }
      }
    });

    return {
      upvotes,
      downvotes,
      totalVoters: upvotes.length + downvotes.length
    };
  }

  /**
   * Clear all vote records (for testing)
   */
  static clearVoteRecords(): void {
    this.voteRecords.clear();
    console.log('[VotingService] Cleared all vote records');
  }

  /**
   * Bulk vote validation for multiple items
   */
  static async validateBulkVotes(
    userId: string,
    targets: Array<{ id: string; type: 'post' | 'comment' }>
  ): Promise<Map<string, VoteValidationResult>> {
    const results = new Map<string, VoteValidationResult>();

    for (const target of targets) {
      try {
        const validation = await this.validateVote(userId, target.id, target.type, 'up');
        results.set(target.id, validation);
      } catch (error) {
        results.set(target.id, {
          isValid: false,
          error: 'Validation failed',
          canVote: false
        });
      }
    }

    return results;
  }

  /**
   * Get voting trends for analytics
   */
  static getVotingTrends(timeRange: 'hour' | 'day' | 'week' = 'day'): {
    totalVotes: number;
    upvotes: number;
    downvotes: number;
    uniqueVoters: number;
    topTargets: Array<{ id: string; type: 'post' | 'comment'; votes: number }>;
  } {
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeRange) {
      case 'hour':
        cutoff.setHours(now.getHours() - 1);
        break;
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
    }

    const recentVotes = Array.from(this.voteRecords.values())
      .filter(record => record.timestamp >= cutoff);

    const upvotes = recentVotes.filter(v => v.voteType === 'up').length;
    const downvotes = recentVotes.filter(v => v.voteType === 'down').length;
    const uniqueVoters = new Set(recentVotes.map(v => v.userId)).size;

    // Count votes per target
    const targetVotes = new Map<string, number>();
    recentVotes.forEach(vote => {
      const key = `${vote.targetId}:${vote.targetType}`;
      targetVotes.set(key, (targetVotes.get(key) || 0) + 1);
    });

    // Get top targets
    const topTargets = Array.from(targetVotes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, votes]) => {
        const [id, type] = key.split(':');
        return { id, type: type as 'post' | 'comment', votes };
      });

    return {
      totalVotes: recentVotes.length,
      upvotes,
      downvotes,
      uniqueVoters,
      topTargets
    };
  }
}
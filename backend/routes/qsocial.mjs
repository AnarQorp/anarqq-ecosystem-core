/**
 * Qsocial API Routes
 * Handles posts, comments, subcommunities, and reputation
 */

import express from 'express';
import { 
  verifySquidIdentity, 
  optionalSquidAuth, 
  requireReputation, 
  requireModerationRights,
  rateLimitByIdentity 
} from '../middleware/squidAuth.mjs';
import { reputationService } from '../services/ReputationService.mjs';
import { webSocketService } from '../services/WebSocketService.mjs';
import { notificationService } from '../services/NotificationService.mjs';

const router = express.Router();

// Apply rate limiting to all routes
router.use(rateLimitByIdentity(100, 60000)); // 100 requests per minute

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Qsocial',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// POST ROUTES
// ============================================================================

/**
 * Create a new post
 * Requires authentication and basic reputation
 */
router.post('/posts', verifySquidIdentity, requireReputation(0), async (req, res) => {
  try {
    const { title, content, contentType, subcommunityId, tags, privacyLevel } = req.body;
    const authorId = req.squidIdentity.did;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and content are required'
      });
    }

    // Award Qarma for post creation
    const updatedReputation = await reputationService.updateQarma(
      authorId, 
      'POST_CREATED', 
      { subcommunityId }
    );

    // Create mock post (in production, this would save to database)
    const post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      authorIdentity: {
        did: authorId,
        name: `User_${authorId.slice(-8)}`,
        reputation: updatedReputation.totalQarma
      },
      title,
      content,
      contentType: contentType || 'text',
      subcommunityId: subcommunityId || null,
      tags: tags || [],
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      privacyLevel: privacyLevel || 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      isPinned: false,
      isLocked: false,
      moderationStatus: updatedReputation.totalQarma >= 100 ? 'approved' : 'pending'
    };

    console.log(`[Qsocial] Created post: ${post.id} by ${authorId} (Qarma: ${updatedReputation.totalQarma})`);
    
    // Broadcast new post to WebSocket clients
    webSocketService.broadcastNewPost(post);
    
    // Create notifications for subcommunity members if posted in a community
    if (subcommunityId) {
      await notificationService.createPostInCommunityNotification(
        subcommunityId,
        authorId,
        post.id,
        title
      );
    }
    
    res.status(201).json(post);

  } catch (error) {
    console.error('[Qsocial] Error creating post:', error);
    res.status(500).json({
      error: 'Failed to create post',
      message: error.message
    });
  }
});

/**
 * Get a post by ID
 * Public endpoint with optional authentication
 */
router.get('/posts/:id', optionalSquidAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Mock post data (in production, fetch from database)
    const post = {
      id,
      authorId: 'did:squid:example123',
      authorIdentity: {
        did: 'did:squid:example123',
        name: 'Example User',
        reputation: 150
      },
      title: 'Sample Post',
      content: 'This is a sample post content.',
      contentType: 'text',
      subcommunityId: null,
      tags: ['sample', 'test'],
      upvotes: 5,
      downvotes: 1,
      commentCount: 3,
      privacyLevel: 'public',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      isEdited: false,
      isPinned: false,
      isLocked: false,
      moderationStatus: 'approved'
    };

    res.json(post);

  } catch (error) {
    console.error('[Qsocial] Error getting post:', error);
    res.status(500).json({
      error: 'Failed to get post',
      message: error.message
    });
  }
});

/**
 * Update a post
 * Requires authentication and ownership
 */
router.put('/posts/:id', verifySquidIdentity, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.squidIdentity.did;

    // In production, verify ownership from database
    // For now, simulate ownership check
    const isOwner = true; // Mock ownership check

    if (!isOwner) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only edit your own posts'
      });
    }

    // Mock updated post
    const updatedPost = {
      id,
      authorId: userId,
      authorIdentity: {
        did: userId,
        name: `User_${userId.slice(-8)}`,
        reputation: req.userReputation || 0
      },
      title: title || 'Updated Post',
      content: content || 'Updated content',
      contentType: 'text',
      subcommunityId: null,
      tags: tags || [],
      upvotes: 5,
      downvotes: 1,
      commentCount: 3,
      privacyLevel: 'public',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: true,
      isPinned: false,
      isLocked: false,
      moderationStatus: 'approved'
    };

    console.log(`[Qsocial] Updated post: ${id} by ${userId}`);
    
    // Broadcast post update to WebSocket clients
    webSocketService.broadcastPostUpdate(updatedPost);
    
    res.json(updatedPost);

  } catch (error) {
    console.error('[Qsocial] Error updating post:', error);
    res.status(500).json({
      error: 'Failed to update post',
      message: error.message
    });
  }
});

/**
 * Delete a post
 * Requires authentication and ownership or moderation rights
 */
router.delete('/posts/:id', verifySquidIdentity, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.squidIdentity.did;

    // In production, check ownership or moderation rights
    const canDelete = true; // Mock permission check

    if (!canDelete) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own posts or have moderation rights'
      });
    }

    console.log(`[Qsocial] Deleted post: ${id} by ${userId}`);
    
    res.status(204).send();

  } catch (error) {
    console.error('[Qsocial] Error deleting post:', error);
    res.status(500).json({
      error: 'Failed to delete post',
      message: error.message
    });
  }
});

/**
 * Vote on a post
 * Requires authentication
 */
router.post('/posts/:id/vote', verifySquidIdentity, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;
    const userId = req.squidIdentity.did;

    if (!['up', 'down', 'remove'].includes(vote)) {
      return res.status(400).json({
        error: 'Invalid vote',
        message: 'Vote must be "up", "down", or "remove"'
      });
    }

    // Award Qarma to the voter for participating
    await reputationService.updateQarma(userId, 'GAVE_UPVOTE', { postId: id });

    // In production, we would:
    // 1. Get the post author from database
    // 2. Update the post vote counts
    // 3. Award/deduct Qarma to/from the post author
    const mockPostAuthor = 'did:squid:postauthor123';
    
    let authorQarmaAction;
    if (vote === 'up') {
      authorQarmaAction = 'POST_UPVOTED';
    } else if (vote === 'down') {
      authorQarmaAction = 'POST_DOWNVOTED';
    }

    let authorReputation;
    if (authorQarmaAction) {
      authorReputation = await reputationService.updateQarma(
        mockPostAuthor, 
        authorQarmaAction, 
        { postId: id, voterId: userId }
      );
    }

    // Mock vote result
    const voteResult = {
      postId: id,
      userId,
      vote,
      newUpvotes: vote === 'up' ? 6 : 5,
      newDownvotes: vote === 'down' ? 2 : 1,
      qarmaChange: authorQarmaAction ? (vote === 'up' ? 10 : -5) : 0,
      authorNewQarma: authorReputation?.totalQarma
    };

    console.log(`[Qsocial] Vote on post ${id}: ${vote} by ${userId} (Author Qarma: ${authorReputation?.totalQarma || 'N/A'})`);
    
    // Broadcast vote update to WebSocket clients
    webSocketService.broadcastVoteUpdate({
      postId: id,
      newUpvotes: voteResult.newUpvotes,
      newDownvotes: voteResult.newDownvotes,
      userId,
      vote
    });
    
    // Create vote notification for post author (only for upvotes)
    if (vote === 'up' && mockPostAuthor !== userId) {
      await notificationService.createVoteNotification(
        mockPostAuthor,
        userId,
        id,
        'post',
        vote,
        voteResult.newUpvotes - voteResult.newDownvotes
      );
    }
    
    res.json(voteResult);

  } catch (error) {
    console.error('[Qsocial] Error voting on post:', error);
    res.status(500).json({
      error: 'Failed to vote on post',
      message: error.message
    });
  }
});

/**
 * Get main feed
 * Public endpoint with optional authentication for personalization
 */
router.get('/feed', optionalSquidAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sortBy = 'hot', timeRange = 'all' } = req.query;

    // Mock feed data
    const posts = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: `post_${Date.now()}_${i}`,
      authorId: `did:squid:user${i}`,
      authorIdentity: {
        did: `did:squid:user${i}`,
        name: `User${i}`,
        reputation: 100 + i * 10
      },
      title: `Sample Post ${i + 1}`,
      content: `This is sample content for post ${i + 1}`,
      contentType: 'text',
      subcommunityId: i % 3 === 0 ? `community_${i % 3}` : null,
      tags: [`tag${i}`, 'sample'],
      upvotes: Math.floor(Math.random() * 20),
      downvotes: Math.floor(Math.random() * 5),
      commentCount: Math.floor(Math.random() * 10),
      privacyLevel: 'public',
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
      isEdited: false,
      isPinned: i === 0,
      isLocked: false,
      moderationStatus: 'approved'
    }));

    console.log(`[Qsocial] Feed requested: ${posts.length} posts`);
    
    res.json({ posts, hasMore: true });

  } catch (error) {
    console.error('[Qsocial] Error getting feed:', error);
    res.status(500).json({
      error: 'Failed to get feed',
      message: error.message
    });
  }
});

// ============================================================================
// COMMENT ROUTES
// ============================================================================

/**
 * Create a new comment
 * Requires authentication
 */
router.post('/comments', verifySquidIdentity, async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
    const authorId = req.squidIdentity.did;

    if (!postId || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Post ID and content are required'
      });
    }

    // Award Qarma for comment creation
    const updatedReputation = await reputationService.updateQarma(
      authorId, 
      'COMMENT_CREATED', 
      { postId }
    );

    // Mock comment
    const comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      authorId,
      authorIdentity: {
        did: authorId,
        name: `User_${authorId.slice(-8)}`,
        reputation: updatedReputation.totalQarma
      },
      content,
      parentCommentId: parentCommentId || null,
      depth: parentCommentId ? 1 : 0,
      childrenIds: [],
      upvotes: 0,
      downvotes: 0,
      privacyLevel: 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      moderationStatus: 'approved'
    };

    console.log(`[Qsocial] Created comment: ${comment.id} by ${authorId} (Qarma: ${updatedReputation.totalQarma})`);
    
    // Broadcast new comment to WebSocket clients
    webSocketService.broadcastNewComment(comment);
    
    // Create reply notification for post author (mock implementation)
    // In production, we would get the actual post author from database
    const mockPostAuthor = 'did:squid:postauthor123';
    if (mockPostAuthor !== authorId) {
      await notificationService.createReplyNotification(
        mockPostAuthor,
        authorId,
        postId,
        'post',
        content
      );
    }
    
    // Check for mentions in comment content and create mention notifications
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    if (mentions) {
      for (const mention of mentions) {
        const mentionedUser = `did:squid:${mention.substring(1)}`; // Remove @ symbol
        if (mentionedUser !== authorId) {
          await notificationService.createMentionNotification(
            mentionedUser,
            authorId,
            comment.id,
            'comment',
            content
          );
        }
      }
    }
    
    res.status(201).json(comment);

  } catch (error) {
    console.error('[Qsocial] Error creating comment:', error);
    res.status(500).json({
      error: 'Failed to create comment',
      message: error.message
    });
  }
});

/**
 * Get comments for a post
 * Public endpoint with optional authentication
 */
router.get('/posts/:postId/comments', optionalSquidAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 50, offset = 0, sortBy = 'best', maxDepth = 5 } = req.query;

    // Mock comments
    const comments = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `comment_${postId}_${i}`,
      postId,
      authorId: `did:squid:commenter${i}`,
      authorIdentity: {
        did: `did:squid:commenter${i}`,
        name: `Commenter${i}`,
        reputation: 50 + i * 5
      },
      content: `This is comment ${i + 1} on the post`,
      parentCommentId: null,
      depth: 0,
      childrenIds: [],
      upvotes: Math.floor(Math.random() * 10),
      downvotes: Math.floor(Math.random() * 2),
      privacyLevel: 'public',
      createdAt: new Date(Date.now() - i * 1800000).toISOString(),
      updatedAt: new Date(Date.now() - i * 1800000).toISOString(),
      isEdited: false,
      moderationStatus: 'approved'
    }));

    console.log(`[Qsocial] Comments for post ${postId}: ${comments.length} comments`);
    
    res.json({ comments, hasMore: false });

  } catch (error) {
    console.error('[Qsocial] Error getting comments:', error);
    res.status(500).json({
      error: 'Failed to get comments',
      message: error.message
    });
  }
});

/**
 * Vote on a comment
 * Requires authentication
 */
router.post('/comments/:id/vote', verifySquidIdentity, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;
    const userId = req.squidIdentity.did;

    if (!['up', 'down', 'remove'].includes(vote)) {
      return res.status(400).json({
        error: 'Invalid vote',
        message: 'Vote must be "up", "down", or "remove"'
      });
    }

    // Award Qarma to the voter for participating
    await reputationService.updateQarma(userId, 'GAVE_UPVOTE', { commentId: id });

    // In production, we would get the comment author from database
    const mockCommentAuthor = 'did:squid:commentauthor123';
    
    let authorQarmaAction;
    if (vote === 'up') {
      authorQarmaAction = 'COMMENT_UPVOTED';
    } else if (vote === 'down') {
      authorQarmaAction = 'COMMENT_DOWNVOTED';
    }

    let authorReputation;
    if (authorQarmaAction) {
      authorReputation = await reputationService.updateQarma(
        mockCommentAuthor, 
        authorQarmaAction, 
        { commentId: id, voterId: userId }
      );
    }

    // Mock vote result
    const voteResult = {
      commentId: id,
      userId,
      vote,
      newUpvotes: vote === 'up' ? 3 : 2,
      newDownvotes: vote === 'down' ? 1 : 0,
      qarmaChange: authorQarmaAction ? (vote === 'up' ? 5 : -2) : 0,
      authorNewQarma: authorReputation?.totalQarma
    };

    console.log(`[Qsocial] Vote on comment ${id}: ${vote} by ${userId} (Author Qarma: ${authorReputation?.totalQarma || 'N/A'})`);
    
    // Broadcast comment vote update to WebSocket clients
    webSocketService.broadcastVoteUpdate({
      commentId: id,
      newUpvotes: voteResult.newUpvotes,
      newDownvotes: voteResult.newDownvotes,
      userId,
      vote
    });
    
    // Create vote notification for comment author (only for upvotes)
    if (vote === 'up' && mockCommentAuthor !== userId) {
      await notificationService.createVoteNotification(
        mockCommentAuthor,
        userId,
        id,
        'comment',
        vote,
        voteResult.newUpvotes - voteResult.newDownvotes
      );
    }
    
    res.json(voteResult);

  } catch (error) {
    console.error('[Qsocial] Error voting on comment:', error);
    res.status(500).json({
      error: 'Failed to vote on comment',
      message: error.message
    });
  }
});

// ============================================================================
// SUBCOMMUNITY ROUTES
// ============================================================================

/**
 * Create a new subcommunity
 * Requires authentication and higher reputation
 */
router.post('/subcommunities', verifySquidIdentity, requireReputation(100), async (req, res) => {
  try {
    const { name, displayName, description, isPrivate, rules } = req.body;
    const creatorId = req.squidIdentity.did;

    if (!name || !displayName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and display name are required'
      });
    }

    const subcommunityId = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Award Qarma for community creation
    const updatedReputation = await reputationService.updateQarma(
      creatorId, 
      'COMMUNITY_CREATED', 
      { subcommunityId }
    );

    // Add moderation rights for the creator
    await reputationService.addModerationRights(creatorId, subcommunityId);

    // Mock subcommunity
    const subcommunity = {
      id: subcommunityId,
      name: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      displayName,
      description: description || '',
      creatorId,
      moderators: [creatorId],
      isPrivate: isPrivate || false,
      requiresApproval: false,
      minimumQarma: 0,
      allowedContentTypes: ['text', 'link', 'media'],
      memberCount: 1,
      postCount: 0,
      createdAt: new Date().toISOString(),
      rules: rules || [],
      governanceRules: []
    };

    console.log(`[Qsocial] Created subcommunity: ${subcommunity.id} by ${creatorId} (Qarma: ${updatedReputation.totalQarma})`);
    
    res.status(201).json(subcommunity);

  } catch (error) {
    console.error('[Qsocial] Error creating subcommunity:', error);
    res.status(500).json({
      error: 'Failed to create subcommunity',
      message: error.message
    });
  }
});

/**
 * Search subcommunities
 * Public endpoint
 */
router.get('/subcommunities/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Missing query parameter',
        message: 'Query parameter "q" is required'
      });
    }

    // Mock search results
    const subcommunities = [
      {
        id: 'community_1',
        name: 'tech-discussion',
        displayName: 'Tech Discussion',
        description: 'Discuss the latest in technology',
        memberCount: 1250,
        postCount: 3420,
        isPrivate: false
      },
      {
        id: 'community_2',
        name: 'crypto-news',
        displayName: 'Crypto News',
        description: 'Latest cryptocurrency news and analysis',
        memberCount: 890,
        postCount: 2100,
        isPrivate: false
      }
    ].filter(c => 
      c.name.includes(q.toLowerCase()) || 
      c.displayName.toLowerCase().includes(q.toLowerCase())
    );

    console.log(`[Qsocial] Search subcommunities: "${q}" - ${subcommunities.length} results`);
    
    res.json({ subcommunities });

  } catch (error) {
    console.error('[Qsocial] Error searching subcommunities:', error);
    res.status(500).json({
      error: 'Failed to search subcommunities',
      message: error.message
    });
  }
});

/**
 * Get trending subcommunities
 * Public endpoint
 */
router.get('/subcommunities/trending', async (req, res) => {
  try {
    // Mock trending subcommunities
    const subcommunities = [
      {
        id: 'community_1',
        name: 'tech-discussion',
        displayName: 'Tech Discussion',
        description: 'Discuss the latest in technology',
        memberCount: 1250,
        postCount: 3420,
        isPrivate: false
      },
      {
        id: 'community_2',
        name: 'crypto-news',
        displayName: 'Crypto News',
        description: 'Latest cryptocurrency news and analysis',
        memberCount: 890,
        postCount: 2100,
        isPrivate: false
      }
    ];

    console.log(`[Qsocial] Trending subcommunities: ${subcommunities.length} results`);
    
    res.json({ subcommunities });

  } catch (error) {
    console.error('[Qsocial] Error getting trending subcommunities:', error);
    res.status(500).json({
      error: 'Failed to get trending subcommunities',
      message: error.message
    });
  }
});

/**
 * Get subcommunity by ID
 * Public endpoint
 */
router.get('/subcommunities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Mock subcommunity
    const subcommunity = {
      id,
      name: 'sample-community',
      displayName: 'Sample Community',
      description: 'A sample community for testing',
      creatorId: 'did:squid:creator123',
      moderators: ['did:squid:creator123'],
      isPrivate: false,
      requiresApproval: false,
      minimumQarma: 0,
      allowedContentTypes: ['text', 'link', 'media'],
      memberCount: 42,
      postCount: 128,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      rules: ['Be respectful', 'No spam', 'Stay on topic'],
      governanceRules: []
    };

    res.json(subcommunity);

  } catch (error) {
    console.error('[Qsocial] Error getting subcommunity:', error);
    res.status(500).json({
      error: 'Failed to get subcommunity',
      message: error.message
    });
  }
});

/**
 * Join a subcommunity
 * Requires authentication
 */
router.post('/subcommunities/:id/join', verifySquidIdentity, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.squidIdentity.did;

    console.log(`[Qsocial] User ${userId} joined subcommunity ${id}`);
    
    res.json({ success: true, message: 'Successfully joined subcommunity' });

  } catch (error) {
    console.error('[Qsocial] Error joining subcommunity:', error);
    res.status(500).json({
      error: 'Failed to join subcommunity',
      message: error.message
    });
  }
});

/**
 * Leave a subcommunity
 * Requires authentication
 */
router.post('/subcommunities/:id/leave', verifySquidIdentity, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.squidIdentity.did;

    console.log(`[Qsocial] User ${userId} left subcommunity ${id}`);
    
    res.json({ success: true, message: 'Successfully left subcommunity' });

  } catch (error) {
    console.error('[Qsocial] Error leaving subcommunity:', error);
    res.status(500).json({
      error: 'Failed to leave subcommunity',
      message: error.message
    });
  }
});

// ============================================================================
// REPUTATION ROUTES
// ============================================================================

/**
 * Get user reputation
 * Public endpoint
 */
router.get('/users/:userId/reputation', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get reputation from ReputationService
    const reputation = await reputationService.getUserReputation(userId);

    console.log(`[Qsocial] Reputation for user ${userId}: ${reputation.totalQarma} qarma`);
    
    res.json(reputation);

  } catch (error) {
    console.error('[Qsocial] Error getting reputation:', error);
    res.status(500).json({
      error: 'Failed to get reputation',
      message: error.message
    });
  }
});

/**
 * Get reputation leaderboard
 * Public endpoint
 */
router.get('/reputation/leaderboard', async (req, res) => {
  try {
    const { limit = 10, subcommunityId } = req.query;

    const leaderboard = await reputationService.getLeaderboard(
      parseInt(limit), 
      subcommunityId
    );

    console.log(`[Qsocial] Leaderboard requested: ${leaderboard.length} users`);
    
    res.json({ users: leaderboard });

  } catch (error) {
    console.error('[Qsocial] Error getting leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
      message: error.message
    });
  }
});

/**
 * Get reputation statistics
 * Public endpoint
 */
router.get('/reputation/stats', async (req, res) => {
  try {
    const stats = await reputationService.getReputationStats();

    console.log(`[Qsocial] Reputation stats requested`);
    
    res.json(stats);

  } catch (error) {
    console.error('[Qsocial] Error getting reputation stats:', error);
    res.status(500).json({
      error: 'Failed to get reputation statistics',
      message: error.message
    });
  }
});

// ============================================================================
// CROSS-POST ROUTES
// ============================================================================

/**
 * Create cross-post from another module
 * Requires authentication
 */
router.post('/cross-posts', verifySquidIdentity, async (req, res) => {
  try {
    const { sourceModule, sourceId, title, description, subcommunityId } = req.body;
    const authorId = req.squidIdentity.did;

    if (!sourceModule || !sourceId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Source module and source ID are required'
      });
    }

    // Mock cross-post
    const crossPost = {
      id: `crosspost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      authorIdentity: {
        did: authorId,
        name: `User_${authorId.slice(-8)}`,
        reputation: req.userReputation || 0
      },
      title: title || `Shared from ${sourceModule}`,
      content: description || `Content shared from ${sourceModule}`,
      contentType: 'cross-post',
      sourceModule,
      sourceId,
      sourceData: {
        originalTitle: 'Original Content Title',
        originalAuthor: 'original_author',
        originalUrl: `/api/${sourceModule}/${sourceId}`
      },
      subcommunityId: subcommunityId || null,
      tags: [sourceModule, 'cross-post'],
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      privacyLevel: 'public',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      isPinned: false,
      isLocked: false,
      moderationStatus: 'approved'
    };

    console.log(`[Qsocial] Created cross-post: ${crossPost.id} from ${sourceModule}:${sourceId}`);
    
    res.status(201).json(crossPost);

  } catch (error) {
    console.error('[Qsocial] Error creating cross-post:', error);
    res.status(500).json({
      error: 'Failed to create cross-post',
      message: error.message
    });
  }
});

export default router;
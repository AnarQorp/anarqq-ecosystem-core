/**
 * WebSocket Service for Real-time Updates
 * Handles live post updates, comment updates, vote counts, and notifications
 */

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket mapping
    this.userSockets = new Map(); // socketId -> userId mapping
    this.roomSubscriptions = new Map(); // userId -> Set of room names
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL?.split(',') || [
          'http://localhost:8080',
          'http://127.0.0.1:8080',
          'http://localhost:5173',
          'http://127.0.0.1:5173'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('🔌 WebSocket service initialized');
  }

  /**
   * Set up socket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          await this.authenticateSocket(socket, data);
        } catch (error) {
          console.error('[WebSocket] Authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle room subscriptions
      socket.on('subscribe_to_post', (postId) => {
        this.subscribeToPost(socket, postId);
      });

      socket.on('unsubscribe_from_post', (postId) => {
        this.unsubscribeFromPost(socket, postId);
      });

      socket.on('subscribe_to_subcommunity', (subcommunityId) => {
        this.subscribeToSubcommunity(socket, subcommunityId);
      });

      socket.on('unsubscribe_from_subcommunity', (subcommunityId) => {
        this.unsubscribeFromSubcommunity(socket, subcommunityId);
      });

      socket.on('subscribe_to_user_notifications', () => {
        this.subscribeToUserNotifications(socket);
      });

      // Handle typing indicators for comments
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Send connection confirmation
      socket.emit('connected', { 
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Authenticate socket connection
   */
  async authenticateSocket(socket, data) {
    const { token, identity } = data;

    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.did || decoded.userId;

      if (!userId) {
        throw new Error('Invalid token: no user ID found');
      }

      // Store user-socket mapping
      this.connectedUsers.set(userId, socket);
      this.userSockets.set(socket.id, userId);
      this.roomSubscriptions.set(userId, new Set());

      // Join user's personal notification room
      socket.join(`user:${userId}`);

      socket.emit('authenticated', { 
        userId,
        timestamp: new Date().toISOString()
      });

      console.log(`[WebSocket] User authenticated: ${userId} (${socket.id})`);

    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Subscribe to post updates
   */
  subscribeToPost(socket, postId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomName = `post:${postId}`;
    socket.join(roomName);

    // Track subscription
    const userRooms = this.roomSubscriptions.get(userId) || new Set();
    userRooms.add(roomName);
    this.roomSubscriptions.set(userId, userRooms);

    socket.emit('subscribed_to_post', { postId, timestamp: new Date().toISOString() });
    console.log(`[WebSocket] User ${userId} subscribed to post ${postId}`);
  }

  /**
   * Unsubscribe from post updates
   */
  unsubscribeFromPost(socket, postId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    const roomName = `post:${postId}`;
    socket.leave(roomName);

    // Remove from tracking
    const userRooms = this.roomSubscriptions.get(userId);
    if (userRooms) {
      userRooms.delete(roomName);
    }

    socket.emit('unsubscribed_from_post', { postId, timestamp: new Date().toISOString() });
    console.log(`[WebSocket] User ${userId} unsubscribed from post ${postId}`);
  }

  /**
   * Subscribe to subcommunity updates
   */
  subscribeToSubcommunity(socket, subcommunityId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomName = `subcommunity:${subcommunityId}`;
    socket.join(roomName);

    // Track subscription
    const userRooms = this.roomSubscriptions.get(userId) || new Set();
    userRooms.add(roomName);
    this.roomSubscriptions.set(userId, userRooms);

    socket.emit('subscribed_to_subcommunity', { subcommunityId, timestamp: new Date().toISOString() });
    console.log(`[WebSocket] User ${userId} subscribed to subcommunity ${subcommunityId}`);
  }

  /**
   * Unsubscribe from subcommunity updates
   */
  unsubscribeFromSubcommunity(socket, subcommunityId) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    const roomName = `subcommunity:${subcommunityId}`;
    socket.leave(roomName);

    // Remove from tracking
    const userRooms = this.roomSubscriptions.get(userId);
    if (userRooms) {
      userRooms.delete(roomName);
    }

    socket.emit('unsubscribed_from_subcommunity', { subcommunityId, timestamp: new Date().toISOString() });
    console.log(`[WebSocket] User ${userId} unsubscribed from subcommunity ${subcommunityId}`);
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToUserNotifications(socket) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // User is automatically joined to their notification room on auth
    socket.emit('subscribed_to_notifications', { timestamp: new Date().toISOString() });
    console.log(`[WebSocket] User ${userId} subscribed to notifications`);
  }

  /**
   * Handle typing start for comments
   */
  handleTypingStart(socket, data) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    const { postId, userName } = data;
    const roomName = `post:${postId}`;

    // Broadcast typing indicator to other users in the post room
    socket.to(roomName).emit('user_typing_start', {
      postId,
      userId,
      userName: userName || `User_${userId.slice(-8)}`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle typing stop for comments
   */
  handleTypingStop(socket, data) {
    const userId = this.userSockets.get(socket.id);
    if (!userId) return;

    const { postId } = data;
    const roomName = `post:${postId}`;

    // Broadcast typing stop to other users in the post room
    socket.to(roomName).emit('user_typing_stop', {
      postId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      // Clean up user mappings
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      this.roomSubscriptions.delete(userId);

      console.log(`[WebSocket] User disconnected: ${userId} (${socket.id})`);
    } else {
      console.log(`[WebSocket] Anonymous client disconnected: ${socket.id}`);
    }
  }

  // ============================================================================
  // BROADCAST METHODS
  // ============================================================================

  /**
   * Broadcast new post to relevant rooms
   */
  broadcastNewPost(post) {
    if (!this.io) return;

    // Broadcast to main feed
    this.io.emit('new_post', {
      type: 'new_post',
      data: post,
      timestamp: new Date().toISOString()
    });

    // Broadcast to subcommunity if applicable
    if (post.subcommunityId) {
      this.io.to(`subcommunity:${post.subcommunityId}`).emit('new_post_in_community', {
        type: 'new_post_in_community',
        data: post,
        subcommunityId: post.subcommunityId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[WebSocket] Broadcasted new post: ${post.id}`);
  }

  /**
   * Broadcast post update
   */
  broadcastPostUpdate(post) {
    if (!this.io) return;

    const roomName = `post:${post.id}`;
    
    this.io.to(roomName).emit('post_updated', {
      type: 'post_updated',
      data: post,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] Broadcasted post update: ${post.id}`);
  }

  /**
   * Broadcast vote update
   */
  broadcastVoteUpdate(voteData) {
    if (!this.io) return;

    const { postId, commentId, newUpvotes, newDownvotes, userId, vote } = voteData;
    
    if (postId) {
      // Post vote update
      this.io.to(`post:${postId}`).emit('vote_updated', {
        type: 'vote_updated',
        data: {
          postId,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          voterId: userId,
          vote
        },
        timestamp: new Date().toISOString()
      });

      console.log(`[WebSocket] Broadcasted post vote update: ${postId} (${vote})`);
    }

    if (commentId) {
      // Comment vote update - find the post this comment belongs to
      // In production, you'd query the database to get the postId
      // For now, we'll broadcast to all connected clients
      this.io.emit('comment_vote_updated', {
        type: 'comment_vote_updated',
        data: {
          commentId,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          voterId: userId,
          vote
        },
        timestamp: new Date().toISOString()
      });

      console.log(`[WebSocket] Broadcasted comment vote update: ${commentId} (${vote})`);
    }
  }

  /**
   * Broadcast new comment
   */
  broadcastNewComment(comment) {
    if (!this.io) return;

    const roomName = `post:${comment.postId}`;
    
    this.io.to(roomName).emit('new_comment', {
      type: 'new_comment',
      data: comment,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] Broadcasted new comment: ${comment.id} on post ${comment.postId}`);
  }

  /**
   * Broadcast comment update
   */
  broadcastCommentUpdate(comment) {
    if (!this.io) return;

    const roomName = `post:${comment.postId}`;
    
    this.io.to(roomName).emit('comment_updated', {
      type: 'comment_updated',
      data: comment,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] Broadcasted comment update: ${comment.id}`);
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId, notification) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] Sent notification to user ${userId}: ${notification.type}`);
  }

  /**
   * Broadcast moderation action
   */
  broadcastModerationAction(action) {
    if (!this.io) return;

    const { type, postId, commentId, subcommunityId, moderatorId } = action;

    // Broadcast to relevant rooms
    if (postId) {
      this.io.to(`post:${postId}`).emit('moderation_action', {
        type: 'moderation_action',
        data: action,
        timestamp: new Date().toISOString()
      });
    }

    if (subcommunityId) {
      this.io.to(`subcommunity:${subcommunityId}`).emit('moderation_action', {
        type: 'moderation_action',
        data: action,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[WebSocket] Broadcasted moderation action: ${type} by ${moderatorId}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get connected user count
   */
  getConnectedUserCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get user's socket if connected
   */
  getUserSocket(userId) {
    return this.connectedUsers.get(userId);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds() {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Get room member count
   */
  getRoomMemberCount(roomName) {
    if (!this.io) return 0;
    
    const room = this.io.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }

  /**
   * Broadcast system message
   */
  broadcastSystemMessage(message, level = 'info') {
    if (!this.io) return;

    this.io.emit('system_message', {
      type: 'system_message',
      data: {
        message,
        level, // 'info', 'warning', 'error', 'success'
        timestamp: new Date().toISOString()
      }
    });

    console.log(`[WebSocket] Broadcasted system message (${level}): ${message}`);
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
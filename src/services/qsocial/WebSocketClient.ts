/**
 * WebSocket Client for Real-time Qsocial Updates
 * Handles connection to backend WebSocket service and real-time event handling
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface NotificationData {
  id: string;
  type: 'mention' | 'reply' | 'vote' | 'post_in_community' | 'moderation';
  title: string;
  message: string;
  userId: string;
  sourceId?: string;
  sourceType?: 'post' | 'comment' | 'subcommunity';
  isRead: boolean;
  createdAt: string;
}

export interface VoteUpdateData {
  postId?: string;
  commentId?: string;
  upvotes: number;
  downvotes: number;
  voterId: string;
  vote: 'up' | 'down' | 'remove';
}

export interface TypingData {
  postId: string;
  userId: string;
  userName: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverUrl = process.env.VITE_API_URL || 'http://localhost:3003';
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Authenticate if token is provided
        if (token) {
          this.authenticate(token);
        }

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        this.isConnected = false;
        this.isAuthenticated = false;
        
        // Attempt to reconnect
        this.handleReconnection();
      });

      this.setupSocketEventHandlers();
    });
  }

  /**
   * Authenticate with the WebSocket server
   */
  authenticate(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('authenticate', { token });

      this.socket.once('authenticated', (data) => {
        console.log('[WebSocket] Authenticated:', data);
        this.isAuthenticated = true;
        resolve();
      });

      this.socket.once('auth_error', (error) => {
        console.error('[WebSocket] Authentication failed:', error);
        this.isAuthenticated = false;
        reject(new Error(error.message));
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Real-time content updates
    this.socket.on('new_post', (event: WebSocketEvent) => {
      this.emitToListeners('new_post', event.data);
    });

    this.socket.on('new_post_in_community', (event: WebSocketEvent) => {
      this.emitToListeners('new_post_in_community', event.data);
    });

    this.socket.on('post_updated', (event: WebSocketEvent) => {
      this.emitToListeners('post_updated', event.data);
    });

    this.socket.on('new_comment', (event: WebSocketEvent) => {
      this.emitToListeners('new_comment', event.data);
    });

    this.socket.on('comment_updated', (event: WebSocketEvent) => {
      this.emitToListeners('comment_updated', event.data);
    });

    // Vote updates
    this.socket.on('vote_updated', (event: WebSocketEvent) => {
      this.emitToListeners('vote_updated', event.data);
    });

    this.socket.on('comment_vote_updated', (event: WebSocketEvent) => {
      this.emitToListeners('comment_vote_updated', event.data);
    });

    // Typing indicators
    this.socket.on('user_typing_start', (event: WebSocketEvent) => {
      this.emitToListeners('user_typing_start', event.data);
    });

    this.socket.on('user_typing_stop', (event: WebSocketEvent) => {
      this.emitToListeners('user_typing_stop', event.data);
    });

    // Notifications
    this.socket.on('notification', (event: WebSocketEvent) => {
      this.emitToListeners('notification', event.data);
    });

    // Moderation actions
    this.socket.on('moderation_action', (event: WebSocketEvent) => {
      this.emitToListeners('moderation_action', event.data);
    });

    // System messages
    this.socket.on('system_message', (event: WebSocketEvent) => {
      this.emitToListeners('system_message', event.data);
    });

    // Connection events
    this.socket.on('connected', (data) => {
      console.log('[WebSocket] Connection confirmed:', data);
    });

    this.socket.on('subscribed_to_post', (data) => {
      console.log('[WebSocket] Subscribed to post:', data.postId);
    });

    this.socket.on('subscribed_to_subcommunity', (data) => {
      console.log('[WebSocket] Subscribed to subcommunity:', data.subcommunityId);
    });

    this.socket.on('subscribed_to_notifications', (data) => {
      console.log('[WebSocket] Subscribed to notifications');
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
      this.emitToListeners('error', error);
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emitToListeners('max_reconnect_attempts', null);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Setup event listeners for the class
   */
  private setupEventListeners(): void {
    // Initialize event listener map
    const eventTypes = [
      'new_post', 'new_post_in_community', 'post_updated',
      'new_comment', 'comment_updated',
      'vote_updated', 'comment_vote_updated',
      'user_typing_start', 'user_typing_stop',
      'notification', 'moderation_action', 'system_message',
      'error', 'max_reconnect_attempts'
    ];

    eventTypes.forEach(eventType => {
      this.eventListeners.set(eventType, new Set());
    });
  }

  /**
   * Emit event to registered listeners
   */
  private emitToListeners(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // SUBSCRIPTION METHODS
  // ============================================================================

  /**
   * Subscribe to post updates
   */
  subscribeToPost(postId: string): void {
    if (!this.socket || !this.isAuthenticated) {
      console.warn('[WebSocket] Cannot subscribe to post: not authenticated');
      return;
    }

    this.socket.emit('subscribe_to_post', postId);
  }

  /**
   * Unsubscribe from post updates
   */
  unsubscribeFromPost(postId: string): void {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('unsubscribe_from_post', postId);
  }

  /**
   * Subscribe to subcommunity updates
   */
  subscribeToSubcommunity(subcommunityId: string): void {
    if (!this.socket || !this.isAuthenticated) {
      console.warn('[WebSocket] Cannot subscribe to subcommunity: not authenticated');
      return;
    }

    this.socket.emit('subscribe_to_subcommunity', subcommunityId);
  }

  /**
   * Unsubscribe from subcommunity updates
   */
  unsubscribeFromSubcommunity(subcommunityId: string): void {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('unsubscribe_from_subcommunity', subcommunityId);
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(): void {
    if (!this.socket || !this.isAuthenticated) {
      console.warn('[WebSocket] Cannot subscribe to notifications: not authenticated');
      return;
    }

    this.socket.emit('subscribe_to_user_notifications');
  }

  /**
   * Send typing start indicator
   */
  startTyping(postId: string, userName?: string): void {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('typing_start', { postId, userName });
  }

  /**
   * Send typing stop indicator
   */
  stopTyping(postId: string): void {
    if (!this.socket || !this.isAuthenticated) return;

    this.socket.emit('typing_stop', { postId });
  }

  // ============================================================================
  // EVENT LISTENER METHODS
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Remove all event listeners for a specific event type
   */
  removeAllEventListeners(eventType?: string): void {
    if (eventType) {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.clear();
      }
    } else {
      this.eventListeners.forEach(listeners => listeners.clear());
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if connected to WebSocket server
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Check if authenticated with WebSocket server
   */
  isAuthenticatedWithServer(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();
export default webSocketClient;
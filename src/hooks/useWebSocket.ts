/**
 * React Hook for WebSocket Real-time Updates
 * Provides WebSocket connection management and real-time event handling
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { webSocketClient, NotificationData, VoteUpdateData, TypingData } from '../services/qsocial/WebSocketClient';

export interface WebSocketStatus {
  connected: boolean;
  authenticated: boolean;
  reconnectAttempts: number;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  token?: string;
}

export interface UseWebSocketReturn {
  status: WebSocketStatus;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  subscribeToPost: (postId: string) => void;
  unsubscribeFromPost: (postId: string) => void;
  subscribeToSubcommunity: (subcommunityId: string) => void;
  unsubscribeFromSubcommunity: (subcommunityId: string) => void;
  subscribeToNotifications: () => void;
  startTyping: (postId: string, userName?: string) => void;
  stopTyping: (postId: string) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const { autoConnect = false, token } = options;
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    authenticated: false,
    reconnectAttempts: 0
  });

  const statusUpdateInterval = useRef<NodeJS.Timeout>();

  // Update status periodically
  const updateStatus = useCallback(() => {
    const currentStatus = webSocketClient.getConnectionStatus();
    setStatus(currentStatus);
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(async (authToken?: string) => {
    try {
      const tokenToUse = authToken || token;
      await webSocketClient.connect(tokenToUse);
      updateStatus();
    } catch (error) {
      console.error('[useWebSocket] Connection failed:', error);
      updateStatus();
      throw error;
    }
  }, [token, updateStatus]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
    updateStatus();
  }, [updateStatus]);

  // Subscription methods
  const subscribeToPost = useCallback((postId: string) => {
    webSocketClient.subscribeToPost(postId);
  }, []);

  const unsubscribeFromPost = useCallback((postId: string) => {
    webSocketClient.unsubscribeFromPost(postId);
  }, []);

  const subscribeToSubcommunity = useCallback((subcommunityId: string) => {
    webSocketClient.subscribeToSubcommunity(subcommunityId);
  }, []);

  const unsubscribeFromSubcommunity = useCallback((subcommunityId: string) => {
    webSocketClient.unsubscribeFromSubcommunity(subcommunityId);
  }, []);

  const subscribeToNotifications = useCallback(() => {
    webSocketClient.subscribeToNotifications();
  }, []);

  // Typing indicators
  const startTyping = useCallback((postId: string, userName?: string) => {
    webSocketClient.startTyping(postId, userName);
  }, []);

  const stopTyping = useCallback((postId: string) => {
    webSocketClient.stopTyping(postId);
  }, []);

  // Setup and cleanup
  useEffect(() => {
    // Start status update interval
    statusUpdateInterval.current = setInterval(updateStatus, 1000);

    // Auto-connect if enabled
    if (autoConnect) {
      connect().catch(console.error);
    }

    return () => {
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
      }
    };
  }, [autoConnect, connect, updateStatus]);

  return {
    status,
    connect,
    disconnect,
    subscribeToPost,
    unsubscribeFromPost,
    subscribeToSubcommunity,
    unsubscribeFromSubcommunity,
    subscribeToNotifications,
    startTyping,
    stopTyping
  };
};

/**
 * Hook for listening to specific WebSocket events
 */
export const useWebSocketEvent = <T = any>(
  eventType: string,
  handler: (data: T) => void,
  dependencies: any[] = []
) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventHandler = (data: T) => {
      handlerRef.current(data);
    };

    webSocketClient.addEventListener(eventType, eventHandler);

    return () => {
      webSocketClient.removeEventListener(eventType, eventHandler);
    };
  }, [eventType, ...dependencies]);
};

/**
 * Hook for real-time post updates
 */
export const usePostRealTimeUpdates = (postId?: string) => {
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingData[]>([]);

  // Listen for new posts
  useWebSocketEvent('new_post', (newPost: any) => {
    if (!postId || newPost.id === postId) {
      setPost(newPost);
    }
  }, [postId]);

  // Listen for post updates
  useWebSocketEvent('post_updated', (updatedPost: any) => {
    if (!postId || updatedPost.id === postId) {
      setPost(updatedPost);
    }
  }, [postId]);

  // Listen for new comments
  useWebSocketEvent('new_comment', (newComment: any) => {
    if (!postId || newComment.postId === postId) {
      setComments(prev => [...prev, newComment]);
    }
  }, [postId]);

  // Listen for comment updates
  useWebSocketEvent('comment_updated', (updatedComment: any) => {
    if (!postId || updatedComment.postId === postId) {
      setComments(prev => 
        prev.map(comment => 
          comment.id === updatedComment.id ? updatedComment : comment
        )
      );
    }
  }, [postId]);

  // Listen for vote updates
  useWebSocketEvent('vote_updated', (voteData: VoteUpdateData) => {
    if (!postId || voteData.postId === postId) {
      setPost((prev: any) => prev ? {
        ...prev,
        upvotes: voteData.upvotes,
        downvotes: voteData.downvotes
      } : null);
    }
  }, [postId]);

  // Listen for comment vote updates
  useWebSocketEvent('comment_vote_updated', (voteData: VoteUpdateData) => {
    if (voteData.commentId) {
      setComments(prev => 
        prev.map(comment => 
          comment.id === voteData.commentId ? {
            ...comment,
            upvotes: voteData.upvotes,
            downvotes: voteData.downvotes
          } : comment
        )
      );
    }
  }, []);

  // Listen for typing indicators
  useWebSocketEvent('user_typing_start', (typingData: TypingData) => {
    if (!postId || typingData.postId === postId) {
      setTypingUsers(prev => {
        const existing = prev.find(user => user.userId === typingData.userId);
        if (!existing) {
          return [...prev, typingData];
        }
        return prev;
      });
    }
  }, [postId]);

  useWebSocketEvent('user_typing_stop', (typingData: TypingData) => {
    if (!postId || typingData.postId === postId) {
      setTypingUsers(prev => 
        prev.filter(user => user.userId !== typingData.userId)
      );
    }
  }, [postId]);

  return {
    post,
    comments,
    typingUsers,
    setPost,
    setComments
  };
};

/**
 * Hook for real-time notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for new notifications
  useWebSocketEvent('notification', (notification: NotificationData) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};

/**
 * Hook for real-time feed updates
 */
export const useFeedRealTimeUpdates = (subcommunityId?: string) => {
  const [newPosts, setNewPosts] = useState<any[]>([]);
  const [hasNewContent, setHasNewContent] = useState(false);

  // Listen for new posts in feed
  useWebSocketEvent('new_post', (newPost: any) => {
    if (!subcommunityId || !newPost.subcommunityId) {
      setNewPosts(prev => [newPost, ...prev]);
      setHasNewContent(true);
    }
  }, [subcommunityId]);

  // Listen for new posts in specific subcommunity
  useWebSocketEvent('new_post_in_community', (data: any) => {
    if (subcommunityId && data.subcommunityId === subcommunityId) {
      setNewPosts(prev => [data.data, ...prev]);
      setHasNewContent(true);
    }
  }, [subcommunityId]);

  // Clear new content indicator
  const clearNewContent = useCallback(() => {
    setHasNewContent(false);
    setNewPosts([]);
  }, []);

  return {
    newPosts,
    hasNewContent,
    clearNewContent
  };
};
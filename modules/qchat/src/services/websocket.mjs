/**
 * WebSocket Service
 * Handles real-time messaging, presence, and room events
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocket handler for real-time chat functionality
 */
export default function websocketHandler(io, socket) {
  console.log(`WebSocket connected: ${socket.user.squidId} (${socket.id})`);
  
  // Track user presence
  socket.presence = {
    status: 'online',
    lastActivity: Date.now(),
    currentRoom: null,
    typing: false
  };
  
  /**
   * Join a chat room
   */
  socket.on('room:join', async (data) => {
    try {
      const { roomId, token } = data;
      
      if (!roomId) {
        socket.emit('error', {
          code: 'MISSING_ROOM_ID',
          message: 'Room ID is required'
        });
        return;
      }
      
      // Validate room access (simplified)
      const canJoin = await validateRoomAccess(roomId, socket.user);
      if (!canJoin) {
        socket.emit('error', {
          code: 'ACCESS_DENIED',
          message: 'Access denied to room'
        });
        return;
      }
      
      // Leave current room if any
      if (socket.presence.currentRoom) {
        socket.leave(socket.presence.currentRoom);
        socket.to(socket.presence.currentRoom).emit('presence', {
          type: 'USER_LEFT',
          squidId: socket.user.squidId,
          roomId: socket.presence.currentRoom,
          timestamp: new Date().toISOString()
        });
      }
      
      // Join new room
      socket.join(roomId);
      socket.presence.currentRoom = roomId;
      socket.rooms.add(roomId);
      
      // Notify room members
      socket.to(roomId).emit('presence', {
        type: 'USER_JOINED',
        squidId: socket.user.squidId,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      // Send confirmation
      socket.emit('room:joined', {
        roomId,
        timestamp: new Date().toISOString(),
        memberCount: await getRoomMemberCount(roomId)
      });
      
      // Send recent messages
      const recentMessages = await getRecentMessages(roomId, 20);
      socket.emit('room:history', {
        roomId,
        messages: recentMessages
      });
      
    } catch (error) {
      console.error('Room join error:', error);
      socket.emit('error', {
        code: 'ROOM_JOIN_FAILED',
        message: 'Failed to join room'
      });
    }
  });
  
  /**
   * Leave a chat room
   */
  socket.on('room:leave', async (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId || !socket.rooms.has(roomId)) {
        socket.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'Not currently in this room'
        });
        return;
      }
      
      // Leave room
      socket.leave(roomId);
      socket.rooms.delete(roomId);
      
      if (socket.presence.currentRoom === roomId) {
        socket.presence.currentRoom = null;
      }
      
      // Notify room members
      socket.to(roomId).emit('presence', {
        type: 'USER_LEFT',
        squidId: socket.user.squidId,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      // Send confirmation
      socket.emit('room:left', {
        roomId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Room leave error:', error);
      socket.emit('error', {
        code: 'ROOM_LEAVE_FAILED',
        message: 'Failed to leave room'
      });
    }
  });
  
  /**
   * Send a message
   */
  socket.on('message', async (data) => {
    try {
      const { roomId, content, messageType = 'TEXT', replyTo, mentions, attachments } = data;
      
      if (!roomId || !socket.rooms.has(roomId)) {
        socket.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'Must join room before sending messages'
        });
        return;
      }
      
      if (!content || content.trim().length === 0) {
        socket.emit('error', {
          code: 'EMPTY_MESSAGE',
          message: 'Message content cannot be empty'
        });
        return;
      }
      
      // Rate limiting check
      const rateLimitOk = await checkRateLimit(socket.user.squidId, 'message');
      if (!rateLimitOk) {
        socket.emit('error', {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Message rate limit exceeded'
        });
        return;
      }
      
      // Create message
      const messageId = `qchat_msg_${uuidv4().replace(/-/g, '_')}`;
      const timestamp = new Date().toISOString();
      
      const message = {
        messageId,
        roomId,
        senderId: socket.user.squidId,
        senderName: `User ${socket.user.squidId.split('_').pop()}`,
        content: content.trim(),
        messageType,
        timestamp,
        replyTo,
        mentions: mentions || [],
        attachments: attachments || [],
        reactions: {},
        deliveryStatus: 'SENT'
      };
      
      // Basic content moderation
      const moderationResult = await moderateMessage(message);
      if (!moderationResult.allowed) {
        socket.emit('error', {
          code: 'MESSAGE_BLOCKED',
          message: 'Message blocked by moderation'
        });
        return;
      }
      
      // Store message (simplified)
      await storeMessage(message);
      
      // Broadcast to room members
      io.to(roomId).emit('message', message);
      
      // Send delivery confirmation to sender
      socket.emit('message:sent', {
        messageId,
        timestamp,
        deliveryStatus: 'DELIVERED'
      });
      
      // Update room activity
      await updateRoomActivity(roomId);
      
    } catch (error) {
      console.error('Message send error:', error);
      socket.emit('error', {
        code: 'MESSAGE_SEND_FAILED',
        message: 'Failed to send message'
      });
    }
  });
  
  /**
   * Edit a message
   */
  socket.on('message:edit', async (data) => {
    try {
      const { messageId, content } = data;
      
      if (!messageId || !content) {
        socket.emit('error', {
          code: 'INVALID_EDIT_DATA',
          message: 'Message ID and content are required'
        });
        return;
      }
      
      // Validate message ownership and edit permissions
      const canEdit = await canEditMessage(messageId, socket.user.squidId);
      if (!canEdit) {
        socket.emit('error', {
          code: 'EDIT_NOT_ALLOWED',
          message: 'Cannot edit this message'
        });
        return;
      }
      
      // Update message
      const updatedMessage = await updateMessage(messageId, content);
      if (!updatedMessage) {
        socket.emit('error', {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found'
        });
        return;
      }
      
      // Broadcast edit to room
      io.to(updatedMessage.roomId).emit('message:edited', {
        messageId,
        content,
        editedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Message edit error:', error);
      socket.emit('error', {
        code: 'MESSAGE_EDIT_FAILED',
        message: 'Failed to edit message'
      });
    }
  });
  
  /**
   * Delete a message
   */
  socket.on('message:delete', async (data) => {
    try {
      const { messageId } = data;
      
      if (!messageId) {
        socket.emit('error', {
          code: 'MISSING_MESSAGE_ID',
          message: 'Message ID is required'
        });
        return;
      }
      
      // Validate delete permissions
      const canDelete = await canDeleteMessage(messageId, socket.user.squidId);
      if (!canDelete) {
        socket.emit('error', {
          code: 'DELETE_NOT_ALLOWED',
          message: 'Cannot delete this message'
        });
        return;
      }
      
      // Delete message
      const deletedMessage = await deleteMessage(messageId);
      if (!deletedMessage) {
        socket.emit('error', {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found'
        });
        return;
      }
      
      // Broadcast deletion to room
      io.to(deletedMessage.roomId).emit('message:deleted', {
        messageId,
        deletedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Message delete error:', error);
      socket.emit('error', {
        code: 'MESSAGE_DELETE_FAILED',
        message: 'Failed to delete message'
      });
    }
  });
  
  /**
   * Add reaction to message
   */
  socket.on('message:react', async (data) => {
    try {
      const { messageId, emoji, action = 'ADD' } = data;
      
      if (!messageId || !emoji) {
        socket.emit('error', {
          code: 'INVALID_REACTION_DATA',
          message: 'Message ID and emoji are required'
        });
        return;
      }
      
      // Validate emoji format (simplified)
      const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
      if (!emojiRegex.test(emoji)) {
        socket.emit('error', {
          code: 'INVALID_EMOJI',
          message: 'Invalid emoji format'
        });
        return;
      }
      
      // Update reaction
      const result = await updateMessageReaction(messageId, emoji, socket.user.squidId, action);
      if (!result) {
        socket.emit('error', {
          code: 'REACTION_FAILED',
          message: 'Failed to update reaction'
        });
        return;
      }
      
      // Broadcast reaction update to room
      io.to(result.roomId).emit('message:reaction', {
        messageId,
        emoji,
        action,
        userId: socket.user.squidId,
        reactions: result.reactions
      });
      
    } catch (error) {
      console.error('Message reaction error:', error);
      socket.emit('error', {
        code: 'REACTION_FAILED',
        message: 'Failed to update reaction'
      });
    }
  });
  
  /**
   * Typing indicator
   */
  socket.on('typing', async (data) => {
    try {
      const { roomId, isTyping } = data;
      
      if (!roomId || !socket.rooms.has(roomId)) {
        return; // Silently ignore invalid typing events
      }
      
      socket.presence.typing = isTyping;
      
      // Broadcast typing status to room (except sender)
      socket.to(roomId).emit('typing', {
        squidId: socket.user.squidId,
        roomId,
        isTyping,
        timestamp: new Date().toISOString()
      });
      
      // Auto-stop typing after 3 seconds
      if (isTyping) {
        setTimeout(() => {
          if (socket.presence.typing) {
            socket.presence.typing = false;
            socket.to(roomId).emit('typing', {
              squidId: socket.user.squidId,
              roomId,
              isTyping: false,
              timestamp: new Date().toISOString()
            });
          }
        }, 3000);
      }
      
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  });
  
  /**
   * Get room members
   */
  socket.on('room:members', async (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId || !socket.rooms.has(roomId)) {
        socket.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'Not currently in this room'
        });
        return;
      }
      
      const members = await getRoomMembers(roomId);
      socket.emit('room:members', {
        roomId,
        members,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Get room members error:', error);
      socket.emit('error', {
        code: 'MEMBERS_FETCH_FAILED',
        message: 'Failed to fetch room members'
      });
    }
  });
  
  /**
   * Update presence status
   */
  socket.on('presence:update', async (data) => {
    try {
      const { status } = data;
      
      if (!['online', 'away', 'busy', 'invisible'].includes(status)) {
        socket.emit('error', {
          code: 'INVALID_STATUS',
          message: 'Invalid presence status'
        });
        return;
      }
      
      socket.presence.status = status;
      socket.presence.lastActivity = Date.now();
      
      // Broadcast presence update to all rooms user is in
      socket.rooms.forEach(roomId => {
        socket.to(roomId).emit('presence', {
          type: 'STATUS_CHANGED',
          squidId: socket.user.squidId,
          status,
          timestamp: new Date().toISOString()
        });
      });
      
    } catch (error) {
      console.error('Presence update error:', error);
    }
  });
  
  /**
   * Handle disconnection
   */
  socket.on('disconnect', (reason) => {
    console.log(`WebSocket disconnected: ${socket.user.squidId} (${socket.id}) - ${reason}`);
    
    // Notify all rooms about user going offline
    socket.rooms.forEach(roomId => {
      socket.to(roomId).emit('presence', {
        type: 'USER_OFFLINE',
        squidId: socket.user.squidId,
        roomId,
        timestamp: new Date().toISOString()
      });
    });
    
    // Clean up presence data
    socket.presence = null;
  });
  
  /**
   * Handle errors
   */
  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
    socket.emit('error', {
      code: 'WEBSOCKET_ERROR',
      message: 'WebSocket error occurred'
    });
  });
  
  // Send welcome message
  socket.emit('connected', {
    squidId: socket.user.squidId,
    timestamp: new Date().toISOString(),
    features: [
      'real-time-messaging',
      'presence-tracking',
      'typing-indicators',
      'message-reactions',
      'room-management'
    ]
  });
}

// Helper functions (simplified implementations for standalone mode)

async function validateRoomAccess(roomId, user) {
  // Mock room access validation
  return true;
}

async function getRoomMemberCount(roomId) {
  // Mock member count
  return Math.floor(Math.random() * 50) + 1;
}

async function getRecentMessages(roomId, limit) {
  // Mock recent messages
  return [];
}

async function checkRateLimit(squidId, action) {
  // Mock rate limiting - allow all in standalone mode
  return true;
}

async function moderateMessage(message) {
  // Basic content moderation
  const blockedWords = ['spam', 'abuse', 'hate'];
  const content = message.content.toLowerCase();
  
  for (const word of blockedWords) {
    if (content.includes(word)) {
      return { allowed: false, reason: 'blocked_content' };
    }
  }
  
  return { allowed: true };
}

async function storeMessage(message) {
  // Mock message storage
  console.log('Message stored:', message.messageId);
  return message;
}

async function updateRoomActivity(roomId) {
  // Mock room activity update
  console.log('Room activity updated:', roomId);
}

async function canEditMessage(messageId, userId) {
  // Mock edit permission check
  return true;
}

async function updateMessage(messageId, content) {
  // Mock message update
  return {
    messageId,
    content,
    roomId: 'mock_room_id',
    editedAt: new Date().toISOString()
  };
}

async function canDeleteMessage(messageId, userId) {
  // Mock delete permission check
  return true;
}

async function deleteMessage(messageId) {
  // Mock message deletion
  return {
    messageId,
    roomId: 'mock_room_id',
    deletedAt: new Date().toISOString()
  };
}

async function updateMessageReaction(messageId, emoji, userId, action) {
  // Mock reaction update
  return {
    messageId,
    roomId: 'mock_room_id',
    reactions: {
      [emoji]: action === 'ADD' ? [userId] : []
    }
  };
}

async function getRoomMembers(roomId) {
  // Mock room members
  return [
    {
      squidId: 'squid_user_123',
      displayName: 'User 123',
      status: 'online',
      role: 'MEMBER'
    }
  ];
}
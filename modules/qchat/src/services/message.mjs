/**
 * Message Service
 * Handles message sending, editing, deletion, and history management
 */

import { v4 as uuidv4 } from 'uuid';
import { mockServices } from '../../security/middleware.mjs';

class MessageService {
  constructor() {
    // In-memory storage for standalone mode
    this.messages = new Map(); // messageId -> message
    this.roomMessages = new Map(); // roomId -> Set of messageIds
    this.messageReactions = new Map(); // messageId -> { emoji -> Set of squidIds }
    this.userMutes = new Map(); // `${roomId}:${squidId}` -> muteUntil timestamp
  }

  /**
   * Send a message to a room
   */
  async sendMessage(messageData, user) {
    try {
      // Validate room exists and user has access
      await this.validateRoomAccess(messageData.roomId, user);
      
      // Check if user is muted
      const muteKey = `${messageData.roomId}:${user.squidId}`;
      const muteUntil = this.userMutes.get(muteKey);
      if (muteUntil && new Date(muteUntil) > new Date()) {
        const error = new Error('User is muted');
        error.code = 'USER_MUTED';
        throw error;
      }
      
      // Content moderation check
      await this.moderateContent(messageData.content, user);
      
      // Generate message ID
      const messageId = `qchat_msg_${uuidv4().replace(/-/g, '_')}`;
      
      // Encrypt message content
      const encryptedContent = await this.encryptMessage(messageData.content, messageData.roomId);
      
      // Create message object
      const message = {
        messageId,
        roomId: messageData.roomId,
        senderId: messageData.senderId,
        content: messageData.content, // Decrypted for processing
        encryptedContent,
        messageType: messageData.messageType,
        timestamp: messageData.timestamp,
        replyTo: messageData.replyTo,
        mentions: messageData.mentions || [],
        attachments: messageData.attachments || [],
        reactions: {},
        deliveryStatus: 'SENT',
        encryptionLevel: 'STANDARD', // From room settings
        ephemeral: messageData.ephemeral || false,
        expiresAt: messageData.expiresIn ? 
          new Date(Date.now() + messageData.expiresIn * 1000).toISOString() : null,
        deleted: false,
        signature: 'mock_signature',
        encryptedCid: `Qm${Math.random().toString(36).substring(2, 46)}`
      };
      
      // Store message
      this.messages.set(messageId, message);
      
      // Add to room messages
      const roomMessages = this.roomMessages.get(messageData.roomId) || new Set();
      roomMessages.add(messageId);
      this.roomMessages.set(messageData.roomId, roomMessages);
      
      // Store in IPFS
      await this.storeMessageInIPFS(message);
      
      // Index message
      await this.indexMessage(message);
      
      // Publish message sent event
      await this.publishEvent('q.qchat.message.sent.v1', {
        messageId,
        roomId: messageData.roomId,
        messageType: messageData.messageType,
        contentLength: messageData.content.length,
        hasAttachments: (messageData.attachments || []).length > 0,
        attachmentCount: (messageData.attachments || []).length,
        mentionCount: (messageData.mentions || []).length,
        encryptionLevel: message.encryptionLevel,
        ephemeral: message.ephemeral,
        deliveryStatus: message.deliveryStatus,
        recipientCount: 1 // Mock recipient count
      }, user);
      
      // Send real-time notification
      await this.notifyRoomMembers(messageData.roomId, 'message', message);
      
      return {
        messageId,
        timestamp: message.timestamp,
        encryptedCid: message.encryptedCid,
        deliveryStatus: message.deliveryStatus
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Get message history for a room
   */
  async getMessageHistory(roomId, user, filters = {}) {
    try {
      // Validate room access
      await this.validateRoomAccess(roomId, user);
      
      const roomMessages = this.roomMessages.get(roomId) || new Set();
      let messages = Array.from(roomMessages)
        .map(messageId => this.messages.get(messageId))
        .filter(message => message && !message.deleted);
      
      // Apply filters
      if (filters.since) {
        messages = messages.filter(msg => new Date(msg.timestamp) >= new Date(filters.since));
      }
      
      if (filters.until) {
        messages = messages.filter(msg => new Date(msg.timestamp) <= new Date(filters.until));
      }
      
      if (filters.messageTypes) {
        messages = messages.filter(msg => filters.messageTypes.includes(msg.messageType));
      }
      
      if (filters.fromUser) {
        messages = messages.filter(msg => msg.senderId === filters.fromUser);
      }
      
      // Sort by timestamp (newest first)
      messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply pagination
      let paginatedMessages = messages;
      if (filters.before) {
        const beforeIndex = messages.findIndex(msg => msg.messageId === filters.before);
        if (beforeIndex > 0) {
          paginatedMessages = messages.slice(beforeIndex);
        }
      }
      
      if (filters.after) {
        const afterIndex = messages.findIndex(msg => msg.messageId === filters.after);
        if (afterIndex >= 0) {
          paginatedMessages = messages.slice(0, afterIndex);
        }
      }
      
      paginatedMessages = paginatedMessages.slice(0, filters.limit || 50);
      
      // Decrypt messages for response
      const decryptedMessages = await Promise.all(
        paginatedMessages.map(async (message) => {
          const decryptedContent = await this.decryptMessage(message.encryptedContent, roomId);
          return {
            messageId: message.messageId,
            senderId: message.senderId,
            senderName: `User ${message.senderId.split('_').pop()}`, // Mock sender name
            content: decryptedContent,
            messageType: message.messageType,
            timestamp: message.timestamp,
            editedAt: message.editedAt,
            replyTo: message.replyTo,
            mentions: message.mentions,
            attachments: message.attachments,
            reactions: message.reactions,
            deliveryStatus: message.deliveryStatus,
            encryptionLevel: message.encryptionLevel,
            deleted: message.deleted
          };
        })
      );
      
      return {
        messages: decryptedMessages,
        totalCount: messages.length,
        hasMore: messages.length > (filters.limit || 50),
        nextCursor: paginatedMessages.length > 0 ? 
          paginatedMessages[paginatedMessages.length - 1].messageId : null
      };
    } catch (error) {
      console.error('Get message history error:', error);
      throw error;
    }
  }

  /**
   * Get a specific message
   */
  async getMessage(roomId, messageId, user) {
    try {
      // Validate room access
      await this.validateRoomAccess(roomId, user);
      
      const message = this.messages.get(messageId);
      if (!message || message.roomId !== roomId) {
        return null;
      }
      
      // Decrypt message content
      const decryptedContent = await this.decryptMessage(message.encryptedContent, roomId);
      
      return {
        messageId: message.messageId,
        senderId: message.senderId,
        senderName: `User ${message.senderId.split('_').pop()}`,
        content: decryptedContent,
        messageType: message.messageType,
        timestamp: message.timestamp,
        editedAt: message.editedAt,
        replyTo: message.replyTo,
        mentions: message.mentions,
        attachments: message.attachments,
        reactions: message.reactions,
        deliveryStatus: message.deliveryStatus,
        encryptionLevel: message.encryptionLevel,
        deleted: message.deleted
      };
    } catch (error) {
      console.error('Get message error:', error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(roomId, messageId, newContent, user) {
    try {
      const message = this.messages.get(messageId);
      if (!message || message.roomId !== roomId) {
        return null;
      }
      
      // Check if user can edit (only sender can edit their own messages)
      if (message.senderId !== user.squidId) {
        const error = new Error('Can only edit your own messages');
        error.code = 'ACCESS_DENIED';
        throw error;
      }
      
      // Check edit time limit (15 minutes)
      const editTimeLimit = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - new Date(message.timestamp).getTime() > editTimeLimit) {
        const error = new Error('Edit time expired');
        error.code = 'EDIT_TIME_EXPIRED';
        throw error;
      }
      
      // Content moderation check
      await this.moderateContent(newContent, user);
      
      // Encrypt new content
      const encryptedContent = await this.encryptMessage(newContent, roomId);
      
      // Update message
      message.content = newContent;
      message.encryptedContent = encryptedContent;
      message.editedAt = new Date().toISOString();
      
      // Store updated message in IPFS
      await this.storeMessageInIPFS(message);
      
      // Publish message edited event
      await this.publishEvent('q.qchat.message.edited.v1', {
        messageId,
        roomId,
        editedBy: user.squidId,
        contentLength: newContent.length
      }, user);
      
      // Send real-time notification
      await this.notifyRoomMembers(roomId, 'message:edited', {
        messageId,
        content: newContent,
        editedAt: message.editedAt
      });
      
      return {
        messageId,
        content: newContent,
        editedAt: message.editedAt
      };
    } catch (error) {
      console.error('Edit message error:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(roomId, messageId, user) {
    try {
      const message = this.messages.get(messageId);
      if (!message || message.roomId !== roomId) {
        return null;
      }
      
      // Check permissions (sender or moderator can delete)
      const canDelete = message.senderId === user.squidId || 
                       await this.hasModeratorPermissions(roomId, user);
      
      if (!canDelete) {
        const error = new Error('Insufficient permissions');
        error.code = 'ACCESS_DENIED';
        throw error;
      }
      
      // Mark as deleted
      message.deleted = true;
      message.deletedAt = new Date().toISOString();
      message.deletedBy = user.squidId;
      
      // Store deletion record in IPFS
      await this.storeMessageInIPFS(message);
      
      // Publish message deleted event
      await this.publishEvent('q.qchat.message.deleted.v1', {
        messageId,
        roomId,
        deletedBy: user.squidId,
        originalSender: message.senderId
      }, user);
      
      // Send real-time notification
      await this.notifyRoomMembers(roomId, 'message:deleted', {
        messageId,
        deletedAt: message.deletedAt
      });
      
      return true;
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  }

  /**
   * Add reaction to message
   */
  async addReaction(roomId, messageId, emoji, user) {
    try {
      const message = this.messages.get(messageId);
      if (!message || message.roomId !== roomId) {
        const error = new Error('Message not found');
        error.code = 'MESSAGE_NOT_FOUND';
        throw error;
      }
      
      // Validate room access
      await this.validateRoomAccess(roomId, user);
      
      // Initialize reactions if not exists
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }
      
      // Check if user already reacted with this emoji
      if (message.reactions[emoji].includes(user.squidId)) {
        const error = new Error('Reaction already exists');
        error.code = 'REACTION_EXISTS';
        throw error;
      }
      
      // Add reaction
      message.reactions[emoji].push(user.squidId);
      
      // Publish reaction event
      await this.publishEvent('q.qchat.message.reaction.added.v1', {
        messageId,
        roomId,
        emoji,
        userId: user.squidId
      }, user);
      
      // Send real-time notification
      await this.notifyRoomMembers(roomId, 'message:reaction', {
        messageId,
        emoji,
        action: 'ADD',
        userId: user.squidId
      });
      
      return {
        messageId,
        emoji,
        reactions: message.reactions[emoji]
      };
    } catch (error) {
      console.error('Add reaction error:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(roomId, messageId, emoji, user) {
    try {
      const message = this.messages.get(messageId);
      if (!message || message.roomId !== roomId) {
        return null;
      }
      
      // Check if reaction exists
      if (!message.reactions[emoji] || !message.reactions[emoji].includes(user.squidId)) {
        return null;
      }
      
      // Remove reaction
      message.reactions[emoji] = message.reactions[emoji].filter(id => id !== user.squidId);
      
      // Remove emoji key if no reactions left
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
      
      // Publish reaction event
      await this.publishEvent('q.qchat.message.reaction.removed.v1', {
        messageId,
        roomId,
        emoji,
        userId: user.squidId
      }, user);
      
      // Send real-time notification
      await this.notifyRoomMembers(roomId, 'message:reaction', {
        messageId,
        emoji,
        action: 'REMOVE',
        userId: user.squidId
      });
      
      return true;
    } catch (error) {
      console.error('Remove reaction error:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(searchParams, user) {
    try {
      const { query, roomIds, dateRange, messageTypes, fromUser, limit } = searchParams;
      
      // Get all messages user has access to
      let allMessages = [];
      
      if (roomIds && roomIds.length > 0) {
        // Search specific rooms
        for (const roomId of roomIds) {
          try {
            await this.validateRoomAccess(roomId, user);
            const roomMessages = this.roomMessages.get(roomId) || new Set();
            const messages = Array.from(roomMessages)
              .map(messageId => this.messages.get(messageId))
              .filter(message => message && !message.deleted);
            allMessages.push(...messages);
          } catch (error) {
            // Skip rooms user doesn't have access to
            continue;
          }
        }
      } else {
        // Search all accessible rooms
        for (const [roomId, messageIds] of this.roomMessages.entries()) {
          try {
            await this.validateRoomAccess(roomId, user);
            const messages = Array.from(messageIds)
              .map(messageId => this.messages.get(messageId))
              .filter(message => message && !message.deleted);
            allMessages.push(...messages);
          } catch (error) {
            // Skip rooms user doesn't have access to
            continue;
          }
        }
      }
      
      // Apply filters
      if (dateRange) {
        if (dateRange.from) {
          allMessages = allMessages.filter(msg => 
            new Date(msg.timestamp) >= new Date(dateRange.from)
          );
        }
        if (dateRange.to) {
          allMessages = allMessages.filter(msg => 
            new Date(msg.timestamp) <= new Date(dateRange.to)
          );
        }
      }
      
      if (messageTypes) {
        allMessages = allMessages.filter(msg => messageTypes.includes(msg.messageType));
      }
      
      if (fromUser) {
        allMessages = allMessages.filter(msg => msg.senderId === fromUser);
      }
      
      // Search in message content (simplified text search)
      const searchTerm = query.toLowerCase();
      const matchingMessages = allMessages.filter(message => 
        message.content.toLowerCase().includes(searchTerm)
      );
      
      // Sort by relevance (simplified - by timestamp)
      matchingMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply limit
      const limitedResults = matchingMessages.slice(0, limit);
      
      // Format results
      const results = limitedResults.map(message => ({
        messageId: message.messageId,
        roomId: message.roomId,
        subject: message.content.substring(0, 100), // First 100 chars as snippet
        snippet: this.generateSnippet(message.content, searchTerm),
        senderId: message.senderId,
        timestamp: message.timestamp,
        relevanceScore: 1.0 // Mock relevance score
      }));
      
      return {
        results,
        totalMatches: matchingMessages.length,
        searchTime: Math.random() * 100 // Mock search time in ms
      };
    } catch (error) {
      console.error('Search messages error:', error);
      throw error;
    }
  }

  /**
   * Validate room access for user
   */
  async validateRoomAccess(roomId, user) {
    // Mock room access validation
    // In real implementation, this would check room membership and permissions
    if (process.env.QCHAT_MODE === 'standalone') {
      return true; // Allow all access in standalone mode
    }
    
    // Real implementation would validate against room service
    return true;
  }

  /**
   * Check if user has moderator permissions
   */
  async hasModeratorPermissions(roomId, user) {
    // Mock moderator check
    // In real implementation, this would check user role in room
    return user.squidId === 'squid_admin_123'; // Mock admin user
  }

  /**
   * Moderate message content
   */
  async moderateContent(content, user) {
    try {
      // Basic content moderation (simplified)
      const blockedWords = ['spam', 'abuse', 'hate'];
      const lowerContent = content.toLowerCase();
      
      for (const word of blockedWords) {
        if (lowerContent.includes(word)) {
          const error = new Error('Content blocked by moderation');
          error.code = 'CONTENT_BLOCKED';
          throw error;
        }
      }
      
      // Report to Qerberos for analysis
      await mockServices.qerberos.reportSecurityEvent({
        type: 'MESSAGE_CONTENT_ANALYSIS',
        squidId: user.squidId,
        content: content.substring(0, 100), // First 100 chars
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Content moderation error:', error);
      throw error;
    }
  }

  /**
   * Encrypt message content
   */
  async encryptMessage(content, roomId) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        // Mock encryption - just base64 encode
        return Buffer.from(content).toString('base64');
      }
      
      // Real implementation would use Qlock service
      return `encrypted_${content}`;
    } catch (error) {
      console.error('Message encryption error:', error);
      return content; // Fallback to plaintext
    }
  }

  /**
   * Decrypt message content
   */
  async decryptMessage(encryptedContent, roomId) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        // Mock decryption - base64 decode
        try {
          return Buffer.from(encryptedContent, 'base64').toString('utf8');
        } catch {
          return encryptedContent; // Return as-is if not base64
        }
      }
      
      // Real implementation would use Qlock service
      return encryptedContent.replace('encrypted_', '');
    } catch (error) {
      console.error('Message decryption error:', error);
      return '[Decryption failed]';
    }
  }

  /**
   * Store message in IPFS
   */
  async storeMessageInIPFS(message) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Message stored in IPFS:', message.messageId);
        return;
      }
      
      // Real implementation would store in IPFS
    } catch (error) {
      console.error('IPFS storage error:', error);
      // Don't throw - storage failures shouldn't break messaging
    }
  }

  /**
   * Index message for search
   */
  async indexMessage(message) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Message indexed:', message.messageId);
        return;
      }
      
      // Real implementation would use Qindex service
    } catch (error) {
      console.error('Message indexing error:', error);
      // Don't throw - indexing failures shouldn't break messaging
    }
  }

  /**
   * Publish event to event bus
   */
  async publishEvent(topic, data, user) {
    try {
      const event = {
        eventId: `qchat_event_${uuidv4().replace(/-/g, '_')}`,
        topic,
        timestamp: new Date().toISOString(),
        source: 'qchat',
        version: '1.0.0',
        actor: {
          squidId: user.squidId,
          subId: user.subId,
          daoId: user.daoId
        },
        data,
        metadata: {
          correlationId: uuidv4(),
          signature: 'mock_signature',
          cid: `Qm${Math.random().toString(36).substring(2, 46)}`
        }
      };
      
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Event published:', topic, data);
        return event;
      }
      
      // Real implementation would publish to event bus
      return event;
    } catch (error) {
      console.error('Event publishing error:', error);
    }
  }

  /**
   * Notify room members via WebSocket
   */
  async notifyRoomMembers(roomId, eventType, data) {
    try {
      // This would integrate with WebSocket service to send real-time notifications
      console.log(`WebSocket notification: ${eventType} in room ${roomId}`, data);
    } catch (error) {
      console.error('WebSocket notification error:', error);
    }
  }

  /**
   * Generate search snippet
   */
  generateSnippet(content, searchTerm, maxLength = 150) {
    const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + searchTerm.length + 50);
    
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }
}

export default MessageService;
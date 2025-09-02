/**
 * Message Service
 * Core service for handling encrypted message operations
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class MessageService {
  constructor(dependencies) {
    this.encryption = dependencies.encryption;
    this.squid = dependencies.squid;
    this.qonsent = dependencies.qonsent;
    this.qindex = dependencies.qindex;
    this.qerberos = dependencies.qerberos;
    this.qmask = dependencies.qmask;
    this.qwallet = dependencies.qwallet;
    this.ipfs = dependencies.ipfs;
    this.event = dependencies.event;
    
    // In-memory message store for demo (would be persistent storage in production)
    this.messages = new Map();
  }

  /**
   * Send an encrypted message
   */
  async sendMessage(senderId, messageData) {
    const messageId = `msg_${uuidv4().replace(/-/g, '')}`;
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`[MessageService] Sending message ${messageId} from ${senderId}`);

      // 1. Verify sender identity
      const senderValid = await this.squid.verifyIdentity(senderId);
      if (!senderValid) {
        throw new Error('Invalid sender identity');
      }

      // 2. Check permissions
      const canSend = await this.qonsent.checkPermission(
        senderId, 
        'message.send', 
        messageData.recipientId
      );
      if (!canSend) {
        throw new Error('Permission denied to send message');
      }

      // 3. Analyze content for spam/threats
      const analysis = await this.qerberos.analyzeMessage(
        messageData.content,
        {
          senderId,
          recipientId: messageData.recipientId,
          subject: messageData.subject
        }
      );

      if (analysis.recommendation === 'BLOCK') {
        throw new Error('Message blocked due to security analysis');
      }

      // 4. Apply privacy masking if requested
      let maskedMetadata = messageData;
      if (messageData.applyPrivacyMask) {
        maskedMetadata = await this.qmask.applyProfile(messageData, 'messaging');
      }

      // 5. Encrypt message content
      const encryptionLevel = messageData.encryptionLevel || 'STANDARD';
      const encryptedContent = await this.encryption.encryptMessage(
        messageData.content,
        messageData.recipientId,
        encryptionLevel
      );

      // 6. Process attachments
      const processedAttachments = [];
      if (messageData.attachments && messageData.attachments.length > 0) {
        for (const attachment of messageData.attachments) {
          const encryptedAttachment = await this.encryption.encryptAttachment(
            attachment,
            messageData.recipientId,
            encryptionLevel
          );
          processedAttachments.push(encryptedAttachment);
        }
      }

      // 7. Create message object
      const message = {
        messageId,
        senderId,
        recipientId: messageData.recipientId,
        subject: messageData.subject,
        encryptedContent: encryptedContent.data,
        encryptionLevel,
        priority: messageData.priority || 'NORMAL',
        status: 'SENT',
        timestamp,
        expiresAt: messageData.expiresIn 
          ? new Date(Date.now() + messageData.expiresIn * 1000).toISOString()
          : null,
        attachments: processedAttachments,
        signature: await this.encryption.signMessage(messageId, senderId),
        deliveryTracking: `track_${uuidv4().replace(/-/g, '')}`,
        certifiedDelivery: messageData.certifiedDelivery !== false,
        metadata: {
          size: Buffer.byteLength(messageData.content, 'utf8'),
          spamScore: analysis.spamScore,
          riskScore: analysis.riskScore,
          threadId: messageData.metadata?.threadId,
          replyToMessageId: messageData.metadata?.replyToMessageId
        }
      };

      // 8. Store in IPFS
      const ipfsCid = await this.ipfs.storeMessage(message);
      message.ipfsCid = ipfsCid;

      // 9. Index message
      await this.qindex.indexMessage({
        messageId,
        senderId,
        recipientId: messageData.recipientId,
        subject: messageData.subject,
        timestamp,
        ipfsCid,
        tags: messageData.metadata?.tags || []
      });

      // 10. Store locally
      this.messages.set(messageId, message);

      // 11. Publish event
      await this.event.publishEvent('q.qmail.sent.v1', {
        messageId,
        senderId,
        recipientId: messageData.recipientId,
        subject: messageData.subject,
        encryptionLevel,
        priority: message.priority,
        timestamp,
        expiresAt: message.expiresAt,
        ipfsCid,
        deliveryTracking: message.deliveryTracking,
        certifiedDelivery: message.certifiedDelivery,
        attachmentCount: processedAttachments.length,
        totalSize: message.metadata.size,
        signature: message.signature,
        metadata: {
          threadId: message.metadata.threadId,
          replyToMessageId: message.metadata.replyToMessageId,
          spamScore: analysis.spamScore,
          riskScore: analysis.riskScore
        }
      });

      // 12. Log audit event
      await this.qerberos.logAuditEvent({
        type: 'MESSAGE_SENT',
        actor: senderId,
        resource: messageId,
        details: {
          recipientId: messageData.recipientId,
          encryptionLevel,
          size: message.metadata.size,
          attachmentCount: processedAttachments.length
        }
      });

      console.log(`[MessageService] Message ${messageId} sent successfully`);

      return {
        messageId,
        status: 'SENT',
        encryptedCid: ipfsCid,
        deliveryTracking: message.deliveryTracking,
        timestamp,
        expiresAt: message.expiresAt
      };

    } catch (error) {
      console.error(`[MessageService] Failed to send message ${messageId}:`, error);
      
      // Log failure
      await this.qerberos.logAuditEvent({
        type: 'MESSAGE_SEND_FAILED',
        actor: senderId,
        resource: messageId,
        details: {
          error: error.message,
          recipientId: messageData.recipientId
        }
      });

      throw error;
    }
  }

  /**
   * Get messages for a recipient
   */
  async getMessages(recipientId, options = {}) {
    try {
      console.log(`[MessageService] Getting messages for ${recipientId}`);

      // Check permissions
      const canRead = await this.qonsent.checkPermission(
        recipientId,
        'message.read',
        'inbox'
      );
      if (!canRead) {
        throw new Error('Permission denied to read messages');
      }

      // Get messages from storage
      const allMessages = Array.from(this.messages.values());
      let userMessages = allMessages.filter(msg => 
        msg.recipientId === recipientId || 
        (options.folder === 'SENT' && msg.senderId === recipientId)
      );

      // Apply filters
      if (options.folder && options.folder !== 'ALL') {
        if (options.folder === 'INBOX') {
          userMessages = userMessages.filter(msg => msg.recipientId === recipientId);
        } else if (options.folder === 'SENT') {
          userMessages = userMessages.filter(msg => msg.senderId === recipientId);
        }
      }

      if (options.unreadOnly) {
        userMessages = userMessages.filter(msg => msg.status === 'UNREAD');
      }

      if (options.since) {
        const sinceDate = new Date(options.since);
        userMessages = userMessages.filter(msg => new Date(msg.timestamp) >= sinceDate);
      }

      // Sort by timestamp (newest first)
      userMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      const totalCount = userMessages.length;
      const paginatedMessages = userMessages.slice(offset, offset + limit);

      // Decrypt messages for recipient
      const decryptedMessages = [];
      for (const message of paginatedMessages) {
        try {
          const decryptedContent = await this.encryption.decryptMessage(
            message.encryptedContent,
            recipientId,
            message.encryptionLevel
          );

          decryptedMessages.push({
            messageId: message.messageId,
            senderId: message.senderId,
            subject: message.subject,
            content: decryptedContent,
            encryptionLevel: message.encryptionLevel,
            priority: message.priority,
            status: message.status,
            timestamp: message.timestamp,
            expiresAt: message.expiresAt,
            attachments: message.attachments,
            deliveryReceipt: message.certifiedDelivery,
            signature: message.signature
          });
        } catch (decryptError) {
          console.error(`[MessageService] Failed to decrypt message ${message.messageId}:`, decryptError);
          // Include message with error indicator
          decryptedMessages.push({
            messageId: message.messageId,
            senderId: message.senderId,
            subject: message.subject,
            content: '[DECRYPTION_FAILED]',
            encryptionLevel: message.encryptionLevel,
            priority: message.priority,
            status: 'DECRYPTION_ERROR',
            timestamp: message.timestamp,
            error: 'Failed to decrypt message'
          });
        }
      }

      // Log access
      await this.qerberos.logAuditEvent({
        type: 'MESSAGES_ACCESSED',
        actor: recipientId,
        resource: 'inbox',
        details: {
          folder: options.folder || 'INBOX',
          messageCount: decryptedMessages.length,
          totalCount
        }
      });

      const unreadCount = userMessages.filter(msg => msg.status === 'UNREAD').length;

      return {
        messages: decryptedMessages,
        totalCount,
        unreadCount,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      console.error(`[MessageService] Failed to get messages for ${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific message
   */
  async getMessage(messageId, requesterId) {
    try {
      console.log(`[MessageService] Getting message ${messageId} for ${requesterId}`);

      const message = this.messages.get(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if requester has access to this message
      const hasAccess = message.senderId === requesterId || message.recipientId === requesterId;
      if (!hasAccess) {
        throw new Error('Access denied to message');
      }

      // Check permissions
      const canRead = await this.qonsent.checkPermission(
        requesterId,
        'message.read',
        messageId
      );
      if (!canRead) {
        throw new Error('Permission denied to read message');
      }

      // Decrypt message content
      const decryptedContent = await this.encryption.decryptMessage(
        message.encryptedContent,
        requesterId,
        message.encryptionLevel
      );

      // Mark as read if recipient is accessing
      if (message.recipientId === requesterId && message.status === 'UNREAD') {
        message.status = 'READ';
        this.messages.set(messageId, message);

        // Publish read event
        await this.event.publishEvent('q.qmail.read.v1', {
          messageId,
          recipientId: requesterId,
          readTimestamp: new Date().toISOString()
        });
      }

      // Log access
      await this.qerberos.logAuditEvent({
        type: 'MESSAGE_ACCESSED',
        actor: requesterId,
        resource: messageId,
        details: {
          accessType: 'READ',
          messageSize: message.metadata.size
        }
      });

      return {
        messageId: message.messageId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        subject: message.subject,
        content: decryptedContent,
        encryptionLevel: message.encryptionLevel,
        priority: message.priority,
        status: message.status,
        timestamp: message.timestamp,
        expiresAt: message.expiresAt,
        attachments: message.attachments,
        deliveryReceipt: message.certifiedDelivery,
        signature: message.signature
      };

    } catch (error) {
      console.error(`[MessageService] Failed to get message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a message (GDPR compliance)
   */
  async deleteMessage(messageId, requesterId) {
    try {
      console.log(`[MessageService] Deleting message ${messageId} by ${requesterId}`);

      const message = this.messages.get(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if requester has permission to delete
      const canDelete = message.senderId === requesterId || message.recipientId === requesterId;
      if (!canDelete) {
        throw new Error('Access denied to delete message');
      }

      // Check permissions
      const hasPermission = await this.qonsent.checkPermission(
        requesterId,
        'message.delete',
        messageId
      );
      if (!hasPermission) {
        throw new Error('Permission denied to delete message');
      }

      // Remove from IPFS (mark for garbage collection)
      if (message.ipfsCid) {
        await this.ipfs.unpinContent(message.ipfsCid);
      }

      // Remove from index
      await this.qindex.removeMessage(messageId);

      // Remove from local storage
      this.messages.delete(messageId);

      // Log deletion
      await this.qerberos.logAuditEvent({
        type: 'MESSAGE_DELETED',
        actor: requesterId,
        resource: messageId,
        details: {
          deletionReason: 'USER_REQUEST',
          messageSize: message.metadata.size
        }
      });

      console.log(`[MessageService] Message ${messageId} deleted successfully`);

      return { success: true };

    } catch (error) {
      console.error(`[MessageService] Failed to delete message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Get message statistics
   */
  async getMessageStats(userId) {
    try {
      const allMessages = Array.from(this.messages.values());
      const userMessages = allMessages.filter(msg => 
        msg.recipientId === userId || msg.senderId === userId
      );
      
      const received = userMessages.filter(msg => msg.recipientId === userId);
      const sent = userMessages.filter(msg => msg.senderId === userId);
      const unread = received.filter(msg => msg.status === 'UNREAD');

      return {
        total: userMessages.length,
        unread: unread.length,
        sent: sent.length,
        received: received.length
      };
    } catch (error) {
      console.error(`[MessageService] Failed to get stats for ${userId}:`, error);
      throw error;
    }
  }
}
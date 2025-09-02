/**
 * Message Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService } from '../../src/services/messageService.mjs';

// Mock dependencies
const mockDependencies = {
  encryption: {
    encryptMessage: vi.fn().mockResolvedValue({ data: 'encrypted_content' }),
    decryptMessage: vi.fn().mockResolvedValue('decrypted_content'),
    signMessage: vi.fn().mockResolvedValue('signature_123'),
    encryptAttachment: vi.fn().mockResolvedValue({
      name: 'test.txt',
      cid: 'QmTest123',
      size: 1024,
      mimeType: 'text/plain',
      encryptionKey: 'key_123',
      checksum: 'checksum_123'
    })
  },
  squid: {
    verifyIdentity: vi.fn().mockResolvedValue(true)
  },
  qonsent: {
    checkPermission: vi.fn().mockResolvedValue(true)
  },
  qindex: {
    indexMessage: vi.fn().mockResolvedValue(true),
    removeMessage: vi.fn().mockResolvedValue(true)
  },
  qerberos: {
    analyzeMessage: vi.fn().mockResolvedValue({
      spamScore: 0.1,
      riskScore: 0.05,
      recommendation: 'ALLOW'
    }),
    logAuditEvent: vi.fn().mockResolvedValue(true)
  },
  qmask: {
    applyProfile: vi.fn().mockImplementation(data => Promise.resolve(data))
  },
  qwallet: {
    checkBalance: vi.fn().mockResolvedValue(true)
  },
  ipfs: {
    storeMessage: vi.fn().mockResolvedValue('QmMessage123'),
    unpinContent: vi.fn().mockResolvedValue(true)
  },
  event: {
    publishEvent: vi.fn().mockResolvedValue(true)
  }
};

describe('MessageService', () => {
  let messageService;

  beforeEach(() => {
    messageService = new MessageService(mockDependencies);
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    const senderId = 'squid_alice_123';
    const messageData = {
      recipientId: 'squid_bob_456',
      subject: 'Test Message',
      content: 'Hello, this is a test message',
      encryptionLevel: 'STANDARD',
      priority: 'NORMAL'
    };

    it('should send a message successfully', async () => {
      const result = await messageService.sendMessage(senderId, messageData);

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('status', 'SENT');
      expect(result).toHaveProperty('encryptedCid', 'QmMessage123');
      expect(result).toHaveProperty('deliveryTracking');
      expect(result).toHaveProperty('timestamp');

      // Verify service calls
      expect(mockDependencies.squid.verifyIdentity).toHaveBeenCalledWith(senderId);
      expect(mockDependencies.qonsent.checkPermission).toHaveBeenCalledWith(
        senderId,
        'message.send',
        messageData.recipientId
      );
      expect(mockDependencies.qerberos.analyzeMessage).toHaveBeenCalled();
      expect(mockDependencies.encryption.encryptMessage).toHaveBeenCalled();
      expect(mockDependencies.ipfs.storeMessage).toHaveBeenCalled();
      expect(mockDependencies.qindex.indexMessage).toHaveBeenCalled();
      expect(mockDependencies.event.publishEvent).toHaveBeenCalledWith(
        'q.qmail.sent.v1',
        expect.any(Object)
      );
    });

    it('should reject message with invalid sender identity', async () => {
      mockDependencies.squid.verifyIdentity.mockResolvedValueOnce(false);

      await expect(messageService.sendMessage(senderId, messageData))
        .rejects.toThrow('Invalid sender identity');
    });

    it('should reject message without permission', async () => {
      mockDependencies.qonsent.checkPermission.mockResolvedValueOnce(false);

      await expect(messageService.sendMessage(senderId, messageData))
        .rejects.toThrow('Permission denied to send message');
    });

    it('should block message flagged as spam', async () => {
      mockDependencies.qerberos.analyzeMessage.mockResolvedValueOnce({
        spamScore: 0.9,
        riskScore: 0.8,
        recommendation: 'BLOCK'
      });

      await expect(messageService.sendMessage(senderId, messageData))
        .rejects.toThrow('Message blocked due to security analysis');
    });

    it('should handle attachments', async () => {
      const messageWithAttachments = {
        ...messageData,
        attachments: [
          {
            name: 'document.pdf',
            cid: 'QmDoc123',
            size: 2048,
            mimeType: 'application/pdf',
            checksum: 'doc_checksum'
          }
        ]
      };

      const result = await messageService.sendMessage(senderId, messageWithAttachments);

      expect(result.status).toBe('SENT');
      expect(mockDependencies.encryption.encryptAttachment).toHaveBeenCalledWith(
        messageWithAttachments.attachments[0],
        messageData.recipientId,
        'STANDARD'
      );
    });
  });

  describe('getMessages', () => {
    const recipientId = 'squid_bob_456';

    beforeEach(() => {
      // Add a test message to the service
      messageService.messages.set('msg_test_123', {
        messageId: 'msg_test_123',
        senderId: 'squid_alice_123',
        recipientId: recipientId,
        subject: 'Test Message',
        encryptedContent: 'encrypted_content',
        encryptionLevel: 'STANDARD',
        priority: 'NORMAL',
        status: 'UNREAD',
        timestamp: new Date().toISOString(),
        attachments: [],
        signature: 'signature_123',
        certifiedDelivery: true,
        metadata: { size: 100 }
      });
    });

    it('should retrieve messages for recipient', async () => {
      const result = await messageService.getMessages(recipientId);

      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('totalCount', 1);
      expect(result).toHaveProperty('unreadCount', 1);
      expect(result).toHaveProperty('hasMore', false);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toHaveProperty('messageId', 'msg_test_123');
      expect(result.messages[0]).toHaveProperty('content', 'decrypted_content');

      expect(mockDependencies.qonsent.checkPermission).toHaveBeenCalledWith(
        recipientId,
        'message.read',
        'inbox'
      );
      expect(mockDependencies.encryption.decryptMessage).toHaveBeenCalled();
    });

    it('should filter unread messages only', async () => {
      const options = { unreadOnly: true };
      const result = await messageService.getMessages(recipientId, options);

      expect(result.messages).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
    });

    it('should apply pagination', async () => {
      const options = { limit: 1, offset: 0 };
      const result = await messageService.getMessages(recipientId, options);

      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should reject access without permission', async () => {
      mockDependencies.qonsent.checkPermission.mockResolvedValueOnce(false);

      await expect(messageService.getMessages(recipientId))
        .rejects.toThrow('Permission denied to read messages');
    });
  });

  describe('getMessage', () => {
    const messageId = 'msg_test_123';
    const requesterId = 'squid_bob_456';

    beforeEach(() => {
      messageService.messages.set(messageId, {
        messageId,
        senderId: 'squid_alice_123',
        recipientId: requesterId,
        subject: 'Test Message',
        encryptedContent: 'encrypted_content',
        encryptionLevel: 'STANDARD',
        priority: 'NORMAL',
        status: 'UNREAD',
        timestamp: new Date().toISOString(),
        attachments: [],
        signature: 'signature_123',
        certifiedDelivery: true,
        metadata: { size: 100 }
      });
    });

    it('should retrieve specific message', async () => {
      const result = await messageService.getMessage(messageId, requesterId);

      expect(result).toHaveProperty('messageId', messageId);
      expect(result).toHaveProperty('content', 'decrypted_content');
      expect(result).toHaveProperty('status', 'READ'); // Should be marked as read

      expect(mockDependencies.qonsent.checkPermission).toHaveBeenCalledWith(
        requesterId,
        'message.read',
        messageId
      );
      expect(mockDependencies.encryption.decryptMessage).toHaveBeenCalled();
    });

    it('should reject access to non-existent message', async () => {
      await expect(messageService.getMessage('msg_nonexistent', requesterId))
        .rejects.toThrow('Message not found');
    });

    it('should reject access without permission', async () => {
      const unauthorizedUser = 'squid_charlie_789';

      await expect(messageService.getMessage(messageId, unauthorizedUser))
        .rejects.toThrow('Access denied to message');
    });
  });

  describe('deleteMessage', () => {
    const messageId = 'msg_test_123';
    const requesterId = 'squid_bob_456';

    beforeEach(() => {
      messageService.messages.set(messageId, {
        messageId,
        senderId: 'squid_alice_123',
        recipientId: requesterId,
        subject: 'Test Message',
        encryptedContent: 'encrypted_content',
        ipfsCid: 'QmMessage123',
        metadata: { size: 100 }
      });
    });

    it('should delete message successfully', async () => {
      const result = await messageService.deleteMessage(messageId, requesterId);

      expect(result).toHaveProperty('success', true);
      expect(messageService.messages.has(messageId)).toBe(false);

      expect(mockDependencies.qonsent.checkPermission).toHaveBeenCalledWith(
        requesterId,
        'message.delete',
        messageId
      );
      expect(mockDependencies.ipfs.unpinContent).toHaveBeenCalledWith('QmMessage123');
      expect(mockDependencies.qindex.removeMessage).toHaveBeenCalledWith(messageId);
      expect(mockDependencies.qerberos.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MESSAGE_DELETED',
          actor: requesterId,
          resource: messageId
        })
      );
    });

    it('should reject deletion of non-existent message', async () => {
      await expect(messageService.deleteMessage('msg_nonexistent', requesterId))
        .rejects.toThrow('Message not found');
    });

    it('should reject deletion without permission', async () => {
      const unauthorizedUser = 'squid_charlie_789';

      await expect(messageService.deleteMessage(messageId, unauthorizedUser))
        .rejects.toThrow('Access denied to delete message');
    });
  });

  describe('getMessageStats', () => {
    const userId = 'squid_bob_456';

    beforeEach(() => {
      // Add test messages
      messageService.messages.set('msg_received_1', {
        messageId: 'msg_received_1',
        senderId: 'squid_alice_123',
        recipientId: userId,
        status: 'UNREAD'
      });

      messageService.messages.set('msg_received_2', {
        messageId: 'msg_received_2',
        senderId: 'squid_alice_123',
        recipientId: userId,
        status: 'READ'
      });

      messageService.messages.set('msg_sent_1', {
        messageId: 'msg_sent_1',
        senderId: userId,
        recipientId: 'squid_alice_123',
        status: 'SENT'
      });
    });

    it('should return correct message statistics', async () => {
      const result = await messageService.getMessageStats(userId);

      expect(result).toEqual({
        total: 3,
        unread: 1,
        sent: 1,
        received: 2
      });
    });
  });
});
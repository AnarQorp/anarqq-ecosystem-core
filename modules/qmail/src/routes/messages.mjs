/**
 * Message Routes
 * HTTP API routes for message operations
 */

import express from 'express';
import { getService } from '../services/index.mjs';
import {
  authorizeAction,
  analyzeContent,
  rateLimitByIdentity,
  validateRequest
} from '../../security/middleware.mjs';

const router = express.Router();

// Message sending validation schema
const sendMessageSchema = {
  required: ['recipientId', 'subject', 'content'],
  maxLengths: {
    subject: 200,
    content: 1048576 // 1MB
  }
};

/**
 * Send encrypted message
 */
router.post('/send',
  rateLimitByIdentity(100, 3600000), // 100 messages per hour
  validateRequest(sendMessageSchema),
  authorizeAction('message.send'),
  analyzeContent,
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { squidId } = req.identity;

      const result = await messageService.sendMessage(squidId, {
        recipientId: req.body.recipientId,
        subject: req.body.subject,
        content: req.body.content,
        encryptionLevel: req.body.encryptionLevel || 'STANDARD',
        priority: req.body.priority || 'NORMAL',
        certifiedDelivery: req.body.certifiedDelivery !== false,
        expiresIn: req.body.expiresIn,
        attachments: req.body.attachments || [],
        metadata: req.body.metadata || {}
      });

      res.json({
        status: 'ok',
        code: 'MESSAGE_SENT',
        message: 'Message sent successfully',
        data: result
      });

    } catch (error) {
      console.error('[Messages API] Send failed:', error);
      
      const errorCode = error.message.includes('Permission denied') ? 'QONSENT_DENIED' :
                       error.message.includes('blocked') ? 'QERB_SUSPECT' :
                       error.message.includes('Invalid') ? 'VALIDATION_ERROR' :
                       'MESSAGE_SEND_FAILED';

      res.status(error.message.includes('Permission denied') ? 403 : 400).json({
        status: 'error',
        code: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get inbox messages
 */
router.get('/inbox/:squidId',
  rateLimitByIdentity(200, 3600000), // 200 requests per hour
  authorizeAction('message.read', req => `inbox:${req.params.squidId}`),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { squidId } = req.params;

      // Verify requester can access this inbox
      if (req.identity.squidId !== squidId) {
        return res.status(403).json({
          status: 'error',
          code: 'ACCESS_DENIED',
          message: 'Cannot access another user\'s inbox',
          timestamp: new Date().toISOString()
        });
      }

      const options = {
        folder: req.query.folder || 'INBOX',
        limit: Math.min(parseInt(req.query.limit) || 20, 100),
        offset: parseInt(req.query.offset) || 0,
        unreadOnly: req.query.unreadOnly === 'true',
        since: req.query.since
      };

      const result = await messageService.getMessages(squidId, options);

      res.json({
        status: 'ok',
        code: 'MESSAGES_RETRIEVED',
        message: 'Messages retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('[Messages API] Get inbox failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'INBOX_RETRIEVAL_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get specific message
 */
router.get('/message/:messageId',
  rateLimitByIdentity(500, 3600000), // 500 requests per hour
  authorizeAction('message.read', req => `message:${req.params.messageId}`),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { messageId } = req.params;
      const { squidId } = req.identity;

      const result = await messageService.getMessage(messageId, squidId);

      res.json({
        status: 'ok',
        code: 'MESSAGE_RETRIEVED',
        message: 'Message retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('[Messages API] Get message failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Access denied') ? 403 : 500;
      
      const errorCode = error.message.includes('not found') ? 'MESSAGE_NOT_FOUND' :
                       error.message.includes('Access denied') ? 'ACCESS_DENIED' :
                       'MESSAGE_RETRIEVAL_FAILED';

      res.status(statusCode).json({
        status: 'error',
        code: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Delete message (GDPR compliance)
 */
router.delete('/message/:messageId',
  rateLimitByIdentity(50, 3600000), // 50 deletions per hour
  authorizeAction('message.delete', req => `message:${req.params.messageId}`),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { messageId } = req.params;
      const { squidId } = req.identity;

      const result = await messageService.deleteMessage(messageId, squidId);

      res.json({
        status: 'ok',
        code: 'MESSAGE_DELETED',
        message: 'Message deleted successfully',
        data: result
      });

    } catch (error) {
      console.error('[Messages API] Delete message failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Access denied') ? 403 : 500;
      
      const errorCode = error.message.includes('not found') ? 'MESSAGE_NOT_FOUND' :
                       error.message.includes('Access denied') ? 'ACCESS_DENIED' :
                       'MESSAGE_DELETION_FAILED';

      res.status(statusCode).json({
        status: 'error',
        code: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get message statistics
 */
router.get('/stats/:squidId',
  rateLimitByIdentity(100, 3600000), // 100 requests per hour
  authorizeAction('message.read', req => `stats:${req.params.squidId}`),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { squidId } = req.params;

      // Verify requester can access these stats
      if (req.identity.squidId !== squidId) {
        return res.status(403).json({
          status: 'error',
          code: 'ACCESS_DENIED',
          message: 'Cannot access another user\'s statistics',
          timestamp: new Date().toISOString()
        });
      }

      const result = await messageService.getMessageStats(squidId);

      res.json({
        status: 'ok',
        code: 'STATS_RETRIEVED',
        message: 'Statistics retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('[Messages API] Get stats failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'STATS_RETRIEVAL_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Mark message as read
 */
router.post('/message/:messageId/read',
  rateLimitByIdentity(1000, 3600000), // 1000 requests per hour
  authorizeAction('message.read', req => `message:${req.params.messageId}`),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { messageId } = req.params;
      const { squidId } = req.identity;

      // This would typically just mark the message as read
      // For now, we'll simulate this by getting the message (which marks it as read)
      await messageService.getMessage(messageId, squidId);

      res.json({
        status: 'ok',
        code: 'MESSAGE_MARKED_READ',
        message: 'Message marked as read',
        data: { messageId, readAt: new Date().toISOString() }
      });

    } catch (error) {
      console.error('[Messages API] Mark read failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Access denied') ? 403 : 500;

      res.status(statusCode).json({
        status: 'error',
        code: 'MARK_READ_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
/**
 * MCP Routes
 * Model Context Protocol tool endpoints
 */

import express from 'express';
import { getService } from '../services/index.mjs';
import {
  authenticateSquid,
  authorizeAction,
  rateLimitByIdentity,
  validateRequest
} from '../../security/middleware.mjs';

const router = express.Router();

// Apply authentication to all MCP routes
router.use(authenticateSquid);

/**
 * MCP Tool: qmail.send
 */
router.post('/tools/qmail.send',
  rateLimitByIdentity(100, 3600000),
  validateRequest({
    required: ['squidId', 'recipientId', 'subject', 'content']
  }),
  authorizeAction('message.send'),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { squidId, recipientId, subject, content, ...options } = req.body;

      const result = await messageService.sendMessage(squidId, {
        recipientId,
        subject,
        content,
        encryptionLevel: options.encryptionLevel || 'STANDARD',
        priority: options.priority || 'NORMAL',
        certifiedDelivery: options.certifiedDelivery !== false,
        expiresIn: options.expiresIn,
        attachments: options.attachments || [],
        metadata: options.metadata || {}
      });

      res.json({
        success: true,
        messageId: result.messageId,
        status: result.status,
        encryptedCid: result.encryptedCid,
        deliveryTracking: result.deliveryTracking,
        timestamp: result.timestamp,
        expiresAt: result.expiresAt
      });

    } catch (error) {
      console.error('[MCP] qmail.send failed:', error);
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * MCP Tool: qmail.fetch
 */
router.post('/tools/qmail.fetch',
  rateLimitByIdentity(200, 3600000),
  validateRequest({
    required: ['squidId']
  }),
  authorizeAction('message.read'),
  async (req, res) => {
    try {
      const messageService = getService('message');
      const { squidId, folder, limit, offset, unreadOnly, since } = req.body;

      const options = {
        folder: folder || 'INBOX',
        limit: Math.min(limit || 20, 100),
        offset: offset || 0,
        unreadOnly: unreadOnly || false,
        since
      };

      const result = await messageService.getMessages(squidId, options);

      res.json({
        success: true,
        messages: result.messages,
        totalCount: result.totalCount,
        unreadCount: result.unreadCount,
        hasMore: result.hasMore
      });

    } catch (error) {
      console.error('[MCP] qmail.fetch failed:', error);
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * MCP Tool: qmail.receipt
 */
router.post('/tools/qmail.receipt',
  rateLimitByIdentity(200, 3600000),
  validateRequest({
    required: ['messageId', 'squidId', 'action']
  }),
  authorizeAction('message.read'),
  async (req, res) => {
    try {
      const receiptService = getService('receipt');
      const { messageId, squidId, action, receiptData } = req.body;

      let result;
      
      if (action === 'GENERATE') {
        result = await receiptService.generateReceipt(messageId, squidId, 'DELIVERY');
      } else if (action === 'VERIFY') {
        if (!receiptData) {
          throw new Error('receiptData required for verification');
        }
        result = await receiptService.verifyReceipt(messageId, receiptData);
      } else {
        throw new Error('Invalid action. Must be GENERATE or VERIFY');
      }

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('[MCP] qmail.receipt failed:', error);
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * MCP Tool: qmail.search
 */
router.post('/tools/qmail.search',
  rateLimitByIdentity(50, 3600000),
  validateRequest({
    required: ['squidId', 'query']
  }),
  authorizeAction('message.read'),
  async (req, res) => {
    try {
      const searchService = getService('search');
      const { squidId, query, folder, dateRange, limit } = req.body;

      const searchParams = {
        squidId,
        query,
        folder: folder || 'ALL',
        dateRange,
        limit: Math.min(limit || 10, 50)
      };

      const result = await searchService.searchMessages(searchParams);

      res.json({
        success: true,
        results: result.results,
        totalMatches: result.totalMatches,
        searchTime: result.searchTime
      });

    } catch (error) {
      console.error('[MCP] qmail.search failed:', error);
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
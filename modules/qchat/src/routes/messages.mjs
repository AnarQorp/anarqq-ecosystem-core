/**
 * Message Routes
 * Handles message sending, editing, deletion, and history
 */

import { Router } from 'express';
import Joi from 'joi';
import { authorize } from '../../security/middleware.mjs';
import MessageService from '../services/message.mjs';

const router = Router();
const messageService = new MessageService();

// Validation schemas
const sendMessageSchema = Joi.object({
  content: Joi.string().min(1).max(10000).required(),
  messageType: Joi.string().valid('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'REACTION').default('TEXT'),
  replyTo: Joi.string().pattern(/^qchat_msg_[a-zA-Z0-9_-]+$/).optional(),
  mentions: Joi.array().items(Joi.string().pattern(/^squid_[a-zA-Z0-9_-]+$/)).max(20).optional(),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().max(255).required(),
    cid: Joi.string().pattern(/^Qm[a-zA-Z0-9]{44}$/).required(),
    size: Joi.number().integer().min(0).required(),
    mimeType: Joi.string().required(),
    thumbnail: Joi.string().pattern(/^Qm[a-zA-Z0-9]{44}$/).optional()
  })).max(10).optional(),
  ephemeral: Joi.boolean().default(false),
  expiresIn: Joi.number().integer().min(60).max(86400).optional() // 1 minute to 24 hours
});

const editMessageSchema = Joi.object({
  content: Joi.string().min(1).max(10000).required()
});

/**
 * POST /messages/:roomId
 * Send message to room
 */
router.post('/:roomId', authorize('qchat', 'message:send'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { error, value } = sendMessageSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid message data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const messageData = {
      ...value,
      roomId,
      senderId: req.user.squidId,
      timestamp: new Date().toISOString()
    };
    
    const message = await messageService.sendMessage(messageData, req.user);
    
    res.status(201).json({
      status: 'ok',
      code: 'MESSAGE_SENT',
      message: 'Message sent successfully',
      data: message,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Send message error:', error);
    
    if (error.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'NOT_ROOM_MEMBER') {
      return res.status(403).json({
        status: 'error',
        code: 'NOT_ROOM_MEMBER',
        message: 'Must be a room member to send messages',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'USER_MUTED') {
      return res.status(403).json({
        status: 'error',
        code: 'USER_MUTED',
        message: 'User is muted in this room',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'CONTENT_BLOCKED') {
      return res.status(400).json({
        status: 'error',
        code: 'CONTENT_BLOCKED',
        message: 'Message content blocked by moderation',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MESSAGE_SEND_FAILED',
      message: 'Failed to send message',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /messages/:roomId
 * Get message history for room
 */
router.get('/:roomId', authorize('qchat', 'room:read'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      limit = 50,
      before,
      after,
      since,
      until,
      messageTypes,
      fromUser,
      includeDeleted = false
    } = req.query;
    
    // Validate query parameters
    const limitNum = Math.min(parseInt(limit), 100);
    
    if (messageTypes) {
      const validTypes = ['TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'REACTION'];
      const types = messageTypes.split(',');
      const invalidTypes = types.filter(type => !validTypes.includes(type));
      
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_MESSAGE_TYPES',
          message: `Invalid message types: ${invalidTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
    }
    
    const filters = {
      limit: limitNum,
      before,
      after,
      since,
      until,
      messageTypes: messageTypes ? messageTypes.split(',') : undefined,
      fromUser,
      includeDeleted: includeDeleted === 'true'
    };
    
    const result = await messageService.getMessageHistory(roomId, req.user, filters);
    
    res.json({
      status: 'ok',
      code: 'MESSAGES_RETRIEVED',
      message: 'Message history retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get message history error:', error);
    
    if (error.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Access denied to room messages',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MESSAGES_RETRIEVAL_FAILED',
      message: 'Failed to retrieve message history',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /messages/:roomId/:messageId
 * Get specific message
 */
router.get('/:roomId/:messageId', authorize('qchat', 'room:read'), async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    
    const message = await messageService.getMessage(roomId, messageId, req.user);
    
    if (!message) {
      return res.status(404).json({
        status: 'error',
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'MESSAGE_RETRIEVED',
      message: 'Message retrieved successfully',
      data: message,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get message error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Access denied to message',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MESSAGE_RETRIEVAL_FAILED',
      message: 'Failed to retrieve message',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * PUT /messages/:roomId/:messageId
 * Edit message
 */
router.put('/:roomId/:messageId', authorize('qchat', 'message:edit'), async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { error, value } = editMessageSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid message edit data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const updatedMessage = await messageService.editMessage(roomId, messageId, value.content, req.user);
    
    if (!updatedMessage) {
      return res.status(404).json({
        status: 'error',
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'MESSAGE_EDITED',
      message: 'Message edited successfully',
      data: updatedMessage,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Edit message error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Can only edit your own messages',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'EDIT_TIME_EXPIRED') {
      return res.status(403).json({
        status: 'error',
        code: 'EDIT_TIME_EXPIRED',
        message: 'Message edit time has expired',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'CONTENT_BLOCKED') {
      return res.status(400).json({
        status: 'error',
        code: 'CONTENT_BLOCKED',
        message: 'Edited content blocked by moderation',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MESSAGE_EDIT_FAILED',
      message: 'Failed to edit message',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * DELETE /messages/:roomId/:messageId
 * Delete message
 */
router.delete('/:roomId/:messageId', authorize('qchat', 'message:delete'), async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    
    const result = await messageService.deleteMessage(roomId, messageId, req.user);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'MESSAGE_DELETED',
      message: 'Message deleted successfully',
      data: { messageId, deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Delete message error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Insufficient permissions to delete message',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MESSAGE_DELETE_FAILED',
      message: 'Failed to delete message',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * POST /messages/:roomId/:messageId/react
 * Add reaction to message
 */
router.post('/:roomId/:messageId/react', authorize('qchat', 'message:react'), async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { emoji } = req.body;
    
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EMOJI',
        message: 'Valid emoji required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Basic emoji validation (simplified)
    const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
    if (!emojiRegex.test(emoji)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EMOJI_FORMAT',
        message: 'Invalid emoji format',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const result = await messageService.addReaction(roomId, messageId, emoji, req.user);
    
    res.json({
      status: 'ok',
      code: 'REACTION_ADDED',
      message: 'Reaction added successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    
    if (error.code === 'MESSAGE_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'REACTION_EXISTS') {
      return res.status(409).json({
        status: 'error',
        code: 'REACTION_EXISTS',
        message: 'Reaction already exists',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'REACTION_ADD_FAILED',
      message: 'Failed to add reaction',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * DELETE /messages/:roomId/:messageId/react
 * Remove reaction from message
 */
router.delete('/:roomId/:messageId/react', authorize('qchat', 'message:react'), async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { emoji } = req.body;
    
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_EMOJI',
        message: 'Valid emoji required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const result = await messageService.removeReaction(roomId, messageId, emoji, req.user);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 'REACTION_NOT_FOUND',
        message: 'Reaction not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'REACTION_REMOVED',
      message: 'Reaction removed successfully',
      data: { messageId, emoji, removedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      status: 'error',
      code: 'REACTION_REMOVE_FAILED',
      message: 'Failed to remove reaction',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * POST /messages/search
 * Search messages across rooms
 */
router.post('/search', async (req, res) => {
  try {
    const {
      query,
      roomIds,
      dateRange,
      messageTypes,
      fromUser,
      limit = 20
    } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_SEARCH_QUERY',
        message: 'Valid search query required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const limitNum = Math.min(parseInt(limit), 50);
    
    const searchParams = {
      query: query.trim(),
      roomIds,
      dateRange,
      messageTypes,
      fromUser,
      limit: limitNum
    };
    
    const result = await messageService.searchMessages(searchParams, req.user);
    
    res.json({
      status: 'ok',
      code: 'SEARCH_COMPLETED',
      message: 'Message search completed successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      status: 'error',
      code: 'SEARCH_FAILED',
      message: 'Message search failed',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

export default router;
/**
 * Moderation Routes
 * Handles moderation actions, appeals, and reporting
 */

import { Router } from 'express';
import Joi from 'joi';
import { authorize } from '../../security/middleware.mjs';
import ModerationService from '../services/moderation.mjs';

const router = Router();
const moderationService = new ModerationService();

// Validation schemas
const moderationActionSchema = Joi.object({
  action: Joi.string().valid(
    'MUTE', 'UNMUTE', 'KICK', 'BAN', 'UNBAN', 
    'DELETE_MESSAGE', 'PIN_MESSAGE', 'UNPIN_MESSAGE', 'WARN'
  ).required(),
  targetId: Joi.string().required(),
  reason: Joi.string().min(1).max(500).required(),
  duration: Joi.number().integer().min(1).max(31536000).optional(), // 1 second to 1 year
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('MEDIUM'),
  notifyUser: Joi.boolean().default(true),
  escalateToQerberos: Joi.boolean().default(false)
});

const appealSchema = Joi.object({
  reason: Joi.string().min(10).max(1000).required(),
  evidence: Joi.array().items(Joi.object({
    type: Joi.string().valid('MESSAGE', 'SCREENSHOT', 'LOG', 'REPORT').required(),
    cid: Joi.string().pattern(/^Qm[a-zA-Z0-9]{44}$/).required(),
    description: Joi.string().max(200).optional()
  })).max(5).optional()
});

/**
 * POST /moderation/:roomId
 * Perform moderation action
 */
router.post('/:roomId', authorize('qchat', 'room:moderate'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { error, value } = moderationActionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid moderation action data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Validate target ID format based on action
    const messageActions = ['DELETE_MESSAGE', 'PIN_MESSAGE', 'UNPIN_MESSAGE'];
    const userActions = ['MUTE', 'UNMUTE', 'KICK', 'BAN', 'UNBAN', 'WARN'];
    
    if (messageActions.includes(value.action)) {
      if (!value.targetId.match(/^qchat_msg_[a-zA-Z0-9_-]+$/)) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_MESSAGE_ID',
          message: 'Invalid message ID format for message action',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
    } else if (userActions.includes(value.action)) {
      if (!value.targetId.match(/^squid_[a-zA-Z0-9_-]+$/)) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_USER_ID',
          message: 'Invalid user ID format for user action',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
    }
    
    // Validate duration for temporary actions
    const temporaryActions = ['MUTE', 'BAN'];
    if (temporaryActions.includes(value.action) && !value.duration) {
      return res.status(400).json({
        status: 'error',
        code: 'DURATION_REQUIRED',
        message: 'Duration required for temporary actions',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const actionData = {
      ...value,
      roomId,
      moderatorId: req.user.squidId,
      timestamp: new Date().toISOString()
    };
    
    const result = await moderationService.performAction(actionData, req.user);
    
    res.json({
      status: 'ok',
      code: 'MODERATION_ACTION_COMPLETED',
      message: 'Moderation action completed successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Moderation action error:', error);
    
    if (error.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'TARGET_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'TARGET_NOT_FOUND',
        message: 'Target user or message not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'INSUFFICIENT_PERMISSIONS') {
      return res.status(403).json({
        status: 'error',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions for this moderation action',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'CANNOT_MODERATE_SELF') {
      return res.status(400).json({
        status: 'error',
        code: 'CANNOT_MODERATE_SELF',
        message: 'Cannot perform moderation actions on yourself',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'CANNOT_MODERATE_HIGHER_ROLE') {
      return res.status(403).json({
        status: 'error',
        code: 'CANNOT_MODERATE_HIGHER_ROLE',
        message: 'Cannot moderate users with higher or equal roles',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MODERATION_ACTION_FAILED',
      message: 'Failed to perform moderation action',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /moderation/:roomId/actions
 * Get moderation history for room
 */
router.get('/:roomId/actions', authorize('qchat', 'room:moderate'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      limit = 50,
      offset = 0,
      action,
      moderator,
      target,
      severity,
      since,
      until
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit), 100);
    const offsetNum = Math.max(parseInt(offset), 0);
    
    const filters = {
      limit: limitNum,
      offset: offsetNum,
      action,
      moderator,
      target,
      severity,
      since,
      until
    };
    
    const result = await moderationService.getModerationHistory(roomId, req.user, filters);
    
    res.json({
      status: 'ok',
      code: 'MODERATION_HISTORY_RETRIEVED',
      message: 'Moderation history retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get moderation history error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Access denied to moderation history',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MODERATION_HISTORY_FAILED',
      message: 'Failed to retrieve moderation history',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /moderation/actions/:actionId
 * Get specific moderation action details
 */
router.get('/actions/:actionId', authorize('qchat', 'room:moderate'), async (req, res) => {
  try {
    const { actionId } = req.params;
    
    const action = await moderationService.getModerationAction(actionId, req.user);
    
    if (!action) {
      return res.status(404).json({
        status: 'error',
        code: 'ACTION_NOT_FOUND',
        message: 'Moderation action not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'MODERATION_ACTION_RETRIEVED',
      message: 'Moderation action retrieved successfully',
      data: action,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get moderation action error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Access denied to moderation action',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MODERATION_ACTION_RETRIEVAL_FAILED',
      message: 'Failed to retrieve moderation action',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * POST /moderation/actions/:actionId/appeal
 * Appeal a moderation action
 */
router.post('/actions/:actionId/appeal', async (req, res) => {
  try {
    const { actionId } = req.params;
    const { error, value } = appealSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid appeal data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const appealData = {
      ...value,
      actionId,
      appellantId: req.user.squidId,
      timestamp: new Date().toISOString()
    };
    
    const appeal = await moderationService.createAppeal(appealData, req.user);
    
    res.status(201).json({
      status: 'ok',
      code: 'APPEAL_CREATED',
      message: 'Appeal created successfully',
      data: appeal,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Create appeal error:', error);
    
    if (error.code === 'ACTION_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'ACTION_NOT_FOUND',
        message: 'Moderation action not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'NOT_APPEALABLE') {
      return res.status(400).json({
        status: 'error',
        code: 'NOT_APPEALABLE',
        message: 'This action cannot be appealed',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'APPEAL_DEADLINE_PASSED') {
      return res.status(400).json({
        status: 'error',
        code: 'APPEAL_DEADLINE_PASSED',
        message: 'Appeal deadline has passed',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'APPEAL_EXISTS') {
      return res.status(409).json({
        status: 'error',
        code: 'APPEAL_EXISTS',
        message: 'Appeal already exists for this action',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'CANNOT_APPEAL_OWN_ACTION') {
      return res.status(400).json({
        status: 'error',
        code: 'CANNOT_APPEAL_OWN_ACTION',
        message: 'Cannot appeal your own moderation actions',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'APPEAL_CREATION_FAILED',
      message: 'Failed to create appeal',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /moderation/appeals
 * Get user's appeals
 */
router.get('/appeals', async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      status,
      since,
      until
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit), 50);
    const offsetNum = Math.max(parseInt(offset), 0);
    
    const filters = {
      limit: limitNum,
      offset: offsetNum,
      status,
      since,
      until,
      appellantId: req.user.squidId
    };
    
    const result = await moderationService.getUserAppeals(req.user, filters);
    
    res.json({
      status: 'ok',
      code: 'APPEALS_RETRIEVED',
      message: 'Appeals retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get user appeals error:', error);
    res.status(500).json({
      status: 'error',
      code: 'APPEALS_RETRIEVAL_FAILED',
      message: 'Failed to retrieve appeals',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * PUT /moderation/appeals/:appealId
 * Resolve appeal (moderators only)
 */
router.put('/appeals/:appealId', authorize('qchat', 'room:moderate'), async (req, res) => {
  try {
    const { appealId } = req.params;
    const { decision, reason } = req.body;
    
    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_DECISION',
        message: 'Decision must be APPROVED or REJECTED',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        code: 'REASON_REQUIRED',
        message: 'Reason for decision is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const resolutionData = {
      decision,
      reason: reason.trim(),
      reviewerId: req.user.squidId,
      timestamp: new Date().toISOString()
    };
    
    const result = await moderationService.resolveAppeal(appealId, resolutionData, req.user);
    
    res.json({
      status: 'ok',
      code: 'APPEAL_RESOLVED',
      message: 'Appeal resolved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Resolve appeal error:', error);
    
    if (error.code === 'APPEAL_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'APPEAL_NOT_FOUND',
        message: 'Appeal not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'APPEAL_ALREADY_RESOLVED') {
      return res.status(409).json({
        status: 'error',
        code: 'APPEAL_ALREADY_RESOLVED',
        message: 'Appeal has already been resolved',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'CANNOT_REVIEW_OWN_ACTION') {
      return res.status(400).json({
        status: 'error',
        code: 'CANNOT_REVIEW_OWN_ACTION',
        message: 'Cannot review appeals for your own moderation actions',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'APPEAL_RESOLUTION_FAILED',
      message: 'Failed to resolve appeal',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /moderation/user/:squidId/status
 * Get user's moderation status across rooms
 */
router.get('/user/:squidId/status', authorize('qchat', 'room:moderate'), async (req, res) => {
  try {
    const { squidId } = req.params;
    
    if (!squidId.match(/^squid_[a-zA-Z0-9_-]+$/)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const status = await moderationService.getUserModerationStatus(squidId, req.user);
    
    res.json({
      status: 'ok',
      code: 'USER_STATUS_RETRIEVED',
      message: 'User moderation status retrieved successfully',
      data: status,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get user moderation status error:', error);
    
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'USER_STATUS_RETRIEVAL_FAILED',
      message: 'Failed to retrieve user moderation status',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

export default router;
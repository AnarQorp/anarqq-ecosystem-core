/**
 * Room Management Routes
 * Handles chat room creation, configuration, and membership
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { authorize } from '../../security/middleware.mjs';
import RoomService from '../services/room.mjs';

const router = Router();
const roomService = new RoomService();

// Validation schemas
const createRoomSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  type: Joi.string().valid('PUBLIC', 'PRIVATE', 'DAO', 'REPUTATION').default('PUBLIC'),
  maxMembers: Joi.number().integer().min(2).max(10000).default(100),
  encryptionLevel: Joi.string().valid('STANDARD', 'HIGH', 'QUANTUM').default('STANDARD'),
  moderationLevel: Joi.string().valid('NONE', 'BASIC', 'STRICT', 'AI_ASSISTED').default('BASIC'),
  minReputation: Joi.number().min(0).max(1).optional(),
  daoId: Joi.string().pattern(/^dao_[a-zA-Z0-9_-]+$/).optional(),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional(),
  ephemeral: Joi.boolean().default(false),
  messageRetention: Joi.number().integer().min(1).max(3650).optional()
});

const updateRoomSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  maxMembers: Joi.number().integer().min(2).max(10000).optional(),
  moderationLevel: Joi.string().valid('NONE', 'BASIC', 'STRICT', 'AI_ASSISTED').optional(),
  messageRetention: Joi.number().integer().min(1).max(3650).optional(),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional()
});

const joinRoomSchema = Joi.object({
  inviteCode: Joi.string().pattern(/^[A-Z0-9]{8}$/).optional()
});

/**
 * POST /rooms
 * Create a new chat room
 */
router.post('/', authorize('qchat', 'room:create'), async (req, res) => {
  try {
    const { error, value } = createRoomSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid room data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Additional validation for specific room types
    if (value.type === 'REPUTATION' && !value.minReputation) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_MIN_REPUTATION',
        message: 'Minimum reputation required for REPUTATION type rooms',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (value.type === 'DAO' && !value.daoId) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_DAO_ID',
        message: 'DAO ID required for DAO type rooms',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const roomData = {
      ...value,
      createdBy: req.user.squidId,
      createdAt: new Date().toISOString()
    };
    
    const room = await roomService.createRoom(roomData, req.user);
    
    res.status(201).json({
      status: 'ok',
      code: 'ROOM_CREATED',
      message: 'Chat room created successfully',
      data: room,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Create room error:', error);
    
    if (error.code === 'ROOM_NAME_EXISTS') {
      return res.status(409).json({
        status: 'error',
        code: 'ROOM_NAME_EXISTS',
        message: 'Room name already exists',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'ROOM_CREATION_FAILED',
      message: 'Failed to create room',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /rooms
 * List available chat rooms
 */
router.get('/', async (req, res) => {
  try {
    const {
      type,
      limit = 20,
      offset = 0,
      search
    } = req.query;
    
    // Validate query parameters
    const validTypes = ['PUBLIC', 'PRIVATE', 'DAO', 'REPUTATION'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_ROOM_TYPE',
        message: 'Invalid room type filter',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const limitNum = Math.min(parseInt(limit), 100);
    const offsetNum = Math.max(parseInt(offset), 0);
    
    const filters = {
      type,
      search,
      userReputation: req.user.identity?.reputation || 0,
      userDaoMemberships: req.user.identity?.daoMemberships || []
    };
    
    const result = await roomService.listRooms(filters, limitNum, offsetNum, req.user);
    
    res.json({
      status: 'ok',
      code: 'ROOMS_RETRIEVED',
      message: 'Rooms retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('List rooms error:', error);
    res.status(500).json({
      status: 'error',
      code: 'ROOMS_RETRIEVAL_FAILED',
      message: 'Failed to retrieve rooms',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /rooms/:roomId
 * Get room details
 */
router.get('/:roomId', authorize('qchat', 'room:read'), async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await roomService.getRoomDetails(roomId, req.user);
    
    if (!room) {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'ROOM_RETRIEVED',
      message: 'Room details retrieved successfully',
      data: room,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get room details error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Access denied to room',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'ROOM_RETRIEVAL_FAILED',
      message: 'Failed to retrieve room details',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * PUT /rooms/:roomId
 * Update room settings
 */
router.put('/:roomId', authorize('qchat', 'room:admin'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { error, value } = updateRoomSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid room update data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const updatedRoom = await roomService.updateRoom(roomId, value, req.user);
    
    if (!updatedRoom) {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'ROOM_UPDATED',
      message: 'Room updated successfully',
      data: updatedRoom,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Update room error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Insufficient permissions to update room',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'ROOM_UPDATE_FAILED',
      message: 'Failed to update room',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * DELETE /rooms/:roomId
 * Delete room
 */
router.delete('/:roomId', authorize('qchat', 'room:owner'), async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const result = await roomService.deleteRoom(roomId, req.user);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'ROOM_DELETED',
      message: 'Room deleted successfully',
      data: { roomId, deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Delete room error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Only room owner can delete room',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'ROOM_DELETION_FAILED',
      message: 'Failed to delete room',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * POST /rooms/:roomId/join
 * Join a room
 */
router.post('/:roomId/join', authorize('qchat', 'room:join'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { error, value } = joinRoomSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid join request data',
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const result = await roomService.joinRoom(roomId, req.user, value.inviteCode);
    
    res.json({
      status: 'ok',
      code: 'ROOM_JOINED',
      message: 'Successfully joined room',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Join room error:', error);
    
    if (error.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'ALREADY_MEMBER') {
      return res.status(409).json({
        status: 'error',
        code: 'ALREADY_MEMBER',
        message: 'Already a member of this room',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'ROOM_FULL') {
      return res.status(409).json({
        status: 'error',
        code: 'ROOM_FULL',
        message: 'Room is at maximum capacity',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'INSUFFICIENT_REPUTATION') {
      return res.status(403).json({
        status: 'error',
        code: 'INSUFFICIENT_REPUTATION',
        message: 'Insufficient reputation to join this room',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.code === 'INVALID_INVITE_CODE') {
      return res.status(403).json({
        status: 'error',
        code: 'INVALID_INVITE_CODE',
        message: 'Invalid invite code',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'JOIN_ROOM_FAILED',
      message: 'Failed to join room',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * POST /rooms/:roomId/leave
 * Leave a room
 */
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const result = await roomService.leaveRoom(roomId, req.user);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found or not a member',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.json({
      status: 'ok',
      code: 'ROOM_LEFT',
      message: 'Successfully left room',
      data: { roomId, leftAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      status: 'error',
      code: 'LEAVE_ROOM_FAILED',
      message: 'Failed to leave room',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

/**
 * GET /rooms/:roomId/members
 * Get room members
 */
router.get('/:roomId/members', authorize('qchat', 'room:read'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      limit = 50,
      offset = 0,
      role
    } = req.query;
    
    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_ROLE_FILTER',
        message: 'Invalid role filter',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    const limitNum = Math.min(parseInt(limit), 100);
    const offsetNum = Math.max(parseInt(offset), 0);
    
    const result = await roomService.getRoomMembers(roomId, req.user, {
      limit: limitNum,
      offset: offsetNum,
      role
    });
    
    res.json({
      status: 'ok',
      code: 'MEMBERS_RETRIEVED',
      message: 'Room members retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  } catch (error) {
    console.error('Get room members error:', error);
    
    if (error.code === 'ACCESS_DENIED') {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Access denied to room members',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    res.status(500).json({
      status: 'error',
      code: 'MEMBERS_RETRIEVAL_FAILED',
      message: 'Failed to retrieve room members',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
});

export default router;
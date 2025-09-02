/**
 * Room Service
 * Handles chat room management, membership, and configuration
 */

import { v4 as uuidv4 } from 'uuid';
import { mockServices } from '../../security/middleware.mjs';

class RoomService {
  constructor() {
    // In-memory storage for standalone mode
    this.rooms = new Map();
    this.memberships = new Map(); // roomId -> Set of squidIds
    this.memberRoles = new Map(); // `${roomId}:${squidId}` -> role
    this.inviteCodes = new Map(); // inviteCode -> roomId
  }

  /**
   * Create a new chat room
   */
  async createRoom(roomData, user) {
    try {
      // Check if room name already exists (simplified check)
      const existingRoom = Array.from(this.rooms.values()).find(
        room => room.name.toLowerCase() === roomData.name.toLowerCase()
      );
      
      if (existingRoom) {
        const error = new Error('Room name already exists');
        error.code = 'ROOM_NAME_EXISTS';
        throw error;
      }
      
      // Generate room ID and invite code
      const roomId = `qchat_room_${uuidv4().replace(/-/g, '_')}`;
      const inviteCode = roomData.type === 'PRIVATE' ? 
        Math.random().toString(36).substring(2, 10).toUpperCase() : null;
      
      // Create room object
      const room = {
        roomId,
        name: roomData.name,
        description: roomData.description || '',
        type: roomData.type,
        createdAt: roomData.createdAt,
        createdBy: roomData.createdBy,
        memberCount: 1, // Creator is first member
        maxMembers: roomData.maxMembers,
        encryptionLevel: roomData.encryptionLevel,
        moderationLevel: roomData.moderationLevel,
        minReputation: roomData.minReputation,
        daoId: roomData.daoId,
        tags: roomData.tags || [],
        ephemeral: roomData.ephemeral,
        messageRetention: roomData.messageRetention || 365,
        lastActivity: roomData.createdAt,
        inviteCode,
        encryptionKey: `encrypted_room_key_${roomId}`, // Mock encrypted key
        indexCid: `Qm${Math.random().toString(36).substring(2, 46)}` // Mock IPFS CID
      };
      
      // Store room
      this.rooms.set(roomId, room);
      
      // Add creator as owner
      this.memberships.set(roomId, new Set([user.squidId]));
      this.memberRoles.set(`${roomId}:${user.squidId}`, 'OWNER');
      
      // Store invite code mapping
      if (inviteCode) {
        this.inviteCodes.set(inviteCode, roomId);
      }
      
      // Publish room created event
      await this.publishEvent('q.qchat.room.created.v1', {
        roomId,
        name: room.name,
        type: room.type,
        createdBy: user.squidId,
        maxMembers: room.maxMembers,
        encryptionLevel: room.encryptionLevel,
        moderationLevel: room.moderationLevel,
        tags: room.tags
      }, user);
      
      // Index room for discovery
      await this.indexRoom(room);
      
      return {
        roomId,
        name: room.name,
        type: room.type,
        createdAt: room.createdAt,
        inviteCode,
        websocketUrl: `/websocket?room=${roomId}`
      };
    } catch (error) {
      console.error('Room creation error:', error);
      throw error;
    }
  }

  /**
   * List available rooms for user
   */
  async listRooms(filters, limit, offset, user) {
    try {
      let rooms = Array.from(this.rooms.values());
      
      // Apply filters
      if (filters.type) {
        rooms = rooms.filter(room => room.type === filters.type);
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        rooms = rooms.filter(room => 
          room.name.toLowerCase().includes(searchTerm) ||
          room.description.toLowerCase().includes(searchTerm) ||
          room.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      // Filter by access permissions
      rooms = rooms.filter(room => {
        switch (room.type) {
          case 'PUBLIC':
            return true;
          case 'PRIVATE':
            // Only show if user is already a member
            return this.memberships.get(room.roomId)?.has(user.squidId);
          case 'REPUTATION':
            return filters.userReputation >= (room.minReputation || 0);
          case 'DAO':
            return filters.userDaoMemberships.includes(room.daoId);
          default:
            return false;
        }
      });
      
      // Sort by last activity (most recent first)
      rooms.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
      
      // Apply pagination
      const totalCount = rooms.length;
      const paginatedRooms = rooms.slice(offset, offset + limit);
      
      // Transform to summary format
      const roomSummaries = paginatedRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        type: room.type,
        memberCount: room.memberCount,
        maxMembers: room.maxMembers,
        lastActivity: room.lastActivity,
        tags: room.tags,
        encryptionLevel: room.encryptionLevel,
        isJoined: this.memberships.get(room.roomId)?.has(user.squidId) || false
      }));
      
      return {
        rooms: roomSummaries,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    } catch (error) {
      console.error('List rooms error:', error);
      throw error;
    }
  }

  /**
   * Get detailed room information
   */
  async getRoomDetails(roomId, user) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return null;
      }
      
      // Check access permissions
      const isMember = this.memberships.get(roomId)?.has(user.squidId);
      const userRole = this.memberRoles.get(`${roomId}:${user.squidId}`);
      
      if (room.type === 'PRIVATE' && !isMember) {
        const error = new Error('Access denied to private room');
        error.code = 'ACCESS_DENIED';
        throw error;
      }
      
      // Get user permissions
      const permissions = this.getUserPermissions(userRole);
      
      return {
        roomId: room.roomId,
        name: room.name,
        description: room.description,
        type: room.type,
        createdAt: room.createdAt,
        createdBy: room.createdBy,
        memberCount: room.memberCount,
        maxMembers: room.maxMembers,
        encryptionLevel: room.encryptionLevel,
        moderationLevel: room.moderationLevel,
        messageRetention: room.messageRetention,
        tags: room.tags,
        permissions,
        userRole: userRole || 'GUEST',
        lastActivity: room.lastActivity
      };
    } catch (error) {
      console.error('Get room details error:', error);
      throw error;
    }
  }

  /**
   * Update room settings
   */
  async updateRoom(roomId, updates, user) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return null;
      }
      
      // Check permissions
      const userRole = this.memberRoles.get(`${roomId}:${user.squidId}`);
      if (!['OWNER', 'ADMIN'].includes(userRole)) {
        const error = new Error('Insufficient permissions');
        error.code = 'ACCESS_DENIED';
        throw error;
      }
      
      // Apply updates
      const updatedRoom = { ...room, ...updates };
      this.rooms.set(roomId, updatedRoom);
      
      // Publish room updated event
      await this.publishEvent('q.qchat.room.updated.v1', {
        roomId,
        changes: updates,
        updatedBy: user.squidId
      }, user);
      
      return updatedRoom;
    } catch (error) {
      console.error('Update room error:', error);
      throw error;
    }
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId, user) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return null;
      }
      
      // Check permissions (only owner can delete)
      const userRole = this.memberRoles.get(`${roomId}:${user.squidId}`);
      if (userRole !== 'OWNER') {
        const error = new Error('Only room owner can delete room');
        error.code = 'ACCESS_DENIED';
        throw error;
      }
      
      // Remove room and related data
      this.rooms.delete(roomId);
      this.memberships.delete(roomId);
      
      // Remove member roles
      for (const key of this.memberRoles.keys()) {
        if (key.startsWith(`${roomId}:`)) {
          this.memberRoles.delete(key);
        }
      }
      
      // Remove invite code
      if (room.inviteCode) {
        this.inviteCodes.delete(room.inviteCode);
      }
      
      // Publish room deleted event
      await this.publishEvent('q.qchat.room.deleted.v1', {
        roomId,
        name: room.name,
        deletedBy: user.squidId,
        memberCount: room.memberCount
      }, user);
      
      return true;
    } catch (error) {
      console.error('Delete room error:', error);
      throw error;
    }
  }

  /**
   * Join a room
   */
  async joinRoom(roomId, user, inviteCode) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        const error = new Error('Room not found');
        error.code = 'ROOM_NOT_FOUND';
        throw error;
      }
      
      // Check if already a member
      if (this.memberships.get(roomId)?.has(user.squidId)) {
        const error = new Error('Already a member');
        error.code = 'ALREADY_MEMBER';
        throw error;
      }
      
      // Check room capacity
      if (room.memberCount >= room.maxMembers) {
        const error = new Error('Room is full');
        error.code = 'ROOM_FULL';
        throw error;
      }
      
      // Check access requirements
      switch (room.type) {
        case 'PUBLIC':
          // Anyone can join
          break;
        case 'PRIVATE':
          // Requires valid invite code
          if (!inviteCode || room.inviteCode !== inviteCode) {
            const error = new Error('Invalid invite code');
            error.code = 'INVALID_INVITE_CODE';
            throw error;
          }
          break;
        case 'REPUTATION':
          // Requires minimum reputation
          if ((user.identity?.reputation || 0) < (room.minReputation || 0)) {
            const error = new Error('Insufficient reputation');
            error.code = 'INSUFFICIENT_REPUTATION';
            throw error;
          }
          break;
        case 'DAO':
          // Requires DAO membership
          if (!user.identity?.daoMemberships?.includes(room.daoId)) {
            const error = new Error('DAO membership required');
            error.code = 'DAO_MEMBERSHIP_REQUIRED';
            throw error;
          }
          break;
      }
      
      // Add user to room
      const members = this.memberships.get(roomId) || new Set();
      members.add(user.squidId);
      this.memberships.set(roomId, members);
      
      // Set default role
      this.memberRoles.set(`${roomId}:${user.squidId}`, 'MEMBER');
      
      // Update member count
      room.memberCount++;
      room.lastActivity = new Date().toISOString();
      
      // Publish join event
      await this.publishEvent('q.qchat.room.joined.v1', {
        roomId,
        userId: user.squidId,
        role: 'MEMBER'
      }, user);
      
      return {
        roomId,
        role: 'MEMBER',
        joinedAt: new Date().toISOString(),
        permissions: this.getUserPermissions('MEMBER'),
        websocketUrl: `/websocket?room=${roomId}`
      };
    } catch (error) {
      console.error('Join room error:', error);
      throw error;
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId, user) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return null;
      }
      
      const members = this.memberships.get(roomId);
      if (!members?.has(user.squidId)) {
        return null;
      }
      
      // Remove user from room
      members.delete(user.squidId);
      this.memberRoles.delete(`${roomId}:${user.squidId}`);
      
      // Update member count
      room.memberCount--;
      room.lastActivity = new Date().toISOString();
      
      // Handle ephemeral rooms
      if (room.ephemeral && room.memberCount === 0) {
        await this.deleteRoom(roomId, { squidId: room.createdBy });
      }
      
      // Publish leave event
      await this.publishEvent('q.qchat.room.left.v1', {
        roomId,
        userId: user.squidId
      }, user);
      
      return true;
    } catch (error) {
      console.error('Leave room error:', error);
      throw error;
    }
  }

  /**
   * Get room members
   */
  async getRoomMembers(roomId, user, options = {}) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        const error = new Error('Room not found');
        error.code = 'ROOM_NOT_FOUND';
        throw error;
      }
      
      // Check access permissions
      const isMember = this.memberships.get(roomId)?.has(user.squidId);
      if (room.type === 'PRIVATE' && !isMember) {
        const error = new Error('Access denied');
        error.code = 'ACCESS_DENIED';
        throw error;
      }
      
      const members = this.memberships.get(roomId) || new Set();
      let memberList = Array.from(members).map(squidId => {
        const role = this.memberRoles.get(`${roomId}:${squidId}`);
        return {
          squidId,
          displayName: `User ${squidId.split('_').pop()}`, // Mock display name
          role,
          joinedAt: new Date().toISOString(), // Mock join date
          lastSeen: new Date().toISOString(), // Mock last seen
          reputation: 0.75, // Mock reputation
          isOnline: Math.random() > 0.5 // Mock online status
        };
      });
      
      // Apply role filter
      if (options.role) {
        memberList = memberList.filter(member => member.role === options.role);
      }
      
      // Sort by role hierarchy, then by join date
      const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2, GUEST: 3 };
      memberList.sort((a, b) => {
        const roleComparison = roleOrder[a.role] - roleOrder[b.role];
        if (roleComparison !== 0) return roleComparison;
        return new Date(a.joinedAt) - new Date(b.joinedAt);
      });
      
      // Apply pagination
      const totalCount = memberList.length;
      const paginatedMembers = memberList.slice(options.offset || 0, (options.offset || 0) + (options.limit || 50));
      
      return {
        members: paginatedMembers,
        totalCount
      };
    } catch (error) {
      console.error('Get room members error:', error);
      throw error;
    }
  }

  /**
   * Get user permissions based on role
   */
  getUserPermissions(role) {
    const permissions = {
      canPost: false,
      canInvite: false,
      canModerate: false,
      canManage: false
    };
    
    switch (role) {
      case 'OWNER':
        permissions.canPost = true;
        permissions.canInvite = true;
        permissions.canModerate = true;
        permissions.canManage = true;
        break;
      case 'ADMIN':
        permissions.canPost = true;
        permissions.canInvite = true;
        permissions.canModerate = true;
        permissions.canManage = false;
        break;
      case 'MEMBER':
        permissions.canPost = true;
        permissions.canInvite = false;
        permissions.canModerate = false;
        permissions.canManage = false;
        break;
      case 'GUEST':
        permissions.canPost = true;
        permissions.canInvite = false;
        permissions.canModerate = false;
        permissions.canManage = false;
        break;
    }
    
    return permissions;
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
      
      // In standalone mode, just log the event
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Event published:', topic, data);
        return event;
      }
      
      // In integrated mode, publish to actual event bus
      // Implementation would depend on event bus system
      return event;
    } catch (error) {
      console.error('Event publishing error:', error);
      // Don't throw - event publishing failures shouldn't break main functionality
    }
  }

  /**
   * Index room for discovery
   */
  async indexRoom(room) {
    try {
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Room indexed:', room.roomId, room.name);
        return;
      }
      
      // In integrated mode, index with Qindex service
      // Implementation would call Qindex API
    } catch (error) {
      console.error('Room indexing error:', error);
      // Don't throw - indexing failures shouldn't break main functionality
    }
  }
}

export default RoomService;
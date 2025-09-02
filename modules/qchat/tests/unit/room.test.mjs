/**
 * Room Service Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import RoomService from '../../src/services/room.mjs';
import { testUtils } from '../setup.mjs';

describe('RoomService', () => {
  let roomService;
  let mockUser;

  beforeEach(() => {
    roomService = new RoomService();
    mockUser = testUtils.createMockUser();
  });

  describe('createRoom', () => {
    it('should create a public room successfully', async () => {
      const roomData = {
        name: 'Test Public Room',
        description: 'A test public room',
        type: 'PUBLIC',
        maxMembers: 50,
        encryptionLevel: 'STANDARD',
        moderationLevel: 'BASIC',
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      };

      const result = await roomService.createRoom(roomData, mockUser);

      expect(result).toBeDefined();
      expect(result.roomId).toMatch(/^qchat_room_/);
      expect(result.name).toBe(roomData.name);
      expect(result.type).toBe(roomData.type);
      expect(result.createdAt).toBe(roomData.createdAt);
      expect(result.websocketUrl).toContain(result.roomId);
    });

    it('should create a private room with invite code', async () => {
      const roomData = {
        name: 'Test Private Room',
        type: 'PRIVATE',
        maxMembers: 20,
        encryptionLevel: 'HIGH',
        moderationLevel: 'STRICT',
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      };

      const result = await roomService.createRoom(roomData, mockUser);

      expect(result).toBeDefined();
      expect(result.type).toBe('PRIVATE');
      expect(result.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should reject duplicate room names', async () => {
      const roomData = {
        name: 'Duplicate Room',
        type: 'PUBLIC',
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      };

      // Create first room
      await roomService.createRoom(roomData, mockUser);

      // Try to create duplicate
      await expect(roomService.createRoom(roomData, mockUser))
        .rejects.toThrow('Room name already exists');
    });

    it('should validate DAO room requirements', async () => {
      const roomData = {
        name: 'DAO Room',
        type: 'DAO',
        // Missing daoId
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      };

      await expect(roomService.createRoom(roomData, mockUser))
        .rejects.toThrow();
    });

    it('should validate reputation room requirements', async () => {
      const roomData = {
        name: 'Reputation Room',
        type: 'REPUTATION',
        // Missing minReputation
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      };

      await expect(roomService.createRoom(roomData, mockUser))
        .rejects.toThrow();
    });
  });

  describe('listRooms', () => {
    beforeEach(async () => {
      // Create some test rooms
      await roomService.createRoom({
        name: 'Public Room 1',
        type: 'PUBLIC',
        tags: ['general', 'public'],
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      }, mockUser);

      await roomService.createRoom({
        name: 'Public Room 2',
        type: 'PUBLIC',
        tags: ['tech', 'discussion'],
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      }, mockUser);

      await roomService.createRoom({
        name: 'Private Room',
        type: 'PRIVATE',
        tags: ['private'],
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      }, mockUser);
    });

    it('should list public rooms', async () => {
      const filters = { type: 'PUBLIC' };
      const result = await roomService.listRooms(filters, 10, 0, mockUser);

      expect(result.rooms).toHaveLength(2);
      expect(result.rooms.every(room => room.type === 'PUBLIC')).toBe(true);
      expect(result.totalCount).toBe(2);
    });

    it('should filter rooms by search term', async () => {
      const filters = { search: 'tech' };
      const result = await roomService.listRooms(filters, 10, 0, mockUser);

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].name).toBe('Public Room 2');
    });

    it('should apply pagination', async () => {
      const filters = {};
      const result = await roomService.listRooms(filters, 1, 0, mockUser);

      expect(result.rooms).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('should show membership status', async () => {
      const filters = {};
      const result = await roomService.listRooms(filters, 10, 0, mockUser);

      // User should be joined to rooms they created
      expect(result.rooms.some(room => room.isJoined)).toBe(true);
    });
  });

  describe('getRoomDetails', () => {
    let testRoom;

    beforeEach(async () => {
      const roomData = {
        name: 'Test Room Details',
        description: 'Room for testing details',
        type: 'PUBLIC',
        maxMembers: 100,
        encryptionLevel: 'STANDARD',
        moderationLevel: 'BASIC',
        tags: ['test', 'details'],
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      };

      testRoom = await roomService.createRoom(roomData, mockUser);
    });

    it('should return room details for valid room', async () => {
      const details = await roomService.getRoomDetails(testRoom.roomId, mockUser);

      expect(details).toBeDefined();
      expect(details.roomId).toBe(testRoom.roomId);
      expect(details.name).toBe('Test Room Details');
      expect(details.description).toBe('Room for testing details');
      expect(details.userRole).toBe('OWNER');
      expect(details.permissions).toBeDefined();
      expect(details.permissions.canPost).toBe(true);
      expect(details.permissions.canManage).toBe(true);
    });

    it('should return null for non-existent room', async () => {
      const details = await roomService.getRoomDetails('non_existent_room', mockUser);
      expect(details).toBeNull();
    });

    it('should deny access to private rooms for non-members', async () => {
      // Create private room with different user
      const otherUser = testUtils.createMockUser({ squidId: 'squid_other_user' });
      const privateRoomData = {
        name: 'Private Room',
        type: 'PRIVATE',
        createdBy: otherUser.squidId,
        createdAt: new Date().toISOString()
      };

      const privateRoom = await roomService.createRoom(privateRoomData, otherUser);

      await expect(roomService.getRoomDetails(privateRoom.roomId, mockUser))
        .rejects.toThrow('Access denied to private room');
    });
  });

  describe('joinRoom', () => {
    let publicRoom;
    let privateRoom;
    let reputationRoom;

    beforeEach(async () => {
      // Create test rooms
      publicRoom = await roomService.createRoom({
        name: 'Public Join Test',
        type: 'PUBLIC',
        maxMembers: 5,
        createdBy: 'squid_other_user',
        createdAt: new Date().toISOString()
      }, testUtils.createMockUser({ squidId: 'squid_other_user' }));

      privateRoom = await roomService.createRoom({
        name: 'Private Join Test',
        type: 'PRIVATE',
        maxMembers: 5,
        createdBy: 'squid_other_user',
        createdAt: new Date().toISOString()
      }, testUtils.createMockUser({ squidId: 'squid_other_user' }));

      reputationRoom = await roomService.createRoom({
        name: 'Reputation Join Test',
        type: 'REPUTATION',
        minReputation: 0.8,
        maxMembers: 5,
        createdBy: 'squid_other_user',
        createdAt: new Date().toISOString()
      }, testUtils.createMockUser({ squidId: 'squid_other_user' }));
    });

    it('should allow joining public rooms', async () => {
      const result = await roomService.joinRoom(publicRoom.roomId, mockUser);

      expect(result).toBeDefined();
      expect(result.roomId).toBe(publicRoom.roomId);
      expect(result.role).toBe('MEMBER');
      expect(result.permissions).toBeDefined();
      expect(result.websocketUrl).toContain(publicRoom.roomId);
    });

    it('should allow joining private rooms with valid invite code', async () => {
      const result = await roomService.joinRoom(
        privateRoom.roomId, 
        mockUser, 
        privateRoom.inviteCode
      );

      expect(result).toBeDefined();
      expect(result.roomId).toBe(privateRoom.roomId);
      expect(result.role).toBe('MEMBER');
    });

    it('should reject joining private rooms without invite code', async () => {
      await expect(roomService.joinRoom(privateRoom.roomId, mockUser))
        .rejects.toThrow('Invalid invite code');
    });

    it('should reject joining private rooms with invalid invite code', async () => {
      await expect(roomService.joinRoom(privateRoom.roomId, mockUser, 'INVALID1'))
        .rejects.toThrow('Invalid invite code');
    });

    it('should reject joining reputation rooms with insufficient reputation', async () => {
      const lowRepUser = testUtils.createMockUser({
        squidId: 'squid_low_rep',
        identity: { reputation: 0.5 }
      });

      await expect(roomService.joinRoom(reputationRoom.roomId, lowRepUser))
        .rejects.toThrow('Insufficient reputation');
    });

    it('should prevent joining when already a member', async () => {
      // Join once
      await roomService.joinRoom(publicRoom.roomId, mockUser);

      // Try to join again
      await expect(roomService.joinRoom(publicRoom.roomId, mockUser))
        .rejects.toThrow('Already a member');
    });

    it('should prevent joining when room is full', async () => {
      // Fill up the room (maxMembers = 5, creator is already 1 member)
      for (let i = 0; i < 4; i++) {
        const user = testUtils.createMockUser({ squidId: `squid_user_${i}` });
        await roomService.joinRoom(publicRoom.roomId, user);
      }

      // Try to join when full
      await expect(roomService.joinRoom(publicRoom.roomId, mockUser))
        .rejects.toThrow('Room is full');
    });
  });

  describe('leaveRoom', () => {
    let testRoom;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        name: 'Leave Test Room',
        type: 'PUBLIC',
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      }, mockUser);

      // Join another user
      const otherUser = testUtils.createMockUser({ squidId: 'squid_other_user' });
      await roomService.joinRoom(testRoom.roomId, otherUser);
    });

    it('should allow leaving a room', async () => {
      const otherUser = testUtils.createMockUser({ squidId: 'squid_other_user' });
      const result = await roomService.leaveRoom(testRoom.roomId, otherUser);

      expect(result).toBe(true);
    });

    it('should return null for non-existent room', async () => {
      const result = await roomService.leaveRoom('non_existent_room', mockUser);
      expect(result).toBeNull();
    });

    it('should return null when not a member', async () => {
      const nonMember = testUtils.createMockUser({ squidId: 'squid_non_member' });
      const result = await roomService.leaveRoom(testRoom.roomId, nonMember);
      expect(result).toBeNull();
    });
  });

  describe('updateRoom', () => {
    let testRoom;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        name: 'Update Test Room',
        description: 'Original description',
        type: 'PUBLIC',
        maxMembers: 50,
        moderationLevel: 'BASIC',
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      }, mockUser);
    });

    it('should allow room owner to update settings', async () => {
      const updates = {
        description: 'Updated description',
        maxMembers: 100,
        moderationLevel: 'STRICT'
      };

      const result = await roomService.updateRoom(testRoom.roomId, updates, mockUser);

      expect(result).toBeDefined();
      expect(result.description).toBe('Updated description');
      expect(result.maxMembers).toBe(100);
      expect(result.moderationLevel).toBe('STRICT');
    });

    it('should reject updates from non-owners', async () => {
      const nonOwner = testUtils.createMockUser({ squidId: 'squid_non_owner' });
      const updates = { description: 'Unauthorized update' };

      await expect(roomService.updateRoom(testRoom.roomId, updates, nonOwner))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should return null for non-existent room', async () => {
      const updates = { description: 'Update' };
      const result = await roomService.updateRoom('non_existent_room', updates, mockUser);
      expect(result).toBeNull();
    });
  });

  describe('deleteRoom', () => {
    let testRoom;

    beforeEach(async () => {
      testRoom = await roomService.createRoom({
        name: 'Delete Test Room',
        type: 'PUBLIC',
        createdBy: mockUser.squidId,
        createdAt: new Date().toISOString()
      }, mockUser);
    });

    it('should allow room owner to delete room', async () => {
      const result = await roomService.deleteRoom(testRoom.roomId, mockUser);
      expect(result).toBe(true);

      // Verify room is deleted
      const details = await roomService.getRoomDetails(testRoom.roomId, mockUser);
      expect(details).toBeNull();
    });

    it('should reject deletion from non-owners', async () => {
      const nonOwner = testUtils.createMockUser({ squidId: 'squid_non_owner' });

      await expect(roomService.deleteRoom(testRoom.roomId, nonOwner))
        .rejects.toThrow('Only room owner can delete room');
    });

    it('should return null for non-existent room', async () => {
      const result = await roomService.deleteRoom('non_existent_room', mockUser);
      expect(result).toBeNull();
    });
  });

  describe('getUserPermissions', () => {
    it('should return correct permissions for OWNER role', () => {
      const permissions = roomService.getUserPermissions('OWNER');

      expect(permissions.canPost).toBe(true);
      expect(permissions.canInvite).toBe(true);
      expect(permissions.canModerate).toBe(true);
      expect(permissions.canManage).toBe(true);
    });

    it('should return correct permissions for ADMIN role', () => {
      const permissions = roomService.getUserPermissions('ADMIN');

      expect(permissions.canPost).toBe(true);
      expect(permissions.canInvite).toBe(true);
      expect(permissions.canModerate).toBe(true);
      expect(permissions.canManage).toBe(false);
    });

    it('should return correct permissions for MEMBER role', () => {
      const permissions = roomService.getUserPermissions('MEMBER');

      expect(permissions.canPost).toBe(true);
      expect(permissions.canInvite).toBe(false);
      expect(permissions.canModerate).toBe(false);
      expect(permissions.canManage).toBe(false);
    });

    it('should return correct permissions for GUEST role', () => {
      const permissions = roomService.getUserPermissions('GUEST');

      expect(permissions.canPost).toBe(true);
      expect(permissions.canInvite).toBe(false);
      expect(permissions.canModerate).toBe(false);
      expect(permissions.canManage).toBe(false);
    });
  });
});
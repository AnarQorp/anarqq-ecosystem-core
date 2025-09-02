/**
 * WebSocket Service Tests
 * Tests for real-time functionality and WebSocket connections
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import express from 'express';
import { webSocketService } from '../services/WebSocketService.mjs';
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

describe('WebSocket Service', () => {
  let server;
  let httpServer;
  let clientSocket;
  let serverPort;

  beforeAll(async () => {
    // Create test server
    const app = express();
    httpServer = createServer(app);
    
    // Initialize WebSocket service
    webSocketService.initialize(httpServer);
    
    // Start server on random port
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }
  });

  beforeEach(() => {
    // Create client socket for each test
    clientSocket = io(`http://localhost:${serverPort}`, {
      transports: ['websocket']
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should accept WebSocket connections', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should send connection confirmation', (done) => {
      clientSocket.on('connected', (data) => {
        expect(data).toHaveProperty('socketId');
        expect(data).toHaveProperty('timestamp');
        expect(data.socketId).toBe(clientSocket.id);
        done();
      });
    });

    it('should handle disconnection', (done) => {
      clientSocket.on('connect', () => {
        const initialCount = webSocketService.getConnectedUserCount();
        
        clientSocket.disconnect();
        
        // Give some time for cleanup
        setTimeout(() => {
          const finalCount = webSocketService.getConnectedUserCount();
          expect(finalCount).toBeLessThanOrEqual(initialCount);
          done();
        }, 100);
      });
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid JWT token', (done) => {
      const testUserId = 'did:squid:test123';
      const token = jwt.sign({ did: testUserId }, process.env.JWT_SECRET || 'test-secret');

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', { token });
      });

      clientSocket.on('authenticated', (data) => {
        expect(data).toHaveProperty('userId', testUserId);
        expect(data).toHaveProperty('timestamp');
        done();
      });

      clientSocket.on('auth_error', (error) => {
        done(new Error(`Authentication failed: ${error.message}`));
      });
    });

    it('should reject invalid JWT token', (done) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', { token: 'invalid-token' });
      });

      clientSocket.on('auth_error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });

      clientSocket.on('authenticated', () => {
        done(new Error('Should not authenticate with invalid token'));
      });
    });

    it('should reject authentication without token', (done) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', {});
      });

      clientSocket.on('auth_error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });
    });
  });

  describe('Room Subscriptions', () => {
    let authenticatedSocket;
    const testUserId = 'did:squid:test123';
    const token = jwt.sign({ did: testUserId }, process.env.JWT_SECRET || 'test-secret');

    beforeEach((done) => {
      authenticatedSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      authenticatedSocket.on('connect', () => {
        authenticatedSocket.emit('authenticate', { token });
      });

      authenticatedSocket.on('authenticated', () => {
        done();
      });
    });

    afterEach(() => {
      if (authenticatedSocket) {
        authenticatedSocket.disconnect();
      }
    });

    it('should subscribe to post updates', (done) => {
      const postId = 'test-post-123';

      authenticatedSocket.emit('subscribe_to_post', postId);

      authenticatedSocket.on('subscribed_to_post', (data) => {
        expect(data).toHaveProperty('postId', postId);
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });

    it('should subscribe to subcommunity updates', (done) => {
      const subcommunityId = 'test-community-123';

      authenticatedSocket.emit('subscribe_to_subcommunity', subcommunityId);

      authenticatedSocket.on('subscribed_to_subcommunity', (data) => {
        expect(data).toHaveProperty('subcommunityId', subcommunityId);
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });

    it('should subscribe to user notifications', (done) => {
      authenticatedSocket.emit('subscribe_to_user_notifications');

      authenticatedSocket.on('subscribed_to_notifications', (data) => {
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });

    it('should unsubscribe from post updates', (done) => {
      const postId = 'test-post-123';

      // First subscribe
      authenticatedSocket.emit('subscribe_to_post', postId);

      authenticatedSocket.on('subscribed_to_post', () => {
        // Then unsubscribe
        authenticatedSocket.emit('unsubscribe_from_post', postId);
      });

      authenticatedSocket.on('unsubscribed_from_post', (data) => {
        expect(data).toHaveProperty('postId', postId);
        expect(data).toHaveProperty('timestamp');
        done();
      });
    });
  });

  describe('Real-time Broadcasting', () => {
    it('should broadcast new post to all clients', (done) => {
      const testPost = {
        id: 'test-post-123',
        title: 'Test Post',
        content: 'Test content',
        authorId: 'did:squid:author123'
      };

      clientSocket.on('new_post', (event) => {
        expect(event).toHaveProperty('type', 'new_post');
        expect(event).toHaveProperty('data');
        expect(event.data).toMatchObject(testPost);
        expect(event).toHaveProperty('timestamp');
        done();
      });

      clientSocket.on('connect', () => {
        // Simulate broadcasting a new post
        webSocketService.broadcastNewPost(testPost);
      });
    });

    it('should broadcast vote updates to subscribed clients', (done) => {
      const voteData = {
        postId: 'test-post-123',
        newUpvotes: 5,
        newDownvotes: 1,
        userId: 'did:squid:voter123',
        vote: 'up'
      };

      const testUserId = 'did:squid:test123';
      const token = jwt.sign({ did: testUserId }, process.env.JWT_SECRET || 'test-secret');

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', { token });
      });

      clientSocket.on('authenticated', () => {
        clientSocket.emit('subscribe_to_post', voteData.postId);
      });

      clientSocket.on('subscribed_to_post', () => {
        // Simulate broadcasting a vote update
        webSocketService.broadcastVoteUpdate(voteData);
      });

      clientSocket.on('vote_updated', (event) => {
        expect(event).toHaveProperty('type', 'vote_updated');
        expect(event).toHaveProperty('data');
        expect(event.data).toMatchObject({
          postId: voteData.postId,
          upvotes: voteData.newUpvotes,
          downvotes: voteData.newDownvotes,
          voterId: voteData.userId,
          vote: voteData.vote
        });
        done();
      });
    });

    it('should broadcast new comments to post subscribers', (done) => {
      const testComment = {
        id: 'test-comment-123',
        postId: 'test-post-123',
        content: 'Test comment',
        authorId: 'did:squid:commenter123'
      };

      const testUserId = 'did:squid:test123';
      const token = jwt.sign({ did: testUserId }, process.env.JWT_SECRET || 'test-secret');

      clientSocket.on('connect', () => {
        clientSocket.emit('authenticate', { token });
      });

      clientSocket.on('authenticated', () => {
        clientSocket.emit('subscribe_to_post', testComment.postId);
      });

      clientSocket.on('subscribed_to_post', () => {
        // Simulate broadcasting a new comment
        webSocketService.broadcastNewComment(testComment);
      });

      clientSocket.on('new_comment', (event) => {
        expect(event).toHaveProperty('type', 'new_comment');
        expect(event).toHaveProperty('data');
        expect(event.data).toMatchObject(testComment);
        done();
      });
    });
  });

  describe('Typing Indicators', () => {
    let authenticatedSocket;
    const testUserId = 'did:squid:test123';
    const token = jwt.sign({ did: testUserId }, process.env.JWT_SECRET || 'test-secret');

    beforeEach((done) => {
      authenticatedSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      authenticatedSocket.on('connect', () => {
        authenticatedSocket.emit('authenticate', { token });
      });

      authenticatedSocket.on('authenticated', () => {
        done();
      });
    });

    afterEach(() => {
      if (authenticatedSocket) {
        authenticatedSocket.disconnect();
      }
    });

    it('should broadcast typing start to other users in post room', (done) => {
      const postId = 'test-post-123';
      const userName = 'Test User';

      // Create second client to receive typing indicator
      const secondSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      const secondUserId = 'did:squid:test456';
      const secondToken = jwt.sign({ did: secondUserId }, process.env.JWT_SECRET || 'test-secret');

      secondSocket.on('connect', () => {
        secondSocket.emit('authenticate', { token: secondToken });
      });

      secondSocket.on('authenticated', () => {
        secondSocket.emit('subscribe_to_post', postId);
      });

      secondSocket.on('subscribed_to_post', () => {
        // First user subscribes to post
        authenticatedSocket.emit('subscribe_to_post', postId);
      });

      authenticatedSocket.on('subscribed_to_post', () => {
        // First user starts typing
        authenticatedSocket.emit('typing_start', { postId, userName });
      });

      secondSocket.on('user_typing_start', (event) => {
        expect(event).toHaveProperty('postId', postId);
        expect(event).toHaveProperty('userId', testUserId);
        expect(event).toHaveProperty('userName', userName);
        expect(event).toHaveProperty('timestamp');
        
        secondSocket.disconnect();
        done();
      });
    });

    it('should broadcast typing stop to other users in post room', (done) => {
      const postId = 'test-post-123';

      // Create second client to receive typing indicator
      const secondSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });

      const secondUserId = 'did:squid:test456';
      const secondToken = jwt.sign({ did: secondUserId }, process.env.JWT_SECRET || 'test-secret');

      secondSocket.on('connect', () => {
        secondSocket.emit('authenticate', { token: secondToken });
      });

      secondSocket.on('authenticated', () => {
        secondSocket.emit('subscribe_to_post', postId);
      });

      secondSocket.on('subscribed_to_post', () => {
        authenticatedSocket.emit('subscribe_to_post', postId);
      });

      authenticatedSocket.on('subscribed_to_post', () => {
        authenticatedSocket.emit('typing_stop', { postId });
      });

      secondSocket.on('user_typing_stop', (event) => {
        expect(event).toHaveProperty('postId', postId);
        expect(event).toHaveProperty('userId', testUserId);
        expect(event).toHaveProperty('timestamp');
        
        secondSocket.disconnect();
        done();
      });
    });
  });

  describe('Utility Methods', () => {
    it('should track connected user count', () => {
      const initialCount = webSocketService.getConnectedUserCount();
      expect(typeof initialCount).toBe('number');
      expect(initialCount).toBeGreaterThanOrEqual(0);
    });

    it('should check if user is connected', () => {
      const testUserId = 'did:squid:test123';
      const isConnected = webSocketService.isUserConnected(testUserId);
      expect(typeof isConnected).toBe('boolean');
    });

    it('should get connected user IDs', () => {
      const userIds = webSocketService.getConnectedUserIds();
      expect(Array.isArray(userIds)).toBe(true);
    });

    it('should broadcast system messages', (done) => {
      const testMessage = 'Test system message';
      const testLevel = 'info';

      clientSocket.on('system_message', (event) => {
        expect(event).toHaveProperty('type', 'system_message');
        expect(event).toHaveProperty('data');
        expect(event.data).toHaveProperty('message', testMessage);
        expect(event.data).toHaveProperty('level', testLevel);
        expect(event.data).toHaveProperty('timestamp');
        done();
      });

      clientSocket.on('connect', () => {
        webSocketService.broadcastSystemMessage(testMessage, testLevel);
      });
    });
  });
});
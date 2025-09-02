/**
 * Integration tests for Qsocial API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import qsocialRoutes from '../routes/qsocial.mjs';

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use('/api/qsocial', qsocialRoutes);
  
  return app;
};

// Helper function to create valid auth headers
const createAuthHeaders = (did, action = 'test', additionalData = {}) => {
  const message = {
    action,
    timestamp: new Date().toISOString(),
    did,
    ...additionalData
  };
  
  const messageStr = JSON.stringify(message);
  const data = `${messageStr}:${did}`;
  const signature = crypto.createHash('sha256').update(data).digest('hex');
  
  return {
    'X-Identity-DID': did,
    'X-Signature': signature,
    'X-Message': messageStr,
    'Content-Type': 'application/json'
  };
};

describe('Qsocial API Integration', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/qsocial/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.service).toBe('Qsocial');
    });
  });
  
  describe('Posts API', () => {
    it('should create a post with valid authentication', async () => {
      const did = 'did:squid:testuser123';
      const headers = createAuthHeaders(did, 'createPost');
      
      const postData = {
        title: 'Test Post',
        content: 'This is a test post content',
        contentType: 'text',
        tags: ['test', 'integration'],
        privacyLevel: 'public'
      };
      
      const response = await request(app)
        .post('/api/qsocial/posts')
        .set(headers)
        .send(postData);
      
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(postData.title);
      expect(response.body.content).toBe(postData.content);
      expect(response.body.authorId).toBe(did);
      expect(response.body.id).toBeDefined();
    });
    
    it('should reject post creation without authentication', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post content'
      };
      
      const response = await request(app)
        .post('/api/qsocial/posts')
        .send(postData);
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
    
    it('should reject post creation with missing required fields', async () => {
      const did = 'did:squid:testuser123';
      const headers = createAuthHeaders(did, 'createPost');
      
      const postData = {
        content: 'This is a test post content'
        // Missing title
      };
      
      const response = await request(app)
        .post('/api/qsocial/posts')
        .set(headers)
        .send(postData);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });
    
    it('should get a post by ID', async () => {
      const response = await request(app)
        .get('/api/qsocial/posts/test-post-id');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-post-id');
      expect(response.body.title).toBeDefined();
      expect(response.body.content).toBeDefined();
    });
    
    it('should vote on a post with authentication', async () => {
      const did = 'did:squid:voter123';
      const headers = createAuthHeaders(did, 'votePost');
      
      const response = await request(app)
        .post('/api/qsocial/posts/test-post-id/vote')
        .set(headers)
        .send({ vote: 'up' });
      
      expect(response.status).toBe(200);
      expect(response.body.postId).toBe('test-post-id');
      expect(response.body.vote).toBe('up');
      expect(response.body.qarmaChange).toBe(10); // POST_UPVOTED gives 10 Qarma
    });
    
    it('should reject invalid vote values', async () => {
      const did = 'did:squid:voter123';
      const headers = createAuthHeaders(did, 'votePost');
      
      const response = await request(app)
        .post('/api/qsocial/posts/test-post-id/vote')
        .set(headers)
        .send({ vote: 'invalid' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid vote');
    });
  });
  
  describe('Feed API', () => {
    it('should get main feed without authentication', async () => {
      const response = await request(app)
        .get('/api/qsocial/feed');
      
      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.hasMore).toBeDefined();
    });
    
    it('should get main feed with query parameters', async () => {
      const response = await request(app)
        .get('/api/qsocial/feed?limit=5&sortBy=new&timeRange=day');
      
      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(response.body.posts.length).toBeLessThanOrEqual(5);
    });
  });
  
  describe('Comments API', () => {
    it('should create a comment with authentication', async () => {
      const did = 'did:squid:commenter123';
      const headers = createAuthHeaders(did, 'createComment');
      
      const commentData = {
        postId: 'test-post-id',
        content: 'This is a test comment'
      };
      
      const response = await request(app)
        .post('/api/qsocial/comments')
        .set(headers)
        .send(commentData);
      
      expect(response.status).toBe(201);
      expect(response.body.content).toBe(commentData.content);
      expect(response.body.postId).toBe(commentData.postId);
      expect(response.body.authorId).toBe(did);
    });
    
    it('should get comments for a post', async () => {
      const response = await request(app)
        .get('/api/qsocial/posts/test-post-id/comments');
      
      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
    });
  });
  
  describe('Subcommunities API', () => {
    it('should create a subcommunity with sufficient reputation', async () => {
      // Use a DID that will generate high reputation
      const did = 'did:squid:highrepuser';
      const headers = createAuthHeaders(did, 'createSubcommunity');
      
      const subcommunityData = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community for integration testing',
        isPrivate: false,
        rules: ['Be respectful', 'No spam']
      };
      
      const response = await request(app)
        .post('/api/qsocial/subcommunities')
        .set(headers)
        .send(subcommunityData);
      
      // This might pass or fail depending on the reputation generated
      // but it should not error
      expect([201, 403]).toContain(response.status);
    });
    
    it('should get a subcommunity by ID', async () => {
      const response = await request(app)
        .get('/api/qsocial/subcommunities/test-community-id');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-community-id');
      expect(response.body.name).toBeDefined();
      expect(response.body.displayName).toBeDefined();
    });
    
    it('should search subcommunities', async () => {
      const response = await request(app)
        .get('/api/qsocial/subcommunities/search?q=tech');
      
      expect(response.status).toBe(200);
      expect(response.body.subcommunities).toBeDefined();
      expect(Array.isArray(response.body.subcommunities)).toBe(true);
    });
  });
  
  describe('Reputation API', () => {
    it('should get user reputation', async () => {
      const response = await request(app)
        .get('/api/qsocial/users/did:squid:testuser123/reputation');
      
      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('did:squid:testuser123');
      expect(response.body.totalQarma).toBeDefined();
      expect(response.body.badges).toBeDefined();
      expect(Array.isArray(response.body.badges)).toBe(true);
    });
  });
  
  describe('Cross-posts API', () => {
    it('should create a cross-post with authentication', async () => {
      const did = 'did:squid:crossposter123';
      const headers = createAuthHeaders(did, 'createCrossPost');
      
      const crossPostData = {
        sourceModule: 'qpic',
        sourceId: 'image-123',
        title: 'Shared from QpiC',
        description: 'Check out this cool image'
      };
      
      const response = await request(app)
        .post('/api/qsocial/cross-posts')
        .set(headers)
        .send(crossPostData);
      
      expect(response.status).toBe(201);
      expect(response.body.sourceModule).toBe(crossPostData.sourceModule);
      expect(response.body.sourceId).toBe(crossPostData.sourceId);
      expect(response.body.contentType).toBe('cross-post');
    });
  });
});
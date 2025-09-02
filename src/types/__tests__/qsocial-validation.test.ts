import { describe, it, expect } from 'vitest';
import {
  validateCreatePostRequest,
  validateCreateCommentRequest,
  validateCreateSubcommunityRequest,
  safeValidateCreatePostRequest,
  safeValidateCreateCommentRequest,
  safeValidateCreateSubcommunityRequest,
} from '../qsocial-validation';
import {
  ContentType,
  PrivacyLevel,
} from '../qsocial';

describe('Qsocial Validation Schemas', () => {
  describe('CreatePostRequest validation', () => {
    it('should validate a valid post request', () => {
      const validPost = {
        title: 'Test Post',
        content: 'This is a test post content',
        contentType: ContentType.TEXT,
        tags: ['test', 'validation'],
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      expect(() => validateCreatePostRequest(validPost)).not.toThrow();
      
      const result = safeValidateCreatePostRequest(validPost);
      expect(result.success).toBe(true);
    });

    it('should reject post with empty title', () => {
      const invalidPost = {
        title: '',
        content: 'This is a test post content',
        contentType: ContentType.TEXT,
      };

      expect(() => validateCreatePostRequest(invalidPost)).toThrow();
      
      const result = safeValidateCreatePostRequest(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should reject post with too many tags', () => {
      const invalidPost = {
        title: 'Test Post',
        content: 'This is a test post content',
        contentType: ContentType.TEXT,
        tags: Array(11).fill('tag'), // 11 tags, max is 10
      };

      expect(() => validateCreatePostRequest(invalidPost)).toThrow();
      
      const result = safeValidateCreatePostRequest(invalidPost);
      expect(result.success).toBe(false);
    });

    it('should reject post with title too long', () => {
      const invalidPost = {
        title: 'A'.repeat(301), // 301 characters, max is 300
        content: 'This is a test post content',
        contentType: ContentType.TEXT,
      };

      expect(() => validateCreatePostRequest(invalidPost)).toThrow();
      
      const result = safeValidateCreatePostRequest(invalidPost);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCommentRequest validation', () => {
    it('should validate a valid comment request', () => {
      const validComment = {
        postId: 'post-123',
        content: 'This is a test comment',
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      expect(() => validateCreateCommentRequest(validComment)).not.toThrow();
      
      const result = safeValidateCreateCommentRequest(validComment);
      expect(result.success).toBe(true);
    });

    it('should reject comment with empty content', () => {
      const invalidComment = {
        postId: 'post-123',
        content: '',
      };

      expect(() => validateCreateCommentRequest(invalidComment)).toThrow();
      
      const result = safeValidateCreateCommentRequest(invalidComment);
      expect(result.success).toBe(false);
    });

    it('should reject comment with missing postId', () => {
      const invalidComment = {
        content: 'This is a test comment',
      };

      expect(() => validateCreateCommentRequest(invalidComment)).toThrow();
      
      const result = safeValidateCreateCommentRequest(invalidComment);
      expect(result.success).toBe(false);
    });

    it('should reject comment with content too long', () => {
      const invalidComment = {
        postId: 'post-123',
        content: 'A'.repeat(10001), // 10001 characters, max is 10000
      };

      expect(() => validateCreateCommentRequest(invalidComment)).toThrow();
      
      const result = safeValidateCreateCommentRequest(invalidComment);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateSubcommunityRequest validation', () => {
    it('should validate a valid subcommunity request', () => {
      const validSubcommunity = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'This is a test community',
        isPrivate: false,
        requiresApproval: false,
        minimumQarma: 0,
        rules: ['Be respectful', 'No spam'],
      };

      expect(() => validateCreateSubcommunityRequest(validSubcommunity)).not.toThrow();
      
      const result = safeValidateCreateSubcommunityRequest(validSubcommunity);
      expect(result.success).toBe(true);
    });

    it('should reject subcommunity with invalid name characters', () => {
      const invalidSubcommunity = {
        name: 'test community!', // spaces and special chars not allowed
        displayName: 'Test Community',
        description: 'This is a test community',
      };

      expect(() => validateCreateSubcommunityRequest(invalidSubcommunity)).toThrow();
      
      const result = safeValidateCreateSubcommunityRequest(invalidSubcommunity);
      expect(result.success).toBe(false);
    });

    it('should reject subcommunity with name too short', () => {
      const invalidSubcommunity = {
        name: 'ab', // 2 characters, min is 3
        displayName: 'Test Community',
        description: 'This is a test community',
      };

      expect(() => validateCreateSubcommunityRequest(invalidSubcommunity)).toThrow();
      
      const result = safeValidateCreateSubcommunityRequest(invalidSubcommunity);
      expect(result.success).toBe(false);
    });

    it('should reject subcommunity with too many rules', () => {
      const invalidSubcommunity = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'This is a test community',
        rules: Array(21).fill('Rule'), // 21 rules, max is 20
      };

      expect(() => validateCreateSubcommunityRequest(invalidSubcommunity)).toThrow();
      
      const result = safeValidateCreateSubcommunityRequest(invalidSubcommunity);
      expect(result.success).toBe(false);
    });

    it('should reject subcommunity with negative minimum qarma', () => {
      const invalidSubcommunity = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'This is a test community',
        minimumQarma: -10, // negative value not allowed
      };

      expect(() => validateCreateSubcommunityRequest(invalidSubcommunity)).toThrow();
      
      const result = safeValidateCreateSubcommunityRequest(invalidSubcommunity);
      expect(result.success).toBe(false);
    });
  });
});
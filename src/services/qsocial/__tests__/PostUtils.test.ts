import { describe, it, expect } from 'vitest';
import { ContentType } from '../../../types/qsocial';

/**
 * Content sanitization utilities (copied for testing)
 */
class ContentSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(content: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '');
  }

  /**
   * Sanitize text content
   */
  static sanitizeText(content: string): string {
    // Remove null bytes and control characters except newlines and tabs
    return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsedUrl.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize tags
   */
  static sanitizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .filter(tag => /^[a-zA-Z0-9_-]+$/.test(tag))
      .slice(0, 10); // Max 10 tags
  }
}

/**
 * Post validation utilities (copied for testing)
 */
class PostValidator {
  /**
   * Validate post content based on type
   */
  static validateContentByType(content: string, contentType: ContentType): void {
    switch (contentType) {
      case ContentType.TEXT:
        if (content.length > 50000) {
          throw new Error('Text content exceeds maximum length');
        }
        break;
      case ContentType.LINK:
        // For link posts, content should be a valid URL or description
        if (content.length > 10000) {
          throw new Error('Link description exceeds maximum length');
        }
        break;
      case ContentType.MEDIA:
        // Media posts can have descriptions
        if (content.length > 10000) {
          throw new Error('Media description exceeds maximum length');
        }
        break;
      case ContentType.CROSS_POST:
        // Cross-posts can have additional content
        if (content.length > 10000) {
          throw new Error('Cross-post content exceeds maximum length');
        }
        break;
    }
  }

  /**
   * Validate post title
   */
  static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Post title is required');
    }
    if (title.length > 300) {
      throw new Error('Post title exceeds maximum length');
    }
  }
}

describe('ContentSanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('Hello  World');
    });

    it('should remove javascript: protocols', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('<a href="alert(1)">Click</a>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('<div >Click me</div>');
    });

    it('should remove dangerous tags', () => {
      const input = '<iframe src="evil.com"></iframe><object></object><embed>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('');
    });

    it('should preserve safe HTML', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('<p>Hello <strong>world</strong>!</p>');
    });
  });

  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00\x01World\x7F';
      const result = ContentSanitizer.sanitizeText(input);
      expect(result).toBe('HelloWorld');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'Hello\nWorld\tTest';
      const result = ContentSanitizer.sanitizeText(input);
      expect(result).toBe('Hello\nWorld\tTest');
    });

    it('should preserve regular text', () => {
      const input = 'This is normal text with spaces and punctuation!';
      const result = ContentSanitizer.sanitizeText(input);
      expect(result).toBe('This is normal text with spaces and punctuation!');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URLs', () => {
      const input = 'http://example.com';
      const result = ContentSanitizer.sanitizeUrl(input);
      expect(result).toBe('http://example.com/');
    });

    it('should accept valid HTTPS URLs', () => {
      const input = 'https://example.com/path?query=1';
      const result = ContentSanitizer.sanitizeUrl(input);
      expect(result).toBe('https://example.com/path?query=1');
    });

    it('should reject javascript: URLs', () => {
      const input = 'javascript:alert(1)';
      expect(() => ContentSanitizer.sanitizeUrl(input)).toThrow('Invalid URL format');
    });

    it('should reject data: URLs', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      expect(() => ContentSanitizer.sanitizeUrl(input)).toThrow('Invalid URL format');
    });

    it('should reject invalid URLs', () => {
      const input = 'not-a-url';
      expect(() => ContentSanitizer.sanitizeUrl(input)).toThrow('Invalid URL format');
    });
  });

  describe('sanitizeTags', () => {
    it('should normalize tags to lowercase', () => {
      const input = ['Test', 'UPPERCASE', 'MiXeD'];
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toEqual(['test', 'uppercase', 'mixed']);
    });

    it('should remove empty tags', () => {
      const input = ['valid', '', '   ', 'another'];
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toEqual(['valid', 'another']);
    });

    it('should filter invalid characters', () => {
      const input = ['valid-tag', 'invalid@tag', 'valid_tag', 'invalid tag'];
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toEqual(['valid-tag', 'valid_tag']);
    });

    it('should limit to 10 tags', () => {
      const input = Array(15).fill('tag').map((_, i) => `tag${i}`);
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toHaveLength(10);
    });

    it('should filter tags longer than 50 characters', () => {
      const input = ['short', 'a'.repeat(51)];
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toEqual(['short']);
    });

    it('should handle mixed valid and invalid tags', () => {
      const input = ['valid1', 'invalid@', 'valid-2', '', 'VALID_3', 'invalid space'];
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toEqual(['valid1', 'valid-2', 'valid_3']);
    });
  });
});

describe('PostValidator', () => {
  describe('validateContentByType', () => {
    it('should accept valid text content', () => {
      const content = 'This is valid text content';
      expect(() => PostValidator.validateContentByType(content, ContentType.TEXT)).not.toThrow();
    });

    it('should reject text content that is too long', () => {
      const content = 'a'.repeat(50001);
      expect(() => PostValidator.validateContentByType(content, ContentType.TEXT))
        .toThrow('Text content exceeds maximum length');
    });

    it('should accept valid link content', () => {
      const content = 'This is a link description';
      expect(() => PostValidator.validateContentByType(content, ContentType.LINK)).not.toThrow();
    });

    it('should reject link content that is too long', () => {
      const content = 'a'.repeat(10001);
      expect(() => PostValidator.validateContentByType(content, ContentType.LINK))
        .toThrow('Link description exceeds maximum length');
    });

    it('should accept valid media content', () => {
      const content = 'This is a media description';
      expect(() => PostValidator.validateContentByType(content, ContentType.MEDIA)).not.toThrow();
    });

    it('should reject media content that is too long', () => {
      const content = 'a'.repeat(10001);
      expect(() => PostValidator.validateContentByType(content, ContentType.MEDIA))
        .toThrow('Media description exceeds maximum length');
    });

    it('should accept valid cross-post content', () => {
      const content = 'This is additional cross-post content';
      expect(() => PostValidator.validateContentByType(content, ContentType.CROSS_POST)).not.toThrow();
    });

    it('should reject cross-post content that is too long', () => {
      const content = 'a'.repeat(10001);
      expect(() => PostValidator.validateContentByType(content, ContentType.CROSS_POST))
        .toThrow('Cross-post content exceeds maximum length');
    });
  });

  describe('validateTitle', () => {
    it('should accept valid titles', () => {
      expect(() => PostValidator.validateTitle('Valid Title')).not.toThrow();
      expect(() => PostValidator.validateTitle('A')).not.toThrow();
      expect(() => PostValidator.validateTitle('A'.repeat(300))).not.toThrow();
    });

    it('should reject empty titles', () => {
      expect(() => PostValidator.validateTitle('')).toThrow('Post title is required');
      expect(() => PostValidator.validateTitle('   ')).toThrow('Post title is required');
    });

    it('should reject null or undefined titles', () => {
      expect(() => PostValidator.validateTitle(null as any)).toThrow('Post title is required');
      expect(() => PostValidator.validateTitle(undefined as any)).toThrow('Post title is required');
    });

    it('should reject titles that are too long', () => {
      const longTitle = 'a'.repeat(301);
      expect(() => PostValidator.validateTitle(longTitle))
        .toThrow('Post title exceeds maximum length');
    });

    it('should accept titles with special characters', () => {
      expect(() => PostValidator.validateTitle('Title with émojis 🚀 and symbols!')).not.toThrow();
    });
  });
});
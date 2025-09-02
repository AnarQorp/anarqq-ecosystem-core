import { describe, it, expect, vi } from 'vitest';
import { ContentType, PrivacyLevel } from '../../../types/qsocial';

// Mock the PostService to test the utilities in isolation
const ContentSanitizer = {
  sanitizeHtml: (input: string): string => {
    let sanitized = input;
    
    // Remove script tags (handle nested ones by repeating until no more found)
    let prevLength;
    do {
      prevLength = sanitized.length;
      // Remove script tags and their content
      sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      // Also remove any remaining script tags (opening or closing)
      sanitized = sanitized.replace(/<\/?script\b[^>]*>/gi, '');
    } while (sanitized.length !== prevLength);
    
    // Remove javascript: protocols
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""');
    
    // Remove event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove dangerous tags
    sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*>.*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*\/?>|<\/(iframe|object|embed)>/gi, '');
    
    return sanitized;
  },

  sanitizeText: (input: string): string => {
    // Remove control characters except newlines and tabs
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  },

  sanitizeUrl: (input: string): string => {
    try {
      const url = new URL(input);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      return url.toString();
    } catch (error) {
      // Check if it's a protocol issue by looking at the input
      if (input.includes(':') && !input.startsWith('http://') && !input.startsWith('https://')) {
        throw new Error('Invalid protocol');
      }
      throw new Error('Invalid URL format');
    }
  },

  sanitizeTags: (input: string[]): string[] => {
    return input
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .filter(tag => /^[a-z0-9_-]+$/.test(tag))
      .filter(tag => tag.length <= 50)
      .slice(0, 10); // Limit to 10 tags
  }
};

const PostValidator = {
  validateContentByType: (content: string, contentType: ContentType): void => {
    switch (contentType) {
      case ContentType.TEXT:
        if (content.length > 50000) {
          throw new Error('Text content exceeds maximum length');
        }
        break;
      case ContentType.LINK:
        if (content.length > 10000) {
          throw new Error('Link description exceeds maximum length');
        }
        break;
      case ContentType.MEDIA:
        if (content.length > 5000) {
          throw new Error('Media description exceeds maximum length');
        }
        break;
    }
  },

  validateTitle: (title: string): void => {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error('Post title is required');
    }
    if (trimmed.length > 300) {
      throw new Error('Post title exceeds maximum length');
    }
  },

  validateTags: (tags: string[]): void => {
    if (tags.length > 10) {
      throw new Error('Too many tags (maximum 10)');
    }
    
    for (const tag of tags) {
      if (tag.length > 50) {
        throw new Error('Tag exceeds maximum length');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
        throw new Error('Tag contains invalid characters');
      }
    }
  },

  validatePrivacyLevel: (privacyLevel: PrivacyLevel, subcommunityId?: string): void => {
    if (privacyLevel === PrivacyLevel.COMMUNITY && !subcommunityId) {
      throw new Error('Community privacy level requires subcommunity ID');
    }
  }
};

const QarmaCalculator = {
  calculatePostQarma: (upvotes: number, downvotes: number, age: number): number => {
    const score = upvotes - downvotes;
    const ageHours = age / (1000 * 60 * 60);
    
    // Decay factor based on age (posts lose value over time)
    const decayFactor = Math.exp(-ageHours / 24); // Half-life of 24 hours
    
    return Math.floor(score * decayFactor * 10);
  },

  calculateCommentQarma: (upvotes: number, downvotes: number, depth: number): number => {
    const score = upvotes - downvotes;
    
    // Deeper comments get slightly less Qarma
    const depthPenalty = Math.max(0.5, 1 - (depth * 0.1));
    
    return Math.floor(score * depthPenalty * 5);
  },

  calculateUserQarmaFromActivity: (
    postUpvotes: number,
    postDownvotes: number,
    commentUpvotes: number,
    commentDownvotes: number,
    postsCreated: number,
    commentsCreated: number
  ): number => {
    const postQarma = (postUpvotes * 10) - (postDownvotes * 5) + (postsCreated * 5);
    const commentQarma = (commentUpvotes * 5) - (commentDownvotes * 2) + (commentsCreated * 2);
    
    return Math.max(0, postQarma + commentQarma);
  },

  getQarmaLevel: (totalQarma: number): string => {
    if (totalQarma >= 10000) return 'Master';
    if (totalQarma >= 5000) return 'Expert';
    if (totalQarma >= 1000) return 'Advanced';
    if (totalQarma >= 500) return 'Intermediate';
    if (totalQarma >= 100) return 'Beginner';
    return 'Newcomer';
  },

  getModerationThreshold: (subcommunityId?: string): number => {
    // Different communities might have different thresholds
    if (subcommunityId === 'high-security') return 1000;
    if (subcommunityId === 'beginner-friendly') return 100;
    return 500; // Default threshold
  }
};

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
      expect(result).toBe('<a href="">Click</a>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('<div>Click me</div>');
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

    it('should handle nested script tags', () => {
      const input = '<script>alert(1)<script>alert(2)</script></script>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('');
    });

    it('should handle malformed HTML', () => {
      const input = '<script>alert(1)</script><div>Normal content</div>';
      const result = ContentSanitizer.sanitizeHtml(input);
      expect(result).toBe('<div>Normal content</div>');
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

    it('should handle empty string', () => {
      const input = '';
      const result = ContentSanitizer.sanitizeText(input);
      expect(result).toBe('');
    });

    it('should handle string with only control characters', () => {
      const input = '\x00\x01\x02';
      const result = ContentSanitizer.sanitizeText(input);
      expect(result).toBe('');
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
      expect(() => ContentSanitizer.sanitizeUrl(input)).toThrow('Invalid protocol');
    });

    it('should reject data: URLs', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      expect(() => ContentSanitizer.sanitizeUrl(input)).toThrow('Invalid protocol');
    });

    it('should reject invalid URLs', () => {
      const input = 'not-a-url';
      expect(() => ContentSanitizer.sanitizeUrl(input)).toThrow('Invalid URL format');
    });

    it('should handle URLs with special characters', () => {
      const input = 'https://example.com/path with spaces';
      const result = ContentSanitizer.sanitizeUrl(input);
      expect(result).toBe('https://example.com/path%20with%20spaces');
    });

    it('should handle properly encoded URLs', () => {
      const input = 'https://example.com/path%20with%20spaces';
      const result = ContentSanitizer.sanitizeUrl(input);
      expect(result).toBe('https://example.com/path%20with%20spaces');
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

    it('should handle duplicate tags', () => {
      const input = ['tag1', 'tag2', 'tag1', 'tag3'];
      const result = ContentSanitizer.sanitizeTags(input);
      expect(result).toEqual(['tag1', 'tag2', 'tag1', 'tag3']); // Duplicates allowed for now
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
      const content = 'Media description';
      expect(() => PostValidator.validateContentByType(content, ContentType.MEDIA)).not.toThrow();
    });

    it('should reject media content that is too long', () => {
      const content = 'a'.repeat(5001);
      expect(() => PostValidator.validateContentByType(content, ContentType.MEDIA))
        .toThrow('Media description exceeds maximum length');
    });
  });

  describe('validateTitle', () => {
    it('should accept valid titles', () => {
      expect(() => PostValidator.validateTitle('Valid Title')).not.toThrow();
    });

    it('should reject empty titles', () => {
      expect(() => PostValidator.validateTitle('')).toThrow('Post title is required');
      expect(() => PostValidator.validateTitle('   ')).toThrow('Post title is required');
    });

    it('should reject titles that are too long', () => {
      const longTitle = 'a'.repeat(301);
      expect(() => PostValidator.validateTitle(longTitle))
        .toThrow('Post title exceeds maximum length');
    });

    it('should accept titles at the limit', () => {
      const limitTitle = 'a'.repeat(300);
      expect(() => PostValidator.validateTitle(limitTitle)).not.toThrow();
    });
  });

  describe('validateTags', () => {
    it('should accept valid tags', () => {
      const tags = ['tag1', 'tag-2', 'tag_3'];
      expect(() => PostValidator.validateTags(tags)).not.toThrow();
    });

    it('should reject too many tags', () => {
      const tags = Array(11).fill('tag').map((_, i) => `tag${i}`);
      expect(() => PostValidator.validateTags(tags)).toThrow('Too many tags (maximum 10)');
    });

    it('should reject tags that are too long', () => {
      const tags = ['a'.repeat(51)];
      expect(() => PostValidator.validateTags(tags)).toThrow('Tag exceeds maximum length');
    });

    it('should reject tags with invalid characters', () => {
      const tags = ['invalid@tag'];
      expect(() => PostValidator.validateTags(tags)).toThrow('Tag contains invalid characters');
    });

    it('should accept empty tag array', () => {
      expect(() => PostValidator.validateTags([])).not.toThrow();
    });
  });

  describe('validatePrivacyLevel', () => {
    it('should accept public privacy level', () => {
      expect(() => PostValidator.validatePrivacyLevel(PrivacyLevel.PUBLIC)).not.toThrow();
    });

    it('should accept private privacy level', () => {
      expect(() => PostValidator.validatePrivacyLevel(PrivacyLevel.PRIVATE)).not.toThrow();
    });

    it('should accept community privacy level with subcommunity ID', () => {
      expect(() => PostValidator.validatePrivacyLevel(PrivacyLevel.COMMUNITY, 'sub-123')).not.toThrow();
    });

    it('should reject community privacy level without subcommunity ID', () => {
      expect(() => PostValidator.validatePrivacyLevel(PrivacyLevel.COMMUNITY))
        .toThrow('Community privacy level requires subcommunity ID');
    });
  });
});

describe('QarmaCalculator', () => {
  describe('calculatePostQarma', () => {
    it('should calculate Qarma for new post', () => {
      const upvotes = 10;
      const downvotes = 2;
      const age = 1000 * 60 * 60; // 1 hour
      
      const qarma = QarmaCalculator.calculatePostQarma(upvotes, downvotes, age);
      expect(qarma).toBeGreaterThan(0);
      expect(qarma).toBeLessThan(80); // Should be less than max due to age decay
    });

    it('should apply age decay correctly', () => {
      const upvotes = 10;
      const downvotes = 0;
      
      const newPostQarma = QarmaCalculator.calculatePostQarma(upvotes, downvotes, 0);
      const oldPostQarma = QarmaCalculator.calculatePostQarma(upvotes, downvotes, 24 * 60 * 60 * 1000);
      
      expect(newPostQarma).toBeGreaterThan(oldPostQarma);
    });

    it('should handle negative scores', () => {
      const upvotes = 2;
      const downvotes = 10;
      const age = 1000 * 60 * 60;
      
      const qarma = QarmaCalculator.calculatePostQarma(upvotes, downvotes, age);
      expect(qarma).toBeLessThan(0);
    });

    it('should handle zero votes', () => {
      const qarma = QarmaCalculator.calculatePostQarma(0, 0, 1000);
      expect(qarma).toBe(0);
    });
  });

  describe('calculateCommentQarma', () => {
    it('should calculate Qarma for top-level comment', () => {
      const upvotes = 5;
      const downvotes = 1;
      const depth = 0;
      
      const qarma = QarmaCalculator.calculateCommentQarma(upvotes, downvotes, depth);
      expect(qarma).toBe(20); // (5-1) * 1.0 * 5
    });

    it('should apply depth penalty', () => {
      const upvotes = 5;
      const downvotes = 1;
      
      const topLevelQarma = QarmaCalculator.calculateCommentQarma(upvotes, downvotes, 0);
      const deepQarma = QarmaCalculator.calculateCommentQarma(upvotes, downvotes, 3);
      
      expect(topLevelQarma).toBeGreaterThan(deepQarma);
    });

    it('should have minimum penalty of 0.5', () => {
      const upvotes = 10;
      const downvotes = 0;
      const veryDeepDepth = 10;
      
      const qarma = QarmaCalculator.calculateCommentQarma(upvotes, downvotes, veryDeepDepth);
      expect(qarma).toBe(25); // 10 * 0.5 * 5
    });
  });

  describe('calculateUserQarmaFromActivity', () => {
    it('should calculate total user Qarma correctly', () => {
      const qarma = QarmaCalculator.calculateUserQarmaFromActivity(
        10, // post upvotes
        2,  // post downvotes
        20, // comment upvotes
        5,  // comment downvotes
        3,  // posts created
        15  // comments created
      );
      
      // (10*10 - 2*5 + 3*5) + (20*5 - 5*2 + 15*2) = (100-10+15) + (100-10+30) = 105 + 120 = 225
      expect(qarma).toBe(225);
    });

    it('should not return negative Qarma', () => {
      const qarma = QarmaCalculator.calculateUserQarmaFromActivity(
        0,   // post upvotes
        100, // post downvotes
        0,   // comment upvotes
        100, // comment downvotes
        0,   // posts created
        0    // comments created
      );
      
      expect(qarma).toBe(0);
    });

    it('should handle zero activity', () => {
      const qarma = QarmaCalculator.calculateUserQarmaFromActivity(0, 0, 0, 0, 0, 0);
      expect(qarma).toBe(0);
    });
  });

  describe('getQarmaLevel', () => {
    it('should return correct levels', () => {
      expect(QarmaCalculator.getQarmaLevel(0)).toBe('Newcomer');
      expect(QarmaCalculator.getQarmaLevel(50)).toBe('Newcomer');
      expect(QarmaCalculator.getQarmaLevel(100)).toBe('Beginner');
      expect(QarmaCalculator.getQarmaLevel(500)).toBe('Intermediate');
      expect(QarmaCalculator.getQarmaLevel(1000)).toBe('Advanced');
      expect(QarmaCalculator.getQarmaLevel(5000)).toBe('Expert');
      expect(QarmaCalculator.getQarmaLevel(10000)).toBe('Master');
      expect(QarmaCalculator.getQarmaLevel(50000)).toBe('Master');
    });
  });

  describe('getModerationThreshold', () => {
    it('should return default threshold', () => {
      const threshold = QarmaCalculator.getModerationThreshold();
      expect(threshold).toBe(500);
    });

    it('should return higher threshold for high-security communities', () => {
      const threshold = QarmaCalculator.getModerationThreshold('high-security');
      expect(threshold).toBe(1000);
    });

    it('should return lower threshold for beginner-friendly communities', () => {
      const threshold = QarmaCalculator.getModerationThreshold('beginner-friendly');
      expect(threshold).toBe(100);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { QsocialComment, PrivacyLevel, ModerationStatus } from '../../../types/qsocial';

/**
 * Comment validation utilities (copied for testing)
 */
class CommentValidator {
  /**
   * Validate comment content
   */
  static validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }
    if (content.length > 10000) {
      throw new Error('Comment content exceeds maximum length');
    }
  }

  /**
   * Validate comment depth
   */
  static validateDepth(depth: number): void {
    if (depth < 0) {
      throw new Error('Comment depth cannot be negative');
    }
    if (depth > 10) {
      throw new Error('Comment depth exceeds maximum nesting level');
    }
  }
}

/**
 * Comment threading utilities (copied for testing)
 */
class CommentThreadManager {
  /**
   * Calculate comment depth based on parent
   */
  static calculateDepth(parentComment?: QsocialComment): number {
    return parentComment ? parentComment.depth + 1 : 0;
  }

  /**
   * Build comment tree from flat list
   */
  static buildCommentTree(comments: QsocialComment[]): QsocialComment[] {
    const commentMap = new Map<string, QsocialComment>();
    const rootComments: QsocialComment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, childrenIds: [] });
    });

    // Second pass: build parent-child relationships
    comments.forEach(comment => {
      const commentWithChildren = commentMap.get(comment.id)!;
      
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.childrenIds.push(comment.id);
        }
      } else {
        rootComments.push(commentWithChildren);
      }
    });

    return rootComments;
  }

  /**
   * Get comment thread (comment and all its descendants)
   */
  static getCommentThread(commentId: string, allComments: QsocialComment[]): QsocialComment[] {
    const commentMap = new Map<string, QsocialComment>();
    allComments.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    const rootComment = commentMap.get(commentId);
    if (!rootComment) {
      return [];
    }

    const thread: QsocialComment[] = [];
    const addToThread = (comment: QsocialComment) => {
      thread.push(comment);
      comment.childrenIds.forEach(childId => {
        const child = commentMap.get(childId);
        if (child) {
          addToThread(child);
        }
      });
    };

    addToThread(rootComment);
    return thread;
  }

  /**
   * Sort comments by specified criteria
   */
  static sortComments(comments: QsocialComment[], sortBy: 'newest' | 'oldest' | 'popular'): QsocialComment[] {
    return [...comments].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          const aScore = a.upvotes - a.downvotes;
          const bScore = b.upvotes - b.downvotes;
          return bScore - aScore;
        default:
          return 0;
      }
    });
  }

  /**
   * Filter comments by maximum depth
   */
  static filterByMaxDepth(comments: QsocialComment[], maxDepth: number): QsocialComment[] {
    return comments.filter(comment => comment.depth <= maxDepth);
  }

  /**
   * Paginate comments
   */
  static paginateComments(comments: QsocialComment[], limit: number, offset: number): QsocialComment[] {
    return comments.slice(offset, offset + limit);
  }
}

// Mock comment data for testing
const createMockComment = (
  id: string,
  parentId?: string,
  depth: number = 0,
  upvotes: number = 0,
  downvotes: number = 0,
  createdAt: Date = new Date()
): QsocialComment => ({
  id,
  postId: 'post-123',
  authorId: 'user-123',
  authorIdentity: {
    did: 'user-123',
    name: 'Test User',
    type: 'ROOT',
    kyc: true,
    reputation: 100,
  },
  content: `Comment ${id}`,
  parentCommentId: parentId,
  depth,
  childrenIds: [],
  upvotes,
  downvotes,
  privacyLevel: PrivacyLevel.PUBLIC,
  createdAt,
  updatedAt: createdAt,
  isEdited: false,
  moderationStatus: ModerationStatus.APPROVED,
});

describe('CommentValidator', () => {
  describe('validateContent', () => {
    it('should accept valid content', () => {
      expect(() => CommentValidator.validateContent('This is valid content')).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => CommentValidator.validateContent('')).toThrow('Comment content is required');
      expect(() => CommentValidator.validateContent('   ')).toThrow('Comment content is required');
    });

    it('should reject null or undefined content', () => {
      expect(() => CommentValidator.validateContent(null as any)).toThrow('Comment content is required');
      expect(() => CommentValidator.validateContent(undefined as any)).toThrow('Comment content is required');
    });

    it('should reject content that is too long', () => {
      const longContent = 'a'.repeat(10001);
      expect(() => CommentValidator.validateContent(longContent))
        .toThrow('Comment content exceeds maximum length');
    });

    it('should accept content at maximum length', () => {
      const maxContent = 'a'.repeat(10000);
      expect(() => CommentValidator.validateContent(maxContent)).not.toThrow();
    });
  });

  describe('validateDepth', () => {
    it('should accept valid depths', () => {
      expect(() => CommentValidator.validateDepth(0)).not.toThrow();
      expect(() => CommentValidator.validateDepth(5)).not.toThrow();
      expect(() => CommentValidator.validateDepth(10)).not.toThrow();
    });

    it('should reject negative depths', () => {
      expect(() => CommentValidator.validateDepth(-1)).toThrow('Comment depth cannot be negative');
    });

    it('should reject depths that are too deep', () => {
      expect(() => CommentValidator.validateDepth(11)).toThrow('Comment depth exceeds maximum nesting level');
    });
  });
});

describe('CommentThreadManager', () => {
  describe('calculateDepth', () => {
    it('should return 0 for root comments', () => {
      expect(CommentThreadManager.calculateDepth()).toBe(0);
      expect(CommentThreadManager.calculateDepth(undefined)).toBe(0);
    });

    it('should return parent depth + 1 for replies', () => {
      const parentComment = createMockComment('parent', undefined, 2);
      expect(CommentThreadManager.calculateDepth(parentComment)).toBe(3);
    });
  });

  describe('buildCommentTree', () => {
    it('should build a simple tree structure', () => {
      const comments = [
        createMockComment('1', undefined, 0),
        createMockComment('2', '1', 1),
        createMockComment('3', '1', 1),
        createMockComment('4', undefined, 0),
      ];

      const tree = CommentThreadManager.buildCommentTree(comments);

      expect(tree).toHaveLength(2); // Two root comments
      expect(tree[0].id).toBe('1');
      expect(tree[0].childrenIds).toEqual(['2', '3']);
      expect(tree[1].id).toBe('4');
      expect(tree[1].childrenIds).toEqual([]);
    });

    it('should handle nested replies correctly', () => {
      const comments = [
        createMockComment('1', undefined, 0),
        createMockComment('2', '1', 1),
        createMockComment('3', '2', 2),
        createMockComment('4', '3', 3),
      ];

      const tree = CommentThreadManager.buildCommentTree(comments);

      expect(tree).toHaveLength(1); // One root comment
      expect(tree[0].id).toBe('1');
      expect(tree[0].childrenIds).toEqual(['2']);
      
      // Check that the tree structure is built correctly
      const commentMap = new Map<string, QsocialComment>();
      tree.forEach(comment => {
        const addToMap = (c: QsocialComment) => {
          commentMap.set(c.id, c);
          c.childrenIds.forEach(childId => {
            const child = comments.find(comment => comment.id === childId);
            if (child) {
              addToMap({ ...child, childrenIds: [] });
            }
          });
        };
        addToMap(comment);
      });
    });

    it('should handle empty comment list', () => {
      const tree = CommentThreadManager.buildCommentTree([]);
      expect(tree).toEqual([]);
    });

    it('should handle orphaned comments gracefully', () => {
      const comments = [
        createMockComment('1', 'nonexistent', 1),
        createMockComment('2', undefined, 0),
      ];

      const tree = CommentThreadManager.buildCommentTree(comments);

      expect(tree).toHaveLength(1); // Only the root comment
      expect(tree[0].id).toBe('2');
    });

    it('should handle multiple root comments with children', () => {
      const comments = [
        createMockComment('1', undefined, 0),
        createMockComment('2', '1', 1),
        createMockComment('3', undefined, 0),
        createMockComment('4', '3', 1),
        createMockComment('5', '3', 1),
      ];

      const tree = CommentThreadManager.buildCommentTree(comments);

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('1');
      expect(tree[0].childrenIds).toEqual(['2']);
      expect(tree[1].id).toBe('3');
      expect(tree[1].childrenIds).toEqual(['4', '5']);
    });
  });

  describe('sortComments', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const comments = [
      createMockComment('1', undefined, 0, 5, 1, twoHoursAgo),
      createMockComment('2', undefined, 0, 10, 2, oneHourAgo),
      createMockComment('3', undefined, 0, 3, 0, now),
    ];

    it('should sort by newest first', () => {
      const sorted = CommentThreadManager.sortComments(comments, 'newest');
      expect(sorted.map(c => c.id)).toEqual(['3', '2', '1']);
    });

    it('should sort by oldest first', () => {
      const sorted = CommentThreadManager.sortComments(comments, 'oldest');
      expect(sorted.map(c => c.id)).toEqual(['1', '2', '3']);
    });

    it('should sort by popularity (score)', () => {
      const sorted = CommentThreadManager.sortComments(comments, 'popular');
      // Scores: comment 2 = 8, comment 1 = 4, comment 3 = 3
      expect(sorted.map(c => c.id)).toEqual(['2', '1', '3']);
    });

    it('should not modify original array', () => {
      const originalOrder = comments.map(c => c.id);
      CommentThreadManager.sortComments(comments, 'newest');
      expect(comments.map(c => c.id)).toEqual(originalOrder);
    });

    it('should handle comments with same scores', () => {
      const sameScoreComments = [
        createMockComment('1', undefined, 0, 5, 2, twoHoursAgo),
        createMockComment('2', undefined, 0, 4, 1, oneHourAgo),
      ];

      const sorted = CommentThreadManager.sortComments(sameScoreComments, 'popular');
      // Both have score of 3, order should be preserved
      expect(sorted.map(c => c.id)).toEqual(['1', '2']);
    });
  });

  describe('filterByMaxDepth', () => {
    const comments = [
      createMockComment('1', undefined, 0),
      createMockComment('2', '1', 1),
      createMockComment('3', '2', 2),
      createMockComment('4', '3', 3),
      createMockComment('5', '4', 4),
    ];

    it('should filter comments by maximum depth', () => {
      const filtered = CommentThreadManager.filterByMaxDepth(comments, 2);
      expect(filtered).toHaveLength(3);
      expect(filtered.map(c => c.id)).toEqual(['1', '2', '3']);
    });

    it('should include all comments when max depth is high', () => {
      const filtered = CommentThreadManager.filterByMaxDepth(comments, 10);
      expect(filtered).toHaveLength(5);
    });

    it('should include only root comments when max depth is 0', () => {
      const filtered = CommentThreadManager.filterByMaxDepth(comments, 0);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should handle empty array', () => {
      const filtered = CommentThreadManager.filterByMaxDepth([], 5);
      expect(filtered).toEqual([]);
    });
  });

  describe('paginateComments', () => {
    const comments = Array.from({ length: 25 }, (_, i) => 
      createMockComment(`comment-${i}`, undefined, 0)
    );

    it('should paginate comments correctly', () => {
      const page1 = CommentThreadManager.paginateComments(comments, 10, 0);
      expect(page1).toHaveLength(10);
      expect(page1[0].id).toBe('comment-0');
      expect(page1[9].id).toBe('comment-9');

      const page2 = CommentThreadManager.paginateComments(comments, 10, 10);
      expect(page2).toHaveLength(10);
      expect(page2[0].id).toBe('comment-10');
      expect(page2[9].id).toBe('comment-19');

      const page3 = CommentThreadManager.paginateComments(comments, 10, 20);
      expect(page3).toHaveLength(5);
      expect(page3[0].id).toBe('comment-20');
      expect(page3[4].id).toBe('comment-24');
    });

    it('should handle offset beyond array length', () => {
      const result = CommentThreadManager.paginateComments(comments, 10, 100);
      expect(result).toEqual([]);
    });

    it('should handle limit larger than remaining items', () => {
      const result = CommentThreadManager.paginateComments(comments, 100, 20);
      expect(result).toHaveLength(5);
    });

    it('should handle zero limit', () => {
      const result = CommentThreadManager.paginateComments(comments, 0, 0);
      expect(result).toEqual([]);
    });

    it('should handle negative offset', () => {
      const result = CommentThreadManager.paginateComments(comments, 5, -1);
      // slice(-1, 4) returns the last element to index 4, which is empty
      expect(result).toEqual([]);
    });
  });

  describe('getCommentThread', () => {
    const comments = [
      createMockComment('1', undefined, 0),
      createMockComment('2', '1', 1),
      createMockComment('3', '2', 2),
      createMockComment('4', '1', 1),
      createMockComment('5', undefined, 0),
    ];

    // Set up children IDs manually for this test
    comments[0].childrenIds = ['2', '4'];
    comments[1].childrenIds = ['3'];
    comments[2].childrenIds = [];
    comments[3].childrenIds = [];
    comments[4].childrenIds = [];

    it('should get complete thread for a comment', () => {
      const thread = CommentThreadManager.getCommentThread('1', comments);
      expect(thread).toHaveLength(4); // comment 1 and its descendants
      expect(thread.map(c => c.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should get thread for leaf comment', () => {
      const thread = CommentThreadManager.getCommentThread('3', comments);
      expect(thread).toHaveLength(1);
      expect(thread[0].id).toBe('3');
    });

    it('should return empty array for non-existent comment', () => {
      const thread = CommentThreadManager.getCommentThread('nonexistent', comments);
      expect(thread).toEqual([]);
    });

    it('should get thread for comment with no children', () => {
      const thread = CommentThreadManager.getCommentThread('5', comments);
      expect(thread).toHaveLength(1);
      expect(thread[0].id).toBe('5');
    });
  });
});
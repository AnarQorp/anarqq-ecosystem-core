import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubcommunityService, SubcommunitySanitizer, SubcommunityValidator } from '../SubcommunityService';
import { SubcommunityService as SubcommunityAPI } from '../../../api/qsocial';
import { getActiveIdentity } from '../../../state/identity';
import type { 
  Subcommunity, 
  CreateSubcommunityRequest, 
  UpdateSubcommunityRequest,
  User,
  GovernanceRule
} from '../../../types/qsocial';

// Mock dependencies
vi.mock('../../../api/qsocial');
vi.mock('../../../state/identity');

const mockSubcommunityAPI = vi.mocked(SubcommunityAPI);
const mockGetActiveIdentity = vi.mocked(getActiveIdentity);

describe('SubcommunitySanitizer', () => {
  describe('sanitizeName', () => {
    it('should sanitize name to be URL-safe', () => {
      expect(SubcommunitySanitizer.sanitizeName('Test Community!')).toBe('testcommunity');
      expect(SubcommunitySanitizer.sanitizeName('  My-Cool_Community  ')).toBe('my-cool_community');
      expect(SubcommunitySanitizer.sanitizeName('Special@#$%Characters')).toBe('specialcharacters');
    });

    it('should limit name length to 50 characters', () => {
      const longName = 'a'.repeat(100);
      expect(SubcommunitySanitizer.sanitizeName(longName)).toHaveLength(50);
    });
  });

  describe('sanitizeDisplayName', () => {
    it('should remove control characters and trim', () => {
      expect(SubcommunitySanitizer.sanitizeDisplayName('  Test Community  ')).toBe('Test Community');
      expect(SubcommunitySanitizer.sanitizeDisplayName('Test\x00Community')).toBe('TestCommunity');
    });

    it('should limit display name length to 100 characters', () => {
      const longName = 'a'.repeat(200);
      expect(SubcommunitySanitizer.sanitizeDisplayName(longName)).toHaveLength(100);
    });
  });

  describe('sanitizeDescription', () => {
    it('should remove dangerous HTML content', () => {
      const maliciousHtml = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = SubcommunitySanitizer.sanitizeDescription(maliciousHtml);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should remove javascript: URLs', () => {
      const maliciousContent = 'Click <a href="javascript:alert()">here</a>';
      const sanitized = SubcommunitySanitizer.sanitizeDescription(maliciousContent);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should limit description length to 1000 characters', () => {
      const longDescription = 'a'.repeat(2000);
      expect(SubcommunitySanitizer.sanitizeDescription(longDescription)).toHaveLength(1000);
    });
  });

  describe('sanitizeRules', () => {
    it('should filter empty rules and limit to 20', () => {
      const rules = ['Rule 1', '', '  ', 'Rule 2', ...Array(25).fill('Rule')];
      const sanitized = SubcommunitySanitizer.sanitizeRules(rules);
      expect(sanitized).toHaveLength(20);
      expect(sanitized).not.toContain('');
    });

    it('should limit each rule to 500 characters', () => {
      const longRule = 'a'.repeat(1000);
      const sanitized = SubcommunitySanitizer.sanitizeRules([longRule]);
      expect(sanitized[0]).toHaveLength(500);
    });
  });

  describe('sanitizeAllowedContentTypes', () => {
    it('should only allow valid content types', () => {
      const types = ['text', 'invalid', 'link', 'malicious', 'media'];
      const sanitized = SubcommunitySanitizer.sanitizeAllowedContentTypes(types);
      expect(sanitized).toEqual(['text', 'link', 'media']);
    });

    it('should limit to 4 types maximum', () => {
      const types = ['text', 'link', 'media', 'cross-post', 'extra'];
      const sanitized = SubcommunitySanitizer.sanitizeAllowedContentTypes(types);
      expect(sanitized).toHaveLength(4);
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid URLs', () => {
      expect(SubcommunitySanitizer.sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(SubcommunitySanitizer.sanitizeUrl('http://test.org/path')).toBe('http://test.org/path');
    });

    it('should reject invalid protocols', () => {
      expect(() => SubcommunitySanitizer.sanitizeUrl('ftp://example.com')).toThrow('Invalid protocol');
      expect(() => SubcommunitySanitizer.sanitizeUrl('javascript://alert()')).toThrow('Invalid protocol');
    });

    it('should reject malformed URLs', () => {
      expect(() => SubcommunitySanitizer.sanitizeUrl('not-a-url')).toThrow('Invalid URL format');
      expect(() => SubcommunitySanitizer.sanitizeUrl('')).toThrow('Invalid URL format');
    });
  });
});

describe('SubcommunityValidator', () => {
  describe('validateName', () => {
    it('should accept valid names', () => {
      expect(() => SubcommunityValidator.validateName('test-community')).not.toThrow();
      expect(() => SubcommunityValidator.validateName('my_cool_community')).not.toThrow();
      expect(() => SubcommunityValidator.validateName('community123')).not.toThrow();
    });

    it('should reject invalid names', () => {
      expect(() => SubcommunityValidator.validateName('')).toThrow('Subcommunity name is required');
      expect(() => SubcommunityValidator.validateName('ab')).toThrow('must be at least 3 characters');
      expect(() => SubcommunityValidator.validateName('a'.repeat(51))).toThrow('must be less than 50 characters');
      expect(() => SubcommunityValidator.validateName('test@community')).toThrow('can only contain letters');
    });

    it('should reject reserved names', () => {
      expect(() => SubcommunityValidator.validateName('admin')).toThrow('reserved');
      expect(() => SubcommunityValidator.validateName('qsocial')).toThrow('reserved');
      expect(() => SubcommunityValidator.validateName('api')).toThrow('reserved');
    });
  });

  describe('validateDisplayName', () => {
    it('should accept valid display names', () => {
      expect(() => SubcommunityValidator.validateDisplayName('Test Community')).not.toThrow();
    });

    it('should reject invalid display names', () => {
      expect(() => SubcommunityValidator.validateDisplayName('')).toThrow('Display name is required');
      expect(() => SubcommunityValidator.validateDisplayName('a'.repeat(101))).toThrow('must be less than 100 characters');
    });
  });

  describe('validateMinimumQarma', () => {
    it('should accept valid Qarma values', () => {
      expect(() => SubcommunityValidator.validateMinimumQarma(0)).not.toThrow();
      expect(() => SubcommunityValidator.validateMinimumQarma(100)).not.toThrow();
      expect(() => SubcommunityValidator.validateMinimumQarma(10000)).not.toThrow();
    });

    it('should reject invalid Qarma values', () => {
      expect(() => SubcommunityValidator.validateMinimumQarma(-1)).toThrow('must be non-negative');
      expect(() => SubcommunityValidator.validateMinimumQarma(10001)).toThrow('too high');
    });
  });

  describe('validateGovernanceRules', () => {
    const validRule: GovernanceRule = {
      id: 'rule1',
      type: 'voting',
      description: 'Test rule',
      parameters: {},
      isActive: true
    };

    it('should accept valid governance rules', () => {
      expect(() => SubcommunityValidator.validateGovernanceRules([validRule])).not.toThrow();
    });

    it('should reject too many rules', () => {
      const manyRules = Array(51).fill(validRule);
      expect(() => SubcommunityValidator.validateGovernanceRules(manyRules)).toThrow('Too many governance rules');
    });

    it('should reject rules without ID', () => {
      const invalidRule = { ...validRule, id: '' };
      expect(() => SubcommunityValidator.validateGovernanceRules([invalidRule])).toThrow('must have an ID');
    });

    it('should reject rules without description', () => {
      const invalidRule = { ...validRule, description: '' };
      expect(() => SubcommunityValidator.validateGovernanceRules([invalidRule])).toThrow('must have a description');
    });

    it('should reject rules with invalid type', () => {
      const invalidRule = { ...validRule, type: 'invalid' as any };
      expect(() => SubcommunityValidator.validateGovernanceRules([invalidRule])).toThrow('Invalid governance rule type');
    });
  });
});

describe('SubcommunityService', () => {
  const mockIdentity = {
    did: 'test-user-did',
    name: 'Test User',
    type: 'ROOT' as const,
    kyc: true,
    reputation: 100
  };

  const mockSubcommunity: Subcommunity = {
    id: 'test-community',
    name: 'test-community',
    displayName: 'Test Community',
    description: 'A test community',
    creatorId: 'test-user-did',
    moderators: ['test-user-did'],
    daoAddress: undefined,
    governanceRules: [],
    isPrivate: false,
    requiresApproval: false,
    minimumQarma: 0,
    allowedContentTypes: ['text', 'link'],
    memberCount: 10,
    postCount: 5,
    createdAt: new Date(),
    avatar: undefined,
    banner: undefined,
    rules: ['Be respectful'],
    ipfsHash: undefined
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveIdentity.mockReturnValue(mockIdentity);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSubcommunity', () => {
    const validRequest: CreateSubcommunityRequest = {
      name: 'test-community',
      displayName: 'Test Community',
      description: 'A test community',
      isPrivate: false,
      requiresApproval: false,
      minimumQarma: 0,
      allowedContentTypes: ['text', 'link'],
      rules: ['Be respectful']
    };

    it('should create subcommunity successfully', async () => {
      mockSubcommunityAPI.createSubcommunity.mockResolvedValue(mockSubcommunity);

      const result = await SubcommunityService.createSubcommunity(validRequest);

      expect(result).toEqual(mockSubcommunity);
      expect(mockSubcommunityAPI.createSubcommunity).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-community',
          displayName: 'Test Community',
          description: 'A test community'
        })
      );
    });

    it('should sanitize input data', async () => {
      const unsanitizedRequest: CreateSubcommunityRequest = {
        name: 'Test-Community_123',
        displayName: '  Test Community  ',
        description: '<script>alert("xss")</script>Safe content',
        rules: ['  Rule 1  ', '', 'Rule 2']
      };

      mockSubcommunityAPI.createSubcommunity.mockResolvedValue(mockSubcommunity);

      await SubcommunityService.createSubcommunity(unsanitizedRequest);

      expect(mockSubcommunityAPI.createSubcommunity).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-community_123',
          displayName: 'Test Community',
          description: expect.not.stringContaining('<script>'),
          rules: ['Rule 1', 'Rule 2']
        })
      );
    });

    it('should throw error for invalid input', async () => {
      const invalidRequest = {
        name: 'ab', // Too short
        displayName: 'Test',
        description: 'Test'
      };

      await expect(SubcommunityService.createSubcommunity(invalidRequest as any))
        .rejects.toThrow('must be at least 3 characters');
    });

    it('should throw error when not authenticated', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(SubcommunityService.createSubcommunity(validRequest))
        .rejects.toThrow('Authentication required');
    });

    it('should handle API errors', async () => {
      mockSubcommunityAPI.createSubcommunity.mockRejectedValue(new Error('API Error'));

      await expect(SubcommunityService.createSubcommunity(validRequest))
        .rejects.toThrow('Failed to create subcommunity');
    });
  });

  describe('getSubcommunity', () => {
    it('should get subcommunity successfully', async () => {
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(mockSubcommunity);

      const result = await SubcommunityService.getSubcommunity('test-community');

      expect(result).toEqual(mockSubcommunity);
      expect(mockSubcommunityAPI.getSubcommunity).toHaveBeenCalledWith('test-community');
    });

    it('should throw error for empty ID', async () => {
      await expect(SubcommunityService.getSubcommunity(''))
        .rejects.toThrow('Subcommunity ID is required');
    });

    it('should handle API errors', async () => {
      mockSubcommunityAPI.getSubcommunity.mockRejectedValue(new Error('Not found'));

      await expect(SubcommunityService.getSubcommunity('test-community'))
        .rejects.toThrow('Failed to retrieve subcommunity');
    });
  });

  describe('updateSubcommunity', () => {
    const validUpdate: UpdateSubcommunityRequest = {
      displayName: 'Updated Community',
      description: 'Updated description'
    };

    it('should update subcommunity successfully', async () => {
      const updatedSubcommunity = { ...mockSubcommunity, ...validUpdate };
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(mockSubcommunity);
      mockSubcommunityAPI.updateSubcommunity.mockResolvedValue(updatedSubcommunity);

      const result = await SubcommunityService.updateSubcommunity('test-community', validUpdate);

      expect(result).toEqual(updatedSubcommunity);
      expect(mockSubcommunityAPI.updateSubcommunity).toHaveBeenCalledWith('test-community', validUpdate);
    });

    it('should check permissions before updating', async () => {
      const otherUserSubcommunity = { ...mockSubcommunity, creatorId: 'other-user', moderators: [] };
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(otherUserSubcommunity);

      await expect(SubcommunityService.updateSubcommunity('test-community', validUpdate))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should allow moderators to update', async () => {
      const moderatedSubcommunity = { 
        ...mockSubcommunity, 
        creatorId: 'other-user', 
        moderators: ['test-user-did'] 
      };
      const updatedSubcommunity = { ...moderatedSubcommunity, ...validUpdate };
      
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(moderatedSubcommunity);
      mockSubcommunityAPI.updateSubcommunity.mockResolvedValue(updatedSubcommunity);

      const result = await SubcommunityService.updateSubcommunity('test-community', validUpdate);

      expect(result).toEqual(updatedSubcommunity);
    });
  });

  describe('deleteSubcommunity', () => {
    it('should delete subcommunity successfully', async () => {
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(mockSubcommunity);
      mockSubcommunityAPI.deleteSubcommunity.mockResolvedValue();

      await SubcommunityService.deleteSubcommunity('test-community');

      expect(mockSubcommunityAPI.deleteSubcommunity).toHaveBeenCalledWith('test-community');
    });

    it('should check permissions before deleting', async () => {
      const otherUserSubcommunity = { ...mockSubcommunity, creatorId: 'other-user', moderators: [] };
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(otherUserSubcommunity);

      await expect(SubcommunityService.deleteSubcommunity('test-community'))
        .rejects.toThrow('Insufficient permissions');
    });
  });

  describe('joinSubcommunity', () => {
    it('should join subcommunity successfully', async () => {
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(mockSubcommunity);
      mockSubcommunityAPI.joinSubcommunity.mockResolvedValue();

      await SubcommunityService.joinSubcommunity('test-community');

      expect(mockSubcommunityAPI.joinSubcommunity).toHaveBeenCalledWith('test-community');
    });

    it('should require authentication', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(SubcommunityService.joinSubcommunity('test-community'))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('leaveSubcommunity', () => {
    it('should leave subcommunity successfully', async () => {
      mockSubcommunityAPI.leaveSubcommunity.mockResolvedValue();

      await SubcommunityService.leaveSubcommunity('test-community');

      expect(mockSubcommunityAPI.leaveSubcommunity).toHaveBeenCalledWith('test-community');
    });

    it('should require authentication', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(SubcommunityService.leaveSubcommunity('test-community'))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('searchSubcommunities', () => {
    it('should search subcommunities successfully', async () => {
      const searchResults = [mockSubcommunity];
      mockSubcommunityAPI.searchSubcommunities.mockResolvedValue(searchResults);

      const result = await SubcommunityService.searchSubcommunities('test');

      expect(result).toEqual(searchResults);
      expect(mockSubcommunityAPI.searchSubcommunities).toHaveBeenCalledWith('test');
    });

    it('should sanitize search query', async () => {
      const longQuery = 'a'.repeat(200);
      mockSubcommunityAPI.searchSubcommunities.mockResolvedValue([]);

      await SubcommunityService.searchSubcommunities(longQuery);

      expect(mockSubcommunityAPI.searchSubcommunities).toHaveBeenCalledWith('a'.repeat(100));
    });

    it('should throw error for empty query', async () => {
      await expect(SubcommunityService.searchSubcommunities(''))
        .rejects.toThrow('Search query is required');
    });
  });

  describe('getTrendingSubcommunities', () => {
    it('should get trending subcommunities successfully', async () => {
      const trendingResults = [mockSubcommunity];
      mockSubcommunityAPI.getTrendingSubcommunities.mockResolvedValue(trendingResults);

      const result = await SubcommunityService.getTrendingSubcommunities();

      expect(result).toEqual(trendingResults);
      expect(mockSubcommunityAPI.getTrendingSubcommunities).toHaveBeenCalled();
    });
  });

  describe('permission checks', () => {
    it('should correctly identify edit permissions', async () => {
      // Creator can edit
      expect(await SubcommunityService.canEditSubcommunity(mockSubcommunity)).toBe(true);

      // Moderator can edit
      const moderatedSubcommunity = { 
        ...mockSubcommunity, 
        creatorId: 'other-user', 
        moderators: ['test-user-did'] 
      };
      expect(await SubcommunityService.canEditSubcommunity(moderatedSubcommunity)).toBe(true);

      // Other users cannot edit
      const otherSubcommunity = { 
        ...mockSubcommunity, 
        creatorId: 'other-user', 
        moderators: [] 
      };
      expect(await SubcommunityService.canEditSubcommunity(otherSubcommunity)).toBe(false);
    });

    it('should correctly identify delete permissions', async () => {
      // Creator can delete
      expect(await SubcommunityService.canDeleteSubcommunity(mockSubcommunity)).toBe(true);

      // Others cannot delete (for now)
      const otherSubcommunity = { 
        ...mockSubcommunity, 
        creatorId: 'other-user', 
        moderators: ['test-user-did'] 
      };
      expect(await SubcommunityService.canDeleteSubcommunity(otherSubcommunity)).toBe(false);
    });

    it('should correctly identify moderation permissions', async () => {
      // Creator can moderate
      expect(await SubcommunityService.canModerateSubcommunity(mockSubcommunity)).toBe(true);

      // Moderator can moderate
      const moderatedSubcommunity = { 
        ...mockSubcommunity, 
        creatorId: 'other-user', 
        moderators: ['test-user-did'] 
      };
      expect(await SubcommunityService.canModerateSubcommunity(moderatedSubcommunity)).toBe(true);

      // Other users cannot moderate
      const otherSubcommunity = { 
        ...mockSubcommunity, 
        creatorId: 'other-user', 
        moderators: [] 
      };
      expect(await SubcommunityService.canModerateSubcommunity(otherSubcommunity)).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should calculate subcommunity statistics', () => {
      const stats = SubcommunityService.getSubcommunityStatistics(mockSubcommunity);

      expect(stats).toEqual({
        memberCount: 10,
        postCount: 5,
        growthRate: 0.5,
        isActive: false, // postCount <= 10 and memberCount <= 5
        isPopular: false, // memberCount <= 100
        isTrending: false, // growthRate >= 0.5 but memberCount <= 20
        moderatorCount: 1,
        ruleCount: 1,
        hasGovernance: false,
        isPrivate: false,
        requiresApproval: false
      });
    });

    it('should format subcommunity for display', () => {
      const formatted = SubcommunityService.formatSubcommunityForDisplay(mockSubcommunity);

      expect(formatted).toHaveProperty('stats');
      expect(formatted).toHaveProperty('formattedCreatedAt');
      expect(formatted).toHaveProperty('canEdit', false);
      expect(formatted).toHaveProperty('canDelete', false);
      expect(formatted).toHaveProperty('canModerate', false);
      expect(formatted).toHaveProperty('membershipStatus', 'unknown');
    });

    it('should check name availability', async () => {
      // Name is taken
      mockSubcommunityAPI.getSubcommunity.mockResolvedValue(mockSubcommunity);
      expect(await SubcommunityService.isNameAvailable('test-community')).toBe(false);

      // Name is available (API throws error)
      mockSubcommunityAPI.getSubcommunity.mockRejectedValue(new Error('Not found'));
      expect(await SubcommunityService.isNameAvailable('available-name')).toBe(true);

      // Empty name is not available
      expect(await SubcommunityService.isNameAvailable('')).toBe(false);
    });
  });
});
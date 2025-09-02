/**
 * Identity Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityService } from '../../src/services/IdentityService';
import { StorageService } from '../../src/services/StorageService';
import { EventService } from '../../src/services/EventService';
import {
  IdentityType,
  IdentityStatus,
  VerificationLevel,
  CreateIdentityRequest,
  CreateSubidentityRequest,
  RequestContext
} from '../../src/types';

// Mock services
const mockStorageService = {
  storeIdentity: vi.fn(),
  retrieveIdentity: vi.fn(),
  updateIdentity: vi.fn(),
  deleteIdentity: vi.fn(),
  findIdentitiesByParent: vi.fn(),
  findIdentitiesByRoot: vi.fn()
} as any;

const mockEventService = {
  publishEvent: vi.fn()
} as any;

const mockConfig = {
  security: {
    maxSubidentities: 10
  }
};

describe('IdentityService', () => {
  let identityService: IdentityService;
  let mockContext: RequestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    identityService = new IdentityService(mockStorageService, mockEventService, mockConfig);
    
    mockContext = {
      requestId: 'test-request-123',
      timestamp: new Date(),
      ip: '127.0.0.1',
      userAgent: 'Test Agent',
      sessionId: 'test-session-123'
    };
  });

  describe('createIdentity', () => {
    it('should create a new root identity successfully', async () => {
      const request: CreateIdentityRequest = {
        name: 'Test Identity',
        description: 'Test description'
      };

      mockStorageService.storeIdentity.mockResolvedValue('identity-123');

      const result = await identityService.createIdentity(request, mockContext);

      expect(result).toMatchObject({
        name: 'Test Identity',
        type: IdentityType.ROOT,
        status: IdentityStatus.ACTIVE,
        verificationLevel: VerificationLevel.UNVERIFIED,
        reputation: 100,
        depth: 0
      });

      expect(result.did).toBeDefined();
      expect(result.rootId).toBe(result.did);
      expect(result.path).toEqual([result.did]);
      expect(result.children).toEqual([]);

      expect(mockStorageService.storeIdentity).toHaveBeenCalledWith(result);
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'identity.created',
          data: expect.objectContaining({
            identity: result
          })
        })
      );
    });

    it('should handle storage errors gracefully', async () => {
      const request: CreateIdentityRequest = {
        name: 'Test Identity'
      };

      mockStorageService.storeIdentity.mockRejectedValue(new Error('Storage error'));

      await expect(identityService.createIdentity(request, mockContext))
        .rejects.toThrow('Storage error');
    });
  });

  describe('createSubidentity', () => {
    const mockParent = {
      did: 'parent-123',
      name: 'Parent Identity',
      type: IdentityType.ROOT,
      rootId: 'parent-123',
      children: [],
      depth: 0,
      path: ['parent-123'],
      verificationLevel: VerificationLevel.ENHANCED,
      reputation: 750,
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockStorageService.retrieveIdentity.mockResolvedValue(mockParent);
      mockStorageService.storeIdentity.mockResolvedValue('sub-123');
      mockStorageService.updateIdentity.mockResolvedValue({
        ...mockParent,
        children: ['sub-123']
      });
    });

    it('should create a subidentity successfully', async () => {
      const request: CreateSubidentityRequest = {
        name: 'Test Subidentity',
        type: IdentityType.DAO,
        purpose: 'DAO governance'
      };

      const result = await identityService.createSubidentity('parent-123', request, mockContext);

      expect(result).toMatchObject({
        name: 'Test Subidentity',
        type: IdentityType.DAO,
        parentId: 'parent-123',
        rootId: 'parent-123',
        depth: 1,
        status: IdentityStatus.ACTIVE,
        verificationLevel: VerificationLevel.UNVERIFIED
      });

      expect(result.path).toEqual(['parent-123', result.did]);
      expect(result.reputation).toBe(600); // 80% of parent's 750

      expect(mockStorageService.storeIdentity).toHaveBeenCalledWith(result);
      expect(mockStorageService.updateIdentity).toHaveBeenCalledWith(
        'parent-123',
        expect.objectContaining({
          children: ['sub-123']
        })
      );
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subidentity.created'
        })
      );
    });

    it('should reject subidentity creation for unverified parent', async () => {
      const unverifiedParent = {
        ...mockParent,
        verificationLevel: VerificationLevel.UNVERIFIED
      };
      mockStorageService.retrieveIdentity.mockResolvedValue(unverifiedParent);

      const request: CreateSubidentityRequest = {
        name: 'Test Subidentity',
        type: IdentityType.DAO
      };

      await expect(identityService.createSubidentity('parent-123', request, mockContext))
        .rejects.toThrow('Parent identity must be a verified ROOT identity');
    });

    it('should reject subidentity creation when limit reached', async () => {
      const parentWithMaxChildren = {
        ...mockParent,
        children: Array.from({ length: 10 }, (_, i) => `child-${i}`)
      };
      mockStorageService.retrieveIdentity.mockResolvedValue(parentWithMaxChildren);

      const request: CreateSubidentityRequest = {
        name: 'Test Subidentity',
        type: IdentityType.DAO
      };

      await expect(identityService.createSubidentity('parent-123', request, mockContext))
        .rejects.toThrow('Maximum number of subidentities (10) reached');
    });

    it('should reject invalid subidentity types', async () => {
      const request: CreateSubidentityRequest = {
        name: 'Test Subidentity',
        type: IdentityType.ROOT // ROOT type not allowed for subidentities
      };

      await expect(identityService.createSubidentity('parent-123', request, mockContext))
        .rejects.toThrow('Invalid subidentity type');
    });
  });

  describe('getIdentity', () => {
    it('should retrieve identity successfully', async () => {
      const mockIdentity = {
        did: 'identity-123',
        name: 'Test Identity'
      };
      mockStorageService.retrieveIdentity.mockResolvedValue(mockIdentity);

      const result = await identityService.getIdentity('identity-123');

      expect(result).toBe(mockIdentity);
      expect(mockStorageService.retrieveIdentity).toHaveBeenCalledWith('identity-123');
    });

    it('should return null for non-existent identity', async () => {
      mockStorageService.retrieveIdentity.mockResolvedValue(null);

      const result = await identityService.getIdentity('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateReputation', () => {
    const mockIdentity = {
      did: 'identity-123',
      reputation: 500,
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockStorageService.retrieveIdentity.mockResolvedValue(mockIdentity);
      mockStorageService.updateIdentity.mockResolvedValue({
        ...mockIdentity,
        reputation: 550
      });
    });

    it('should update reputation successfully', async () => {
      const update = {
        identityId: 'identity-123',
        delta: 50,
        reason: 'positive_interaction',
        module: 'qmail',
        action: 'message_sent'
      };

      const result = await identityService.updateReputation(update);

      expect(result.reputation).toBe(550);
      expect(mockStorageService.updateIdentity).toHaveBeenCalledWith(
        'identity-123',
        expect.objectContaining({
          reputation: 550
        })
      );
      expect(mockEventService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reputation.updated',
          data: expect.objectContaining({
            identityId: 'identity-123',
            previousScore: 500,
            newScore: 550,
            delta: 50,
            reason: 'positive_interaction'
          })
        })
      );
    });

    it('should enforce reputation bounds', async () => {
      // Test upper bound
      const highUpdate = {
        identityId: 'identity-123',
        delta: 600, // Would exceed 1000
        reason: 'test',
        module: 'test',
        action: 'test'
      };

      mockStorageService.updateIdentity.mockResolvedValue({
        ...mockIdentity,
        reputation: 1000
      });

      const highResult = await identityService.updateReputation(highUpdate);
      expect(highResult.reputation).toBe(1000);

      // Test lower bound
      const lowUpdate = {
        identityId: 'identity-123',
        delta: -600, // Would go below 0
        reason: 'test',
        module: 'test',
        action: 'test'
      };

      mockStorageService.updateIdentity.mockResolvedValue({
        ...mockIdentity,
        reputation: 0
      });

      const lowResult = await identityService.updateReputation(lowUpdate);
      expect(lowResult.reputation).toBe(0);
    });
  });

  describe('getReputation', () => {
    it('should return reputation information', async () => {
      const mockIdentity = {
        did: 'identity-123',
        reputation: 750,
        updatedAt: new Date('2024-01-01')
      };
      mockStorageService.retrieveIdentity.mockResolvedValue(mockIdentity);

      const result = await identityService.getReputation('identity-123');

      expect(result).toEqual({
        score: 750,
        level: 'EXPERT',
        lastUpdated: mockIdentity.updatedAt
      });
    });

    it('should return correct reputation levels', async () => {
      const testCases = [
        { reputation: 900, expectedLevel: 'AUTHORITY' },
        { reputation: 700, expectedLevel: 'EXPERT' },
        { reputation: 400, expectedLevel: 'TRUSTED' },
        { reputation: 100, expectedLevel: 'NOVICE' }
      ];

      for (const testCase of testCases) {
        mockStorageService.retrieveIdentity.mockResolvedValue({
          did: 'test',
          reputation: testCase.reputation,
          updatedAt: new Date()
        });

        const result = await identityService.getReputation('test');
        expect(result.level).toBe(testCase.expectedLevel);
      }
    });
  });
});
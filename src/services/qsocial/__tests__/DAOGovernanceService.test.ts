import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  DAOGovernanceService, 
  ProposalType, 
  ProposalStatus, 
  VoteType,
  GovernanceProposal,
  ProposalVote,
  ModerationRole,
  GovernanceConfig
} from '../DAOGovernanceService';
import { SubcommunityService } from '../SubcommunityService';
import { ReputationService } from '../../../api/qsocial';
import { getActiveIdentity } from '../../../state/identity';
import type { Subcommunity, UserReputation, User } from '../../../types/qsocial';

// Mock dependencies
vi.mock('../SubcommunityService');
vi.mock('../../../api/qsocial');
vi.mock('../../../state/identity');

const mockSubcommunityService = vi.mocked(SubcommunityService);
const mockReputationService = vi.mocked(ReputationService);
const mockGetActiveIdentity = vi.mocked(getActiveIdentity);

describe('DAOGovernanceService', () => {
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
    creatorId: 'creator-did',
    moderators: ['mod1-did', 'mod2-did'],
    daoAddress: undefined,
    governanceRules: [],
    isPrivate: false,
    requiresApproval: false,
    minimumQarma: 0,
    allowedContentTypes: ['text', 'link'],
    memberCount: 100,
    postCount: 50,
    createdAt: new Date(),
    avatar: undefined,
    banner: undefined,
    rules: ['Be respectful'],
    ipfsHash: undefined
  };

  const mockUserReputation: UserReputation = {
    userId: 'test-user-did',
    totalQarma: 500,
    postQarma: 300,
    commentQarma: 200,
    subcommunityQarma: {
      'test-community': 500
    },
    badges: [],
    achievements: [],
    moderationLevel: 'none',
    canModerate: [],
    qarmaHistory: [],
    lastUpdated: new Date()
  };

  const mockMembers: User[] = [
    {
      id: 'user1-did',
      did: 'user1-did',
      displayName: 'User 1',
      reputation: { ...mockUserReputation, userId: 'user1-did', totalQarma: 600 }
    },
    {
      id: 'user2-did',
      did: 'user2-did',
      displayName: 'User 2',
      reputation: { ...mockUserReputation, userId: 'user2-did', totalQarma: 1200 }
    },
    {
      id: 'user3-did',
      did: 'user3-did',
      displayName: 'User 3',
      reputation: { ...mockUserReputation, userId: 'user3-did', totalQarma: 2500 }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveIdentity.mockReturnValue(mockIdentity);
    mockSubcommunityService.getSubcommunity.mockResolvedValue(mockSubcommunity);
    mockReputationService.getUserReputation.mockResolvedValue(mockUserReputation);
    mockSubcommunityService.getMembers.mockResolvedValue(mockMembers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProposal', () => {
    it('should create a proposal successfully', async () => {
      const proposal = await DAOGovernanceService.createProposal(
        'test-community',
        ProposalType.ADD_MODERATOR,
        'Add New Moderator',
        'Proposal to add user123 as a moderator',
        { userId: 'user123-did' },
        72
      );

      expect(proposal).toMatchObject({
        subcommunityId: 'test-community',
        proposerId: 'test-user-did',
        type: ProposalType.ADD_MODERATOR,
        title: 'Add New Moderator',
        description: 'Proposal to add user123 as a moderator',
        proposalData: { userId: 'user123-did' },
        status: ProposalStatus.ACTIVE,
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0
      });

      expect(proposal.id).toMatch(/^prop_/);
      expect(proposal.votingEndTime.getTime()).toBeGreaterThan(proposal.votingStartTime.getTime());
    });

    it('should throw error when not authenticated', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(DAOGovernanceService.createProposal(
        'test-community',
        ProposalType.ADD_MODERATOR,
        'Test Proposal',
        'Description',
        { userId: 'user123-did' }
      )).rejects.toThrow('Authentication required');
    });

    it('should throw error when user has insufficient Qarma', async () => {
      const lowQarmaReputation = { ...mockUserReputation, totalQarma: 50 };
      mockReputationService.getUserReputation.mockResolvedValue(lowQarmaReputation);

      await expect(DAOGovernanceService.createProposal(
        'test-community',
        ProposalType.ADD_MODERATOR,
        'Test Proposal',
        'Description',
        { userId: 'user123-did' }
      )).rejects.toThrow('Minimum 100 Qarma required');
    });

    it('should validate proposal data based on type', async () => {
      // Test ADD_MODERATOR without userId
      await expect(DAOGovernanceService.createProposal(
        'test-community',
        ProposalType.ADD_MODERATOR,
        'Test Proposal',
        'Description',
        {}
      )).rejects.toThrow('User ID is required for add moderator proposal');

      // Test UPDATE_RULES without rules array
      await expect(DAOGovernanceService.createProposal(
        'test-community',
        ProposalType.UPDATE_RULES,
        'Test Proposal',
        'Description',
        { rules: 'not an array' }
      )).rejects.toThrow('Rules array is required for update rules proposal');

      // Test BAN_USER without reason
      await expect(DAOGovernanceService.createProposal(
        'test-community',
        ProposalType.BAN_USER,
        'Test Proposal',
        'Description',
        { userId: 'user123-did' }
      )).rejects.toThrow('User ID and reason are required for ban user proposal');
    });
  });

  describe('getGovernanceConfig', () => {
    it('should return default governance configuration', async () => {
      const config = await DAOGovernanceService.getGovernanceConfig('test-community');

      expect(config).toMatchObject({
        subcommunityId: 'test-community',
        defaultVotingDuration: 72,
        minimumQuorum: 0.1,
        passingThreshold: 0.6,
        minimumQarmaToPropose: 100,
        proposalCooldown: 24,
        autoModeratorQarmaThreshold: 500,
        adminQarmaThreshold: 1000,
        superAdminQarmaThreshold: 2000,
        useQarmaWeighting: true,
        maxVotingPowerMultiplier: 3,
        allowDelegation: false,
        requireReasonForVotes: false
      });

      expect(config.createdAt).toBeInstanceOf(Date);
      expect(config.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateGovernanceConfig', () => {
    it('should update governance configuration successfully', async () => {
      // Mock user as creator
      const creatorIdentity = { ...mockIdentity, did: 'creator-did' };
      mockGetActiveIdentity.mockReturnValue(creatorIdentity);

      const updates = {
        minimumQuorum: 0.2,
        passingThreshold: 0.7,
        minimumQarmaToPropose: 200
      };

      const updatedConfig = await DAOGovernanceService.updateGovernanceConfig('test-community', updates);

      expect(updatedConfig).toMatchObject(updates);
      expect(updatedConfig.subcommunityId).toBe('test-community');
    });

    it('should throw error when not authenticated', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(DAOGovernanceService.updateGovernanceConfig('test-community', {}))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when user lacks permissions', async () => {
      // User is not the creator
      await expect(DAOGovernanceService.updateGovernanceConfig('test-community', {}))
        .rejects.toThrow('Insufficient permissions');
    });

    it('should validate configuration values', async () => {
      const creatorIdentity = { ...mockIdentity, did: 'creator-did' };
      mockGetActiveIdentity.mockReturnValue(creatorIdentity);

      // Test invalid quorum
      await expect(DAOGovernanceService.updateGovernanceConfig('test-community', {
        minimumQuorum: 1.5
      })).rejects.toThrow('Minimum quorum must be between 0 and 1');

      // Test invalid passing threshold
      await expect(DAOGovernanceService.updateGovernanceConfig('test-community', {
        passingThreshold: -0.1
      })).rejects.toThrow('Passing threshold must be between 0 and 1');

      // Test negative Qarma requirement
      await expect(DAOGovernanceService.updateGovernanceConfig('test-community', {
        minimumQarmaToPropose: -100
      })).rejects.toThrow('Minimum Qarma to propose must be non-negative');
    });
  });

  describe('assignModerationRoles', () => {
    beforeEach(() => {
      // Mock reputation for different users
      mockReputationService.getUserReputation.mockImplementation(async (userId: string) => {
        const baseReputation = { ...mockUserReputation, userId };
        
        switch (userId) {
          case 'user1-did':
            return {
              ...baseReputation,
              totalQarma: 600,
              subcommunityQarma: { 'test-community': 600 }
            };
          case 'user2-did':
            return {
              ...baseReputation,
              totalQarma: 1200,
              subcommunityQarma: { 'test-community': 1200 }
            };
          case 'user3-did':
            return {
              ...baseReputation,
              totalQarma: 2500,
              subcommunityQarma: { 'test-community': 2500 }
            };
          default:
            return baseReputation;
        }
      });
    });

    it('should assign moderation roles based on Qarma thresholds', async () => {
      const roles = await DAOGovernanceService.assignModerationRoles('test-community');

      expect(roles).toHaveLength(3);

      // user1-did should be moderator (600 Qarma >= 500 threshold)
      const user1Role = roles.find(r => r.userId === 'user1-did');
      expect(user1Role).toMatchObject({
        role: 'moderator',
        minimumQarma: 500,
        permissions: ['moderate'],
        assignedBy: 'system',
        isActive: true
      });

      // user2-did should be admin (1200 Qarma >= 1000 threshold)
      const user2Role = roles.find(r => r.userId === 'user2-did');
      expect(user2Role).toMatchObject({
        role: 'admin',
        minimumQarma: 1000,
        permissions: ['moderate', 'admin', 'execute_proposals'],
        assignedBy: 'system',
        isActive: true
      });

      // user3-did should be super_admin (2500 Qarma >= 2000 threshold)
      const user3Role = roles.find(r => r.userId === 'user3-did');
      expect(user3Role).toMatchObject({
        role: 'super_admin',
        minimumQarma: 2000,
        permissions: ['moderate', 'admin', 'super_admin', 'execute_proposals', 'update_governance'],
        assignedBy: 'system',
        isActive: true
      });

      // All roles should have valid IDs
      roles.forEach(role => {
        expect(role.id).toMatch(/^role_/);
        expect(role.subcommunityId).toBe('test-community');
        expect(role.assignedAt).toBeInstanceOf(Date);
      });
    });

    it('should not assign roles to users below thresholds', async () => {
      // Mock all users with low Qarma
      mockReputationService.getUserReputation.mockResolvedValue({
        ...mockUserReputation,
        totalQarma: 100,
        subcommunityQarma: { 'test-community': 100 }
      });

      const roles = await DAOGovernanceService.assignModerationRoles('test-community');

      expect(roles).toHaveLength(0);
    });

    it('should handle reputation service errors gracefully', async () => {
      mockReputationService.getUserReputation.mockRejectedValue(new Error('Service unavailable'));

      const roles = await DAOGovernanceService.assignModerationRoles('test-community');

      // Should return empty array when reputation service fails
      expect(roles).toHaveLength(0);
    });
  });

  describe('proposal validation', () => {
    it('should validate ADD_MODERATOR proposal data', () => {
      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.ADD_MODERATOR, {});
      }).toThrow('User ID is required for add moderator proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.ADD_MODERATOR, { userId: 'user123' });
      }).not.toThrow();
    });

    it('should validate REMOVE_MODERATOR proposal data', () => {
      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.REMOVE_MODERATOR, {});
      }).toThrow('User ID is required for remove moderator proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.REMOVE_MODERATOR, { userId: 'user123' });
      }).not.toThrow();
    });

    it('should validate UPDATE_RULES proposal data', () => {
      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UPDATE_RULES, {});
      }).toThrow('Rules array is required for update rules proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UPDATE_RULES, { rules: 'not array' });
      }).toThrow('Rules array is required for update rules proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UPDATE_RULES, { rules: ['Rule 1', 'Rule 2'] });
      }).not.toThrow();
    });

    it('should validate UPDATE_SETTINGS proposal data', () => {
      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UPDATE_SETTINGS, {});
      }).toThrow('Settings object is required for update settings proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UPDATE_SETTINGS, { settings: 'not object' });
      }).toThrow('Settings object is required for update settings proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UPDATE_SETTINGS, { 
          settings: { isPrivate: true } 
        });
      }).not.toThrow();
    });

    it('should validate BAN_USER proposal data', () => {
      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.BAN_USER, {});
      }).toThrow('User ID and reason are required for ban user proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.BAN_USER, { userId: 'user123' });
      }).toThrow('User ID and reason are required for ban user proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.BAN_USER, { 
          userId: 'user123', 
          reason: 'Spam' 
        });
      }).not.toThrow();
    });

    it('should validate UNBAN_USER proposal data', () => {
      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UNBAN_USER, {});
      }).toThrow('User ID is required for unban user proposal');

      expect(() => {
        (DAOGovernanceService as any).validateProposalData(ProposalType.UNBAN_USER, { userId: 'user123' });
      }).not.toThrow();
    });
  });

  describe('helper methods', () => {
    it('should generate unique proposal IDs', () => {
      const id1 = (DAOGovernanceService as any).generateProposalId();
      const id2 = (DAOGovernanceService as any).generateProposalId();

      expect(id1).toMatch(/^prop_/);
      expect(id2).toMatch(/^prop_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique vote IDs', () => {
      const id1 = (DAOGovernanceService as any).generateVoteId();
      const id2 = (DAOGovernanceService as any).generateVoteId();

      expect(id1).toMatch(/^vote_/);
      expect(id2).toMatch(/^vote_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique role IDs', () => {
      const id1 = (DAOGovernanceService as any).generateRoleId();
      const id2 = (DAOGovernanceService as any).generateRoleId();

      expect(id1).toMatch(/^role_/);
      expect(id2).toMatch(/^role_/);
      expect(id1).not.toBe(id2);
    });

    it('should calculate eligible voter count', async () => {
      const count = await (DAOGovernanceService as any).getEligibleVoterCount('test-community');
      expect(count).toBe(3); // mockMembers.length
    });

    it('should check if user is eligible to vote', async () => {
      const isEligible = await (DAOGovernanceService as any).isEligibleToVote('test-community', 'user123');
      expect(isEligible).toBe(true); // Currently returns true for all users
    });

    it('should calculate voting power based on Qarma', async () => {
      // Test with Qarma weighting enabled
      const power1 = await (DAOGovernanceService as any).calculateVotingPower('test-community', 'test-user-did');
      expect(power1).toBeGreaterThanOrEqual(1);

      // Test with low Qarma user
      const lowQarmaReputation = { ...mockUserReputation, subcommunityQarma: { 'test-community': 10 } };
      mockReputationService.getUserReputation.mockResolvedValueOnce(lowQarmaReputation);
      
      const power2 = await (DAOGovernanceService as any).calculateVotingPower('test-community', 'low-qarma-user');
      expect(power2).toBe(1); // Minimum voting power
    });

    it('should handle reputation service errors in voting power calculation', async () => {
      mockReputationService.getUserReputation.mockRejectedValueOnce(new Error('Service error'));
      
      const power = await (DAOGovernanceService as any).calculateVotingPower('test-community', 'error-user');
      expect(power).toBe(1); // Default to equal voting power on error
    });
  });

  describe('permission checks', () => {
    it('should check proposal execution permissions', async () => {
      // Creator can execute
      const creatorIdentity = { ...mockIdentity, did: 'creator-did' };
      mockGetActiveIdentity.mockReturnValue(creatorIdentity);
      
      const canExecute1 = await (DAOGovernanceService as any).canExecuteProposal('test-community', 'creator-did');
      expect(canExecute1).toBe(true);

      // Moderator can execute
      const canExecute2 = await (DAOGovernanceService as any).canExecuteProposal('test-community', 'mod1-did');
      expect(canExecute2).toBe(true);

      // Regular user cannot execute
      const canExecute3 = await (DAOGovernanceService as any).canExecuteProposal('test-community', 'regular-user');
      expect(canExecute3).toBe(false);
    });

    it('should check governance update permissions', async () => {
      // Only creator can update governance
      const canUpdate1 = await (DAOGovernanceService as any).canUpdateGovernance('test-community', 'creator-did');
      expect(canUpdate1).toBe(true);

      // Moderators cannot update governance
      const canUpdate2 = await (DAOGovernanceService as any).canUpdateGovernance('test-community', 'mod1-did');
      expect(canUpdate2).toBe(false);

      // Regular users cannot update governance
      const canUpdate3 = await (DAOGovernanceService as any).canUpdateGovernance('test-community', 'regular-user');
      expect(canUpdate3).toBe(false);
    });
  });
});
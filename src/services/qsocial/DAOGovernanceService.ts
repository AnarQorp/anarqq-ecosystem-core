import { 
  Subcommunity, 
  GovernanceRule,
  UserReputation,
  User
} from '../../types/qsocial';
import { getActiveIdentity } from '../../state/identity';
import { SubcommunityService } from './SubcommunityService';
import { ReputationService } from '../../api/qsocial';

/**
 * Governance proposal types
 */
export enum ProposalType {
  ADD_MODERATOR = 'add_moderator',
  REMOVE_MODERATOR = 'remove_moderator',
  UPDATE_RULES = 'update_rules',
  UPDATE_SETTINGS = 'update_settings',
  BAN_USER = 'ban_user',
  UNBAN_USER = 'unban_user',
  CUSTOM = 'custom'
}

/**
 * Proposal status
 */
export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  EXPIRED = 'expired'
}

/**
 * Vote type for proposals
 */
export enum VoteType {
  FOR = 'for',
  AGAINST = 'against',
  ABSTAIN = 'abstain'
}

/**
 * Governance proposal interface
 */
export interface GovernanceProposal {
  id: string;
  subcommunityId: string;
  proposerId: string;
  proposerIdentity: User;
  type: ProposalType;
  title: string;
  description: string;
  
  // Proposal data specific to the type
  proposalData: any;
  
  // Voting configuration
  votingStartTime: Date;
  votingEndTime: Date;
  minimumQuorum: number; // Minimum percentage of eligible voters
  passingThreshold: number; // Percentage needed to pass (e.g., 0.6 for 60%)
  
  // Vote counts
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalEligibleVoters: number;
  
  // Status
  status: ProposalStatus;
  
  // Execution
  executedAt?: Date;
  executedBy?: string;
  executionResult?: any;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Individual vote on a proposal
 */
export interface ProposalVote {
  id: string;
  proposalId: string;
  voterId: string;
  voterIdentity: User;
  voteType: VoteType;
  votingPower: number; // Based on Qarma or other factors
  reason?: string;
  createdAt: Date;
}

/**
 * Moderation role assignment based on Qarma
 */
export interface ModerationRole {
  id: string;
  subcommunityId: string;
  userId: string;
  role: 'moderator' | 'admin' | 'super_admin';
  assignedBy: string; // 'system' for automatic assignment, or user ID
  assignedAt: Date;
  minimumQarma: number;
  permissions: string[];
  isActive: boolean;
}

/**
 * Governance configuration for a subcommunity
 */
export interface GovernanceConfig {
  subcommunityId: string;
  
  // Voting settings
  defaultVotingDuration: number; // in hours
  minimumQuorum: number; // percentage (0-1)
  passingThreshold: number; // percentage (0-1)
  
  // Proposal settings
  minimumQarmaToPropose: number;
  proposalCooldown: number; // hours between proposals from same user
  
  // Moderation settings
  autoModeratorQarmaThreshold: number;
  adminQarmaThreshold: number;
  superAdminQarmaThreshold: number;
  
  // Voting power calculation
  useQarmaWeighting: boolean;
  maxVotingPowerMultiplier: number; // max multiplier based on Qarma
  
  // Other settings
  allowDelegation: boolean;
  requireReasonForVotes: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DAO Governance Service for managing subcommunity governance
 */
export class DAOGovernanceService {
  /**
   * Create a new governance proposal
   */
  static async createProposal(
    subcommunityId: string,
    type: ProposalType,
    title: string,
    description: string,
    proposalData: any,
    votingDurationHours: number = 72
  ): Promise<GovernanceProposal> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to create proposals');
    }

    // Get subcommunity to check permissions
    const subcommunity = await SubcommunityService.getSubcommunity(subcommunityId);
    
    // Get governance config
    const config = await this.getGovernanceConfig(subcommunityId);
    
    // Check if user has minimum Qarma to propose
    const userReputation = await ReputationService.getUserReputation(identity.did);
    if (userReputation.totalQarma < config.minimumQarmaToPropose) {
      throw new Error(`Minimum ${config.minimumQarmaToPropose} Qarma required to create proposals`);
    }

    // Check proposal cooldown
    await this.checkProposalCooldown(subcommunityId, identity.did, config.proposalCooldown);

    // Validate proposal data based on type
    this.validateProposalData(type, proposalData);

    const now = new Date();
    const votingEndTime = new Date(now.getTime() + votingDurationHours * 60 * 60 * 1000);

    const proposal: GovernanceProposal = {
      id: this.generateProposalId(),
      subcommunityId,
      proposerId: identity.did,
      proposerIdentity: {
        id: identity.did,
        did: identity.did,
        displayName: identity.name,
        avatar: identity.avatar
      },
      type,
      title: title.trim(),
      description: description.trim(),
      proposalData,
      votingStartTime: now,
      votingEndTime,
      minimumQuorum: config.minimumQuorum,
      passingThreshold: config.passingThreshold,
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      totalEligibleVoters: await this.getEligibleVoterCount(subcommunityId),
      status: ProposalStatus.ACTIVE,
      createdAt: now,
      updatedAt: now
    };

    // TODO: Store proposal in database
    console.log('Created proposal:', proposal);
    
    return proposal;
  }

  /**
   * Vote on a proposal
   */
  static async voteOnProposal(
    proposalId: string,
    voteType: VoteType,
    reason?: string
  ): Promise<ProposalVote> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to vote');
    }

    // Get proposal
    const proposal = await this.getProposal(proposalId);
    
    // Check if proposal is active and voting is open
    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new Error('Proposal is not active for voting');
    }

    const now = new Date();
    if (now > proposal.votingEndTime) {
      throw new Error('Voting period has ended');
    }

    // Check if user is eligible to vote
    const isEligible = await this.isEligibleToVote(proposal.subcommunityId, identity.did);
    if (!isEligible) {
      throw new Error('You are not eligible to vote on this proposal');
    }

    // Check if user has already voted
    const existingVote = await this.getUserVote(proposalId, identity.did);
    if (existingVote) {
      throw new Error('You have already voted on this proposal');
    }

    // Calculate voting power
    const votingPower = await this.calculateVotingPower(proposal.subcommunityId, identity.did);

    const vote: ProposalVote = {
      id: this.generateVoteId(),
      proposalId,
      voterId: identity.did,
      voterIdentity: {
        id: identity.did,
        did: identity.did,
        displayName: identity.name,
        avatar: identity.avatar
      },
      voteType,
      votingPower,
      reason,
      createdAt: now
    };

    // Update proposal vote counts
    await this.updateProposalVoteCounts(proposalId, voteType, votingPower);

    // TODO: Store vote in database
    console.log('Created vote:', vote);

    // Check if proposal should be finalized
    await this.checkProposalFinalization(proposalId);

    return vote;
  }

  /**
   * Execute a passed proposal
   */
  static async executeProposal(proposalId: string): Promise<void> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required to execute proposals');
    }

    const proposal = await this.getProposal(proposalId);
    
    if (proposal.status !== ProposalStatus.PASSED) {
      throw new Error('Only passed proposals can be executed');
    }

    // Check if user has permission to execute
    const canExecute = await this.canExecuteProposal(proposal.subcommunityId, identity.did);
    if (!canExecute) {
      throw new Error('Insufficient permissions to execute proposal');
    }

    try {
      let executionResult: any;

      switch (proposal.type) {
        case ProposalType.ADD_MODERATOR:
          executionResult = await this.executeAddModerator(proposal);
          break;
        case ProposalType.REMOVE_MODERATOR:
          executionResult = await this.executeRemoveModerator(proposal);
          break;
        case ProposalType.UPDATE_RULES:
          executionResult = await this.executeUpdateRules(proposal);
          break;
        case ProposalType.UPDATE_SETTINGS:
          executionResult = await this.executeUpdateSettings(proposal);
          break;
        case ProposalType.BAN_USER:
          executionResult = await this.executeBanUser(proposal);
          break;
        case ProposalType.UNBAN_USER:
          executionResult = await this.executeUnbanUser(proposal);
          break;
        default:
          throw new Error(`Execution not implemented for proposal type: ${proposal.type}`);
      }

      // Update proposal status
      await this.updateProposalStatus(proposalId, ProposalStatus.EXECUTED, {
        executedAt: new Date(),
        executedBy: identity.did,
        executionResult
      });

    } catch (error) {
      console.error('Failed to execute proposal:', error);
      throw new Error('Failed to execute proposal');
    }
  }

  /**
   * Get governance configuration for a subcommunity
   */
  static async getGovernanceConfig(subcommunityId: string): Promise<GovernanceConfig> {
    // TODO: Get from database, for now return default config
    return {
      subcommunityId,
      defaultVotingDuration: 72,
      minimumQuorum: 0.1, // 10%
      passingThreshold: 0.6, // 60%
      minimumQarmaToPropose: 100,
      proposalCooldown: 24,
      autoModeratorQarmaThreshold: 500,
      adminQarmaThreshold: 1000,
      superAdminQarmaThreshold: 2000,
      useQarmaWeighting: true,
      maxVotingPowerMultiplier: 3,
      allowDelegation: false,
      requireReasonForVotes: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update governance configuration
   */
  static async updateGovernanceConfig(
    subcommunityId: string,
    updates: Partial<GovernanceConfig>
  ): Promise<GovernanceConfig> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('Authentication required');
    }

    // Check permissions
    const canUpdate = await this.canUpdateGovernance(subcommunityId, identity.did);
    if (!canUpdate) {
      throw new Error('Insufficient permissions to update governance configuration');
    }

    // Get current config
    const currentConfig = await this.getGovernanceConfig(subcommunityId);
    
    // Validate updates
    this.validateGovernanceConfig(updates);

    const updatedConfig: GovernanceConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date()
    };

    // TODO: Store in database
    console.log('Updated governance config:', updatedConfig);

    return updatedConfig;
  }

  /**
   * Assign moderation roles based on Qarma thresholds
   */
  static async assignModerationRoles(subcommunityId: string): Promise<ModerationRole[]> {
    const config = await this.getGovernanceConfig(subcommunityId);
    const members = await SubcommunityService.getMembers(subcommunityId);
    const assignedRoles: ModerationRole[] = [];

    for (const member of members) {
      try {
        const reputation = await ReputationService.getUserReputation(member.id);
        const subcommunityQarma = reputation.subcommunityQarma[subcommunityId] || 0;
        
        let role: 'moderator' | 'admin' | 'super_admin' | null = null;
        let minimumQarma = 0;
        let permissions: string[] = [];

        if (subcommunityQarma >= config.superAdminQarmaThreshold) {
          role = 'super_admin';
          minimumQarma = config.superAdminQarmaThreshold;
          permissions = ['moderate', 'admin', 'super_admin', 'execute_proposals', 'update_governance'];
        } else if (subcommunityQarma >= config.adminQarmaThreshold) {
          role = 'admin';
          minimumQarma = config.adminQarmaThreshold;
          permissions = ['moderate', 'admin', 'execute_proposals'];
        } else if (subcommunityQarma >= config.autoModeratorQarmaThreshold) {
          role = 'moderator';
          minimumQarma = config.autoModeratorQarmaThreshold;
          permissions = ['moderate'];
        }

        if (role) {
          const moderationRole: ModerationRole = {
            id: this.generateRoleId(),
            subcommunityId,
            userId: member.id,
            role,
            assignedBy: 'system',
            assignedAt: new Date(),
            minimumQarma,
            permissions,
            isActive: true
          };

          assignedRoles.push(moderationRole);
          
          // TODO: Store in database and update subcommunity moderators list
          console.log('Assigned role:', moderationRole);
        }
      } catch (error) {
        console.error(`Failed to check reputation for user ${member.id}:`, error);
      }
    }

    return assignedRoles;
  }

  /**
   * Get active proposals for a subcommunity
   */
  static async getActiveProposals(subcommunityId: string): Promise<GovernanceProposal[]> {
    // TODO: Get from database
    return [];
  }

  /**
   * Get proposal by ID
   */
  static async getProposal(proposalId: string): Promise<GovernanceProposal> {
    // TODO: Get from database
    throw new Error('Proposal not found');
  }

  /**
   * Get user's vote on a proposal
   */
  static async getUserVote(proposalId: string, userId: string): Promise<ProposalVote | null> {
    // TODO: Get from database
    return null;
  }

  // Private helper methods

  private static generateProposalId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateVoteId(): string {
    return `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateRoleId(): string {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async checkProposalCooldown(
    subcommunityId: string,
    userId: string,
    cooldownHours: number
  ): Promise<void> {
    // TODO: Check last proposal time from database
    // For now, allow all proposals
  }

  private static validateProposalData(type: ProposalType, data: any): void {
    switch (type) {
      case ProposalType.ADD_MODERATOR:
        if (!data.userId) {
          throw new Error('User ID is required for add moderator proposal');
        }
        break;
      case ProposalType.REMOVE_MODERATOR:
        if (!data.userId) {
          throw new Error('User ID is required for remove moderator proposal');
        }
        break;
      case ProposalType.UPDATE_RULES:
        if (!data.rules || !Array.isArray(data.rules)) {
          throw new Error('Rules array is required for update rules proposal');
        }
        break;
      case ProposalType.UPDATE_SETTINGS:
        if (!data.settings || typeof data.settings !== 'object') {
          throw new Error('Settings object is required for update settings proposal');
        }
        break;
      case ProposalType.BAN_USER:
        if (!data.userId || !data.reason) {
          throw new Error('User ID and reason are required for ban user proposal');
        }
        break;
      case ProposalType.UNBAN_USER:
        if (!data.userId) {
          throw new Error('User ID is required for unban user proposal');
        }
        break;
    }
  }

  private static async getEligibleVoterCount(subcommunityId: string): Promise<number> {
    const members = await SubcommunityService.getMembers(subcommunityId);
    return members.length; // For now, all members are eligible
  }

  private static async isEligibleToVote(subcommunityId: string, userId: string): Promise<boolean> {
    // TODO: Check membership, bans, etc.
    return true; // For now, assume all users are eligible
  }

  private static async calculateVotingPower(subcommunityId: string, userId: string): Promise<number> {
    const config = await this.getGovernanceConfig(subcommunityId);
    
    if (!config.useQarmaWeighting) {
      return 1; // Equal voting power
    }

    try {
      const reputation = await ReputationService.getUserReputation(userId);
      const subcommunityQarma = reputation.subcommunityQarma[subcommunityId] || 0;
      
      // Calculate multiplier based on Qarma (logarithmic scale)
      const multiplier = Math.min(
        1 + Math.log10(Math.max(1, subcommunityQarma / 100)),
        config.maxVotingPowerMultiplier
      );
      
      return Math.max(1, Math.floor(multiplier));
    } catch (error) {
      console.error('Failed to calculate voting power:', error);
      return 1; // Default to equal voting power
    }
  }

  private static async updateProposalVoteCounts(
    proposalId: string,
    voteType: VoteType,
    votingPower: number
  ): Promise<void> {
    // TODO: Update proposal vote counts in database
    console.log(`Updated proposal ${proposalId} with ${voteType} vote (power: ${votingPower})`);
  }

  private static async checkProposalFinalization(proposalId: string): Promise<void> {
    const proposal = await this.getProposal(proposalId);
    
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    const quorumMet = totalVotes >= (proposal.totalEligibleVoters * proposal.minimumQuorum);
    const votingEnded = new Date() > proposal.votingEndTime;
    
    if (quorumMet || votingEnded) {
      const forPercentage = totalVotes > 0 ? proposal.votesFor / totalVotes : 0;
      const newStatus = forPercentage >= proposal.passingThreshold 
        ? ProposalStatus.PASSED 
        : ProposalStatus.REJECTED;
      
      await this.updateProposalStatus(proposalId, newStatus);
    }
  }

  private static async updateProposalStatus(
    proposalId: string,
    status: ProposalStatus,
    additionalData?: any
  ): Promise<void> {
    // TODO: Update proposal status in database
    console.log(`Updated proposal ${proposalId} status to ${status}`, additionalData);
  }

  private static async canExecuteProposal(subcommunityId: string, userId: string): Promise<boolean> {
    // Check if user is moderator, admin, or creator
    const subcommunity = await SubcommunityService.getSubcommunity(subcommunityId);
    return subcommunity.creatorId === userId || subcommunity.moderators.includes(userId);
  }

  private static async canUpdateGovernance(subcommunityId: string, userId: string): Promise<boolean> {
    // Only creator and super admins can update governance
    const subcommunity = await SubcommunityService.getSubcommunity(subcommunityId);
    return subcommunity.creatorId === userId;
  }

  private static validateGovernanceConfig(config: Partial<GovernanceConfig>): void {
    if (config.minimumQuorum !== undefined && (config.minimumQuorum < 0 || config.minimumQuorum > 1)) {
      throw new Error('Minimum quorum must be between 0 and 1');
    }
    
    if (config.passingThreshold !== undefined && (config.passingThreshold < 0 || config.passingThreshold > 1)) {
      throw new Error('Passing threshold must be between 0 and 1');
    }
    
    if (config.minimumQarmaToPropose !== undefined && config.minimumQarmaToPropose < 0) {
      throw new Error('Minimum Qarma to propose must be non-negative');
    }
  }

  // Proposal execution methods

  private static async executeAddModerator(proposal: GovernanceProposal): Promise<any> {
    const { userId } = proposal.proposalData;
    await SubcommunityService.addModerator(proposal.subcommunityId, userId);
    return { action: 'added_moderator', userId };
  }

  private static async executeRemoveModerator(proposal: GovernanceProposal): Promise<any> {
    const { userId } = proposal.proposalData;
    await SubcommunityService.removeModerator(proposal.subcommunityId, userId);
    return { action: 'removed_moderator', userId };
  }

  private static async executeUpdateRules(proposal: GovernanceProposal): Promise<any> {
    const { rules } = proposal.proposalData;
    await SubcommunityService.updateSubcommunity(proposal.subcommunityId, { rules });
    return { action: 'updated_rules', rulesCount: rules.length };
  }

  private static async executeUpdateSettings(proposal: GovernanceProposal): Promise<any> {
    const { settings } = proposal.proposalData;
    await SubcommunityService.updateSubcommunity(proposal.subcommunityId, settings);
    return { action: 'updated_settings', settings };
  }

  private static async executeBanUser(proposal: GovernanceProposal): Promise<any> {
    const { userId, reason } = proposal.proposalData;
    // TODO: Implement user banning
    console.log(`Banned user ${userId} from ${proposal.subcommunityId}: ${reason}`);
    return { action: 'banned_user', userId, reason };
  }

  private static async executeUnbanUser(proposal: GovernanceProposal): Promise<any> {
    const { userId } = proposal.proposalData;
    // TODO: Implement user unbanning
    console.log(`Unbanned user ${userId} from ${proposal.subcommunityId}`);
    return { action: 'unbanned_user', userId };
  }
}
/**
 * Token Governance Service
 * Handles governance-controlled token registration, approval workflows,
 * and DAO-based token management decisions
 */

import { TokenInfo, TokenRegistrationRequest, GovernanceVote } from './MultiChainTokenService';
import { IdentityType } from '../../types/identity';

// Governance Configuration
export interface TokenGovernanceConfig {
  // Voting parameters
  votingPeriod: number; // hours
  quorumThreshold: number; // percentage
  approvalThreshold: number; // percentage
  
  // Governance roles
  governanceRoles: GovernanceRole[];
  
  // Token approval requirements
  requiresGovernanceForNewTokens: boolean;
  requiresGovernanceForRiskChanges: boolean;
  requiresGovernanceForChainAddition: boolean;
  
  // Automatic approval conditions
  autoApprovalConditions: AutoApprovalCondition[];
  
  // Emergency controls
  emergencyVetoEnabled: boolean;
  emergencyVetoRoles: string[];
}

export interface GovernanceRole {
  roleId: string;
  name: string;
  description: string;
  votingWeight: number;
  permissions: GovernancePermission[];
  identityTypes: IdentityType[];
  minimumReputation?: number;
  minimumStake?: number;
}

export interface GovernancePermission {
  action: 'PROPOSE' | 'VOTE' | 'VETO' | 'EXECUTE' | 'DELEGATE';
  scope: 'ALL' | 'CHAIN_SPECIFIC' | 'RISK_LEVEL' | 'TOKEN_TYPE';
  conditions?: Record<string, any>;
}

export interface AutoApprovalCondition {
  name: string;
  description: string;
  conditions: {
    verified?: boolean;
    riskLevel?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
    chains?: string[];
    minLiquidity?: number;
    minHolders?: number;
    hasAudit?: boolean;
    proposedBy?: IdentityType[];
  };
  enabled: boolean;
}

// Governance Proposals
export interface TokenGovernanceProposal {
  proposalId: string;
  type: 'TOKEN_ADDITION' | 'TOKEN_REMOVAL' | 'RISK_CHANGE' | 'CHAIN_ADDITION' | 'GOVERNANCE_CHANGE';
  title: string;
  description: string;
  
  // Proposal details
  proposedBy: string;
  proposedAt: string;
  proposerIdentityType: IdentityType;
  
  // Token-specific data
  tokenData?: {
    tokenInfo: TokenInfo;
    registrationRequest?: TokenRegistrationRequest;
    currentRiskLevel?: string;
    proposedRiskLevel?: string;
    justification: string;
  };
  
  // Voting details
  votingStartsAt: string;
  votingEndsAt: string;
  votes: GovernanceVote[];
  
  // Status and results
  status: 'DRAFT' | 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED' | 'VETOED' | 'EXPIRED';
  quorumReached: boolean;
  approvalReached: boolean;
  totalVotingWeight: number;
  yesVotingWeight: number;
  noVotingWeight: number;
  abstainVotingWeight: number;
  
  // Execution
  executedAt?: string;
  executedBy?: string;
  executionResult?: string;
  
  // Emergency controls
  vetoedAt?: string;
  vetoedBy?: string;
  vetoReason?: string;
}

export interface VotingResult {
  proposalId: string;
  passed: boolean;
  quorumReached: boolean;
  approvalReached: boolean;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  votingWeight: {
    total: number;
    yes: number;
    no: number;
    abstain: number;
  };
  participationRate: number;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  averageParticipation: number;
  averageVotingPeriod: number;
  topVoters: Array<{
    voterId: string;
    votesCount: number;
    participationRate: number;
  }>;
}

// Service Interface
export interface TokenGovernanceServiceInterface {
  // Proposal Management
  createProposal(proposal: Omit<TokenGovernanceProposal, 'proposalId' | 'proposedAt' | 'status' | 'votes'>): Promise<string>;
  getProposal(proposalId: string): Promise<TokenGovernanceProposal | null>;
  getAllProposals(status?: string): Promise<TokenGovernanceProposal[]>;
  getActiveProposals(): Promise<TokenGovernanceProposal[]>;
  
  // Voting
  castVote(proposalId: string, voterId: string, vote: 'APPROVE' | 'REJECT' | 'ABSTAIN', reason?: string): Promise<boolean>;
  delegateVote(delegatorId: string, delegateId: string, proposalId?: string): Promise<boolean>;
  getVotingPower(voterId: string): Promise<number>;
  
  // Proposal Execution
  executeProposal(proposalId: string, executorId: string): Promise<boolean>;
  vetoProposal(proposalId: string, vetoerId: string, reason: string): Promise<boolean>;
  
  // Governance Configuration
  updateGovernanceConfig(config: Partial<TokenGovernanceConfig>): Promise<boolean>;
  getGovernanceConfig(): TokenGovernanceConfig;
  
  // Role Management
  assignGovernanceRole(identityId: string, roleId: string): Promise<boolean>;
  removeGovernanceRole(identityId: string, roleId: string): Promise<boolean>;
  getGovernanceRoles(identityId: string): Promise<GovernanceRole[]>;
  
  // Auto-approval
  checkAutoApproval(tokenInfo: TokenInfo, proposedBy: string): Promise<boolean>;
  updateAutoApprovalConditions(conditions: AutoApprovalCondition[]): Promise<boolean>;
  
  // Analytics
  getGovernanceStats(): Promise<GovernanceStats>;
  getVotingHistory(identityId: string): Promise<GovernanceVote[]>;
  getProposalAnalytics(proposalId: string): Promise<any>;
}

export class TokenGovernanceService implements TokenGovernanceServiceInterface {
  private config: TokenGovernanceConfig;
  private proposals: Map<string, TokenGovernanceProposal> = new Map();
  private roleAssignments: Map<string, string[]> = new Map(); // identityId -> roleIds
  private voteDelegations: Map<string, string> = new Map(); // delegatorId -> delegateId
  
  // Default governance configuration
  private defaultConfig: TokenGovernanceConfig = {
    votingPeriod: 72, // 3 days
    quorumThreshold: 20, // 20% of eligible voters
    approvalThreshold: 60, // 60% of votes cast
    
    governanceRoles: [
      {
        roleId: 'token_reviewer',
        name: 'Token Reviewer',
        description: 'Can review and vote on token proposals',
        votingWeight: 1,
        permissions: [
          { action: 'VOTE', scope: 'ALL' },
          { action: 'PROPOSE', scope: 'TOKEN_TYPE' }
        ],
        identityTypes: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE]
      },
      {
        roleId: 'dao_representative',
        name: 'DAO Representative',
        description: 'Represents DAO interests in token governance',
        votingWeight: 3,
        permissions: [
          { action: 'VOTE', scope: 'ALL' },
          { action: 'PROPOSE', scope: 'ALL' },
          { action: 'DELEGATE', scope: 'ALL' }
        ],
        identityTypes: [IdentityType.DAO],
        minimumReputation: 100
      },
      {
        roleId: 'security_auditor',
        name: 'Security Auditor',
        description: 'Specialized in security assessment of tokens',
        votingWeight: 5,
        permissions: [
          { action: 'VOTE', scope: 'ALL' },
          { action: 'VETO', scope: 'RISK_LEVEL' }
        ],
        identityTypes: [IdentityType.ROOT, IdentityType.ENTERPRISE],
        minimumReputation: 500
      },
      {
        roleId: 'governance_admin',
        name: 'Governance Administrator',
        description: 'Can execute proposals and manage governance',
        votingWeight: 2,
        permissions: [
          { action: 'EXECUTE', scope: 'ALL' },
          { action: 'VETO', scope: 'ALL' }
        ],
        identityTypes: [IdentityType.ROOT]
      }
    ],
    
    requiresGovernanceForNewTokens: true,
    requiresGovernanceForRiskChanges: true,
    requiresGovernanceForChainAddition: true,
    
    autoApprovalConditions: [
      {
        name: 'Verified Low Risk Token',
        description: 'Automatically approve verified tokens with low risk',
        conditions: {
          verified: true,
          riskLevel: ['LOW'],
          minLiquidity: 100000,
          minHolders: 1000,
          hasAudit: true
        },
        enabled: true
      },
      {
        name: 'DAO Proposed Medium Risk',
        description: 'Auto-approve medium risk tokens proposed by DAOs',
        conditions: {
          verified: true,
          riskLevel: ['LOW', 'MEDIUM'],
          proposedBy: [IdentityType.DAO],
          minLiquidity: 50000
        },
        enabled: true
      }
    ],
    
    emergencyVetoEnabled: true,
    emergencyVetoRoles: ['governance_admin', 'security_auditor']
  };

  constructor(config?: Partial<TokenGovernanceConfig>) {
    this.config = { ...this.defaultConfig, ...config };
    this.loadGovernanceData();
  }

  // Proposal Management
  async createProposal(
    proposal: Omit<TokenGovernanceProposal, 'proposalId' | 'proposedAt' | 'status' | 'votes'>
  ): Promise<string> {
    try {
      const proposalId = this.generateId();
      const now = new Date();
      const votingStartsAt = new Date(now.getTime() + 1000); // Start voting in 1 second for testing
      const votingEndsAt = new Date(votingStartsAt.getTime() + this.config.votingPeriod * 60 * 60 * 1000);
      
      const newProposal: TokenGovernanceProposal = {
        ...proposal,
        proposalId,
        proposedAt: now.toISOString(),
        votingStartsAt: votingStartsAt.toISOString(),
        votingEndsAt: votingEndsAt.toISOString(),
        status: 'DRAFT',
        votes: [],
        quorumReached: false,
        approvalReached: false,
        totalVotingWeight: 0,
        yesVotingWeight: 0,
        noVotingWeight: 0,
        abstainVotingWeight: 0
      };
      
      // Check for auto-approval
      if (proposal.tokenData?.tokenInfo) {
        const autoApproved = await this.checkAutoApproval(
          proposal.tokenData.tokenInfo,
          proposal.proposedBy
        );
        
        if (autoApproved) {
          newProposal.status = 'PASSED';
          newProposal.approvalReached = true;
          newProposal.quorumReached = true;
          console.log(`[TokenGovernanceService] Proposal auto-approved: ${proposalId}`);
        }
      }
      
      this.proposals.set(proposalId, newProposal);
      await this.saveGovernanceData();
      
      console.log(`[TokenGovernanceService] Proposal created: ${proposalId}`);
      return proposalId;
    } catch (error) {
      console.error('[TokenGovernanceService] Error creating proposal:', error);
      throw new Error('Failed to create governance proposal');
    }
  }

  async getProposal(proposalId: string): Promise<TokenGovernanceProposal | null> {
    return this.proposals.get(proposalId) || null;
  }

  async getAllProposals(status?: string): Promise<TokenGovernanceProposal[]> {
    let proposals = Array.from(this.proposals.values());
    
    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }
    
    return proposals.sort((a, b) => 
      new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime()
    );
  }

  async getActiveProposals(): Promise<TokenGovernanceProposal[]> {
    const now = new Date();
    
    return Array.from(this.proposals.values()).filter(proposal => 
      proposal.status === 'ACTIVE' &&
      new Date(proposal.votingStartsAt) <= now &&
      new Date(proposal.votingEndsAt) > now
    );
  }

  // Voting
  async castVote(
    proposalId: string,
    voterId: string,
    vote: 'APPROVE' | 'REJECT' | 'ABSTAIN',
    reason?: string
  ): Promise<boolean> {
    try {
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        console.warn(`[TokenGovernanceService] Proposal not found: ${proposalId}`);
        return false;
      }
      
      // Check if voting is active
      const now = new Date();
      if (new Date(proposal.votingStartsAt) > now || new Date(proposal.votingEndsAt) < now) {
        console.warn(`[TokenGovernanceService] Voting not active for proposal: ${proposalId}`);
        return false;
      }
      
      // Check if voter already voted
      const existingVoteIndex = proposal.votes.findIndex(v => v.voterId === voterId);
      
      // Get voting power
      const votingPower = await this.getVotingPower(voterId);
      if (votingPower === 0) {
        console.warn(`[TokenGovernanceService] No voting power for voter: ${voterId}`);
        return false;
      }
      
      const newVote: GovernanceVote = {
        voterId,
        vote,
        votedAt: new Date().toISOString(),
        reason,
        weight: votingPower
      };
      
      // Update or add vote
      if (existingVoteIndex >= 0) {
        // Remove old vote weight
        const oldVote = proposal.votes[existingVoteIndex];
        this.updateVotingWeights(proposal, oldVote, false);
        
        // Replace vote
        proposal.votes[existingVoteIndex] = newVote;
      } else {
        proposal.votes.push(newVote);
      }
      
      // Add new vote weight
      this.updateVotingWeights(proposal, newVote, true);
      
      // Check if proposal should be updated to active status
      if (proposal.status === 'DRAFT') {
        proposal.status = 'ACTIVE';
      }
      
      // Check voting results
      await this.checkVotingResults(proposal);
      
      this.proposals.set(proposalId, proposal);
      await this.saveGovernanceData();
      
      console.log(`[TokenGovernanceService] Vote cast for proposal ${proposalId} by ${voterId}: ${vote}`);
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error casting vote:', error);
      return false;
    }
  }

  async delegateVote(delegatorId: string, delegateId: string, proposalId?: string): Promise<boolean> {
    try {
      // For simplicity, we'll implement global delegation
      // In production, this could be proposal-specific
      this.voteDelegations.set(delegatorId, delegateId);
      await this.saveGovernanceData();
      
      console.log(`[TokenGovernanceService] Vote delegated from ${delegatorId} to ${delegateId}`);
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error delegating vote:', error);
      return false;
    }
  }

  async getVotingPower(voterId: string): Promise<number> {
    try {
      const roles = await this.getGovernanceRoles(voterId);
      let totalWeight = 0;
      
      for (const role of roles) {
        totalWeight += role.votingWeight;
      }
      
      // Check for delegated votes
      let delegatedWeight = 0;
      for (const [delegatorId, delegateId] of this.voteDelegations.entries()) {
        if (delegateId === voterId) {
          const delegatorRoles = await this.getGovernanceRoles(delegatorId);
          for (const role of delegatorRoles) {
            delegatedWeight += role.votingWeight;
          }
        }
      }
      
      return totalWeight + delegatedWeight;
    } catch (error) {
      console.error('[TokenGovernanceService] Error getting voting power:', error);
      return 0;
    }
  }

  // Proposal Execution
  async executeProposal(proposalId: string, executorId: string): Promise<boolean> {
    try {
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        return false;
      }
      
      if (proposal.status !== 'PASSED') {
        console.warn(`[TokenGovernanceService] Cannot execute proposal with status: ${proposal.status}`);
        return false;
      }
      
      // Check executor permissions
      const executorRoles = await this.getGovernanceRoles(executorId);
      const canExecute = executorRoles.some(role => 
        role.permissions.some(p => p.action === 'EXECUTE')
      );
      
      if (!canExecute) {
        console.warn(`[TokenGovernanceService] Executor lacks permission: ${executorId}`);
        return false;
      }
      
      // Execute the proposal based on type
      let executionResult = '';
      
      switch (proposal.type) {
        case 'TOKEN_ADDITION':
          if (proposal.tokenData?.tokenInfo) {
            // This would integrate with the token registry
            executionResult = 'Token added to registry';
          }
          break;
        case 'TOKEN_REMOVAL':
          executionResult = 'Token removed from registry';
          break;
        case 'RISK_CHANGE':
          executionResult = 'Token risk level updated';
          break;
        case 'CHAIN_ADDITION':
          executionResult = 'New chain support added';
          break;
        case 'GOVERNANCE_CHANGE':
          executionResult = 'Governance configuration updated';
          break;
      }
      
      proposal.status = 'EXECUTED';
      proposal.executedAt = new Date().toISOString();
      proposal.executedBy = executorId;
      proposal.executionResult = executionResult;
      
      this.proposals.set(proposalId, proposal);
      await this.saveGovernanceData();
      
      console.log(`[TokenGovernanceService] Proposal executed: ${proposalId}`);
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error executing proposal:', error);
      return false;
    }
  }

  async vetoProposal(proposalId: string, vetoerId: string, reason: string): Promise<boolean> {
    try {
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        return false;
      }
      
      if (!this.config.emergencyVetoEnabled) {
        console.warn('[TokenGovernanceService] Emergency veto is disabled');
        return false;
      }
      
      // Check veto permissions
      const vetoerRoles = await this.getGovernanceRoles(vetoerId);
      const canVeto = vetoerRoles.some(role => 
        this.config.emergencyVetoRoles.includes(role.roleId) &&
        role.permissions.some(p => p.action === 'VETO')
      );
      
      if (!canVeto) {
        console.warn(`[TokenGovernanceService] Vetoer lacks permission: ${vetoerId}`);
        return false;
      }
      
      proposal.status = 'VETOED';
      proposal.vetoedAt = new Date().toISOString();
      proposal.vetoedBy = vetoerId;
      proposal.vetoReason = reason;
      
      this.proposals.set(proposalId, proposal);
      await this.saveGovernanceData();
      
      console.log(`[TokenGovernanceService] Proposal vetoed: ${proposalId}`);
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error vetoing proposal:', error);
      return false;
    }
  }

  // Governance Configuration
  async updateGovernanceConfig(config: Partial<TokenGovernanceConfig>): Promise<boolean> {
    try {
      this.config = { ...this.config, ...config };
      await this.saveGovernanceData();
      
      console.log('[TokenGovernanceService] Governance configuration updated');
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error updating governance config:', error);
      return false;
    }
  }

  getGovernanceConfig(): TokenGovernanceConfig {
    return { ...this.config };
  }

  // Role Management
  async assignGovernanceRole(identityId: string, roleId: string): Promise<boolean> {
    try {
      const role = this.config.governanceRoles.find(r => r.roleId === roleId);
      if (!role) {
        console.warn(`[TokenGovernanceService] Role not found: ${roleId}`);
        return false;
      }
      
      const currentRoles = this.roleAssignments.get(identityId) || [];
      if (!currentRoles.includes(roleId)) {
        currentRoles.push(roleId);
        this.roleAssignments.set(identityId, currentRoles);
        await this.saveGovernanceData();
      }
      
      console.log(`[TokenGovernanceService] Role assigned: ${roleId} to ${identityId}`);
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error assigning role:', error);
      return false;
    }
  }

  async removeGovernanceRole(identityId: string, roleId: string): Promise<boolean> {
    try {
      const currentRoles = this.roleAssignments.get(identityId) || [];
      const updatedRoles = currentRoles.filter(r => r !== roleId);
      
      if (updatedRoles.length !== currentRoles.length) {
        this.roleAssignments.set(identityId, updatedRoles);
        await this.saveGovernanceData();
        console.log(`[TokenGovernanceService] Role removed: ${roleId} from ${identityId}`);
      }
      
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error removing role:', error);
      return false;
    }
  }

  async getGovernanceRoles(identityId: string): Promise<GovernanceRole[]> {
    const roleIds = this.roleAssignments.get(identityId) || [];
    return this.config.governanceRoles.filter(role => roleIds.includes(role.roleId));
  }

  // Auto-approval
  async checkAutoApproval(tokenInfo: TokenInfo, proposedBy: string): Promise<boolean> {
    try {
      for (const condition of this.config.autoApprovalConditions) {
        if (!condition.enabled) continue;
        
        let meetsCondition = true;
        
        if (condition.conditions.verified !== undefined && 
            tokenInfo.verified !== condition.conditions.verified) {
          meetsCondition = false;
        }
        
        if (condition.conditions.riskLevel && 
            !condition.conditions.riskLevel.includes(tokenInfo.riskLevel)) {
          meetsCondition = false;
        }
        
        if (condition.conditions.chains && 
            !condition.conditions.chains.includes(tokenInfo.chain)) {
          meetsCondition = false;
        }
        
        // Additional condition checks would go here
        
        if (meetsCondition) {
          console.log(`[TokenGovernanceService] Auto-approval condition met: ${condition.name}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[TokenGovernanceService] Error checking auto-approval:', error);
      return false;
    }
  }

  async updateAutoApprovalConditions(conditions: AutoApprovalCondition[]): Promise<boolean> {
    try {
      this.config.autoApprovalConditions = conditions;
      await this.saveGovernanceData();
      
      console.log('[TokenGovernanceService] Auto-approval conditions updated');
      return true;
    } catch (error) {
      console.error('[TokenGovernanceService] Error updating auto-approval conditions:', error);
      return false;
    }
  }

  // Analytics
  async getGovernanceStats(): Promise<GovernanceStats> {
    const proposals = Array.from(this.proposals.values());
    
    const totalProposals = proposals.length;
    const activeProposals = proposals.filter(p => p.status === 'ACTIVE').length;
    const passedProposals = proposals.filter(p => p.status === 'PASSED' || p.status === 'EXECUTED').length;
    const rejectedProposals = proposals.filter(p => p.status === 'REJECTED').length;
    
    // Calculate average participation
    let totalParticipation = 0;
    let proposalsWithVotes = 0;
    
    for (const proposal of proposals) {
      if (proposal.votes.length > 0) {
        const eligibleVoters = 10; // Mock number - would be calculated from role assignments
        totalParticipation += (proposal.votes.length / eligibleVoters) * 100;
        proposalsWithVotes++;
      }
    }
    
    const averageParticipation = proposalsWithVotes > 0 ? totalParticipation / proposalsWithVotes : 0;
    
    // Calculate average voting period
    const completedProposals = proposals.filter(p => 
      ['PASSED', 'REJECTED', 'EXECUTED'].includes(p.status)
    );
    
    let totalVotingTime = 0;
    for (const proposal of completedProposals) {
      const start = new Date(proposal.votingStartsAt).getTime();
      const end = new Date(proposal.votingEndsAt).getTime();
      totalVotingTime += (end - start) / (1000 * 60 * 60); // hours
    }
    
    const averageVotingPeriod = completedProposals.length > 0 ? 
      totalVotingTime / completedProposals.length : 0;
    
    // Calculate top voters
    const voterStats: Record<string, { count: number; total: number }> = {};
    
    for (const proposal of proposals) {
      for (const vote of proposal.votes) {
        if (!voterStats[vote.voterId]) {
          voterStats[vote.voterId] = { count: 0, total: 0 };
        }
        voterStats[vote.voterId].count++;
        voterStats[vote.voterId].total++;
      }
    }
    
    const topVoters = Object.entries(voterStats)
      .map(([voterId, stats]) => ({
        voterId,
        votesCount: stats.count,
        participationRate: (stats.count / totalProposals) * 100
      }))
      .sort((a, b) => b.votesCount - a.votesCount)
      .slice(0, 5);
    
    return {
      totalProposals,
      activeProposals,
      passedProposals,
      rejectedProposals,
      averageParticipation,
      averageVotingPeriod,
      topVoters
    };
  }

  async getVotingHistory(identityId: string): Promise<GovernanceVote[]> {
    const votes: GovernanceVote[] = [];
    
    for (const proposal of this.proposals.values()) {
      const vote = proposal.votes.find(v => v.voterId === identityId);
      if (vote) {
        votes.push(vote);
      }
    }
    
    return votes.sort((a, b) => 
      new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime()
    );
  }

  async getProposalAnalytics(proposalId: string): Promise<any> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return null;
    }
    
    return {
      proposalId,
      votingProgress: {
        totalVotes: proposal.votes.length,
        yesVotes: proposal.votes.filter(v => v.vote === 'APPROVE').length,
        noVotes: proposal.votes.filter(v => v.vote === 'REJECT').length,
        abstainVotes: proposal.votes.filter(v => v.vote === 'ABSTAIN').length
      },
      weightedResults: {
        totalWeight: proposal.totalVotingWeight,
        yesWeight: proposal.yesVotingWeight,
        noWeight: proposal.noVotingWeight,
        abstainWeight: proposal.abstainVotingWeight
      },
      quorumStatus: {
        required: this.config.quorumThreshold,
        current: (proposal.totalVotingWeight / 100) * 100, // Mock calculation
        reached: proposal.quorumReached
      },
      approvalStatus: {
        required: this.config.approvalThreshold,
        current: proposal.totalVotingWeight > 0 ? 
          (proposal.yesVotingWeight / proposal.totalVotingWeight) * 100 : 0,
        reached: proposal.approvalReached
      }
    };
  }

  // Private helper methods
  private updateVotingWeights(proposal: TokenGovernanceProposal, vote: GovernanceVote, add: boolean): void {
    const multiplier = add ? 1 : -1;
    
    switch (vote.vote) {
      case 'APPROVE':
        proposal.yesVotingWeight += vote.weight * multiplier;
        break;
      case 'REJECT':
        proposal.noVotingWeight += vote.weight * multiplier;
        break;
      case 'ABSTAIN':
        proposal.abstainVotingWeight += vote.weight * multiplier;
        break;
    }
    
    if (add) {
      proposal.totalVotingWeight += vote.weight;
    } else {
      proposal.totalVotingWeight -= vote.weight;
    }
  }

  private async checkVotingResults(proposal: TokenGovernanceProposal): Promise<void> {
    // Check quorum
    const totalEligibleWeight = 100; // Mock - would be calculated from all eligible voters
    const participationRate = (proposal.totalVotingWeight / totalEligibleWeight) * 100;
    proposal.quorumReached = participationRate >= this.config.quorumThreshold;
    
    // Check approval
    if (proposal.totalVotingWeight > 0) {
      const approvalRate = (proposal.yesVotingWeight / proposal.totalVotingWeight) * 100;
      proposal.approvalReached = approvalRate >= this.config.approvalThreshold;
    }
    
    // Update status if voting period ended
    const now = new Date();
    if (new Date(proposal.votingEndsAt) <= now) {
      if (proposal.quorumReached && proposal.approvalReached) {
        proposal.status = 'PASSED';
      } else {
        proposal.status = 'REJECTED';
      }
    }
  }

  private generateId(): string {
    return `gov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadGovernanceData(): Promise<void> {
    try {
      // Load proposals
      const proposalsData = localStorage.getItem('token_governance_proposals');
      if (proposalsData) {
        const data = JSON.parse(proposalsData);
        this.proposals = new Map(Object.entries(data));
      }
      
      // Load role assignments
      const rolesData = localStorage.getItem('token_governance_roles');
      if (rolesData) {
        const data = JSON.parse(rolesData);
        this.roleAssignments = new Map(Object.entries(data));
      }
      
      // Load vote delegations
      const delegationsData = localStorage.getItem('token_governance_delegations');
      if (delegationsData) {
        const data = JSON.parse(delegationsData);
        this.voteDelegations = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('[TokenGovernanceService] Error loading governance data:', error);
    }
  }

  private async saveGovernanceData(): Promise<void> {
    try {
      // Save proposals
      const proposalsData = Object.fromEntries(this.proposals);
      localStorage.setItem('token_governance_proposals', JSON.stringify(proposalsData));
      
      // Save role assignments
      const rolesData = Object.fromEntries(this.roleAssignments);
      localStorage.setItem('token_governance_roles', JSON.stringify(rolesData));
      
      // Save vote delegations
      const delegationsData = Object.fromEntries(this.voteDelegations);
      localStorage.setItem('token_governance_delegations', JSON.stringify(delegationsData));
    } catch (error) {
      console.error('[TokenGovernanceService] Error saving governance data:', error);
    }
  }
}

// Export singleton instance
export const tokenGovernanceService = new TokenGovernanceService();
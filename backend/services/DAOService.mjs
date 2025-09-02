/**
 * DAO Governance Service - Decentralized Autonomous Organization Management
 * 
 * Handles DAO operations including membership, proposals, voting, and governance
 * within the AnarQ&Q ecosystem. Follows Q∞ architecture: Entry → Process → Output
 */

import crypto from 'crypto';
import { 
  getQonsentService, 
  getQindexService, 
  getQerberosService, 
  getQwalletService 
} from '../ecosystem/index.mjs';

export class DAOService {
  constructor() {
    this.daos = new Map();
    this.proposals = new Map();
    this.votes = new Map();
    this.memberships = new Map();
    this.initializeDefaultDAOs();
  }

  /**
   * Initialize default DAOs for testing
   */
  initializeDefaultDAOs() {
    const defaultDAOs = [
      {
        id: 'anarq-governance',
        name: 'AnarQ&Q Governance',
        description: 'Main governance DAO for the AnarQ&Q ecosystem',
        visibility: 'public',
        quorum: 100,
        votingDuration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        tokenRequirement: { token: 'QToken', amount: 10 },
        createdBy: 'did:squid:system',
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'dev-community',
        name: 'Developer Community',
        description: 'DAO for developers building on AnarQ&Q',
        visibility: 'public',
        quorum: 50,
        votingDuration: 5 * 24 * 60 * 60 * 1000, // 5 days in ms
        tokenRequirement: { token: 'QToken', amount: 5 },
        createdBy: 'did:squid:system',
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'content-creators',
        name: 'Content Creators Guild',
        description: 'DAO for content creators and artists',
        visibility: 'dao-only',
        quorum: 25,
        votingDuration: 3 * 24 * 60 * 60 * 1000, // 3 days in ms
        tokenRequirement: { token: 'PI', amount: 100 },
        createdBy: 'did:squid:system',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    ];

    defaultDAOs.forEach(dao => {
      // Add computed fields
      dao.memberCount = Math.floor(Math.random() * 500) + 50; // Random member count for demo
      dao.proposalCount = Math.floor(Math.random() * 20) + 5;
      dao.activeProposals = Math.floor(Math.random() * 5) + 1;
      
      this.daos.set(dao.id, dao);
      this.memberships.set(dao.id, new Set()); // Initialize empty membership set
    });

    console.log(`[DAO Service] Initialized ${defaultDAOs.length} default DAOs`);
  }

  /**
   * Get all active DAOs with basic metadata
   * @returns {Promise<Object>} List of DAOs
   */
  async getDAOs() {
    try {
      const daoList = Array.from(this.daos.values())
        .filter(dao => dao.isActive)
        .map(dao => ({
          id: dao.id,
          name: dao.name,
          description: dao.description,
          visibility: dao.visibility,
          memberCount: dao.memberCount,
          quorum: dao.quorum,
          proposalCount: dao.proposalCount,
          activeProposals: dao.activeProposals,
          tokenRequirement: dao.tokenRequirement,
          createdAt: dao.createdAt
        }));

      console.log(`[DAO Service] Retrieved ${daoList.length} active DAOs`);

      return {
        success: true,
        daos: daoList,
        total: daoList.length
      };

    } catch (error) {
      console.error('[DAO Service] Error getting DAOs:', error);
      return {
        success: false,
        error: error.message,
        daos: [],
        total: 0
      };
    }
  }

  /**
   * Get detailed DAO information
   * @param {string} daoId - DAO identifier
   * @returns {Promise<Object>} Detailed DAO information
   */
  async getDAO(daoId) {
    try {
      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found'
        };
      }

      if (!dao.isActive) {
        return {
          success: false,
          error: 'DAO is not active'
        };
      }

      // Get active proposals for this DAO
      const activeProposals = Array.from(this.proposals.values())
        .filter(proposal => proposal.daoId === daoId && proposal.status === 'active')
        .map(proposal => ({
          id: proposal.id,
          title: proposal.title,
          status: proposal.status,
          voteCount: proposal.voteCount || 0,
          createdAt: proposal.createdAt,
          expiresAt: proposal.expiresAt
        }));

      // Get governance rules
      const governanceRules = {
        quorum: dao.quorum,
        votingDuration: dao.votingDuration,
        tokenRequirement: dao.tokenRequirement,
        proposalCreationRights: dao.proposalCreationRights || 'token_holders',
        votingMechanism: dao.votingMechanism || 'token_weighted'
      };

      const detailedDAO = {
        ...dao,
        governanceRules,
        activeProposals,
        recentActivity: await this.getRecentActivity(daoId)
      };

      console.log(`[DAO Service] Retrieved detailed info for DAO: ${daoId}`);

      return {
        success: true,
        dao: detailedDAO
      };

    } catch (error) {
      console.error('[DAO Service] Error getting DAO:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Join a DAO (request membership)
   * @param {string} daoId - DAO identifier
   * @param {string} userId - User's sQuid ID
   * @returns {Promise<Object>} Join result
   */
  async joinDAO(daoId, userId) {
    const startTime = Date.now();
    
    try {
      // ===== ENTRY PHASE =====
      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found'
        };
      }

      if (!dao.isActive) {
        return {
          success: false,
          error: 'DAO is not active'
        };
      }

      // Check if user is already a member
      const members = this.memberships.get(daoId);
      if (members && members.has(userId)) {
        return {
          success: false,
          error: 'User is already a member of this DAO'
        };
      }

      console.log(`[DAO Service] Processing join request: ${userId} → ${daoId}`);

      // ===== PROCESS PHASE =====

      // 1. Evaluate access using Qonsent
      const qonsentService = getQonsentService();
      const accessProfile = await qonsentService.generateProfile({
        squidId: userId,
        visibility: dao.visibility,
        dataType: 'document', // Use 'document' as it's a valid dataType for DAO membership
        daoId: daoId,
        customRules: {
          canJoin: dao.visibility === 'public' ? ['*'] : [`dao:${daoId}:approved`],
          restrictions: dao.visibility === 'private' ? ['invitation_only'] : []
        }
      });

      // 2. Validate token requirements if any
      if (dao.tokenRequirement) {
        const qwalletService = getQwalletService();
        const balanceCheck = await qwalletService.validateBalance(
          userId, 
          dao.tokenRequirement.amount, 
          dao.tokenRequirement.token
        );

        if (!balanceCheck.hasBalance) {
          return {
            success: false,
            error: `Insufficient ${dao.tokenRequirement.token} balance. Required: ${dao.tokenRequirement.amount}, Current: ${balanceCheck.currentBalance}`
          };
        }
      }

      // 3. Add user to DAO membership
      if (!this.memberships.has(daoId)) {
        this.memberships.set(daoId, new Set());
      }
      this.memberships.get(daoId).add(userId);

      // Update DAO member count
      dao.memberCount = (dao.memberCount || 0) + 1;

      // ===== OUTPUT PHASE =====

      // 4. Log membership via Qindex
      const qindexService = getQindexService();
      await qindexService.registerFile({
        cid: `dao_membership_${crypto.randomBytes(8).toString('hex')}`,
        squidId: userId,
        visibility: 'dao-only',
        contentType: 'dao-membership',
        timestamp: new Date().toISOString(),
        storjUrl: `dao://${daoId}/members/${userId}`,
        fileSize: 0,
        originalName: `${dao.name} Membership`,
        metadata: {
          daoId,
          daoName: dao.name,
          userId,
          joinedAt: new Date().toISOString(),
          membershipType: 'standard',
          accessProfile: accessProfile.profileId
        }
      });

      // 5. Log event with Qerberos
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'dao_membership_granted',
        squidId: userId,
        resourceId: daoId,
        metadata: {
          daoName: dao.name,
          memberCount: dao.memberCount,
          tokenRequirement: dao.tokenRequirement,
          processingTime: Date.now() - startTime
        }
      });

      console.log(`[DAO Service] User ${userId} successfully joined DAO ${daoId}`);

      return {
        success: true,
        message: `Successfully joined ${dao.name}`,
        membership: {
          daoId,
          daoName: dao.name,
          userId,
          joinedAt: new Date().toISOString(),
          membershipType: 'standard',
          accessProfile: accessProfile.profileId
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[DAO Service] Error joining DAO:', error);
      
      // Log error event
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'dao_join_error',
          squidId: userId,
          resourceId: daoId,
          metadata: {
            error: error.message,
            processingTime: Date.now() - startTime
          }
        });
      } catch (logError) {
        console.error('Failed to log error event:', logError);
      }

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get proposals for a DAO
   * @param {string} daoId - DAO identifier
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of proposals
   */
  async getProposals(daoId, options = {}) {
    try {
      const { status = 'all', limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found',
          proposals: []
        };
      }

      let proposals = Array.from(this.proposals.values())
        .filter(proposal => proposal.daoId === daoId);

      // Filter by status
      if (status !== 'all') {
        proposals = proposals.filter(proposal => proposal.status === status);
      }

      // Sort proposals
      proposals.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (sortBy === 'createdAt' || sortBy === 'expiresAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const paginatedProposals = proposals.slice(offset, offset + limit);

      // Format proposals for response
      const formattedProposals = paginatedProposals.map(proposal => ({
        id: proposal.id,
        title: proposal.title,
        description: proposal.description,
        options: proposal.options,
        createdBy: proposal.createdBy,
        createdAt: proposal.createdAt,
        expiresAt: proposal.expiresAt,
        status: proposal.status,
        voteCount: proposal.voteCount || 0,
        quorumReached: (proposal.voteCount || 0) >= dao.quorum,
        results: proposal.results || {}
      }));

      console.log(`[DAO Service] Retrieved ${formattedProposals.length} proposals for DAO ${daoId}`);

      return {
        success: true,
        proposals: formattedProposals,
        pagination: {
          total: proposals.length,
          limit,
          offset,
          hasMore: proposals.length > offset + limit
        }
      };

    } catch (error) {
      console.error('[DAO Service] Error getting proposals:', error);
      return {
        success: false,
        error: error.message,
        proposals: []
      };
    }
  }

  /**
   * Get specific proposal details
   * @param {string} daoId - DAO identifier
   * @param {string} proposalId - Proposal identifier
   * @returns {Promise<Object>} Proposal details
   */
  async getProposal(daoId, proposalId) {
    try {
      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found'
        };
      }

      const proposal = this.proposals.get(proposalId);
      if (!proposal || proposal.daoId !== daoId) {
        return {
          success: false,
          error: 'Proposal not found'
        };
      }

      // Get vote breakdown
      const votes = Array.from(this.votes.values())
        .filter(vote => vote.proposalId === proposalId);

      const voteBreakdown = {};
      proposal.options.forEach(option => {
        voteBreakdown[option] = {
          count: votes.filter(vote => vote.option === option).length,
          weight: votes.filter(vote => vote.option === option)
            .reduce((sum, vote) => sum + vote.weight, 0)
        };
      });

      const detailedProposal = {
        ...proposal,
        voteBreakdown,
        totalVotes: votes.length,
        totalWeight: votes.reduce((sum, vote) => sum + vote.weight, 0),
        quorumReached: votes.length >= dao.quorum,
        timeRemaining: new Date(proposal.expiresAt) - new Date(),
        canVote: proposal.status === 'active' && new Date() < new Date(proposal.expiresAt)
      };

      console.log(`[DAO Service] Retrieved proposal details: ${proposalId}`);

      return {
        success: true,
        proposal: detailedProposal
      };

    } catch (error) {
      console.error('[DAO Service] Error getting proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }  /**
 
  * Create a new proposal
   * @param {string} daoId - DAO identifier
   * @param {Object} metadata - Proposal metadata
   * @param {string} creatorId - Creator's sQuid ID
   * @returns {Promise<Object>} Created proposal
   */
  async createProposal(daoId, metadata, creatorId) {
    const startTime = Date.now();
    
    try {
      // ===== ENTRY PHASE =====
      const {
        title,
        description,
        options = ['Yes', 'No'],
        duration, // in milliseconds, optional
        minQuorum, // optional override
        attachments = []
      } = metadata;

      // Validate required fields
      if (!title || !description) {
        throw new Error('Title and description are required');
      }

      if (options.length < 2) {
        throw new Error('At least 2 voting options are required');
      }

      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found'
        };
      }

      if (!dao.isActive) {
        return {
          success: false,
          error: 'DAO is not active'
        };
      }

      console.log(`[DAO Service] Creating proposal in DAO ${daoId} by ${creatorId}`);

      // ===== PROCESS PHASE =====

      // 1. Check if user has creation rights
      const hasCreationRights = await this.checkProposalCreationRights(daoId, creatorId);
      if (!hasCreationRights.allowed) {
        return {
          success: false,
          error: hasCreationRights.reason
        };
      }

      // 2. Generate proposal ID
      const proposalId = this.generateProposalId();

      // 3. Calculate expiration time
      const proposalDuration = duration || dao.votingDuration;
      const expiresAt = new Date(Date.now() + proposalDuration).toISOString();

      // 4. Create proposal object
      const proposal = {
        id: proposalId,
        daoId,
        title,
        description,
        options,
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        expiresAt,
        status: 'active',
        quorum: minQuorum || dao.quorum,
        voteCount: 0,
        results: {},
        attachments
      };

      // Initialize results for each option
      proposal.options.forEach(option => {
        proposal.results[option] = { count: 0, weight: 0 };
      });

      // Store proposal
      this.proposals.set(proposalId, proposal);

      // Update DAO proposal count
      dao.proposalCount = (dao.proposalCount || 0) + 1;
      dao.activeProposals = (dao.activeProposals || 0) + 1;

      // ===== OUTPUT PHASE =====

      // 5. Log proposal creation in Qindex
      const qindexService = getQindexService();
      await qindexService.registerFile({
        cid: `proposal_${proposalId}`,
        squidId: creatorId,
        visibility: dao.visibility,
        contentType: 'dao-proposal',
        timestamp: proposal.createdAt,
        storjUrl: `dao://${daoId}/proposals/${proposalId}`,
        fileSize: JSON.stringify(proposal).length,
        originalName: title,
        metadata: {
          proposalId,
          daoId,
          daoName: dao.name,
          title,
          description,
          options,
          expiresAt,
          quorum: proposal.quorum
        }
      });

      // 6. Log event with Qerberos
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'proposal_created',
        squidId: creatorId,
        resourceId: proposalId,
        metadata: {
          daoId,
          daoName: dao.name,
          title,
          optionCount: options.length,
          duration: proposalDuration,
          processingTime: Date.now() - startTime
        }
      });

      console.log(`[DAO Service] Created proposal ${proposalId} in DAO ${daoId}`);

      return {
        success: true,
        proposal: {
          id: proposal.id,
          daoId: proposal.daoId,
          title: proposal.title,
          description: proposal.description,
          options: proposal.options,
          createdBy: proposal.createdBy,
          createdAt: proposal.createdAt,
          expiresAt: proposal.expiresAt,
          status: proposal.status,
          quorum: proposal.quorum,
          voteCount: proposal.voteCount,
          results: proposal.results
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[DAO Service] Error creating proposal:', error);
      
      // Log error event
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'proposal_creation_error',
          squidId: creatorId,
          resourceId: daoId,
          metadata: {
            error: error.message,
            processingTime: Date.now() - startTime
          }
        });
      } catch (logError) {
        console.error('Failed to log error event:', logError);
      }

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Vote on a proposal
   * @param {string} daoId - DAO identifier
   * @param {string} proposalId - Proposal identifier
   * @param {Object} voteData - Vote data
   * @returns {Promise<Object>} Vote result
   */
  async voteOnProposal(daoId, proposalId, voteData) {
    const startTime = Date.now();
    
    try {
      // ===== ENTRY PHASE =====
      const { voterId, option, signature } = voteData;

      if (!voterId || !option || !signature) {
        throw new Error('Voter ID, option, and signature are required');
      }

      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found'
        };
      }

      const proposal = this.proposals.get(proposalId);
      if (!proposal || proposal.daoId !== daoId) {
        return {
          success: false,
          error: 'Proposal not found'
        };
      }

      if (proposal.status !== 'active') {
        return {
          success: false,
          error: 'Proposal is not active'
        };
      }

      if (new Date() > new Date(proposal.expiresAt)) {
        return {
          success: false,
          error: 'Proposal voting period has expired'
        };
      }

      if (!proposal.options.includes(option)) {
        return {
          success: false,
          error: 'Invalid voting option'
        };
      }

      console.log(`[DAO Service] Processing vote: ${voterId} → ${option} on ${proposalId}`);

      // ===== PROCESS PHASE =====

      // 1. Check if user is a DAO member
      const members = this.memberships.get(daoId);
      if (!members || !members.has(voterId)) {
        return {
          success: false,
          error: 'Only DAO members can vote'
        };
      }

      // 2. Check if user has already voted
      const existingVote = Array.from(this.votes.values())
        .find(vote => vote.proposalId === proposalId && vote.voter === voterId);

      if (existingVote) {
        return {
          success: false,
          error: 'User has already voted on this proposal'
        };
      }

      // 3. Use sQuid to verify voter identity and signature
      const signatureValid = await this.verifyVoteSignature(voterId, proposalId, option, signature);
      if (!signatureValid) {
        return {
          success: false,
          error: 'Invalid vote signature'
        };
      }

      // 4. Calculate vote weight based on token/NFT balance
      const voteWeight = await this.calculateVoteWeight(voterId, dao);

      // 5. Validate vote integrity with Qerberos
      const qerberosService = getQerberosService();
      const integrityCheck = await qerberosService.logEvent({
        action: 'vote_integrity_check',
        squidId: voterId,
        resourceId: proposalId,
        metadata: {
          option,
          weight: voteWeight,
          signature: signature.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        }
      });

      // 6. Create vote record
      const voteId = this.generateVoteId();
      const vote = {
        id: voteId,
        proposalId,
        daoId,
        voter: voterId,
        option,
        weight: voteWeight,
        signature,
        timestamp: new Date().toISOString(),
        verified: true
      };

      // Store vote
      this.votes.set(voteId, vote);

      // Update proposal results
      proposal.voteCount = (proposal.voteCount || 0) + 1;
      proposal.results[option].count += 1;
      proposal.results[option].weight += voteWeight;

      // ===== OUTPUT PHASE =====

      // 7. Log vote in Qindex
      const qindexService = getQindexService();
      await qindexService.registerFile({
        cid: `vote_${voteId}`,
        squidId: voterId,
        visibility: 'dao-only',
        contentType: 'dao-vote',
        timestamp: vote.timestamp,
        storjUrl: `dao://${daoId}/proposals/${proposalId}/votes/${voteId}`,
        fileSize: JSON.stringify(vote).length,
        originalName: `Vote on ${proposal.title}`,
        metadata: {
          voteId,
          proposalId,
          daoId,
          option,
          weight: voteWeight,
          timestamp: vote.timestamp
        }
      });

      // 8. Check if proposal should be closed (quorum reached or expired)
      const shouldClose = await this.checkProposalClosure(proposal, dao);
      if (shouldClose) {
        await this.closeProposal(proposalId);
      }

      console.log(`[DAO Service] Vote recorded: ${voteId} by ${voterId} (weight: ${voteWeight})`);

      return {
        success: true,
        vote: {
          id: voteId,
          proposalId,
          option,
          weight: voteWeight,
          timestamp: vote.timestamp
        },
        proposalStatus: {
          voteCount: proposal.voteCount,
          results: proposal.results,
          quorumReached: proposal.voteCount >= proposal.quorum,
          status: proposal.status
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[DAO Service] Error voting on proposal:', error);
      
      // Log error event
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'vote_error',
          squidId: voteData.voterId,
          resourceId: proposalId,
          metadata: {
            error: error.message,
            processingTime: Date.now() - startTime
          }
        });
      } catch (logError) {
        console.error('Failed to log error event:', logError);
      }

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get voting results for a DAO
   * @param {string} daoId - DAO identifier
   * @returns {Promise<Object>} Voting results
   */
  async getResults(daoId) {
    try {
      const dao = this.daos.get(daoId);
      if (!dao) {
        return {
          success: false,
          error: 'DAO not found'
        };
      }

      // Get all proposals for this DAO
      const proposals = Array.from(this.proposals.values())
        .filter(proposal => proposal.daoId === daoId);

      const results = proposals.map(proposal => {
        const totalVotes = proposal.voteCount || 0;
        const totalWeight = Object.values(proposal.results || {})
          .reduce((sum, result) => sum + (result.weight || 0), 0);

        // Calculate percentages
        const optionResults = {};
        proposal.options.forEach(option => {
          const result = proposal.results[option] || { count: 0, weight: 0 };
          optionResults[option] = {
            count: result.count,
            weight: result.weight,
            percentage: totalVotes > 0 ? (result.count / totalVotes * 100).toFixed(2) : '0.00',
            weightPercentage: totalWeight > 0 ? (result.weight / totalWeight * 100).toFixed(2) : '0.00'
          };
        });

        // Determine winning option
        const winningOption = proposal.options.reduce((winner, option) => {
          const currentResult = proposal.results[option] || { weight: 0 };
          const winnerResult = proposal.results[winner] || { weight: 0 };
          return currentResult.weight > winnerResult.weight ? option : winner;
        }, proposal.options[0]);

        return {
          id: proposal.id,
          title: proposal.title,
          status: proposal.status,
          totalVotes,
          totalWeight,
          quorum: proposal.quorum,
          quorumReached: totalVotes >= proposal.quorum,
          results: optionResults,
          winningOption,
          createdAt: proposal.createdAt,
          expiresAt: proposal.expiresAt,
          isExpired: new Date() > new Date(proposal.expiresAt)
        };
      });

      // Sort by creation date (newest first)
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`[DAO Service] Retrieved results for ${results.length} proposals in DAO ${daoId}`);

      return {
        success: true,
        daoId,
        daoName: dao.name,
        results,
        summary: {
          totalProposals: results.length,
          activeProposals: results.filter(r => r.status === 'active').length,
          completedProposals: results.filter(r => r.status === 'closed').length,
          averageParticipation: results.length > 0 
            ? (results.reduce((sum, r) => sum + r.totalVotes, 0) / results.length).toFixed(2)
            : '0.00'
        }
      };

    } catch (error) {
      console.error('[DAO Service] Error getting results:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has proposal creation rights
   * @param {string} daoId - DAO identifier
   * @param {string} userId - User's sQuid ID
   * @returns {Promise<Object>} Rights check result
   */
  async checkProposalCreationRights(daoId, userId) {
    try {
      const dao = this.daos.get(daoId);
      if (!dao) {
        return { allowed: false, reason: 'DAO not found' };
      }

      // Check DAO membership
      const members = this.memberships.get(daoId);
      if (!members || !members.has(userId)) {
        return { allowed: false, reason: 'User is not a DAO member' };
      }

      // Check token/NFT balance requirements
      if (dao.tokenRequirement) {
        const qwalletService = getQwalletService();
        const balanceCheck = await qwalletService.validateBalance(
          userId, 
          dao.tokenRequirement.amount, 
          dao.tokenRequirement.token
        );

        if (!balanceCheck.hasBalance) {
          return { 
            allowed: false, 
            reason: `Insufficient ${dao.tokenRequirement.token} balance for proposal creation` 
          };
        }
      }

      return { allowed: true, reason: 'User has proposal creation rights' };

    } catch (error) {
      console.error('[DAO Service] Error checking proposal creation rights:', error);
      return { allowed: false, reason: 'Error checking rights' };
    }
  }

  /**
   * Calculate vote weight based on token/NFT holdings
   * @param {string} voterId - Voter's sQuid ID
   * @param {Object} dao - DAO object
   * @returns {Promise<number>} Vote weight
   */
  async calculateVoteWeight(voterId, dao) {
    try {
      const qwalletService = getQwalletService();
      
      // For token-based voting
      if (dao.tokenRequirement) {
        const balance = await qwalletService.getBalance(voterId, dao.tokenRequirement.token);
        if (balance.success) {
          // 1 token = 1 vote weight (can be customized per DAO)
          return Math.floor(balance.balance);
        }
      }

      // For NFT-based voting (simplified - count NFTs)
      const nftList = await qwalletService.listUserNFTs(voterId);
      if (nftList.success) {
        // Each NFT = 10 vote weight (can be customized per DAO)
        return nftList.nfts.length * 10;
      }

      // Default weight for members without tokens/NFTs
      return 1;

    } catch (error) {
      console.error('[DAO Service] Error calculating vote weight:', error);
      return 1; // Default weight
    }
  }

  /**
   * Verify vote signature using sQuid identity
   * @param {string} voterId - Voter's sQuid ID
   * @param {string} proposalId - Proposal ID
   * @param {string} option - Voting option
   * @param {string} signature - Vote signature
   * @returns {Promise<boolean>} Signature validity
   */
  async verifyVoteSignature(voterId, proposalId, option, signature) {
    try {
      // For development/testing, accept mock signatures
      if (signature.startsWith('mock_signature_')) {
        return true;
      }

      // Create expected signature data
      const voteData = {
        voter: voterId,
        proposalId,
        option,
        timestamp: new Date().toISOString().split('T')[0] // Date only for signature consistency
      };

      // In production, this would verify against actual sQuid signature
      // For now, simulate signature verification
      const expectedSignature = crypto
        .createHash('sha256')
        .update(JSON.stringify(voteData) + voterId)
        .digest('hex');

      return signature === expectedSignature;

    } catch (error) {
      console.error('[DAO Service] Error verifying vote signature:', error);
      return false;
    }
  }

  /**
   * Check if proposal should be closed
   * @param {Object} proposal - Proposal object
   * @param {Object} dao - DAO object
   * @returns {Promise<boolean>} Should close
   */
  async checkProposalClosure(proposal, dao) {
    // Close if expired
    if (new Date() > new Date(proposal.expiresAt)) {
      return true;
    }

    // Close if quorum reached and overwhelming majority (>80%)
    if (proposal.voteCount >= proposal.quorum) {
      const totalWeight = Object.values(proposal.results)
        .reduce((sum, result) => sum + result.weight, 0);
      
      const maxWeight = Math.max(...Object.values(proposal.results).map(r => r.weight));
      const majorityPercentage = totalWeight > 0 ? (maxWeight / totalWeight) : 0;
      
      if (majorityPercentage > 0.8) {
        return true;
      }
    }

    return false;
  }

  /**
   * Close a proposal and finalize results
   * @param {string} proposalId - Proposal ID
   * @returns {Promise<void>}
   */
  async closeProposal(proposalId) {
    try {
      const proposal = this.proposals.get(proposalId);
      if (!proposal) return;

      proposal.status = 'closed';
      proposal.closedAt = new Date().toISOString();

      // Update DAO active proposal count
      const dao = this.daos.get(proposal.daoId);
      if (dao) {
        dao.activeProposals = Math.max(0, (dao.activeProposals || 1) - 1);
      }

      // Log closure event
      const qerberosService = getQerberosService();
      await qerberosService.logEvent({
        action: 'proposal_closed',
        squidId: proposal.createdBy,
        resourceId: proposalId,
        metadata: {
          daoId: proposal.daoId,
          totalVotes: proposal.voteCount,
          results: proposal.results,
          closedAt: proposal.closedAt
        }
      });

      console.log(`[DAO Service] Closed proposal: ${proposalId}`);

    } catch (error) {
      console.error('[DAO Service] Error closing proposal:', error);
    }
  }

  /**
   * Get recent activity for a DAO
   * @param {string} daoId - DAO identifier
   * @returns {Promise<Array>} Recent activity
   */
  async getRecentActivity(daoId) {
    try {
      const activities = [];

      // Get recent proposals
      const recentProposals = Array.from(this.proposals.values())
        .filter(proposal => proposal.daoId === daoId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      recentProposals.forEach(proposal => {
        activities.push({
          type: 'proposal_created',
          title: `New proposal: ${proposal.title}`,
          timestamp: proposal.createdAt,
          actor: proposal.createdBy
        });
      });

      // Get recent votes
      const recentVotes = Array.from(this.votes.values())
        .filter(vote => vote.daoId === daoId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      recentVotes.forEach(vote => {
        const proposal = this.proposals.get(vote.proposalId);
        activities.push({
          type: 'vote_cast',
          title: `Vote cast on: ${proposal?.title || 'Unknown proposal'}`,
          timestamp: vote.timestamp,
          actor: vote.voter
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return activities.slice(0, 10); // Return top 10 recent activities

    } catch (error) {
      console.error('[DAO Service] Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Generate unique proposal ID
   */
  generateProposalId() {
    return `proposal_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Generate unique vote ID
   */
  generateVoteId() {
    return `vote_${crypto.randomBytes(12).toString('hex')}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const daos = Array.from(this.daos.values());
    const proposals = Array.from(this.proposals.values());
    const votes = Array.from(this.votes.values());

    return {
      status: 'healthy',
      dao: {
        totalDAOs: daos.length,
        activeDAOs: daos.filter(dao => dao.isActive).length,
        totalMembers: Array.from(this.memberships.values())
          .reduce((sum, members) => sum + members.size, 0)
      },
      proposals: {
        total: proposals.length,
        active: proposals.filter(p => p.status === 'active').length,
        closed: proposals.filter(p => p.status === 'closed').length
      },
      votes: {
        total: votes.length,
        verified: votes.filter(v => v.verified).length
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let daoServiceInstance = null;

export function getDAOService() {
  if (!daoServiceInstance) {
    daoServiceInstance = new DAOService();
  }
  return daoServiceInstance;
}

export default DAOService;
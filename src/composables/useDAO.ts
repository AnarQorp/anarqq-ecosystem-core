/**
 * useDAO - React Hook for DAO Governance Integration
 * 
 * Provides DAO governance functionality including DAO management, proposal creation,
 * voting, and results aggregation for the AnarQ&Q ecosystem.
 */

import { useState, useCallback, useEffect } from 'react';
import { useSessionContext } from '../contexts/SessionContext';

// TypeScript interfaces based on Q∞ spec
export interface DAO {
  id: string;
  name: string;
  description: string;
  visibility: 'public' | 'dao-only' | 'private';
  memberCount: number;
  quorum: number;
  proposalCount: number;
  activeProposals: number;
  tokenRequirement: {
    token: string;
    amount: number;
  };
  createdAt: string;
}

export interface DetailedDAO extends Omit<DAO, 'activeProposals'> {
  governanceRules: {
    quorum: number;
    votingDuration: number;
    tokenRequirement: {
      token: string;
      amount: number;
    };
    proposalCreationRights: string;
    votingMechanism: string;
  };
  activeProposals: ProposalSummary[];
  recentActivity: Activity[];
}

export interface Proposal {
  id: string;
  daoId: string;
  title: string;
  description: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'closed';
  voteCount: number;
  quorum: number;
  results: Record<string, { count: number; weight: number }>;
  quorumReached: boolean;
}

export interface DetailedProposal extends Proposal {
  voteBreakdown: Record<string, { count: number; weight: number }>;
  totalVotes: number;
  totalWeight: number;
  timeRemaining: number;
  canVote: boolean;
}

export interface ProposalSummary {
  id: string;
  title: string;
  status: 'active' | 'closed';
  voteCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  option: string;
  weight: number;
  timestamp: string;
}

export interface VoteRequest {
  option: string;
  signature?: string;
}

export interface CreateProposalRequest {
  title: string;
  description: string;
  options: string[];
  durationHours?: number;
  minQuorum?: number;
  attachments?: string[];
}

export interface DAOResults {
  daoId: string;
  daoName: string;
  results: ProposalResult[];
  summary: {
    totalProposals: number;
    activeProposals: number;
    completedProposals: number;
    averageParticipation: string;
  };
}

export interface ProposalResult {
  id: string;
  title: string;
  status: 'active' | 'closed';
  totalVotes: number;
  totalWeight: number;
  quorum: number;
  quorumReached: boolean;
  results: Record<string, {
    count: number;
    weight: number;
    percentage: string;
    weightPercentage: string;
  }>;
  winningOption: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface Activity {
  type: string;
  title: string;
  timestamp: string;
  actor: string;
}

export interface Membership {
  daoId: string;
  userId: string;
  isMember: boolean;
  canCreateProposals: boolean;
  memberSince: string | null;
  permissions: {
    canVote: boolean;
    canCreateProposals: boolean;
    canModerate: boolean;
  };
}

export interface DAOStats {
  daoId: string;
  name: string;
  memberCount: number;
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  averageParticipation: string;
  governanceRules: any;
  recentActivity: Activity[];
}

export interface UseDAOReturn {
  // State
  daos: DAO[];
  currentDAO: DetailedDAO | null;
  proposals: Proposal[];
  currentProposal: DetailedProposal | null;
  results: DAOResults | null;
  membership: Membership | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  getDAOs: () => Promise<DAO[]>;
  getDAO: (daoId: string) => Promise<DetailedDAO | null>;
  joinDAO: (daoId: string) => Promise<boolean>;
  getProposals: (daoId: string, options?: {
    status?: 'all' | 'active' | 'closed';
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => Promise<Proposal[]>;
  getProposal: (daoId: string, proposalId: string) => Promise<DetailedProposal | null>;
  createProposal: (daoId: string, payload: CreateProposalRequest) => Promise<Proposal | null>;
  voteOnProposal: (daoId: string, proposalId: string, vote: VoteRequest) => Promise<Vote | null>;
  getResults: (daoId: string) => Promise<DAOResults | null>;
  getMembership: (daoId: string) => Promise<Membership | null>;
  getDAOStats: (daoId: string) => Promise<DAOStats | null>;
  
  // Utilities
  clearError: () => void;
  refreshDAOData: (daoId?: string) => Promise<void>;
}

const API_BASE = '/api/dao';

export const useDAO = (): UseDAOReturn => {
  const { session, isAuthenticated } = useSessionContext();
  
  // State
  const [daos, setDAOs] = useState<DAO[]>([]);
  const [currentDAO, setCurrentDAO] = useState<DetailedDAO | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentProposal, setCurrentProposal] = useState<DetailedProposal | null>(null);
  const [results, setResults] = useState<DAOResults | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to create sQuid authentication headers
  const createAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isAuthenticated && session) {
      // Create sQuid identity headers for authentication
      const message = JSON.stringify({
        action: 'dao_operation',
        timestamp: new Date().toISOString(),
        did: session.issuer
      });
      
      // Create a mock signature for development
      // In production, this would use actual sQuid signing
      const signature = btoa(message + session.issuer).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
      
      headers['X-Identity-DID'] = session.issuer;
      headers['X-Message'] = message;
      headers['X-Signature'] = signature;
    }

    return headers;
  }, [isAuthenticated, session]);

  // Helper function to make API calls
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      ...createAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [createAuthHeaders]);

  // Get all DAOs
  const getDAOs = useCallback(async (): Promise<DAO[]> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall('/list');
      
      if (response.success) {
        const daoList = response.data;
        setDAOs(daoList);
        return daoList;
      }
      
      throw new Error(response.error || 'Failed to get DAOs');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get DAOs';
      setError(errorMessage);
      console.error('Get DAOs error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Get detailed DAO information
  const getDAO = useCallback(async (daoId: string): Promise<DetailedDAO | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall(`/${daoId}`);
      
      if (response.success) {
        const dao = response.data;
        setCurrentDAO(dao);
        return dao;
      }
      
      throw new Error(response.error || 'Failed to get DAO details');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get DAO details';
      setError(errorMessage);
      console.error('Get DAO error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Join a DAO
  const joinDAO = useCallback(async (daoId: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      
      if (!isAuthenticated) {
        throw new Error('Authentication required to join DAO');
      }
      
      const response = await apiCall(`/${daoId}/join`, {
        method: 'POST'
      });
      
      if (response.success) {
        // Refresh DAO data after successful join
        await getDAO(daoId);
        await getMembership(daoId);
        return true;
      }
      
      throw new Error(response.error || 'Failed to join DAO');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join DAO';
      setError(errorMessage);
      console.error('Join DAO error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiCall, isAuthenticated]);

  // Get proposals for a DAO
  const getProposals = useCallback(async (
    daoId: string, 
    options: {
      status?: 'all' | 'active' | 'closed';
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<Proposal[]> => {
    try {
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      
      const endpoint = `/${daoId}/proposals${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiCall(endpoint);
      
      if (response.success) {
        const proposalList = response.data;
        setProposals(proposalList);
        return proposalList;
      }
      
      throw new Error(response.error || 'Failed to get proposals');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get proposals';
      setError(errorMessage);
      console.error('Get proposals error:', err);
      return [];
    }
  }, [apiCall]);

  // Get specific proposal details
  const getProposal = useCallback(async (daoId: string, proposalId: string): Promise<DetailedProposal | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiCall(`/${daoId}/proposals/${proposalId}`);
      
      if (response.success) {
        const proposal = response.data;
        setCurrentProposal(proposal);
        return proposal;
      }
      
      throw new Error(response.error || 'Failed to get proposal details');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get proposal details';
      setError(errorMessage);
      console.error('Get proposal error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Create a new proposal
  const createProposal = useCallback(async (daoId: string, payload: CreateProposalRequest): Promise<Proposal | null> => {
    try {
      setError(null);
      setLoading(true);
      
      if (!isAuthenticated) {
        throw new Error('Authentication required to create proposal');
      }
      
      // Convert durationHours to milliseconds if provided
      const requestPayload = {
        ...payload,
        duration: payload.durationHours ? payload.durationHours * 60 * 60 * 1000 : undefined
      };
      
      const response = await apiCall(`/${daoId}/proposals`, {
        method: 'POST',
        body: JSON.stringify(requestPayload)
      });
      
      if (response.success) {
        const proposal = response.data;
        
        // Refresh proposals after successful creation
        await getProposals(daoId);
        await getDAO(daoId);
        
        return proposal;
      }
      
      throw new Error(response.error || 'Failed to create proposal');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(errorMessage);
      console.error('Create proposal error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, isAuthenticated, getProposals, getDAO]);

  // Vote on a proposal
  const voteOnProposal = useCallback(async (daoId: string, proposalId: string, vote: VoteRequest): Promise<Vote | null> => {
    try {
      setError(null);
      setLoading(true);
      
      if (!isAuthenticated) {
        throw new Error('Authentication required to vote');
      }
      
      // Create vote signature if not provided
      const votePayload = {
        option: vote.option,
        signature: vote.signature || `mock_signature_${Date.now()}`
      };
      
      const response = await apiCall(`/${daoId}/proposals/${proposalId}/vote`, {
        method: 'POST',
        body: JSON.stringify(votePayload)
      });
      
      if (response.success) {
        const voteResult = response.data.vote;
        
        // Refresh proposal data after successful vote
        await getProposal(daoId, proposalId);
        await getResults(daoId);
        
        return voteResult;
      }
      
      throw new Error(response.error || 'Failed to vote on proposal');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote on proposal';
      setError(errorMessage);
      console.error('Vote on proposal error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, isAuthenticated]);

  // Get voting results for a DAO
  const getResults = useCallback(async (daoId: string): Promise<DAOResults | null> => {
    try {
      setError(null);
      
      const response = await apiCall(`/${daoId}/results`);
      
      if (response.success) {
        const daoResults = response.data;
        setResults(daoResults);
        return daoResults;
      }
      
      throw new Error(response.error || 'Failed to get results');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get results';
      setError(errorMessage);
      console.error('Get results error:', err);
      return null;
    }
  }, [apiCall]);

  // Get membership status
  const getMembership = useCallback(async (daoId: string): Promise<Membership | null> => {
    try {
      setError(null);
      
      if (!isAuthenticated) {
        return null;
      }
      
      const response = await apiCall(`/${daoId}/membership`);
      
      if (response.success) {
        const membershipData = response.data;
        setMembership(membershipData);
        return membershipData;
      }
      
      throw new Error(response.error || 'Failed to get membership status');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get membership status';
      setError(errorMessage);
      console.error('Get membership error:', err);
      return null;
    }
  }, [apiCall, isAuthenticated]);

  // Get DAO statistics
  const getDAOStats = useCallback(async (daoId: string): Promise<DAOStats | null> => {
    try {
      setError(null);
      
      const response = await apiCall(`/${daoId}/stats`);
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to get DAO stats');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get DAO stats';
      setError(errorMessage);
      console.error('Get DAO stats error:', err);
      return null;
    }
  }, [apiCall]);

  // Refresh DAO data
  const refreshDAOData = useCallback(async (daoId?: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Always refresh the DAO list
      await getDAOs();
      
      // If a specific DAO is provided, refresh its data
      if (daoId) {
        await Promise.all([
          getDAO(daoId),
          getProposals(daoId),
          getResults(daoId),
          isAuthenticated ? getMembership(daoId) : Promise.resolve()
        ]);
      }
    } catch (err) {
      console.error('Refresh DAO data error:', err);
    } finally {
      setLoading(false);
    }
  }, [getDAOs, getDAO, getProposals, getResults, getMembership, isAuthenticated]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load DAOs on mount
  useEffect(() => {
    getDAOs();
  }, [getDAOs]);

  return {
    // State
    daos,
    currentDAO,
    proposals,
    currentProposal,
    results,
    membership,
    loading,
    error,
    
    // Actions
    getDAOs,
    getDAO,
    joinDAO,
    getProposals,
    getProposal,
    createProposal,
    voteOnProposal,
    getResults,
    getMembership,
    getDAOStats,
    
    // Utilities
    clearError,
    refreshDAOData
  };
};
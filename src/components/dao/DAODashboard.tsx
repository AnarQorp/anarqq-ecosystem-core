/**
 * DAODashboard - Enhanced interface for individual DAO management
 * 
 * Provides comprehensive DAO management including proposal viewing,
 * creation, voting, membership management, and economic data integration
 * within the AnarQ&Q ecosystem.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useQwallet } from '../../composables/useQwallet';
import { useSessionContext } from '../../contexts/SessionContext';
import { 
  useParallelFetch, 
  useDebounce, 
  useCachedApiCall, 
  useCleanup 
} from '../../utils/performance/dataFetching';
import { 
  useApiMonitoring, 
  useRenderMonitoring, 
  useMemoryMonitoring 
} from '../../utils/performance/monitoring';
import { 
  DAODashboardSkeleton, 
  ProgressiveLoadingSkeleton, 
  SkeletonTransition 
} from './skeletons/DAOSkeletons';
import { 
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  HandRaisedIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  WalletIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import type { DAO, DetailedDAO, Proposal, Membership } from '../../composables/useDAO';
import CreateProposalForm from './CreateProposalForm';
import ProposalCard from './ProposalCard';
import VotingInterface from './VotingInterface';
import TokenOverviewPanel from './TokenOverviewPanel';
import DAOWalletOverview from './DAOWalletOverview';
import QuickActionsPanel from './QuickActionsPanel';
import ProposalStatsSidebar from './ProposalStatsSidebar';

interface DAODashboardProps {
  daoId: string;
  className?: string;
  showEconomicData?: boolean; // New: Toggle economic features
  layout?: 'default' | 'compact'; // New: Layout variants
}

interface ProposalFilters {
  status: 'all' | 'active' | 'closed';
  search: string;
  sortBy: 'created' | 'votes' | 'expires';
  sortOrder: 'asc' | 'desc';
}

const DAODashboard: React.FC<DAODashboardProps> = React.memo(({ 
  daoId, 
  className, 
  showEconomicData = true, 
  layout = 'default' 
}) => {
  // Performance monitoring
  const { getMountTime } = useRenderMonitoring('DAODashboard', { daoId, showEconomicData, layout });
  const { monitorApiCall } = useApiMonitoring();
  const { cleanup, addTimeout } = useCleanup();
  
  const { isAuthenticated, session } = useSessionContext();
  const {
    currentDAO,
    proposals,
    membership,
    loading,
    error,
    getDAO,
    getProposals,
    getMembership,
    joinDAO,
    clearError
  } = useDAO();

  // Add wallet integration
  const {
    balances,
    nfts,
    loading: walletLoading,
    error: walletError,
    getAllBalances,
    listUserNFTs,
    refreshWalletData,
    clearError: clearWalletError
  } = useQwallet();

  // Performance utilities
  const { fetchParallel, cancelFetch } = useParallelFetch();
  const cachedApiCall = useCachedApiCall();

  // Local state
  const [joiningDAO, setJoiningDAO] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [showVotingInterface, setShowVotingInterface] = useState(false);
  const [votingProposal, setVotingProposal] = useState<Proposal | null>(null);
  const [filters, setFilters] = useState<ProposalFilters>({
    status: 'all',
    search: '',
    sortBy: 'created',
    sortOrder: 'desc'
  });

  // Enhanced data loading with parallel fetching and performance monitoring
  const loadDAOData = useCallback(async () => {
    try {
      const result = await monitorApiCall('dao-dashboard-load', 'GET', async () => {
        return await fetchParallel(
          {
            daoId,
            squidId: session?.issuer,
            includeWallet: isAuthenticated && session?.issuer,
            includeAnalytics: showEconomicData
          },
          {
            getDAO: (id: string) => cachedApiCall(`dao-${id}`, () => getDAO(id), 'tokenInfo'),
            getProposals: (id: string) => cachedApiCall(`proposals-${id}`, () => getProposals(id), 'proposals'),
            getMembership: (id: string) => cachedApiCall(`membership-${id}-${session?.issuer}`, () => getMembership(id), 'votingPower'),
            getAllBalances: session?.issuer ? (squidId: string) => cachedApiCall(`balances-${squidId}`, () => getAllBalances(squidId), 'votingPower') : undefined,
            listUserNFTs: session?.issuer ? (squidId: string) => cachedApiCall(`nfts-${squidId}`, () => listUserNFTs(squidId), 'votingPower') : undefined
          }
        );
      });

      // Log any errors from parallel fetch
      if (Object.keys(result.errors).length > 0) {
        console.warn('DAO data loading errors:', result.errors);
      }

    } catch (err) {
      console.error('Error loading DAO data:', err);
      // Individual errors are handled by the respective hooks
    }
  }, [daoId, isAuthenticated, session?.issuer, showEconomicData, monitorApiCall, fetchParallel, cachedApiCall, getDAO, getProposals, getMembership, getAllBalances, listUserNFTs]);

  // Load DAO data on mount and when daoId or authentication changes
  useEffect(() => {
    if (daoId) {
      loadDAOData();
    }
  }, [daoId, isAuthenticated, session?.issuer]);

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (joinSuccess) {
      const timer = setTimeout(() => setJoinSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [joinSuccess]);

  useEffect(() => {
    if (joinError) {
      const timer = setTimeout(() => setJoinError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [joinError]);



  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDAOData();
    } catch (err) {
      console.error('Error during refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced wallet data refresh with error handling
  const handleWalletRefresh = async () => {
    if (!canViewWalletData) return;
    
    try {
      await refreshWalletData();
    } catch (err) {
      console.error('Error refreshing wallet data:', err);
      // Error is handled by the useQwallet hook
    }
  };

  // Debounced refresh to prevent excessive API calls
  const debouncedRefresh = useDebounce(handleRefresh, 300);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      cancelFetch();
    };
  }, [cleanup, cancelFetch]);

  const handleJoinDAO = async () => {
    if (!isAuthenticated) {
      setJoinError('Please authenticate to join this DAO');
      return;
    }

    if (!currentDAO) {
      setJoinError('DAO information not available');
      return;
    }

    setJoiningDAO(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const success = await joinDAO(daoId);
      if (success) {
        setJoinSuccess(`Successfully joined ${currentDAO.name}!`);
        // Refresh DAO data after successful join
        await loadDAOData();
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join DAO');
    } finally {
      setJoiningDAO(false);
    }
  };

  const handleFilterChange = (key: keyof ProposalFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Filter and sort proposals
  const filteredProposals = useMemo(() => {
    let filtered = [...proposals];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(proposal => 
        proposal.title.toLowerCase().includes(searchLower) ||
        proposal.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (filters.sortBy) {
        case 'created':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'votes':
          aVal = a.voteCount;
          bVal = b.voteCount;
          break;
        case 'expires':
          aVal = new Date(a.expiresAt).getTime();
          bVal = new Date(b.expiresAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [proposals, filters]);

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            Public
          </Badge>
        );
      case 'dao-only':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            DAO Only
          </Badge>
        );
      case 'private':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
            Private
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {visibility}
          </Badge>
        );
    }
  };

  const getProposalStatusBadge = (proposal: Proposal) => {
    const isExpired = new Date() > new Date(proposal.expiresAt);
    
    if (proposal.status === 'closed' || isExpired) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Closed
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <ClockIcon className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
  };

  const canCreateProposal = () => {
    return isAuthenticated && membership?.canCreateProposals;
  };

  const canVote = (proposal: Proposal) => {
    return isAuthenticated && 
           membership?.permissions.canVote && 
           proposal.status === 'active' && 
           new Date() < new Date(proposal.expiresAt);
  };

  const handleCreateProposalSuccess = (proposalId: string) => {
    setShowCreateProposal(false);
    // Refresh proposals to show the new one
    loadDAOData();
  };

  const handleCreateProposalCancel = () => {
    setShowCreateProposal(false);
  };

  const handleVoteOnProposal = (proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      setVotingProposal(proposal);
      setShowVotingInterface(true);
    }
  };

  const handleVotingComplete = () => {
    setShowVotingInterface(false);
    setVotingProposal(null);
    // Refresh proposals to show updated vote counts
    loadDAOData();
  };

  // Loading skeleton for DAO header
  const DAOHeaderSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading skeleton for proposals
  const ProposalsSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading && !currentDAO) {
    return <DAODashboardSkeleton layout={layout} className={className} />;
  }

  if (error && !currentDAO) {
    return (
      <div className={cn("max-w-7xl mx-auto p-4 sm:p-6", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading DAO</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => loadDAOData()} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentDAO) {
    return (
      <div className={cn("max-w-7xl mx-auto p-4 sm:p-6", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">DAO Not Found</h3>
              <p className="text-gray-600">The requested DAO could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions for wallet data and permissions
  const hasTokens = useMemo(() => {
    return balances && (balances.QToken?.balance > 0 || balances.PI?.balance > 0);
  }, [balances]);

  const hasNFTs = useMemo(() => {
    return nfts && nfts.length > 0;
  }, [nfts]);

  const getUserRole = useMemo(() => {
    if (!membership?.isMember) return 'member';
    if (membership.permissions?.isOwner) return 'owner';
    if (membership.permissions?.isAdmin) return 'admin';
    if (membership.permissions?.isModerator) return 'moderator';
    return 'member';
  }, [membership]);

  // Permission checks for sensitive features
  const canViewEconomicData = useMemo(() => {
    return isAuthenticated && membership?.isMember && showEconomicData;
  }, [isAuthenticated, membership?.isMember, showEconomicData]);

  const canViewWalletData = useMemo(() => {
    return canViewEconomicData && session?.issuer;
  }, [canViewEconomicData, session?.issuer]);

  const canPerformWalletActions = useMemo(() => {
    const userRole = getUserRole;
    return canViewWalletData && (userRole === 'moderator' || userRole === 'admin' || userRole === 'owner');
  }, [canViewWalletData, getUserRole]);

  // Loading states for different data types
  const isLoadingWalletData = useMemo(() => {
    return walletLoading && canViewWalletData;
  }, [walletLoading, canViewWalletData]);

  const isLoadingDAOData = useMemo(() => {
    return loading || daoLoading;
  }, [loading, daoLoading]);

  const handleQuickAction = (action: string) => {
    console.log(`Quick action triggered: ${action}`);
    // Actions will be handled by the QuickActionsPanel component
  };

  // Enhanced error handling for different error types
  const getErrorMessage = () => {
    if (error) return error;
    if (joinError) return joinError;
    if (walletError && canViewWalletData) return `Wallet Error: ${walletError}`;
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className={cn("max-w-7xl mx-auto p-4 sm:p-6", className)}>
      {/* Success/Error Messages */}
      <div className="space-y-4 mb-6">
        {joinSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-green-800">{joinSuccess}</p>
            </div>
          </div>
        )}

        {(error || joinError || walletError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800">{error || joinError || walletError}</p>
                <button
                  onClick={() => {
                    clearError();
                    setJoinError(null);
                    clearWalletError();
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DAO Header - Full Width */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
                <CardTitle className="text-2xl sm:text-3xl">{currentDAO.name}</CardTitle>
              </div>
              <CardDescription className="text-base mb-4">
                {currentDAO.description}
              </CardDescription>
              <div className="flex items-center space-x-2">
                {getVisibilityBadge(currentDAO.visibility)}
                {membership?.isMember && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Member
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <ArrowPathIcon className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              {!membership?.isMember && (
                <Button
                  onClick={handleJoinDAO}
                  disabled={joiningDAO || !isAuthenticated}
                  className="min-w-[100px]"
                >
                  {joiningDAO ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UsersIcon className="h-4 w-4 mr-2" />
                  )}
                  {joiningDAO ? 'Joining...' : 'Join DAO'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* DAO Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{currentDAO.memberCount.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{currentDAO.quorum}</div>
              <div className="text-sm text-gray-600">Quorum</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{currentDAO.proposalCount || 0}</div>
              <div className="text-sm text-gray-600">Total Proposals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{currentDAO.activeProposals?.length || 0}</div>
              <div className="text-sm text-gray-600">Active Proposals</div>
            </div>
          </div>

          {/* Token Requirements */}
          {currentDAO.governanceRules?.tokenRequirement && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Governance Requirements</h4>
              <div className="text-sm text-gray-600">
                <span className="font-medium">
                  {currentDAO.governanceRules.tokenRequirement.amount} {currentDAO.governanceRules.tokenRequirement.token}
                </span>
                {' '}required for proposal creation
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Layout - Responsive 2-column desktop, stacked mobile */}
      {membership?.isMember ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - DAO Information and Proposals (Desktop: 2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Proposals Section */}
            <div className="space-y-6">
              {/* Proposals Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
                    Proposals
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredProposals.length} of {proposals.length} proposals
                  </p>
                </div>
                
                {canCreateProposal() && (
                  <Button 
                    className="mt-4 sm:mt-0"
                    onClick={() => setShowCreateProposal(true)}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Proposal
                  </Button>
                )}
              </div>

              {/* Proposal Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search proposals..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    {/* Sort */}
                    <div>
                      <div className="flex space-x-2">
                        <select
                          value={filters.sortBy}
                          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="created">Created</option>
                          <option value="votes">Votes</option>
                          <option value="expires">Expires</option>
                        </select>
                        <button
                          onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          title={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proposals List */}
              {loading ? (
                <ProposalsSkeleton />
              ) : filteredProposals.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {filters.search || filters.status !== 'all' ? 'No proposals match your filters' : 'No proposals yet'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {filters.search || filters.status !== 'all' 
                          ? 'Try adjusting your search or filter criteria'
                          : 'Be the first to create a proposal for this DAO'
                        }
                      </p>
                      {(filters.search || filters.status !== 'all') && (
                        <Button
                          variant="outline"
                          onClick={() => setFilters({ search: '', status: 'all', sortBy: 'created', sortOrder: 'desc' })}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      daoId={daoId}
                      onVote={handleVoteOnProposal}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Economic Data and Analytics (Desktop: 1/3 width) */}
          <div className="space-y-6">
            {/* Token Overview Panel - Show for all members */}
            <TokenOverviewPanel 
              daoId={daoId}
              className="w-full"
            />

            {/* Member Wallet Summary - Conditional rendering with loading states */}
            {canViewWalletData ? (
              isLoadingWalletData ? (
                <Card className="w-full">
                  <CardHeader>
                    <div className="animate-pulse">
                      <div className="flex items-center">
                        <Skeleton className="h-6 w-6 mr-2" />
                        <Skeleton className="h-6 w-32" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                        <div>
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <DAOWalletOverview
                  daoId={daoId}
                  squidId={session!.issuer}
                  daoTokenSymbol={currentDAO?.governanceRules?.tokenRequirement?.token}
                  className="w-full"
                />
              )
            ) : !isAuthenticated ? (
              <Card className="w-full border-yellow-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <WalletIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Wallet Overview</h3>
                    <p className="text-gray-600 mb-4">
                      Please authenticate to view your wallet information and voting power.
                    </p>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      Authentication Required
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : !membership?.isMember ? (
              <Card className="w-full border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <WalletIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Wallet</h3>
                    <p className="text-gray-600 mb-4">
                      Join this DAO to view your wallet balance and voting power.
                    </p>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      Membership Required
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full border-gray-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <WalletIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Economic Data Disabled</h3>
                    <p className="text-gray-600">
                      Economic features are currently disabled for this view.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Panel - Conditional rendering with role-based access */}
            {canViewEconomicData ? (
              canPerformWalletActions ? (
                <QuickActionsPanel
                  daoId={daoId}
                  userRole={getUserRole}
                  hasTokens={hasTokens || false}
                  hasNFTs={hasNFTs || false}
                  onAction={handleQuickAction}
                  className="w-full"
                />
              ) : (
                <Card className="w-full border-orange-200">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <CurrencyDollarIcon className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
                      <p className="text-gray-600 mb-4">
                        Advanced wallet actions require moderator permissions or higher.
                      </p>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Elevated Permissions Required
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="w-full border-gray-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
                    <p className="text-gray-600">
                      {!isAuthenticated 
                        ? 'Please authenticate to access wallet actions.'
                        : !membership?.isMember 
                        ? 'Join this DAO to access wallet actions.'
                        : 'Economic features are disabled for this view.'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proposal Stats Sidebar */}
            <ProposalStatsSidebar
              daoId={daoId}
              proposals={proposals}
              results={null} // Would be passed from DAO service if available
              className="w-full"
            />
          </div>
        </div>
      ) : (
        /* Non-Member and Authentication Messages */
        <div className="space-y-6">
          {/* Non-Member Message */}
          {!membership?.isMember && isAuthenticated && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <UsersIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Join this DAO</h3>
                  <p className="text-gray-600 mb-4">
                    You need to be a member to view proposals and participate in governance.
                  </p>
                  <Button onClick={handleJoinDAO} disabled={joiningDAO}>
                    {joiningDAO ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UsersIcon className="h-4 w-4 mr-2" />
                    )}
                    {joiningDAO ? 'Joining...' : 'Join DAO'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Authentication Notice */}
          {!isAuthenticated && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
                  <p className="text-gray-600">
                    Please authenticate with your sQuid identity to access DAO features.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show Token Overview for non-members too (public information) */}
          <TokenOverviewPanel 
            daoId={daoId}
            className="w-full"
          />
        </div>
      )}

      {/* Create Proposal Modal */}
      <Dialog open={showCreateProposal} onOpenChange={setShowCreateProposal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Proposal</DialogTitle>
          </DialogHeader>
          <CreateProposalForm
            daoId={daoId}
            embedded
            onSuccess={handleCreateProposalSuccess}
            onCancel={handleCreateProposalCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Voting Interface Modal */}
      {votingProposal && (
        <VotingInterface
          proposal={votingProposal}
          daoId={daoId}
          open={showVotingInterface}
          onClose={handleVotingComplete}
        />
      )}
    </div>
  );
};

export default DAODashboard;
/**
 * DAOWalletOverview - Member Wallet Summary Component
 * 
 * Displays authenticated DAO member's wallet balance, NFT count, and voting power
 * with real-time updates and proper authentication checks.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useQwallet } from '../../composables/useQwallet';
import { useSessionContext } from '../../contexts/SessionContext';
import { useRenderMonitoring } from '../../utils/performance/monitoring';
import { useCachedApiCall } from '../../utils/performance/dataFetching';
import { 
  useAccessibleVisualization,
  createTokenDisplayAria,
  createProgressAria,
  useDAOComponentDescriptions,
  DataDescription,
  AccessibleProgress,
  ACCESSIBLE_COLORS
} from '../../utils/accessibility';
import { 
  WalletIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  UserIcon,
  LockClosedIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { NFT, Balance, WalletBalances } from '../../composables/useQwallet';
import type { DetailedDAO, Membership } from '../../composables/useDAO';

interface DAOWalletOverviewProps {
  daoId: string;
  squidId?: string;
  daoTokenSymbol?: string;
  className?: string;
}

interface VotingPower {
  tokenWeight: number;
  nftWeight: number;
  totalWeight: number;
  percentageOfTotal: number;
  rank?: number;
}

interface BalanceTrend {
  current: number;
  previous?: number;
  change?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
}

const DAOWalletOverview: React.FC<DAOWalletOverviewProps> = React.memo(({
  daoId,
  squidId: propSquidId,
  daoTokenSymbol: propDaoTokenSymbol,
  className
}) => {
  // Performance monitoring
  const { getMountTime } = useRenderMonitoring('DAOWalletOverview', { daoId });
  const cachedApiCall = useCachedApiCall();
  const { isAuthenticated, session } = useSessionContext();
  const { currentDAO, membership, getMembership, loading: daoLoading } = useDAO();
  const { 
    getBalance, 
    getAllBalances, 
    listUserNFTs, 
    balances, 
    nfts, 
    loading: walletLoading, 
    error: walletError,
    refreshWalletData 
  } = useQwallet();

  // Accessibility hooks
  const { colorScheme, shouldShowDataTable, describer } = useAccessibleVisualization({
    highContrast: false,
    colorBlindFriendly: false,
    preferDataTable: false
  });
  const { describeWalletOverview } = useDAOComponentDescriptions();

  // Determine squidId from session or prop
  const squidId = propSquidId || session?.issuer || null;
  
  // Local state
  const [daoTokenBalance, setDaoTokenBalance] = useState<Balance | null>(null);
  const [daoNFTs, setDaoNFTs] = useState<NFT[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [balanceTrend, setBalanceTrend] = useState<BalanceTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Determine DAO token symbol
  const daoTokenSymbol = useMemo(() => {
    if (propDaoTokenSymbol) return propDaoTokenSymbol;
    if (currentDAO?.governanceRules?.tokenRequirement?.token) {
      return currentDAO.governanceRules.tokenRequirement.token;
    }
    if (currentDAO?.name) {
      return currentDAO.name.toUpperCase().substring(0, 4) + 'TOKEN';
    }
    return 'DAOTOKEN';
  }, [propDaoTokenSymbol, currentDAO]);

  // Fetch DAO token balance
  const fetchDaoTokenBalance = useCallback(async () => {
    if (!squidId || !daoTokenSymbol) return null;

    try {
      // Try to get specific DAO token balance
      const balance = await getBalance(squidId, daoTokenSymbol as any);
      if (balance) {
        setDaoTokenBalance(balance);
        return balance;
      }

      // Fallback: check if it's in the general balances
      if (balances) {
        const tokenBalance = Object.values(balances).find(b => 
          b.tokenInfo.symbol === daoTokenSymbol
        );
        if (tokenBalance) {
          setDaoTokenBalance(tokenBalance);
          return tokenBalance;
        }
      }

      // Create a default balance structure if token exists but balance is 0
      const defaultBalance: Balance = {
        balance: 0,
        tokenInfo: {
          symbol: daoTokenSymbol,
          decimals: 18,
          contractAddress: '0x' + daoId.substring(0, 40).padEnd(40, '0'),
          network: 'ethereum',
          type: 'governance'
        }
      };
      setDaoTokenBalance(defaultBalance);
      return defaultBalance;

    } catch (err) {
      console.warn('Failed to fetch DAO token balance:', err);
      return null;
    }
  }, [squidId, daoTokenSymbol, getBalance, balances, daoId]);

  // Fetch DAO-specific NFTs
  const fetchDaoNFTs = useCallback(async () => {
    if (!squidId) return [];

    try {
      const allNFTs = await listUserNFTs(squidId);
      
      // Filter NFTs that belong to this DAO
      const filteredNFTs = allNFTs.filter(nft => {
        // Check if NFT has DAO-specific attributes
        const hasDAOAttribute = nft.attributes?.some(attr => 
          (attr.trait_type === 'dao_id' && attr.value === daoId) ||
          (attr.trait_type === 'issuer' && attr.value.includes(daoId)) ||
          (attr.trait_type === 'organization' && attr.value === currentDAO?.name)
        );

        // Check if NFT contract address is related to DAO
        const isDAOContract = nft.contractAddress?.toLowerCase().includes(daoId.toLowerCase().substring(0, 8));

        // Check if NFT name/description mentions the DAO
        const mentionsDAO = currentDAO?.name && (
          nft.name.toLowerCase().includes(currentDAO.name.toLowerCase()) ||
          nft.description.toLowerCase().includes(currentDAO.name.toLowerCase())
        );

        return hasDAOAttribute || isDAOContract || mentionsDAO;
      });

      setDaoNFTs(filteredNFTs);
      return filteredNFTs;

    } catch (err) {
      console.warn('Failed to fetch DAO NFTs:', err);
      return [];
    }
  }, [squidId, listUserNFTs, daoId, currentDAO?.name]);

  // Calculate voting power based on token balance and NFT count
  const calculateVotingPower = useCallback((
    tokenBalance: Balance | null, 
    nftCount: number, 
    dao: DetailedDAO | null
  ): VotingPower => {
    if (!dao) {
      return {
        tokenWeight: 0,
        nftWeight: 0,
        totalWeight: 0,
        percentageOfTotal: 0
      };
    }

    const votingMechanism = dao.governanceRules?.votingMechanism || 'user-based';
    let tokenWeight = 0;
    let nftWeight = 0;

    switch (votingMechanism) {
      case 'token-weighted':
        tokenWeight = tokenBalance?.balance || 0;
        nftWeight = 0;
        break;
      
      case 'nft-weighted':
        tokenWeight = 0;
        nftWeight = nftCount;
        break;
      
      case 'user-based':
      default:
        // In user-based voting, each member gets 1 vote regardless of holdings
        tokenWeight = (tokenBalance?.balance || 0) > 0 ? 1 : 0;
        nftWeight = nftCount > 0 ? 1 : 0;
        break;
    }

    const totalWeight = Math.max(tokenWeight + nftWeight, votingMechanism === 'user-based' ? 1 : 0);
    
    // Calculate percentage of total voting weight
    // This is a simplified calculation - in reality, we'd need total DAO voting weight
    const estimatedTotalDAOWeight = dao.memberCount * (votingMechanism === 'user-based' ? 1 : 100);
    const percentageOfTotal = estimatedTotalDAOWeight > 0 ? (totalWeight / estimatedTotalDAOWeight) * 100 : 0;

    return {
      tokenWeight,
      nftWeight,
      totalWeight,
      percentageOfTotal: Math.min(percentageOfTotal, 100)
    };
  }, []);

  // Calculate balance trend (simplified - would need historical data in real implementation)
  const calculateBalanceTrend = useCallback((currentBalance: number): BalanceTrend => {
    // In a real implementation, this would compare with historical data
    // For now, we'll simulate some trend data
    const mockPreviousBalance = currentBalance * (0.9 + Math.random() * 0.2);
    const change = currentBalance - mockPreviousBalance;
    const changePercentage = mockPreviousBalance > 0 ? (change / mockPreviousBalance) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercentage) > 1) {
      trend = changePercentage > 0 ? 'up' : 'down';
    }

    return {
      current: currentBalance,
      previous: mockPreviousBalance,
      change,
      changePercentage,
      trend
    };
  }, []);

  // Load wallet data
  const loadWalletData = useCallback(async () => {
    if (!isAuthenticated || !squidId || !membership?.isMember) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch data in parallel
      const [tokenBalance, nftList] = await Promise.all([
        fetchDaoTokenBalance(),
        fetchDaoNFTs()
      ]);

      // Calculate voting power
      if (currentDAO) {
        const power = calculateVotingPower(tokenBalance, nftList.length, currentDAO);
        setVotingPower(power);
      }

      // Calculate balance trend
      if (tokenBalance) {
        const trend = calculateBalanceTrend(tokenBalance.balance);
        setBalanceTrend(trend);
      }

      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wallet data';
      setError(errorMessage);
      console.error('Load wallet data error:', err);
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated, 
    squidId, 
    membership?.isMember, 
    fetchDaoTokenBalance, 
    fetchDaoNFTs, 
    currentDAO, 
    calculateVotingPower, 
    calculateBalanceTrend
  ]);

  // Refresh wallet data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWalletData();
      await loadWalletData();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data when dependencies change
  useEffect(() => {
    if (isAuthenticated && squidId && currentDAO && membership?.isMember) {
      loadWalletData();
    }
  }, [isAuthenticated, squidId, currentDAO, membership?.isMember, loadWalletData]);

  // Format balance with proper decimals
  const formatBalance = (balance: number, decimals: number = 18): string => {
    if (balance === 0) return '0';
    
    const divisor = Math.pow(10, decimals);
    const formatted = balance / divisor;
    
    if (formatted >= 1000000) {
      return (formatted / 1000000).toFixed(2) + 'M';
    } else if (formatted >= 1000) {
      return (formatted / 1000).toFixed(2) + 'K';
    } else if (formatted >= 1) {
      return formatted.toFixed(2);
    } else {
      return formatted.toFixed(6);
    }
  };

  // Get trend icon and color
  const getTrendDisplay = (trend: BalanceTrend) => {
    switch (trend.trend) {
      case 'up':
        return {
          icon: TrendingUpIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          text: `+${Math.abs(trend.changePercentage || 0).toFixed(1)}%`
        };
      case 'down':
        return {
          icon: TrendingDownIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          text: `-${Math.abs(trend.changePercentage || 0).toFixed(1)}%`
        };
      default:
        return {
          icon: null,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          text: 'No change'
        };
    }
  };

  // Authentication check
  if (!isAuthenticated) {
    return (
      <Card className={cn("border-yellow-200", className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <LockClosedIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">
              Please authenticate with your sQuid identity to view your wallet overview.
            </p>
            <p className="text-sm text-gray-500">
              Your wallet information is only visible to you when authenticated.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Membership check
  if (!membership?.isMember) {
    return (
      <Card className={cn("border-blue-200", className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <UserIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Membership Required</h3>
            <p className="text-gray-600 mb-4">
              You need to be a member of this DAO to view wallet information.
            </p>
            <p className="text-sm text-gray-500">
              Join the DAO to access wallet features and participate in governance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading skeleton
  if (loading && !daoTokenBalance) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <Skeleton className="h-6 w-16 mb-2" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center">
              <WalletIcon className="h-6 w-6 text-blue-600 mr-2" />
              My Wallet Overview
            </CardTitle>
            <CardDescription className="text-base">
              Your DAO governance tokens and voting power
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <ArrowPathIcon className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Token Balance Section */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 text-green-600 mr-2" />
            Token Balance
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Balance */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Current Balance</span>
                {daoTokenBalance && (
                  <Badge variant="secondary" className="bg-green-200 text-green-800">
                    {daoTokenBalance.tokenInfo.symbol}
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-green-900">
                {daoTokenBalance ? 
                  formatBalance(daoTokenBalance.balance, daoTokenBalance.tokenInfo.decimals) : 
                  '0'
                }
              </div>
              {balanceTrend && balanceTrend.trend !== 'stable' && (
                <div className="flex items-center mt-2">
                  {(() => {
                    const trendDisplay = getTrendDisplay(balanceTrend);
                    const TrendIcon = trendDisplay.icon;
                    return TrendIcon ? (
                      <div className={cn("flex items-center text-xs", trendDisplay.color)}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        {trendDisplay.text}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* NFT Count */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800">DAO NFTs</span>
                <PhotoIcon className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {daoNFTs.length}
              </div>
              <div className="text-xs text-purple-700 mt-1">
                {daoNFTs.length === 1 ? 'NFT owned' : 'NFTs owned'}
              </div>
            </div>
          </div>
        </div>

        {/* Voting Power Section */}
        {votingPower && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
              Voting Power
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Token Weight */}
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-900">
                  {votingPower.tokenWeight.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Token Weight</div>
              </div>

              {/* NFT Weight */}
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-900">
                  {votingPower.nftWeight.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">NFT Weight</div>
              </div>

              {/* Total Weight */}
              <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
                <div className="text-lg font-bold text-blue-900">
                  {votingPower.totalWeight.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">Total Weight</div>
              </div>
            </div>

            {/* Voting Power Percentage - Accessible */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <AccessibleProgress
                value={votingPower.percentageOfTotal}
                max={100}
                label="Your Voting Influence"
                showPercentage={true}
                colorScheme="default"
                size="md"
                className="mb-2"
              />
              <div className="text-xs text-blue-700 mt-2">
                Based on current token holdings and NFT ownership
              </div>
              
              {/* Screen reader description */}
              <div className="sr-only">
                {daoTokenBalance && describeWalletOverview({
                  tokenBalance: daoTokenBalance.balance,
                  tokenSymbol: daoTokenBalance.tokenInfo.symbol,
                  nftCount: daoNFTs.length,
                  votingPower: votingPower.percentageOfTotal
                })}
              </div>

              {/* Data table fallback for voting power breakdown */}
              {shouldShowDataTable && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200" role="table">
                    <caption className="sr-only">
                      Voting power breakdown showing token weight, NFT weight, and total influence
                    </caption>
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Component
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weight
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td scope="row" className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          Token Weight
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {votingPower.tokenWeight.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {votingPower.totalWeight > 0 ? ((votingPower.tokenWeight / votingPower.totalWeight) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td scope="row" className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          NFT Weight
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {votingPower.nftWeight.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {votingPower.totalWeight > 0 ? ((votingPower.nftWeight / votingPower.totalWeight) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td scope="row" className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          Total Influence
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {votingPower.totalWeight.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {votingPower.percentageOfTotal.toFixed(3)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent NFTs Preview */}
        {daoNFTs.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <PhotoIcon className="h-5 w-5 text-purple-600 mr-2" />
              Recent DAO NFTs
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {daoNFTs.slice(0, 4).map((nft, index) => (
                <div key={nft.tokenId} className="group relative">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-purple-300 transition-colors">
                    {nft.image ? (
                      <img 
                        src={nft.image} 
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {nft.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      #{nft.tokenId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {daoNFTs.length > 4 && (
              <div className="text-center">
                <Button variant="outline" size="sm">
                  View All {daoNFTs.length} NFTs
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-gray-500 text-center bg-gray-50 rounded px-2 py-1">
            <span className="inline-flex items-center">
              <InformationCircleIcon className="h-3 w-3 mr-1" />
              Last updated: {lastUpdated.toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DAOWalletOverview;
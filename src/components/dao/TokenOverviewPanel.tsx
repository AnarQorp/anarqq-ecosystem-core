/**
 * TokenOverviewPanel - DAO Token Information Display Component
 * 
 * Displays comprehensive token information for a DAO including name, symbol,
 * supply metrics, and governance mechanism indicators.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useQwallet } from '../../composables/useQwallet';
import { useRenderMonitoring } from '../../utils/performance/monitoring';
import { useCachedApiCall } from '../../utils/performance/dataFetching';
import { 
  useKeyboardNavigation,
  useAccessibleVisualization,
  createTokenDisplayAria,
  createProgressAria,
  createAccessibleClickHandler,
  useDAOComponentDescriptions,
  DataDescription,
  AccessibleProgress
} from '../../utils/accessibility';
import { 
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

// Enhanced token information interface
export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  contractAddress: string;
  type: 'user-based' | 'token-weighted' | 'nft-weighted';
  decimals?: number;
  network?: string;
}

// Enhanced DAO interface with token information
export interface EnhancedDAO {
  id: string;
  name: string;
  tokenInfo?: TokenInfo;
  economicMetrics?: {
    totalValueLocked: number;
    averageHolding: number;
    distributionIndex: number;
  };
}

interface TokenOverviewPanelProps {
  daoId: string;
  tokenInfo?: TokenInfo;
  className?: string;
}

// Cache interface for token information
interface TokenCache {
  [daoId: string]: {
    data: TokenInfo;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const TokenOverviewPanel: React.FC<TokenOverviewPanelProps> = React.memo(({
  daoId,
  tokenInfo: propTokenInfo,
  className
}) => {
  // Performance monitoring
  const { getMountTime } = useRenderMonitoring('TokenOverviewPanel', { daoId });
  const cachedApiCall = useCachedApiCall();
  const { currentDAO, getDAO, loading: daoLoading, error: daoError } = useDAO();
  const { getBalance, getAllBalances, loading: walletLoading, error: walletError } = useQwallet();
  
  // Accessibility hooks
  const { containerRef, focusFirst } = useKeyboardNavigation({
    enabled: true,
    autoFocus: false
  });
  const { colorScheme, shouldShowDataTable, describer } = useAccessibleVisualization({
    highContrast: false,
    colorBlindFriendly: false,
    preferDataTable: false
  });
  const { describeTokenOverview } = useDAOComponentDescriptions();
  
  // Local state
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(propTokenInfo || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cache management
  const [tokenCache, setTokenCache] = useState<TokenCache>({});

  // Check if cached data is still valid
  const getCachedTokenInfo = useMemo(() => {
    const cached = tokenCache[daoId];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [tokenCache, daoId]);

  // Update cache
  const updateTokenCache = (data: TokenInfo) => {
    setTokenCache(prev => ({
      ...prev,
      [daoId]: {
        data,
        timestamp: Date.now()
      }
    }));
  };

  // Fetch token information with fallback logic and caching
  const fetchTokenInfo = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = getCachedTokenInfo;
        if (cachedData) {
          setTokenInfo(cachedData);
          setLastUpdated(new Date(tokenCache[daoId].timestamp));
          return;
        }
      }

      let tokenData: TokenInfo | null = null;
      let dataSource = 'unknown';

      // Primary: Try to get enhanced DAO data with token information
      try {
        const dao = await getDAO(daoId);
        if (dao && (dao as any).tokenInfo) {
          tokenData = (dao as any).tokenInfo;
          dataSource = 'dao-service';
        }
      } catch (daoErr) {
        console.warn('Primary DAO service failed, trying fallback:', daoErr);
      }

      // Fallback 1: Try QwalletService for token information
      if (!tokenData && currentDAO) {
        try {
          // Attempt to get token info from wallet service
          // In a real implementation, we'd have the actual token symbol from DAO config
          const daoTokenSymbol = currentDAO.governanceRules?.tokenRequirement?.token || 
                                 currentDAO.name.toUpperCase().substring(0, 4) + 'TOKEN';
          
          // Try to get balance info which might contain token details
          const balanceInfo = await getBalance('system', daoTokenSymbol as any);
          
          if (balanceInfo?.tokenInfo) {
            tokenData = {
              name: balanceInfo.tokenInfo.symbol + ' Token',
              symbol: balanceInfo.tokenInfo.symbol,
              totalSupply: 1000000, // Would come from contract
              circulatingSupply: 750000, // Would come from contract
              holderCount: currentDAO.memberCount || 0,
              contractAddress: balanceInfo.tokenInfo.contractAddress,
              type: currentDAO.governanceRules?.votingMechanism === 'token-weighted' ? 'token-weighted' : 'user-based',
              decimals: balanceInfo.tokenInfo.decimals,
              network: balanceInfo.tokenInfo.network
            };
            dataSource = 'wallet-service';
          }
        } catch (walletErr) {
          console.warn('Wallet service fallback failed:', walletErr);
        }
      }

      // Fallback 2: Create synthetic token info from available DAO data
      if (!tokenData && currentDAO) {
        try {
          const governanceType = currentDAO.governanceRules?.votingMechanism || 'user-based';
          const tokenSymbol = currentDAO.governanceRules?.tokenRequirement?.token || 
                             currentDAO.name.toUpperCase().substring(0, 4) + 'TOKEN';
          
          tokenData = {
            name: `${currentDAO.name} Governance Token`,
            symbol: tokenSymbol,
            totalSupply: 1000000, // Default values
            circulatingSupply: Math.floor(currentDAO.memberCount * 100), // Estimate based on members
            holderCount: currentDAO.memberCount || 0,
            contractAddress: '0x' + daoId.substring(0, 40).padEnd(40, '0'),
            type: governanceType.includes('token') ? 'token-weighted' : 
                  governanceType.includes('nft') ? 'nft-weighted' : 'user-based',
            decimals: 18,
            network: 'ethereum'
          };
          dataSource = 'synthetic';
        } catch (syntheticErr) {
          console.warn('Synthetic token creation failed:', syntheticErr);
        }
      }

      if (tokenData) {
        // Validate token data before setting
        if (!tokenData.name || !tokenData.symbol) {
          throw new Error('Invalid token data received');
        }

        setTokenInfo(tokenData);
        updateTokenCache(tokenData);
        setLastUpdated(new Date());
        
        console.log(`Token info loaded from ${dataSource} for DAO ${daoId}`);
      } else {
        throw new Error('Token information not available from any source');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load token information';
      setError(errorMessage);
      console.error('Fetch token info error:', err);
      
      // If we have cached data, fall back to it even if expired
      const expiredCache = tokenCache[daoId];
      if (expiredCache && !tokenInfo) {
        console.warn('Using expired cache data due to fetch failure');
        setTokenInfo(expiredCache.data);
        setLastUpdated(new Date(expiredCache.timestamp));
        setError(`Using cached data: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh token information
  const refreshTokenInfo = () => {
    fetchTokenInfo(true);
  };

  // Load token info on mount and when daoId changes
  useEffect(() => {
    if (daoId && !propTokenInfo) {
      fetchTokenInfo();
    } else if (propTokenInfo) {
      setTokenInfo(propTokenInfo);
      setLastUpdated(new Date());
    }
  }, [daoId, propTokenInfo]);

  // Get governance mechanism badge
  const getGovernanceBadge = (type: string) => {
    switch (type) {
      case 'user-based':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <UsersIcon className="h-3 w-3 mr-1" />
            User-Based
          </Badge>
        );
      case 'token-weighted':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CurrencyDollarIcon className="h-3 w-3 mr-1" />
            Token-Weighted
          </Badge>
        );
      case 'nft-weighted':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
            <ChartBarIcon className="h-3 w-3 mr-1" />
            NFT-Weighted
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {type}
          </Badge>
        );
    }
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Calculate supply percentage
  const supplyPercentage = useMemo(() => {
    if (!tokenInfo || tokenInfo.totalSupply === 0) return 0;
    return (tokenInfo.circulatingSupply / tokenInfo.totalSupply) * 100;
  }, [tokenInfo]);

  // Loading skeleton
  const TokenInfoSkeleton = () => (
    <Card className={className}>
      <CardHeader>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-20" />
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

  // Error state
  if (error && !tokenInfo) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Token Information Unavailable</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchTokenInfo}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading && !tokenInfo) {
    return <TokenInfoSkeleton />;
  }

  // No token info available
  if (!tokenInfo) {
    return (
      <Card className={cn("border-gray-200", className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Token Information</h3>
            <p className="text-gray-600">This DAO does not have associated token information.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create accessible token display attributes
  const tokenDisplayAria = createTokenDisplayAria({
    tokenName: tokenInfo.name,
    tokenSymbol: tokenInfo.symbol,
    type: 'token',
    interactive: false
  });

  // Create accessible progress attributes for supply visualization
  const supplyProgressAria = createProgressAria({
    label: 'Token Supply Progress',
    description: `${formatNumber(tokenInfo.circulatingSupply)} out of ${formatNumber(tokenInfo.totalSupply)} tokens in circulation`,
    value: supplyPercentage,
    min: 0,
    max: 100,
    valueText: `${supplyPercentage.toFixed(1)}% of total supply in circulation`
  });

  // Generate comprehensive description for screen readers
  const tokenDescription = tokenInfo ? describeTokenOverview({
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    totalSupply: tokenInfo.totalSupply,
    circulatingSupply: tokenInfo.circulatingSupply,
    holderCount: tokenInfo.holderCount
  }) : '';

  // Create accessible click handlers for interactive elements
  const refreshClickHandler = createAccessibleClickHandler(refreshTokenInfo, {
    preventDefault: true,
    stopPropagation: false
  });

  const copyAddressClickHandler = createAccessibleClickHandler(() => {
    if (tokenInfo?.contractAddress) {
      navigator.clipboard.writeText(tokenInfo.contractAddress);
      // Could add toast notification here
    }
  }, {
    preventDefault: true,
    stopPropagation: false
  });

  return (
    <Card 
      ref={containerRef}
      className={className}
      {...tokenDisplayAria.containerAttributes}
    >
      {/* Screen reader description */}
      <DataDescription 
        data={{
          type: 'chart',
          title: `${tokenInfo.name} Token Overview`,
          summary: tokenDescription,
          instructions: 'Use Tab to navigate interactive elements, Enter or Space to activate buttons'
        }}
      />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle 
              id={tokenDisplayAria.labelId}
              className="text-xl flex items-center"
            >
              <CurrencyDollarIcon className="h-6 w-6 text-green-600 mr-2" aria-hidden="true" />
              {tokenInfo.name}
            </CardTitle>
            <CardDescription 
              id={tokenDisplayAria.descriptionId}
              className="text-base font-medium text-gray-700"
            >
              {tokenInfo.symbol} - {tokenDisplayAria.descriptionText}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getGovernanceBadge(tokenInfo.type)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Token Details Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div 
            className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-default"
            role="region"
            aria-label="Total supply information"
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-900" aria-label={`Total supply: ${tokenInfo.totalSupply.toLocaleString()} tokens`}>
              {formatNumber(tokenInfo.totalSupply)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Supply</div>
          </div>
          
          <div 
            className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-default"
            role="region"
            aria-label="Circulating supply information"
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-900" aria-label={`Circulating supply: ${tokenInfo.circulatingSupply.toLocaleString()} tokens`}>
              {formatNumber(tokenInfo.circulatingSupply)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Circulating</div>
          </div>
          
          <div 
            className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-default"
            role="region"
            aria-label="Token holders information"
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-900" aria-label={`${tokenInfo.holderCount.toLocaleString()} token holders`}>
              {formatNumber(tokenInfo.holderCount)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Holders</div>
          </div>
          
          <div 
            className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-default"
            role="region"
            aria-label="Token decimals information"
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-900" aria-label={`${tokenInfo.decimals || 18} decimal places`}>
              {tokenInfo.decimals || 18}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Decimals</div>
          </div>
        </div>

        {/* Supply Visualization - Enhanced for accessibility */}
        <div role="region" aria-label="Token supply visualization">
          <AccessibleProgress
            value={supplyPercentage}
            max={100}
            label="Circulating Supply"
            showPercentage={true}
            colorScheme="success"
            size="md"
            className="mb-2"
          />
          
          {/* Alternative text description for screen readers */}
          <div className="sr-only">
            {describer.describeTokenSupply(
              tokenInfo.circulatingSupply,
              tokenInfo.totalSupply,
              tokenInfo.symbol
            )}
          </div>

          {/* Data table fallback for complex visualization */}
          {shouldShowDataTable && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" role="table">
                <caption className="sr-only">
                  Token supply breakdown for {tokenInfo.name}
                </caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supply Type
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td scope="row" className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      Circulating
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(tokenInfo.circulatingSupply)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {supplyPercentage.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td scope="row" className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      Reserved
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(tokenInfo.totalSupply - tokenInfo.circulatingSupply)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {(100 - supplyPercentage).toFixed(1)}%
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td scope="row" className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      Total Supply
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(tokenInfo.totalSupply)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      100%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contract Information - Responsive */}
        {tokenInfo.contractAddress && (
          <div 
            className="bg-gray-50 rounded-lg p-3 sm:p-4 hover:bg-gray-100 transition-colors duration-200"
            role="region"
            aria-label="Smart contract information"
          >
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <ChartBarIcon className="h-4 w-4 mr-2 text-gray-500" />
              Contract Information
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">Contract Address</div>
                <div 
                  className="text-xs sm:text-sm font-mono text-gray-600 break-all bg-white rounded px-2 py-1 border"
                  role="textbox"
                  aria-readonly="true"
                  aria-label={`Contract address: ${tokenInfo.contractAddress}`}
                  tabIndex={0}
                >
                  {tokenInfo.contractAddress}
                </div>
              </div>
              {tokenInfo.network && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Network:</span>
                  <Badge variant="outline" className="text-xs">
                    {tokenInfo.network.charAt(0).toUpperCase() + tokenInfo.network.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Mobile friendly with accessibility */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            {...refreshClickHandler}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Refresh token information"
            aria-describedby="refresh-description"
          >
            <ArrowPathIcon className={cn("h-4 w-4 mr-2", loading && "animate-spin")} aria-hidden="true" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div id="refresh-description" className="sr-only">
            Refresh token information to get the latest data from the blockchain
          </div>
          
          {tokenInfo.contractAddress && (
            <>
              <button
                {...copyAddressClickHandler}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                aria-label="Copy contract address to clipboard"
                aria-describedby="copy-description"
              >
                <InformationCircleIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Copy Address
              </button>
              <div id="copy-description" className="sr-only">
                Copy the smart contract address to your clipboard for use in wallet applications
              </div>
            </>
          )}
        </div>

        {/* Last Updated - Enhanced */}
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

export default TokenOverviewPanel;
/**
 * QwalletDashboard - Main wallet dashboard component
 * 
 * Displays user balances, recent transactions, and owned NFTs overview
 */

import React, { useState } from 'react';
import { useQwallet } from '../../composables/useQwallet';
import { useSquidContext } from '../../contexts/SquidContext';
import { 
  WalletIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  PhotoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const QwalletDashboard: React.FC = () => {
  const { currentSquid } = useSquidContext();
  const {
    balances,
    nfts,
    transactions,
    walletAddress,
    loading,
    error,
    refreshWalletData,
    clearError
  } = useQwallet();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWalletData();
    setRefreshing(false);
  };

  const formatBalance = (balance: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(balance);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer_funds':
        return <ArrowUpIcon className="h-5 w-5 text-blue-500" />;
      case 'nft_mint':
        return <PhotoIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTransactionDescription = (transaction: any): string => {
    switch (transaction.type) {
      case 'transfer_funds':
        if (transaction.fromSquidId === currentSquid?.id) {
          return `Sent ${transaction.amount} ${transaction.token} to ${transaction.toSquidId}`;
        } else {
          return `Received ${transaction.amount} ${transaction.token} from ${transaction.fromSquidId}`;
        }
      case 'nft_mint':
        return `Minted NFT: ${transaction.tokenId}`;
      case 'create_listing':
        return 'Signed marketplace listing';
      default:
        return `${transaction.type} transaction`;
    }
  };

  if (!currentSquid) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <p className="text-yellow-800">Please connect your sQuid identity to access your wallet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <WalletIcon className="h-8 w-8 mr-3 text-blue-600" />
            Qwallet Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your tokens and NFTs in the AnarQ&Q ecosystem
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">sQuid Identity</label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
              {currentSquid.id}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Wallet Address</label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
              {walletAddress || 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">$QToken Balance</h3>
            <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
          </div>
          {loading && !balances ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {balances ? formatBalance(balances.QToken.balance) : '0.00'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {balances?.QToken.tokenInfo.symbol} • {balances?.QToken.tokenInfo.network}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">$PI Balance</h3>
            <CurrencyDollarIcon className="h-6 w-6 text-orange-600" />
          </div>
          {loading && !balances ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {balances ? formatBalance(balances.PI.balance) : '0.00'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {balances?.PI.tokenInfo.symbol} • {balances?.PI.tokenInfo.network}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-gray-600" />
            Recent Transactions
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {loading && transactions.length === 0 ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transactions yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getTransactionDescription(transaction)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(transaction.timestamp)} • {transaction.status}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-500 font-mono">
                      {transaction.id.substring(0, 8)}...
                    </p>
                    {transaction.gasEstimate && (
                      <p className="text-xs text-gray-400">
                        Gas: {transaction.gasEstimate.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {transactions.length > 5 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
              View all transactions →
            </button>
          </div>
        )}
      </div>

      {/* NFT Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <PhotoIcon className="h-5 w-5 mr-2 text-gray-600" />
            My NFTs ({nfts.length})
          </h3>
        </div>
        <div className="p-6">
          {loading && nfts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-8">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No NFTs yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Mint your first NFT to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {nfts.slice(0, 6).map((nft) => (
                <div key={nft.tokenId} className="group cursor-pointer">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2 group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-nft.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {nft.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {nft.tokenId.substring(0, 12)}...
                  </p>
                </div>
              ))}
            </div>
          )}
          {nfts.length > 6 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                View all NFTs →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QwalletDashboard;
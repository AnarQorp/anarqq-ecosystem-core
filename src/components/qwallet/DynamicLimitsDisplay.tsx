/**
 * Dynamic Limits Display Component
 * Shows current wallet limits that are dynamically updated based on
 * Qonsent policies, DAO governance, and risk assessments
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Info, Settings, RefreshCw } from 'lucide-react';
import { ExtendedSquidIdentity } from '../../types/identity';
import { WalletLimits } from '../../types/wallet-config';
import { useQonsentWallet } from '../../hooks/useQonsentWallet';

interface DynamicLimitsDisplayProps {
  identity: ExtendedSquidIdentity | null;
  currentLimits?: WalletLimits;
  showUsage?: boolean;
  showHistory?: boolean;
  className?: string;
}

interface LimitUsage {
  dailyUsed: number;
  monthlyUsed: number;
  hourlyTransactions: number;
  lastUpdated: string;
}

interface LimitChange {
  timestamp: string;
  field: keyof WalletLimits;
  previousValue: number;
  newValue: number;
  reason: string;
  source: 'QONSENT' | 'DAO_GOVERNANCE' | 'RISK_ASSESSMENT' | 'COMPLIANCE';
}

export const DynamicLimitsDisplay: React.FC<DynamicLimitsDisplayProps> = ({
  identity,
  currentLimits,
  showUsage = true,
  showHistory = false,
  className = ''
}) => {
  const [limitUsage, setLimitUsage] = useState<LimitUsage | null>(null);
  const [limitHistory, setLimitHistory] = useState<LimitChange[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const {
    lastValidationResult,
    isRealTimeCheckingActive,
    loading,
    error
  } = useQonsentWallet(identity, {
    enableRealTimeChecking: true
  });

  // Mock data for demonstration
  useEffect(() => {
    if (identity && currentLimits) {
      // Simulate limit usage data
      setLimitUsage({
        dailyUsed: Math.random() * (currentLimits.dailyTransferLimit * 0.8),
        monthlyUsed: Math.random() * (currentLimits.monthlyTransferLimit * 0.6),
        hourlyTransactions: Math.floor(Math.random() * (currentLimits.maxTransactionsPerHour * 0.5)),
        lastUpdated: new Date().toISOString()
      });

      // Simulate limit change history
      setLimitHistory([
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          field: 'dailyTransferLimit',
          previousValue: currentLimits.dailyTransferLimit * 1.2,
          newValue: currentLimits.dailyTransferLimit,
          reason: 'Privacy level changed to LOW',
          source: 'QONSENT'
        },
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          field: 'maxTransactionAmount',
          previousValue: currentLimits.maxTransactionAmount * 0.8,
          newValue: currentLimits.maxTransactionAmount,
          reason: 'Risk assessment improved',
          source: 'RISK_ASSESSMENT'
        }
      ]);
    }
  }, [identity, currentLimits]);

  const refreshLimits = async () => {
    setIsRefreshing(true);
    try {
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would fetch latest limits
      console.log('Refreshing dynamic limits...');
      
    } catch (error) {
      console.error('Failed to refresh limits:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    return Math.min(percentage, 100).toFixed(1);
  };

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-orange-600 bg-orange-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressBarColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getChangeIcon = (change: LimitChange) => {
    if (change.newValue > change.previousValue) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };

  const getSourceColor = (source: LimitChange['source']) => {
    switch (source) {
      case 'QONSENT':
        return 'bg-blue-100 text-blue-800';
      case 'DAO_GOVERNANCE':
        return 'bg-purple-100 text-purple-800';
      case 'RISK_ASSESSMENT':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLIANCE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!identity) {
    return (
      <div className={`p-4 border border-gray-200 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <Settings className="w-5 h-5" />
          <span>Select an identity to view dynamic limits</span>
        </div>
      </div>
    );
  }

  if (!currentLimits) {
    return (
      <div className={`p-4 border border-gray-200 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertCircle className="w-5 h-5" />
          <span>No wallet limits configured</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dynamic Wallet Limits</h3>
            {isRealTimeCheckingActive && (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            )}
          </div>
          <button
            onClick={refreshLimits}
            disabled={isRefreshing || loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh limits"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Dynamic limits indicator */}
        {lastValidationResult?.dynamicLimits && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-blue-600">
            <Info className="w-4 h-4" />
            <span>Limits have been dynamically adjusted based on your privacy settings</span>
          </div>
        )}
      </div>

      {/* Current Limits */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Transfer Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Daily Transfer Limit</span>
              <span className="text-sm text-gray-900 font-semibold">
                {formatCurrency(currentLimits.dailyTransferLimit)}
              </span>
            </div>
            {showUsage && limitUsage && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Used today</span>
                  <span className={`px-2 py-1 rounded-full ${getUsageColor(limitUsage.dailyUsed, currentLimits.dailyTransferLimit)}`}>
                    {formatPercentage(limitUsage.dailyUsed, currentLimits.dailyTransferLimit)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(limitUsage.dailyUsed, currentLimits.dailyTransferLimit)}`}
                    style={{
                      width: `${Math.min((limitUsage.dailyUsed / currentLimits.dailyTransferLimit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(limitUsage.dailyUsed)} of {formatCurrency(currentLimits.dailyTransferLimit)}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Transfer Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Monthly Transfer Limit</span>
              <span className="text-sm text-gray-900 font-semibold">
                {formatCurrency(currentLimits.monthlyTransferLimit)}
              </span>
            </div>
            {showUsage && limitUsage && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Used this month</span>
                  <span className={`px-2 py-1 rounded-full ${getUsageColor(limitUsage.monthlyUsed, currentLimits.monthlyTransferLimit)}`}>
                    {formatPercentage(limitUsage.monthlyUsed, currentLimits.monthlyTransferLimit)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(limitUsage.monthlyUsed, currentLimits.monthlyTransferLimit)}`}
                    style={{
                      width: `${Math.min((limitUsage.monthlyUsed / currentLimits.monthlyTransferLimit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(limitUsage.monthlyUsed)} of {formatCurrency(currentLimits.monthlyTransferLimit)}
                </div>
              </div>
            )}
          </div>

          {/* Max Transaction Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Max Transaction Amount</span>
              <span className="text-sm text-gray-900 font-semibold">
                {formatCurrency(currentLimits.maxTransactionAmount)}
              </span>
            </div>
          </div>

          {/* Max Transactions Per Hour */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Max Transactions/Hour</span>
              <span className="text-sm text-gray-900 font-semibold">
                {currentLimits.maxTransactionsPerHour}
              </span>
            </div>
            {showUsage && limitUsage && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Used this hour</span>
                  <span className={`px-2 py-1 rounded-full ${getUsageColor(limitUsage.hourlyTransactions, currentLimits.maxTransactionsPerHour)}`}>
                    {formatPercentage(limitUsage.hourlyTransactions, currentLimits.maxTransactionsPerHour)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(limitUsage.hourlyTransactions, currentLimits.maxTransactionsPerHour)}`}
                    style={{
                      width: `${Math.min((limitUsage.hourlyTransactions / currentLimits.maxTransactionsPerHour) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {limitUsage.hourlyTransactions} of {currentLimits.maxTransactionsPerHour} transactions
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Allowed Tokens */}
        {currentLimits.allowedTokens && currentLimits.allowedTokens.length > 0 && (
          <div className="mt-4">
            <span className="text-sm font-medium text-gray-700">Allowed Tokens</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {currentLimits.allowedTokens.map((token, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {token === '*' ? 'All Tokens' : token}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Governance Controls */}
        {currentLimits.governanceControlled && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 text-purple-700">
              <Settings className="w-4 h-4" />
              <span className="font-medium">Governance Controlled</span>
            </div>
            <p className="mt-1 text-sm text-purple-600">
              These limits are controlled by DAO governance and may change based on community decisions.
            </p>
            {currentLimits.policyId && (
              <p className="mt-1 text-xs text-purple-500">
                Policy ID: {currentLimits.policyId}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Limit Change History */}
      {showHistory && limitHistory.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => toggleSection('history')}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Recent Limit Changes</span>
            <div className={`transform transition-transform ${expandedSections.has('history') ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>
          
          {expandedSections.has('history') && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {limitHistory.map((change, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getChangeIcon(change)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {change.field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSourceColor(change.source)}`}>
                          {change.source.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {formatCurrency(change.previousValue)} → {formatCurrency(change.newValue)}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{change.reason}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatTimestamp(change.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error loading dynamic limits</span>
          </div>
          <p className="mt-1 text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
};
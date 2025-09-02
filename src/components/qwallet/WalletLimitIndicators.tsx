/**
 * Wallet Limit Usage Indicators Component
 * Visual indicators showing current usage against wallet limits
 * with color-coded progress bars and usage warnings
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Shield
} from 'lucide-react';
import { WalletLimits } from '../../types/wallet-config';

export interface LimitUsageData {
  dailyUsed: number;
  monthlyUsed: number;
  hourlyTransactions: number;
  currentTransactionAmount?: number;
  lastUpdated: string;
}

export interface WalletLimitIndicatorsProps {
  limits: WalletLimits;
  usage: LimitUsageData;
  compact?: boolean;
  showWarnings?: boolean;
  className?: string;
}

interface LimitIndicatorProps {
  label: string;
  used: number;
  limit: number;
  unit: 'currency' | 'count' | 'percentage';
  icon: React.ReactNode;
  showProgress?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
}

const LimitIndicator: React.FC<LimitIndicatorProps> = ({
  label,
  used,
  limit,
  unit,
  icon,
  showProgress = true,
  warningThreshold = 75,
  criticalThreshold = 90
}) => {
  const percentage = Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= warningThreshold;
  const isCritical = percentage >= criticalThreshold;
  
  const getStatusColor = () => {
    if (isCritical) return 'text-red-600';
    if (isWarning) return 'text-orange-600';
    return 'text-green-600';
  };
  
  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-orange-500';
    return 'bg-green-500';
  };
  
  const getBadgeVariant = () => {
    if (isCritical) return 'destructive' as const;
    if (isWarning) return 'secondary' as const;
    return 'default' as const;
  };
  
  const formatValue = (value: number) => {
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'count':
        return value.toString();
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>{icon}</div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <Badge variant={getBadgeVariant()} className="text-xs">
          {percentage.toFixed(1)}%
        </Badge>
      </div>
      
      {showProgress && (
        <div className="space-y-2">
          <Progress 
            value={percentage} 
            className="h-2"
            // Custom styling for different states
            style={{
              '--progress-background': isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : '#f0f9ff',
              '--progress-foreground': isCritical ? '#dc2626' : isWarning ? '#d97706' : '#059669'
            } as React.CSSProperties}
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatValue(used)} used</span>
            <span>{formatValue(limit)} limit</span>
          </div>
        </div>
      )}
      
      {/* Status indicators */}
      <div className="flex items-center space-x-2">
        {isCritical ? (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs">Critical</span>
          </div>
        ) : isWarning ? (
          <div className="flex items-center space-x-1 text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs">Warning</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs">Normal</span>
          </div>
        )}
        
        {/* Trend indicator */}
        <div className="flex items-center space-x-1 text-gray-500">
          {percentage > 50 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span className="text-xs">
            {percentage > 50 ? 'High usage' : 'Low usage'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const WalletLimitIndicators: React.FC<WalletLimitIndicatorsProps> = ({
  limits,
  usage,
  compact = false,
  showWarnings = true,
  className = ''
}) => {
  // Calculate warning conditions
  const dailyPercentage = (usage.dailyUsed / limits.dailyTransferLimit) * 100;
  const monthlyPercentage = (usage.monthlyUsed / limits.monthlyTransferLimit) * 100;
  const hourlyPercentage = (usage.hourlyTransactions / limits.maxTransactionsPerHour) * 100;
  
  const hasWarnings = dailyPercentage >= 75 || monthlyPercentage >= 75 || hourlyPercentage >= 75;
  const hasCritical = dailyPercentage >= 90 || monthlyPercentage >= 90 || hourlyPercentage >= 90;
  
  const getOverallStatus = () => {
    if (hasCritical) return { status: 'Critical', color: 'text-red-600', icon: <AlertTriangle className="w-4 h-4" /> };
    if (hasWarnings) return { status: 'Warning', color: 'text-orange-600', icon: <AlertTriangle className="w-4 h-4" /> };
    return { status: 'Normal', color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
  };
  
  const overallStatus = getOverallStatus();
  
  if (compact) {
    return (
      <Card className={`wallet-limit-indicators-compact ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Limits</span>
            </div>
            <div className={`flex items-center space-x-1 ${overallStatus.color}`}>
              {overallStatus.icon}
              <span className="text-xs">{overallStatus.status}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-500">Daily</div>
              <div className="text-sm font-medium">
                {dailyPercentage.toFixed(0)}%
              </div>
              <div className={`w-full h-1 rounded-full mt-1 ${
                dailyPercentage >= 90 ? 'bg-red-200' : dailyPercentage >= 75 ? 'bg-orange-200' : 'bg-green-200'
              }`}>
                <div 
                  className={`h-1 rounded-full ${
                    dailyPercentage >= 90 ? 'bg-red-500' : dailyPercentage >= 75 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-gray-500">Monthly</div>
              <div className="text-sm font-medium">
                {monthlyPercentage.toFixed(0)}%
              </div>
              <div className={`w-full h-1 rounded-full mt-1 ${
                monthlyPercentage >= 90 ? 'bg-red-200' : monthlyPercentage >= 75 ? 'bg-orange-200' : 'bg-green-200'
              }`}>
                <div 
                  className={`h-1 rounded-full ${
                    monthlyPercentage >= 90 ? 'bg-red-500' : monthlyPercentage >= 75 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-gray-500">Hourly</div>
              <div className="text-sm font-medium">
                {hourlyPercentage.toFixed(0)}%
              </div>
              <div className={`w-full h-1 rounded-full mt-1 ${
                hourlyPercentage >= 90 ? 'bg-red-200' : hourlyPercentage >= 75 ? 'bg-orange-200' : 'bg-green-200'
              }`}>
                <div 
                  className={`h-1 rounded-full ${
                    hourlyPercentage >= 90 ? 'bg-red-500' : hourlyPercentage >= 75 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(hourlyPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`wallet-limit-indicators ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Wallet Limit Usage</span>
          </CardTitle>
          <div className={`flex items-center space-x-2 ${overallStatus.color}`}>
            {overallStatus.icon}
            <span className="text-sm font-medium">{overallStatus.status}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Daily Transfer Limit */}
        <LimitIndicator
          label="Daily Transfer Limit"
          used={usage.dailyUsed}
          limit={limits.dailyTransferLimit}
          unit="currency"
          icon={<DollarSign className="w-4 h-4" />}
        />
        
        {/* Monthly Transfer Limit */}
        <LimitIndicator
          label="Monthly Transfer Limit"
          used={usage.monthlyUsed}
          limit={limits.monthlyTransferLimit}
          unit="currency"
          icon={<DollarSign className="w-4 h-4" />}
        />
        
        {/* Hourly Transaction Count */}
        <LimitIndicator
          label="Transactions Per Hour"
          used={usage.hourlyTransactions}
          limit={limits.maxTransactionsPerHour}
          unit="count"
          icon={<Activity className="w-4 h-4" />}
        />
        
        {/* Current Transaction Amount Check */}
        {usage.currentTransactionAmount && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Current Transaction</span>
              </div>
              <Badge variant={
                usage.currentTransactionAmount > limits.maxTransactionAmount ? 'destructive' :
                usage.currentTransactionAmount > limits.requiresApprovalAbove ? 'secondary' : 'default'
              }>
                {usage.currentTransactionAmount > limits.maxTransactionAmount ? 'Exceeds Limit' :
                 usage.currentTransactionAmount > limits.requiresApprovalAbove ? 'Requires Approval' : 'Allowed'}
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usage.currentTransactionAmount)}
              {' / '}
              Limit: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(limits.maxTransactionAmount)}
            </div>
          </div>
        )}
        
        {/* Warnings */}
        {showWarnings && hasCritical && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are approaching or have exceeded critical usage limits. Some transactions may be blocked.
            </AlertDescription>
          </Alert>
        )}
        
        {showWarnings && hasWarnings && !hasCritical && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are approaching your usage limits. Consider monitoring your transaction activity.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(usage.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletLimitIndicators;
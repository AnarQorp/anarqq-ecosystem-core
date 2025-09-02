/**
 * Loading State and Progress Indicators Component
 * Provides various loading states and progress indicators for wallet operations
 * including transaction processing, identity switching, and data loading
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Clock,
  Zap,
  Shield,
  Wallet,
  Activity,
  Users,
  Settings,
  AlertTriangle
} from 'lucide-react';

// Loading State Types
export type LoadingStateType = 
  | 'idle'
  | 'loading'
  | 'processing'
  | 'validating'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'success'
  | 'error'
  | 'warning';

export type OperationType = 
  | 'transfer'
  | 'identity_switch'
  | 'balance_refresh'
  | 'transaction_history'
  | 'risk_assessment'
  | 'permission_check'
  | 'limit_validation'
  | 'audit_log'
  | 'pi_wallet_sync'
  | 'governance_check';

// Progress Indicator Props
export interface ProgressIndicatorProps {
  progress: number; // 0-100
  status: LoadingStateType;
  operation: OperationType;
  message?: string;
  estimatedTime?: number; // seconds
  showPercentage?: boolean;
  compact?: boolean;
  className?: string;
}

// Multi-step Progress Props
export interface MultiStepProgressProps {
  steps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    message?: string;
  }>;
  currentStep: number;
  className?: string;
}

// Transaction Loading Props
export interface TransactionLoadingProps {
  transactionHash?: string;
  status: 'preparing' | 'signing' | 'broadcasting' | 'confirming' | 'confirmed' | 'failed';
  confirmations?: number;
  requiredConfirmations?: number;
  estimatedTime?: number;
  onCancel?: () => void;
  className?: string;
}

// Identity Switch Loading Props
export interface IdentitySwitchLoadingProps {
  fromIdentity: string;
  toIdentity: string;
  stage: 'validating' | 'switching' | 'updating_contexts' | 'complete' | 'error';
  progress: number;
  currentModule?: string;
  failedModules?: string[];
  className?: string;
}

// Skeleton Loading Props
export interface WalletSkeletonProps {
  type: 'dashboard' | 'balance' | 'transaction_list' | 'transfer_form' | 'audit_status';
  count?: number;
  className?: string;
}

// Get operation icon
const getOperationIcon = (operation: OperationType, status: LoadingStateType) => {
  const iconClass = "w-4 h-4";
  
  if (status === 'success') return <CheckCircle className={`${iconClass} text-green-600`} />;
  if (status === 'error') return <XCircle className={`${iconClass} text-red-600`} />;
  if (status === 'warning') return <AlertTriangle className={`${iconClass} text-orange-600`} />;
  
  const operationIcons = {
    transfer: <Wallet className={iconClass} />,
    identity_switch: <Users className={iconClass} />,
    balance_refresh: <RefreshCw className={iconClass} />,
    transaction_history: <Activity className={iconClass} />,
    risk_assessment: <Shield className={iconClass} />,
    permission_check: <Settings className={iconClass} />,
    limit_validation: <Settings className={iconClass} />,
    audit_log: <Activity className={iconClass} />,
    pi_wallet_sync: <Zap className={iconClass} />,
    governance_check: <Users className={iconClass} />
  };
  
  return operationIcons[operation] || <Loader2 className={iconClass} />;
};

// Get status color
const getStatusColor = (status: LoadingStateType) => {
  switch (status) {
    case 'success': return 'text-green-600 bg-green-50';
    case 'error': return 'text-red-600 bg-red-50';
    case 'warning': return 'text-orange-600 bg-orange-50';
    case 'processing':
    case 'validating':
    case 'signing':
    case 'broadcasting':
    case 'confirming': return 'text-blue-600 bg-blue-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

// Format time remaining
const formatTimeRemaining = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

// Progress Indicator Component
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status,
  operation,
  message,
  estimatedTime,
  showPercentage = true,
  compact = false,
  className = ''
}) => {
  const isLoading = ['loading', 'processing', 'validating', 'signing', 'broadcasting', 'confirming'].includes(status);
  
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={isLoading ? 'animate-spin' : ''}>
          {getOperationIcon(operation, status)}
        </div>
        <div className="flex-1">
          <Progress value={progress} className="h-1" />
        </div>
        {showPercentage && (
          <span className="text-xs text-gray-500 min-w-[3rem]">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    );
  }
  
  return (
    <Card className={`progress-indicator ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={isLoading ? 'animate-spin' : ''}>
                {getOperationIcon(operation, status)}
              </div>
              <span className="font-medium capitalize">
                {operation.replace('_', ' ')}
              </span>
            </div>
            <Badge className={getStatusColor(status)}>
              {status.replace('_', ' ')}
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {message || `${status.replace('_', ' ')}...`}
              </span>
              <div className="flex items-center space-x-2">
                {showPercentage && (
                  <span className="text-gray-500">
                    {Math.round(progress)}%
                  </span>
                )}
                {estimatedTime && estimatedTime > 0 && (
                  <span className="text-gray-500">
                    ~{formatTimeRemaining(estimatedTime)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Multi-step Progress Component
export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep,
  className = ''
}) => {
  return (
    <Card className={`multi-step-progress ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-1">
                {step.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : step.status === 'error' ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
                )}
              </div>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'error' ? 'text-red-700' :
                    step.status === 'active' ? 'text-blue-700' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {index + 1}/{steps.length}
                  </Badge>
                </div>
                {step.message && (
                  <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 mt-8 w-0.5 h-6 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Transaction Loading Component
export const TransactionLoading: React.FC<TransactionLoadingProps> = ({
  transactionHash,
  status,
  confirmations = 0,
  requiredConfirmations = 3,
  estimatedTime,
  onCancel,
  className = ''
}) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'preparing': return 'Preparing transaction...';
      case 'signing': return 'Signing transaction...';
      case 'broadcasting': return 'Broadcasting to network...';
      case 'confirming': return `Confirming... (${confirmations}/${requiredConfirmations})`;
      case 'confirmed': return 'Transaction confirmed!';
      case 'failed': return 'Transaction failed';
      default: return 'Processing transaction...';
    }
  };
  
  const getProgress = () => {
    switch (status) {
      case 'preparing': return 10;
      case 'signing': return 25;
      case 'broadcasting': return 40;
      case 'confirming': return 40 + (confirmations / requiredConfirmations) * 50;
      case 'confirmed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  };
  
  return (
    <Card className={`transaction-loading ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={status === 'confirming' || status === 'broadcasting' ? 'animate-spin' : ''}>
                {status === 'confirmed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : status === 'failed' ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <span className="font-medium">Transaction Status</span>
            </div>
            {onCancel && status !== 'confirmed' && status !== 'failed' && (
              <button
                onClick={onCancel}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <Progress value={getProgress()} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{getStatusMessage()}</span>
              {estimatedTime && estimatedTime > 0 && status !== 'confirmed' && (
                <span className="text-gray-500">
                  ~{formatTimeRemaining(estimatedTime)}
                </span>
              )}
            </div>
          </div>
          
          {/* Transaction Hash */}
          {transactionHash && (
            <div className="p-2 bg-gray-50 rounded text-xs">
              <span className="text-gray-500">Hash: </span>
              <span className="font-mono">{transactionHash}</span>
            </div>
          )}
          
          {/* Confirmations */}
          {status === 'confirming' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Confirmations</span>
              <div className="flex items-center space-x-2">
                <Progress value={(confirmations / requiredConfirmations) * 100} className="w-20 h-1" />
                <span className="text-gray-500">
                  {confirmations}/{requiredConfirmations}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Identity Switch Loading Component
export const IdentitySwitchLoading: React.FC<IdentitySwitchLoadingProps> = ({
  fromIdentity,
  toIdentity,
  stage,
  progress,
  currentModule,
  failedModules = [],
  className = ''
}) => {
  const getStageMessage = () => {
    switch (stage) {
      case 'validating': return 'Validating identity permissions...';
      case 'switching': return 'Switching identity context...';
      case 'updating_contexts': return currentModule ? `Updating ${currentModule}...` : 'Updating module contexts...';
      case 'complete': return 'Identity switch completed!';
      case 'error': return 'Identity switch failed';
      default: return 'Processing identity switch...';
    }
  };
  
  return (
    <Card className={`identity-switch-loading ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={stage === 'switching' || stage === 'updating_contexts' ? 'animate-spin' : ''}>
                {stage === 'complete' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : stage === 'error' ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Users className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <span className="font-medium">Identity Switch</span>
            </div>
            <Badge className={getStatusColor(stage === 'complete' ? 'success' : stage === 'error' ? 'error' : 'processing')}>
              {stage.replace('_', ' ')}
            </Badge>
          </div>
          
          {/* Identity transition */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600">From:</span>
            <Badge variant="outline">{fromIdentity}</Badge>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">To:</span>
            <Badge variant="outline">{toIdentity}</Badge>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{getStageMessage()}</span>
              <span className="text-gray-500">{Math.round(progress)}%</span>
            </div>
          </div>
          
          {/* Failed modules */}
          {failedModules.length > 0 && (
            <div className="p-2 bg-red-50 rounded border-l-4 border-red-200">
              <div className="flex items-center space-x-2 text-red-700">
                <XCircle className="w-3 h-3" />
                <span className="text-xs font-medium">Failed Modules</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {failedModules.map((module) => (
                  <Badge key={module} variant="destructive" className="text-xs">
                    {module}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Wallet Skeleton Component
export const WalletSkeleton: React.FC<WalletSkeletonProps> = ({
  type,
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'dashboard':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        );
      
      case 'balance':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-8 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'transaction_list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'transfer_form':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        );
      
      case 'audit_status':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        );
      
      default:
        return <Skeleton className="h-20 w-full" />;
    }
  };
  
  return (
    <Card className={`wallet-skeleton ${className}`}>
      <CardContent className="p-4">
        {renderSkeleton()}
      </CardContent>
    </Card>
  );
};

export default {
  ProgressIndicator,
  MultiStepProgress,
  TransactionLoading,
  IdentitySwitchLoading,
  WalletSkeleton
};
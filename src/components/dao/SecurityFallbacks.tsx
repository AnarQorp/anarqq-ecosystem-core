/**
 * SecurityFallbacks - User-friendly fallback components for security restrictions
 * 
 * Provides clear, actionable messages for users when they encounter permission
 * restrictions, authentication requirements, or access limitations.
 */

import React from 'react';
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  UserIcon,
  WalletIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { PermissionMessage, DAORole } from '../../utils/permission-messages';

interface SecurityFallbackProps {
  message: PermissionMessage;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

interface AuthenticationFallbackProps {
  onSignIn?: () => void;
  className?: string;
  compact?: boolean;
}

interface MembershipFallbackProps {
  daoName: string;
  onJoinDAO?: () => void;
  className?: string;
  compact?: boolean;
}

interface RoleFallbackProps {
  userRole: DAORole;
  requiredRole: DAORole;
  action: string;
  className?: string;
  compact?: boolean;
}

interface WalletFallbackProps {
  issue: 'not_connected' | 'insufficient_balance' | 'no_tokens' | 'no_nfts';
  requiredAmount?: number;
  requiredToken?: string;
  onConnectWallet?: () => void;
  onAddFunds?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Generic security fallback component
 */
export const SecurityFallback: React.FC<SecurityFallbackProps> = ({
  message,
  onAction,
  className,
  compact = false
}) => {
  const getIcon = () => {
    switch (message.icon) {
      case 'lock':
        return <LockClosedIcon className="h-6 w-6" />;
      case 'user':
        return <UserIcon className="h-6 w-6" />;
      case 'wallet':
        return <WalletIcon className="h-6 w-6" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-6 w-6" />;
    }
  };

  const getColorClasses = () => {
    switch (message.severity) {
      case 'error':
        return {
          card: 'border-red-200 bg-red-50',
          icon: 'text-red-600',
          title: 'text-red-800',
          description: 'text-red-700',
          badge: 'text-red-700 border-red-300'
        };
      case 'warning':
        return {
          card: 'border-yellow-200 bg-yellow-50',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          description: 'text-yellow-700',
          badge: 'text-yellow-700 border-yellow-300'
        };
      case 'info':
      default:
        return {
          card: 'border-blue-200 bg-blue-50',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          description: 'text-blue-700',
          badge: 'text-blue-700 border-blue-300'
        };
    }
  };

  const colors = getColorClasses();

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3 p-3 rounded-lg", colors.card, className)}>
        <div className={cn("flex-shrink-0", colors.icon)}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", colors.title)}>{message.title}</p>
          <p className={cn("text-sm", colors.description)}>{message.description}</p>
        </div>
        {message.action && onAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
            className="flex-shrink-0"
          >
            {message.action}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(colors.card, className)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className={cn("flex-shrink-0", colors.icon)}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className={cn("text-lg font-semibold mb-2", colors.title)}>
              {message.title}
            </h3>
            <p className={cn("text-sm mb-4", colors.description)}>
              {message.description}
            </p>
            {message.action && onAction && (
              <Button
                onClick={onAction}
                className="inline-flex items-center"
              >
                {message.action}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Authentication required fallback
 */
export const AuthenticationFallback: React.FC<AuthenticationFallbackProps> = ({
  onSignIn,
  className,
  compact = false
}) => {
  const message: PermissionMessage = {
    title: 'Authentication Required',
    description: 'Please sign in with your sQuid identity to access DAO features and wallet functionality.',
    action: 'Sign In',
    icon: 'user',
    severity: 'info'
  };

  return (
    <SecurityFallback
      message={message}
      onAction={onSignIn}
      className={className}
      compact={compact}
    />
  );
};

/**
 * DAO membership required fallback
 */
export const MembershipFallback: React.FC<MembershipFallbackProps> = ({
  daoName,
  onJoinDAO,
  className,
  compact = false
}) => {
  const message: PermissionMessage = {
    title: 'DAO Membership Required',
    description: `You must be a member of ${daoName} to access this feature. Join the DAO to participate in governance and access member-only features.`,
    action: 'Join DAO',
    icon: 'user',
    severity: 'info'
  };

  return (
    <SecurityFallback
      message={message}
      onAction={onJoinDAO}
      className={className}
      compact={compact}
    />
  );
};

/**
 * Insufficient role fallback
 */
export const RoleFallback: React.FC<RoleFallbackProps> = ({
  userRole,
  requiredRole,
  action,
  className,
  compact = false
}) => {
  const message: PermissionMessage = {
    title: 'Insufficient Permissions',
    description: `${action} requires ${requiredRole} role or higher. Your current role is ${userRole}. Contact a DAO administrator to request elevated permissions.`,
    icon: 'lock',
    severity: 'error'
  };

  return (
    <SecurityFallback
      message={message}
      className={className}
      compact={compact}
    />
  );
};

/**
 * Wallet-related fallback
 */
export const WalletFallback: React.FC<WalletFallbackProps> = ({
  issue,
  requiredAmount,
  requiredToken,
  onConnectWallet,
  onAddFunds,
  className,
  compact = false
}) => {
  const getMessage = (): PermissionMessage => {
    switch (issue) {
      case 'not_connected':
        return {
          title: 'Wallet Connection Required',
          description: 'Connect your wallet to access token balances, NFTs, and perform transactions.',
          action: 'Connect Wallet',
          icon: 'wallet',
          severity: 'info'
        };
      case 'insufficient_balance':
        return {
          title: 'Insufficient Balance',
          description: requiredAmount && requiredToken
            ? `You need at least ${requiredAmount} ${requiredToken} to perform this action. Add funds to your wallet to continue.`
            : 'Insufficient token balance for this action. Add funds to your wallet to continue.',
          action: 'Add Funds',
          icon: 'wallet',
          severity: 'warning'
        };
      case 'no_tokens':
        return {
          title: 'No Governance Tokens',
          description: 'You do not have any governance tokens. Acquire tokens to participate in DAO voting and proposals.',
          action: 'Acquire Tokens',
          icon: 'wallet',
          severity: 'info'
        };
      case 'no_nfts':
        return {
          title: 'No NFTs Available',
          description: 'You do not have any NFTs in your wallet. Mint or acquire NFTs to access NFT-based features.',
          action: 'Mint NFT',
          icon: 'wallet',
          severity: 'info'
        };
      default:
        return {
          title: 'Wallet Issue',
          description: 'There is an issue with your wallet connection or balance.',
          icon: 'wallet',
          severity: 'warning'
        };
    }
  };

  const message = getMessage();
  const onAction = issue === 'not_connected' ? onConnectWallet : onAddFunds;

  return (
    <SecurityFallback
      message={message}
      onAction={onAction}
      className={className}
      compact={compact}
    />
  );
};

/**
 * Feature unavailable fallback
 */
interface FeatureUnavailableFallbackProps {
  featureName: string;
  reason?: string;
  className?: string;
  compact?: boolean;
}

export const FeatureUnavailableFallback: React.FC<FeatureUnavailableFallbackProps> = ({
  featureName,
  reason,
  className,
  compact = false
}) => {
  const message: PermissionMessage = {
    title: `${featureName} Unavailable`,
    description: reason || 'This feature is currently unavailable or under maintenance. Please try again later.',
    icon: 'warning',
    severity: 'warning'
  };

  return (
    <SecurityFallback
      message={message}
      className={className}
      compact={compact}
    />
  );
};

/**
 * Maintenance mode fallback
 */
interface MaintenanceFallbackProps {
  estimatedTime?: string;
  className?: string;
  compact?: boolean;
}

export const MaintenanceFallback: React.FC<MaintenanceFallbackProps> = ({
  estimatedTime,
  className,
  compact = false
}) => {
  const message: PermissionMessage = {
    title: 'System Maintenance',
    description: estimatedTime
      ? `This feature is temporarily unavailable due to system maintenance. Estimated completion: ${estimatedTime}.`
      : 'This feature is temporarily unavailable due to system maintenance. Please check back later.',
    icon: 'warning',
    severity: 'warning'
  };

  return (
    <SecurityFallback
      message={message}
      className={className}
      compact={compact}
    />
  );
};

/**
 * Composite fallback that handles multiple security scenarios
 */
interface CompositeFallbackProps {
  isAuthenticated: boolean;
  isMember: boolean;
  userRole: DAORole;
  requiredRole?: DAORole;
  hasWallet: boolean;
  hasBalance?: boolean;
  requiredAmount?: number;
  requiredToken?: string;
  daoName: string;
  action: string;
  onSignIn?: () => void;
  onJoinDAO?: () => void;
  onConnectWallet?: () => void;
  onAddFunds?: () => void;
  className?: string;
  compact?: boolean;
}

export const CompositeFallback: React.FC<CompositeFallbackProps> = ({
  isAuthenticated,
  isMember,
  userRole,
  requiredRole,
  hasWallet,
  hasBalance,
  requiredAmount,
  requiredToken,
  daoName,
  action,
  onSignIn,
  onJoinDAO,
  onConnectWallet,
  onAddFunds,
  className,
  compact = false
}) => {
  // Priority order: Authentication > Membership > Wallet > Role > Balance
  
  if (!isAuthenticated) {
    return (
      <AuthenticationFallback
        onSignIn={onSignIn}
        className={className}
        compact={compact}
      />
    );
  }

  if (!isMember) {
    return (
      <MembershipFallback
        daoName={daoName}
        onJoinDAO={onJoinDAO}
        className={className}
        compact={compact}
      />
    );
  }

  if (!hasWallet) {
    return (
      <WalletFallback
        issue="not_connected"
        onConnectWallet={onConnectWallet}
        className={className}
        compact={compact}
      />
    );
  }

  if (requiredRole) {
    const roleHierarchy: Record<DAORole, number> = {
      member: 0,
      moderator: 1,
      admin: 2,
      owner: 3
    };

    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      return (
        <RoleFallback
          userRole={userRole}
          requiredRole={requiredRole}
          action={action}
          className={className}
          compact={compact}
        />
      );
    }
  }

  if (hasBalance === false || (requiredAmount && requiredToken)) {
    return (
      <WalletFallback
        issue="insufficient_balance"
        requiredAmount={requiredAmount}
        requiredToken={requiredToken}
        onAddFunds={onAddFunds}
        className={className}
        compact={compact}
      />
    );
  }

  // Default fallback for unknown issues
  const message: PermissionMessage = {
    title: 'Access Restricted',
    description: `You do not have permission to ${action.toLowerCase()}. Please contact a DAO administrator for assistance.`,
    icon: 'lock',
    severity: 'error'
  };

  return (
    <SecurityFallback
      message={message}
      className={className}
      compact={compact}
    />
  );
};

/**
 * Hook for using security fallbacks
 */
export function useSecurityFallbacks() {
  return {
    SecurityFallback,
    AuthenticationFallback,
    MembershipFallback,
    RoleFallback,
    WalletFallback,
    FeatureUnavailableFallback,
    MaintenanceFallback,
    CompositeFallback
  };
}
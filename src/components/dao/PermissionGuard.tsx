/**
 * PermissionGuard - Component for conditional rendering based on permissions
 * 
 * Provides declarative permission-based rendering with fallback messages
 * for unauthorized access attempts in DAO components.
 */

import React from 'react';
import { ExclamationTriangleIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { PermissionCheckResult, DAORole } from '../../utils/dao-permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: PermissionCheckResult;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  className?: string;
}

interface RoleGuardProps {
  children: React.ReactNode;
  userRole: DAORole;
  requiredRole: DAORole;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  className?: string;
}

interface AuthGuardProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isMember?: boolean;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  className?: string;
}

interface WalletGuardProps {
  children: React.ReactNode;
  hasWallet: boolean;
  hasBalance?: boolean;
  requiredBalance?: number;
  requiredToken?: string;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  className?: string;
}

/**
 * Generic permission guard component
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  fallback,
  showFallback = true,
  className
}) => {
  if (permission.allowed) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return null;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <Card className={cn("border-yellow-200 bg-yellow-50", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 font-medium">Access Restricted</p>
            <p className="text-sm text-yellow-700 mt-1">
              {permission.reason || 'You do not have permission to access this feature.'}
            </p>
            {permission.requiredRole && (
              <Badge variant="outline" className="mt-2 text-yellow-700 border-yellow-300">
                {permission.requiredRole} role required
              </Badge>
            )}
            {permission.requiredBalance && permission.requiredToken && (
              <Badge variant="outline" className="mt-2 ml-2 text-yellow-700 border-yellow-300">
                {permission.requiredBalance} {permission.requiredToken} required
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Role-based guard component
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  userRole,
  requiredRole,
  fallback,
  showFallback = true,
  className
}) => {
  const roleHierarchy: Record<DAORole, number> = {
    member: 0,
    moderator: 1,
    admin: 2,
    owner: 3
  };

  const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole];

  if (hasPermission) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return null;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <Card className={cn("border-red-200 bg-red-50", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <LockClosedIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">Insufficient Permissions</p>
            <p className="text-sm text-red-700 mt-1">
              This action requires {requiredRole} role or higher. Your current role: {userRole}.
            </p>
            <Badge variant="outline" className="mt-2 text-red-700 border-red-300">
              {requiredRole}+ required
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Authentication and membership guard component
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  isAuthenticated,
  isMember,
  fallback,
  showFallback = true,
  className
}) => {
  if (isAuthenticated && (isMember === undefined || isMember)) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return null;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  const isAuthIssue = !isAuthenticated;
  const isMembershipIssue = isAuthenticated && isMember === false;

  return (
    <Card className={cn("border-blue-200 bg-blue-50", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <UserIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            {isAuthIssue ? (
              <>
                <p className="text-sm text-blue-800 font-medium">Authentication Required</p>
                <p className="text-sm text-blue-700 mt-1">
                  Please sign in to access this feature.
                </p>
                <Badge variant="outline" className="mt-2 text-blue-700 border-blue-300">
                  Sign In Required
                </Badge>
              </>
            ) : isMembershipIssue ? (
              <>
                <p className="text-sm text-blue-800 font-medium">Membership Required</p>
                <p className="text-sm text-blue-700 mt-1">
                  You must be a member of this DAO to access this feature.
                </p>
                <Badge variant="outline" className="mt-2 text-blue-700 border-blue-300">
                  DAO Membership Required
                </Badge>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Wallet connection and balance guard component
 */
export const WalletGuard: React.FC<WalletGuardProps> = ({
  children,
  hasWallet,
  hasBalance,
  requiredBalance,
  requiredToken,
  fallback,
  showFallback = true,
  className
}) => {
  const canAccess = hasWallet && (hasBalance === undefined || hasBalance);

  if (canAccess) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return null;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  const isWalletIssue = !hasWallet;
  const isBalanceIssue = hasWallet && hasBalance === false;

  return (
    <Card className={cn("border-purple-200 bg-purple-50", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            {isWalletIssue ? (
              <>
                <p className="text-sm text-purple-800 font-medium">Wallet Connection Required</p>
                <p className="text-sm text-purple-700 mt-1">
                  Please connect your wallet to access this feature.
                </p>
                <Badge variant="outline" className="mt-2 text-purple-700 border-purple-300">
                  Wallet Required
                </Badge>
              </>
            ) : isBalanceIssue ? (
              <>
                <p className="text-sm text-purple-800 font-medium">Insufficient Balance</p>
                <p className="text-sm text-purple-700 mt-1">
                  {requiredBalance && requiredToken
                    ? `You need at least ${requiredBalance} ${requiredToken} to perform this action.`
                    : 'Insufficient token balance for this action.'
                  }
                </p>
                {requiredBalance && requiredToken && (
                  <Badge variant="outline" className="mt-2 text-purple-700 border-purple-300">
                    {requiredBalance} {requiredToken} required
                  </Badge>
                )}
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Composite guard that combines multiple permission checks
 */
interface CompositeGuardProps {
  children: React.ReactNode;
  checks: Array<{
    type: 'auth' | 'role' | 'wallet' | 'custom';
    props: any;
  }>;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  className?: string;
}

export const CompositeGuard: React.FC<CompositeGuardProps> = ({
  children,
  checks,
  fallback,
  showFallback = true,
  className
}) => {
  for (const check of checks) {
    switch (check.type) {
      case 'auth':
        if (!check.props.isAuthenticated || (check.props.isMember !== undefined && !check.props.isMember)) {
          return (
            <AuthGuard
              isAuthenticated={check.props.isAuthenticated}
              isMember={check.props.isMember}
              fallback={fallback}
              showFallback={showFallback}
              className={className}
            >
              {children}
            </AuthGuard>
          );
        }
        break;

      case 'role':
        const roleHierarchy: Record<DAORole, number> = {
          member: 0,
          moderator: 1,
          admin: 2,
          owner: 3
        };
        if (roleHierarchy[check.props.userRole] < roleHierarchy[check.props.requiredRole]) {
          return (
            <RoleGuard
              userRole={check.props.userRole}
              requiredRole={check.props.requiredRole}
              fallback={fallback}
              showFallback={showFallback}
              className={className}
            >
              {children}
            </RoleGuard>
          );
        }
        break;

      case 'wallet':
        if (!check.props.hasWallet || (check.props.hasBalance !== undefined && !check.props.hasBalance)) {
          return (
            <WalletGuard
              hasWallet={check.props.hasWallet}
              hasBalance={check.props.hasBalance}
              requiredBalance={check.props.requiredBalance}
              requiredToken={check.props.requiredToken}
              fallback={fallback}
              showFallback={showFallback}
              className={className}
            >
              {children}
            </WalletGuard>
          );
        }
        break;

      case 'custom':
        if (!check.props.permission.allowed) {
          return (
            <PermissionGuard
              permission={check.props.permission}
              fallback={fallback}
              showFallback={showFallback}
              className={className}
            >
              {children}
            </PermissionGuard>
          );
        }
        break;
    }
  }

  return <>{children}</>;
};

/**
 * Hook for using permission guards in functional components
 */
export function usePermissionGuard() {
  return {
    PermissionGuard,
    RoleGuard,
    AuthGuard,
    WalletGuard,
    CompositeGuard
  };
}
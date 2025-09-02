/**
 * DAO Permission Validation Utilities
 * 
 * Provides role-based access control and permission checking for DAO operations
 * including wallet actions, proposal management, and sensitive operations.
 */

import type { Membership } from '../composables/useDAO';
import type { WalletBalances, NFT } from '../composables/useQwallet';

// Permission levels for DAO operations
export type DAORole = 'member' | 'moderator' | 'admin' | 'owner';

// Permission categories
export interface DAOPermissions {
  canVote: boolean;
  canCreateProposals: boolean;
  canModerate: boolean;
  canMintNFT: boolean;
  canTransferTokens: boolean;
  canViewWalletData: boolean;
  canPerformWalletActions: boolean;
  canAccessAnalytics: boolean;
  canManageMembers: boolean;
}

// Permission check results
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: DAORole;
  requiredBalance?: number;
  requiredToken?: string;
}

// Error messages for permission failures
export const PERMISSION_ERRORS = {
  NOT_AUTHENTICATED: 'Authentication required to perform this action',
  NOT_MEMBER: 'DAO membership required to perform this action',
  INSUFFICIENT_ROLE: 'Insufficient permissions for this action',
  INSUFFICIENT_BALANCE: 'Insufficient token balance for this action',
  NO_NFTS: 'NFT ownership required for this action',
  WALLET_NOT_CONNECTED: 'Wallet connection required for this action',
  INVALID_SESSION: 'Valid session required for this action',
  UNKNOWN_ERROR: 'Permission check failed due to unknown error'
} as const;

/**
 * Determines user role based on membership permissions
 */
export function getUserRole(membership: Membership | null): DAORole {
  if (!membership?.isMember) return 'member';
  if (membership.permissions?.isOwner) return 'owner';
  if (membership.permissions?.isAdmin) return 'admin';
  if (membership.permissions?.isModerator) return 'moderator';
  return 'member';
}

/**
 * Gets all permissions for a user based on their role and membership
 */
export function getUserPermissions(
  membership: Membership | null,
  isAuthenticated: boolean,
  hasSession: boolean
): DAOPermissions {
  const role = getUserRole(membership);
  const isMember = membership?.isMember || false;
  
  return {
    canVote: isAuthenticated && isMember && (membership?.permissions?.canVote || false),
    canCreateProposals: isAuthenticated && isMember && (membership?.permissions?.canCreateProposals || false),
    canModerate: isAuthenticated && isMember && (membership?.permissions?.canModerate || false),
    canMintNFT: isAuthenticated && isMember && ['moderator', 'admin', 'owner'].includes(role),
    canTransferTokens: isAuthenticated && isMember && hasSession,
    canViewWalletData: isAuthenticated && isMember && hasSession,
    canPerformWalletActions: isAuthenticated && isMember && hasSession && ['moderator', 'admin', 'owner'].includes(role),
    canAccessAnalytics: isAuthenticated && isMember,
    canManageMembers: isAuthenticated && isMember && ['admin', 'owner'].includes(role)
  };
}

/**
 * Checks if user has required role for an action
 */
export function checkRolePermission(
  membership: Membership | null,
  requiredRole: DAORole
): PermissionCheckResult {
  const userRole = getUserRole(membership);
  const roleHierarchy: Record<DAORole, number> = {
    member: 0,
    moderator: 1,
    admin: 2,
    owner: 3
  };

  const userLevel = roleHierarchy[userRole];
  const requiredLevel = roleHierarchy[requiredRole];

  if (userLevel >= requiredLevel) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: PERMISSION_ERRORS.INSUFFICIENT_ROLE,
    requiredRole
  };
}

/**
 * Checks if user has sufficient token balance for an action
 */
export function checkTokenBalance(
  balances: WalletBalances | null,
  requiredAmount: number,
  token: 'QToken' | 'PI' = 'QToken'
): PermissionCheckResult {
  if (!balances) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.WALLET_NOT_CONNECTED
    };
  }

  const balance = balances[token]?.balance || 0;
  
  if (balance >= requiredAmount) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: PERMISSION_ERRORS.INSUFFICIENT_BALANCE,
    requiredBalance: requiredAmount,
    requiredToken: token
  };
}

/**
 * Checks if user has NFTs for NFT-based actions
 */
export function checkNFTOwnership(
  nfts: NFT[],
  daoId?: string
): PermissionCheckResult {
  if (!nfts || nfts.length === 0) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NO_NFTS
    };
  }

  // If daoId is specified, check for DAO-specific NFTs
  if (daoId) {
    const daoNFTs = nfts.filter(nft => 
      nft.attributes?.some(attr => 
        attr.trait_type === 'dao_id' && attr.value === daoId
      )
    );

    if (daoNFTs.length === 0) {
      return {
        allowed: false,
        reason: 'DAO-specific NFT ownership required for this action'
      };
    }
  }

  return { allowed: true };
}

/**
 * Comprehensive permission check for wallet operations
 */
export function checkWalletPermission(
  action: 'transfer' | 'mint' | 'view' | 'manage',
  membership: Membership | null,
  isAuthenticated: boolean,
  hasSession: boolean,
  balances?: WalletBalances | null,
  nfts?: NFT[],
  requiredAmount?: number,
  requiredToken?: 'QToken' | 'PI'
): PermissionCheckResult {
  // Basic authentication check
  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NOT_AUTHENTICATED
    };
  }

  // Session check for wallet operations
  if (!hasSession) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.INVALID_SESSION
    };
  }

  // Membership check
  if (!membership?.isMember) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NOT_MEMBER
    };
  }

  // Action-specific checks
  switch (action) {
    case 'view':
      // Basic members can view wallet data
      return { allowed: true };

    case 'transfer':
      // Check token balance if required
      if (requiredAmount && requiredToken && balances) {
        return checkTokenBalance(balances, requiredAmount, requiredToken);
      }
      return { allowed: true };

    case 'mint':
      // Only moderators and above can mint NFTs
      return checkRolePermission(membership, 'moderator');

    case 'manage':
      // Only admins and above can manage wallet settings
      return checkRolePermission(membership, 'admin');

    default:
      return {
        allowed: false,
        reason: PERMISSION_ERRORS.UNKNOWN_ERROR
      };
  }
}

/**
 * Checks if user can create proposals
 */
export function checkProposalCreationPermission(
  membership: Membership | null,
  isAuthenticated: boolean,
  balances?: WalletBalances | null,
  tokenRequirement?: { token: string; amount: number }
): PermissionCheckResult {
  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NOT_AUTHENTICATED
    };
  }

  if (!membership?.isMember) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NOT_MEMBER
    };
  }

  if (!membership.permissions?.canCreateProposals) {
    return {
      allowed: false,
      reason: 'Proposal creation permission required'
    };
  }

  // Check token requirement if specified
  if (tokenRequirement && balances) {
    const tokenKey = tokenRequirement.token as 'QToken' | 'PI';
    return checkTokenBalance(balances, tokenRequirement.amount, tokenKey);
  }

  return { allowed: true };
}

/**
 * Checks if user can vote on proposals
 */
export function checkVotingPermission(
  membership: Membership | null,
  isAuthenticated: boolean,
  proposalStatus: 'active' | 'closed',
  expiresAt: string
): PermissionCheckResult {
  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NOT_AUTHENTICATED
    };
  }

  if (!membership?.isMember) {
    return {
      allowed: false,
      reason: PERMISSION_ERRORS.NOT_MEMBER
    };
  }

  if (!membership.permissions?.canVote) {
    return {
      allowed: false,
      reason: 'Voting permission required'
    };
  }

  if (proposalStatus !== 'active') {
    return {
      allowed: false,
      reason: 'Proposal is not active for voting'
    };
  }

  if (new Date() > new Date(expiresAt)) {
    return {
      allowed: false,
      reason: 'Proposal voting period has expired'
    };
  }

  return { allowed: true };
}

/**
 * Gets user-friendly error message for permission failures
 */
export function getPermissionErrorMessage(
  result: PermissionCheckResult,
  action?: string
): string {
  if (result.allowed) {
    return '';
  }

  let message = result.reason || PERMISSION_ERRORS.UNKNOWN_ERROR;

  // Add context-specific information
  if (result.requiredRole) {
    message += ` (${result.requiredRole} role or higher required)`;
  }

  if (result.requiredBalance && result.requiredToken) {
    message += ` (${result.requiredBalance} ${result.requiredToken} required)`;
  }

  if (action) {
    message = `Cannot ${action}: ${message}`;
  }

  return message;
}

/**
 * Validates multiple permissions at once
 */
export function validateMultiplePermissions(
  checks: Array<{
    name: string;
    check: () => PermissionCheckResult;
  }>
): { allowed: boolean; failures: Array<{ name: string; reason: string }> } {
  const failures: Array<{ name: string; reason: string }> = [];

  for (const { name, check } of checks) {
    const result = check();
    if (!result.allowed) {
      failures.push({
        name,
        reason: getPermissionErrorMessage(result, name)
      });
    }
  }

  return {
    allowed: failures.length === 0,
    failures
  };
}

/**
 * Creates a permission checker function with pre-bound context
 */
export function createPermissionChecker(
  membership: Membership | null,
  isAuthenticated: boolean,
  hasSession: boolean,
  balances?: WalletBalances | null,
  nfts?: NFT[]
) {
  return {
    checkRole: (requiredRole: DAORole) => checkRolePermission(membership, requiredRole),
    checkTokenBalance: (amount: number, token: 'QToken' | 'PI' = 'QToken') => 
      checkTokenBalance(balances || null, amount, token),
    checkNFTs: (daoId?: string) => checkNFTOwnership(nfts || [], daoId),
    checkWallet: (
      action: 'transfer' | 'mint' | 'view' | 'manage',
      requiredAmount?: number,
      requiredToken?: 'QToken' | 'PI'
    ) => checkWalletPermission(
      action,
      membership,
      isAuthenticated,
      hasSession,
      balances,
      nfts,
      requiredAmount,
      requiredToken
    ),
    checkProposalCreation: (tokenRequirement?: { token: string; amount: number }) =>
      checkProposalCreationPermission(membership, isAuthenticated, balances, tokenRequirement),
    checkVoting: (proposalStatus: 'active' | 'closed', expiresAt: string) =>
      checkVotingPermission(membership, isAuthenticated, proposalStatus, expiresAt),
    getPermissions: () => getUserPermissions(membership, isAuthenticated, hasSession),
    getRole: () => getUserRole(membership)
  };
}
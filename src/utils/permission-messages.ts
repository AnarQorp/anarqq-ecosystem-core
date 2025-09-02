/**
 * Permission Error Messages
 * 
 * Centralized user-friendly messages for permission failures and access restrictions
 * in DAO operations and wallet actions.
 */

import type { DAORole } from './dao-permissions';

// Message categories
export interface PermissionMessage {
  title: string;
  description: string;
  action?: string;
  icon?: 'lock' | 'user' | 'wallet' | 'warning' | 'info';
  severity?: 'error' | 'warning' | 'info';
}

// Authentication messages
export const AUTH_MESSAGES = {
  NOT_AUTHENTICATED: {
    title: 'Authentication Required',
    description: 'Please sign in with your sQuid identity to access this feature.',
    action: 'Sign In',
    icon: 'user' as const,
    severity: 'info' as const
  },
  INVALID_SESSION: {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again to continue.',
    action: 'Sign In Again',
    icon: 'user' as const,
    severity: 'warning' as const
  },
  SESSION_REQUIRED: {
    title: 'Valid Session Required',
    description: 'A valid authentication session is required for wallet operations.',
    action: 'Refresh Session',
    icon: 'user' as const,
    severity: 'warning' as const
  }
} as const;

// Membership messages
export const MEMBERSHIP_MESSAGES = {
  NOT_MEMBER: {
    title: 'DAO Membership Required',
    description: 'You must be a member of this DAO to access this feature.',
    action: 'Join DAO',
    icon: 'user' as const,
    severity: 'info' as const
  },
  MEMBERSHIP_PENDING: {
    title: 'Membership Pending',
    description: 'Your DAO membership request is being processed. Please wait for approval.',
    icon: 'info' as const,
    severity: 'info' as const
  },
  MEMBERSHIP_EXPIRED: {
    title: 'Membership Expired',
    description: 'Your DAO membership has expired. Please renew to continue accessing features.',
    action: 'Renew Membership',
    icon: 'warning' as const,
    severity: 'warning' as const
  }
} as const;

// Role-based messages
export const ROLE_MESSAGES = {
  INSUFFICIENT_ROLE: (userRole: DAORole, requiredRole: DAORole): PermissionMessage => ({
    title: 'Insufficient Permissions',
    description: `This action requires ${requiredRole} role or higher. Your current role is ${userRole}.`,
    icon: 'lock',
    severity: 'error'
  }),
  MODERATOR_REQUIRED: {
    title: 'Moderator Access Required',
    description: 'This action is restricted to DAO moderators and administrators.',
    icon: 'lock' as const,
    severity: 'error' as const
  },
  ADMIN_REQUIRED: {
    title: 'Administrator Access Required',
    description: 'This action is restricted to DAO administrators and owners.',
    icon: 'lock' as const,
    severity: 'error' as const
  },
  OWNER_REQUIRED: {
    title: 'Owner Access Required',
    description: 'This action is restricted to DAO owners only.',
    icon: 'lock' as const,
    severity: 'error' as const
  }
} as const;

// Wallet messages
export const WALLET_MESSAGES = {
  NOT_CONNECTED: {
    title: 'Wallet Connection Required',
    description: 'Please connect your wallet to access financial features.',
    action: 'Connect Wallet',
    icon: 'wallet' as const,
    severity: 'info' as const
  },
  INSUFFICIENT_BALANCE: (amount: number, token: string): PermissionMessage => ({
    title: 'Insufficient Balance',
    description: `You need at least ${amount} ${token} to perform this action.`,
    action: 'Add Funds',
    icon: 'wallet',
    severity: 'warning'
  }),
  NO_TOKENS: {
    title: 'No Tokens Available',
    description: 'You do not have any governance tokens in your wallet.',
    action: 'Acquire Tokens',
    icon: 'wallet' as const,
    severity: 'info' as const
  },
  NO_NFTS: {
    title: 'No NFTs Available',
    description: 'You do not have any NFTs in your wallet.',
    action: 'Mint NFT',
    icon: 'wallet' as const,
    severity: 'info' as const
  },
  NO_DAO_NFTS: (daoName: string): PermissionMessage => ({
    title: 'DAO NFT Required',
    description: `You need to own an NFT from ${daoName} to perform this action.`,
    action: 'Mint DAO NFT',
    icon: 'wallet',
    severity: 'warning'
  })
} as const;

// Proposal messages
export const PROPOSAL_MESSAGES = {
  CANNOT_CREATE: {
    title: 'Cannot Create Proposal',
    description: 'You do not have permission to create proposals in this DAO.',
    icon: 'lock' as const,
    severity: 'error' as const
  },
  CANNOT_VOTE: {
    title: 'Cannot Vote',
    description: 'You do not have voting permissions in this DAO.',
    icon: 'lock' as const,
    severity: 'error' as const
  },
  PROPOSAL_CLOSED: {
    title: 'Voting Closed',
    description: 'This proposal is no longer accepting votes.',
    icon: 'info' as const,
    severity: 'info' as const
  },
  PROPOSAL_EXPIRED: {
    title: 'Proposal Expired',
    description: 'The voting period for this proposal has ended.',
    icon: 'warning' as const,
    severity: 'warning' as const
  },
  ALREADY_VOTED: {
    title: 'Already Voted',
    description: 'You have already cast your vote on this proposal.',
    icon: 'info' as const,
    severity: 'info' as const
  },
  TOKEN_REQUIREMENT_NOT_MET: (amount: number, token: string): PermissionMessage => ({
    title: 'Token Requirement Not Met',
    description: `You need ${amount} ${token} to create proposals in this DAO.`,
    action: 'Acquire Tokens',
    icon: 'wallet',
    severity: 'warning'
  })
} as const;

// Action-specific messages
export const ACTION_MESSAGES = {
  MINT_NFT: {
    INSUFFICIENT_ROLE: {
      title: 'Cannot Mint NFT',
      description: 'NFT minting is restricted to DAO moderators and administrators.',
      icon: 'lock' as const,
      severity: 'error' as const
    },
    QUOTA_EXCEEDED: {
      title: 'Minting Quota Exceeded',
      description: 'You have reached your NFT minting limit for this period.',
      icon: 'warning' as const,
      severity: 'warning' as const
    }
  },
  TRANSFER_TOKENS: {
    INSUFFICIENT_BALANCE: (amount: number, token: string): PermissionMessage => ({
      title: 'Cannot Transfer Tokens',
      description: `Insufficient ${token} balance. You need ${amount} ${token} for this transfer.`,
      icon: 'wallet',
      severity: 'error'
    }),
    INVALID_RECIPIENT: {
      title: 'Invalid Recipient',
      description: 'The recipient address is not valid or not found.',
      icon: 'warning' as const,
      severity: 'error' as const
    }
  },
  VIEW_ANALYTICS: {
    MEMBER_ONLY: {
      title: 'Member-Only Feature',
      description: 'DAO analytics are only available to DAO members.',
      action: 'Join DAO',
      icon: 'lock' as const,
      severity: 'info' as const
    }
  },
  MANAGE_MEMBERS: {
    ADMIN_REQUIRED: {
      title: 'Administrator Required',
      description: 'Member management is restricted to DAO administrators.',
      icon: 'lock' as const,
      severity: 'error' as const
    }
  }
} as const;

// Generic fallback messages
export const GENERIC_MESSAGES = {
  ACCESS_DENIED: {
    title: 'Access Denied',
    description: 'You do not have permission to access this feature.',
    icon: 'lock' as const,
    severity: 'error' as const
  },
  FEATURE_UNAVAILABLE: {
    title: 'Feature Unavailable',
    description: 'This feature is currently unavailable or under maintenance.',
    icon: 'warning' as const,
    severity: 'warning' as const
  },
  UNKNOWN_ERROR: {
    title: 'Permission Error',
    description: 'An unknown permission error occurred. Please try again.',
    icon: 'warning' as const,
    severity: 'error' as const
  }
} as const;

/**
 * Gets appropriate message for authentication failures
 */
export function getAuthMessage(
  isAuthenticated: boolean,
  hasValidSession: boolean
): PermissionMessage {
  if (!isAuthenticated) {
    return AUTH_MESSAGES.NOT_AUTHENTICATED;
  }
  if (!hasValidSession) {
    return AUTH_MESSAGES.INVALID_SESSION;
  }
  return AUTH_MESSAGES.SESSION_REQUIRED;
}

/**
 * Gets appropriate message for membership failures
 */
export function getMembershipMessage(
  isMember: boolean,
  membershipStatus?: 'active' | 'pending' | 'expired'
): PermissionMessage {
  if (!isMember) {
    return MEMBERSHIP_MESSAGES.NOT_MEMBER;
  }
  
  switch (membershipStatus) {
    case 'pending':
      return MEMBERSHIP_MESSAGES.MEMBERSHIP_PENDING;
    case 'expired':
      return MEMBERSHIP_MESSAGES.MEMBERSHIP_EXPIRED;
    default:
      return MEMBERSHIP_MESSAGES.NOT_MEMBER;
  }
}

/**
 * Gets appropriate message for role-based failures
 */
export function getRoleMessage(
  userRole: DAORole,
  requiredRole: DAORole
): PermissionMessage {
  switch (requiredRole) {
    case 'moderator':
      return ROLE_MESSAGES.MODERATOR_REQUIRED;
    case 'admin':
      return ROLE_MESSAGES.ADMIN_REQUIRED;
    case 'owner':
      return ROLE_MESSAGES.OWNER_REQUIRED;
    default:
      return ROLE_MESSAGES.INSUFFICIENT_ROLE(userRole, requiredRole);
  }
}

/**
 * Gets appropriate message for wallet-related failures
 */
export function getWalletMessage(
  hasWallet: boolean,
  hasBalance: boolean,
  requiredAmount?: number,
  requiredToken?: string
): PermissionMessage {
  if (!hasWallet) {
    return WALLET_MESSAGES.NOT_CONNECTED;
  }
  
  if (!hasBalance && requiredAmount && requiredToken) {
    return WALLET_MESSAGES.INSUFFICIENT_BALANCE(requiredAmount, requiredToken);
  }
  
  return WALLET_MESSAGES.NO_TOKENS;
}

/**
 * Gets appropriate message for proposal-related failures
 */
export function getProposalMessage(
  action: 'create' | 'vote',
  reason: string,
  context?: {
    tokenRequirement?: { amount: number; token: string };
    proposalStatus?: 'active' | 'closed';
    hasVoted?: boolean;
  }
): PermissionMessage {
  if (action === 'create') {
    if (context?.tokenRequirement) {
      return PROPOSAL_MESSAGES.TOKEN_REQUIREMENT_NOT_MET(
        context.tokenRequirement.amount,
        context.tokenRequirement.token
      );
    }
    return PROPOSAL_MESSAGES.CANNOT_CREATE;
  }
  
  if (action === 'vote') {
    if (context?.hasVoted) {
      return PROPOSAL_MESSAGES.ALREADY_VOTED;
    }
    if (context?.proposalStatus === 'closed') {
      return PROPOSAL_MESSAGES.PROPOSAL_CLOSED;
    }
    return PROPOSAL_MESSAGES.CANNOT_VOTE;
  }
  
  return GENERIC_MESSAGES.ACCESS_DENIED;
}

/**
 * Creates a comprehensive permission message based on multiple factors
 */
export function createPermissionMessage(
  type: 'auth' | 'membership' | 'role' | 'wallet' | 'proposal' | 'action',
  context: {
    isAuthenticated?: boolean;
    hasValidSession?: boolean;
    isMember?: boolean;
    membershipStatus?: 'active' | 'pending' | 'expired';
    userRole?: DAORole;
    requiredRole?: DAORole;
    hasWallet?: boolean;
    hasBalance?: boolean;
    requiredAmount?: number;
    requiredToken?: string;
    action?: string;
    reason?: string;
    [key: string]: any;
  }
): PermissionMessage {
  switch (type) {
    case 'auth':
      return getAuthMessage(
        context.isAuthenticated || false,
        context.hasValidSession || false
      );
      
    case 'membership':
      return getMembershipMessage(
        context.isMember || false,
        context.membershipStatus
      );
      
    case 'role':
      return getRoleMessage(
        context.userRole || 'member',
        context.requiredRole || 'member'
      );
      
    case 'wallet':
      return getWalletMessage(
        context.hasWallet || false,
        context.hasBalance || false,
        context.requiredAmount,
        context.requiredToken
      );
      
    case 'proposal':
      return getProposalMessage(
        context.action as 'create' | 'vote',
        context.reason || '',
        context
      );
      
    default:
      return GENERIC_MESSAGES.ACCESS_DENIED;
  }
}
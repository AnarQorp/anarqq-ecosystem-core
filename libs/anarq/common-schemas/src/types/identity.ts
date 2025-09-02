/**
 * Identity Reference - Core identity structure for the Q ecosystem
 */
export interface IdentityRef {
  /** Primary sQuid identity identifier */
  squidId: string;
  /** Optional subidentity identifier */
  subId?: string;
  /** Optional DAO/community identifier */
  daoId?: string;
}

/**
 * Extended identity information with metadata
 */
export interface IdentityInfo extends IdentityRef {
  /** Display name for the identity */
  displayName?: string;
  /** Reputation score */
  reputation?: number;
  /** Identity creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActive?: string;
  /** Identity status */
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}
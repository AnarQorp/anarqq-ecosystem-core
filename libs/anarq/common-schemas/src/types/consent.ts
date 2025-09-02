/**
 * Consent Reference - Permission and policy reference structure
 */
export interface ConsentRef {
  /** IPFS CID of the policy document */
  policyCid: string;
  /** Permission scope (e.g., 'read:files', 'write:messages') */
  scope: string;
  /** Grant token or identifier */
  grant: string;
  /** Expiration timestamp (Unix timestamp) */
  exp: number;
  /** Optional issuer identity */
  issuer?: string;
  /** Optional subject identity */
  subject?: string;
}

/**
 * Consent Grant with full details
 */
export interface ConsentGrant extends ConsentRef {
  /** Grant identifier */
  grantId: string;
  /** Grant status */
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  /** Grant creation timestamp */
  createdAt: string;
  /** Optional revocation timestamp */
  revokedAt?: string;
  /** Optional revocation reason */
  revocationReason?: string;
  /** Grant metadata */
  metadata?: Record<string, any>;
}
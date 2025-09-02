/**
 * Identity Reference - Standard identity representation across modules
 */
export interface IdentityRef {
  /** Primary sQuid identity ID */
  squidId: string;
  /** Optional subidentity ID */
  subId?: string;
  /** Optional DAO/community ID */
  daoId?: string;
}

/**
 * Validates an IdentityRef object
 */
export function isValidIdentityRef(identity: any): identity is IdentityRef {
  return (
    typeof identity === 'object' &&
    identity !== null &&
    typeof identity.squidId === 'string' &&
    identity.squidId.length > 0 &&
    (identity.subId === undefined || typeof identity.subId === 'string') &&
    (identity.daoId === undefined || typeof identity.daoId === 'string')
  );
}
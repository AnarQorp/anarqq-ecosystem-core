/**
 * Consent Reference - Standard consent/permission representation
 */
export interface ConsentRef {
  /** IPFS CID of the policy document */
  policyCid: string;
  /** Permission scope (e.g., 'read', 'write', 'admin') */
  scope: string;
  /** Grant token or identifier */
  grant: string;
  /** Expiration timestamp (Unix timestamp) */
  exp: number;
}

/**
 * Validates a ConsentRef object
 */
export function isValidConsentRef(consent: any): consent is ConsentRef {
  return (
    typeof consent === 'object' &&
    consent !== null &&
    typeof consent.policyCid === 'string' &&
    consent.policyCid.length > 0 &&
    typeof consent.scope === 'string' &&
    consent.scope.length > 0 &&
    typeof consent.grant === 'string' &&
    consent.grant.length > 0 &&
    typeof consent.exp === 'number' &&
    consent.exp > 0
  );
}
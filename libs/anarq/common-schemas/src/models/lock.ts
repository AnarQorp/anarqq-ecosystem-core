/**
 * Lock Signature - Standard cryptographic signature representation
 */
export interface LockSig {
  /** Algorithm used for signing (e.g., 'ed25519', 'secp256k1') */
  alg: string;
  /** Public key in hex format */
  pub: string;
  /** Signature in hex format */
  sig: string;
  /** Timestamp when signature was created */
  ts: number;
  /** Nonce to prevent replay attacks */
  nonce: string;
}

/**
 * Validates a LockSig object
 */
export function isValidLockSig(lockSig: any): lockSig is LockSig {
  return (
    typeof lockSig === 'object' &&
    lockSig !== null &&
    typeof lockSig.alg === 'string' &&
    lockSig.alg.length > 0 &&
    typeof lockSig.pub === 'string' &&
    lockSig.pub.length > 0 &&
    typeof lockSig.sig === 'string' &&
    lockSig.sig.length > 0 &&
    typeof lockSig.ts === 'number' &&
    lockSig.ts > 0 &&
    typeof lockSig.nonce === 'string' &&
    lockSig.nonce.length > 0
  );
}
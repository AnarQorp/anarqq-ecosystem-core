export interface Identity {
  id: string;
  // Note: In production, this would use sQuid's identity type
  // We're keeping it simple for now
}

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
}

export interface TokenBalance {
  symbol: string;
  balance: number;
}

export interface Transaction {
  from: string;
  to: string;
  value: number;
  data?: string;
}

export interface SignedTransaction<T> extends Transaction {
  signedBy: string;
  signature: string;
  timestamp: string;
  /** Original payload (not present if encrypted) */
  payload?: T;
  /** Whether the payload is encrypted */
  isEncrypted?: boolean;
  /** Encryption method used (e.g., 'qlock') */
  encryptionMethod?: string;
  /** Encrypted payload (present if isEncrypted is true) */
  encryptedPayload?: string;
}

export interface NFTItem {
  id: string;
  name: string;
  image: string;
  collection: string;
}

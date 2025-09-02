import { Identity, SignedTransaction } from './types';
import { Qlock } from './qlock';

export interface SignTransactionOptions {
  /** Whether to encrypt the payload using Qlock */
  encrypt?: boolean;
}

/**
 * Sign a transaction payload using the provided identity
 * @param identity The user's identity object
 * @param payload The transaction payload to sign
 * @param options Signing options
 * @returns Signed transaction object
 */
export const signTransaction = async <T>(
  identity: Identity, 
  payload: T,
  options: SignTransactionOptions = {}
): Promise<SignedTransaction<T>> => {
  if (!identity) {
    throw new Error('Identity is required for signing');
  }

  // Create the base signed transaction
  const signedTx: Partial<SignedTransaction<T>> = {
    ...(payload as any), // Spread the payload properties
    signedBy: identity.id,
    signature: 'simulated-signature',
    timestamp: new Date().toISOString(),
  };

  // Handle encryption if requested
  if (options.encrypt) {
    const encryptedPayload = Qlock.encrypt(payload);
    signedTx.isEncrypted = true;
    signedTx.encryptionMethod = 'qlock';
    signedTx.encryptedPayload = encryptedPayload;
    
    // Remove the original payload when encrypted
    delete (signedTx as any).payload;
  } else {
    // Include the original payload when not encrypted
    signedTx.payload = payload;
  }

  return signedTx as SignedTransaction<T>;
};

/**
 * Helper to decrypt a signed transaction's payload if it's encrypted
 */
export const decryptSignedTransaction = async <T>(
  signedTx: SignedTransaction<unknown>
): Promise<SignedTransaction<T>> => {
  if (!signedTx.isEncrypted || !signedTx.encryptedPayload) {
    return signedTx as SignedTransaction<T>;
  }

  if (signedTx.encryptionMethod !== 'qlock') {
    throw new Error(`Unsupported encryption method: ${signedTx.encryptionMethod}`);
  }

  try {
    const decryptedPayload = Qlock.decrypt<T>(signedTx.encryptedPayload);
    return {
      ...signedTx,
      payload: decryptedPayload,
      isEncrypted: false,
      encryptedPayload: undefined
    } as unknown as SignedTransaction<T>;
  } catch (error) {
    throw new Error(`Failed to decrypt transaction: ${error.message}`);
  }
};

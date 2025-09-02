
/**
 * Encryption utilities for common use cases
 * This provides a simplified interface to the quantum encryption simulator
 */

import { 
  encryptData, 
  decryptData, 
  signData,
  verifySignature 
} from '@/lib/quantumSim';

/**
 * Encrypt a message for a recipient
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: string,
  useQuantum: boolean = true
): Promise<string> {
  const level = useQuantum ? 'QUANTUM' : 'STANDARD';
  const { encryptedData } = await encryptData(message, recipientPublicKey, level);
  return encryptedData;
}

/**
 * Decrypt a message using the private key
 */
export async function decryptMessage(
  encryptedMessage: string,
  privateKey: string
): Promise<string | null> {
  return await decryptData(encryptedMessage, privateKey);
}

/**
 * Sign a message with a private key
 */
export async function signMessage(
  message: string,
  privateKey: string,
  useQuantum: boolean = true
): Promise<string> {
  const level = useQuantum ? 'QUANTUM' : 'STANDARD';
  return await signData(message, privateKey, level);
}

/**
 * Verify a message signature
 */
export async function verifyMessageSignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  return await verifySignature(message, signature, publicKey);
}

/**
 * Helper: generate a message hash for integrity checks
 */
export async function generateMessageHash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Helper: generate a simple email-like format for qmail content
 */
export function formatQmailContent(
  subject: string,
  body: string,
  sender: string,
  timestamp: Date
): string {
  return JSON.stringify({
    subject,
    body,
    sender,
    timestamp: timestamp.toISOString(),
    format: 'qmail/v1'
  });
}

/**
 * Parse formatted qmail content
 */
export function parseQmailContent(content: string): {
  subject: string;
  body: string;
  sender: string;
  timestamp: Date;
} | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.format === 'qmail/v1') {
      return {
        subject: parsed.subject,
        body: parsed.body,
        sender: parsed.sender,
        timestamp: new Date(parsed.timestamp)
      };
    }
    return null;
  } catch (e) {
    console.error('Failed to parse qmail content', e);
    return null;
  }
}

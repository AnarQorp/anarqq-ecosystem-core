import { randomBytes } from 'crypto';

/**
 * Generates a new key pair for signing profiles
 */
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  return { privateKey, publicKey };
}

/**
 * Loads keys from environment variables or generates new ones
 */
export async function loadOrGenerateKeys() {
  // In a real application, you would load these from secure storage
  // For now, we'll generate new ones each time in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Key management must be implemented for production');
  }
  
  return generateKeyPair();
}

/**
 * Generates a random string for use as a secret
 */
export function generateSecret(length = 32): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

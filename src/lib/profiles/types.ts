import type { DID } from '@ucanto/interface';

export interface UserProfile {
  alias: string;
  avatar?: string; // IPFS CID or URL
  bio?: string;
  reputation?: number;
  privateData?: Record<string, unknown>; // Datos privados que serán cifrados
  socials?: {
    twitter?: string;
    github?: string;
    discord?: string;
    // Redes sociales adicionales
  };
  // Campos adicionales del perfil
  [key: string]: unknown;
}

export interface SignedUserProfile extends Omit<UserProfile, 'privateData'> {
  did: `did:${string}:${string}`;
  createdAt: string;
  signature: string;
  encryptedPrivateData?: string; // Datos privados cifrados
  metadata?: {
    version: string;
    encryption: {
      algorithm: string;
      keySize: number;
      quantumResistant: boolean;
    };
  };
}

export interface ProfileVerificationResult {
  isValid: boolean;
  error?: string;
  profile?: SignedUserProfile;
}

export interface ProfileManager {
  createProfile: (data: UserProfile, issuer: DID) => Promise<SignedUserProfile>;
  uploadProfile: (profile: SignedUserProfile) => Promise<string>;
  getProfile: (cid: string) => Promise<SignedUserProfile>;
}

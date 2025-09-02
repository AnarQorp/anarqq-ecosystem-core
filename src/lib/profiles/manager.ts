import { importJWK, SignJWT, jwtVerify } from 'jose';
import { Web3Storage } from 'web3.storage';
import { DID } from '@ucanto/interface';
import { SignedUserProfile, UserProfile, ProfileVerificationResult } from './types';
import { getActiveIdentity } from '@/state/identity';
import { encryptData } from '@/lib/quantumSim';
import { sha256 } from 'multiformats/hashes/sha2';
import * as json from 'multiformats/codecs/json';

// Función para generar un hash de archivo compatible con el sistema
async function generateContentHash(content: string): Promise<string> {
  const bytes = json.encode(JSON.parse(content));
  const hash = await sha256.digest(bytes);
  return hash.toString();
}

export class ProfileManagerImpl {
  private storage: Web3Storage | null = null;
  private privateKey: JsonWebKey | null = null;
  private publicKey: JsonWebKey | null = null;

  constructor(web3StorageToken?: string, privateKey?: JsonWebKey, publicKey?: JsonWebKey) {
    if (web3StorageToken) {
      this.storage = new Web3Storage({ token: web3StorageToken });
    }
    this.privateKey = privateKey || null;
    this.publicKey = publicKey || null;
  }

  /**
   * Creates a signed user profile
   */
  async createProfile(data: UserProfile, issuer?: DID | string): Promise<SignedUserProfile> {
    // Usar el DID de la identidad activa si no se proporciona uno
    const activeId = getActiveIdentity();
    if (!issuer && !activeId) {
      throw new Error('No se encontró una identidad activa y no se proporcionó un emisor');
    }
    
    // Obtener el DID del emisor o usar el de la identidad activa
    let did: `did:${string}:${string}`;
    if (issuer) {
      if (typeof issuer === 'string') {
        did = issuer.startsWith('did:') ? 
          (issuer as `did:${string}:${string}`) : 
          (`did:key:${issuer}` as `did:${string}:${string}`);
      } else {
        // Manejar diferentes tipos de objetos DID
        let issuerStr: string;
        if (typeof (issuer as any).toString === 'function') {
          issuerStr = (issuer as any).toString();
        } else if ((issuer as any).did) {
          issuerStr = `did:${(issuer as any).did}`;
        } else if ((issuer as any).publicKey) {
          issuerStr = `did:key:${(issuer as any).publicKey}`;
        } else {
          issuerStr = 'did:key:default';
        }
        did = issuerStr as `did:${string}:${string}`;
      }
    } else {
      // Usar el DID de la identidad activa
      const activeKey = (activeId as any)?.publicKey || 'default';
      const activeDid = `did:key:${activeKey}`;
      did = activeDid as `did:${string}:${string}`;
    }
    
    // Crear el perfil base
    const baseProfile: Omit<SignedUserProfile, 'signature'> = {
      ...data,
      did,
      createdAt: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        encryption: {
          algorithm: 'AES-256-GCM',
          keySize: 256,
          quantumResistant: true
        }
      }
    };

    // Cifrar campos sensibles usando Qlock si hay datos privados
    const profile = { ...baseProfile };
    if ('privateData' in data) {
      const encryptedResult = await this.encryptPrivateData(
        JSON.stringify((data as any).privateData), 
        did
      );
      (profile as any).encryptedPrivateData = JSON.stringify(encryptedResult);
      delete (profile as any).privateData;
    }

    // Firmar el perfil
    const signature = await this.signProfile(profile);
    
    return {
      ...profile,
      signature,
      did,
      createdAt: profile.createdAt
    } as SignedUserProfile;
  }

  private async encryptPrivateData(data: string, did: string): Promise<{
    encryptedData: string;
    metadata: {
      algorithm: string;
      keySize: number;
      quantumResistant: boolean;
      timestamp: number;
    };
  }> {
    try {
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid data provided for encryption');
      }
      
      if (!did || typeof did !== 'string') {
        throw new Error('Invalid DID provided for encryption');
      }
      
      // Usar el sistema de cifrado de Qlock
      const encrypted = await encryptData(data, did);
      
      if (!encrypted || !encrypted.encryptedData) {
        throw new Error('Encryption failed - no data returned');
      }
      
      return {
        encryptedData: encrypted.encryptedData,
        metadata: {
          algorithm: 'AES-256-GCM',
          keySize: 256,
          quantumResistant: true,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Error encrypting private data:', error);
      throw new Error(`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Uploads a signed profile to IPFS via Web3.Storage
   */
  async uploadProfile(profile: SignedUserProfile): Promise<string> {
    if (!this.storage) {
      throw new Error('Web3.Storage no está inicializado');
    }

    // Verificar la firma antes de subir
    const verification = await this.verifyProfile(profile);
    if (!verification.isValid) {
      throw new Error(`Firma de perfil inválida: ${verification.error}`);
    }

    // Crear una copia del perfil para la subida
    const profileData = { ...profile };
    
    // Generar un hash único para el perfil
    const profileHash = await generateContentHash(JSON.stringify(profileData));
    
    // Crear el archivo con metadatos adicionales
    const file = new File(
      [JSON.stringify({
        ...profileData,
        _metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          hash: profileHash
        }
      }, null, 2)],
      `profile_${profileData.did.replace(/[:/]/g, '_')}_${Date.now()}.json`,
      { type: 'application/json' }
    );

    try {
      // Subir a Web3.Storage
      const cid = await this.storage.put([file], {
        wrapWithDirectory: false,
        name: `profile_${profileData.did.replace(/[:/]/g, '_')}`
      });

      console.log(`[Profile] Perfil subido correctamente con CID: ${cid}`);
      return cid;
    } catch (error) {
      console.error('[Profile] Error al subir el perfil a IPFS:', error);
      throw new Error('Error al subir el perfil a IPFS');
    }
  }

  /**
   * Retrieves and validates a profile from IPFS
   */
  async getProfile(cid: string): Promise<SignedUserProfile> {
    if (!this.storage) {
      throw new Error('Web3.Storage no está inicializado');
    }

    try {
      // Obtener el archivo de Web3.Storage
      const response = await this.storage.get(cid);
      if (!response) {
        throw new Error('Perfil no encontrado para el CID proporcionado');
      }

      const files = await response.files();
      if (files.length === 0) {
        throw new Error('No se encontraron archivos para el CID proporcionado');
      }

      // Tomar el primer archivo (no debería haber más de uno con wrapWithDirectory: false)
      const file = files[0];
      const text = await file.text();
      const profile = JSON.parse(text) as SignedUserProfile;

      // Verificar la firma y validez del perfil
      const verification = await this.verifyProfile(profile);
      if (!verification.isValid) {
        throw new Error(`Perfil inválido: ${verification.error}`);
      }

      // Verificar la coincidencia con la identidad activa (si existe)
      const activeId = getActiveIdentity();
      if (activeId) {
        const activeDID = `did:key:${(activeId as any).publicKey || 'unknown'}`;
        if (profile.did !== activeDID) {
          console.warn(`[Profile] Advertencia: El perfil recuperado (${profile.did}) no coincide con la identidad activa (${activeDID})`);
        }
      }

      return profile;
    } catch (error) {
      console.error('[Profile] Error al recuperar el perfil:', error);
      throw new Error(`No se pudo recuperar el perfil: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Signs the profile data
   */
  private async signProfile(profile: Omit<SignedUserProfile, 'signature'>): Promise<string> {
    if (!this.privateKey) {
      throw new Error('No se puede firmar el perfil: clave privada no disponible');
    }

    const { did, createdAt, ...profileData } = profile;
    
    try {
      if (!this.privateKey) {
        throw new Error('No private key available for signing');
      }
      
      if (typeof did !== 'string' || !did) {
        throw new Error('Invalid DID provided for signing');
      }
      
      const privateKey = await importJWK(this.privateKey, 'ES256');
      
      const now = Math.floor(Date.now() / 1000);
      const jti = typeof createdAt === 'string' ? createdAt : Date.now().toString();
      
      const jwt = await new SignJWT(profileData as any)
        .setProtectedHeader({ 
          alg: 'ES256', 
          typ: 'JWT',
          kid: did
        })
        .setIssuer(did)
        .setSubject(did)
        .setAudience('anarq-nexus')
        .setIssuedAt(now)
        .setExpirationTime(now + (30 * 24 * 60 * 60)) // 30 days from now
        .setJti(jti)
        .sign(privateKey);

      return jwt;
    } catch (error) {
      console.error('Error al firmar el perfil:', error);
      throw new Error('No se pudo firmar el perfil');
    }
  }

  /**
   * Verifies the profile signature
   */
  private async verifyProfile(profile: SignedUserProfile): Promise<ProfileVerificationResult> {
    try {
      if (!this.publicKey) {
        return {
          isValid: false,
          error: 'Clave pública no disponible para verificación'
        };
      }

      // Verificar que el perfil tenga los campos requeridos
      if (!profile.did || !profile.signature || !profile.createdAt) {
        return {
          isValid: false,
          error: 'El perfil no tiene los campos requeridos (did, signature, createdAt)'
        };
      }

      // Verificar el formato del DID
      if (!/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/.test(profile.did)) {
        return {
          isValid: false,
          error: 'Formato de DID inválido'
        };
      }

      const publicKey = await importJWK(this.publicKey as any, 'ES256');
      
      // Verificar la firma JWT
      await jwtVerify(profile.signature, publicKey, {
        issuer: profile.did,
        requiredClaims: ['iss', 'jti', 'exp', 'iat'],
      });
      
      return {
        isValid: true,
        profile
      };
    } catch (error) {
      console.error('Error al verificar el perfil:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Error desconocido al verificar el perfil'
      };
    }
  }
}

/**
 * Creates a new ProfileManager instance
 */
export async function createProfileManager(web3StorageToken: string): Promise<ProfileManagerImpl> {
  // In a real application, you would generate and store these keys securely
  const { privateKey, publicKey } = await generateKeyPair();
  return new ProfileManagerImpl(web3StorageToken, privateKey, publicKey);
}

/**
 * Generates a new key pair for signing profiles
 */
async function generateKeyPair() {
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

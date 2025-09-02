import { Web3Storage } from 'web3.storage';
import { Qlock } from '../../modules/qlock/Qlock';

// Re-exportar Qlock para mantener la compatibilidad
export { Qlock };

/**
 * Interfaz para el perfil de usuario
 */
export interface UserProfile {
  alias: string;
  avatar?: string;
  bio?: string;
  reputation?: number;
  did: string;
  createdAt: string;
  signature: string;
}

// Configuración de Web3.Storage (ajustar según sea necesario)
const getWeb3StorageClient = (): Web3Storage => {
  const token = process.env.WEB3STORAGE_TOKEN;
  if (!token) {
    throw new Error('WEB3STORAGE_TOKEN no está configurado');
  }
  return new Web3Storage({ token });
};

/**
 * Crea un perfil cifrado firmado
 */
export async function createEncryptedProfile(
  data: Omit<UserProfile, 'did' | 'createdAt' | 'signature'>,
  issuer: string, // Cambiado de ucan.DID a string para simplificar
  key: CryptoKey
): Promise<{ encryptedProfile: Uint8Array; key: CryptoKey }> {
  // Crear el perfil con metadatos
  const profile = {
    ...data,
    did: issuer,
    createdAt: new Date().toISOString(),
  };

  // Firmar el perfil usando WebCrypto
  const payload = JSON.stringify(profile);
  const encoder = new TextEncoder();
  const messageData = encoder.encode(payload);
  
  // Usamos la clave para firmar (asumimos que es una CryptoKey con uso de firma)
  const signature = await window.crypto.subtle.sign(
    { name: 'HMAC' },
    key,
    messageData
  );
  
  // Crear perfil firmado
  const signedProfile = {
    ...profile,
    signature: Buffer.from(signature).toString('base64'),
  };

  // Cifrar el perfil firmado usando Qlock
  const encrypted = await Qlock.encrypt(
    new TextEncoder().encode(JSON.stringify(signedProfile)),
    key
  );

  return {
    encryptedProfile: new Uint8Array(encrypted),
    key,
  };
}

/**
 * Sube un perfil cifrado a IPFS usando Web3.Storage
 */
export async function uploadProfileToIPFS(encrypted: Uint8Array): Promise<string> {
  const client = getWeb3StorageClient();
  const file = new File([encrypted], 'profile.enc', { type: 'application/octet-stream' });
  const cid = await client.put([file], {
    wrapWithDirectory: false,
  });
  return cid;
}

/**
 * Obtiene y descifra un perfil desde IPFS
 */
export async function getAndDecryptProfile(cid: string, key: CryptoKey): Promise<UserProfile> {
  // Descargar desde IPFS
  const client = getWeb3StorageClient();
  const res = await client.get(cid);
  
  if (!res?.ok) {
    throw new Error(`Error al obtener el perfil: ${res?.status} ${res?.statusText}`);
  }
  
  const encrypted = new Uint8Array(await res.arrayBuffer());
  
  // Descifrar
  const decrypted = await Qlock.decrypt(encrypted, key);
  const profile: UserProfile = JSON.parse(new TextDecoder().decode(decrypted));
  
  // Verificar la firma usando WebCrypto
  const { signature, ...profileData } = profile;
  const encoder = new TextEncoder();
  const message = encoder.encode(JSON.stringify(profileData));
  const signatureBytes = Buffer.from(signature, 'base64');
  
  const isValid = await window.crypto.subtle.verify(
    { name: 'HMAC' },
    key,
    signatureBytes,
    message
  );
  
  if (!isValid) {
    throw new Error('Firma inválida');
  }
  
  return profile;
}



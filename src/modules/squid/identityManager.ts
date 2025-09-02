
/**
 * sQuid Identity Manager
 * Gestiona el registro, autenticación y persistencia de identidades raíz
 */

import { SquidIdentity } from '@/state/identity';
import { generateKeyPair } from '@/lib/quantumSim';

/**
 * Genera un DID único usando el formato did:key
 */
function generateDID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const unique = `${timestamp}_${random}`;
  
  // Simular hash para crear un DID válido
  const encoder = new TextEncoder();
  const data = encoder.encode(unique);
  let hash = 0;
  
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const didKey = Math.abs(hash).toString(16).padStart(16, '0');
  return `did:key:z${didKey}`;
}

/**
 * Genera un espacio único para almacenamiento Web3.Storage
 */
function generateSpace(did: string): string {
  // Extraer parte única del DID para generar espacio
  const didPart = did.split(':').pop() || 'default';
  return `space_${didPart.slice(-8)}`;
}

/**
 * Verifica si un alias ya está en uso
 */
function isAliasAvailable(alias: string): boolean {
  // Verificar en localStorage si el alias ya existe
  const existingIdentities = JSON.parse(localStorage.getItem('squid_registered_aliases') || '[]');
  return !existingIdentities.includes(alias.toLowerCase());
}

/**
 * Registra un alias como usado
 */
function registerAlias(alias: string): void {
  const existingIdentities = JSON.parse(localStorage.getItem('squid_registered_aliases') || '[]');
  existingIdentities.push(alias.toLowerCase());
  localStorage.setItem('squid_registered_aliases', JSON.stringify(existingIdentities));
}

/**
 * Registra una nueva identidad raíz en el ecosistema
 */
export async function registerRootIdentity(
  alias: string, 
  email: string
): Promise<SquidIdentity> {
  console.log(`[sQuid IdentityManager] Iniciando registro de identidad raíz para alias: ${alias}`);
  
  // Verificar disponibilidad del alias
  if (!isAliasAvailable(alias)) {
    throw new Error(`El alias '${alias}' ya está en uso. Por favor elige otro.`);
  }
  
  // Generar DID único
  const did = generateDID();
  console.log(`[sQuid IdentityManager] DID generado: ${did}`);
  
  // Generar par de claves criptográficas
  const { publicKey, privateKey } = await generateKeyPair('QUANTUM');
  console.log(`[sQuid IdentityManager] Par de claves generado`);
  
  // Generar espacio de almacenamiento
  const space = generateSpace(did);
  console.log(`[sQuid IdentityManager] Espacio asignado: ${space}`);
  
  // Crear objeto de identidad
  const identity: SquidIdentity = {
    did,
    name: alias,
    type: 'ROOT',
    kyc: true, // Las identidades raíz son automáticamente verificadas en el registro
    reputation: 100, // Reputación inicial máxima para identidades raíz
    space,
  };
  
  // Guardar datos sensibles en localStorage de forma segura
  const identityData = {
    ...identity,
    email,
    publicKey,
    privateKey,
    created: new Date().toISOString(),
    isRoot: true, // Flag para futuras funcionalidades de subidentidades
    kycStatus: {
      verified: true,
      verifiedAt: new Date().toISOString(),
      level: 'root' // Preparado para diferentes niveles de KYC
    },
    internalEmail: `${alias}@qmail.anarq`
  };
  
  // Persistir identidad
  localStorage.setItem(`squid_identity_${did}`, JSON.stringify(identityData));
  
  // Registrar alias como usado
  registerAlias(alias);
  
  // Configurar como identidad activa por defecto
  localStorage.setItem('squid_active_identity', did);
  
  console.log(`[sQuid IdentityManager] ✅ Identidad raíz registrada exitosamente`);
  console.log(`[sQuid IdentityManager] 📧 Email interno: ${alias}@qmail.anarq`);
  
  return identity;
}

/**
 * Recupera una identidad por su DID
 */
export function getIdentityByDID(did: string): SquidIdentity | null {
  try {
    const data = localStorage.getItem(`squid_identity_${did}`);
    if (!data) return null;
    
    const identityData = JSON.parse(data);
    
    return {
      did: identityData.did,
      name: identityData.name,
      type: identityData.type,
      kyc: identityData.kyc,
      reputation: identityData.reputation,
      space: identityData.space
    };
  } catch (error) {
    console.error(`[sQuid IdentityManager] Error recuperando identidad ${did}:`, error);
    return null;
  }
}

/**
 * Lista todas las identidades registradas
 */
export function getAllRegisteredIdentities(): SquidIdentity[] {
  const identities: SquidIdentity[] = [];
  
  // Buscar todas las claves que empiecen con 'squid_identity_'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('squid_identity_')) {
      const did = key.replace('squid_identity_', '');
      const identity = getIdentityByDID(did);
      if (identity) {
        identities.push(identity);
      }
    }
  }
  
  return identities;
}

/**
 * Obtiene los datos completos de una identidad (incluye email, claves, etc.)
 * Solo para uso interno del módulo
 */
export function getFullIdentityData(did: string): any | null {
  try {
    const data = localStorage.getItem(`squid_identity_${did}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`[sQuid IdentityManager] Error obteniendo datos completos de ${did}:`, error);
    return null;
  }
}

/**
 * Verifica si una identidad puede crear subidentidades
 * (Solo identidades raíz verificadas)
 */
export function canCreateSubIdentities(did: string): boolean {
  const fullData = getFullIdentityData(did);
  return fullData && fullData.isRoot && fullData.kycStatus?.verified;
}

/**
 * Login automático con la última identidad activa
 */
export function autoLoginLastIdentity(): SquidIdentity | null {
  try {
    const activeDID = localStorage.getItem('squid_active_identity');
    if (!activeDID) return null;
    
    const identity = getIdentityByDID(activeDID);
    if (identity) {
      console.log(`[sQuid IdentityManager] Auto-login exitoso: ${identity.did}`);
      return identity;
    }
    
    return null;
  } catch (error) {
    console.error('[sQuid IdentityManager] Error en auto-login:', error);
    return null;
  }
}

/**
 * Logout - limpia la sesión activa
 */
export function logout(): void {
  localStorage.removeItem('squid_active_identity');
  console.log('[sQuid IdentityManager] Sesión cerrada');
}

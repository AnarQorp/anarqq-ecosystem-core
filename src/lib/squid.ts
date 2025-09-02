/**
 * sQuid Identity Logic (mock para demo dashboard)
 * - Simula login con wallet (did:key)
 * - Provee la identidad activa
 * - Gestiona espacios por identidad
 */

import { IdentityVerificationLevel } from "@/types";

export interface MockIdentity {
  // Primary fields for dashboard
  id: string;
  name: string;
  type: 'ROOT' | 'SUB' | 'AID';
  reputation: number;
  wallet: string;
  qlockActive: boolean;
  qonsentGranted: boolean;
  subIdentities?: MockIdentity[];
  space?: string; // Espacio Web3.Storage asociado

  // For compatibility with 'Identity'
  publicKey: string;
  verificationLevel: IdentityVerificationLevel;
  created: Date;
  kycStatus: {
    submitted: boolean;
    approved: boolean;
    timestamp?: Date;
  };
  metadata: Record<string, unknown>;
}

let activeIdentity: MockIdentity | null = null;

/**
 * Genera un espacio único para una identidad
 */
function generateSpaceForIdentity(did: string): string {
  // Simular generación de espacio basado en el DID
  const hash = did.split(':').pop() || 'default';
  return `space_${hash.slice(-8)}`;
}

export async function loginWithWallet(): Promise<MockIdentity | null> {
  // Simula conexión con una wallet/did:key
  // (mock UX, normalmente aquí habría interacción real web3)
  await new Promise(res => setTimeout(res, 600));
  const now = new Date();
  
  const rootDid = 'did:key:example:12345';
  const subDid = 'did:key:sub1';
  
  activeIdentity = {
    id: rootDid,
    name: 'Alex Demo',
    type: 'ROOT',
    reputation: 95,
    wallet: '0xabcde...12345',
    qlockActive: true,
    qonsentGranted: true,
    space: generateSpaceForIdentity(rootDid),
    publicKey: 'pubkey-demo-12345',
    verificationLevel: IdentityVerificationLevel.ROOT,
    created: now,
    kycStatus: {
      submitted: true,
      approved: true,
      timestamp: now,
    },
    metadata: {
      mock: true
    },
    subIdentities: [
      {
        id: subDid,
        name: 'Work AID',
        type: 'AID',
        reputation: 88,
        wallet: '',
        qlockActive: true,
        qonsentGranted: false,
        space: generateSpaceForIdentity(subDid),
        publicKey: 'pubkey-demo-sub1',
        verificationLevel: IdentityVerificationLevel.UNVERIFIED,
        created: now,
        kycStatus: {
          submitted: false,
          approved: false,
        },
        metadata: {
          mock: true,
          parent: rootDid
        }
      }
    ],
  };
  
  console.log(`[sQuid] Login exitoso. Identidad activa: ${activeIdentity.id}`);
  console.log(`[sQuid] Espacio asignado: ${activeIdentity.space}`);
  
  return activeIdentity;
}

export function getActiveIdentity(): MockIdentity | null {
  return activeIdentity;
}

/**
 * Cambia la identidad activa (solo subidentidades verificadas)
 */
export function switchToSubIdentity(subId: string): boolean {
  if (!activeIdentity || !activeIdentity.subIdentities) {
    console.error('[sQuid] No hay identidad raíz activa');
    return false;
  }

  const subIdentity = activeIdentity.subIdentities.find(sub => sub.id === subId);
  
  if (!subIdentity) {
    console.error(`[sQuid] Subidentidad no encontrada: ${subId}`);
    return false;
  }

  if (!subIdentity.kycStatus.approved) {
    console.error(`[sQuid] Subidentidad no verificada: ${subId}`);
    return false;
  }

  // Crear nueva identidad activa basada en la subidentidad
  activeIdentity = {
    ...subIdentity,
    subIdentities: activeIdentity.subIdentities // Mantener acceso a otras subs
  };

  console.log(`[sQuid] Cambiado a subidentidad: ${activeIdentity.id}`);
  console.log(`[sQuid] Espacio activo: ${activeIdentity.space}`);
  
  return true;
}

/**
 * Vuelve a la identidad raíz
 */
export async function switchToRootIdentity(): Promise<boolean> {
  const currentRoot = activeIdentity;
  if (!currentRoot) {
    console.error('[sQuid] No hay identidad activa');
    return false;
  }

  // Si ya estamos en la raíz, no hacer nada
  if (currentRoot.type === 'ROOT') {
    console.log('[sQuid] Ya estás en la identidad raíz');
    return true;
  }

  // Reconstruir la identidad raíz
  try {
    const root = await loginWithWallet();
    if (root) {
      console.log(`[sQuid] Vuelto a identidad raíz: ${root.id}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[sQuid] Error al volver a identidad raíz:', error);
    return false;
  }
}

export function logoutIdentity() {
  if (activeIdentity) {
    console.log(`[sQuid] Cerrando sesión de: ${activeIdentity.id}`);
  }
  activeIdentity = null;
}

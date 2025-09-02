
/**
 * Qonsent Store (v1)
 * Gestión de políticas de autorización para recursos compartidos
 */

export type QonsentPolicy = {
  fileHash: string;
  ownerDID: string;
  authorizedDIDs: string[];
  timestamp: number;
  moduleOrigin?: string; // 'Qmail', 'Qchat', 'TestIPFS', etc.
  resourceType?: string; // 'file', 'message', 'attachment'
  metadata?: Record<string, any>;
};

// Almacenamiento en memoria (localStorage como persistencia MVP)
const STORAGE_KEY = 'qonsent_policies';

/**
 * Carga las políticas desde localStorage
 */
function loadPolicies(): QonsentPolicy[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[QonsentStore] Error cargando políticas:', error);
    return [];
  }
}

/**
 * Guarda las políticas en localStorage
 */
function savePolicies(policies: QonsentPolicy[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
    console.log(`[QonsentStore] Guardadas ${policies.length} políticas`);
  } catch (error) {
    console.error('[QonsentStore] Error guardando políticas:', error);
  }
}

/**
 * Obtiene todas las políticas de un propietario
 */
export function getQonsentPoliciesByOwner(ownerDID: string): QonsentPolicy[] {
  const policies = loadPolicies();
  return policies.filter(policy => policy.ownerDID === ownerDID);
}

/**
 * Obtiene una política específica por hash de archivo
 */
export function getQonsentPolicy(fileHash: string): QonsentPolicy | null {
  const policies = loadPolicies();
  return policies.find(policy => policy.fileHash === fileHash) || null;
}

/**
 * Crea una nueva política para un archivo
 */
export function createQonsentPolicy(
  fileHash: string, 
  ownerDID: string, 
  options?: {
    moduleOrigin?: string;
    resourceType?: string;
    metadata?: Record<string, any>;
  }
): boolean {
  try {
    const policies = loadPolicies();
    
    // Verificar si ya existe una política para este archivo
    const existingIndex = policies.findIndex(p => p.fileHash === fileHash);
    
    if (existingIndex >= 0) {
      console.log(`[QonsentStore] Política ya existe para archivo: ${fileHash}`);
      return false;
    }
    
    const newPolicy: QonsentPolicy = {
      fileHash,
      ownerDID,
      authorizedDIDs: [], // Inicialmente solo el propietario
      timestamp: Date.now(),
      moduleOrigin: options?.moduleOrigin || 'unknown',
      resourceType: options?.resourceType || 'file',
      metadata: options?.metadata || {}
    };
    
    policies.push(newPolicy);
    savePolicies(policies);
    
    console.log(`[QonsentStore] ✅ Política creada para ${fileHash} por ${ownerDID}`);
    return true;
  } catch (error) {
    console.error('[QonsentStore] Error creando política:', error);
    return false;
  }
}

/**
 * Autoriza un DID para acceder a un archivo
 */
export function authorizeDID(fileHash: string, did: string): boolean {
  try {
    const policies = loadPolicies();
    const policyIndex = policies.findIndex(p => p.fileHash === fileHash);
    
    if (policyIndex === -1) {
      console.error(`[QonsentStore] No se encontró política para archivo: ${fileHash}`);
      return false;
    }
    
    const policy = policies[policyIndex];
    
    // Verificar si ya está autorizado
    if (policy.authorizedDIDs.includes(did)) {
      console.log(`[QonsentStore] DID ya autorizado: ${did}`);
      return true;
    }
    
    // Añadir autorización
    policy.authorizedDIDs.push(did);
    policies[policyIndex] = policy;
    
    savePolicies(policies);
    
    console.log(`[QonsentStore] ✅ DID autorizado: ${did} para archivo ${fileHash}`);
    return true;
  } catch (error) {
    console.error('[QonsentStore] Error autorizando DID:', error);
    return false;
  }
}

/**
 * Revoca la autorización de un DID para un archivo
 */
export function revokeDID(fileHash: string, did: string): boolean {
  try {
    const policies = loadPolicies();
    const policyIndex = policies.findIndex(p => p.fileHash === fileHash);
    
    if (policyIndex === -1) {
      console.error(`[QonsentStore] No se encontró política para archivo: ${fileHash}`);
      return false;
    }
    
    const policy = policies[policyIndex];
    const didIndex = policy.authorizedDIDs.indexOf(did);
    
    if (didIndex === -1) {
      console.log(`[QonsentStore] DID no estaba autorizado: ${did}`);
      return true;
    }
    
    // Remover autorización
    policy.authorizedDIDs.splice(didIndex, 1);
    policies[policyIndex] = policy;
    
    savePolicies(policies);
    
    console.log(`[QonsentStore] ❌ Autorización revocada: ${did} para archivo ${fileHash}`);
    return true;
  } catch (error) {
    console.error('[QonsentStore] Error revocando DID:', error);
    return false;
  }
}

/**
 * Obtiene todos los DIDs autorizados para un archivo
 */
export function getAuthorizedForFile(fileHash: string): string[] {
  const policy = getQonsentPolicy(fileHash);
  return policy ? [policy.ownerDID, ...policy.authorizedDIDs] : [];
}

/**
 * Verifica si un DID puede acceder a un archivo
 */
export function canAccessFile(fileHash: string, did: string): boolean {
  const authorizedDIDs = getAuthorizedForFile(fileHash);
  return authorizedDIDs.includes(did);
}

/**
 * Elimina completamente una política (usar con cuidado)
 */
export function deleteQonsentPolicy(fileHash: string): boolean {
  try {
    const policies = loadPolicies();
    const filteredPolicies = policies.filter(p => p.fileHash !== fileHash);
    
    if (filteredPolicies.length === policies.length) {
      console.log(`[QonsentStore] No se encontró política para eliminar: ${fileHash}`);
      return false;
    }
    
    savePolicies(filteredPolicies);
    console.log(`[QonsentStore] 🗑️ Política eliminada para archivo: ${fileHash}`);
    return true;
  } catch (error) {
    console.error('[QonsentStore] Error eliminando política:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas de políticas para un usuario
 */
export function getQonsentStats(ownerDID: string): {
  totalPolicies: number;
  totalAuthorizations: number;
  policyBreakdown: Record<string, number>;
} {
  const policies = getQonsentPoliciesByOwner(ownerDID);
  
  const breakdown: Record<string, number> = {};
  let totalAuthorizations = 0;
  
  policies.forEach(policy => {
    const module = policy.moduleOrigin || 'unknown';
    breakdown[module] = (breakdown[module] || 0) + 1;
    totalAuthorizations += policy.authorizedDIDs.length;
  });
  
  return {
    totalPolicies: policies.length,
    totalAuthorizations,
    policyBreakdown: breakdown
  };
}

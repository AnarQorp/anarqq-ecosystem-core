
/**
 * QindexCore - Módulo de verificación de integridad
 * 
 * Gestiona el registro y verificación de hashes para garantizar
 * la integridad de archivos en el ecosistema AnarQ & Q
 */

// Registro en memoria de hashes por CID
const hashRegistry: Record<string, string> = {};

/**
 * Registra el hash original de un archivo antes de ser cifrado y subido
 * @param cid - Content Identifier del archivo en IPFS
 * @param hash - Hash SHA-256 del contenido original
 */
export function registerFileHash(cid: string, hash: string): void {
  hashRegistry[cid] = hash;
  console.log(`[QindexCore] Hash registrado para CID ${cid}: ${hash.substring(0, 16)}...`);
  
  // Persistir en localStorage para mantener entre sesiones
  try {
    const stored = JSON.parse(localStorage.getItem('qindex_hashes') || '{}');
    stored[cid] = hash;
    localStorage.setItem('qindex_hashes', JSON.stringify(stored));
  } catch (error) {
    console.error('[QindexCore] Error al persistir hash:', error);
  }
}

/**
 * Verifica si el hash actual coincide con el hash original registrado
 * @param cid - Content Identifier del archivo
 * @param currentHash - Hash actual del contenido descifrado
 * @returns true si los hashes coinciden, false en caso contrario
 */
export function verifyFileHash(cid: string, currentHash: string): boolean {
  // Intentar obtener de memoria primero
  let originalHash = hashRegistry[cid];
  
  // Si no está en memoria, cargar desde localStorage
  if (!originalHash) {
    try {
      const stored = JSON.parse(localStorage.getItem('qindex_hashes') || '{}');
      originalHash = stored[cid];
      
      if (originalHash) {
        // Restaurar en memoria para accesos futuros
        hashRegistry[cid] = originalHash;
      }
    } catch (error) {
      console.error('[QindexCore] Error al cargar hash desde localStorage:', error);
      return false;
    }
  }
  
  if (!originalHash) {
    console.warn(`[QindexCore] Hash original no encontrado para CID: ${cid}`);
    return false;
  }
  
  const isValid = originalHash === currentHash;
  
  console.log(`[QindexCore] Verificación ${isValid ? 'EXITOSA' : 'FALLIDA'} para CID: ${cid}`);
  console.log(`[QindexCore] Hash original: ${originalHash.substring(0, 16)}...`);
  console.log(`[QindexCore] Hash actual: ${currentHash.substring(0, 16)}...`);
  
  return isValid;
}

/**
 * Obtiene el hash registrado para un CID específico
 * @param cid - Content Identifier del archivo
 * @returns Hash registrado o undefined si no existe
 */
export function getRegisteredHash(cid: string): string | undefined {
  let hash = hashRegistry[cid];
  
  if (!hash) {
    try {
      const stored = JSON.parse(localStorage.getItem('qindex_hashes') || '{}');
      hash = stored[cid];
      
      if (hash) {
        hashRegistry[cid] = hash;
      }
    } catch (error) {
      console.error('[QindexCore] Error al obtener hash:', error);
    }
  }
  
  return hash;
}

/**
 * Limpia todos los hashes registrados (función de utilidad)
 */
export function clearHashRegistry(): void {
  Object.keys(hashRegistry).forEach(key => delete hashRegistry[key]);
  localStorage.removeItem('qindex_hashes');
  console.log('[QindexCore] Registro de hashes limpiado');
}

/**
 * Genera hash SHA-256 de contenido
 * @param content - Contenido a hashear
 * @returns Promise con el hash en formato hexadecimal
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

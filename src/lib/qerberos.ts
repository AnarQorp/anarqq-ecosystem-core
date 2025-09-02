/**
 * Qerberos - Módulo de verificación de integridad y control de acceso
 * 
 * Gestiona la verificación de integridad de archivos y detección de manipulaciones
 */

import { getFileLogs, findLogsByIPFSHash, findLogsByIdentity, type FileLog } from './qindex';

export interface AccessAttempt {
  id: string;
  ipfsHash: string;
  identityDID: string;
  timestamp: string;
  status: 'AUTHORIZED' | 'UNAUTHORIZED' | 'MANIPULATED' | 'NOT_FOUND';
  reason: string;
  originalLog?: FileLog;
}

// Almacenamiento de intentos de acceso
const accessAttempts: AccessAttempt[] = [];

/**
 * Verifica la integridad de un archivo
 * @param hash - Hash del archivo a verificar
 * @returns Promise que resuelve con true si la integridad es válida
 */
export async function verifyIntegrity(hash: string): Promise<boolean> {
  console.log(`[Qerberos] Verificando integridad - Hash: ${hash.substring(0, 16)}...`);
  
  // Simular proceso de verificación
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simular verificación (90% de éxito para propósitos de demo)
  const isValid = Math.random() > 0.1;
  
  if (isValid) {
    console.log(`[Qerberos] ✅ Integridad verificada correctamente`);
  } else {
    console.log(`[Qerberos] ❌ Fallo en verificación de integridad`);
  }
  
  return isValid;
}

/**
 * Valida la descarga de un archivo verificando integridad y permisos
 * @param content - Contenido descifrado del archivo
 * @param ipfsHash - Hash del archivo en IPFS
 * @param metadata - Metadatos del archivo (nombre, tamaño, etc.)
 * @returns Promise que resuelve con true si la validación es exitosa
 */
export async function validateDownload(
  content: string, 
  ipfsHash: string, 
  metadata: { filename?: string; fileSize?: number; identityDID?: string }
): Promise<boolean> {
  console.log(`[Qerberos] 🔍 Validando descarga - IPFS: ${ipfsHash.substring(0, 16)}...`);
  
  try {
    // Simular delay de validación
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 1. Verificar que el archivo existe en los logs de QIndex
    const fileLogs = findLogsByIPFSHash(ipfsHash);
    if (fileLogs.length === 0) {
      console.log(`[Qerberos] ❌ Archivo no encontrado en registros de QIndex`);
      return false;
    }
    
    const originalLog = fileLogs.find(log => log.operation === 'UPLOAD');
    if (!originalLog) {
      console.log(`[Qerberos] ❌ No se encontró registro de subida original`);
      return false;
    }
    
    // 2. Verificar integridad del contenido (checksum simple)
    const contentHash = generateSimpleHash(content);
    console.log(`[Qerberos] Hash del contenido actual: ${contentHash.substring(0, 16)}...`);
    
    // En un sistema real, compararíamos con un hash almacenado
    // Por ahora, simulamos verificación de integridad (95% de éxito)
    const integrityValid = Math.random() > 0.05;
    if (!integrityValid) {
      console.log(`[Qerberos] ❌ Fallo de integridad - contenido posiblemente corrompido`);
      return false;
    }
    
    // 3. Verificar permisos de acceso (simulado)
    const currentIdentity = metadata.identityDID || 'did:example:current_user';
    if (originalLog.identityDID !== currentIdentity) {
      console.log(`[Qerberos] ⚠️ Advertencia: identidad diferente al propietario original`);
      console.log(`[Qerberos] Propietario: ${originalLog.identityDID.substring(0, 16)}...`);
      console.log(`[Qerberos] Accediendo: ${currentIdentity.substring(0, 16)}...`);
      
      // En un sistema real, aquí verificaríamos políticas de acceso
      // Por ahora, permitimos el acceso pero registramos la advertencia
    }
    
    // 4. Validar metadatos básicos
    if (metadata.filename && originalLog.fileName && metadata.filename !== originalLog.fileName) {
      console.log(`[Qerberos] ⚠️ Advertencia: nombre de archivo no coincide`);
      console.log(`[Qerberos] Original: ${originalLog.fileName}, Actual: ${metadata.filename}`);
    }
    
    console.log(`[Qerberos] ✅ Validación de descarga exitosa`);
    
    // Registrar evento de validación exitosa
    await logAccess({
      cid: ipfsHash,
      identity: currentIdentity,
      status: 'SUCCESS',
      operation: 'DOWNLOAD',
      reason: 'Download validation passed',
      metadata: {
        fileName: metadata.filename,
        fileSize: metadata.fileSize,
        verificationResult: true
      }
    });
    
    return true;
    
  } catch (error) {
    console.error(`[Qerberos] ❌ Error durante validación de descarga:`, error);
    
    // Registrar error de validación
    await logAccess({
      cid: ipfsHash,
      identity: metadata.identityDID || 'did:example:current_user',
      status: 'FAILED',
      operation: 'DOWNLOAD',
      reason: `Download validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        fileName: metadata.filename,
        fileSize: metadata.fileSize,
        verificationResult: false
      }
    });
    
    return false;
  }
}

/**
 * Genera un hash simple del contenido para verificación de integridad
 * @param content - Contenido a hashear
 * @returns Hash en formato hexadecimal
 */
function generateSimpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Función auxiliar para registrar accesos (importada del módulo de API)
async function logAccess(event: {
  cid: string;
  identity: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  operation: 'UPLOAD' | 'DOWNLOAD' | 'DECRYPT' | 'VERIFY';
  reason?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    verificationResult?: boolean;
  };
}): Promise<void> {
  // Importar dinámicamente para evitar dependencias circulares
  const { logAccess: apiLogAccess } = await import('@/api/qerberos');
  return apiLogAccess(event);
}

/**
 * Verifica si una identidad tiene autorización para acceder a un archivo
 * @param ipfsHash - Hash del archivo en IPFS
 * @param identityDID - DID de la identidad que intenta acceder
 * @param currentFileHash - Hash actual del archivo para verificar manipulación
 * @returns Resultado de la verificación de acceso
 */
export async function verifyFileAccess(
  ipfsHash: string,
  identityDID: string,
  currentFileHash?: string
): Promise<AccessAttempt> {
  console.log(`[Qerberos] Verificando acceso - IPFS: ${ipfsHash.substring(0, 16)}... DID: ${identityDID.substring(0, 16)}...`);
  
  // Simular delay de verificación
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Buscar logs del archivo en QIndex
  const fileLogs = findLogsByIPFSHash(ipfsHash);
  
  const accessAttempt: AccessAttempt = {
    id: crypto.randomUUID(),
    ipfsHash,
    identityDID,
    timestamp: new Date().toISOString(),
    status: 'NOT_FOUND',
    reason: 'Unknown error'
  };
  
  // Verificar si el archivo existe en los logs
  if (fileLogs.length === 0) {
    accessAttempt.status = 'NOT_FOUND';
    accessAttempt.reason = 'Archivo no encontrado en registros de QIndex';
    console.log(`[Qerberos] ❌ Archivo no encontrado en registros`);
  } else {
    const originalLog = fileLogs.find(log => log.operation === 'UPLOAD');
    accessAttempt.originalLog = originalLog;
    
    // Verificar si la identidad coincide con el propietario original
    if (originalLog && originalLog.identityDID === identityDID) {
      // Verificar integridad del archivo si se proporciona hash actual
      if (currentFileHash && originalLog.encryptedHash !== currentFileHash) {
        accessAttempt.status = 'MANIPULATED';
        accessAttempt.reason = 'Archivo manipulado - hash no coincide con el original';
        console.log(`[Qerberos] ⚠️ MANIPULACIÓN DETECTADA - Hash original: ${originalLog.encryptedHash.substring(0, 16)}... Hash actual: ${currentFileHash.substring(0, 16)}...`);
      } else {
        accessAttempt.status = 'AUTHORIZED';
        accessAttempt.reason = 'Acceso autorizado - identidad verificada';
        console.log(`[Qerberos] ✅ Acceso autorizado para identidad: ${identityDID.substring(0, 16)}...`);
      }
    } else {
      accessAttempt.status = 'UNAUTHORIZED';
      accessAttempt.reason = 'Identidad no autorizada para este archivo';
      console.log(`[Qerberos] 🚫 Acceso denegado - identidad no autorizada`);
    }
  }
  
  // Registrar el intento de acceso
  accessAttempts.unshift(accessAttempt);
  
  // Mantener solo los últimos 500 intentos
  if (accessAttempts.length > 500) {
    accessAttempts.splice(500);
  }
  
  // Persistir en localStorage
  try {
    localStorage.setItem('qerberos_access_attempts', JSON.stringify(accessAttempts));
  } catch (error) {
    console.error('[Qerberos] Error al persistir intentos de acceso:', error);
  }
  
  return accessAttempt;
}

/**
 * Obtiene todos los intentos de acceso registrados
 */
export function getAccessAttempts(): AccessAttempt[] {
  // Cargar desde localStorage si está vacío
  if (accessAttempts.length === 0) {
    try {
      const stored = localStorage.getItem('qerberos_access_attempts');
      if (stored) {
        const parsedAttempts = JSON.parse(stored);
        accessAttempts.push(...parsedAttempts);
      }
    } catch (error) {
      console.error('[Qerberos] Error al cargar intentos de acceso:', error);
    }
  }
  
  return [...accessAttempts]; // Retornar copia
}

/**
 * Obtiene estadísticas de acceso
 */
export function getAccessStats(): {
  total: number;
  authorized: number;
  unauthorized: number;
  manipulated: number;
  notFound: number;
} {
  const attempts = getAccessAttempts();
  
  return {
    total: attempts.length,
    authorized: attempts.filter(a => a.status === 'AUTHORIZED').length,
    unauthorized: attempts.filter(a => a.status === 'UNAUTHORIZED').length,
    manipulated: attempts.filter(a => a.status === 'MANIPULATED').length,
    notFound: attempts.filter(a => a.status === 'NOT_FOUND').length
  };
}

/**
 * Función de testing para simular diferentes escenarios
 */
export async function runQerberosTests(): Promise<{
  correctVerification: AccessAttempt;
  manipulationAttempt: AccessAttempt;
  unauthorizedAccess: AccessAttempt;
}> {
  console.log(`[Qerberos] 🧪 Iniciando tests de verificación...`);
  
  // Crear logs de prueba en QIndex
  const { logFileOperation } = await import('./qindex');
  
  const testIPFSHash = 'QmTestHash123456789';
  const authorizedDID = 'did:example:authorized123';
  const unauthorizedDID = 'did:example:unauthorized456';
  const originalEncryptedHash = 'encrypted_hash_original_123';
  const manipulatedHash = 'encrypted_hash_manipulated_456';
  
  // Simular subida de archivo
  await logFileOperation(
    testIPFSHash,
    originalEncryptedHash,
    authorizedDID,
    'UPLOAD',
    'test_file.txt',
    1024
  );
  
  console.log(`[Qerberos] 📝 Archivo de prueba registrado en QIndex`);
  
  // Test 1: Verificación correcta
  console.log(`[Qerberos] Test 1: Verificación correcta`);
  const correctVerification = await verifyFileAccess(
    testIPFSHash,
    authorizedDID,
    originalEncryptedHash
  );
  
  // Test 2: Intento de manipulación
  console.log(`[Qerberos] Test 2: Intento de manipulación`);
  const manipulationAttempt = await verifyFileAccess(
    testIPFSHash,
    authorizedDID,
    manipulatedHash
  );
  
  // Test 3: Acceso no autorizado
  console.log(`[Qerberos] Test 3: Acceso no autorizado`);
  const unauthorizedAccess = await verifyFileAccess(
    testIPFSHash,
    unauthorizedDID,
    originalEncryptedHash
  );
  
  console.log(`[Qerberos] ✅ Tests completados`);
  console.log(`[Qerberos] Resultados:`, {
    'Verificación correcta': correctVerification.status,
    'Intento de manipulación': manipulationAttempt.status,
    'Acceso no autorizado': unauthorizedAccess.status
  });
  
  return {
    correctVerification,
    manipulationAttempt,
    unauthorizedAccess
  };
}

/**
 * Genera un hash mock para propósitos de testing
 * @param content - Contenido para generar hash
 * @returns Hash simulado
 */
export function generateMockHash(content: string): string {
  // Simulación simple de hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
